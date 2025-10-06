import { Queue, Worker, Job } from 'bullmq';
import redis from '../clients/redis';
import { completeFairLaunch } from '../services/blockchain';

// Define job data interface
export interface TokenDeploymentJobData {
  fairLaunchId: string;
  retryCount?: number;
}

// Create the queue
export const tokenDeploymentQueue = new Queue('token-deployment', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,          // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,        // Start with 5 second delay
    },
  },
});

// Create the worker
export const tokenDeploymentWorker = new Worker(
  'token-deployment',
  async (job: Job<TokenDeploymentJobData>) => {
    const { fairLaunchId } = job.data;
    
    console.log(`Processing token deployment for fair launch ID: ${fairLaunchId}`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Execute the token deployment
      const tokenAddress = await completeFairLaunch(fairLaunchId);
      
      // Update job progress
      await job.updateProgress(100);
      
      console.log(`Token deployment completed successfully for fair launch ${fairLaunchId}: ${tokenAddress}`);
      
      return { 
        success: true, 
        tokenAddress,
        fairLaunchId 
      };
    } catch (error) {
      console.error(`Token deployment failed for fair launch ${fairLaunchId}:`, error);
      throw error; // This will trigger retry logic
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process up to 2 jobs concurrently
  }
);

// Worker event handlers
tokenDeploymentWorker.on('completed', (job: Job, result: any) => {
  console.log(`Job ${job.id} completed successfully:`, result);
});

tokenDeploymentWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

tokenDeploymentWorker.on('stalled', (jobId: string) => {
  console.warn(`Job ${jobId} stalled`);
});

// Add a job to the queue
export const addTokenDeploymentJob = async (fairLaunchId: string) => {
  try {
    const job = await tokenDeploymentQueue.add(
      'deploy-token',
      { fairLaunchId },
      {
        priority: 1, // Higher priority for faster processing
        delay: 0,    // No delay
      }
    );
    
    console.log(`Added token deployment job ${job.id} for fair launch ${fairLaunchId}`);
    return job;
  } catch (error) {
    console.error('Failed to add token deployment job:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down token deployment worker...');
  await tokenDeploymentWorker.close();
  await tokenDeploymentQueue.close();
  process.exit(0);
});

export default {
  queue: tokenDeploymentQueue,
  worker: tokenDeploymentWorker,
  addJob: addTokenDeploymentJob,
};