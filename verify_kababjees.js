const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const restaurant = await prisma.restaurant.findFirst({
        where: {
            OR: [
                { slug: 'kababjees' },
                { customDomain: { contains: 'kababjees' } }
            ]
        }
    });
    console.log('--- Kababjees Data in DB ---');
    console.log(JSON.stringify(restaurant, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
