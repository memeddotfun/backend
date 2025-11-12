import { completeFairLaunch, createFairLaunch } from "./blockchain";
import { Addressable, ethers } from "ethers";
import config from "../config/config.json";
import { factory_contract, memedTokenSale_contract, memedBattleResolver_contract } from "../config/factory";
import prisma from "../clients/prisma";
import memedWarriorNFT_contract from "../config/MemedWarriorNFT.json";
import memedToken_contract from "../config/MemedToken.json";
const ierc20abi = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
];

const provider = new ethers.JsonRpcProvider(`https://sepolia.base.org`);
const wallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY as string, provider);
const memedTestEth_contract = new ethers.Contract("0xc190e6F26cE14e40D30251fDe25927A73a5D58b6", ierc20abi, wallet);
const test = async () => {
    // Use existing fair launch ID or create a new one with a unique creator address
    // Generate a random creator address to avoid "already has a token" error
    const randomCreator = ethers.Wallet.createRandom().address;
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    console.log("Using creator address:", wallet.address);
    let fairLaunchId = "1"; 
  /*fairLaunchId = await createFairLaunch(wallet.address, "Test Token", "TEST", "Test Description", "https://example.com/image.png");
  //fairLaunchId = await createFairLaunch(zeroAddress, "Test Token", "TEST", "Test Description", "https://example.com/image.png");
    // Verify we have enough balance
    const balance1 = await memedTestEth_contract.balanceOf(wallet.address);
    console.log("Balance:", ethers.formatEther(balance1));
    const maxCommittable = await memedTokenSale_contract.getMaxCommittableETH(fairLaunchId);
    console.log("Max committable:", ethers.formatEther(maxCommittable));
    if (balance1 < maxCommittable) {
        console.error(`❌ Insufficient balance! Have ${ethers.formatEther(balance1)} ETH, need ${ethers.formatEther(maxCommittable)} ETH`);
        return;
    }
    // Verify allowance
    const allowance = await memedTestEth_contract.allowance(wallet.address, memedTokenSale_contract.target);
    console.log("Allowance confirmed:", ethers.formatEther(allowance), "ETH");
    
    if (allowance < maxCommittable) {

    // Approve the token sale contract to spend max committable amount
    const approveTx = await memedTestEth_contract.approve(memedTokenSale_contract.target, maxCommittable);
    await approveTx.wait();
    console.log("Approved", ethers.formatEther(maxCommittable), "ETH");    
    }
    
  
   // Step 1: Commit to fair launch with MAX amount
 const commitTx = await memedTokenSale_contract.commitToFairLaunch(fairLaunchId, maxCommittable);
 await commitTx.wait();

    // Step 2: Complete the fair launch (deploys token, sets up bonding curve)
    await completeFairLaunch(fairLaunchId.toString());
    console.log("Completed fair launch - bonding curve active");*/
    const tokenData = await factory_contract.getTokenById(fairLaunchId);
    console.log("Token data:", tokenData);
};
test();