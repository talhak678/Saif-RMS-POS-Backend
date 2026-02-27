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

export const websiteConfigSchema = z.object({
    restaurantId: z.string().cuid('Invalid restaurant ID'),
    backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional(),
    configJson: z.any(), // Flexible JSON structure based on documentation-cms.md
})

export const blogPostSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    snippet: z.string().optional(),
    content: z.string().min(5, 'Content must be at least 5 characters'),
    imageUrl: z.string().optional().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
        message: 'Must be a valid URL or empty'
    }),
    author: z.string().optional(),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})
