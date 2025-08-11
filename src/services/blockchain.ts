import { factory_contract } from "../config/factory";

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
    return receipt.events.FairLaunchCreated.args.fairLaunchId;
}


