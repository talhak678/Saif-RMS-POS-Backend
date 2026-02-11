import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { customerSchema } from '@/lib/validations/customer'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const customer = await prisma.customer.findUnique({
            where: { id },
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
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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
        if (error.code === 'P2025') return errorResponse('Customer not found', null, 404)
        return errorResponse('Failed to update customer', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.customer.delete({ where: { id } })
        return successResponse(null, 'Customer deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Customer not found', null, 404)
        return errorResponse('Failed to delete customer', error.message, 500)
    }
}
