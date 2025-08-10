import { PublicClient, mainnet } from '@lens-protocol/client';

const client = PublicClient.create({
  environment: mainnet
});

export default client;
