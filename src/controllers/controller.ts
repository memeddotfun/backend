import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { createMemeSchema } from '../types/zod';


interface FileRequest extends Request {
    file?: Express.Multer.File;
  }

export const createToken = async (req: FileRequest, res: Response) => {
    try {
        const { name, ticker, description } = createMemeSchema.parse(req.body.data);
        const image = req.file;
        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create token' });
    }
};