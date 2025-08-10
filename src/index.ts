import express from 'express';
import 'dotenv/config';
import { 
  waitlistRoutes 
} from './routes/';
import { setupWaitlistCleanupCron } from './cron/cleanupWaitlist';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({origin: [process.env.FRONTEND_URL!, 'http://localhost:3000'], credentials: true}));
app.use(morgan('dev'));

// Routes
app.use('/api/waitlist', waitlistRoutes);

// Setup cron jobs
setupWaitlistCleanupCron();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
