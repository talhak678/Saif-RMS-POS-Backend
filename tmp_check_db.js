const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const restaurant = await prisma.restaurant.findFirst({
        where: { slug: 'saifs-kitchen' },
        include: { branches: true }
    });
    console.log(JSON.stringify(restaurant, null, 2));
    process.exit(0);
}

check();
