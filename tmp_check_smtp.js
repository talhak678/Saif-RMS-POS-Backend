const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const restaurants = await prisma.restaurant.findMany({
            select: { id: true, name: true, smtpHost: true, smtpUser: true, smtpPass: true }
        });
        console.log('Restaurants and their SMTP status:');
        restaurants.forEach(r => {
            console.log(`- ${r.name}: ${r.smtpHost ? 'Has SMTP' : 'No SMTP'} (${r.smtpUser || 'no user'})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
