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
