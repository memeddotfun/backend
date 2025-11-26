import { fetchAccount, fetchAccountGraphStats, fetchPosts, fetchFollowers } from "@lens-protocol/client/actions";
import { evmAddress, mainnet } from '@lens-protocol/client';
import client from '../config/lens';
import { BigQuery } from '@google-cloud/bigquery';
import prisma from '../clients/prisma';
import { getToken, updateHeat } from "./blockchain";

const bigquery = new BigQuery({
  keyFilename: './gcloud.json',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});



/**
 * Get account information and follower statistics for a Lens handle
 * @param {string} handle - The Lens handle
 * @returns {Promise<Object>} - Account graph statistics
 */
async function getFollowerStats(handle: string) {
  const result = await fetchAccount(client, {
    username: {
      localName: handle,
    }
  });

  if (result.isErr() || !result.value) {
    throw new Error('Account not found');
  }

  const account = result.value;

  const statsResult = await fetchAccountGraphStats(client, {
    account: evmAddress(account.address),
  });
  if (statsResult.isErr() || !statsResult.value) {
    return null;
  }
  return statsResult.value;
}

async function getLensUsername(address: string) {
  const result = await fetchAccount(client, {
    address: evmAddress(address),
  });
  if (result.isErr() || !result.value || !result.value.username) {
    return null;
  }
  return result.value.username.localName;
}

async function getLensAccountId(address: string, handle: string) {
  const result = await fetchAccount(client, {
    username: {
      localName: handle,
    }
  });
  const owner = await getHandleOwner(handle);
  if (result.isErr() || !result.value || owner.toLowerCase() !== address.toLowerCase()) {
    return null;
  }
  return `LENS:${result.value.address}`;
}

async function getHandleOwner(handle: string) {
  const result = await fetchAccount(client, {
    username: {
      localName: handle,
    }
  });
  if (result.isErr() || !result.value) {
    return null;
  }
  return result.value.owner;
}

/**
 * Get followers for a lens handle
 * This implementation will be improved to fetch actual followers
 */
async function getFollowers(handle: string) {
  try {
    const result = await fetchAccount(client, {
      username: {
        localName: handle,
      }
    });

    if (result.isErr() || !result.value) {
      throw new Error('Account not found');
    }

    const account = result.value;
    // In a production implementation, we would fetch actual followers
    const followersResult = await fetchFollowers(client, {
      account: evmAddress(account.address),
    });

    if (followersResult.isErr()) {
      throw new Error('Failed to fetch followers');
    }

    return followersResult.value.items;
    // For now, let's return 100 mock addresses for testing
    // return Array.from({ length: 100 }, () => {
    //   const randomWallet = ethers.Wallet.createRandom();
    //   return randomWallet.address;
    // });
  } catch (error) {
    console.error(`Error fetching followers for ${handle}:`, error);
    throw error;
  }
}

/**
 * mock stats
 */
function mockStats() {
  function randomInt() {
    return Math.floor(Math.random() * (100000 - 75000 + 1)) + 75000;

  }
  return {
    reposts: randomInt(),
    comments: randomInt(),
    reactions: randomInt()
  };
}

async function getHeat(handle: string, from: Date) {
  const engagement = await getEngagementMetrics(handle, from);
  if (!engagement) {
    return null;
  }
  const heat = (engagement.reactions * 1) + (engagement.comments * 5) + (engagement.reposts * 2);
  return heat;
}

type EngagementMetrics = {
  reactions: number;
  comments: number;
  reposts: number;
}

/**
 * Get engagement metrics for a handle
 * @param {string} handle - The Lens handle
 * @param {Date} from - The date from which to get the engagement metrics
 * @returns {Promise<EngagementMetrics | null>} - Engagement metrics
 */
async function getEngagementMetrics(handle: string, from: Date): Promise<EngagementMetrics | null> {
  try {
    const mock = false;
    if (mock) {
      return mockStats();
    }
    const query = `
      SELECT
        SUM(ps.total_reactions) AS reactions,
        SUM(ps.total_comments) AS comments,
        SUM(ps.total_reposts) AS reposts,
        FROM \`lens-protocol-mainnet.account.post_summary\` AS ps
        JOIN \`lens-protocol-mainnet.account.username_assigned\` AS ua
        ON ps.account = ua.account
        WHERE ps.updated_at > '${from.toISOString()}'
        AND ua.local_name = '${handle}'
        LIMIT 1`;

    const [rows] = await bigquery.query(query);
    const result = rows[0];
    if (result) {
      return {
        reactions: result.reactions,
        comments: result.comments,
        reposts: result.reposts,
      };
    }
    return null;


  } catch (error) {
    console.error(`Error fetching engagement metrics for ${handle}:`, error);
    throw error;
  }
}

const MIN_HEAT_UPDATE = 10;
/**
 * Update all tokens heat
 */
async function updateAllTokensHeat() {
  const heatUpdates: { token: string, heat: bigint }[] = [];
  const tokens = await prisma.token.findMany({ where: { address: { not: null } }, include: { user: { include: { socials: true } } } });
  for (const token of tokens) {
    const tokenData = await getToken(token.fairLaunchId);
    if (!tokenData || !token.address) {
      continue;
    }
    const lensUsername = token.user.socials.find(social => social.type === 'LENS')?.username;
    if (!lensUsername) {
      continue;
    }
    const heat = await getHeat(lensUsername, tokenData.lastHeatUpdate);
    if (!heat || ((heat - tokenData.lastEngagementBoost) < MIN_HEAT_UPDATE && new Date() < tokenData.lastHeatUpdate)) {
      continue;
    }
    heatUpdates.push({ token: token.address, heat: BigInt(heat) });
  }
  if (heatUpdates.length === 0) {
    return;
  }
  await updateHeat(heatUpdates);
}

export {
  getFollowerStats,
  getLensUsername,
  getLensAccountId,
  getHandleOwner,
  getFollowers,
  getEngagementMetrics,
  getHeat,
  updateAllTokensHeat,
}; 