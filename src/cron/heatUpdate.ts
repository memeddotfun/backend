import * as cron from 'node-cron';
import prisma from '../clients/prisma';
import { getBlockchainHeat, getToken, updateHeat } from '../services/blockchain';
import { getHeat } from '../services/lens';
import { getInstagramInsights } from '../services/instagram';



const MIN_HEAT_UPDATE = 10;
/**
 * Update all tokens heat
 */
async function updateAllTokensHeat() {
  const heatUpdates: { token: string, heat: bigint }[] = [];
  const tokens = await prisma.token.findMany({ where: { address: { not: null } }, include: { user: { include: { socials: { include: { socialAccessToken: true } } } } } });
  for (const token of tokens) {
    const tokenData = await getToken(token.fairLaunchId);
    if (!tokenData || !token.address) {
      continue;
    }
    for (const token of tokens) {
      if (!token.address) {
        continue;
      }
      let heat = 0;
      for (const social of token.user.socials) {
      if (social.type === 'LENS') {
        const lensHeat = await getHeat(social.username, tokenData.lastHeatUpdate);
        
    if (lensHeat && ((lensHeat - tokenData.lastEngagementBoost) > MIN_HEAT_UPDATE && new Date() > tokenData.lastHeatUpdate)) {
      heat += lensHeat;
        }
      }
      if (social.type === 'INSTAGRAM') {
        const accessToken = social.socialAccessToken.find(accessToken => accessToken.socialId === social.id);
        if (!accessToken) {
          continue;
        }
        const instagramHeat = await getInstagramInsights(social.accountId, accessToken.accessToken);
        if (instagramHeat && ((instagramHeat - tokenData.lastEngagementBoost) > MIN_HEAT_UPDATE && new Date() > tokenData.lastHeatUpdate)) {
          heat += instagramHeat;
        }
      }
    }

    if (heat > 10) {
    heatUpdates.push({ token: token.address, heat: BigInt(heat) });
    }
  }
  }
  if (heatUpdates.length === 0) {
    return;
  }
  await updateHeat(heatUpdates);
  for (const heatUpdate of heatUpdates) {
    const token = await prisma.token.findUnique({
      where: { address: heatUpdate.token },
    });
    if (!token) {
      continue;
    }
    const heat = await getBlockchainHeat(token.fairLaunchId);
    await prisma.token.update({
      where: { id: token.id },
      data: { heat: BigInt(heat) },
    });
  }
} 
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
    }
  }, {
    timezone: 'UTC'
  });

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
