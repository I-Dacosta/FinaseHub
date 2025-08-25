import { getPrismaClient } from './lib/db';

async function createNorwegianViews() {
  try {
    console.log('🇳🇴 Creating Norwegian-friendly views for Power BI...');
    
    const prisma = getPrismaClient();
    
    // Define the SQL statements directly
    const statements = [
      // View for Currency Rates (Valutakurser)
      `CREATE OR REPLACE VIEW "Valutakurser" AS
SELECT 
    "id" as "ID",
    "base" as "Grunnvaluta",
    "quote" as "Målvaluta", 
    "date" as "Dato",
    "value" as "Kurs",
    "src" as "Kilde",
    CASE 
        WHEN "base" = 'USD' THEN 'Amerikanske dollar'
        WHEN "base" = 'EUR' THEN 'Euro'
        WHEN "base" = 'GBP' THEN 'Britiske pund'
        WHEN "base" = 'SEK' THEN 'Svenske kroner'
        WHEN "base" = 'DKK' THEN 'Danske kroner'
        WHEN "base" = 'JPY' THEN 'Japanske yen'
        WHEN "base" = 'ISK' THEN 'Islandske kroner'
        WHEN "base" = 'AUD' THEN 'Australske dollar'
        WHEN "base" = 'NZD' THEN 'New Zealand dollar'
        WHEN "base" = 'IDR' THEN 'Indonesiske rupiah'
        WHEN "base" = 'CLP' THEN 'Chilenske peso'
        ELSE "base"
    END as "GrunnvalutaNavn",
    CASE 
        WHEN "quote" = 'NOK' THEN 'Norske kroner'
        ELSE "quote"
    END as "MålvalutaNavn",
    EXTRACT(YEAR FROM "date") as "År",
    EXTRACT(MONTH FROM "date") as "Måned",
    EXTRACT(QUARTER FROM "date") as "Kvartal",
    TO_CHAR("date", 'YYYY-MM') as "ÅrMåned",
    CASE 
        WHEN EXTRACT(DOW FROM "date") = 1 THEN 'Mandag'
        WHEN EXTRACT(DOW FROM "date") = 2 THEN 'Tirsdag'
        WHEN EXTRACT(DOW FROM "date") = 3 THEN 'Onsdag'
        WHEN EXTRACT(DOW FROM "date") = 4 THEN 'Torsdag'
        WHEN EXTRACT(DOW FROM "date") = 5 THEN 'Fredag'
        WHEN EXTRACT(DOW FROM "date") = 6 THEN 'Lørdag'
        WHEN EXTRACT(DOW FROM "date") = 0 THEN 'Søndag'
    END as "Ukedag"
FROM "Rate"
WHERE "quote" = 'NOK'`,

      // View for Interest Rates (Renter)
      `CREATE OR REPLACE VIEW "Renter" AS
SELECT 
    "id" as "ID",
    "series" as "RenteSerie",
    "date" as "Dato",
    "value" as "Rentesats",
    "label" as "Etikett",
    "src" as "Kilde",
    CASE 
        WHEN "series" = 'POLICY_RATE' THEN 'Styringsrente'
        WHEN "series" = 'GOV_BONDS_2Y' THEN 'Statsobligasjoner 2 år'
        WHEN "series" = 'GOV_BONDS_5Y' THEN 'Statsobligasjoner 5 år'
        WHEN "series" = 'GOV_BONDS_10Y' THEN 'Statsobligasjoner 10 år'
        WHEN "series" = 'NOWA' THEN 'NOWA-rente'
        ELSE "series"
    END as "RenteSerieNavn",
    EXTRACT(YEAR FROM "date") as "År",
    EXTRACT(MONTH FROM "date") as "Måned",
    EXTRACT(QUARTER FROM "date") as "Kvartal",
    TO_CHAR("date", 'YYYY-MM') as "ÅrMåned",
    CASE 
        WHEN EXTRACT(DOW FROM "date") = 1 THEN 'Mandag'
        WHEN EXTRACT(DOW FROM "date") = 2 THEN 'Tirsdag'
        WHEN EXTRACT(DOW FROM "date") = 3 THEN 'Onsdag'
        WHEN EXTRACT(DOW FROM "date") = 4 THEN 'Torsdag'
        WHEN EXTRACT(DOW FROM "date") = 5 THEN 'Fredag'
        WHEN EXTRACT(DOW FROM "date") = 6 THEN 'Lørdag'
        WHEN EXTRACT(DOW FROM "date") = 0 THEN 'Søndag'
    END as "Ukedag",
    CASE 
        WHEN "value" <= 2.0 THEN 'Lav'
        WHEN "value" <= 4.0 THEN 'Middels'
        ELSE 'Høy'
    END as "RenteNivå"
FROM "SeriesPoint"`,

      // Summary view for Power BI (Sammendrag)
      `CREATE OR REPLACE VIEW "DataSammendrag" AS
SELECT 
    'Valutakurser' as "DataType",
    COUNT(*) as "AntallRekorder",
    MIN("date") as "FørsteDate",
    MAX("date") as "SisteDate",
    COUNT(DISTINCT "base") as "AntallValutaer"
FROM "Rate"
WHERE "quote" = 'NOK'
UNION ALL
SELECT 
    'Renter' as "DataType",
    COUNT(*) as "AntallRekorder",
    MIN("date") as "FørsteDate",
    MAX("date") as "SisteDate",
    COUNT(DISTINCT "series") as "AntallSerier"
FROM "SeriesPoint"`,

      // Latest rates view (Siste kurser)
      `CREATE OR REPLACE VIEW "SisteKurser" AS
WITH LatestRates AS (
    SELECT 
        "base",
        "quote", 
        MAX("date") as "latest_date"
    FROM "Rate" 
    WHERE "quote" = 'NOK'
    GROUP BY "base", "quote"
)
SELECT 
    r."base" as "Grunnvaluta",
    r."quote" as "Målvaluta",
    r."date" as "Dato",
    r."value" as "Kurs",
    CASE 
        WHEN r."base" = 'USD' THEN 'Amerikanske dollar'
        WHEN r."base" = 'EUR' THEN 'Euro'
        WHEN r."base" = 'GBP' THEN 'Britiske pund'
        WHEN r."base" = 'SEK' THEN 'Svenske kroner'
        WHEN r."base" = 'DKK' THEN 'Danske kroner'
        WHEN r."base" = 'JPY' THEN 'Japanske yen'
        WHEN r."base" = 'ISK' THEN 'Islandske kroner'
        WHEN r."base" = 'AUD' THEN 'Australske dollar'
        WHEN r."base" = 'NZD' THEN 'New Zealand dollar'
        WHEN r."base" = 'IDR' THEN 'Indonesiske rupiah'
        WHEN r."base" = 'CLP' THEN 'Chilenske peso'
        ELSE r."base"
    END as "GrunnvalutaNavn"
FROM "Rate" r
INNER JOIN LatestRates lr ON r."base" = lr."base" 
    AND r."quote" = lr."quote" 
    AND r."date" = lr."latest_date"
WHERE r."quote" = 'NOK'
ORDER BY r."base"`,

      // Latest interest rates view (Siste renter)
      `CREATE OR REPLACE VIEW "SisteRenter" AS
WITH LatestRates AS (
    SELECT 
        "series",
        MAX("date") as "latest_date"
    FROM "SeriesPoint"
    GROUP BY "series"
)
SELECT 
    sp."series" as "RenteSerie",
    sp."date" as "Dato",
    sp."value" as "Rentesats",
    sp."label" as "Etikett",
    CASE 
        WHEN sp."series" = 'POLICY_RATE' THEN 'Styringsrente'
        WHEN sp."series" = 'GOV_BONDS_2Y' THEN 'Statsobligasjoner 2 år'
        WHEN sp."series" = 'GOV_BONDS_5Y' THEN 'Statsobligasjoner 5 år'
        WHEN sp."series" = 'GOV_BONDS_10Y' THEN 'Statsobligasjoner 10 år'
        WHEN sp."series" = 'NOWA' THEN 'NOWA-rente'
        ELSE sp."series"
    END as "RenteSerieNavn"
FROM "SeriesPoint" sp
INNER JOIN LatestRates lr ON sp."series" = lr."series" 
    AND sp."date" = lr."latest_date"
ORDER BY sp."series"`
    ];
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`${i + 1}. Creating view...`);
      await prisma.$executeRawUnsafe(statement);
    }
    
    console.log('✅ Norwegian views created successfully!');
    
    // Test the views
    console.log('\n📊 Testing Norwegian views...');
    
    const sammendrag = await prisma.$queryRawUnsafe('SELECT * FROM "DataSammendrag"');
    console.log('Data sammendrag:', sammendrag);
    
    const sisteKurser = await prisma.$queryRawUnsafe('SELECT * FROM "SisteKurser" LIMIT 3');
    console.log('Siste kurser (sample):', sisteKurser);
    
    const sisteRenter = await prisma.$queryRawUnsafe('SELECT * FROM "SisteRenter"');
    console.log('Siste renter:', sisteRenter);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create Norwegian views:', error);
    process.exit(1);
  }
}

createNorwegianViews();
