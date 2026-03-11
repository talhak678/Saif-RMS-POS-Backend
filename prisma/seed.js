const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Platteros Database Seeding...');

    // Clear existing data in correct order
    console.log('🗑️  Clearing existing data...');
    const tableNames = [
        'Notification', 'NotificationTemplate', 'Review', 'OrderItem', 'Payment', 'Reservation', 
        'Order', 'LoyaltyTrx', 'Stock', 'Recipe', 'Ingredient', 'Addon', 'Variation', 
        'MenuItem', 'Category', 'Customer', 'DiscountCode', 'PromoBanner', 'CmsPage', 
        'BlogPost', 'FaqItem', 'Rider', 'Setting', 'User', 'WebsiteConfig', 'Branch', 
        'Restaurant', 'Permission', 'Role'
    ];

    for (const model of tableNames) {
        try {
            await prisma[model.charAt(0).toLowerCase() + model.slice(1)].deleteMany();
        } catch (e) {
            console.log(`⚠️  Could not clear ${model}: ${e.message}`);
        }
    }

    // 1. Create permissions EXACTLY as they are checked in AppSidebar.tsx
    console.log('📋 Creating system permissions...');
    const permissionActions = [
        'dashboard',
        'dashboard:overview',
        'dashboard:reports',
        'customers-orders:incoming-orders',
        'customers-orders:customers',
        'customers-orders:orders-history',
        'pos:menu',
        'pos:reservations',
        'pos:table-services',
        'restaurant-config:restaurants',
        'restaurant-config:branches',
        'restaurant-config:payments-history',
        'menu-management:categories',
        'menu-management:items',
        'delivery-support:riders',
        'inventory-recipes:ingredients',
        'inventory-recipes:stock',
        'inventory-recipes:recipes',
        'marketing-loyalty:discounts',
        'marketing-loyalty:reviews',
        'marketing-loyalty:loyalty',
        'authentication:users',
        'authentication:roles',
        'cms-website:page-sections',
        'cms-website:domain',
        'cms-website:banners',
        'cms-website:faqs',
        'settings:all'
    ];

    const permissions = await Promise.all(
        permissionActions.map(action => 
            prisma.permission.create({ data: { action } })
        )
    );

    // 2. Create Normalized Roles
    console.log('👥 Creating roles (SUPER_ADMIN, ADMIN, MANAGER)...');

    const superAdminActions = [
        'dashboard:overview',
        'dashboard:reports',
        'restaurant-config:restaurants',
        'restaurant-config:branches',
        'restaurant-config:payments-history',
        'authentication:users',
        'authentication:roles'
    ];
    
    const superAdminRole = await prisma.role.create({
        data: {
            name: 'SUPER_ADMIN',
            permissions: { 
                connect: permissions
                    .filter(p => superAdminActions.includes(p.action))
                    .map(p => ({ id: p.id })) 
            }
        }
    });

    const adminRole = await prisma.role.create({
        data: {
            name: 'ADMIN',
            permissions: { connect: permissions.filter(p => !p.action.startsWith('restaurant-config:restaurants')).map(p => ({ id: p.id })) }
        }
    });

    const managerRole = await prisma.role.create({
        data: {
            name: 'MANAGER',
            permissions: { connect: permissions.filter(p => ['dashboard:overview', 'pos:menu', 'pos:reservations'].includes(p.action)).map(p => ({ id: p.id })) }
        }
    });

    // 3. Create Platteros POS System (The Shell)
    console.log('🍽️  Creating system owner restaurant...');
    const restaurant = await prisma.restaurant.create({
        data: {
            name: "Platteros System",
            slug: 'platteros',
            logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
            description: 'Main Management System',
            status: 'ACTIVE',
            subscription: 'ENTERPRISE',
            contactEmail: 'admin@platteros.com',
        }
    });

    // 4. Create Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // The Main Super Admin
    await prisma.user.create({
        data: {
            name: 'Talha Khan',
            email: 'admin@platteros.com',
            password: hashedPassword,
            roleId: superAdminRole.id,
            // Super admins generally don't need a restaurantId or can have the system one
        }
    });

    // Legacy Super Admin
    await prisma.user.create({
        data: {
            name: 'Product Owner',
            email: 'owner@saifrms.com',
            password: hashedPassword,
            roleId: superAdminRole.id,
        }
    });

    // Standard Admin
    await prisma.user.create({
        data: {
            name: 'Saif Abbas',
            email: 'admin@saifskitchen.com',
            password: hashedPassword,
            roleId: adminRole.id,
            restaurantId: restaurant.id
        }
    });

    console.log('✅ Seeding completed!');
    console.log('\n🔐 SUPER ADMIN LOGIN:');
    console.log('   Email: admin@platteros.com');
    console.log('   Password: password123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
