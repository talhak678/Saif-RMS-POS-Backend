// This script inserts the baseline migration as "applied" in _prisma_migrations
// Run: node prisma/resolve_baseline.js
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
    const migrationName = '20260219000000_baseline'

    // Check if already exists
    const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
        migrationName
    )

    if (existing.length > 0) {
        console.log('✅ Baseline migration already marked as applied.')
        return
    }

    // Insert all migrations as applied
    const migrations = [
        '20260218100840_add_order_source',
        '20260219000000_baseline'
    ]

    for (const name of migrations) {
        const alreadyExists = await prisma.$queryRawUnsafe(
            `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
            name
        )
        if (alreadyExists.length > 0) {
            console.log(`⏭️  Already exists: ${name}`)
            continue
        }

        await prisma.$executeRawUnsafe(`
            INSERT INTO "_prisma_migrations" 
            (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
            VALUES 
            (gen_random_uuid()::text, 'baseline', NOW(), $1, NULL, NULL, NOW(), 1)
        `, name)
        console.log(`✅ Marked as applied: ${name}`)
    }
    
    console.log('\n🎉 Done! Migration history is now synced.')
    console.log('You can now safely run: npx prisma migrate dev --name your_next_migration')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
