import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { sendEmail, getSubscriptionWarningTemplate, getSubscriptionExpiredTemplate } from '@/lib/email'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    try {
        // Optional: Add a simple secret key check for security
        // const authHeader = req.headers.get('x-cron-key')
        // if (authHeader !== process.env.CRON_SECRET) return errorResponse('Unauthorized', null, 401)

        const now = new Date()

        // 1. Find restaurants expiring in exactly 5 days OR 2 days
        const fiveDaysOut = new Date()
        fiveDaysOut.setDate(now.getDate() + 5)

        const twoDaysOut = new Date()
        twoDaysOut.setDate(now.getDate() + 2)

        const restaurants = await prisma.restaurant.findMany({
            where: {
                status: 'ACTIVE',
                subEndDate: {
                    not: null
                }
            },
            include: {
                users: {
                    where: {
                        role: { name: 'Admin' }
                    }
                }
            }
        })

        const results = []

        for (const rest of restaurants) {
            if (!rest.subEndDate) continue;

            const expiry = new Date(rest.subEndDate)
            const diffTime = expiry.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            const adminEmail = rest.users[0]?.email || rest.notificationEmail || rest.contactEmail
            const adminName = rest.users[0]?.name || rest.contactName || 'Admin'

            if (diffDays === 5 || diffDays === 2) {
                // Send Warning
                await sendEmail({
                    to: adminEmail!,
                    subject: `Urgent: Subscription Subscription Expiry Warning for ${rest.name}`,
                    html: getSubscriptionWarningTemplate(adminName, diffDays, rest.name, expiry.toLocaleDateString()),
                    fromName: "Saif RMS Super Admin"
                })
                results.push({ restaurant: rest.name, status: `Warning sent (${diffDays} days)` })
            } else if (diffDays <= 0) {
                // Send Expired (only once if processed)
                // In a real system, you'd mark 'expiryNotificationSent' to avoid spamming
                await sendEmail({
                    to: adminEmail!,
                    subject: `Alert: Subscription Expired for ${rest.name}`,
                    html: getSubscriptionExpiredTemplate(adminName, rest.name),
                    fromName: "Saif RMS Super Admin"
                })
                results.push({ restaurant: rest.name, status: `Expired notification sent` })
            }
        }

        return successResponse(results, 'Subscription check completed')
    } catch (error: any) {
        return errorResponse('Cron failed', error.message, 500)
    }
}
