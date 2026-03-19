import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'

// GET: Fetch all templates
export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized', null, 403)
        }

        const templates = await prisma.notificationTemplate.findMany();

        // If no templates exist, seed default ones automatically
        if (templates.length === 0) {
            const defaults = [
                { event: 'NEW_ORDER_WEB', message: 'Website Order Received! ##{orderNo}' },
                { event: 'NEW_ORDER_POS', message: 'New Order Received! ##{orderNo} (#{restaurantName})' },
                { event: 'SUB_REQUEST', message: 'New Subscription Request: #{restaurantName} (#{plan})' }
            ];

            await prisma.notificationTemplate.createMany({
                data: defaults
            });

            const seeded = await prisma.notificationTemplate.findMany();
            return successResponse(seeded);
        }

        // Logic to update old Urdu templates if found
        const urduWeb = 'Website se Naya Order aya hai! ##{orderNo}';
        const urduPos = 'Naya Order pohnch gaya! ##{orderNo} (#{restaurantName})';
        const urduSub = 'Naya Subscription Request aya hai: #{restaurantName} (#{plan})';

        for (const t of templates) {
            if (t.message === urduWeb) {
                await prisma.notificationTemplate.update({ where: { id: t.id }, data: { message: 'Website Order Received! ##{orderNo}' } });
            } else if (t.message === urduPos) {
                 await prisma.notificationTemplate.update({ where: { id: t.id }, data: { message: 'New Order Received! ##{orderNo} (#{restaurantName})' } });
            } else if (t.message === urduSub) {
                 await prisma.notificationTemplate.update({ where: { id: t.id }, data: { message: 'New Subscription Request: #{restaurantName} (#{plan})' } });
            }
        }

        // Fetch again after potential updates
        const finalTemplates = await prisma.notificationTemplate.findMany();
        return successResponse(finalTemplates)
    } catch (error: any) {
        return errorResponse('Failed to fetch templates', error.message, 500)
    }
})

// POST: Update or Create templates (Bulk)
export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized', null, 403)
        }

        const body = await req.json();
        const { templates } = body; // Array of { event, message }

        if (!Array.isArray(templates)) {
            return errorResponse('Invalid templates data', null, 400)
        }

        for (const t of templates) {
            await prisma.notificationTemplate.upsert({
                where: { event: t.event },
                update: { message: t.message },
                create: { event: t.event, message: t.message }
            });
        }

        const updated = await prisma.notificationTemplate.findMany();
        return successResponse(updated, 'Templates updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update templates', error.message, 500)
    }
})
