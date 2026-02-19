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

export async function getAuthContext(req?: NextRequest) {
    const cookieStore = await cookies();
    let token = cookieStore.get("auth_token")?.value;

    // Also check for customer-token if auth_token is missing
    if (!token) {
        token = cookieStore.get("customer-token")?.value;
    }

    if (!token && req) {
        const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
    }

    if (!token) return null;

    try {
        const payload = await verifyToken(token);
        // Normalize payload to ensure customerId is handled if present
        if (payload && (payload as any).customerId) {
            return {
                userId: (payload as any).customerId,
                email: payload.email,
                role: 'customer',
                restaurantId: payload.restaurantId
            } as AuthPayload;
        }
        return payload;
    } catch (e) {
        return null;
    }
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
}
