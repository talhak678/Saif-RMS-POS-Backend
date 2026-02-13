import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthPayload } from "./auth";
import { errorResponse } from "./api-response";

type Context = {
    params: Promise<any>; // Next.js 15+ params are promises
    auth: AuthPayload
};

type AuthenticatedHandler = (
    req: NextRequest,
    context: Context
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler, options: { roles?: string[] } = {}) {
    return async (req: NextRequest, props: { params: Promise<any> }) => {
        try {
            const auth = await getAuthContext();

            if (!auth) {
                return errorResponse("Authentication required", null, 401);
            }

            if (options.roles && !options.roles.includes(auth.role)) {
                return errorResponse("Permission denied", null, 403);
            }

            return handler(req, { params: props.params, auth });
        } catch (error: any) {
            console.error("Auth Middleware Error:", error);
            return errorResponse("Server error during authentication", error.message, 500);
        }
    };
}
