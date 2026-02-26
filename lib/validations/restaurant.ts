import { z } from 'zod'

export const restaurantSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters'),
    logo: z.string().url().optional().or(z.literal('')).nullable(),
    description: z.string().optional().nullable(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING'),
    subscription: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).default('FREE'),
    facebookUrl: z.string().url().optional().or(z.literal('')).nullable(),
    instagramUrl: z.string().url().optional().or(z.literal('')).nullable(),
    tiktokUrl: z.string().url().optional().or(z.literal('')).nullable(),
    metaPixelId: z.string().optional().nullable(),
    customDomain: z.string().optional().or(z.literal('')).nullable(),
    smtpHost: z.string().nullable().optional().or(z.literal('')),
    smtpPort: z.any().optional().transform(v => {
        if (v === null || v === "" || v === undefined) return undefined;
        const num = Number(v);
        return isNaN(num) ? undefined : num;
    }),
    smtpUser: z.string().nullable().optional().or(z.literal('')),
    smtpPass: z.string().nullable().optional().or(z.literal('')),
    smtpSecure: z.any().optional().transform(v => !!v).default(false),
    contactName: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().or(z.literal('')).nullable(),
    notificationEmail: z.string().email().optional().or(z.literal('')).nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postCode: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    countryCode: z.string().optional().nullable(),
    cuisines: z.preprocess((val) => (val === null ? [] : val), z.array(z.string()).optional()),
    serviceType: z.string().optional().nullable(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    phone: z.string().optional().nullable(),
    subStartDate: z.preprocess((val) => (val === null ? undefined : val), z.string().optional().or(z.date()).optional()),
    subEndDate: z.preprocess((val) => (val === null ? undefined : val), z.string().optional().or(z.date()).optional()),
})
