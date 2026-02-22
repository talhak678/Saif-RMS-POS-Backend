const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const permission = await prisma.permission.upsert({
            where: { action: 'dashboard:payments' },
            update: {},
            create: { action: 'dashboard:payments' },
        });
        console.log('Permission synced:', permission.action);

        // Also let's grant it to Admin role by default for convenience
        const adminRole = await prisma.role.findFirst({
            where: { name: 'Admin' }
        });

        if (adminRole) {
            await prisma.role.update({
                where: { id: adminRole.id },
                data: {
                    permissions: {
                        connect: { id: permission.id }
                    }
                }
            });
            console.log('Permission granted to Admin role');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
