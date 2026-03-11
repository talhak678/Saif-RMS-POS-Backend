const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n--- Registered Users in Database ---');
    if (users.length === 0) {
      console.log('No users found.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.name || 'N/A'}, Email: ${user.email}, Role: ${user.role.name}`);
      });
    }
    console.log('------------------------------------\n');

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
