import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { forgotPasswordSchema } from '@/lib/validations/user'
import { sendEmail, getOtpEmailTemplate } from '@/lib/email'
import { hashPassword } from '@/lib/auth-utils'

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = forgotPasswordSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email } = validation.data

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Security: Don't reveal if user exists. 
            // Return success even if email not found to prevent user enumeration.
            return successResponse(null, 'If an account exists with this email, an OTP has been sent.')
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

        // Store hashed OTP and expiry
        // Using hashPassword for OTP is more secure than plain text
        const hashedOtp = await hashPassword(otp)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: hashedOtp,
                otpExpires
            }
        })

        // Send Email
        const { success, error } = await sendEmail({
            to: email,
            subject: 'Password Reset OTP - Saif RMS',
            html: getOtpEmailTemplate(otp),
            fromName: 'Saif RMS Auth'
        })

        if (!success) {
            console.error('Failed to send OTP email:', error)
            return errorResponse('Failed to send OTP email. Please try again later.', null, 500)
        }

        return successResponse(null, 'OTP has been sent to your email.')
    } catch (error: any) {
        return errorResponse('Something went wrong', error.message, 500)
    }
}
