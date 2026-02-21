import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { branchSchema } from '@/lib/validations/branch'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const branches = await prisma.branch.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: { restaurant: true }
        })
        return successResponse(branches)
    } catch (error: any) {
        return errorResponse('Failed to fetch branches', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = branchSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const branch = await prisma.branch.create({
            data: validation.data,
            include: { restaurant: true }
        })

        return successResponse(branch, 'Branch created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create branch', error.message, 500)
    }
})
