import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { blogPostSchema } from '@/lib/validations/cms'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const blog = await prisma.blogPost.findUnique({
            where: { id }
        })
        if (!blog) return errorResponse('Blog post not found', null, 404)
        return successResponse(blog)
    } catch (error: any) {
        return errorResponse('Failed to fetch blog post', error.message, 500)
    }
})

export const PUT = withAuth(async (req: NextRequest, { params, auth }: { params: Promise<{ id: string }>, auth: any }) => {
    try {
        const body = await req.json()
        const { id } = await params;

        // Ensure restaurant match
        const existing = await prisma.blogPost.findUnique({ where: { id } })
        if (!existing) return errorResponse('Blog post not found', null, 404)

        if (auth.role !== 'SUPER_ADMIN' && existing.restaurantId !== auth.restaurantId) {
            return errorResponse('Unauthorized', null, 403)
        }

        // Inject restaurantId for validation if missing
        if (!body.restaurantId) body.restaurantId = existing.restaurantId

        const validation = blogPostSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const updated = await prisma.blogPost.update({
            where: { id },
            data: validation.data
        })

        return successResponse(updated, 'Blog post updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update blog post', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] })

export const DELETE = withAuth(async (req: NextRequest, { params, auth }: { params: Promise<{ id: string }>, auth: any }) => {
    try {
        const { id } = await params;
        const existing = await prisma.blogPost.findUnique({ where: { id } })
        if (!existing) return errorResponse('Blog post not found', null, 404)

        if (auth.role !== 'SUPER_ADMIN' && existing.restaurantId !== auth.restaurantId) {
            return errorResponse('Unauthorized', null, 403)
        }

        await prisma.blogPost.delete({ where: { id } })
        return successResponse(null, 'Blog post deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete blog post', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] })
