import { Router } from 'express';
import multer from 'multer';
import { createToken } from '../controllers/controller';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create-token', upload.single('image'), createToken);

export default router;