const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const role = await prisma.role.findFirst({
        where: { name: 'Admin' },
        include: { permissions: true }
    });

    if (!role) {
        console.log('Role Admin not found');
        return;
    }

    const hasPerm = role.permissions.some(p => p.action === 'authentication:roles');
    console.log('Admin has authentication:roles:', hasPerm);
    console.log('All permissions for Admin:');
    role.permissions.forEach(p => console.log(' - ' + p.action));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
