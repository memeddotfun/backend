import { User, Social } from '../generated/prisma';

declare global {
  namespace Express {
    interface Request {
      user: User & { socials: Social[] };
      }
  }
}