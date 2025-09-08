import * as cron from 'node-cron';
import { updateAllTokensHeat } from '../services/lens';
/**
 * Daily heat update cron job
 * Runs every day at 00:00 UTC
 */
export const startHeatUpdateCron = () => {
  // Schedule: '0 0 * * *' = At 00:00 (midnight) every day
  const job = cron.schedule('0 0 * * *', async () => {
    console.log('🔥 Starting daily heat update cron job at', new Date().toISOString());
    
    try {
      await updateAllTokensHeat();
      console.log('✅ Daily heat update completed successfully');
    } catch (error) {
      console.error('❌ Daily heat update failed:', error);
      
      // You could add alerting here (email, Slack, etc.)
      // await sendAlert('Heat update failed', error.message);
    }
  }, {
    timezone: 'UTC' // Ensure it runs at 0 UTC regardless of server timezone
  });

  console.log('🕐 Heat update cron job scheduled to run daily at 00:00 UTC');
  return job;
};

/**
 * Get next scheduled run time
 */
export const getNextHeatUpdateTime = (): Date => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
};

/**
 * Stop the cron job (useful for graceful shutdown)
 */
export const stopHeatUpdateCron = (job: cron.ScheduledTask) => {
  if (job) {
    job.stop();
    console.log('🛑 Heat update cron job stopped');
  }
};
