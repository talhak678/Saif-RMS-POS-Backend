import nodemailer from 'nodemailer'

// 📧 Setup Email Transporter
// Lazy initialization to ensure env vars are fresh
function getTransporter() {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim().replace(/\s/g, ''); // Remove all spaces
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    // CRITICAL: For port 587, 'secure' MUST be false (it uses STARTTLS). 
    // If 'secure' is true on 587, you get "wrong version number" SSL error.
    const secure = port === 465; 

    console.log(`🔌 Initializing Transporter: ${host}:${port} (Secure: ${secure})`);

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        // Force STARTTLS if using port 587
        requireTLS: port === 587,
        connectionTimeout: 5000, 
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
}

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
        let activeTransporter;

        if (smtpConfig) {
            // 🛡️ Safe Config: Automatically fix 'secure' based on port
            const port = Number(smtpConfig.port) || 587;
            const isSecure = port === 465; // Only 465 should be true
            
            console.log(`📡 Using Custom SMTP: ${smtpConfig.host}:${port} (Secure: ${isSecure})`);
            
            activeTransporter = nodemailer.createTransport({
                host: (smtpConfig.host || '').trim(),
                port: port,
                secure: isSecure,
                auth: {
                    user: (smtpConfig.auth.user || '').trim(),
                    pass: (smtpConfig.auth.pass || '').trim().replace(/\s/g, '')
                },
                requireTLS: port === 587,
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 5000,
            });
        } else {
            activeTransporter = getTransporter();
        }

        const fromEmail = smtpConfig ? smtpConfig.auth.user.trim() : (process.env.SMTP_USER || '').trim();

        console.log(`📡 Sending email to: ${to} from: ${fromEmail}`);

        const info = await activeTransporter.sendMail({
            from: `"${fromName || 'Saif RMS'}" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
        })
        console.log('✅ Email sent successfully: %s', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('❌ SMTP Error Details:', error)
        return { success: false, error }
    }
}

// 📋 Helper to format order items table
function getOrderDetailsTable(items: any[], total: number, deliveryCharge: number) {
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                <strong>${item.menuItem?.name || item.name || 'Item'}</strong><br>
                <span style="font-size: 12px; color: #888;">Qty: ${item.quantity} × Rs. ${item.price}</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
                Rs. ${item.price * item.quantity}
            </td>
        </tr>
    `).join('');

    return `
        <div style="margin: 20px 0; border-top: 2px solid #eee; padding-top: 20px;">
            <h4 style="margin: 0 0 15px 0; text-transform: uppercase; font-size: 12px; color: #888; letter-spacing: 1px;">Order Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${itemsHtml}
                <tr>
                    <td style="padding: 15px 0 5px 0;">Subtotal</td>
                    <td style="padding: 15px 0 5px 0; text-align: right;">Rs. ${total}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0 15px 0; border-bottom: 2px solid #eee;">Delivery Fee</td>
                    <td style="padding: 5px 0 15px 0; border-bottom: 2px solid #eee; text-align: right;">Rs. ${deliveryCharge}</td>
                </tr>
                <tr>
                    <td style="padding: 15px 0; font-size: 18px; font-weight: bold;">Total Amount</td>
                    <td style="padding: 15px 0; font-size: 18px; font-weight: bold; text-align: right; color: #2ecc71;">Rs. ${Number(total) + Number(deliveryCharge)}</td>
                </tr>
            </table>
        </div>
    `;
}

// 🍔 Order Notification Templates (Professional English)
export function getOrderConfirmedTemplate(customerName: string, orderId: string, restaurantName: string, items: any[], total: number, deliveryCharge: number) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2ecc71; margin-top: 0;">Order Confirmed! 🎉</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Great news! Your order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> has been confirmed and is now being processed by our kitchen.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2ecc71;">
                <p style="margin: 0 0 5px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
            </div>

            ${getOrderDetailsTable(items, total, deliveryCharge)}

            <p>We'll notify you once it's ready and on its way to you.</p>
            <p>Thank you for choosing us!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from ${restaurantName} via Saif RMS.</p>
        </div>
    `
}

export function getOrderReadyTemplate(customerName: string, orderId: string, restaurantName: string, items: any[], total: number, deliveryCharge: number) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #f39c12; margin-top: 0;">Order is Ready! 🍔</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your delicious order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> is ready and waiting! It has been prepared with care and is about to be dispatched.</p>
            
            <div style="background-color: #fcf8e3; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f39c12;">
                <p style="margin: 0 0 5px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
            </div>

            ${getOrderDetailsTable(items, total, deliveryCharge)}

            <p>Get ready to enjoy your meal!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Powered by Saif RMS POS System</p>
        </div>
    `
}

