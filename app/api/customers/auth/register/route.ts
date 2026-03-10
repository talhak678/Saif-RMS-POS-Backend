import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth-utils'
import { sendEmail, getRegistrationOtpTemplate } from '@/lib/email'

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional().nullable(),
    restaurantId: z.string().cuid('Invalid restaurant ID')
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = registerSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, phone, restaurantId } = validation.data

        // Check if customer already exists for this restaurant
        const existing = await prisma.customer.findFirst({
            where: {
                email,
                restaurantId
            }
        })

        if (existing) {
            return errorResponse('Email already registered for this restaurant', null, 400)
        }

        const hashedPassword = await hashPassword(password)

        // 🔐 Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId }
        });

        if (!restaurant) {
            return errorResponse('Restaurant not found', null, 404)
        }

        const restaurantName = (restaurant.name || 'Saif RMS').trim();

        // 📧 Prepare Email Content (Hardcoded like working routes)
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; color: #333;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 800;">Verify Your Account</h2>
                    <p style="color: #666; margin-top: 10px;">Welcome to ${restaurantName}</p>
                </div>
                <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
                <p style="font-size: 16px; color: #555;">To complete your registration, please use the 6-digit verification code below:</p>
                <div style="background-color: #f9fafb; padding: 40px; border-radius: 16px; margin: 30px 0; text-align: center; border: 2px dashed #e5e7eb;">
                    <h1 style="color: #ef4444; letter-spacing: 12px; margin: 0; font-size: 42px; font-weight: 900;">${otp}</h1>
                    <p style="color: #9ca3af; font-size: 13px; margin-top: 15px;">CODE EXPIRES IN 10 MINUTES</p>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">This is a security message from ${restaurantName}.</p>
            </div>
        `;

        // Generate SMTP config (exact same as working newsletter route)
        const smtpConfig = (restaurant.smtpHost && restaurant.smtpUser && restaurant.smtpPass)
            ? {
                host: restaurant.smtpHost,
                port: restaurant.smtpPort || 587,
                secure: restaurant.smtpSecure || false,
                auth: {
                    user: restaurant.smtpUser,
                    pass: restaurant.smtpPass
                }
            } : undefined;

        // 📡 Send Email FIRST
        const emailResult = await sendEmail({
            to: email,
            subject: `Verification Code: ${otp}`,
            html: emailHtml,
            fromName: restaurantName,
            smtpConfig
        });

        if (!emailResult.success) {
            console.error('❌ Registration Email Failed:', emailResult.error);
            return errorResponse('Could not send verification email. Please try again later.', null, 500);
        }

        // Now create customer after email success
        const customer = await prisma.customer.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                restaurantId,
                isEmailVerified: false,
                emailOtp: otp,
                otpExpiresAt
            } as any
        })

        // Return success but ask for verification
        return successResponse({
            email: customer.email,
            requiresVerification: true
        }, 'Account created! Please check your email for the verification code.', 201)

    } catch (error: any) {
        console.error('Registration Error:', error)
        return errorResponse('Registration failed', error.message, 500)
    }
}
