import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { createMemeSchema } from '../types/zod';
import { createFairLaunch } from '../services/blockchain';


interface FileRequest extends Request {
    file?: Express.Multer.File;
  }

export const createToken = async (req: FileRequest, res: Response) => {
    try {
        const {name, ticker, description } = createMemeSchema.parse(req.body.data);
        const image = req.file;
        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const fairLaunchId = await createFairLaunch(name, ticker, description);

        await prisma.token.create({
            data: {
                fairLaunchId,
                image: {
                    create: {
                        ipfsHash: image.filename,
                        s3Key: image.filename,
                    }
                }
            }
        });

        res.status(200).json({ message: 'Fair launch created successfully', fairLaunchId });


    } catch (error) {
        res.status(500).json({ error: 'Failed to create token' });
    }
};