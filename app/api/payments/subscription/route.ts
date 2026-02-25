import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { withAuth } from "@/lib/with-auth";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json();
        const { plan, billingCycle, amount } = body;

        if (!plan || !amount) {
            return errorResponse("Missing plan or amount", "Bad Request", 400);
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: auth.restaurantId! },
        });

        if (!restaurant) {
            return errorResponse("Restaurant not found", "Not Found", 404);
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${plan} Plan Upgrade - ${restaurant.name}`,
                            description: `Subscription renewal for ${plan} plan (${billingCycle})`,
                        },
                        unit_amount: Math.round(Number(amount) * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=cancel`,
            metadata: {
                type: "subscription_payment",
                restaurantId: restaurant.id,
                plan: plan,
                billingCycle: billingCycle,
            },
        });

        return successResponse({ url: session.url });

    } catch (error: any) {
        console.error("Subscription Checkout Error:", error);
        return errorResponse("Failed to create checkout session", error.message, 500);
    }
});
