import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { orderUpdateSchema } from '@/lib/validations/order'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const order = await prisma.order.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { branch: { restaurantId } } : {})
            },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: true,
                rider: true
            },
        })

        if (!order) return errorResponse('Order not found', null, 404)
        return successResponse(order)
    } catch (error: any) {
        return errorResponse('Failed to fetch order', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.order.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { branch: { restaurantId } } : {})
            }
        })
        if (!existing) return errorResponse('Order not found or unauthorized', null, 404)

        const body = await req.json()
        const validation = orderUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { status, paymentStatus, riderId } = validation.data

        const order = await prisma.order.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(riderId !== undefined && { riderId }),

                ...(paymentStatus && {
                    payment: {
                        update: { status: paymentStatus }
                    }
                })
            },
            include: {
                payment: true,
                items: true,
                customer: true,
                rider: true,
                branch: {
                    include: { restaurant: true }
                }
            }
        })

        // 📧 Handle Email Notifications based on Status
        if (order.customer?.email && status) {
            const {
                sendEmail,
                getOrderConfirmedTemplate,
                getOrderReadyTemplate,
                getOrderOutForDeliveryTemplate,
                getOrderDeliveredTemplate,
                getOrderCancelledTemplate
            } = await import('@/lib/email')
            const restaurant = order.branch.restaurant as any;
            const restaurantName = restaurant.name;
            const customerName = order.customer.name || 'Customer';

            // Check if restaurant has custom SMTP settings
            let smtpConfig = undefined;
            if (restaurant.smtpHost && restaurant.smtpUser && restaurant.smtpPass) {
                smtpConfig = {
                    host: restaurant.smtpHost,
                    port: restaurant.smtpPort || 587,
                    secure: restaurant.smtpSecure,
                    auth: {
                        user: restaurant.smtpUser,
                        pass: restaurant.smtpPass
                    }
                };
            }

            let emailSubject = '';
            let emailHtml = '';

            switch (status) {
                case 'CONFIRMED':
                    emailSubject = `Order Confirmed! - ${restaurantName}`;
                    emailHtml = getOrderConfirmedTemplate(customerName, order.orderNo.toString(), restaurantName);
                    break;
                case 'KITCHEN_READY':
                    emailSubject = `Order Ready! - ${restaurantName}`;
                    emailHtml = getOrderReadyTemplate(customerName, order.orderNo.toString(), restaurantName);
                    break;
                case 'OUT_FOR_DELIVERY':
                    emailSubject = `Out for Delivery! - ${restaurantName}`;
                    emailHtml = getOrderOutForDeliveryTemplate(customerName, order.orderNo.toString(), restaurantName);
                    break;
                case 'DELIVERED':
                    emailSubject = `Order Delivered! - ${restaurantName}`;
                    emailHtml = getOrderDeliveredTemplate(customerName, order.orderNo.toString(), restaurantName);
                    break;
                case 'CANCELLED':
                    emailSubject = `Order Cancelled - ${restaurantName}`;
                    // We can pass body.notes as reason if available
                    emailHtml = getOrderCancelledTemplate(customerName, order.orderNo.toString(), restaurantName, body.notes);
                    break;
            }

            if (emailHtml) {
                await sendEmail({
                    to: order.customer.email,
                    subject: emailSubject,
                    html: emailHtml,
                    fromName: restaurantName,
                    smtpConfig
                })
            }
        }

        return successResponse(order, 'Order updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update order', error.message, 500)
    }
})
