import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { blogPostSchema } from '@/lib/validations/cms'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const blogs = await prisma.blogPost.findMany({
            where: restaurantId ? { restaurantId } : {},
            orderBy: { publishedAt: 'desc' }
        })
        return successResponse(blogs)
    } catch (error: any) {
        return errorResponse('Failed to fetch blog posts', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = blogPostSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const blog = await prisma.blogPost.create({
            data: validation.data
        })
        return successResponse(blog, 'Blog post created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create blog post', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })
