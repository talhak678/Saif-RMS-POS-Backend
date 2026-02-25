import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey || "", {
    apiVersion: "2024-06-20" as any, // Use any or specific version to avoid build-time strictness
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    console.log("📥 Incoming Webhook Request...");
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    console.log("📜 Signature:", sig ? "Found" : "Missing");
    console.log("🔑 Secret:", endpointSecret ? "Configured" : "Missing");

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            console.log("⚠️ Bypassing signature check for local testing");
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case "payment_intent.succeeded":
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata.orderId;

            if (orderId) {
                // 1. Update Payment record status
                await prisma.payment.update({
                    where: { orderId: orderId },
                    data: { status: "PAID", transactionId: paymentIntent.id }
                });

                // 2. Update Order status to CONFIRMED (since it's paid)
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: "CONFIRMED" }
                });

                console.log(`Payment successful and Order confirmed: ${orderId}`);
            }
            break;

        case "payment_intent.payment_failed":
            const failedIntent = event.data.object as Stripe.PaymentIntent;
            await prisma.payment.updateMany({
                where: { transactionId: failedIntent.id },
                data: { status: "FAILED" }
            });
            console.log(`Payment failed: ${failedIntent.id}`);
            break;

        case "checkout.session.completed":
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.metadata?.type === "subscription_payment") {
                const { restaurantId, plan, billingCycle } = session.metadata;

                const now = new Date();
                const endDate = new Date(now);
                if (billingCycle === "YEARLY") {
                    endDate.setFullYear(now.getFullYear() + 1);
                } else {
                    endDate.setMonth(now.getMonth() + 1);
                }

                await prisma.restaurant.update({
                    where: { id: restaurantId },
                    data: {
                        subscription: plan as any,
                        subStartDate: now,
                        subEndDate: endDate,
                    }
                });
                console.log(`✅ Subscription updated for restaurant: ${restaurantId} to ${plan}`);
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
