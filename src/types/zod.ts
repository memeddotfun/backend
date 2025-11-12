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
  webhookId: z.string(),
  id: z.string(),
  network: z.string(),
  type: z.literal("LOG"),
  event: z.object({
    block: z.object({
      number: z.string(),
      hash: z.string(),
      timestamp: z.string()
    }),
    account: z.object({
      address: z.string()
    }),
    transaction: z.object({
      hash: z.string(),
      index: z.string().optional(),
      from: z.object({
        address: z.string()
      }),
      to: z
        .object({
          address: z.string().nullable()
        })
        .optional(),
      value: z.string().nullable().optional(),
      gasPrice: z.string().optional().nullable(),
      gasUsed: z.string().optional().nullable(),
      status: z.string().optional().nullable()
    }),
    log: z.object({
      index: z.string(),
      data: z.string(),
      topics: z.array(z.string())
    })
  })
});


export type FairLaunchCompletedEvent = z.infer<typeof FairLaunchCompletedEventSchema>;