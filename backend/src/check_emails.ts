import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const userId = 'cba1c39e-dbfb-4f1a-9a58-bc1d93240140';

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
      emailAccounts: true,
    },
  });
  console.log('User settings:', JSON.stringify(user?.settings, null, 2));
  console.log(
    'Email accounts linked:',
    JSON.stringify(user?.emailAccounts, null, 2)
  );

  const emails = await prisma.email.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      analysis: true,
      actionItems: true,
    },
  });

  console.log(`Found ${emails.length} emails. Details:`);
  for (const e of emails) {
    console.log(
      `- Subject: "${e.subject}" from "${e.sender}" status: "${e.status}"`
    );
    console.log(
      `  Analysis:`,
      e.analysis
        ? `Category: ${e.analysis.category}, Priority: ${e.analysis.priorityScore}`
        : 'None'
    );
    console.log(
      `  Action Items (${e.actionItems.length}):`,
      e.actionItems.map((ai) => ai.taskDescription)
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
