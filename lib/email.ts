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

// 🍔 Order Notification Templates
export function getOrderReadyTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ff6600;">Aap ka order ready hai! 🍔</h2>
            <p>Assalam-o-Alaikum <strong>${customerName}</strong>,</p>
            <p>Aap ke liye khushkhabri hai! Aap ka order <strong>#${orderId}</strong> kitchen mein tayyar ho chuka hai aur jald hi aap tak pohnchay ga.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Restaurant:</strong> ${restaurantName}</p>
                <p><strong>Order ID:</strong> #${orderId}</p>
            </div>
            <p>Hamara intekhab karne ka shukriya!</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">Yeh email automatically generate ki gayi hai.</p>
        </div>
    `
}

export function getOrderDeliveredTemplate(customerName: string, orderId: string, restaurantName: string) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #28a745;">Order Delivered! ✅</h2>
            <p>Assalam-o-Alaikum <strong>${customerName}</strong>,</p>
            <p>Umeed hai aap ko aap ka order <strong>#${orderId}</strong> pohnch gaya hoga aur aap isay enjoy karein gay.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Restaurant:</strong> ${restaurantName}</p>
                <p><strong>Status:</strong> Delivered</p>
            </div>
            <p>Aap se jald phir mulaqat hogi!</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">Saif RMS POS Team</p>
        </div>
    `
}
export function getOtpEmailTemplate(otp: string) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #5d69b9;">Password Reset OTP 🔐</h2>
            <p>Assalam-o-Alaikum,</p>
            <p>Aap ne apne account ka password reset karne ke liye request ki hai. Aap ka OTP (One Time Password) neechay diya gaya hai:</p>
            <div style="background-color: #f0f2ff; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <h1 style="color: #5d69b9; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>Yeh OTP <strong>10 minutes</strong> ke liye valid hai. Agar aap ne yeh request nahi ki, toh is email ko ignore karein.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">Saif RMS POS Team</p>
        </div>
    `
}
