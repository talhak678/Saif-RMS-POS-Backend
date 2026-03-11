import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, slug, restaurantId: bodyRestaurantId } = body

        if (!email || !email.includes('@')) {
            return errorResponse('Please provide a valid email address', null, 400)
        }

        // Find restaurant by slug or restaurantId
        let restaurant: any = null

        if (bodyRestaurantId) {
            restaurant = await prisma.restaurant.findUnique({
                where: { id: bodyRestaurantId },
                select: {
                    id: true,
                    name: true,
                    notificationEmail: true,
                    smtpHost: true,
                    smtpPort: true,
                    smtpUser: true,
                    smtpPass: true,
                    smtpSecure: true,
                }
            })
        } else if (slug) {
            restaurant = await prisma.restaurant.findUnique({
                where: { slug },
                select: {
                    id: true,
                    name: true,
                    notificationEmail: true,
                    smtpHost: true,
                    smtpPort: true,
                    smtpUser: true,
                    smtpPass: true,
                    smtpSecure: true,
                }
            })
        }

        const restaurantName = restaurant?.name || 'Our Restaurant'
        const notifyEmail = restaurant?.notificationEmail

        // Build custom SMTP config if restaurant has it configured
        const smtpConfig = (restaurant?.smtpHost && restaurant?.smtpUser && restaurant?.smtpPass)
            ? {
                host: restaurant.smtpHost,
                port: restaurant.smtpPort || 587,
                secure: restaurant.smtpSecure || false,
                auth: { user: restaurant.smtpUser, pass: restaurant.smtpPass }
            }
            : undefined

        // 1. Send welcome confirmation to subscriber
        const subscriberEmailResult = await sendEmail({
            to: email,
            subject: `🎉 You're subscribed to ${restaurantName}!`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #4CAF50; margin-top: 0;">Welcome to ${restaurantName}! 🎉</h2>
                    </div>
                    <p>Hi there!</p>
                    <p>Thank you for subscribing to our newsletter. You'll now receive the latest updates, exclusive deals, and special offers from <strong>${restaurantName}</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #4CAF50; text-align: center;">
                        <p style="margin: 0; font-size: 16px;">🍽️ Stay tuned for mouth-watering offers and news!</p>
                    </div>
                    <p>We're excited to have you with us.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">You received this email because you subscribed at ${restaurantName}.</p>
                </div>
            `,
            fromName: restaurantName,
            smtpConfig
        })

        if (!subscriberEmailResult.success) {
            console.error('❌ Subscriber Email Error:', subscriberEmailResult.error);
            const errorMsg = (subscriberEmailResult.error as any)?.message || 'Email service unavailable';
            return errorResponse(`Email Error: ${errorMsg}`, null, 500);
        }

        // 2. Notify restaurant owner if notification email is set
        if (notifyEmail) {
            await sendEmail({
                to: notifyEmail,
                subject: `📧 New Newsletter Subscriber: ${email}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e1e1e1; border-radius: 12px;">
                        <h3 style="color: #333;">New Newsletter Subscriber</h3>
                        <p>You have a new subscriber for <strong>${restaurantName}</strong>:</p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 16px;">
                            📧 <strong>${email}</strong>
                        </div>
                        <p style="color: #888; font-size: 12px; margin-top: 20px;">This notification was sent by your RMS system.</p>
                    </div>
                `,
                fromName: 'RMS Newsletter',
                smtpConfig
            })
        }

        return successResponse({ email }, 'Subscribed successfully! Check your inbox for a confirmation email.', 200)

    } catch (error: any) {
        console.error('Newsletter subscribe error:', error)
        return errorResponse('Failed to subscribe. Please try again.', error.message, 500)
    }
}
