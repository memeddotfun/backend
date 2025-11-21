import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { connectWalletSchema, createTokenSchema, connectSocialSchema, createNonceSchema, createUnclaimedTokensSchema, claimUnclaimedTokensSchema } from '../types/zod';
import { createFairLaunch, claimUnclaimedTokens } from '../services/blockchain';
import { getPresignedUrl, uploadMedia } from '../services/media';
import { randomBytes } from 'crypto';
import { getEngagementMetrics, getFollowerStats, getHandleOwner, getLensAccountId, getLensUsername } from '../services/lens';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { Social } from '../generated/prisma';
import { tokenDeploymentQueue } from '../queues/tokenDeployment';

interface FileRequest extends Request {
    file?: Express.Multer.File;
}

const MIN_FOLLOWERS_FOR_TOKEN = 0;

export const createToken = async (req: FileRequest, res: Response) => {
    try {
        const { name, ticker, description } = createTokenSchema.parse(JSON.parse(req.body.data));
        const image = req.file;

        if (!image || !image.mimetype.startsWith('image/')) {
            res.status(400).json({ error: 'Image is required and must be an image' });
            return;
        }
        const lensUsername = req.user.socials.find((social: Social) => social.type === 'LENS')?.username;
        if (!lensUsername) {
            res.status(404).json({ error: 'User must have a LENS account' });
            return;
        }

        const followers = await getFollowerStats(lensUsername);
        if (followers && followers.followers < MIN_FOLLOWERS_FOR_TOKEN) {
            res.status(400).json({ error: 'User must have at least 8000 followers' });
            return;
        }

        const token = await prisma.token.findFirst({ where: { user: { address: req.user.address }, address: { not: null } } });
        if (token) {
            res.status(400).json({ error: 'Token already exists' });
            return;
        }

        const media = await uploadMedia(image, { name, description, image: null });

        const { fairLaunchId, endTime } = await createFairLaunch(req.user.address);

        await prisma.token.create({
            data: {
                fairLaunchId,
                endTime,
                metadata: {
                    create: {
                        cid: media.cid,
                        imageKey: media.key,
                        name,
                        ticker,
                        description,
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

export const createUnclaimedTokens = async (req: Request, res: Response) => {
    try {
        const { name, ticker, description, type, username } = createUnclaimedTokensSchema.parse(req.body);
        const image = req.file;

        if (req.user.role !== 'ADMIN') {
            res.status(400).json({ error: 'User must be an admin' });
            return;
        }

        if (!image || !image.mimetype.startsWith('image/')) {
            res.status(400).json({ error: 'Image is required and must be an image' });
            return;
        }

        const owner = await getHandleOwner(username);
        const accountId = await getLensAccountId(req.user.address, username);
        if (!owner || !accountId) {
            res.status(400).json({ error: 'Lens username not found' });
            return;
        }

        const followers = await getFollowerStats(username);
        if (followers && followers.followers < MIN_FOLLOWERS_FOR_TOKEN) {
            res.status(400).json({ error: 'User must have at least 8000 followers' });
            return;
        }

        const token = await prisma.token.findFirst({ where: { user: { socials: { some: { type, accountId } } } } });
        if (token) {
            res.status(400).json({ error: 'Token already exists' });
            return;
        }

        await prisma.social.deleteMany({ where: { type, accountId } });
        const user = await prisma.user.upsert({
            where: { address: owner },
            update: { socials: { create: { type, username, accountId } } },
            create: { address: owner, socials: { create: { type, username, accountId } } }
        });

        const media = await uploadMedia(image, { name, description, image: null });
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        const { fairLaunchId, endTime } = await createFairLaunch(zeroAddress);

        await prisma.token.create({
            data: {
                fairLaunchId,
                endTime,
                metadata: {
                    create: {
                        cid: media.cid,
                        imageKey: media.key,
                        ticker,
                        name,
                        description,
                    }
                },
                user: { connect: { id: user.id } }
            }
        });
        res.status(200).json({ message: 'Unclaimed tokens created successfully', fairLaunchId });
        return;
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
        res.status(500).json({ error: 'Failed to create unclaimed tokens' });
        return;
    }
};

export const claimUnclaimedToken = async (req: Request, res: Response) => {
    try {
        const { id } = claimUnclaimedTokensSchema.parse(req.body);
        const token = await prisma.token.findUnique({ where: { id }, include: { user: { include: { socials: true } } } });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }

        const lensUsername = token.user.socials.find((social: Social) => social.type === 'LENS')?.username;
        if (!lensUsername) {
            res.status(400).json({ error: 'User must have a LENS account' });
            return;
        }
        const owner = await getHandleOwner(lensUsername);   
        if (owner?.toLowerCase() !== req.user.address.toLowerCase()) {
            res.status(400).json({ error: 'User must be the creator of the token' });
            return;
        }

        let claimAddress = token.user.address;
        if(token.userId !== req.user.id) {
            await prisma.token.update({
                where: { id },
                data: { 
                    userId: req.user.id,
                    user: { connect: { id: req.user.id } }
                }
            });
            claimAddress = req.user.address;
        }
        await claimUnclaimedTokens(id, claimAddress);
        res.status(200).json({ message: 'Unclaimed tokens claimed successfully' });
        return;
    } catch (error) {
        console.error('Failed to claim unclaimed tokens:', error);
        res.status(500).json({ error: 'Failed to claim unclaimed tokens' });
        return;
    }
};

export const createNonce = async (req: Request, res: Response) => {
    try {
        const { address } = createNonceSchema.parse(req.body);
        let user = await prisma.user.findUnique({ where: { address } });
        if (!user) {
            user = await prisma.user.create({
                data: { address }
            });
        }
        const nonce = randomBytes(32).toString('hex');
        await prisma.nonce.create({
            data: {
                nonce,
                user: { connect: { id: user.id } }
            }
        });
        res.status(200).json({ nonce });
        return;
    } catch (error) {
        console.error('Failed to create nonce:', error);
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
        const nonce = await prisma.nonce.findUnique({ where: { nonce: message } });
        if (!nonce) {
            res.status(400).json({ error: 'Invalid nonce' });
            return;
        }
        await prisma.nonce.delete({ where: { id: nonce.id } });
        const sessionId = randomBytes(32).toString('hex');
        await prisma.session.create({
            data: {
                user: { connect: { id: nonce.userId } },
                session: sessionId
            }
        });
        const token = jwt.sign({ sessionId }, process.env.JWT_SECRET!);
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none',
            maxAge: 3600000,
        }).json({
            message: 'Authentication successful'
        });
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

export const connectSocial = async (req: Request, res: Response) => {
    try {
        const { type, username } = connectSocialSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const owner = await getHandleOwner(username);
        if (owner?.toLowerCase() !== user.address.toLowerCase()) {
            res.status(400).json({ error: 'User must be the owner of the social account' });
            return;
        }

        let accountId = null;
        if (type === 'LENS') {
            accountId = await getLensAccountId(user.address, username);
        }
        if (!accountId) {
            res.status(400).json({ error: 'Social account not found' });
            return;
        }

        const existingSocial = await prisma.social.count({
            where: {
                type,
                userId: req.user.id
            }
        });
        if (existingSocial > 0) {
            res.status(400).json({ error: 'Social already connected' });
            return;
        }

        const existingToken = await prisma.token.findFirst({
            where: {
                user: {
                    socials: {
                        some: {
                            type,
                            accountId
                        }
                    }
                }
            }
        });
        if (existingToken) {
            res.status(400).json({ error: 'Token already connected' });
            return;
        }

        await prisma.social.upsert({
            where: {
                accountId
            },
            update: {
                userId: user.id
            },
            create: {
                type,
                username,
                accountId,
                user: { connect: { id: user.id } }
            }
        });
        res.status(200).json({ message: 'Social connected successfully' });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect social' });
        return;
    }
};

export const disconnectWallet = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
        await prisma.session.delete({ where: { session: decoded.sessionId } });

        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none'
        }).json({ message: 'Wallet disconnected successfully' });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to disconnect wallet' });
        return;
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { socials: true, token: { include: { metadata: true } } } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
         for (const token of user.token) {
            const presignedUrl = await getPresignedUrl(token.metadata.imageKey);
            token.metadata.imageKey = presignedUrl;
        }
        res.status(200).json({ user });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
        return;
    }
};

export const getToken = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const token = await prisma.token.findUnique({ where: { id }, include: { metadata: true } });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }
        const presignedUrl = await getPresignedUrl(token.metadata.imageKey);
        token.metadata.imageKey = presignedUrl;
        res.status(200).json({ token });
        return;
    } catch (error) {
        console.error('Failed to get token:', error);
        res.status(500).json({ error: 'Failed to get token' });
        return;
    }
};

