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

// GET: Loyalty points and transaction history
export async function GET(req: NextRequest) {
    try {
        const customer = await getCustomerFromToken(req)
        if (!customer?.customerId) {
            return errorResponse('Authentication required', null, 401)
        }

        const data = await prisma.customer.findUnique({
            where: { id: customer.customerId },
            select: {
                loyaltyPoints: true,
                loyaltyTrxs: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        order: {
                            select: {
                                orderNo: true,
                                status: true
                            }
                        }
                    }
                }
            }
        })

        if (!data) {
            return errorResponse('Customer not found', null, 404)
        }

        return successResponse(data)
    } catch (error: any) {
        return errorResponse('Failed to fetch loyalty history', error.message, 500)
    }
}
