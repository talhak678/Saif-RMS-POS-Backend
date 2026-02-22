import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            // If no secret, we might be testing locally without webhook CLI
            // For production, ALWAYS require secret
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
    } catch (err: any) {
        console.error(`Webhook Signature Error: ${err.message}`);
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

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
