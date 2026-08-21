import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { prepareExistingOwnerUpdate, prepareNewOwner } from '../src/auth/owner-credential';

async function main() {
  const args = process.argv.slice(2);
  const name = args[0] || process.env.OWNER_NAME;
  const email = args[1] || process.env.OWNER_EMAIL;
  const password = args[2] || process.env.OWNER_PASSWORD;

  if (!name || !email || !password) {
    console.error('Uso: npx ts-node scripts/create-owner.ts <nome> <email> <senha>');
    console.error('Ou defina as variáveis: OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Erro: DATABASE_URL não configurada no ambiente.');
    process.exit(1);
  }

  const isSsl = databaseUrl.includes('sslmode=require') || databaseUrl.includes('render.com') || !databaseUrl.includes('localhost');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    await prisma.$connect();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const updated = await prisma.user.update({
        where: { email },
        data: await prepareExistingOwnerUpdate(existingUser, { name, email, password }),
      });
      console.log(`Usuário atualizado com sucesso como OWNER (ID: ${updated.id}, Email: ${updated.email})`);
    } else {
      const created = await prisma.user.create({
        data: await prepareNewOwner({ name, email, password }),
      });
      console.log(`Usuário OWNER criado com sucesso! (ID: ${created.id}, Email: ${created.email})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Falha ao criar usuário OWNER:', err.message);
  process.exit(1);
});
