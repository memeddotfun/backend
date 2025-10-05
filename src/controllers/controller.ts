import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { connectWalletSchema, createTokenSchema,connectSocialSchema, createNonceSchema, FairLaunchCompletedEventSchema, createUnclaimedTokensSchema, claimUnclaimedTokensSchema } from '../types/zod';
import { createFairLaunch, claimUnclaimedTokens } from '../services/blockchain';
import { getPresignedUrl, uploadMedia } from '../services/media';
import { randomBytes } from 'crypto';
import { getEngagementMetrics, getFollowerStats, getLensAccountId, getLensUsername } from '../services/lens';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { Social } from '../generated/prisma';
import { getToken as getTokenBlockchain } from '../services/blockchain';
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

        const media = await uploadMedia(image);

        const fairLaunchId = await createFairLaunch(req.user.address, name, ticker, description, media.cid);

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

export const createUnclaimedTokens = async (req: Request, res: Response) => {
    try {
        const { name, ticker, description, address } = createUnclaimedTokensSchema.parse(req.body);
        const image = req.file;

        if (req.user.role !== 'ADMIN') {
            res.status(400).json({ error: 'User must be an admin' });
            return;
        }
        
        if (!image || !image.mimetype.startsWith('image/')) {
            res.status(400).json({ error: 'Image is required and must be an image' });
            return;
        }

        const lensUsername = await getLensUsername(address);
        if (!lensUsername) {
            res.status(400).json({ error: 'Lens username not found' });
            return;
        }

        let user = await prisma.social.findFirst({ where: { type: 'LENS', username: lensUsername } });
        if (!user) {
            const accountId = await getLensAccountId(address, lensUsername);
            if (!accountId) {
                res.status(400).json({ error: 'Lens account not found' });
                return;
            }
            user = await prisma.social.create({
                data: { type: 'LENS', username: lensUsername, accountId, user: { connect: { address } } }
            });
        }

        const followers = await getFollowerStats(lensUsername);
        if (followers && followers.followers < MIN_FOLLOWERS_FOR_TOKEN) {
            res.status(400).json({ error: 'User must have at least 8000 followers' });
            return;
        }

        const token = await prisma.token.findFirst({ where: { user: { address }, address: { not: null } } });
        if (token) {
            res.status(400).json({ error: 'Token already exists' });
            return;
        }

        const media = await uploadMedia(image);
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        const fairLaunchId = await createFairLaunch(zeroAddress, name, ticker, description, media.cid);

        await prisma.token.create({
            data: {
                fairLaunchId,
                image: {
                    create: {
                        ipfsCid: media.cid,
                        s3Key: media.key,
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

export const completeToken = async (req: Request, res: Response) => {
    try {
        const { id, token } = FairLaunchCompletedEventSchema.parse(req.body);
        const tokenData = await prisma.token.findUnique({ where: { id, address: undefined }, include: { user: true } });
        const tokenDataBlockchain = await getTokenBlockchain(id);
        if (!tokenData || tokenDataBlockchain?.address !== token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }
        await prisma.token.update({ where: { id }, data: { address: tokenDataBlockchain.address } });
        res.status(200).json({ message: 'Token completed successfully' });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete token' });
        return;
    }
};

export const claimUnclaimedToken = async (req: Request, res: Response) => {
    try {
        const { id } = claimUnclaimedTokensSchema.parse(req.body);
        const token = await prisma.token.findUnique({ where: { id }, include: { user: true } });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }

        if (token.user.address !== req.user.address) {
            res.status(400).json({ error: 'User must be the creator of the token' });
            return;
        }

        await claimUnclaimedTokens(id, token.user.address);
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
        let accountId = null;
        if (type === 'LENS') {
            accountId = await getLensAccountId(user.address, username);
        }
        if (!accountId) {
            res.status(400).json({ error: 'Social account not found' });
            return;
        }
        
        const existingSocial = await prisma.social.findUnique({ where: { accountId, type } });
        if (existingSocial) {
            res.status(400).json({ error: 'Social already connected' });
            return;
        }
        await prisma.social.create({ data: { type, username, accountId, user: { connect: { id: user.id } } } });
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
        
        res.clearCookie('token');
        res.status(200).json({ message: 'Wallet disconnected successfully' });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to disconnect wallet' });
        return;
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { socials: true, token: { include: { image: true } } } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        for (const token of user.token) {
            const presignedUrl = await getPresignedUrl(token.image.s3Key);
            token.image.s3Key = presignedUrl;
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
        const token = await prisma.token.findUnique({ where: { id }, include: { image: true } });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }
        const presignedUrl = await getPresignedUrl(token.image.s3Key);
        token.image.s3Key = presignedUrl;
        res.status(200).json({ token });
        return;
    } catch (error) {
        console.error('Failed to get token:', error);
        res.status(500).json({ error: 'Failed to get token' });
        return;
    }
};

export const getAllTokens = async (req: Request, res: Response) => {
    try {
        const tokens = await prisma.token.findMany({ include: { image: true } });
        for (const token of tokens) {
            const presignedUrl = await getPresignedUrl(token.image.s3Key);
            token.image.s3Key = presignedUrl;
        }
        res.status(200).json({ tokens });
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

