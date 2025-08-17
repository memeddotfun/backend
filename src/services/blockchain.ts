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
    const tx = await factory_contract.startFairLaunch(creator, lensUsername, name, ticker, description, image);
    const receipt = await tx.wait();
    console.log(receipt);
    return "0"; // Return the fair launch ID from the first event log
}

export const completeFairLaunch = async (id: string, name: string, ticker: string): Promise<void> => {
  const { spawn } = require('child_process');
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    const contractsDir = path.join(__dirname, '../../../contracts');
    
    const deployProcess = spawn('yarn', [
      'deploy-token',
      name,
      ticker, 
      id
    ], {
      cwd: contractsDir,
      stdio: 'inherit'
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
}

export const updateTokenAddress = async (id: string): Promise<void> => {
    const token = await prisma.token.findUnique({
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
}
}

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
//await createFairLaunch("0x0000000000000000000000000000000000000000", "josh", "josh", "JOSH", "josh", "https://josh.com");
const token = await getToken("1");
console.log(token);
for(let i = 0; i < 4; i++) {
  const tx = await factory_contract.commitToFairLaunch(BigInt(1));
  const receipt = await tx.wait();
  console.log(receipt);
}
}

