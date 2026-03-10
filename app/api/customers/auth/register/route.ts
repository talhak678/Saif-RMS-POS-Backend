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
            } as any,
            include: {
                restaurant: true
            }
        })

        // 📧 Send Verification Email
        try {
            const restaurant = customer.restaurant as any;
            const restaurantName = (restaurant?.name || 'Saif RMS').trim();

            console.log('🏢 Restaurant Data for Email:', {
                id: restaurant?.id,
                name: restaurantName,
                smtpHost: restaurant?.smtpHost,
                smtpUser: restaurant?.smtpUser,
                hasSmtpPass: !!restaurant?.smtpPass
            });

            // Generate SMTP config from restaurant settings (exact same as working routes)
            const smtpConfig = (restaurant?.smtpHost && restaurant?.smtpUser && restaurant?.smtpPass)
                ? {
                    host: restaurant.smtpHost,
                    port: restaurant.smtpPort || 587,
                    secure: restaurant.smtpSecure || false,
                    auth: {
                        user: restaurant.smtpUser,
                        pass: restaurant.smtpPass
                    }
                } : undefined;

            console.log(`📡 Registration: Attempting to send OTP to ${email} for restaurant ${restaurantName}`);
            console.log('📡 SMTP Config used:', smtpConfig ? 'Custom Restaurant SMTP' : 'Global Default SMTP');

            const emailResult = await sendEmail({
                to: email,
                subject: `Verify Your Account - ${restaurantName}`,
                html: getRegistrationOtpTemplate(name, otp, restaurantName),
                fromName: restaurantName,
                smtpConfig
            });
            console.log('📬 Email Send Result:', emailResult);
        } catch (emailErr) {
            console.error('❌ Registration Email Error:', emailErr);
        }

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
