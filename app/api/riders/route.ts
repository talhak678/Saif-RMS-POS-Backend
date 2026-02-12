import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { riderSchema } from '@/lib/validations/marketing'

export async function GET() {
    try {
        const riders = await prisma.rider.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(riders)
    } catch (error: any) {
        return errorResponse('Failed to fetch riders', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = riderSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const rider = await prisma.rider.create({
            data: validation.data
        })
        return successResponse(rider, 'Rider created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create rider', error.message, 500)
    }
}
