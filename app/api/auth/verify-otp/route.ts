import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { verifyOtpSchema } from '@/lib/validations/user'
import { comparePassword } from '@/lib/auth-utils'

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = verifyOtpSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, otp } = validation.data

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user || !user.otp || !user.otpExpires) {
            return errorResponse('Invalid request or OTP not found', null, 400)
        }

        // Check OTP expiry
        if (new Date() > user.otpExpires) {
            return errorResponse('OTP has expired. Please request a new one.', null, 400)
        }

        // Verify OTP against hashed value
        const isOtpValid = await comparePassword(otp, user.otp)
        if (!isOtpValid) {
            return errorResponse('Invalid OTP', null, 400)
        }

        // Mark OTP as verified and clear OTP fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpires: null,
                otpVerified: true,
            }
        })

        return successResponse(null, 'OTP verified successfully. You can now reset your password.')
    } catch (error: any) {
        return errorResponse('Something went wrong', error.message, 500)
    }
}
