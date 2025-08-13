import { ethers } from 'ethers';
import factoryABI from './abi.json';
import config from './config.json';

if (!process.env.ALCHEMY_API_KEY || !process.env.EXECUTOR_PRIVATE_KEY) {
  throw new Error('Missing environment variables');
}

const provider = new ethers.JsonRpcProvider(`https://lens-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
const wallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY, provider);
const factory_contract = new ethers.Contract(config.factory, factoryABI, wallet);
export {
  factory_contract,
};
