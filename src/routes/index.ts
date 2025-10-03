import { Router } from 'express';
import multer from 'multer';
import { connectWallet, createToken, createNonce, getToken, getAllTokens, disconnectWallet, getUser, getLensEngagement, claimUnclaimedToken, createUnclaimedTokens, completeToken, connectSocial } from '../controllers/controller';
import { nonceMiddleware } from '../middleware/nonce';
import { sessionMiddleware } from '../middleware/session';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

router.post('/create-token', sessionMiddleware, nonceMiddleware, upload.single('image'), createToken);
router.post('/create-unclaimed-tokens', sessionMiddleware, nonceMiddleware, upload.single('image'), createUnclaimedTokens);
router.post('/claim-unclaimed-token', sessionMiddleware, nonceMiddleware, claimUnclaimedToken);
router.post('/create-nonce', createNonce);
router.post('/connect-wallet', connectWallet);
router.post('/disconnect-wallet', disconnectWallet);
router.get('/user', sessionMiddleware, getUser);
router.post('/complete-token', completeToken);
router.post('/connect-social', sessionMiddleware, connectSocial);
router.get('/token/:id', getToken);
router.get('/tokens', getAllTokens);
router.get('/lens-engagement/:handle', getLensEngagement);


export default router;