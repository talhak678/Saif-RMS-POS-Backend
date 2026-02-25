const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function test() {
    try {
        const email = 'test@example.com';
        console.log('--- Submitting Forgot Password ---');
        
        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log('User not found. Please ensure test@example.com exists in DB.');
            return;
        }

        // Simulate OTP logic
        const otp = '123456';
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: { otp: hashedOtp, otpExpires }
        });
        console.log('OTP generated and saved to DB.');

        // Verify Reset
        console.log('--- Verifying Reset Password ---');
        const updatedUser = await prisma.user.findUnique({ where: { email } });
        const isMatch = await bcrypt.compare(otp, updatedUser.otp);
        console.log('OTP Match:', isMatch);

        if (isMatch && updatedUser.otpExpires > new Date()) {
            const newPassword = 'newPassword123';
            const hashedPass = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPass, otp: null, otpExpires: null }
            });
            console.log('Password reset successfully simulation done.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
