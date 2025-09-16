import { Router } from 'express';
import multer from 'multer';
import { connectWallet, createToken, createNonce, fairLaunchCompletedWebhook, getJobStatus, getQueueStats, getToken, getAllTokens, disconnectWallet, getUser, getLensEngagement } from '../controllers/controller';
import { nonceMiddleware } from '../middleware/nonce';
import { sessionMiddleware } from '../middleware/session';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

router.post('/create-token', sessionMiddleware, nonceMiddleware, upload.single('image'), createToken);
router.post('/create-nonce', createNonce);
router.post('/connect-wallet', connectWallet);
router.post('/disconnect-wallet', disconnectWallet);
router.get('/user', sessionMiddleware, getUser);
router.get('/token/:id', getToken);
router.get('/tokens', getAllTokens);
router.post('/webhook/fair-launch/completed', fairLaunchCompletedWebhook);
router.get('/lens-engagement/:handle', getLensEngagement);

// Job monitoring routes
router.get('/jobs/:jobId', getJobStatus);
router.get('/queue/stats', getQueueStats);


export default router;