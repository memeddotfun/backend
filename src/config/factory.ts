import { ethers } from 'ethers';
import factoryABI from './MemedFactory_test.json';
import config from './config.json';
import memedToken from './MemedToken.json';
import memedWarriorNFT from './MemedWarriorNFT.json';
import memedTokenSale from './MemedTokenSale_test.json';
import memedBattleResolver from './MemedBattleResolver.json';

if (!process.env.ALCHEMY_API_KEY || !process.env.EXECUTOR_PRIVATE_KEY) {
  throw new Error('Missing environment variables');
}

const provider = new ethers.JsonRpcProvider(`https://sepolia.base.org`);
const wallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY, provider);
const factory_contract = new ethers.Contract(config.factory, factoryABI.abi, wallet);
const memedToken_contract = new ethers.ContractFactory(memedToken.abi, memedToken.bytecode, wallet);
const memedWarriorNFT_contract = new ethers.ContractFactory(memedWarriorNFT.abi, memedWarriorNFT.bytecode, wallet);
const memedTokenSale_contract = new ethers.Contract(config.memedTokenSale, memedTokenSale.abi, wallet);
const memedBattleResolver_contract = new ethers.Contract(config.memedBattleResolver, memedBattleResolver.abi, wallet);

export {
  provider,
  factory_contract,
  memedToken_contract,
  memedWarriorNFT_contract,
  memedTokenSale_contract,
  memedBattleResolver_contract,
};
