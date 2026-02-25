import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey || "", {
    apiVersion: "2024-06-20" as any,
});

// POST /api/stripe-intent — accepts both admin tokens AND customer-tokens
export async function POST(req: NextRequest) {
    try {
        // Get auth context — supports both admin (auth_token) and customer (customer-token)
        const auth = await getAuthContext(req);

        if (!auth || !auth.userId) {
            return errorResponse("Authentication required", "Unauthorized", 401);
        }

        const body = await req.json();
        const { orderId, amount } = body;
        console.log("💳 Creating Stripe Intent for Order Input:", orderId, "Amount:", amount, "Role:", auth.role);

        if (!orderId || !amount) {
            return errorResponse("Missing orderId or amount", "Bad Request", 400);
        }

        // Handle both Order ID (string) and Order Number (integer)
        const cleanOrderId = String(orderId).replace('#', '').trim();
        const isNumeric = /^\d+$/.test(cleanOrderId);

        let order: any;
        if (isNumeric) {
            order = await prisma.order.findFirst({
                where: { orderNo: parseInt(cleanOrderId) },
                select: { id: true, customerId: true, branch: { select: { restaurantId: true } } }
            });
        } else {
            order = await prisma.order.findUnique({
                where: { id: cleanOrderId },
                select: { id: true, customerId: true, branch: { select: { restaurantId: true } } }
            });
        }

        if (!order) {
            console.error("❌ Order not found in DB with Input:", orderId);
            return errorResponse(`Order ${orderId} not found in database`, "Not Found", 404);
        }

        // Authorization — allow: SUPER_ADMIN, admins of same restaurant, or the customer who placed the order
        // NOTE: auth.ts returns role as lowercase 'customer' for customer tokens
        const isCustomer = auth.role === "customer";
        const isSuperAdmin = auth.role === "SUPER_ADMIN";
        const isSameRestaurant = !isCustomer && auth.restaurantId && order.branch.restaurantId === auth.restaurantId;
        const isOrderOwner = isCustomer && (order.customerId === auth.userId);

        console.log("🔐 Auth check:", { role: auth.role, isCustomer, isSuperAdmin, isSameRestaurant, isOrderOwner, orderCustomerId: order.customerId, authUserId: auth.userId });

        if (!isSuperAdmin && !isSameRestaurant && !isOrderOwner) {
            console.error("🚫 Unauthorized access attempt for order:", orderId, "by user:", auth.userId, "role:", auth.role);
            return errorResponse("You are not authorized to pay for this order", "Forbidden", 403);
        }

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // Stripe expects cents (e.g. $10.00 → 1000)
            currency: "usd",
            metadata: {
                orderId: order.id,
                restaurantId: order.branch.restaurantId,
                customerId: order.customerId || "",
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        await prisma.payment.upsert({
            where: { orderId: order.id },
            update: {
                transactionId: paymentIntent.id,
                status: "PENDING",
                method: "STRIPE"
            },
            create: {
                orderId: order.id,
                amount: Number(amount),
                method: "STRIPE",
                status: "PENDING",
                transactionId: paymentIntent.id
            }
        });

        console.log("✅ Stripe PaymentIntent created:", paymentIntent.id);

        return successResponse({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error: any) {
        console.error("Stripe Create Intent Error:", error);
        return errorResponse("Failed to create payment intent", error.message, 500);
    }
}
