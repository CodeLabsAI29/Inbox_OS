import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { TelegramBotService } from './src/services/telegram-bot.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBot() {
  console.log('Testing /start');
  const startUpdate = {
    message: {
      chat: { id: 123456789 },
      text: '/start 44925654-523c-43ed-9a41-3ebf014bbe8a'
    }
  };
  await TelegramBotService.handleUpdate(startUpdate);
  console.log('Testing /inbox');
  const inboxUpdate = {
    message: {
      chat: { id: 123456789 },
      text: '/inbox'
    }
  };
  await TelegramBotService.handleUpdate(inboxUpdate);
}

testBot().catch(console.error).finally(() => prisma.$disconnect());
