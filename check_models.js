const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log(Object.keys(prisma).filter(k => !k.startsWith('_') && typeof prisma[k] === 'object' && prisma[k].deleteMany));
process.exit(0);
