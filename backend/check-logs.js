const { PrismaClient } = require('@prisma/client');

async function checkLogs() {
  const prisma = new PrismaClient();
  
  try {
    const logs = await prisma.syncLog.findMany({
      where: {
        startTime: {
          gte: new Date('2025-08-21T15:00:00Z')
        }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });
    
    console.log('Recent sync logs since 15:00 UTC today:');
    if (logs.length === 0) {
      console.log('No sync logs found since 15:00 UTC');
    } else {
      logs.forEach(log => {
        console.log(`- ${log.type}: ${log.status} at ${log.startTime.toISOString()} (${log.recordsProcessed} records)`);
      });
    }
  } catch (error) {
    console.error('Error checking logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
