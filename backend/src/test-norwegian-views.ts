import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
  data?: any;
}

class NorwegianDataTester {
  private results: TestResult[] = [];

  private addResult(test: string, status: 'PASS' | 'FAIL', details: string, data?: any) {
    this.results.push({ test, status, details, data });
  }

  async testNorwegianViews() {
    console.log('🇳🇴 Testing Norwegian Database Views');
    console.log('====================================\n');

    try {
      // Test 1: Verify Valutakurser view exists and has data
      await this.testValutakurser();

      // Test 2: Verify Renter view exists and has data
      await this.testRenter();

      // Test 3: Test SisteKurser view
      await this.testSisteKurser();

      // Test 4: Test SisteRenter view
      await this.testSisteRenter();

      // Test 5: Test DataSammendrag view
      await this.testDataSammendrag();

      // Test 6: Verify Norwegian translations
      await this.testNorwegianTranslations();

      // Test 7: Test data freshness
      await this.testDataFreshness();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Database Connection', 'FAIL', `Failed to connect: ${errorMessage}`);
    }

    this.printResults();
    await prisma.$disconnect();
  }

  private async testValutakurser() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT "Grunnvaluta") as unique_currencies,
          MAX("Dato") as latest_date,
          MIN("Dato") as earliest_date
        FROM "Valutakurser"
      ` as any[];

      const data = result[0];
      const recordCount = Number(data.total_records);
      
      if (recordCount > 0) {
        this.addResult(
          'Valutakurser View', 
          'PASS', 
          `Found ${recordCount} currency records covering ${data.unique_currencies} currencies from ${data.earliest_date} to ${data.latest_date}`,
          data
        );

        // Test sample currencies with Norwegian names
        const sampleData = await prisma.$queryRaw`
          SELECT "Grunnvaluta", "GrunnvalutaNavn", "Kurs", "Dato"
          FROM "Valutakurser"
          WHERE "Grunnvaluta" IN ('USD', 'EUR', 'GBP')
          ORDER BY "Dato" DESC
          LIMIT 3
        ` as any[];

        this.addResult(
          'Currency Sample Data',
          'PASS',
          'Retrieved sample currency data with Norwegian names',
          sampleData
        );
      } else {
        this.addResult('Valutakurser View', 'FAIL', 'No data found in Valutakurser view');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Valutakurser View', 'FAIL', `Error accessing view: ${errorMessage}`);
    }
  }

  private async testRenter() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT "RenteSerie") as unique_series,
          MAX("Dato") as latest_date,
          MIN("Dato") as earliest_date
        FROM "Renter"
      ` as any[];

      const data = result[0];
      const recordCount = Number(data.total_records);

      if (recordCount > 0) {
        this.addResult(
          'Renter View',
          'PASS',
          `Found ${recordCount} interest rate records covering ${data.unique_series} series from ${data.earliest_date} to ${data.latest_date}`,
          data
        );

        // Test sample interest rates with Norwegian names
        const sampleData = await prisma.$queryRaw`
          SELECT "RenteSerie", "RenteSerieNavn", "Rentesats", "Dato"
          FROM "Renter"
          WHERE "RenteSerie" = 'POLICY_RATE'
          ORDER BY "Dato" DESC
          LIMIT 3
        ` as any[];

        this.addResult(
          'Interest Rate Sample Data',
          'PASS',
          'Retrieved sample interest rate data with Norwegian names',
          sampleData
        );
      } else {
        this.addResult('Renter View', 'FAIL', 'No data found in Renter view');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Renter View', 'FAIL', `Error accessing view: ${errorMessage}`);
    }
  }

  private async testSisteKurser() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as currency_count,
          MAX("Dato") as latest_date
        FROM "SisteKurser"
      ` as any[];

      const data = result[0];
      const currencyCount = Number(data.currency_count);

      if (currencyCount > 0) {
        this.addResult(
          'SisteKurser View',
          'PASS',
          `Found latest rates for ${currencyCount} currencies as of ${data.latest_date}`,
          data
        );

        // Get sample of latest rates
        const latestRates = await prisma.$queryRaw`
          SELECT "Grunnvaluta", "GrunnvalutaNavn", "Kurs", "Dato"
          FROM "SisteKurser"
          ORDER BY "Grunnvaluta"
          LIMIT 5
        ` as any[];

        this.addResult(
          'Latest Currency Rates',
          'PASS',
          'Retrieved latest currency rates',
          latestRates
        );
      } else {
        this.addResult('SisteKurser View', 'FAIL', 'No latest currency data found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('SisteKurser View', 'FAIL', `Error accessing view: ${errorMessage}`);
    }
  }

  private async testSisteRenter() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as series_count,
          MAX("Dato") as latest_date
        FROM "SisteRenter"
      ` as any[];

      const data = result[0];
      const seriesCount = Number(data.series_count);

      if (seriesCount > 0) {
        this.addResult(
          'SisteRenter View',
          'PASS',
          `Found latest rates for ${seriesCount} interest rate series as of ${data.latest_date}`,
          data
        );

        // Get sample of latest rates
        const latestRates = await prisma.$queryRaw`
          SELECT "RenteSerie", "RenteSerieNavn", "Rentesats", "Dato"
          FROM "SisteRenter"
          ORDER BY "RenteSerie"
          LIMIT 5
        ` as any[];

        this.addResult(
          'Latest Interest Rates',
          'PASS',
          'Retrieved latest interest rates',
          latestRates
        );
      } else {
        this.addResult('SisteRenter View', 'FAIL', 'No latest interest rate data found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('SisteRenter View', 'FAIL', `Error accessing view: ${errorMessage}`);
    }
  }

  private async testDataSammendrag() {
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "DataSammendrag"
      ` as any[];

      if (result && result.length > 0) {
        const summary = result[0];
        this.addResult(
          'DataSammendrag View',
          'PASS',
          `Summary data retrieved successfully`,
          summary
        );
      } else {
        this.addResult('DataSammendrag View', 'FAIL', 'No summary data found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('DataSammendrag View', 'FAIL', `Error accessing view: ${errorMessage}`);
    }
  }

  private async testNorwegianTranslations() {
    try {
      const translations = await prisma.$queryRaw`
        SELECT 
          "Grunnvaluta",
          "GrunnvalutaNavn",
          COUNT(*) as record_count
        FROM "Valutakurser"
        WHERE "Grunnvaluta" IN ('USD', 'EUR', 'GBP', 'SEK', 'DKK')
        GROUP BY "Grunnvaluta", "GrunnvalutaNavn"
        ORDER BY "Grunnvaluta"
      ` as any[];

      const expectedTranslations = {
        'USD': 'Amerikanske dollar',
        'EUR': 'Euro',
        'GBP': 'Britiske pund',
        'SEK': 'Svenske kroner',
        'DKK': 'Danske kroner'
      };

      let translationErrors: string[] = [];
      for (const row of translations as any[]) {
        const expected = expectedTranslations[row.Grunnvaluta as keyof typeof expectedTranslations];
        if (expected && row.GrunnvalutaNavn !== expected) {
          translationErrors.push(`${row.Grunnvaluta}: expected "${expected}", got "${row.GrunnvalutaNavn}"`);
        }
      }

      if (translationErrors.length === 0) {
        this.addResult(
          'Norwegian Translations',
          'PASS',
          `All currency names correctly translated to Norwegian`,
          translations
        );
      } else {
        this.addResult(
          'Norwegian Translations',
          'FAIL',
          `Translation errors: ${translationErrors.join(', ')}`,
          translations
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Norwegian Translations', 'FAIL', `Error checking translations: ${errorMessage}`);
    }
  }

  private async testDataFreshness() {
    try {
      const freshness = await prisma.$queryRaw`
        SELECT 
          'Currency' as data_type,
          MAX("Dato") as latest_date,
          COUNT(*) as total_records
        FROM "Valutakurser"
        UNION ALL
        SELECT 
          'Interest Rates' as data_type,
          MAX("Dato") as latest_date,
          COUNT(*) as total_records
        FROM "Renter"
      ` as any[];

      const today = new Date();
      const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      let freshnessIssues: string[] = [];
      for (const row of freshness) {
        const latestDate = new Date(row.latest_date);
        const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysDiff > 7) {
          freshnessIssues.push(`${row.data_type}: ${daysDiff} days old`);
        }
      }

      if (freshnessIssues.length === 0) {
        this.addResult(
          'Data Freshness',
          'PASS',
          'All data is reasonably fresh (within 7 days)',
          freshness
        );
      } else {
        this.addResult(
          'Data Freshness',
          'FAIL',
          `Stale data detected: ${freshnessIssues.join(', ')}`,
          freshness
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult('Data Freshness', 'FAIL', `Error checking data freshness: ${errorMessage}`);
    }
  }

  private printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================\n');

    let passCount = 0;
    let failCount = 0;

    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.details}`);
      
      if (result.data && result.status === 'PASS') {
        try {
          // Handle BigInt serialization
          const serializedData = JSON.stringify(result.data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          , 2);
          console.log(`   📋 Sample data:`, serializedData);
        } catch (error) {
          console.log(`   📋 Sample data: [Data contains non-serializable values]`);
        }
      }
      console.log('');

      if (result.status === 'PASS') passCount++;
      else failCount++;
    }

    console.log(`\n🎯 Summary: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('\n🎉 All tests passed! Your Norwegian data views are ready for Power BI integration.');
      console.log('\n📋 Next steps:');
      console.log('1. Run the Azure deployment script: ./deploy-azure.sh');
      console.log('2. Configure Power BI using the POWERBI_GUIDE.md');
      console.log('3. Set up automated data refresh schedules');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above before proceeding.');
    }
  }
}

// Run the tests
const tester = new NorwegianDataTester();
tester.testNorwegianViews().catch(console.error);
