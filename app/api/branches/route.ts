import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { branchSchema } from '@/lib/validations/branch'

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            include: { restaurant: true }
        })
        return successResponse(branches)
    } catch (error: any) {
        return errorResponse('Failed to fetch branches', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
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
}
