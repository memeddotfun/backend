import { Router } from 'express';
import multer from 'multer';
import { connectWallet, createToken, createNonce, fairLaunchToBeCompletedWebhook, fairLaunchCompletedWebhook } from '../controllers/controller';
import { nonceMiddleware } from '../middleware/nonce';
import { sessionMiddleware } from '../middleware/session';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create-token', sessionMiddleware, nonceMiddleware, upload.single('image'), createToken);
router.post('/create-nonce', createNonce);
router.post('/connect-wallet', connectWallet);
router.post('/webhook/fair-launch/to-be-completed', fairLaunchToBeCompletedWebhook);
router.post('/webhook/fair-launch/completed', fairLaunchCompletedWebhook);

export default router;