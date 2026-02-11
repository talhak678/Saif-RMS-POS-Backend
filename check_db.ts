import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const restaurants = await prisma.restaurant.findMany({
        include: { branches: true }
    })
    console.log(JSON.stringify(restaurants, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
