import * as cron from 'node-cron';
import prisma from '../clients/prisma';
import { refreshInstagramToken } from '../services/instagram';

/**
 * Instagram token renewal cron job
 * Runs every hour to check for Instagram tokens that are older than 55 days
 * and refreshes them to prevent expiration (real expiry is 60 days)
 */
export const startInstagramTokenRenewalCron = () => {
  const job = cron.schedule('0 * * * *', async () => {
    console.log('🔄 Checking for Instagram tokens to renew at', new Date().toISOString());

    try {
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5);

      // Find all Instagram access tokens that expire within the next 5 days
      const tokensToRenew = await prisma.socialAccessToken.findMany({
        where: {
          expiresAt: {
            lte: fiveDaysFromNow
          },
          social: {
            type: 'INSTAGRAM'
          }
        },
        include: {
          social: {
            select: {
              username: true,
              type: true
            }
          }
        }
      });

      console.log(`📊 Found ${tokensToRenew.length} Instagram token(s) to renew`);

      for (const token of tokensToRenew) {
        try {
          console.log(`🔄 Renewing token for Instagram account: ${token.social.username}`);
          
          const newAccessToken = await refreshInstagramToken(token.accessToken);
          
          await prisma.socialAccessToken.update({
            where: { id: token.id },
            data: {
              accessToken: newAccessToken,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 55) // 55 days
            }
          });

          console.log(`✅ Successfully renewed token for ${token.social.username}`);
        } catch (error) {
          console.error(`❌ Failed to renew token for ${token.social.username}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Instagram token renewal cron job failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('🎯 Instagram token renewal cron job started (runs every hour)');
  return job;
};

/**
 * Stop the cron job (useful for graceful shutdown)
 */
export const stopInstagramTokenRenewalCron = (job: cron.ScheduledTask) => {
  if (job) {
    job.stop();
    console.log('🛑 Instagram token renewal cron job stopped');
  }
};

