import { ethers } from 'ethers';
import { KMSSigner } from '@rumblefishdev/eth-signer-kms';
import { KMSClient } from '@aws-sdk/client-kms';
import factoryABI from './MemedFactory.json';
import config from './config.json';
import memedToken from './MemedToken.json';
import memedWarriorNFT from './MemedWarriorNFT.json';
import memedTokenSale from './MemedTokenSale.json';
import memedBattleResolver from './MemedBattleResolver.json';

if (!process.env.ALCHEMY_API_KEY || !process.env.AWS_REGION || !process.env.AWS_KMS_KEY_ID || !process.env.AWS_KMS_ADDRESS) {
  throw new Error('Missing environment variables');
}

const provider = new ethers.JsonRpcProvider(`https://sepolia.base.org`);
const wallet = new KMSSigner(provider, process.env.AWS_KMS_ADDRESS, process.env.AWS_KMS_KEY_ID, new KMSClient({ region: process.env.AWS_REGION }));
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
