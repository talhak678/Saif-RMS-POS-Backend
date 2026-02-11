const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
    try {
        // 1. Create Restaurant
        const restaurant = await prisma.restaurant.create({
            data: {
                name: 'Saif Restaurant',
                slug: 'saif-restaurant-' + Date.now(),
                status: 'ACTIVE',
            }
        })
        console.log('Created Restaurant:', restaurant.id)

        // 2. Create Branch
        const branch = await prisma.branch.create({
            data: {
                name: 'Main Branch',
                address: 'Karachi, Pakistan',
                restaurantId: restaurant.id
            }
        })
        console.log('Created Branch:', branch.id)

        // 3. Create Category
        const category = await prisma.category.create({
            data: {
                name: 'Fast Food',
                restaurantId: restaurant.id
            }
        })

        // 4. Create Menu Item
        const menuItem = await prisma.menuItem.create({
            data: {
                name: 'Zinger Burger',
                price: 550.00,
                categoryId: category.id,
                isAvailable: true
            }
        })
        console.log('Created Menu Item:', menuItem.id)

        console.log('\n--- SUCCESS ---')
        console.log('Use these IDs for Postman:')
        console.log('Branch ID:', branch.id)
        console.log('Menu Item ID:', menuItem.id)
        console.log('Customer ID:', 'cmlhy1qta0000v5w88shwo5241') // Existing one

    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

seed()
