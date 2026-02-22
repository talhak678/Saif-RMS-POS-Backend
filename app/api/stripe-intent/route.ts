import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { withAuth } from "@/lib/with-auth";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json();
        const { orderId, amount } = body;
        console.log("💳 Creating Stripe Intent for Order Input:", orderId, "Amount:", amount);

        if (!orderId || !amount) {
            return errorResponse("Missing orderId or amount", "Bad Request", 400);
        }

        // Handle both Order ID (string) and Order Number (integer)
        // Remove '#' if present
        const cleanOrderId = String(orderId).replace('#', '').trim();
        const isNumeric = /^\d+$/.test(cleanOrderId);

        let order;
        if (isNumeric) {
            // Search by orderNo if input is numeric
            order = await prisma.order.findFirst({
                where: { orderNo: parseInt(cleanOrderId) },
                include: { branch: true }
            });
        } else {
            // Search by literal ID
            order = await prisma.order.findUnique({
                where: { id: cleanOrderId },
                include: { branch: true }
            });
        }

        if (!order) {
            console.error("❌ Order not found in DB with Input:", orderId);
            return errorResponse(`Order ${orderId} not found in database`, "Not Found", 404);
        }

        if (auth.role !== 'SUPER_ADMIN' && order.branch.restaurantId !== auth.restaurantId) {
            console.error("🚫 Unauthorized access attempt for order:", orderId);
            return errorResponse("You are not authorized to pay for this order", "Forbidden", 403);
        }

        // 2. Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // Stripe expects cents
            currency: "usd", // Changed to USD to match frontend label and avoid "amount too small" error
            metadata: {
                orderId: order.id,
                restaurantId: order.branch.restaurantId,
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

        return successResponse({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error: any) {
        console.error("Stripe Create Intent Error:", error);
        return errorResponse("Failed to create payment intent", error.message, 500);
    }
});
