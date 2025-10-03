import { factory_contract } from "../config/factory";

/**
 * Create a fair launch
 * @param creator - The creator of the fair launch
 * @param name - The name of the fair launch
 * @param ticker - The ticker of the fair launch
 * @param description - The description of the fair launch
 * @param image - The image of the fair launch
 * @returns The fair launch id
*/

export const createFairLaunch = async (creator: string, name: string, ticker: string, description: string, image: string): Promise<string> => {
  try {
    const tx = await factory_contract.startFairLaunch(creator, name, ticker, description, image);
    const receipt = await tx.wait();
    for (const log of receipt.logs) {
      try {
        const parsed = factory_contract.interface.parseLog(log)
        if(parsed && parsed.name === "FairLaunchStarted") {
          return parsed.args[0].toString();
        }
      } catch {
        // not this contract’s event
      }
    }
    return "0";
  } catch(e) {
    console.log(e);
    return "0";
  }
}

 
export const claimUnclaimedTokens = async (id: string, creator: string): Promise<void> => {
  try {
    const tx = await factory_contract.claimToken(id, creator);
    await tx.wait();
  } catch(e) {
    console.log(e);
    throw e;
  }
}

/**
 * Get a token
 * @param id - The id of the fair launch
 * @returns The token
*/
type Token = {
  fairLaunchId: string;
  name: string;
  ticker: string;
  creator: string;
  address: string | null;
  heat: number;
  lastEngagementBoost: number;
  lastHeatUpdate: Date;
}
export const getToken = async (id: string): Promise<Token | null> => {
  const tokenData = await factory_contract.tokenData(BigInt(id));
  const fairLaunchData = await factory_contract.fairLaunchData(BigInt(id));
  if(tokenData.name.length === 0) {
    return null;
  }
  return {
    fairLaunchId: id,
    creator: tokenData.creator,
    name: tokenData.name,
    ticker: tokenData.ticker,
    address: tokenData.token !== "0x0000000000000000000000000000000000000000" ? tokenData.token : null,
    heat: parseInt(fairLaunchData.heat.toString()),
    lastEngagementBoost: parseInt(fairLaunchData.lastEngagementBoost.toString()),
    lastHeatUpdate: new Date(parseInt(fairLaunchData.lastHeatUpdate.toString())*1000)
  }
}

type HeatUpdate = {
  address: string;
  heat: bigint;
}

/**
 * Update the heat of a fair launch
 * @param heatUpdates - The heat updates
 */
export const updateHeat = async (heatUpdates: HeatUpdate[]) => {
  const tx = await factory_contract.updateHeat(heatUpdates);
  await tx.wait();
}

async function test() {
  try { 
 await createFairLaunch("0x0000000000000000000000000000000009000000", "joshp", "josh", "JOSH", "https://josh.com");
for(let i = 0; i < 5; i++) {
  const tx = await factory_contract.commitToFairLaunch(BigInt(1));
  await tx.wait();
  console.log(i);
}
} catch(e) {
  console.log(e);
}
}
//test();