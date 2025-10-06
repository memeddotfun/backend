import express from 'express';
import 'dotenv/config';
import routes from './routes';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { startHeatUpdateCron } from './cron/heatUpdate';
import './queues/tokenDeployment';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: [process.env.FRONTEND_URL!, 'http://localhost:5173'], credentials: true}));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start cron jobs
  startHeatUpdateCron();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
