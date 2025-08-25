import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkViewStructure() {
  console.log('🔍 Checking Norwegian View Structure');
  console.log('===================================\n');

  try {
    // Check the actual column names in our views
    console.log('📋 Checking Valutakurser view structure...');
    const valutakurserColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Valutakurser'
      ORDER BY ordinal_position
    ` as any[];

    console.log('Valutakurser columns:');
    valutakurserColumns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Check actual data from the base tables
    console.log('📊 Rate table sample:');
    const rateSample = await prisma.$queryRaw`
      SELECT base, quote, value, date
      FROM "Rate"
      LIMIT 3
    ` as any[];
    
    console.log(JSON.stringify(rateSample, null, 2));
    console.log('');

    console.log('📈 SeriesPoint table sample:');
    const seriesSample = await prisma.$queryRaw`
      SELECT series, label, value, date
      FROM "SeriesPoint"
      LIMIT 3
    ` as any[];
    
    console.log(JSON.stringify(seriesSample, null, 2));
    console.log('');

    // Try to query the views directly
    console.log('🇳🇴 Testing view access...');
    
    try {
      const viewTest = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Valutakurser"
      ` as any[];
      console.log(`✅ Valutakurser accessible: ${viewTest[0].count} records`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Valutakurser error: ${errorMessage}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

checkViewStructure().catch(console.error);
