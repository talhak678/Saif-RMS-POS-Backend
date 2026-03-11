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

    // 1. Create Comprehensive Permissions
    console.log('📋 Creating system permissions...');
    const permissionActions = [
        // System / Super Admin Level
        'sa:dashboard', 'sa:restaurants:manage', 'sa:users:manage', 'sa:settings:manage', 
        'sa:billing:manage', 'sa:logs:view', 'sa:cms:manage',
        
        // Restaurant / Admin Level
        'rest:dashboard', 'rest:menu:manage', 'rest:orders:manage', 'rest:inventory:manage',
        'rest:staff:manage', 'rest:reports:view', 'rest:settings:manage', 'rest:website:manage',
        
        // Menu Permissions
        'menu:create', 'menu:edit', 'menu:delete', 'menu:view',
        
        // Order Permissions
        'order:create', 'order:edit', 'order:delete', 'order:status', 'order:refund',
        
        // POS / Branch Permissions
        'pos:access', 'pos:orders:create', 'table:manage', 'reservation:manage',
        
        // Marketing
        'marketing:discounts:manage', 'marketing:customers:view', 'marketing:reviews:manage'
    ];

    const permissions = await Promise.all(
        permissionActions.map(action => 
            prisma.permission.create({ data: { action } })
        )
    );

    // 2. Create Normalized Roles
    console.log('👥 Creating roles (SUPER_ADMIN, ADMIN, MANAGER, etc.)...');
    
    const superAdminRole = await prisma.role.create({
        data: {
            name: 'SUPER_ADMIN',
            permissions: { connect: permissions.map(p => ({ id: p.id })) }
        }
    });

    const adminRole = await prisma.role.create({
        data: {
            name: 'ADMIN',
            permissions: { connect: permissions.filter(p => p.action.startsWith('rest:') || p.action.startsWith('menu:') || p.action.startsWith('order:')).map(p => ({ id: p.id })) }
        }
    });

    const managerRole = await prisma.role.create({
        data: {
            name: 'MANAGER',
            permissions: { connect: permissions.filter(p => ['pos:access', 'rest:menu:manage', 'order:status'].includes(p.action)).map(p => ({ id: p.id })) }
        }
    });

    // 3. Create Primary Restaurant (Saif's Kitchen)
    console.log('🍽️  Creating primary restaurant...');
    const restaurant = await prisma.restaurant.create({
        data: {
            name: "Platteros POS System",
            slug: 'platteros',
            logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
            description: 'Next Generation Restaurant Management Solution',
            status: 'ACTIVE',
            subscription: 'ENTERPRISE',
            contactEmail: 'support@platteros.com',
            address: 'Software Park, Lahore, Pakistan',
            country: 'Pakistan',
            websiteConfig: {
                create: {
                    configJson: JSON.stringify({
                        theme: { primary: "#ff4d4d", secondary: "#1a1a1a" },
                        pages: { home: { title: "Welcome to Platteros" } }
                    })
                }
            }
        }
    });

    // 4. Create Main Branch
    const branch = await prisma.branch.create({
        data: {
            name: 'Platteros HQ - Demo Branch',
            address: 'Global IT Center, Phase 8, DHA',
            phone: '+92 42 111 222 333',
            restaurantId: restaurant.id
        }
    });

    // 5. Create Key Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // The Super Admin (System Owner)
    const superAdmin = await prisma.user.create({
        data: {
            name: 'Talha Khan',
            email: 'admin@platteros.com',
            password: hashedPassword,
            roleId: superAdminRole.id,
            // Super Admin level access
        }
    });

    // Another Super Admin (Legacy Support)
    await prisma.user.create({
        data: {
            name: 'Product Owner',
            email: 'owner@saifrms.com',
            password: hashedPassword,
            roleId: superAdminRole.id,
        }
    });

    // Restaurant Admin
    const adminUser = await prisma.user.create({
        data: {
            name: 'Saif Abbas',
            email: 'admin@saifskitchen.com',
            password: hashedPassword,
            roleId: adminRole.id,
            restaurantId: restaurant.id
        }
    });

    // 6. Basic Data to make Dashboard look alive
    console.log('📊 Adding sample data for dashboard stats...');
    
    const category = await prisma.category.create({
        data: { name: 'Signature Dishes', restaurantId: restaurant.id }
    });

    const menuItem = await prisma.menuItem.create({
        data: {
            name: 'Platteros Special Platter',
            price: 2500,
            categoryId: category.id,
            restaurantId: restaurant.id,
            isAvailable: true
        }
    });

    const customer = await prisma.customer.create({
        data: { name: 'John Doe', email: 'john@example.com', restaurantId: restaurant.id }
    });

    // Create 5 Recent Orders
    for (let i = 1; i <= 5; i++) {
        await prisma.order.create({
            data: {
                branchId: branch.id,
                customerId: customer.id,
                type: 'DINE_IN',
                status: 'DELIVERED',
                total: 500 * i,
                source: 'POS',
                items: {
                    create: [{ menuItemId: menuItem.id, quantity: 1, price: 500 * i }]
                },
                payment: {
                    create: { amount: 500 * i, method: 'CASH', status: 'PAID' }
                }
            }
        });
    }

    console.log('✅ Seeding completed!');
    console.log('\n🔐 NEW SUPER ADMIN LOGIN:');
    console.log('   Email: admin@platteros.com');
    console.log('   Password: password123');
    console.log('   (Login at: https://rms-pos-super-admin.vercel.app/signin)');
    
    console.log('\n🔐 ADMIN LOGIN (Saif Kitchen):');
    console.log('   Email: admin@saifskitchen.com');
    console.log('   Password: password123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
