const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const restaurants = await prisma.restaurant.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            customDomain: true
        }
    });
    console.log('--- Current Restaurants ---');
    console.log(JSON.stringify(restaurants, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
