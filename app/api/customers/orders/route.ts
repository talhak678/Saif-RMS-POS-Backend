import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
);

// Helper to get customer from token
async function getCustomerFromToken(req: NextRequest) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        token = cookieStore.get('customer_token')?.value || null
    }

    if (!token) return null

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as any
    } catch {
        return null
    }
}

// GET: Customer order history (requires customer JWT)
export async function GET(req: NextRequest) {
    try {
        const customer = await getCustomerFromToken(req)
        if (!customer?.customerId) {
            return errorResponse('Authentication required', null, 401)
        }

        const orders = await prisma.order.findMany({
            where: { customerId: customer.customerId },
            include: {
                items: { include: { menuItem: { select: { name: true, image: true, price: true } } } },
                payment: { select: { method: true, status: true, amount: true } },
                branch: { select: { name: true, address: true } },
                review: { select: { rating: true, comment: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return successResponse(orders)
    } catch (error: any) {
        return errorResponse('Failed to fetch orders', error.message, 500)
    }
}

// POST: Place order (requires customer JWT)
export async function POST(req: NextRequest) {
    try {
        const customer = await getCustomerFromToken(req)
        if (!customer?.customerId) {
            return errorResponse('Authentication required', null, 401)
        }

        const body = await req.json()
        const {
            branchId,
            type = 'DELIVERY',
            items,
            paymentMethod = 'CASH',
            total,
            deliveryAddress,
            deliveryLat,
            deliveryLng,
            deliveryCharge,
            discountCode,
            notes,
            redeemPoints = false
        } = body

        if (!branchId || !items || items.length === 0 || !total) {
            return errorResponse('Missing required order fields', null, 400)
        }

        // Validate branch belongs to customer's restaurant
        const branch = await prisma.branch.findFirst({
            where: { id: branchId, restaurantId: customer.restaurantId }
        })
        if (!branch) {
            return errorResponse('Invalid branch', null, 400)
        }

        // 1. Validate discount code if provided
        let finalTotal = total
        let discountData = null
        if (discountCode) {
            const discount = await prisma.discountCode.findFirst({
                where: {
                    code: discountCode.toUpperCase(),
                    restaurantId: customer.restaurantId,
                    isActive: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            })
            if (discount) {
                discountData = discount
                if (discount.percentage) {
                    finalTotal = total * (1 - discount.percentage / 100)
                } else if (discount.amount) {
                    finalTotal = Math.max(0, total - discount.amount)
                }
            }
        }

        // 2. 💰 Loyalty Points Redemption
        let loyaltyAmount = 0;
        if (redeemPoints && customer.customerId) {
            const customerData = await prisma.customer.findUnique({
                where: { id: customer.customerId },
                select: { loyaltyPoints: true }
            });
            if (customerData && customerData.loyaltyPoints > 0) {
                // 1 point = 1 currency unit
                loyaltyAmount = Math.min(customerData.loyaltyPoints, finalTotal);
                finalTotal -= loyaltyAmount;
            }
        }

        const safeTotal = parseFloat(finalTotal.toFixed(2));
        if (isNaN(safeTotal)) throw new Error('Invalid total calculated');



        const result = await prisma.$transaction(async (tx: any) => {
            // Create the order
            const order = await tx.order.create({
                data: {
                    branchId,
                    customerId: customer.customerId,
                    type: type as any,
                    source: 'WEBSITE',
                    total: safeTotal,
                    status: 'PENDING',
                    deliveryAddress,
                    deliveryLat: deliveryLat ? parseFloat(deliveryLat.toString()) : null,
                    deliveryLng: deliveryLng ? parseFloat(deliveryLng.toString()) : null,
                    deliveryCharge: deliveryCharge ? parseFloat(parseFloat(deliveryCharge.toString()).toFixed(2)) : 0,
                    notes,
                    discountCode,
                    loyaltyAmount: loyaltyAmount,
                    items: {
                        create: items.map((item: any) => ({
                            menuItemId: item.menuItemId,
                            quantity: parseInt(item.quantity.toString()) || 1,
                            price: parseFloat(parseFloat(item.price.toString()).toFixed(2)) || 0,
                        })),
                    },
                } as any,
            })

            // 💰 Process Loyalty Point Deduction
            if (loyaltyAmount > 0) {
                await tx.customer.update({
                    where: { id: customer.customerId },
                    data: { loyaltyPoints: { decrement: loyaltyAmount } }
                });
                await (tx as any).loyaltyTrx.create({
                    data: {
                        points: loyaltyAmount,
                        type: 'REDEEMED',
                        customerId: customer.customerId,
                        orderId: order.id
                    }
                });
            }

            // Create the payment record
            await tx.payment.create({
                data: {
                    orderId: order.id,
                    amount: safeTotal,
                    method: paymentMethod === 'STRIPE' ? 'STRIPE' : (paymentMethod === 'PAYPAL' ? 'PAYPAL' : (paymentMethod === 'CASH' ? 'CASH' : 'COD')),
                    status: 'PENDING',
                },
            })

            return order
        })

        // Fetch the full order details for the response
        const fullOrder = await prisma.order.findUnique({
            where: { id: result.id },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: { select: { id: true, name: true, email: true, phone: true } },
                branch: { select: { id: true, name: true, address: true } }
            }
        })

        if (!fullOrder) {
            return errorResponse('Order created but could not be retrieved', null, 500)
        }

        // 🔔 Create Notifications for restaurant staff & Send Email Alert
        try {
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: customer.restaurantId },
                select: { id: true, name: true, notificationEmail: true, contactEmail: true, smtpHost: true, smtpUser: true, smtpPass: true, smtpPort: true, smtpSecure: true }
            });

            if (restaurant) {
                // 1. Send Email Alert to Restaurant Owner
                const notifyEmail = restaurant.notificationEmail || restaurant.contactEmail;
                if (notifyEmail) {
                    const { sendEmail, getNewOrderRestaurantAlertTemplate } = await import('@/lib/email');

                    // Setup custom SMTP if available
                    let smtpConfig = undefined;
                    if (restaurant.smtpHost && restaurant.smtpUser && restaurant.smtpPass) {
                        smtpConfig = {
                            host: restaurant.smtpHost,
                            port: restaurant.smtpPort || 587,
                            secure: restaurant.smtpSecure === true,
                            auth: { user: restaurant.smtpUser, pass: restaurant.smtpPass }
                        };
                    }

                    const emailHtml = getNewOrderRestaurantAlertTemplate(
                        restaurant.name,
                        fullOrder.orderNo.toString(),
                        fullOrder.customer?.name || 'Guest',
                        fullOrder.customer?.phone || 'N/A',
                        fullOrder.items,
                        Number(fullOrder.total),
                        Number(fullOrder.deliveryCharge || 0),
                        fullOrder.type,
                        fullOrder.deliveryAddress || undefined
                    );

                    await sendEmail({
                        to: notifyEmail,
                        subject: `New Online Order Alert! #${fullOrder.orderNo}`,
                        html: emailHtml,
                        fromName: 'Saif RMS Alerts',
                        smtpConfig
                    });
                    console.log(`📧 Order alert email sent to ${notifyEmail}`);
                }

                // 2. Dashbord Notifications
                const users = await prisma.user.findMany({
                    where: { restaurantId: customer.restaurantId },
                    select: { id: true }
                });

                if (users.length > 0) {
                    // Fetch template
                    const template = await (prisma as any).notificationTemplate.findUnique({
                        where: { event: 'NEW_ORDER_WEB' }
                    });

                    let message = `Website se Naya Order aya hai! #${fullOrder.orderNo}`;
                    if (template) {
                        message = template.message.replace("#{orderNo}", fullOrder.orderNo.toString());
                    }

                    await prisma.notification.createMany({
                        data: users.map((user: any) => ({
                            userId: user.id,
                            message: message,
                            isRead: false
                        }))
                    });
                    console.log(`🔔 Notifications created for ${users.length} users.`);
                }

                // --- ADDED: Expo Push Notifications ---
                const staffWithTokens = await prisma.user.findMany({
                    where: {
                        restaurantId: customer.restaurantId,
                        role: {
                            name: {
                                in: ['Merchant Admin', 'Cashier / POS Operator']
                            }
                        },
                        pushToken: { not: null }
                    },
                    select: { pushToken: true }
                });

                const pushTokens = staffWithTokens.map(u => u.pushToken as string).filter(Boolean);

                if (pushTokens.length > 0) {
                    const { sendExpoPushNotification } = await import('@/lib/notifications');
                    await sendExpoPushNotification(
                        pushTokens,
                        "New Online Order! 🌐",
                        `New website order # ${fullOrder.orderNo} Recieved. Type: ${fullOrder.type}`,
                        { orderId: fullOrder.id, orderNo: fullOrder.orderNo }
                    );
                    console.log(`📱 Push notifications sent to ${pushTokens.length} staff members.`);
                }
                // --- END ADDED ---
            }
        } catch (notifyError) {
            console.error('Failed to process notifications/email alerts:', notifyError);
        }

        return successResponse({
            ...fullOrder,
            discountApplied: discountData ? {
                code: discountData.code,
                percentage: discountData.percentage,
                amount: discountData.amount
            } : null
        }, 'Order placed successfully', 201)
    } catch (error: any) {
        console.error('💥 Order Creation Error Details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            meta: error.meta
        });
        return errorResponse('Failed to place order', error.message, 500)
    }
}
