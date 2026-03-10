import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { success: false, message: "Invalid or missing parameters." },
                { status: 400 }
            );
        }

        const payload = await verifyToken(token);

        if (!payload || payload.role !== "customer-reset" || !payload.userId) {
            return NextResponse.json(
                { success: false, message: "Invalid or expired reset token." },
                { status: 401 }
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.customer.update({
            where: { id: payload.userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json({
            success: true,
            message: "Password has been successfully reset. You can now log in.",
        });

    } catch (error: any) {
        console.error("Customers Reset Password Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Something went wrong" },
            { status: 500 }
        );
    }
}
