import { getPrismaClient } from './lib/db';

async function checkData() {
  try {
    const prisma = getPrismaClient();
    
    const policyRateCount = await prisma.seriesPoint.count({
      where: { series: 'POLICY_RATE' }
    });
    
    const totalSeriesPoints = await prisma.seriesPoint.count();
    
    const recentPolicyRates = await prisma.seriesPoint.findMany({
      where: { series: 'POLICY_RATE' },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        date: true,
        series: true,
        value: true
      }
    });
    
    console.log(`📊 Database Statistics:`);
    console.log(`- Policy rate points: ${policyRateCount}`);
    console.log(`- Total series points: ${totalSeriesPoints}`);
    console.log(`\n📈 Recent policy rates:`);
    recentPolicyRates.forEach(point => {
      console.log(`  ${point.date.toISOString().split('T')[0]}: ${point.value}%`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database query failed:', error);
    process.exit(1);
  }
}

checkData();
