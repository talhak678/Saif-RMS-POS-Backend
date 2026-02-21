const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing Role Names ---');

    // Update SUPER_ADMIN to Super Admin
    await prisma.role.updateMany({
        where: { name: 'SUPER_ADMIN' },
        data: { name: 'Super Admin' }
    });
    console.log('Renamed SUPER_ADMIN to Super Admin');

    // Update ADMIN to Admin
    await prisma.role.updateMany({
        where: { name: 'ADMIN' },
        data: { name: 'Admin' }
    });
    console.log('Renamed ADMIN to Admin');

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
