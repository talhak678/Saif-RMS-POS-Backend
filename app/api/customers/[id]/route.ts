import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { customerSchema } from '@/lib/validations/customer'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const customer = await prisma.customer.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            },
            include: {
                orders: {
                    include: {
                        payment: true,
                        items: { include: { menuItem: true } }
                    }
                },
                loyaltyTrxs: true
            },
        })

        if (!customer) return errorResponse('Customer not found', null, 404)
        return successResponse(customer)
    } catch (error: any) {
        return errorResponse('Failed to fetch customer', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.customer.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Customer not found or unauthorized', null, 404)

        const body = await req.json()
        const validation = customerSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, phone, loyaltyPoints } = validation.data

        const customer = await prisma.customer.update({
            where: { id },
            data: { name, email, phone, loyaltyPoints },
        })

        return successResponse(customer, 'Customer updated successfully')
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Customer email already exists')
        return errorResponse('Failed to update customer', error.message, 500)
    }
})

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.customer.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Customer not found or unauthorized', null, 404)

        await prisma.customer.delete({ where: { id } })
        return successResponse(null, 'Customer deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete customer', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN', 'Manager'] })
