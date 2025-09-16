import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../clients/prisma';

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (!decoded || typeof decoded === 'string' || !decoded.sessionId) {
        res.status(401).clearCookie('token').json({ error: 'Unauthorized' });
        return;
    }
    const session = await prisma.session.findUnique({ where: { session: decoded.sessionId as string }, include: { user: true } });
    if (!session) {
        res.status(401).clearCookie('token').json({ error: 'Unauthorized' });
        return;
    }
    req.user = session.user;
    next();
};