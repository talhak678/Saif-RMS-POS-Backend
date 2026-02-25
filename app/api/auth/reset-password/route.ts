import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { resetPasswordSchema } from '@/lib/validations/user'
import { comparePassword, hashPassword } from '@/lib/auth-utils'

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = resetPasswordSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, otp, newPassword } = validation.data

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user || !user.otp || !user.otpExpires) {
            return errorResponse('Invalid request or OTP expired', null, 400)
        }

        // Check expiry
        if (new Date() > user.otpExpires) {
            return errorResponse('OTP has expired', null, 400)
        }

        // Verify OTP
        const isOtpValid = await comparePassword(otp, user.otp)
        if (!isOtpValid) {
            return errorResponse('Invalid OTP', null, 400)
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword)

        // Update user and clear OTP fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
                otp: null,
                otpExpires: null
            }
        })

        return successResponse(null, 'Password has been reset successfully.')
    } catch (error: any) {
        return errorResponse('Something went wrong', error.message, 500)
    }
}
