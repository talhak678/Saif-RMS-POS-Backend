const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const newActions = [
        'menu-management:categories',
        'menu-management:items'
    ];

    console.log('--- Adding Menu Management Permissions ---');

    const createdPermissions = [];
    for (const action of newActions) {
        const perm = await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action }
        });
        createdPermissions.push(perm);
        console.log(`Permission ensured: ${action}`);
    }

    // Connect to SUPER_ADMIN and ADMIN roles
    const roles = await prisma.role.findMany({
        where: {
            name: { in: ['SUPER_ADMIN', 'ADMIN'] }
        }
    });

    for (const role of roles) {
        await prisma.role.update({
            where: { id: role.id },
            data: {
                permissions: {
                    connect: createdPermissions.map(p => ({ id: p.id }))
                }
            }
        });
        console.log(`Updated permissions for role: ${role.name}`);
    }

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
