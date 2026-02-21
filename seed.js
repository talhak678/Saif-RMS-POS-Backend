const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Comprehensive Seed ---');

    // 1. Clear existing data (in order of relations)
    await prisma.loyaltyTrx.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.stock.deleteMany({});
    await prisma.recipe.deleteMany({});
    await prisma.variation.deleteMany({});
    await prisma.addon.deleteMany({});
    await prisma.menuItem.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.ingredient.deleteMany({});
    await prisma.rider.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.discountCode.deleteMany({});
    await prisma.faqItem.deleteMany({});
    await prisma.blogPost.deleteMany({});
    await prisma.cmsPage.deleteMany({});
    await prisma.promoBanner.deleteMany({});
    await prisma.websiteConfig.deleteMany({});
    await prisma.setting.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.restaurant.deleteMany({});

    console.log('Cleanup completed.');

    // 2. Create Permissions
    const actions = [
        // Dashboard
        'dashboard:overview', 'dashboard:reports',

        // Customers & Orders
        'customers-orders:incoming-orders', 'customers-orders:customers', 'customers-orders:orders-history',

        // Point of Sale (POS)
        'pos:menu', 'pos:reservations', 'pos:table-services',

        // Restaurant Config
        'restaurant-config:restaurants', 'restaurant-config:branches',

        // Delivery & Support
        'delivery-support:riders',

        // Inventory & Recipes
        'inventory-recipes:ingredients', 'inventory-recipes:stock', 'inventory-recipes:recipes',

        // Marketing & Loyalty
        'marketing-loyalty:discounts', 'marketing-loyalty:reviews', 'marketing-loyalty:loyalty',

        // Authentication
        'authentication:users', 'authentication:roles',

        // CMS & Website
        'cms-website:page-sections', 'cms-website:banners', 'cms-website:faqs',

        // Settings
        'settings:all'
    ];

    const permissions = await Promise.all(
        actions.map(action =>
            prisma.permission.upsert({
                where: { action },
                update: {},
                create: { action }
            })
        )
    );
    console.log(`Created ${permissions.length} permissions.`);

    // 3. Create Roles
    const superAdminRole = await prisma.role.create({
        data: {
            name: 'SUPER_ADMIN',
            permissions: {
                connect: permissions.map(p => ({ id: p.id }))
            }
        }
    });

    const adminRole = await prisma.role.create({
        data: {
            name: 'ADMIN',
            permissions: {
                connect: permissions.map(p => ({ id: p.id }))
            }
        }
    });
    console.log('Created Roles: SUPER_ADMIN, ADMIN');

    // 4. Create Super Admin User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const superAdmin = await prisma.user.create({
        data: {
            name: 'System Owner',
            email: 'superadmin@saif.com',
            password: hashedPassword,
            roleId: superAdminRole.id
        }
    });
    console.log('Created Super Admin User: superadmin@saif.com');

    // 5. Create Restaurant & Restaurant Admin
    const restaurant = await prisma.restaurant.create({
        data: {
            name: 'Saif Premium Grill',
            slug: 'saif-grill',
            status: 'ACTIVE',
            subscription: 'PREMIUM',
        }
    });

    const restaurantAdmin = await prisma.user.create({
        data: {
            name: 'Restaurant Manager',
            email: 'admin@saif.com',
            password: hashedPassword,
            roleId: adminRole.id,
            restaurantId: restaurant.id
        }
    });
    console.log('Created Restaurant Admin User: admin@saif.com');

    // 6. Create Branch
    const branch = await prisma.branch.create({
        data: {
            name: 'DHA Phase 6 Branch',
            address: 'Plot 12, Commercial Area, DHA Ph 6, Karachi',
            phone: '021-3456789',
            restaurantId: restaurant.id
        }
    });
    console.log('Created Branch: DHA Phase 6');

    // 7. Create Categories & Menu Items
    const catFastFood = await prisma.category.create({
        data: {
            name: 'Fast Food',
            restaurantId: restaurant.id
        }
    });

    const catBeverages = await prisma.category.create({
        data: {
            name: 'Beverages',
            restaurantId: restaurant.id
        }
    });

    await prisma.menuItem.createMany({
        data: [
            { name: 'Double Patty Zinger', price: 750, categoryId: catFastFood.id, isAvailable: true, restaurantId: restaurant.id },
            { name: 'Grilled Chicken Burger', price: 650, categoryId: catFastFood.id, isAvailable: true, restaurantId: restaurant.id },
            { name: 'Fresh Lime', price: 150, categoryId: catBeverages.id, isAvailable: true, restaurantId: restaurant.id },
            { name: 'Mint Margarita', price: 250, categoryId: catBeverages.id, isAvailable: true, restaurantId: restaurant.id },
        ]
    });
    console.log('Created Categories and Menu Items.');

    // 8. Create Customers
    const customer1 = await prisma.customer.create({
        data: { name: 'Ali Ahmed', email: 'ali@example.com', phone: '03001112223', restaurantId: restaurant.id }
    });
    const customer2 = await prisma.customer.create({
        data: { name: 'Sana Khan', email: 'sana@example.com', phone: '03215554443', restaurantId: restaurant.id }
    });
    console.log('Created Sample Customers.');

    // 9. Create Sample Orders
    const menuItemsList = await prisma.menuItem.findMany();

    const order1 = await prisma.order.create({
        data: {
            branchId: branch.id,
            customerId: customer1.id,
            type: 'DINE_IN',
            status: 'DELIVERED',
            total: 900.00,
            items: {
                create: [
                    { menuItemId: menuItemsList[0].id, quantity: 1, price: menuItemsList[0].price }, // Zinger
                    { menuItemId: menuItemsList[2].id, quantity: 1, price: menuItemsList[2].price }, // Lime
                ]
            },
            payment: {
                create: {
                    amount: 900.00,
                    method: 'CASH',
                    status: 'PAID'
                }
            }
        }
    });

    const order2 = await prisma.order.create({
        data: {
            branchId: branch.id,
            customerId: customer2.id,
            type: 'DELIVERY',
            status: 'PENDING',
            total: 650.00,
            items: {
                create: [
                    { menuItemId: menuItemsList[1].id, quantity: 1, price: menuItemsList[1].price }, // Grilled Burger
                ]
            },
            payment: {
                create: {
                    amount: 650.00,
                    method: 'COD',
                    status: 'PENDING'
                }
            }
        }
    });
    console.log('Created Sample Orders and Payments.');

    console.log('\n--- SEEDING COMPLETED SUCCESSFULLY ---');
    console.log('Login Details:');
    console.log('1. Super Admin: superadmin@saif.com / password123');
    console.log('2. Res Admin: admin@saif.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
