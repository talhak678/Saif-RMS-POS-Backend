const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const branches = await prisma.branch.findMany({ select: { id: true, name: true } })
        const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
        const menuItems = await prisma.menuItem.findMany({ select: { id: true, name: true, price: true } })

        console.log('--- BRANCHES ---')
        console.log(JSON.stringify(branches, null, 2))
        console.log('--- CUSTOMERS ---')
        console.log(JSON.stringify(customers, null, 2))
        console.log('--- MENU ITEMS ---')
        console.log(JSON.stringify(menuItems, null, 2))
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

main()
