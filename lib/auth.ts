import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
);

export type AuthPayload = {
    userId: string;
    email: string;
    role: string;
    restaurantId?: string;
};

export async function signToken(payload: AuthPayload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload as AuthPayload;
    } catch (error) {
        return null;
    }
}

export async function setAuthCookie(payload: AuthPayload) {
    const token = await signToken(payload);
    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

export async function getAuthContext() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    return await verifyToken(token);
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
}
