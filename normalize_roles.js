const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Normalizing Role Names to Uppercase ---');

    await prisma.role.updateMany({
        where: { name: { in: ['Super Admin', 'SUPER_ADMIN', 'super admin'] } },
        data: { name: 'SUPER_ADMIN' }
    });
    console.log('Normalized Super Admin roles to SUPER_ADMIN');

    await prisma.role.updateMany({
        where: { name: { in: ['Admin', 'ADMIN', 'admin'] } },
        data: { name: 'ADMIN' }
    });
    console.log('Normalized Admin roles to ADMIN');

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
