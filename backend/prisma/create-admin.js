require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const { ADMIN_USERNAME, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_NAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 14) {
    throw new Error('Set ADMIN_USERNAME, ADMIN_NAME and a unique ADMIN_PASSWORD of at least 14 characters.');
  }

  const user = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      name: ADMIN_NAME,
      role: 'admin',
      active: true,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12)
    },
    select: { id: true, username: true, name: true, role: true }
  });
  console.log(`Created the initial administrator account "${user.username}". Remove the bootstrap environment variables after use.`);
}

main()
  .catch((error) => {
    console.error('Could not create the administrator account:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
