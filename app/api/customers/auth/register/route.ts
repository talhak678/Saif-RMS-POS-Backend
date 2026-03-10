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
            where: { id: restaurantId },
            select: {
                id: true,
                name: true,
                smtpHost: true,
                smtpPort: true,
                smtpUser: true,
                smtpPass: true,
                smtpSecure: true,
            }
        });

        if (!restaurant) {
            return errorResponse('Restaurant info missing', null, 404)
        }

        const restaurantName = (restaurant.name || 'Saif RMS').trim();

        // 📧 Prepare Email Content (Hardcoded & Simple for better delivery)
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eeeeee; border-radius: 12px;">
                <h2 style="color: #333; text-align: center;">Welcome to ${restaurantName}</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>Thank you for joining us. Please use the following code to verify your email address:</p>
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #cccccc;">
                    <h1 style="font-size: 36px; letter-spacing: 10px; color: #e74c3c; margin: 0;">${otp}</h1>
                    <p style="color: #888; font-size: 12px; margin-top: 10px;">This code will expire in 10 minutes</p>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
                <p style="text-align: center; color: #999; font-size: 12px;">Sent by ${restaurantName} Security Team</p>
            </div>
        `;

        // Generate SMTP config (exact same as newsletter/forgot-password)
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
        console.log(`📡 Registration: Sending email via ${smtpConfig ? 'Custom' : 'Global Default'} SMTP`);
        const emailResult = await sendEmail({
            to: email,
            subject: `Confirm your email - ${restaurantName}`,
            html: emailHtml,
            fromName: restaurantName,
            smtpConfig
        });

        if (!emailResult.success) {
            console.error('❌ Email Dispatch Error:', emailResult.error);
            return errorResponse('Email service currently unavailable. Please try again later.', null, 500);
        }

        // Only create the customer if email report says "Success"
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
