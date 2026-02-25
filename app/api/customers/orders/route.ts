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
            notes
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

        // Check if delivery is available (based on time)
        if (branch.deliveryOffTime && type === 'DELIVERY') {
            const now = new Date()
            const [offHour, offMin] = branch.deliveryOffTime.split(':').map(Number)
            const offTime = new Date()
            offTime.setHours(offHour, offMin, 0, 0)
            if (now >= offTime) {
                return errorResponse(
                    `Delivery is not available after ${branch.deliveryOffTime}. Please try again tomorrow or choose pickup.`,
                    null,
                    400
                )
            }
        }

        // Check if delivery is available (based on time)
        if (branch.deliveryOffTime && type === 'DELIVERY') {
            const now = new Date()
            const [offHour, offMin] = branch.deliveryOffTime.split(':').map(Number)
            const offTime = new Date()
            offTime.setHours(offHour, offMin, 0, 0)
            if (now >= offTime) {
                return errorResponse(
                    `Delivery is not available after ${branch.deliveryOffTime}. Please try again tomorrow or choose pickup.`,
                    null,
                    400
                )
            }
        }

        // Validate discount code if provided
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

        const safeTotal = parseFloat(finalTotal.toFixed(2));
        if (isNaN(safeTotal)) throw new Error('Invalid total calculated');



        const result = await prisma.$transaction(async (tx) => {
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
                    items: {
                        create: items.map((item: any) => ({
                            menuItemId: item.menuItemId,
                            quantity: parseInt(item.quantity.toString()) || 1,
                            price: parseFloat(parseFloat(item.price.toString()).toFixed(2)) || 0,
                        })),
                    },
                } as any,
            })

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

        // 🔔 Create Notifications for restaurant staff
        try {
            const users = await prisma.user.findMany({
                where: { restaurantId: customer.restaurantId },
                select: { id: true }
            });

            if (users.length > 0) {
                const restaurantName = fullOrder.branch.name; // Using branch name or we could fetch restaurant name
                await prisma.notification.createMany({
                    data: users.map(user => ({
                        userId: user.id,
                        message: `Website se Naya Order aya hai! #${fullOrder.orderNo}`,
                        isRead: false
                    }))
                });
                console.log(`🔔 Notifications created for ${users.length} users.`);
            }
        } catch (notifyError) {
            console.error('Failed to create website order notifications:', notifyError);
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