export function getOrderOutForDeliveryTemplate(customerName: string, orderId: string, restaurantName: string, items: any[], total: number, deliveryCharge: number) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #3498db; margin-top: 0;">Out for Delivery! 🛵</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> is on its way! Our rider has picked up your meal and is headed to your location right now.</p>
            
            <div style="background-color: #ebf5fb; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3498db;">
                <p style="margin: 0 0 10px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
                <p style="margin: 10px 0 0 0; color: #3498db;"><strong>Status:</strong> En Route</p>
            </div>

            ${getOrderDetailsTable(items, total, deliveryCharge)}

            <p>Please stay reachable on your phone. See you soon!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">${restaurantName} & RMS Team</p>
        </div>
    `
}

export function getOrderDeliveredTemplate(customerName: string, orderId: string, restaurantName: string, items: any[], total: number, deliveryCharge: number) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #27ae60; margin-top: 0;">Enjoy Your Meal! ✅</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>We hope you've received your order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> and are enjoying it!</p>
            
            <div style="background-color: #e9f7ef; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #27ae60;">
                <p style="margin: 0 0 5px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Status:</strong> Delivered Successfully</p>
            </div>

            ${getOrderDetailsTable(items, total, deliveryCharge)}

            <p>We look forward to serving you again soon.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Saif RMS POS Team</p>
        </div>
    `
}

export function getOrderCancelledTemplate(customerName: string, orderId: string, restaurantName: string, items: any[], total: number, deliveryCharge: number, reason?: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #e74c3c; margin-top: 0;">Order Cancelled ❌</h2>
            </div>
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>We regret to inform you that your order <strong>#${orderId}</strong> from <strong>${restaurantName}</strong> has been cancelled.</p>
            
            <div style="background-color: #fdedec; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #e74c3c;">
                <p style="margin: 0 0 5px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
                <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
                ${reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>

            ${getOrderDetailsTable(items, total, deliveryCharge)}

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

export function getRegistrationOtpTemplate(customerName: string, otp: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; color: #333; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #ef4444; width: 60px; height: 60px; border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <span style="font-size: 30px;">🔐</span>
                </div>
                <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 800;">Verify Your Account</h2>
                <p style="color: #666; margin-top: 10px;">Welcome to ${restaurantName}!</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${customerName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">Thanks for signing up! To complete your registration and secure your account, please use the 6-digit verification code below:</p>
            
            <div style="background-color: #f9fafb; padding: 40px; border-radius: 16px; margin: 30px 0; text-align: center; border: 2px dashed #e5e7eb;">
                <h1 style="color: #ef4444; letter-spacing: 12px; margin: 0; font-size: 42px; font-weight: 900;">${otp}</h1>
                <p style="color: #9ca3af; font-size: 13px; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px;">Code expires in 10 minutes</p>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; background: #fffbe6; padding: 12px; border-radius: 8px; border: 1px solid #ffe58f;">
                <strong>Security Note:</strong> Never share this code with anyone. Our team will never ask for your PIN.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 35px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">This is an automated security message from ${restaurantName}.</p>
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

export function getNewOrderRestaurantAlertTemplate(restaurantName: string, orderNo: string, customerName: string, customerPhone: string, items: any[], total: number, deliveryCharge: number, type: string, address?: string) {
    const itemsTable = getOrderDetailsTable(items, total, deliveryCharge);
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e1e1; border-radius: 16px; color: #333; border-top: 6px solid #5d69b9;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #5d69b9; margin-top: 0;">New Order Received! 🛒</h2>
                <p style="font-size: 14px; color: #666;">Order #${orderNo} from Website</p>
            </div>
            
            <p>Hi <strong>${restaurantName}</strong> Team,</p>
            <p>You have received a new <strong>${type}</strong> order via your website.</p>
            
            <div style="background-color: #f0f2ff; padding: 20px; border-radius: 12px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${customerName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${customerPhone}</p>
                ${address ? `<p style="margin: 0;"><strong>Delivery Address:</strong> ${address}</p>` : ''}
            </div>

            ${itemsTable}

            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 14px; color: #555;">Please log in to your dashboard to manage this order.</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">Automated Order Alert @ Saif RMS</p>
        </div>
    `
}

export function getMerchantAdminWelcomeTemplate(name: string, email: string, rawPassword: string, restaurantName: string) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; color: #333; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 800;">Welcome to PlatterOS!</h2>
                <p style="color: #666; margin-top: 10px;">Your restaurant account is ready</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                We are thrilled to let you know that your account for <strong>${restaurantName}</strong> has been successfully created on PlatterOS (formerly RMS POS).
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                You can now log in to the admin dashboard and start managing your restaurant, menu, and orders. Here are your login credentials:
            </p>
            
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 16px; margin: 30px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Login URL:</strong> <a href="https://app.platteros.com/" style="color: #5d69b9; text-decoration: none;">platteros.com/login</a></p>
                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Email (Username):</strong> ${email}</p>
                <p style="margin: 0; font-size: 15px;"><strong>Password:</strong> <span style="font-family: monospace; background: #eee; padding: 3px 6px; border-radius: 4px;">${rawPassword}</span></p>
            </div>
            
            <p style="font-size: 14px; color: #666; text-align: center; background: #fffbe6; padding: 12px; border-radius: 8px; border: 1px solid #ffe58f;">
                <strong>Security Recommendation:</strong> For security reasons, we strongly advise you to change your password immediately after logging in for the first time.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555; margin-top: 30px;">
                If you have any questions or need assistance setting up your menu, please reach out to our support team.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 35px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Welcome aboard! Team PlatterOS</p>
        </div>
    `
}
