import { exec, ExecOptions } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { factory_contract } from "../config/factory";
import prisma from "../clients/prisma";
import config from "../config/config.json";

// Constants
const CONTRACTS_DIR = path.join(__dirname, "../../../contracts");
const PARAMETERS_PATH = path.join(CONTRACTS_DIR, "ignition/parameters.json");

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
 * Complete a fair launch by deploying token and warrior NFT contracts
 * @param id - The id of the fair launch
 * @param lpSupply - The lp supply of the fair launch
 * @returns The deployed token address
 */
export const completeFairLaunch = async (id: string, lpSupply: string): Promise<string> => {
  try {
    
    const token = await getToken(id);
    if (!token) {
      throw new Error("Token not found");
    }

    // Prepare deployment parameters
    const parameters = {
      TokenModule: {
        name: token.name,
        ticker: token.ticker,
        creator: token.creator,
        factoryContract: config.factory,
        engageToEarnContract: config.memedEngageToEarn,
        lpSupply: `${lpSupply}n`,
      },
      WarriorNFTModule: {
        token: "0x0000000000000000000000000000000000000000",
        battle: config.memedBattle,
        factory: config.factory,
      },
    };

    // Step 1: Deploy Token
    await fs.writeFile(PARAMETERS_PATH, JSON.stringify(parameters, null, 2));
    console.log("Parameters prepared for token deployment");

    const tokenAddress = await deployContract(
      "./ignition/modules/Token.ts",
      /TokenModule#MemedToken - (0x[a-fA-F0-9]{40})/
    );
    console.log(`Token deployed: ${tokenAddress}`);

    // Step 2: Update parameters and deploy WarriorNFT
    parameters.WarriorNFTModule.token = tokenAddress;
    await fs.writeFile(PARAMETERS_PATH, JSON.stringify(parameters, null, 2));
    console.log("Parameters updated with token address");

    const warriorAddress = await deployContract(
      "./ignition/modules/WarriorNFT.ts",
      /WarriorNFTModule#MemedWarriorNFT - (0x[a-fA-F0-9]{40})/
    );
    console.log(`WarriorNFT deployed: ${warriorAddress}`);
    console.log(`Fair launch ${id} completed successfully!`);
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
 * Helper function to deploy a contract using Hardhat Ignition
 */
const deployContract = (modulePath: string, addressPattern: RegExp): Promise<string> => {
  return new Promise((resolve, reject) => {
    const command = `echo y | npx hardhat ignition deploy ${modulePath} --network baseSepolia --parameters ignition/parameters.json --verify --reset`;

    const options: ExecOptions = {
      cwd: CONTRACTS_DIR,
    };

    exec(command, options, (err: Error | null, stdout: string, stderr: string) => {
      if (err) {
        console.error("Deployment error:", err);
        console.error("stderr:", stderr);
        reject(err);
        return;
      }

      const match = stdout.match(addressPattern);
      if (!match) {
        reject(new Error(`Could not extract address from deployment output`));
        return;
      }

      resolve(match[1]);
    });
  });
}

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
  creator: string,
  name: string,
  ticker: string,
  description: string,
  image: string
): Promise<string> => {
  try {
    const tx = await factory_contract.startFairLaunch(
      creator,
      name,
      ticker,
      description,
      image
    );
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = factory_contract.interface.parseLog(log);
        if (parsed && parsed.name === "FairLaunchStarted") {
          return parsed.args[0].toString();
        }
      } catch {
        // Not this contract's event
      }
    }

    return "0";
  } catch (e) {
    console.error("Create fair launch error:", e);
    return "0";
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
 * Get a token by fair launch ID
 * @param id - The id of the fair launch
 * @returns The token data or null if not found
 */
export const getToken = async (id: string): Promise<Token | null> => {
  try {
    const tokenData = await factory_contract.tokenData(BigInt(id));
    const fairLaunchData = await factory_contract.fairLaunchData(BigInt(id));

    if (tokenData.name.length === 0) {
      return null;
    }

    return {
      fairLaunchId: id,
      creator: tokenData.creator,
      name: tokenData.name,
      ticker: tokenData.ticker,
      address:
        tokenData.token !== "0x0000000000000000000000000000000000000000"
          ? tokenData.token
          : null,
      heat: parseInt(fairLaunchData.heat.toString()),
      lastEngagementBoost: parseInt(fairLaunchData.lastEngagementBoost.toString()),
      lastHeatUpdate: new Date(parseInt(fairLaunchData.lastHeatUpdate.toString()) * 1000),
    };
  } catch (e) {
    console.error("Get token error:", e);
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