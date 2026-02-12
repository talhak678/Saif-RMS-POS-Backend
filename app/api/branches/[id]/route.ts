import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { branchSchema } from '@/lib/validations/branch'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const branch = await prisma.branch.findUnique({
            where: { id },
            include: { restaurant: true }
        })

        if (!branch) return errorResponse('Branch not found', null, 404)
        return successResponse(branch)
    } catch (error: any) {
        return errorResponse('Failed to fetch branch', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = branchSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const branch = await prisma.branch.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })

        return successResponse(branch, 'Branch updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Branch not found', null, 404)
        return errorResponse('Failed to update branch', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.branch.delete({ where: { id } })
        return successResponse(null, 'Branch deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Branch not found', null, 404)
        return errorResponse('Failed to delete branch', error.message, 500)
    }
}
