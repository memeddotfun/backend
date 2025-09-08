import { z } from 'zod';

export const createTokenSchema = z.object({
    name: z.string().min(1),
    ticker: z.string().min(1).max(4),
    description: z.string().min(1),
});

export const createNonceSchema = z.object({
    address: z.string().min(42).max(42),
});

export const connectWalletSchema = z.object({
    address: z.string().min(42).max(42),
    signature: z.string().min(1),
    message: z.string().min(1),
});


export const FairLaunchEventSchema = z.object({
  address: z.string(),
  blockHash: z.string(),
  blockNumber: z.string(),
  id: z.string(),
  logIndex: z.string(),
  name: z.literal("FairLaunchToBeCompleted"),
  totalRaised: z.string(),
  transactionHash: z.string()
});

export const EventResultSchema = z.object({
  result: z.array(FairLaunchEventSchema)
});

export const FairLaunchCompletedEventSchema = z.object({
  address: z.string(),
  blockHash: z.string(),
  blockNumber: z.string(),
  id: z.string(),
  logIndex: z.string(),
  name: z.literal("FairLaunchToBeCompleted"),
  totalRaised: z.string(),
  transactionHash: z.string()
});

export type FairLaunchEvent = z.infer<typeof FairLaunchEventSchema>;
export type EventResult = z.infer<typeof EventResultSchema>;
export type FairLaunchCompletedEvent = z.infer<typeof FairLaunchCompletedEventSchema>;