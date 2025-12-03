import { Request, Response } from 'express';
import prisma from '../clients/prisma';
import { z } from 'zod';
import { connectWalletSchema, createTokenSchema, socialSchema, createNonceSchema, createUnclaimedTokensSchema, claimUnclaimedTokensSchema, connectInstagramSchema } from '../types/zod';
import { createFairLaunch, claimUnclaimedTokens, isCreatorBlocked } from '../services/blockchain';
import { getPresignedUrl, uploadMedia } from '../services/media';
import { randomBytes } from 'crypto';
import { getEngagementMetrics, getFollowerStats, getHandleOwner, getLensAccountId, getLensHandle, getLensUsername } from '../services/lens';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { Social } from '../generated/prisma';
import { tokenDeploymentQueue } from '../queues/tokenDeployment';
import { connectInstagram, getInstagramBusinessAccount, getInstagramInsights } from '../services/instagram';

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
        if (req.user.socials.length === 0) {
            res.status(404).json({ error: 'User must have at least one social account' });
            return;
        }

        let followers = 0;
        for (const social of req.user.socials) {
            if (social.type === 'LENS') {
                const lensFollowers = await getFollowerStats(social.username);
                if (!lensFollowers) {
                    res.status(400).json({ error: 'User must have a LENS account' });
                    return;
                }
                followers += lensFollowers.followers;
            }
            if (social.type === 'INSTAGRAM') {
                const socialAccessToken = await prisma.socialAccessToken.findFirst({ where: { socialId: social.id } });
                if (!socialAccessToken) {
                    res.status(400).json({ error: 'User must have an Instagram account' });
                    return;
                }
                const { followers_count } = await getInstagramBusinessAccount(socialAccessToken.accessToken);
                if (!followers_count) {
                    res.status(400).json({ error: 'User must have an Instagram account' });
                    return;
                }
                followers += followers_count;
            }
        }
        if (followers < MIN_FOLLOWERS_FOR_TOKEN) {
            res.status(400).json({ error: 'User must have at least 8000 followers' });
            return;
        }

        const token = await prisma.token.findFirst({ where: { user: { address: req.user.address }, address: { not: null } } });
        if (token) {
            res.status(400).json({ error: 'Token already exists' });
            return;
        }

        const { isBlocked, blockTime } = await isCreatorBlocked(req.user.address);
        if (isBlocked) {
            res.status(400).json({ error: 'Creator is blocked', blockTime: blockTime });
            return;
        }

        const media = await uploadMedia(image, { name, description, image: null });

        const { fairLaunchId, endTime } = await createFairLaunch(req.user.address);

        await prisma.token.create({
            data: {
                fairLaunchId,
                endTime,
                claimed: true,
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
        console.error('Failed to create token:', error);
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
        const accountId = await getLensAccountId(owner, username);
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
        console.error('Failed to create unclaimed tokens:', error);
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
        const token = await prisma.token.findFirst({ where: { id, address: { not: null } }, include: { user: { include: { socials: true } } } });
        if (!token) {
            res.status(404).json({ error: 'Token not found' });
            return;
        }
        if (token.claimed) {
            res.status(400).json({ error: 'Token already claimed' });
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

        const { isBlocked, blockTime } = await isCreatorBlocked(owner);
        if (isBlocked) {
            res.status(400).json({ error: 'Creator is blocked', blockTime: blockTime });
            return;
        }

        let claimAddress = token.user.address;
        if(token.userId !== req.user.id) {
            await prisma.token.update({
                where: { id },
                data: { 
                    userId: req.user.id
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
        const user = await prisma.user.upsert({
            where: { address },
            update: {},
            create: { address }
        });
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
        console.error('Failed to connect wallet:', error);
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
        const { type, username } = socialSchema.parse(req.body);
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
        console.error('Failed to connect social:', error);
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
        console.error('Failed to disconnect wallet:', error);
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
        console.error('Failed to get user:', error);
        res.status(500).json({ error: 'Failed to get user' });
        return;
    }
};

export const getToken = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const token = await prisma.token.findUnique({ where: { id }, include: { metadata: true, user: { include: { socials: true } } } });
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
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
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
            include: { metadata: true, user: { include: { socials: true } } } 
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
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
        res.status(500).json({ error: 'Failed to get token by address' });
        return;
    }
};

export const getTokenBySocial = async (req: Request, res: Response) => {
    try {
        const { type, username } = socialSchema.parse(req.query);
        const token = await prisma.token.findFirst({ where: { user: { socials: { some: { type, username } } } }, include: { metadata: true } });
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
        console.error('Failed to get token by social:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
        res.status(500).json({ error: 'Failed to get token by social' });
        return;
    }
};

export const getAllTokens = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const whereClause: any = {};

        if (req.query.claimed !== undefined) {
            whereClause.claimed = req.query.claimed === 'true';
        }

        if (req.query.failed !== undefined) {
            whereClause.failed = req.query.failed === 'true';
        }

        if (req.query.search) {
            const search = req.query.search as string;
            whereClause.metadata = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { ticker: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [tokens, totalCount] = await Promise.all([
            prisma.token.findMany({ 
                include: { metadata: true, user: { include: { socials: true } } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                where: whereClause
            }),
            prisma.token.count({ where: whereClause })
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
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
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
        if (error instanceof z.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
            return;
        }
        res.status(500).json({ error: 'Failed to get lens engagement' });
        return;
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [tokens, totalCount] = await Promise.all([
            prisma.token.findMany({
                where: { address: { not: null } },
                include: { metadata: true, user: { include: { socials: true } } },
                orderBy: { heat: 'desc' },
                skip,
                take: limit
            }),
            prisma.token.count({ where: { address: { not: null } } })
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
        console.error('Failed to get leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
        return;
    }
};

export const getInstagramAuthUrl = async (req: Request, res: Response) => {
    try {
        const url = `https://www.instagram.com/oauth/authorize?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.FRONTEND_URL}/instagram-callback&response_type=code&scope=instagram_business_basic,instagram_business_manage_insights`;
        res.status(200).json({ url });
        return;
    } catch (error) {
        console.error('Failed to get Instagram auth URL:', error);
        res.status(500).json({ error: 'Failed to get Instagram auth URL' });
        return;
    }
};

export const connectInstagramAuth = async (req: Request, res: Response) => {
    try {
        const { code } = connectInstagramSchema.parse(req.body);
        const existingSocial = await prisma.social.findFirst({ where: { type: 'INSTAGRAM', userId: req.user.id } });
        if (existingSocial) {
            res.status(400).json({ error: 'Instagram account already connected' });
            return;
        }
        const instagramData = await connectInstagram(code);
        if (!instagramData) {
            res.status(400).json({ error: 'Invalid account or not a business or creator account' });
            return;
        }
        const { username, user_id, access_token } = instagramData;
        const existingSocialAccountId = await prisma.social.findFirst({ where: { type: 'INSTAGRAM', accountId: user_id } });
        if (existingSocialAccountId) {
            res.status(400).json({ error: 'Instagram account ID already connected to another user' });
            return;
        }
        await prisma.social.create({
            data: {
                type: 'INSTAGRAM',
                username,
                accountId: user_id,
                socialAccessToken: {
                    create: {
                        accessToken: access_token,
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 55)
                    }
                },
                user: { connect: { id: req.user.id } }
            }
        });
        res.status(200).json({ message: 'Instagram account connected successfully' });
        return;
    } catch (error) {
        console.error('Failed to connect Instagram:', error);
        res.status(500).json({ error: 'Failed to connect Instagram' });
        return;
    }
};

export const refreshSocials = async (req: Request, res: Response) => {
    try {
        const socials = await prisma.social.findMany({ where: { userId: req.user.id }, include: { socialAccessToken: true } });
        for (const social of socials) {
            if (social.type === 'INSTAGRAM') {
                const accessToken = social.socialAccessToken.find(accessToken => accessToken.socialId === social.id);
                if (!accessToken) {
                    continue;
                }
                const account = await getInstagramBusinessAccount(accessToken.accessToken);
                if (!account) {
                    continue;
                }
                await prisma.social.update({ where: { id: social.id }, data: { active: true, username: account.username } });
            }
            if (social.type === 'LENS') {
                const handle = await getLensHandle(social.accountId.split(':')[1]);
                if (!handle) {
                    continue;
                }
                await prisma.social.update({ where: { id: social.id }, data: { active: true, username: handle } });
            }
        }
        res.status(200).json({ message: 'Socials refreshed successfully' });
        return;
    } catch (error) {
        console.error('Failed to refresh socials:', error);
        res.status(500).json({ error: 'Failed to refresh socials' });
        return;
    }
};

export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const activeTokens = await prisma.token.findMany({
            where: {
                userId: req.user.id,
                OR: [
                    { address: { not: null } },
                    { endTime: { gt: new Date() }, failed: false }
                ]
            }
        });
        if (activeTokens.length > 0) {
            res.status(400).json({ error: 'User has active tokens' });
            return;
        }
        
        // Delete all relationships
        const socials = await prisma.social.findMany({ where: { userId: req.user.id } });
        for (const social of socials) {
            await prisma.socialAccessToken.deleteMany({ where: { socialId: social.id } });
        }
        await prisma.social.deleteMany({ where: { userId: req.user.id } });
        await prisma.session.deleteMany({ where: { userId: req.user.id } });
        await prisma.nonce.deleteMany({ where: { userId: req.user.id } });
        
        await prisma.user.delete({ where: { id: req.user.id } });
        res.status(200).clearCookie('token', {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none'
        }).json({ message: 'Account deleted successfully' });
        return;
    } catch (error) {
        console.error('Failed to delete account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
        return;
    }
};