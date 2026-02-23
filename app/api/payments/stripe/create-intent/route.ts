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

        if (!orderId || !amount) {
            return errorResponse("Missing orderId or amount", "Bad Request", 400);
        }

        // 1. Verify order exists and belongs to user's restaurant
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { branch: true }
        });

        if (!order || (auth.role !== 'SUPER_ADMIN' && order.branch.restaurantId !== auth.restaurantId)) {
            return errorResponse("Order not found or unauthorized", "Unauthorized", 404);
        }

        // 2. Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // Stripe expects cents
            currency: "usd", // Set to USD as per requirements
            metadata: {
                orderId: order.id,
                restaurantId: order.branch.restaurantId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // 3. Create a pending payment record in database
        await prisma.payment.upsert({
            where: { orderId: orderId },
            update: {
                transactionId: paymentIntent.id,
                status: "PENDING",
                method: "STRIPE"
            },
            create: {
                orderId: orderId,
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
