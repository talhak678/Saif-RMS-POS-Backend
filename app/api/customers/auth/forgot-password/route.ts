import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { email, restaurantId, resetUrl } = await req.json();

        if (!email || !restaurantId) {
            return NextResponse.json(
                { success: false, message: "Email and restaurant ID are required." },
                { status: 400 }
            );
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });

        if (!restaurant) {
            return NextResponse.json(
                { success: false, message: "Restaurant not found." },
                { status: 404 }
            );
        }

        const customer = await prisma.customer.findFirst({
            where: { email, restaurantId },
        });

        if (!customer) {
            return NextResponse.json(
                { success: false, message: "No account found with this email. Please sign up first." },
                { status: 404 }
            );
        }

        // Generate reset token
        const resetToken = await signToken({
            userId: customer.id,
            email: customer.email as string,
            role: "customer-reset",
            restaurantId,
        });

        // Use the provided resetUrl or fallback to a relative path (caller should handle parsing)
        const baseUrl = resetUrl ? resetUrl : "http://localhost:3000";
        const link = `${baseUrl}/reset-password?token=${resetToken}`;

        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #3498db; margin-top: 0;">Reset Your Password 🔑</h2>
                </div>
                <p>Hello <strong>${customer.name}</strong>,</p>
                <p>You recently requested to reset your password for your account at <strong>${restaurant.name}</strong>.</p>
                <p>Click the button below to reset it. This link will expire in 24 hours.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #3498db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>If you did not request a password reset, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">${restaurant.name}</p>
            </div>
        `;

        const emailResult = await sendEmail({
            to: email,
            subject: "Password Reset Request",
            html,
            fromName: restaurant.name,
            smtpConfig: restaurant.smtpHost ? {
                host: restaurant.smtpHost,
                port: restaurant.smtpPort || 587,
                secure: restaurant.smtpSecure,
                auth: {
                    user: restaurant.smtpUser || "",
                    pass: restaurant.smtpPass || "",
                }
            } : undefined
        });

        if (!emailResult.success) {
            console.error('❌ Forgot Password Email Error:', emailResult.error);
            const errorMsg = (emailResult.error as any)?.message || 'Email service unavailable';
            return NextResponse.json(
                { success: false, message: `Email Error: ${errorMsg}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "If an account with this email exists, a password reset link has been sent.",
        });

    } catch (error: any) {
        console.error("Customers Forgot Password Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Something went wrong" },
            { status: 500 }
        );
    }
}
