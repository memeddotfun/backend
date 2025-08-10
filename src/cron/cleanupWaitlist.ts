import cron from 'node-cron';
import prisma from '../clients/prisma';
import { subHours } from 'date-fns';

/**
 * Cron job to delete unverified waitlist entries after 1 hour
 * Runs every 5 minutes
 */
export const setupWaitlistCleanupCron = () => {
  console.log('Setting up waitlist cleanup cron job');
  
  // Schedule the job to run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Running waitlist cleanup job');
      
      // Calculate the cutoff time (1 hour ago)
      const cutoffTime = subHours(new Date(), 1);
      
      // Find all pending waitlist entries older than 1 hour
      const oldPendingWaitlists = await prisma.waitlist.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffTime
          }
        },
        include: {
          tokens: true
        }
      });
      
      console.log(`Found ${oldPendingWaitlists.length} expired waitlist entries`);
      
      // Delete the associated tokens and waitlist entries
      for (const waitlist of oldPendingWaitlists) {
        // Delete associated tokens first (due to foreign key constraints)
        await prisma.token.deleteMany({
          where: {
            waitlistId: waitlist.id
          }
        });
        
        // Then delete the waitlist entry
        await prisma.waitlist.delete({
          where: {
            id: waitlist.id
          }
        });
      }
      
      console.log(`Deleted ${oldPendingWaitlists.length} expired waitlist entries`);
    } catch (error) {
      console.error('Error in waitlist cleanup job:', error);
    }
  });
};
