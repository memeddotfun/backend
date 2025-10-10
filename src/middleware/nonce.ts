import { Request, Response, NextFunction } from 'express';
import { verifyMessage } from 'ethers';
import prisma from '../clients/prisma';

export const nonceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['nonce']) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { message, signature } = JSON.parse(req.headers['nonce'] as string);
  if (!message || !signature) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const nonce = prisma.nonce.findUnique({ where: { nonce: message as string } });
  if (!nonce) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const recoveredAddress = verifyMessage(message as string, signature as string);
  if (recoveredAddress !== req.user.address) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
