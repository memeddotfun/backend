import { z } from 'zod';
import { SocialType } from '../generated/prisma';

export const createTokenSchema = z.object({
    name: z.string().min(1),
    ticker: z.string().min(1).max(4),
    description: z.string().min(1),
});

export const createUnclaimedTokensSchema = z.object({
    name: z.string().min(1),
    ticker: z.string().min(1).max(4),
    description: z.string().min(1),
    address: z.string().min(42).max(42),
});

export const claimUnclaimedTokensSchema = z.object({
    id: z.string(),
});

export const createNonceSchema = z.object({
    address: z.string().min(42).max(42),
});

export const connectWalletSchema = z.object({
    address: z.string().min(42).max(42),
    signature: z.string().min(1),
    message: z.string().min(1),
});

export const connectSocialSchema = z.object({
    type: z.nativeEnum(SocialType),
    username: z.string(),
});


export const FairLaunchCompletedEventSchema = z.object({
  address: z.string(),
  blockHash: z.string(),
  blockNumber: z.string(),
  id: z.string(),
  lpSupply: z.string(),
  logIndex: z.string(),
  name: z.literal("FairLaunchReadyToComplete"),
  totalRaised: z.string(),
  transactionHash: z.string()
});

export type FairLaunchCompletedEvent = z.infer<typeof FairLaunchCompletedEventSchema>;