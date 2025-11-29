import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../clients/prisma';

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (!decoded || typeof decoded === 'string' || !decoded.sessionId) {
        res.status(401).clearCookie('token', {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none'
        }).json({ error: 'Unauthorized' });
        return;
    }
    const session = await prisma.session.findUnique({ where: { session: decoded.sessionId as string }, include: { user: { include: { socials: true } } } });
    if (!session) {
        res.status(401).clearCookie('token', {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none'
        }).json({ error: 'Unauthorized' });
        return;
    }
    req.user = session.user;
    next();
    } catch (error) {
        console.error('Failed to verify session:', error);
        res.status(401).clearCookie('token', {
            httpOnly: true,
            secure: true,
            path: '/',
            sameSite: 'none'
        }).json({ error: 'Unauthorized' });
        return;
    }
};