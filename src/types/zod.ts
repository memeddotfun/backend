import { z } from 'zod';

export const createMemeSchema = z.object({
    name: z.string().min(1),
    ticker: z.string().min(1).max(4),
    description: z.string().min(1),
});