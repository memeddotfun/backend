import { Router } from 'express';
import multer from 'multer';
import { connectWallet, createToken, createNonce, getToken, getAllTokens, disconnectWallet, getUser, getLensEngagement, claimUnclaimedToken, createUnclaimedTokens, connectSocial, getTokenByAddress, getTokenBySocial, getLeaderboard, getInstagramAuthUrl, connectInstagramAuth, refreshSocials } from '../controllers/controller';
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
router.post('/connect-social', sessionMiddleware, connectSocial);
router.post('/connect-instagram-auth', connectInstagramAuth);
router.get('/token/:id', getToken);
router.get('/token-by-address/:address', getTokenByAddress);
router.get('/token-by-social', getTokenBySocial);
router.post('/refresh-socials', sessionMiddleware, refreshSocials);
router.get('/tokens', getAllTokens);
router.get('/leaderboard', getLeaderboard);
router.get('/lens-engagement/:handle', getLensEngagement);
router.get('/get-instagram-auth-url', getInstagramAuthUrl);


export default router;