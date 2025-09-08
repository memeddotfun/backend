import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { connectWalletSchema, createTokenSchema, createNonceSchema, FairLaunchCompletedEventSchema } from '../types/zod';
import { createFairLaunch } from '../services/blockchain';
import { uploadMedia } from '../services/media';
import { randomBytes } from 'crypto';
import { getFollowerStats, getLensUsername } from '../services/lens';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { addTokenDeploymentJob, tokenDeploymentQueue } from '../queues/tokenDeployment';

interface FileRequest extends Request {
    file?: Express.Multer.File;
}

const MIN_FOLLOWERS_FOR_TOKEN = 8000;

export const createToken = async (req: FileRequest, res: Response) => {
    try {
        const { name, ticker, description } = createTokenSchema.parse(req.body.data);
        const image = req.file;

        if (!image || !image.mimetype.startsWith('image/')) {
            res.status(400).json({ error: 'Image is required and must be an image' });
            return;
        }

        const followers = await getFollowerStats(req.user.lensUsername);
        if (followers && followers.followers < MIN_FOLLOWERS_FOR_TOKEN) {
            res.status(400).json({ error: 'User must have at least 8000 followers' });
            return;
        }

        const token = await prisma.token.findFirst({ where: { user: { address: req.user.address }, address: { not: null } } });
        if (token) {
            res.status(400).json({ error: 'Token already exists' });
            return;
        }

        const media = await uploadMedia(image);

        const fairLaunchId = await createFairLaunch(req.user.address, req.user.lensUsername, name, ticker, description, media.cid);

        await prisma.token.create({
            data: {
                fairLaunchId,
                image: {
                    create: {
                        ipfsCid: media.cid,
                        s3Key: media.key,
                    }
                },
                user: { connect: { id: req.user.id } }
            }
        });

        res.status(200).json({ message: 'Fair launch created successfully', fairLaunchId });
        return;

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ 
                error: 'Validation failed', 
                details: error.errors 
            });
            return;
        }   
        res.status(500).json({ error: 'Failed to create token' });
        return;
    }
};

export const createNonce = async (req: Request, res: Response) => {
    try {
    const { address } = createNonceSchema.parse(req.body);
    let user = await prisma.user.findUnique({ where: { address } });
    if (!user) {
        const lensUsername = await getLensUsername(address);
        if (!lensUsername) {
            res.status(400).json({ error: 'Lens username not found' });
            return;
        }
        user = await prisma.user.create({
            data: { address, lensUsername }
        });
    }
    const nonce = await prisma.nonce.create({
        data: {
            nonce: randomBytes(32).toString('hex'),
            user: { connect: { id: user.id } }
        }
    });
    res.status(200).json({ nonce });
    return;
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ 
                error: 'Validation failed', 
                details: error.errors 
            });
            return;
        }   
        res.status(500).json({ error: 'Failed to create nonce' });
        return;
    }
};

export const connectWallet = async (req: Request, res: Response) => {
    try {
        const { address, signature, message } = connectWalletSchema.parse(req.body);
        const recoveredAddress = verifyMessage(message, signature);
        if (recoveredAddress !== address) {
            res.status(400).json({ error: 'Invalid signature' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { address } });
        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }
        const sessionId = randomBytes(32).toString('hex');
        await prisma.session.create({
            data: {
                user: { connect: { id: user.id } },
                session: sessionId
            }
        });
        const token = jwt.sign({ sessionId }, process.env.JWT_SECRET!);
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 30 });
        res.status(200).json({ message: 'Wallet connected successfully' });
        return;
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ 
                error: 'Validation failed', 
                details: error.errors 
            });
            return;
        }   
        res.status(500).json({ error: 'Failed to connect wallet' });
        return;
    }
};

export const fairLaunchCompletedWebhook = async (req: Request, res: Response) => {
    try {
        const { id } = FairLaunchCompletedEventSchema.parse(req.body.result[0]);
        
        // Add job to queue for asynchronous processing
        const job = await addTokenDeploymentJob(id);
        
        console.log(`Fair launch completion webhook received for ID: ${id}, added to queue as job: ${job.id}`);
        
        res.status(200).json({ 
            message: 'Fair launch completed webhook processed successfully',
            jobId: job.id,
            fairLaunchId: id
        });
        return;
    } catch (error) {
        console.error('Failed to process fair launch completed webhook:', error);
        
        if (error instanceof z.ZodError) {
            res.status(400).json({ 
                error: 'Invalid webhook data', 
                details: error.errors 
            });
            return;
        }
        
        res.status(500).json({ error: 'Failed to process fair launch completed webhook' });
        return;
    }
};

export const getJobStatus = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        
        if (!jobId) {
            res.status(400).json({ error: 'Job ID is required' });
            return;
        }
        
        const job = await tokenDeploymentQueue.getJob(jobId);
        
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        
        const state = await job.getState();
        const progress = job.progress;
        
        res.status(200).json({
            id: job.id,
            state,
            progress,
            data: job.data,
            createdAt: job.timestamp,
            processedAt: job.processedOn,
            finishedAt: job.finishedOn,
            failedReason: job.failedReason,
            returnValue: job.returnvalue
        });
        return;
    } catch (error) {
        console.error('Failed to get job status:', error);
        res.status(500).json({ error: 'Failed to get job status' });
        return;
    }
};

export const getQueueStats = async (req: Request, res: Response) => {
    try {
        const waiting = await tokenDeploymentQueue.getWaiting();
        const active = await tokenDeploymentQueue.getActive();
        const completed = await tokenDeploymentQueue.getCompleted();
        const failed = await tokenDeploymentQueue.getFailed();
        
        res.status(200).json({
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            jobs: {
                waiting: waiting.map(job => ({ id: job.id, data: job.data })),
                active: active.map(job => ({ id: job.id, data: job.data, progress: job.progress })),
                completed: completed.slice(0, 10).map(job => ({ id: job.id, data: job.data, returnValue: job.returnvalue })),
                failed: failed.slice(0, 10).map(job => ({ id: job.id, data: job.data, failedReason: job.failedReason }))
            }
        });
        return;
    } catch (error) {
        console.error('Failed to get queue stats:', error);
        res.status(500).json({ error: 'Failed to get queue stats' });
        return;
    }
};
