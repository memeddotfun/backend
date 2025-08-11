import { fetchAccount, fetchAccountGraphStats, fetchPosts, fetchFollowers } from "@lens-protocol/client/actions";
import { evmAddress } from '@lens-protocol/client';
import client from '../config/lens';

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
  
  return statsResult;
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

async function getHandleOwner(handle: string) {  
  const result = await fetchAccount(client, {
    username: {
      localName: handle,
    }
  });
  if (result.isErr() || !result.value) {
    return null;
  }
  return result.value.address;
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
        upvotes: randomInt(),
        reposts: randomInt(),
        bookmarks: randomInt(),
        collects: randomInt(),
        comments: randomInt(),
        quotes: randomInt()
      };
}
/**
 * Get engagement metrics for a handle
 */
async function getEngagementMetrics(handle: string, update: boolean) {
  try {
    const mock = false;
    const result = await fetchAccount(client, {
      username: {
        localName: handle,
      }
    });
    
    if (result.isErr() || !result.value) {
      throw new Error('Account not found');
    }
    
    const account = result.value;
    const engagementMetricsResult = await fetchPosts(client, {
      filter: {
        authors: [evmAddress(account.address)]
      }
    });

    if (engagementMetricsResult.isErr()) {
      throw new Error('Failed to fetch posts');
    }

    return engagementMetricsResult.value.items;
  } catch (error) {
    console.error(`Error fetching engagement metrics for ${handle}:`, error);
    throw error;
  }
}



export {
  getFollowerStats,
  getLensUsername,
  getHandleOwner,
  getFollowers,
  getEngagementMetrics,
}; 