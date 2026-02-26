import nodemailer from 'nodemailer'

// 📧 Setup Email Transporter
// You should add these to your .env file
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // Your email
        pass: process.env.SMTP_PASS, // Your app password
    },
})

interface SmtpConfig {
    host: string
    port: number
    secure: boolean
    auth: {
        user: string
        pass: string
    }
}

interface SendEmailOptions {
    to: string
    subject: string
    text?: string
    html: string
    fromName?: string
    smtpConfig?: SmtpConfig
}

export async function sendEmail({ to, subject, text, html, fromName, smtpConfig }: SendEmailOptions) {
    try {
        // Use custom smtp if provided, else use global default
        const activeTransporter = smtpConfig
            ? nodemailer.createTransport(smtpConfig)
            : transporter;

        const fromEmail = smtpConfig ? smtpConfig.auth.user : process.env.SMTP_USER;

        const info = await activeTransporter.sendMail({
            from: `"${fromName || 'Saif RMS'}" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
        })
        console.log('✅ Email sent: %s', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('❌ Error sending email:', error)
        return { success: false, error }
    }
}

// 🍔 Order Notification Templates (Professional English)
export function getOrderConfirmedTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2ecc71; margin-top: 0;">Order Confirmed! 🎉</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Great news! Your order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> has been confirmed and is now being processed by our kitchen.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2ecc71;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
            </div>
            <p>We'll notify you once it's ready and on its way to you.</p>
            <p>Thank you for choosing us!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from ${restaurantName} via Saif RMS.</p>
        </div>
    `
}

export function getOrderReadyTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #f39c12; margin-top: 0;">Order is Ready! 🍔</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your delicious order <strong>#${orderId}</strong> is ready and waiting! It has been prepared with care and is about to be dispatched.</p>
            <div style="background-color: #fcf8e3; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f39c12;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
            </div>
            <p>Get ready to enjoy your meal!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Powered by Saif RMS POS System</p>
        </div>
    `
}

export function getOrderOutForDeliveryTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #3498db; margin-top: 0;">Out for Delivery! 🛵</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your order <strong>#${orderId}</strong> is on its way! Our rider has picked up your meal and is headed to your location right now.</p>
            <div style="background-color: #ebf5fb; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3498db;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
                <p style="margin: 10px 0 0 0; color: #3498db;"><strong>Status:</strong> En Route</p>
            </div>
            <p>Please stay reachable on your phone. See you soon!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Saif Kitchen & RMS Team</p>
        </div>
    `
}

export function getOrderDeliveredTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #27ae60; margin-top: 0;">Enjoy Your Meal! ✅</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>We hope you've received your order <strong>#${orderId}</strong> and are enjoying it! We'd love to hear your feedback on the food and service.</p>
            <div style="background-color: #e9f7ef; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #27ae60;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Status:</strong> Delivered Successfully</p>
            </div>
            <p>We look forward to serving you again soon.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Saif RMS POS Team</p>
        </div>
    `
}

export function getOrderCancelledTemplate(customerName: string, orderId: string, restaurantName: string, reason?: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #e74c3c; margin-top: 0;">Order Cancelled ❌</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>We regret to inform you that your order <strong>#${orderId}</strong> has been cancelled.</p>
            <div style="background-color: #fdedec; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #e74c3c;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
                ${reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>If you have any questions or would like to re-order, please feel free to contact us.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Saif RMS Customer Support</p>
        </div>
    `
}

export function getOtpEmailTemplate(otp: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #5d69b9; margin-top: 0;">Verify Your Identity 🔐</h2>
            </div>
            <p>Hello,</p>
            <p>You have requested to reset your password. Use the verification code below to proceed:</p>
            <div style="background-color: #f0f2ff; padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px dashed #5d69b9;">
                <h1 style="color: #5d69b9; letter-spacing: 8px; margin: 0; font-size: 32px;">${otp}</h1>
            </div>
            <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please secure your account immediately.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Security Team @ Saif RMS</p>
        </div>
    `
}

export function getSubscriptionWarningTemplate(customerName: string, daysLeft: number, restaurantName: string, expiryDate: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #e67e22; margin-top: 0;">Action Required: Plan Expiring Soon ⚠️</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your subscription for <strong>${restaurantName}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
            <div style="background-color: #fdf5e6; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #f39c12;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
                <p style="margin: 0; color: #d35400;"><strong>Status:</strong> ${daysLeft} days remaining</p>
            </div>
            <p>Please renew your plan to avoid any disruption to your POS services. You can renew directly from your dashboard.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Billing Support @ Saif RMS</p>
        </div>
    `
}

export function getSubscriptionExpiredTemplate(customerName: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333; border-top: 6px solid #e74c3c;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #e74c3c; margin-top: 0;">Subscription Expired 🛑</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your subscription for <strong>${restaurantName}</strong> has expired. Access to your dashboard and POS features has been temporarily restricted.</p>
            <div style="background-color: #fdedec; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e74c3c; text-align: center;">
                <p style="margin: 0; color: #c0392b; font-weight: bold;">Account Restricted</p>
            </div>
            <p>To restore full access, please renew your subscription or contact our support team.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Saif RMS Team</p>
        </div>
    `
}
