import { factory_contract, provider } from "../config/factory";
import prisma from "../clients/prisma";

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
    // Use cmd.exe on Windows to properly resolve npx
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'cmd.exe' : 'npx';
    const args = isWindows ? ['/c', 'npx', 'hardhat', 'deploy-token', '--network', 'lensTestnet', '--creator', token.creator, '--name', token.name, '--ticker', token.ticker, '--id', id] : [
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
    ];
    
    const deployProcess = spawn(command, args, {
      cwd: contractsDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: isWindows
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
  id: bigint;
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