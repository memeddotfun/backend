import ethers from 'ethers';
import factoryABI from './abi.json';
import airdropABI from './airdropABI.json';
import config from './config.json';

if (!process.env.RPC_URL_LENS || !process.env.RPC_URL_LENS_WS || !process.env.ADMIN_PVT_KEY) {
  throw new Error('Missing environment variables');
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_LENS);
const providerWS = new ethers.WebSocketProvider(process.env.RPC_URL_LENS_WS);
const wallet = new ethers.Wallet(process.env.ADMIN_PVT_KEY, provider);
const factory_contract = new ethers.Contract(config.factory, factoryABI, wallet);  
const airdrop_contract = new ethers.Contract(config.memedEngageToEarn, airdropABI, wallet);
const airdrop_contractWS = new ethers.Contract(config.memedEngageToEarn, airdropABI, providerWS);


export {
  factory_contract,
  airdrop_contract,
  airdrop_contractWS,
  wallet
};
