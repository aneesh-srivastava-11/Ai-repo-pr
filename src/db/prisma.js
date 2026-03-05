const { PrismaClient } = require('@prisma/client');

let prismaInstance = null;

// Ensure we don't have too many Prisma clients in development (Vercel hot reloading)
function getPrisma() {
    if (prismaInstance) return prismaInstance;

    prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    return prismaInstance;
}

const prisma = getPrisma();

module.exports = { prisma, getPrisma };
