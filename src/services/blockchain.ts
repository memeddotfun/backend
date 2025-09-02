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
 * @returns The deployed token address
*/
export const completeFairLaunch = async (id: string): Promise<string> => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const token = await getToken(id);
    if(!token) {
      throw new Error('Token not found');
    }
  
  return new Promise((resolve, reject) => {
    const contractsDir = path.join(__dirname, '../../../contracts');

    let output = '';
    const deployProcess = spawn('npx', [
      'hardhat',
      'deploy-token',
      '--network',
      'lensTestnet',
      '--creator',
      token.creator,
      '--name',
      token.name,
      '--ticker',
      token.ticker,
      '--id',
      id
    ], {
      cwd: contractsDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    deployProcess.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    
    deployProcess.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      process.stderr.write(chunk);
    });
    
    deployProcess.on('close', async (code: number | null) => {
      if (code === 0) {
        // Extract token address from output
        const tokenMatch = output.match(/MemedToken deployed to: (0x[a-fA-F0-9]{40})/);
        if (tokenMatch) {
          const tokenAddress = tokenMatch[1];
          console.log(`Fair launch ${id} completed successfully, token: ${tokenAddress}`);
          await prisma.token.update({
            where: {
              fairLaunchId: id
            },
            data: {
              address: tokenAddress
            }
          });
          resolve(tokenAddress);
        } else {
          reject(new Error('Could not extract token address from deployment output'));
        }
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
}
export const getToken = async (id: string): Promise<Token | null> => {
  const tokenData = await factory_contract.tokenData(BigInt(id));
  if(tokenData.name.length === 0) {
    return null;
  }
  return {
    fairLaunchId: id,
    creator: tokenData.creator,
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
