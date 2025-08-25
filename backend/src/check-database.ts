import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking Database Structure');
  console.log('==============================\n');

  try {
    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    ` as any[];

    console.log('📋 Tables found:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
    console.log('');

    // Check what views exist
    const views = await prisma.$queryRaw`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      ORDER BY viewname
    ` as any[];

    console.log('👁️ Views found:');
    if (views.length === 0) {
      console.log('❌ No views found in database');
    } else {
      views.forEach((view, index) => {
        console.log(`${index + 1}. ${view.viewname}`);
      });
    }
    console.log('');

    // Check sample data from currency_data table
    const currencyCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM currency_data
    ` as any[];

    console.log('💱 Currency data:');
    console.log(`Records: ${currencyCount[0].count}`);

    // Check sample data from interest_series table
    const interestCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM interest_series
    ` as any[];

    console.log('📈 Interest rate data:');
    console.log(`Records: ${interestCount[0].count}`);

    // Check sample columns from currency_data
    const currencyColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'currency_data'
      ORDER BY ordinal_position
    ` as any[];

    console.log('\n📊 Currency data columns:');
    currencyColumns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error);
