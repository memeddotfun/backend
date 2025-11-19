import * as cron from 'node-cron';
import prisma from '../clients/prisma';
import { addTokenDeploymentJob } from '../queues/tokenDeployment';
import { isCompletable } from '../services/blockchain';

/**
 * Sale completion cron job
 * Runs every minute to check for sales that have ended and are ready to be completed
 */
export const startSaleCompletionCron = () => {
  const job = cron.schedule('* * * * *', async () => {
    console.log('🔍 Checking for completable sales at', new Date().toISOString());

    try {
      const now = new Date();
      const pendingTokens = await prisma.token.findMany({
        where: {
          address: null,
          endTime: {
            lte: now
          }
        }
      });

      for (const token of pendingTokens) {
        try {
          const isCompletableResult = await isCompletable(token.fairLaunchId);

          if (isCompletableResult) {
            await addTokenDeploymentJob(token.fairLaunchId);
          }

        } catch (error) {
          console.error(`❌ Error processing token ${token.fairLaunchId}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Sale completion cron job failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('🎯 Sale completion cron job started (runs every minute)');
  return job;
};

/**
 * Stop the cron job (useful for graceful shutdown)
 */
export const stopSaleCompletionCron = (job: cron.ScheduledTask) => {
  if (job) {
    job.stop();
    console.log('🛑 Sale completion cron job stopped');
  }
};

