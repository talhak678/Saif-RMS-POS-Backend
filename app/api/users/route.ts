import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth-utils'
import { userCreateSchema } from '@/lib/validations/user'
import { withAuth } from '@/lib/with-auth'
import { sendEmail, getMerchantAdminWelcomeTemplate } from '@/lib/email'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const users = await prisma.user.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                },
                restaurant: true
            },
            orderBy: { createdAt: 'desc' },
        })

        const sanitizedUsers = users.map(({ password, ...user }) => user)
        return successResponse(sanitizedUsers)
    } catch (error: any) {
        return errorResponse('Failed to fetch users', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = userCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, roleId, restaurantId } = validation.data
        const hashedPassword = await hashPassword(password)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                roleId,
                restaurantId
            },
            include: {
                role: true
            }
        })

        // 📧 SEND WELCOME EMAIL IF ROLE IS 'Merchant Admin'
        let emailSent = false;
        let emailErrorMsg = null;

        if (user.role?.name === 'Merchant Admin' && restaurantId) {
            try {
                // Manually fetch the restaurant to ensure we have all SMTP settings and it's full data
                const restaurant = await prisma.restaurant.findUnique({
                    where: { id: restaurantId }
                });

                if (restaurant) {
                    const htmlContent = getMerchantAdminWelcomeTemplate(
                        user.name || 'User', 
                        user.email, 
                        password, // Send raw password so they know what to login with
                        restaurant.name
                    );

                    const emailResponse = await sendEmail({
                        to: user.email,
                        subject: 'Welcome to PlatterOS - Your Account is Ready! 🎉',
                        html: htmlContent,
                        fromName: 'PlatterOS Team'
                    });
                    
                    if (emailResponse && emailResponse.success) {
                        emailSent = true;
                    } else {
                        emailErrorMsg = emailResponse?.error ? ((emailResponse.error as any).message || String(emailResponse.error)) : 'Unknown error occurred while sending email';
                        console.error('Failed to send welcome email (sendEmail return):', emailErrorMsg);
                    }
                }
            } catch (emailError: any) {
                console.error('Exception while sending welcome email:', emailError);
                emailErrorMsg = emailError.message || String(emailError);
            }
        }

        const { password: _, ...sanitizedUser } = user
        
        const responseData = {
            ...sanitizedUser,
            emailSent,
            ...(emailErrorMsg ? { emailError: emailErrorMsg } : {})
        };

        const responseMessage = emailErrorMsg 
            ? `User created successfully but failed to send welcome email (${emailErrorMsg})` 
            : 'User created successfully';

        return successResponse(responseData, responseMessage, 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Email already exists')
        return errorResponse('Failed to create user', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] }) // Only Admins can manage users
