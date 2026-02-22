import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { PaymentStatus } from '@prisma/client'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')
        const branchId = searchParams.get('branchId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
        }

        if (!restaurantId && auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Restaurant ID is required', 'Unauthorized', 400);
        }

        const where: any = {
            order: {
                ...(branchId ? { branchId } : {}),
                ...(restaurantId ? { branch: { restaurantId } } : {}),
            },
            ...(status ? { status: status as PaymentStatus } : {}),
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    order: {
                        include: {
                            branch: { select: { name: true } },
                            customer: { select: { name: true, email: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.payment.count({ where })
        ]);

        return successResponse({
            payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        console.error('Payments fetch error:', error);
        return errorResponse('Failed to fetch payments', error.message, 500);
    }
});

export const PATCH = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json();
        const { paymentId, status } = body;

        if (!paymentId || !status) {
            return errorResponse('Missing required fields', 'Bad Request', 400);
        }

        // Check if payment belongs to this restaurant
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { order: { include: { branch: true } } }
        });

        if (!payment || (auth.role !== 'SUPER_ADMIN' && payment.order.branch.restaurantId !== auth.restaurantId)) {
            return errorResponse('Payment not found or unauthorized', 'Unauthorized', 404);
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: { status: status as PaymentStatus },
            include: { order: true }
        });

        return successResponse(updatedPayment, 'Payment status updated successfully');

    } catch (error: any) {
        console.error('Payment update error:', error);
        return errorResponse('Failed to update payment status', error.message, 500);
    }
});
