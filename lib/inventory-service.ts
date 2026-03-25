
import prisma from './prisma';

/**
 * Deducts ingredient stock based on the recipes of the menu items in an order.
 * This should be called when an order is confirmed or dispatched.
 */
export async function deductStockForOrder(orderId: string) {
    try {
        console.log(`[InventoryService] Starting stock deduction for order ${orderId}`);

        // 1. Fetch the order with its items, menu items, and their recipes
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        menuItem: {
                            include: {
                                recipes: true // recipes link menu items to ingredients
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            console.error(`[InventoryService] Order ${orderId} not found`);
            return;
        }

        const branchId = order.branchId;

        // 2. Perform stock deductions in a transaction
        await prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                const menuItem = item.menuItem;
                const recipes = menuItem.recipes;

                if (!recipes || recipes.length === 0) {
                    console.log(`[InventoryService] No recipes found for menu item ${menuItem.name}`);
                    continue;
                }

                for (const recipe of recipes) {
                    const deductionAmount = recipe.quantity * Number(item.quantity);

                    console.log(`[InventoryService] Deducting ${deductionAmount} of ingredient ${recipe.ingredientId} for order ${orderId} at branch ${branchId}`);

                    // Update the stock for this ingredient at this branch
                    // We use an upsert to handle cases where the stock record might not exist yet (though it should)
                    await tx.stock.upsert({
                        where: {
                            branchId_ingredientId: {
                                branchId: branchId,
                                ingredientId: recipe.ingredientId,
                            }
                        },
                        update: {
                            quantity: {
                                decrement: deductionAmount
                            }
                        },
                        create: {
                            branchId: branchId,
                            ingredientId: recipe.ingredientId,
                            quantity: -deductionAmount // Starts negative if not seeded 
                        }
                    });
                }
            }
        });

        console.log(`[InventoryService] Stock deduction complete for order ${orderId}`);
    } catch (error) {
        console.error(`[InventoryService] Stock deduction failed for order ${orderId}:`, error);
        throw error;
    }
}
