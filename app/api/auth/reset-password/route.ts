import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { resetPasswordSchema } from '@/lib/validations/user'
import { hashPassword } from '@/lib/auth-utils'

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = resetPasswordSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, newPassword } = validation.data

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return errorResponse('User not found', null, 404)
        }

        // Ensure OTP was already verified via /api/auth/verify-otp
        if (!user.otpVerified) {
            return errorResponse('OTP has not been verified. Please verify your OTP first.', null, 400)
        }

        // Hash the new password
        const hashedNewPassword = await hashPassword(newPassword)

        // Update password and clear the verified flag
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
                otpVerified: false,
            }
        })

        return successResponse(null, 'Password has been reset successfully.')
    } catch (error: any) {
        return errorResponse('Something went wrong', error.message, 500)
    }
}
