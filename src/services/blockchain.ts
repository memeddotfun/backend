import { factory_contract } from "../config/factory";

/**
 * Create a fair launch
 * @param name - The name of the fair launch
 * @param ticker - The ticker of the fair launch
 * @param description - The description of the fair launch
 * @returns The fair launch id
*/

export const createFairLaunch = async (name: string, ticker: string, description: string): Promise<string> => {
    const tx = await factory_contract.createFairLaunch(name, ticker, description);
    const receipt = await tx.wait();
    return receipt.events.FairLaunchCreated.args.fairLaunchId;
}


