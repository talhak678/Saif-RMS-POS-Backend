import { NextRequest } from "next/server";
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
    return async (req: NextRequest, props: any) => {
        try {
            // Wait for params if they exist (Next.js 15+ standard)
            const params = props?.params ? await props.params : {};
            const auth = await getAuthContext(req);

            if (!auth) {
                return errorResponse("Authentication required", null, 401);
            }

            if (options.roles && !options.roles.some(r => r.toLowerCase() === auth.role.toLowerCase())) {
                return errorResponse("Permission denied", null, 403);
            }

            // Correctly pass Promise.resolve(params) to satisfy the Context type
            return await handler(req, { params: Promise.resolve(params), auth });
        } catch (error: any) {
            console.error("Auth Error:", error);
            return errorResponse("Server error during authentication", error.message, 500);
        }
    };
}
