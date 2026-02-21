const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@saif.com' },
        include: { role: true }
    });
    console.log(JSON.stringify(user, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
