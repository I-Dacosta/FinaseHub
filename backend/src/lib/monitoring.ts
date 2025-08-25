import { getPrismaClient } from './db';

export interface SyncStatus {
  id: string;
  type: 'CURRENCY' | 'SERIES';
  status: 'SUCCESS' | 'FAILURE';
  startTime: Date;
  endTime?: Date;
  error?: string;
  recordsProcessed?: number;
  details?: any;
}

export class MonitoringService {
  private static instance: MonitoringService;
  
  private constructor() {}
  
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Log sync status to database
   */
  async logSyncStatus(status: SyncStatus): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      // Create or update sync log
      await prisma.syncLog.upsert({
        where: { id: status.id },
        update: {
          status: status.status,
          endTime: status.endTime,
          error: status.error,
          recordsProcessed: status.recordsProcessed,
          details: status.details ? JSON.stringify(status.details) : undefined
        },
        create: {
          id: status.id,
          type: status.type,
          status: status.status,
          startTime: status.startTime,
          endTime: status.endTime,
          error: status.error,
          recordsProcessed: status.recordsProcessed,
          details: status.details ? JSON.stringify(status.details) : undefined
        }
      });
      
      console.log(`📊 Logged sync status: ${status.type} - ${status.status}`);
    } catch (error) {
      console.error('Failed to log sync status:', error);
    }
  }

  /**
   * Get recent sync history
   */
  async getSyncHistory(limit: number = 10): Promise<any[]> {
    try {
      const prisma = getPrismaClient();
      
      const logs = await prisma.syncLog.findMany({
        orderBy: { startTime: 'desc' },
        take: limit
      });
      
      return logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
        duration: log.endTime ? 
          (log.endTime.getTime() - log.startTime.getTime()) / 1000 : null
      }));
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }

  /**
   * Check for recent failures and send alerts
   */
  async checkAndAlert(): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      // Check for failures in the last 24 hours
      const recentFailures = await prisma.syncLog.findMany({
        where: {
          status: 'FAILURE',
          startTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { startTime: 'desc' },
        take: 5
      });
      
      if (recentFailures.length > 0) {
        console.log(`🚨 Found ${recentFailures.length} sync failures in the last 24 hours`);
        
        // Here you would typically send alerts via email, Slack, Teams, etc.
        // For now, we'll just log the details
        recentFailures.forEach(failure => {
          console.log(`❌ ${failure.type} sync failed at ${failure.startTime.toISOString()}`);
          if (failure.error) {
            console.log(`   Error: ${failure.error}`);
          }
        });
        
        // You could extend this to:
        // - Send email alerts using Azure Communication Services
        // - Post to Slack/Teams webhook
        // - Create Azure Monitor alerts
        // - Send SMS notifications
      } else {
        console.log('✅ No sync failures in the last 24 hours');
      }
    } catch (error) {
      console.error('Failed to check for alerts:', error);
    }
  }

  /**
   * Generate sync status ID
   */
  generateSyncId(type: 'CURRENCY' | 'SERIES'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type.toLowerCase()}_${timestamp}_${random}`;
  }
}

export const monitoringService = MonitoringService.getInstance();
