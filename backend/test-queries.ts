import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testQueries() {
  console.log('Testing /start logic...');
  try {
    const user = await prisma.user.findUnique({
      where: { id: '44925654-523c-43ed-9a41-3ebf014bbe8a' },
    });
    console.log('User found:', user ? 'Yes' : 'No');
    
    await prisma.userSettings.upsert({
      where: { userId: '44925654-523c-43ed-9a41-3ebf014bbe8a' },
      update: { telegramChatId: '123456789', telegramEnabled: true },
      create: { userId: '44925654-523c-43ed-9a41-3ebf014bbe8a', theme: 'dark', telegramChatId: '123456789', telegramEnabled: true },
    });
    console.log('Upsert successful');
  } catch (err: any) {
    console.error('Error in /start logic:', err.message);
  }

  console.log('Testing /inbox logic...');
  try {
    const settings = await prisma.userSettings.findFirst({
      where: { telegramChatId: '123456789', telegramEnabled: true },
    });
    console.log('Settings found:', settings ? 'Yes' : 'No');

    if (settings) {
      const actionItems = await prisma.actionItem.findMany({
        where: {
          isCompleted: false,
          email: { userId: settings.userId },
        },
        include: { email: true },
        orderBy: { createdAt: 'asc' },
      });
      console.log(`Action items found: ${actionItems.length}`);
    }
  } catch (err: any) {
    console.error('Error in /inbox logic:', err.message);
  }
}

testQueries().finally(() => prisma.$disconnect());
