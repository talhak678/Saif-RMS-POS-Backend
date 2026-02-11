const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
    const b = await prisma.branch.findFirst();
    const c = await prisma.customer.findFirst();
    const m = await prisma.menuItem.findFirst();
    console.log('BRANCH_ID=' + (b?.id || 'none'));
    console.log('CUSTOMER_ID=' + (c?.id || 'none'));
    console.log('MENU_ITEM_ID=' + (m?.id || 'none'));
    await prisma.$disconnect();
}
main();
