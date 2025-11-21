import { factory_contract, memedToken_contract, memedTokenSale_contract, memedWarriorNFT_contract } from "../config/factory";
import prisma from "../clients/prisma";
import config from "../config/config.json";

// Types
type Token = {
  fairLaunchId: string;
  name: string;
  ticker: string;
  creator: string;
  address: string | null;
  heat: number;
  lastEngagementBoost: number;
  lastHeatUpdate: Date;
};

type HeatUpdate = {
  address: string;
  heat: bigint;
};

/**
 * Get a token by fair launch ID
 * @param id - The id of the fair launch
 * @returns The token data or null if not found
 */
export const getToken = async (id: string): Promise<Token | null> => {
  try {
    const token = await prisma.token.findUnique({
      where: { fairLaunchId: id },
      include: { metadata: true },
    });
    if (!token) {
      return null;
    }
    const tokenData = await factory_contract.tokenData(BigInt(id));
    const tokenRewardData = await factory_contract.tokenRewardData(BigInt(id));

    return {
      fairLaunchId: id,
      creator: tokenData.creator,
      name: token.metadata.name,
      ticker: token.metadata.ticker,
      address:
        tokenData.token !== "0x0000000000000000000000000000000000000000"
          ? tokenData.token
          : null,
      heat: parseInt(tokenRewardData.heat.toString()),
      lastEngagementBoost: parseInt(tokenRewardData.lastEngagementBoost.toString()),
      lastHeatUpdate: new Date(parseInt(tokenRewardData.lastHeatUpdate.toString()) * 1000)
    };
  } catch (e) {
    console.error("Get token error:", e);
    throw e;
  } 
};

/**
 * Complete a fair launch by deploying token and warrior NFT contracts
 * @param id - The id of the fair launch
 * @returns The deployed token address
 */
export const completeFairLaunch = async (id: string, metadataCid: string): Promise<string> => {
  try {
    
    const token = await getToken(id);
    if (!token) {
      throw new Error("Token not found");
    }

    if (token.address) {
      return token.address;
    }
    const tokenContract = await memedToken_contract.deploy(token.name, token.ticker, config.factory, config.memedEngageToEarn, config.memedTokenSale);
    await tokenContract.waitForDeployment();
    const tokenAddress = await tokenContract.getAddress();
    const warriorNFTContract = await memedWarriorNFT_contract.deploy(`${token.name} Warrior`, token.ticker, tokenAddress, config.memedBattle, config.factory, metadataCid);
    await warriorNFTContract.waitForDeployment();
    const warriorAddress = await warriorNFTContract.getAddress();
    await factory_contract.completeFairLaunch(id, tokenAddress, warriorAddress);

    // Step 3: Update database
    await prisma.token.update({
      where: { fairLaunchId: id },
      data: { address: tokenAddress },
    });

    return tokenAddress;
  } catch (e) {
    console.error("Fair launch completion error:", e);
    throw e;
  }
};

/**
 * Create a fair launch
 * @param creator - The creator of the fair launch
 * @param name - The name of the fair launch
 * @param ticker - The ticker of the fair launch
 * @param description - The description of the fair launch
 * @param image - The image of the fair launch
 * @returns The fair launch id
 */
export const createFairLaunch = async (
  creator: string
): Promise<{ fairLaunchId: string, endTime: Date }> => {
  try {
    const tx = await factory_contract.startFairLaunch(
      creator,
    );
    const receipt = await tx.wait();
    for (const log of receipt.logs) {
      try {
        const parsed = factory_contract.interface.parseLog(log);
        if (parsed && parsed.name === "TokenCreated") {
          return { fairLaunchId: parsed.args[0].toString(), endTime: new Date(parseInt(parsed.args[4].toString()) * 1000) };
        }
      } catch {
        // Not this contract's event
      }
    }

    throw new Error("Token not created");
  } catch (e) {
    console.error("Create fair launch error:", e);
    throw e;
  }
}

/**
 * Claim unclaimed tokens
 * @param id - The id of the fair launch
 * @param creator - The creator address
 */
export const claimUnclaimedTokens = async (id: string, creator: string): Promise<void> => {
  try {
    const tx = await factory_contract.claimToken(id, creator);
    await tx.wait();
  } catch (e) {
    console.error("Claim unclaimed tokens error:", e);
    throw e;
  }
};

/**
 * Update the heat of fair launches
 * @param heatUpdates - Array of heat updates
 */
export const updateHeat = async (heatUpdates: HeatUpdate[]): Promise<void> => {
  try {
    const tx = await factory_contract.updateHeat(heatUpdates);
    await tx.wait();
  } catch (e) {
    console.error("Update heat error:", e);
    throw e;
  }
};

/**
 * Check if a fair launch is completable
 * @param id - The id of the fair launch
 * @returns { isCompletable: boolean, isRefundable: boolean }
 */
export const isCompletableAndRefundable = async (id: string): Promise<{ isCompletable: boolean, isRefundable: boolean }> => {
  try {
    const isCompletable = await memedTokenSale_contract.isCompletable(BigInt(id));
    const isRefundable = await memedTokenSale_contract.isRefundable(BigInt(id));
    return { isCompletable, isRefundable };
  } catch (e) {
    console.error("Check if fair launch is completable error:", e);
    throw e;
  }
};

export const isCreatorBlocked = async (creator: string): Promise<{ isBlocked: boolean, blockTime: Date }> => {
  try {
    const [isBlocked, blockTime] = await memedTokenSale_contract.isCreatorBlocked(creator);
    return { isBlocked: isBlocked, blockTime: new Date(parseInt(blockTime.toString()) * 1000) };
  } catch (e) {
    console.error("Check if creator is blocked error:", e);
    throw e;
  }
};
