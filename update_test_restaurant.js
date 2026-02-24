const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.restaurant.update({
        where: { slug: 'kababjees' },
        data: {
            customDomain: 'kababjees.localhost'
        }
    });
    console.log('--- Restaurant Updated ---');
    console.log(`Name: ${updated.name}`);
    console.log(`Custom Domain: ${updated.customDomain}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
