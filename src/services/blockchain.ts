import { factory_contract, provider } from "../config/factory";
import prisma from "../clients/prisma";

/**
 * Create a fair launch
 * @param creator - The creator of the fair launch
 * @param lensUsername - The lens username of the creator
 * @param name - The name of the fair launch
 * @param ticker - The ticker of the fair launch
 * @param description - The description of the fair launch
 * @param image - The image of the fair launch
 * @returns The fair launch id
*/

export const createFairLaunch = async (creator: string, lensUsername: string, name: string, ticker: string, description: string, image: string): Promise<string> => {
  try {
    const tx = await factory_contract.startFairLaunch(creator, lensUsername, name, ticker, description, image);
    const receipt = await tx.wait();
    for (const log of receipt.logs) {
      try {
        const parsed = factory_contract.interface.parseLog(log)
        if(parsed && parsed.name === "FairLaunchStarted") {
          console.log(parsed.args.fairLaunchId.toString());
          return parsed.args.fairLaunchId.toString();
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

/**
 * Complete a fair launch
 * @param id - The id of the fair launch
 * @param name - The name of the fair launch
 * @param ticker - The ticker of the fair launch
 * @returns The fair launch id
*/
export const completeFairLaunch = async (id: string, name: string, ticker: string): Promise<void> => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
  
  return new Promise((resolve, reject) => {
    const contractsDir = path.join(__dirname, '../../../contracts');
    
    const deployProcess = spawn('npm', [
      'run',
      'deploy-token'
    ], {
      cwd: contractsDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TOKEN_NAME: name,
        TOKEN_TICKER: ticker,
        FAIR_LAUNCH_ID: id
      }
    });
    
    deployProcess.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`Fair launch ${id} completed successfully`);
        resolve();
      } else {
        console.error(`Fair launch deployment failed with code ${code}`);
        reject(new Error(`Deployment failed with exit code ${code}`));
      }
    });
    
    deployProcess.on('error', (error: Error) => {
      console.error('Failed to start deployment process:', error);
      reject(error);
    });
    });
  } catch(e) {
    console.log(e);
  }
}

/**
 * Update the token address
 * @param id - The id of the fair launch
 * @returns The fair launch id
*/
export const updateTokenAddress = async (id: string): Promise<void> => {
  try {
 /*   const token = await prisma.token.findUnique({
        where: {
            fairLaunchId: id.toString()
        }
    });
    const tokenExists = await getToken(id);
    if(token && !token.address) {
        if(tokenExists) {
            if(tokenExists.address) {
            await prisma.token.update({
                where: {
                    fairLaunchId: id
                },
                data: {
                    address: tokenExists.address
                }
            });
        } else {
            await completeFairLaunch(id, tokenExists.name, tokenExists.ticker);
        }
    }
  }*/
  const token = await getToken(id);
  if(token && !token.address) {
    await completeFairLaunch(id, token.name, token.ticker);
  }
  } catch(e) {
    console.log(e);
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
  address: string | null;
}
export const getToken = async (id: string): Promise<Token | null> => {
  const tokenData = await factory_contract.tokenData(BigInt(id));
  if(tokenData.name.length === 0) {
    return null;
  }
  return {
    fairLaunchId: id,
    name: tokenData.name,
    ticker: tokenData.ticker,
    address: tokenData.token !== "0x0000000000000000000000000000000000000000" ? tokenData.token : null
  }
}



async function test() {
  try {
//await createFairLaunch("0x0000000000000000000000000000000009000000", "joshp", "josh", "JOSH", "josh", "https://josh.com");
for(let i = 0; i < 5; i++) {
  const tx = await factory_contract.commitToFairLaunch(BigInt(8));
  await tx.wait();
  console.log(i);
}
} catch(e) {
  console.log(e);
}
}
