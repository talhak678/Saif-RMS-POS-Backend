const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.order.deleteMany();
    await prisma.loyaltyTrx.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.addon.deleteMany();
    await prisma.variation.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.discountCode.deleteMany();
    await prisma.promoBanner.deleteMany();
    await prisma.cmsPage.deleteMany();
    await prisma.faqItem.deleteMany();
    await prisma.rider.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.setting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.websiteConfig.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();

    // 1. Create Permissions
    console.log('📋 Creating permissions...');
    const permissions = await Promise.all([
        prisma.permission.create({ data: { action: 'menu:create' } }),
        prisma.permission.create({ data: { action: 'menu:edit' } }),
        prisma.permission.create({ data: { action: 'menu:delete' } }),
        prisma.permission.create({ data: { action: 'order:create' } }),
        prisma.permission.create({ data: { action: 'order:edit' } }),
        prisma.permission.create({ data: { action: 'order:delete' } }),
        prisma.permission.create({ data: { action: 'order:refund' } }),
        prisma.permission.create({ data: { action: 'inventory:manage' } }),
        prisma.permission.create({ data: { action: 'user:manage' } }),
        prisma.permission.create({ data: { action: 'reports:view' } }),
    ]);

    // 2. Create Roles
    console.log('👥 Creating roles...');
    const superAdminRole = await prisma.role.create({
        data: {
            name: 'Super Admin',
            permissions: {
                connect: permissions.map(p => ({ id: p.id }))
            }
        }
    });

    const adminRole = await prisma.role.create({
        data: {
            name: 'Admin',
            permissions: {
                connect: permissions.map(p => ({ id: p.id }))
            }
        }
    });

    const managerRole = await prisma.role.create({
        data: {
            name: 'Manager',
            permissions: {
                connect: permissions.slice(0, 7).map(p => ({ id: p.id }))
            }
        }
    });

    const cashierRole = await prisma.role.create({
        data: {
            name: 'Cashier',
            permissions: {
                connect: permissions.slice(3, 5).map(p => ({ id: p.id }))
            }
        }
    });

    const kitchenRole = await prisma.role.create({
        data: {
            name: 'Kitchen Staff',
            permissions: {
                connect: [permissions[4]].map(p => ({ id: p.id }))
            }
        }
    });

    // 3. Create Restaurant
    console.log('🍽️  Creating restaurant...');
    const restaurant = await prisma.restaurant.create({
        data: {
            name: "Saif's Kitchen",
            slug: 'saifs-kitchen',
            logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
            description: 'Premium Pakistani and Continental Cuisine',
            status: 'ACTIVE',
            subscription: 'PREMIUM',
            facebookUrl: 'https://facebook.com/saifskitchen',
            instagramUrl: 'https://instagram.com/saifskitchen',
            tiktokUrl: 'https://tiktok.com/@saifskitchen',
            metaPixelId: '123456789',
        }
    });

    // 4. Create Branches
    console.log('🏢 Creating branches...');
    const mainBranch = await prisma.branch.create({
        data: {
            name: 'Main Branch - Gulberg',
            address: 'Main Boulevard, Gulberg III, Lahore',
            phone: '+92 300 1234567',
            deliveryRadius: 10,
            freeDeliveryThreshold: 1000,
            deliveryCharge: 150,
            deliveryOffTime: '23:00',
            restaurantId: restaurant.id
        }
    });

    const dhaBranch = await prisma.branch.create({
        data: {
            name: 'DHA Branch',
            address: 'Phase 5, DHA, Lahore',
            phone: '+92 300 7654321',
            deliveryRadius: 8,
            freeDeliveryThreshold: 1500,
            deliveryCharge: 200,
            deliveryOffTime: '22:30',
            restaurantId: restaurant.id
        }
    });

    const joharBranch = await prisma.branch.create({
        data: {
            name: 'Johar Town Branch',
            address: 'Block H, Johar Town, Lahore',
            phone: '+92 321 9876543',
            deliveryRadius: 7,
            freeDeliveryThreshold: 800,
            deliveryCharge: 120,
            deliveryOffTime: '23:30',
            restaurantId: restaurant.id
        }
    });

    // 5. Create Settings
    console.log('⚙️  Creating settings...');
    await Promise.all([
        prisma.setting.create({
            data: {
                key: 'currency',
                value: 'PKR',
                restaurantId: restaurant.id
            }
        }),
        prisma.setting.create({
            data: {
                key: 'timezone',
                value: 'Asia/Karachi',
                restaurantId: restaurant.id
            }
        }),
        prisma.setting.create({
            data: {
                key: 'tax_rate',
                value: '16',
                restaurantId: restaurant.id
            }
        }),
        prisma.setting.create({
            data: {
                key: 'loyalty_points_ratio',
                value: '10',
                restaurantId: restaurant.id
            }
        }),
    ]);

    // 6. Create Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const superAdmin = await prisma.user.create({
        data: {
            name: 'Product Owner',
            email: 'owner@saifrms.com',
            password: hashedPassword,
            roleId: superAdminRole.id,
            // No restaurantId for Super Admin
        }
    });

    const adminUser = await prisma.user.create({
        data: {
            name: 'Saif Abbas',
            email: 'admin@saifskitchen.com',
            password: hashedPassword,
            roleId: adminRole.id,
            restaurantId: restaurant.id
        }
    });

    const managerUser = await prisma.user.create({
        data: {
            name: 'Hassan Ali',
            email: 'manager@saifskitchen.com',
            password: hashedPassword,
            roleId: managerRole.id,
            restaurantId: restaurant.id
        }
    });

    const cashier1 = await prisma.user.create({
        data: {
            name: 'Ahmed Khan',
            email: 'cashier1@saifskitchen.com',
            password: hashedPassword,
            roleId: cashierRole.id,
            restaurantId: restaurant.id
        }
    });

    const kitchenStaff = await prisma.user.create({
        data: {
            name: 'Ali Raza',
            email: 'kitchen@saifskitchen.com',
            password: hashedPassword,
            roleId: kitchenRole.id,
            restaurantId: restaurant.id
        }
    });

    // 7. Create Categories
    console.log('📂 Creating categories...');
    const categories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'Starters & Appetizers',
                description: 'Light bites to start your meal',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'Main Course',
                description: 'Our signature main dishes',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'BBQ & Grills',
                description: 'Freshly grilled delights',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'Rice & Biryani',
                description: 'Aromatic rice dishes',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'Breads',
                description: 'Freshly baked breads',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'Beverages',
                description: 'Refreshing drinks',
                restaurantId: restaurant.id
            }
        }),
        prisma.category.create({
            data: {
                name: 'Desserts',
                description: 'Sweet endings',
                restaurantId: restaurant.id
            }
        }),
    ]);

    // 8. Create Menu Items with Variations and Addons
    console.log('🍕 Creating menu items...');

    // Starters
    const samosa = await prisma.menuItem.create({
        data: {
            name: 'Chicken Samosa',
            description: 'Crispy triangular pastry filled with spiced chicken',
            price: 120,
            image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
            isAvailable: true,
            categoryId: categories[0].id,
            variations: {
                create: [
                    { name: '3 Pieces', price: 120 },
                    { name: '6 Pieces', price: 220 },
                ]
            }
        }
    });

    const springRolls = await prisma.menuItem.create({
        data: {
            name: 'Vegetable Spring Rolls',
            description: 'Crispy rolls filled with fresh vegetables',
            price: 180,
            image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400',
            isAvailable: true,
            categoryId: categories[0].id,
            variations: {
                create: [
                    { name: '4 Pieces', price: 180 },
                    { name: '8 Pieces', price: 320 },
                ]
            }
        }
    });

    // Main Course
    const chickenKarahi = await prisma.menuItem.create({
        data: {
            name: 'Chicken Karahi',
            description: 'Traditional Pakistani chicken curry cooked in a wok',
            price: 1200,
            image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
            isAvailable: true,
            categoryId: categories[1].id,
            variations: {
                create: [
                    { name: 'Half', price: 700 },
                    { name: 'Full', price: 1200 },
                ]
            },
            addons: {
                create: [
                    { name: 'Extra Raita', price: 80 },
                    { name: 'Extra Salad', price: 50 },
                    { name: 'Extra Naan', price: 40 },
                ]
            }
        }
    });

    const muttonKarahi = await prisma.menuItem.create({
        data: {
            name: 'Mutton Karahi',
            description: 'Tender mutton cooked with tomatoes and spices',
            price: 1800,
            image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
            isAvailable: true,
            categoryId: categories[1].id,
            variations: {
                create: [
                    { name: 'Half', price: 1000 },
                    { name: 'Full', price: 1800 },
                ]
            },
            addons: {
                create: [
                    { name: 'Extra Raita', price: 80 },
                    { name: 'Extra Salad', price: 50 },
                ]
            }
        }
    });

    // BBQ
    const seekhKabab = await prisma.menuItem.create({
        data: {
            name: 'Seekh Kabab',
            description: 'Minced meat kababs grilled to perfection',
            price: 350,
            image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
            isAvailable: true,
            categoryId: categories[2].id,
            variations: {
                create: [
                    { name: 'Chicken (2pc)', price: 280 },
                    { name: 'Beef (2pc)', price: 350 },
                    { name: 'Chicken (4pc)', price: 520 },
                    { name: 'Beef (4pc)', price: 650 },
                ]
            }
        }
    });

    const tikka = await prisma.menuItem.create({
        data: {
            name: 'Chicken Tikka',
            description: 'Marinated chicken chunks grilled on skewers',
            price: 450,
            image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400',
            isAvailable: true,
            categoryId: categories[2].id,
            addons: {
                create: [
                    { name: 'Mint Chutney', price: 30 },
                    { name: 'Garlic Sauce', price: 40 },
                ]
            }
        }
    });

    // Biryani
    const chickenBiryani = await prisma.menuItem.create({
        data: {
            name: 'Chicken Biryani',
            description: 'Aromatic basmati rice cooked with tender chicken',
            price: 450,
            image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
            isAvailable: true,
            categoryId: categories[3].id,
            variations: {
                create: [
                    { name: 'Regular', price: 450 },
                    { name: 'Family (4-5 persons)', price: 1600 },
                ]
            },
            addons: {
                create: [
                    { name: 'Extra Raita', price: 80 },
                    { name: 'Extra Salad', price: 50 },
                ]
            }
        }
    });

    const muttonBiryani = await prisma.menuItem.create({
        data: {
            name: 'Mutton Biryani',
            description: 'Fragrant rice with succulent mutton pieces',
            price: 600,
            image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400',
            isAvailable: true,
            categoryId: categories[3].id,
            variations: {
                create: [
                    { name: 'Regular', price: 600 },
                    { name: 'Family (4-5 persons)', price: 2200 },
                ]
            }
        }
    });

    // Breads
    const naan = await prisma.menuItem.create({
        data: {
            name: 'Naan',
            description: 'Traditional tandoor-baked flatbread',
            price: 40,
            image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
            isAvailable: true,
            categoryId: categories[4].id,
            variations: {
                create: [
                    { name: 'Plain Naan', price: 40 },
                    { name: 'Garlic Naan', price: 60 },
                    { name: 'Cheese Naan', price: 120 },
                    { name: 'Keema Naan', price: 150 },
                ]
            }
        }
    });

    const roti = await prisma.menuItem.create({
        data: {
            name: 'Roti',
            description: 'Whole wheat flatbread',
            price: 20,
            image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400',
            isAvailable: true,
            categoryId: categories[4].id,
        }
    });

    // Beverages
    const mango_lassi = await prisma.menuItem.create({
        data: {
            name: 'Mango Lassi',
            description: 'Refreshing yogurt drink with mango',
            price: 180,
            image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400',
            isAvailable: true,
            categoryId: categories[5].id,
            variations: {
                create: [
                    { name: 'Regular', price: 180 },
                    { name: 'Large', price: 280 },
                ]
            }
        }
    });

    const freshJuice = await prisma.menuItem.create({
        data: {
            name: 'Fresh Juice',
            description: 'Freshly squeezed fruit juice',
            price: 200,
            image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
            isAvailable: true,
            categoryId: categories[5].id,
            variations: {
                create: [
                    { name: 'Orange', price: 200 },
                    { name: 'Apple', price: 220 },
                    { name: 'Mixed Fruit', price: 250 },
                ]
            }
        }
    });

    const coldDrinks = await prisma.menuItem.create({
        data: {
            name: 'Cold Drinks',
            description: 'Chilled soft drinks',
            price: 80,
            image: 'https://images.unsplash.com/photo-1581098365948-6a5a912b7a49?w=400',
            isAvailable: true,
            categoryId: categories[5].id,
            variations: {
                create: [
                    { name: 'Coca Cola', price: 80 },
                    { name: 'Sprite', price: 80 },
                    { name: 'Fanta', price: 80 },
                ]
            }
        }
    });

    // Desserts
    const kheer = await prisma.menuItem.create({
        data: {
            name: 'Kheer',
            description: 'Traditional rice pudding with nuts',
            price: 150,
            image: 'https://images.unsplash.com/photo-1612203986734-4f9e1d8e0d4a?w=400',
            isAvailable: true,
            categoryId: categories[6].id,
        }
    });

    const gulabjamun = await prisma.menuItem.create({
        data: {
            name: 'Gulab Jamun',
            description: 'Sweet milk balls soaked in sugar syrup',
            price: 180,
            image: 'https://images.unsplash.com/photo-1589638672283-303e6b31567f?w=400',
            isAvailable: true,
            categoryId: categories[6].id,
            variations: {
                create: [
                    { name: '2 Pieces', price: 120 },
                    { name: '4 Pieces', price: 180 },
                ]
            }
        }
    });

    // 9. Create Ingredients
    console.log('🥕 Creating ingredients...');
    const ingredients = await Promise.all([
        prisma.ingredient.create({ data: { name: 'Chicken', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Mutton', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Rice', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Onions', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Tomatoes', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Yogurt', unit: 'liter' } }),
        prisma.ingredient.create({ data: { name: 'Flour', unit: 'kg' } }),
        prisma.ingredient.create({ data: { name: 'Oil', unit: 'liter' } }),
        prisma.ingredient.create({ data: { name: 'Milk', unit: 'liter' } }),
        prisma.ingredient.create({ data: { name: 'Mango Pulp', unit: 'kg' } }),
    ]);

    // 10. Create Recipes (Ingredient Requirements)
    console.log('📖 Creating recipes...');
    await Promise.all([
        // Chicken Karahi uses Chicken, Tomatoes, Onions, Oil
        prisma.recipe.create({
            data: {
                menuItemId: chickenKarahi.id,
                ingredientId: ingredients[0].id,
                quantity: 0.5
            }
        }),
        prisma.recipe.create({
            data: {
                menuItemId: chickenKarahi.id,
                ingredientId: ingredients[4].id,
                quantity: 0.3
            }
        }),
        prisma.recipe.create({
            data: {
                menuItemId: chickenKarahi.id,
                ingredientId: ingredients[3].id,
                quantity: 0.2
            }
        }),

        // Chicken Biryani uses Chicken, Rice, Yogurt, Onions
        prisma.recipe.create({
            data: {
                menuItemId: chickenBiryani.id,
                ingredientId: ingredients[0].id,
                quantity: 0.3
            }
        }),
        prisma.recipe.create({
            data: {
                menuItemId: chickenBiryani.id,
                ingredientId: ingredients[2].id,
                quantity: 0.2
            }
        }),
        prisma.recipe.create({
            data: {
                menuItemId: chickenBiryani.id,
                ingredientId: ingredients[5].id,
                quantity: 0.1
            }
        }),

        // Naan uses Flour, Milk
        prisma.recipe.create({
            data: {
                menuItemId: naan.id,
                ingredientId: ingredients[6].id,
                quantity: 0.1
            }
        }),
        prisma.recipe.create({
            data: {
                menuItemId: naan.id,
                ingredientId: ingredients[8].id,
                quantity: 0.05
            }
        }),
    ]);

    // 11. Create Stock Levels
    console.log('📦 Creating stock levels...');
    const branches = [mainBranch, dhaBranch, joharBranch];
    for (const branch of branches) {
        for (const ingredient of ingredients) {
            await prisma.stock.create({
                data: {
                    branchId: branch.id,
                    ingredientId: ingredient.id,
                    quantity: Math.floor(Math.random() * 50) + 20 // Random stock between 20-70
                }
            });
        }
    }

    // 12. Create Customers
    console.log('👥 Creating customers...');
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                name: 'Talha Khan',
                email: 'talha@example.com',
                phone: '+92 300 1111111',
                loyaltyPoints: 150
            }
        }),
        prisma.customer.create({
            data: {
                name: 'Fatima Ahmed',
                email: 'fatima@example.com',
                phone: '+92 321 2222222',
                loyaltyPoints: 280
            }
        }),
        prisma.customer.create({
            data: {
                name: 'Hamza Ali',
                email: 'hamza@example.com',
                phone: '+92 333 3333333',
                loyaltyPoints: 95
            }
        }),
        prisma.customer.create({
            data: {
                name: 'Ayesha Malik',
                email: 'ayesha@example.com',
                phone: '+92 300 4444444',
                loyaltyPoints: 200
            }
        }),
        prisma.customer.create({
            data: {
                name: 'Usman Tariq',
                email: 'usman@example.com',
                phone: '+92 321 5555555',
                loyaltyPoints: 50
            }
        }),
    ]);

    // 13. Create Orders with Items and Payments
    console.log('🛒 Creating orders...');

    // Order 1 - Delivered
    const order1 = await prisma.order.create({
        data: {
            branchId: mainBranch.id,
            customerId: customers[0].id,
            type: 'DELIVERY',
            status: 'DELIVERED',
            total: 1830,
            items: {
                create: [
                    { menuItemId: chickenBiryani.id, quantity: 2, price: 450 },
                    { menuItemId: chickenKarahi.id, quantity: 1, price: 700 },
                    { menuItemId: naan.id, quantity: 4, price: 40 },
                    { menuItemId: mango_lassi.id, quantity: 2, price: 180 },
                ]
            }
        }
    });

    await prisma.payment.create({
        data: {
            orderId: order1.id,
            amount: 1830,
            method: 'COD',
            status: 'PAID'
        }
    });

    // Order 2 - Preparing
    const order2 = await prisma.order.create({
        data: {
            branchId: dhaBranch.id,
            customerId: customers[1].id,
            type: 'DINE_IN',
            status: 'PREPARING',
            total: 2470,
            items: {
                create: [
                    { menuItemId: muttonKarahi.id, quantity: 1, price: 1800 },
                    { menuItemId: naan.id, quantity: 6, price: 40 },
                    { menuItemId: freshJuice.id, quantity: 2, price: 200 },
                    { menuItemId: kheer.id, quantity: 2, price: 150 },
                ]
            }
        }
    });

    await prisma.payment.create({
        data: {
            orderId: order2.id,
            amount: 2470,
            method: 'CASH',
            status: 'PENDING'
        }
    });

    // Order 3 - Out for Delivery
    const order3 = await prisma.order.create({
        data: {
            branchId: joharBranch.id,
            customerId: customers[2].id,
            type: 'DELIVERY',
            status: 'OUT_FOR_DELIVERY',
            total: 1740,
            items: {
                create: [
                    { menuItemId: chickenBiryani.id, quantity: 1, price: 450 },
                    { menuItemId: muttonBiryani.id, quantity: 1, price: 600 },
                    { menuItemId: seekhKabab.id, quantity: 1, price: 350 },
                    { menuItemId: coldDrinks.id, quantity: 3, price: 80 },
                    { menuItemId: gulabjamun.id, quantity: 1, price: 180 },
                ]
            }
        }
    });

    await prisma.payment.create({
        data: {
            orderId: order3.id,
            amount: 1740,
            method: 'STRIPE',
            status: 'PAID',
            transactionId: 'pi_1234567890'
        }
    });

    // Order 4 - Confirmed
    const order4 = await prisma.order.create({
        data: {
            branchId: mainBranch.id,
            customerId: customers[3].id,
            type: 'PICKUP',
            status: 'CONFIRMED',
            total: 820,
            items: {
                create: [
                    { menuItemId: tikka.id, quantity: 1, price: 450 },
                    { menuItemId: naan.id, quantity: 3, price: 40 },
                    { menuItemId: mango_lassi.id, quantity: 2, price: 180 },
                ]
            }
        }
    });

    await prisma.payment.create({
        data: {
            orderId: order4.id,
            amount: 820,
            method: 'CASH',
            status: 'PENDING'
        }
    });

    // Order 5 - Pending
    const order5 = await prisma.order.create({
        data: {
            branchId: dhaBranch.id,
            customerId: customers[4].id,
            type: 'DELIVERY',
            status: 'PENDING',
            total: 1180,
            items: {
                create: [
                    { menuItemId: chickenKarahi.id, quantity: 1, price: 700 },
                    { menuItemId: naan.id, quantity: 4, price: 40 },
                    { menuItemId: freshJuice.id, quantity: 2, price: 200 },
                ]
            }
        }
    });

    await prisma.payment.create({
        data: {
            orderId: order5.id,
            amount: 1180,
            method: 'COD',
            status: 'PENDING'
        }
    });

    // 14. Create Loyalty Transactions
    console.log('💎 Creating loyalty transactions...');
    await Promise.all([
        prisma.loyaltyTrx.create({
            data: {
                customerId: customers[0].id,
                points: 50,
                type: 'EARNED'
            }
        }),
        prisma.loyaltyTrx.create({
            data: {
                customerId: customers[0].id,
                points: 100,
                type: 'EARNED'
            }
        }),
        prisma.loyaltyTrx.create({
            data: {
                customerId: customers[1].id,
                points: 150,
                type: 'EARNED'
            }
        }),
        prisma.loyaltyTrx.create({
            data: {
                customerId: customers[1].id,
                points: 130,
                type: 'EARNED'
            }
        }),
        prisma.loyaltyTrx.create({
            data: {
                customerId: customers[3].id,
                points: 50,
                type: 'REDEEMED'
            }
        }),
    ]);

    // 15. Create Reviews
    console.log('⭐ Creating reviews...');
    console.log('Order 1 ID:', order1.id);
    console.log('Order 2 ID:', order2.id);

    await prisma.review.create({
        data: {
            orderId: order1.id,
            menuItemId: chickenBiryani.id,
            rating: 5,
            comment: 'Absolutely delicious! Best biryani in town.',
            aiEnhanced: false
        }
    });

    await prisma.review.create({
        data: {
            orderId: order2.id,
            menuItemId: muttonKarahi.id,
            rating: 4,
            comment: 'Great taste but a bit spicy for me.',
            aiEnhanced: false
        }
    });

    // 16. Create Reservations
    console.log('📅 Creating reservations...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(20, 0, 0, 0);

    await Promise.all([
        prisma.reservation.create({
            data: {
                branchId: mainBranch.id,
                customerName: 'Imran Hassan',
                phone: '+92 300 6666666',
                guestCount: 6,
                startTime: tomorrow,
                status: 'BOOKED'
            }
        }),
        prisma.reservation.create({
            data: {
                branchId: dhaBranch.id,
                customerName: 'Sara Ahmed',
                phone: '+92 321 7777777',
                guestCount: 4,
                startTime: dayAfter,
                status: 'BOOKED'
            }
        }),
    ]);

    // 17. Create Riders
    console.log('🏍️  Creating riders...');
    await Promise.all([
        prisma.rider.create({
            data: {
                name: 'Bilal Ahmed',
                phone: '+92 300 8888888',
                status: 'AVAILABLE'
            }
        }),
        prisma.rider.create({
            data: {
                name: 'Kashif Ali',
                phone: '+92 321 9999999',
                status: 'BUSY'
            }
        }),
        prisma.rider.create({
            data: {
                name: 'Fahad Malik',
                phone: '+92 333 0000000',
                status: 'AVAILABLE'
            }
        }),
    ]);

    // 18. Create Discount Codes
    console.log('🎁 Creating discount codes...');
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    await Promise.all([
        prisma.discountCode.create({
            data: {
                code: 'SAVE20',
                percentage: 20,
                isActive: true,
                expiresAt: futureDate
            }
        }),
        prisma.discountCode.create({
            data: {
                code: 'FLAT200',
                amount: 200,
                isActive: true,
                expiresAt: futureDate
            }
        }),
        prisma.discountCode.create({
            data: {
                code: 'FIRSTORDER',
                percentage: 50,
                isActive: true,
                expiresAt: futureDate
            }
        }),
    ]);

    // 19. Create CMS Content
    console.log('📝 Creating CMS content...');

    // FAQs
    await Promise.all([
        prisma.faqItem.create({
            data: {
                question: 'What are your opening hours?',
                answer: 'We are open from 11:00 AM to 11:30 PM, seven days a week.',
                restaurantId: restaurant.id
            }
        }),
        prisma.faqItem.create({
            data: {
                question: 'Do you offer delivery?',
                answer: 'Yes! We offer free delivery for orders above PKR 1000 within our delivery radius.',
                restaurantId: restaurant.id
            }
        }),
        prisma.faqItem.create({
            data: {
                question: 'How can I earn loyalty points?',
                answer: 'You earn 1 loyalty point for every PKR 10 spent. Points can be redeemed on future orders.',
                restaurantId: restaurant.id
            }
        }),
        prisma.faqItem.create({
            data: {
                question: 'Can I customize my order?',
                answer: 'Absolutely! You can choose from various sizes, add-ons, and special instructions during checkout.',
                restaurantId: restaurant.id
            }
        }),
    ]);

    // CMS Pages
    await Promise.all([
        prisma.cmsPage.create({
            data: {
                title: 'About Us',
                slug: 'about-us',
                content: `Welcome to Saif's Kitchen! We have been serving authentic Pakistani and Continental cuisine since 2020. Our mission is to provide the highest quality food with exceptional service. We use only the freshest ingredients and traditional cooking methods to ensure every dish is perfect.`,
                restaurantId: restaurant.id
            }
        }),
        prisma.cmsPage.create({
            data: {
                title: 'Privacy Policy',
                slug: 'privacy-policy',
                content: `At Saif's Kitchen, we take your privacy seriously. We collect only necessary information to process your orders and improve our service. Your data is never shared with third parties without your consent.`,
                restaurantId: restaurant.id
            }
        }),
        prisma.cmsPage.create({
            data: {
                title: 'Terms & Conditions',
                slug: 'terms-conditions',
                content: `By placing an order with Saif's Kitchen, you agree to our terms and conditions. All orders are subject to availability. We reserve the right to refuse service to anyone.`,
                restaurantId: restaurant.id
            }
        }),
    ]);

    // Promo Banners
    await Promise.all([
        prisma.promoBanner.create({
            data: {
                title: '50% Off on First Order',
                imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
                linkUrl: '/menu',
                isActive: true,
                restaurantId: restaurant.id
            }
        }),
        prisma.promoBanner.create({
            data: {
                title: 'Weekend Special - Free Delivery',
                imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
                linkUrl: '/offers',
                isActive: true,
                restaurantId: restaurant.id
            }
        }),
    ]);

    // 20. Create Notifications
    console.log('🔔 Creating notifications...');
    await Promise.all([
        prisma.notification.create({
            data: {
                userId: managerUser.id,
                message: 'New order #1001 received from Main Branch',
                isRead: false
            }
        }),
        prisma.notification.create({
            data: {
                userId: adminUser.id,
                message: 'Low stock alert: Chicken at DHA Branch',
                isRead: false
            }
        }),
        prisma.notification.create({
            data: {
                userId: kitchenStaff.id,
                message: 'Order #1002 is ready for pickup',
                isRead: true
            }
        }),
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 1 Restaurant');
    console.log('   - 3 Branches');
    console.log('   - 4 Roles with 10 Permissions');
    console.log('   - 4 Users');
    console.log('   - 7 Categories');
    console.log('   - 15 Menu Items with Variations & Addons');
    console.log('   - 10 Ingredients');
    console.log('   - Stock levels for all branches');
    console.log('   - 5 Customers');
    console.log('   - 5 Orders with Items & Payments');
    console.log('   - 3 Riders');
    console.log('   - 3 Discount Codes');
    console.log('   - 4 FAQs');
    console.log('   - 3 CMS Pages');
    console.log('   - 2 Promo Banners');
    console.log('   - Reviews, Reservations, Loyalty Transactions, and more!');
    console.log('\n🔐 Login Credentials:');
    console.log('   Super Admin: owner@saifrms.com / password123');
    console.log('   Admin: admin@saifskitchen.com / password123');
    console.log('   Manager: manager@saifskitchen.com / password123');
    console.log('   Cashier: cashier1@saifskitchen.com / password123');
    console.log('   Kitchen: kitchen@saifskitchen.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