export const getTokenByAddress = async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        const token = await prisma.token.findFirst({ 
            where: { 
                address: {
                    equals: address,
                    mode: 'insensitive'
                }
            }, 
            include: { metadata: true } 
        });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }
        const presignedUrl = await getPresignedUrl(token.metadata.imageKey);
        token.metadata.imageKey = presignedUrl;
        res.status(200).json({ token });
        return;
    }
    catch (error) {
        console.error('Failed to get token by address:', error);
        res.status(500).json({ error: 'Failed to get token by address' });
        return;
    }
};

export const getAllTokens = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [tokens, totalCount] = await Promise.all([
            prisma.token.findMany({ 
                include: { metadata: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.token.count()
        ]);

        for (const token of tokens) {
            const presignedUrl = await getPresignedUrl(token.metadata.imageKey);
            token.metadata.imageKey = presignedUrl;
        }

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({ 
            tokens,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
        return;
    } catch (error) {
        console.error('Failed to get all tokens:', error);
        res.status(500).json({ error: 'Failed to get all tokens' });
        return;
    }
};

export const getLensEngagement = async (req: Request, res: Response) => {
    try {
        const { handle } = req.params;
        const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const engagement = await getEngagementMetrics(handle, from);
        res.status(200).json({ engagement });
        return;
    }
    catch (error) {
        console.error('Failed to get lens engagement:', error);
        res.status(500).json({ error: 'Failed to get lens engagement' });
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
