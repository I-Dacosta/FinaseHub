import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRenterColumns() {
  try {
    console.log('📈 Checking Renter view columns...');
    const renterColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Renter'
      ORDER BY ordinal_position
    ` as any[];

    console.log('Renter columns:');
    renterColumns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    const renterSample = await prisma.$queryRaw`
      SELECT * FROM "Renter" LIMIT 3
    ` as any[];
    
    console.log('\n📊 Renter sample data:');
    console.log(JSON.stringify(renterSample, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRenterColumns().catch(console.error);
