import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { orderCreateSchema } from '@/lib/validations/order'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const status = searchParams.get('status') as OrderStatus | null
        const customerId = searchParams.get('customerId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Multi-tenancy logic
        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const orders = await prisma.order.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    status ? { status } : {},
                    customerId ? { customerId } : {},
                    startDate || endDate ? {
                        createdAt: {
                            ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
                            ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
                        }
                    } : {},
                    // Ensure the branch belongs to the user's restaurant
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: true,
                rider: true
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(orders)
    } catch (error: any) {
        return errorResponse('Failed to fetch orders', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = orderCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const {
            branchId,
            customerId,
            type,
            source,
            items,
            paymentMethod,
            total,
            deliveryAddress,
            deliveryLat,
            deliveryLng,
            deliveryCharge,
            loyaltyAmount
        } = validation.data

        // Security check: Verify the branchId belongs to the correct restaurant
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch for this order', null, 403)
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    branchId,
                    customerId,
                    type,
                    source: source as any,
                    total,
                    status: OrderStatus.PENDING,
                    deliveryAddress,
                    deliveryLat,
                    deliveryLng,
                    deliveryCharge,
                    loyaltyAmount,
                    items: {
                        create: items.map((item: any) => ({
                            menuItemId: item.menuItemId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                } as any,
            })

            // Handle Loyalty Redemption
            if (loyaltyAmount > 0 && customerId) {
                const customer = await tx.customer.findUnique({
                    where: { id: customerId },
                    select: { loyaltyPoints: true }
                });

                if (!customer || customer.loyaltyPoints < loyaltyAmount) {
                    throw new Error('Insufficent loyalty points');
                }

                await tx.customer.update({
                    where: { id: customerId },
                    data: { loyaltyPoints: { decrement: loyaltyAmount } }
                });

                await (tx as any).loyaltyTrx.create({
                    data: {
                        points: loyaltyAmount,
                        type: 'REDEEMED',
                        customerId: customerId,
                        orderId: order.id
                    }
                });
            }

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    amount: total,
                    method: paymentMethod || PaymentMethod.CASH,
                    status: PaymentStatus.PENDING,
                },
            })

            return order
        })

        const fullOrder = await prisma.order.findUnique({
            where: { id: result.id },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: {
                    include: { restaurant: true }
                }
            }
        })

        if (fullOrder) {
            // 🔔 Create Notifications for all users in this restaurant
            try {
                const users = await prisma.user.findMany({
                    where: { restaurantId: fullOrder.branch.restaurantId },
                    select: { id: true }
                });

                if (users.length > 0) {
                    // Fetch template
                    const template = await (prisma as any).notificationTemplate.findUnique({
                        where: { event: 'NEW_ORDER_POS' }
                    });

                    let message = `New Order Received! #${fullOrder.orderNo} (${fullOrder.branch.restaurant.name})`;
                    if (template) {
                        message = template.message
                            .replace("#{orderNo}", fullOrder.orderNo.toString())
                            .replace("#{restaurantName}", fullOrder.branch.restaurant.name);
                    }

                    await prisma.notification.createMany({
                        data: users.map(user => ({
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
                        restaurantId: fullOrder.branch.restaurantId,
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
                        "New Order! 🛍️",
                        `New POS order # ${fullOrder.orderNo} Recieved. Source: ${fullOrder.source}, Type: ${fullOrder.type}`,
                        { orderId: fullOrder.id, orderNo: fullOrder.orderNo }
                    );
                    console.log(`📱 Push notifications sent to ${pushTokens.length} staff members.`);
                }
                // --- END ADDED ---

                // 2. Send Email Alert to Restaurant Owner
                const notifyEmail = fullOrder.branch.restaurant.notificationEmail || fullOrder.branch.restaurant.contactEmail;
                if (notifyEmail && fullOrder.source === 'POS') {
                    const { sendEmail, getNewOrderRestaurantAlertTemplate } = await import('@/lib/email');

                    // Setup custom SMTP if available
                    let smtpConfig = undefined;
                    const restaurant = fullOrder.branch.restaurant;
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
                        fullOrder.customer?.name || 'Walk-in Customer (POS)',
                        fullOrder.customer?.phone || 'N/A',
                        fullOrder.items,
                        Number(fullOrder.total),
                        Number(fullOrder.deliveryCharge || 0),
                        fullOrder.type,
                        fullOrder.deliveryAddress || undefined
                    );

                    await sendEmail({
                        to: notifyEmail,
                        subject: `New POS Order Alert! #${fullOrder.orderNo}`,
                        html: emailHtml,
                        fromName: 'Saif RMS Alerts',
                        smtpConfig
                    });
                    console.log(`📧 POS Order alert email sent to ${notifyEmail}`);
                }
            } catch (notifyError) {
                console.error('Failed to create order notifications:', notifyError);
            }
        }

        return successResponse(fullOrder, 'Order placed successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to place order', error.message, 500)
    }
})
