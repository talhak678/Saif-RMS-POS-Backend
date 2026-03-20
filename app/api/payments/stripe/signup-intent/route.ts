import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey || "", {
    apiVersion: "2024-06-20" as any,
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { plan, amount, contactEmail } = body;

        if (!plan || !amount) {
            return errorResponse("Missing plan or amount", "Bad Request", 400);
        }

        console.log("💳 Creating Signup Stripe Intent for Plan:", plan, "Amount:", amount);

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // Stripe expects cents
            currency: "usd",
            metadata: {
                type: "SIGNUP_PAYMENT",
                plan: plan,
                contactEmail: contactEmail || "",
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return successResponse({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });

    } catch (error: any) {
        console.error("Signup Stripe Intent Error:", error);
        return errorResponse("Failed to create payment intent", error.message, 500);
    }
}
