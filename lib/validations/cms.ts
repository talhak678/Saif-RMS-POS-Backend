import { z } from 'zod'

export const faqSchema = z.object({
    question: z.string().min(5, 'Question must be at least 5 characters'),
    answer: z.string().min(5, 'Answer must be at least 5 characters'),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})

export const cmsPageSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters'),
    content: z.string().min(10, 'Content must be at least 10 characters'),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})

export const promoBannerSchema = z.object({
    title: z.string().optional(),
    imageUrl: z.string().url('Invalid image URL'),
    linkUrl: z.string().url('Invalid link URL').optional().or(z.literal('')),
    isActive: z.boolean().default(true),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})
