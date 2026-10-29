import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding InternalAPI database...');

  // Create or update default workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws-default-company' },
    update: {},
    create: {
      id: 'ws-default-company',
      name: 'Company Internal APIs',
      description: 'Default company workspace for internal and microservice testing',
      isDefault: true,
    },
  });

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.internal' },
    update: {},
    create: {
      id: 'usr-admin-default',
      email: 'admin@company.internal',
      name: 'InternalAPI Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Link admin to workspace
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: 'ADMIN',
    },
  });

  // Create environments
  const devEnv = await prisma.environment.upsert({
    where: { id: 'env-development' },
    update: {},
    create: {
      id: 'env-development',
      workspaceId: workspace.id,
      name: 'Development',
      variables: {
        create: [
          { key: 'base_url', value: 'https://httpbin.org', isSecret: false, isEnabled: true },
          { key: 'auth_token', value: 'dev-token-abc12345', isSecret: true, isEnabled: true },
        ],
      },
    },
  });

  // Create demo collection
  const demoCollection = await prisma.collection.upsert({
    where: { id: 'col-getting-started' },
    update: {},
    create: {
      id: 'col-getting-started',
      workspaceId: workspace.id,
      name: 'Demo Endpoints & Health',
      description: 'Getting started collection with samples of GET, POST, Auth, and Variables',
      sortOrder: 0,
      requests: {
        create: [
          {
            name: 'Health Check / GET Demo',
            method: 'GET',
            url: '{{base_url}}/get',
            queryParams: [{ id: '1', key: 'source', value: 'internalapi', isEnabled: true }],
            headers: [{ id: '1', key: 'Accept', value: 'application/json', isEnabled: true }],
            authType: 'NONE',
            bodyType: 'NONE',
          },
          {
            name: 'Submit JSON / POST Demo',
            method: 'POST',
            url: '{{base_url}}/post',
            queryParams: [],
            headers: [{ id: '1', key: 'Content-Type', value: 'application/json', isEnabled: true }],
            authType: 'BEARER',
            authConfig: { token: '{{auth_token}}' },
            bodyType: 'JSON',
            bodyContent: JSON.stringify({ message: 'Hello from InternalAPI Postman clone!' }, null, 2),
          },
        ],
      },
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

