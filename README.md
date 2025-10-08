# Memed Backend

Backend for Memed.fun - A Lens Protocol-powered meme token platform with fair launches, NFT battles, and engagement-based rewards.

## 🚀 Features

- **Fair Launch System** - Bonding curve-based token creation with automated deployment
- **Lens Protocol Integration** - Social engagement metrics and follower verification
- **Wallet Authentication** - Secure signature-based authentication with session management
- **Media Management** - IPFS (Pinata) and AWS S3 integration for token images
- **Queue System** - Asynchronous token deployment processing with BullMQ
- **Heat Score Tracking** - Automated cron jobs for engagement-based heat scoring
- **Battle Resolution** - Scheduled battle outcome processing
- **Social Connectivity** - Multi-platform social account linking (Lens, X, Farcaster, etc.)

## 📋 Tech Stack

- **TypeScript** - Type-safe JavaScript for robust backend development
- **Express.js** - Web framework for RESTful API endpoints
- **Prisma** - Type-safe ORM for PostgreSQL database operations
- **PostgreSQL** - Relational database for data persistence
- **Redis** - In-memory data store for caching and queue management
- **BullMQ** - Advanced queue system for background job processing
- **Ethers.js** - Ethereum wallet and contract interaction library
- **Lens Protocol SDK** - Social graph and engagement data integration
- **AWS S3** - Object storage for media files
- **Pinata** - IPFS pinning service for decentralized storage
- **JWT** - JSON Web Tokens for secure authentication
- **Zod** - TypeScript-first schema validation

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Redis (v6+)
- AWS Account (for S3)
- Pinata Account (for IPFS)
- Alchemy/Infura API Key (for blockchain RPC)

### Installation

1. Clone the repository and navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
yarn install
# or
npm install
```

3. Create a `.env` file based on the configuration below:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/memed?schema=public"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Server
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# JWT Secret
JWT_SECRET="your-secure-jwt-secret-here"

# Blockchain Configuration
BLOCKCHAIN_RPC_URL="https://base-sepolia.g.alchemy.com/v2/your-api-key"
BLOCKCHAIN_CHAIN_ID=84532
PRIVATE_KEY="your-wallet-private-key"

# Smart Contract Addresses
FACTORY_ADDRESS="0x..."
TOKEN_SALE_ADDRESS="0x..."
WARRIOR_NFT_ADDRESS="0x..."
BATTLE_ADDRESS="0x..."
BATTLE_RESOLVER_ADDRESS="0x..."
ENGAGE_TO_EARN_ADDRESS="0x..."

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="memed-media"

# IPFS/Pinata
PINATA_JWT="your-pinata-jwt-token"
PINATA_GATEWAY_URL="https://gateway.pinata.cloud/ipfs/"

# Lens Protocol
LENS_API_ENDPOINT="https://api-v2.lens.dev"

# Google Cloud (for BigQuery analytics - optional)
GOOGLE_APPLICATION_CREDENTIALS="path/to/gcloud.json"
```

4. Set up the database:

```bash
# Generate Prisma Client
yarn db:generate

# Run database migrations
yarn db:migrate
```

5. Start Redis (if not already running):

```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo systemctl start redis

# Using Docker
docker run -d -p 6379:6379 redis:latest
```

6. Start the development server:

```bash
yarn dev
```

The server will be running on `http://localhost:3001`.

## 📚 API Documentation

All API endpoints are prefixed with `/api`. Authentication is handled via HTTP-only cookies containing JWT tokens.

### Health Check

#### `GET /api/health`

Check if the server is running.

**Request:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "message": "Server is running",
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

### Authentication Endpoints

#### `POST /api/create-nonce`

Generate a unique nonce for wallet signature verification. This is the first step in the authentication flow.

**Request:**
```bash
curl -X POST http://localhost:3001/api/create-nonce \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "nonce": "a3f5e8d9c2b1a4f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0"
}
```

**Error Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "message": "Invalid ethereum address",
      "path": ["address"]
    }
  ]
}
```

---

#### `POST /api/connect-wallet`

Authenticate user by verifying wallet signature. Creates a session and returns JWT in HTTP-only cookie.

**Request:**
```bash
curl -X POST http://localhost:3001/api/connect-wallet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x1234567890abcdef...",
    "message": "a3f5e8d9c2b1a4f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0"
  }'
```

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x1234567890abcdef...",
  "message": "a3f5e8d9c2b1a4f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0"
}
```

**Response:**
```json
{
  "message": "Authentication successful"
}
```

**Notes:**
- Sets `token` cookie with JWT (HTTP-only, Secure, SameSite=None)
- Cookie expires in 1 hour (3600000 ms)
- The `message` field must match the nonce received from `/create-nonce`

**Error Response (400 - Invalid Signature):**
```json
{
  "error": "Invalid signature"
}
```

**Error Response (400 - Invalid Nonce):**
```json
{
  "error": "Invalid nonce"
}
```

---

#### `POST /api/disconnect-wallet`

Invalidate the current user session and clear authentication cookie.

**Authentication:** Required

**Request:**
```bash
curl -X POST http://localhost:3001/api/disconnect-wallet \
  --cookie "token=your-jwt-token"
```

**Response:**
```json
{
  "message": "Wallet disconnected successfully"
}
```

---

### User Endpoints

#### `GET /api/user`

Get the authenticated user's profile with connected social accounts and created tokens.

**Authentication:** Required

**Request:**
```bash
curl http://localhost:3001/api/user \
  --cookie "token=your-jwt-token"
```

**Response:**
```json
{
  "user": {
    "id": "clx1234567890",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "role": "USER",
    "socials": [
      {
        "id": "clx0987654321",
        "type": "LENS",
        "username": "stani",
        "accountId": "0x01",
        "createdAt": "2025-10-01T10:00:00.000Z"
      }
    ],
    "token": [
      {
        "id": "clx1111111111",
        "fairLaunchId": "1",
        "address": "0xabc123...",
        "image": {
          "id": "clx2222222222",
          "ipfsCid": "QmX...",
          "s3Key": "https://memed-media.s3.amazonaws.com/...",
          "createdAt": "2025-10-01T11:00:00.000Z"
        },
        "createdAt": "2025-10-01T11:00:00.000Z"
      }
    ],
    "lastLogin": "2025-10-08T12:00:00.000Z",
    "createdAt": "2025-10-01T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "User not found"
}
```

---

#### `POST /api/connect-social`

Connect a social media account to the authenticated user's profile.

**Authentication:** Required

**Request:**
```bash
curl -X POST http://localhost:3001/api/connect-social \
  --cookie "token=your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LENS",
    "username": "stani"
  }'
```

**Request Body:**
```json
{
  "type": "LENS",
  "username": "stani"
}
```

**Supported Social Types:**
- `LENS`
- `X` (Twitter)
- `FACEBOOK`
- `INSTAGRAM`
- `FARCASTER`
- `TIKTOK`
- `YOUTUBE`

**Response:**
```json
{
  "message": "Social connected successfully"
}
```

**Error Response (400 - Social Not Found):**
```json
{
  "error": "Social account not found"
}
```

**Error Response (400 - Already Connected):**
```json
{
  "error": "Social already connected"
}
```

---

### Token Endpoints

#### `POST /api/create-token`

Create a new meme token with fair launch. Requires Lens account with minimum followers.

**Authentication:** Required

**Request:**
```bash
curl -X POST http://localhost:3001/api/create-token \
  --cookie "token=your-jwt-token" \
  -F 'data={"name":"Pepe Coin","ticker":"PEPE","description":"The ultimate meme coin"}' \
  -F 'image=@/path/to/pepe.png'
```

**Form Data:**
- `data` (JSON string):
  ```json
  {
    "name": "Pepe Coin",
    "ticker": "PEPE",
    "description": "The ultimate meme coin"
  }
  ```
- `image` (File): Image file (JPEG, PNG, GIF)

**Response:**
```json
{
  "message": "Fair launch created successfully",
  "fairLaunchId": "42"
}
```

**Requirements:**
- User must have connected Lens account
- Lens account must have minimum followers (configurable)
- User can only create one token
- Image must be a valid image file

**Error Response (404 - No Lens Account):**
```json
{
  "error": "User must have a LENS account"
}
```

**Error Response (400 - Insufficient Followers):**
```json
{
  "error": "User must have at least 8000 followers"
}
```

**Error Response (400 - Token Already Exists):**
```json
{
  "error": "Token already exists"
}
```

**Error Response (400 - Invalid Image):**
```json
{
  "error": "Image is required and must be an image"
}
```

---

#### `POST /api/create-unclaimed-tokens`

Create a token on behalf of another user (admin only). Used for pre-creating tokens for influencers.

**Authentication:** Required (Admin role)

**Request:**
```bash
curl -X POST http://localhost:3001/api/create-unclaimed-tokens \
  --cookie "token=your-admin-jwt-token" \
  -F 'data={"name":"Influencer Token","ticker":"INFL","description":"Token for influencer","address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}' \
  -F 'image=@/path/to/token.png'
```

**Form Data:**
- `data` (JSON string):
  ```json
  {
    "name": "Influencer Token",
    "ticker": "INFL",
    "description": "Token for influencer",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
  ```
- `image` (File): Image file

**Response:**
```json
{
  "message": "Unclaimed tokens created successfully",
  "fairLaunchId": "43"
}
```

**Error Response (400 - Not Admin):**
```json
{
  "error": "User must be an admin"
}
```

---

#### `POST /api/claim-unclaimed-token`

Claim ownership of an unclaimed token created for your address.

**Authentication:** Required

**Request:**
```bash
curl -X POST http://localhost:3001/api/claim-unclaimed-token \
  --cookie "token=your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "clx1111111111"
  }'
```

**Request Body:**
```json
{
  "id": "clx1111111111"
}
```

**Response:**
```json
{
  "message": "Unclaimed tokens claimed successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Token not found"
}
```

**Error Response (400 - Wrong User):**
```json
{
  "error": "User must be the creator of the token"
}
```

---

#### `GET /api/token/:id`

Get detailed information about a specific token by ID.

**Request:**
```bash
curl http://localhost:3001/api/token/clx1111111111
```

**Response:**
```json
{
  "token": {
    "id": "clx1111111111",
    "fairLaunchId": "42",
    "address": "0xabc123def456...",
    "userId": "clx1234567890",
    "imageId": "clx2222222222",
    "image": {
      "id": "clx2222222222",
      "ipfsCid": "QmX1234567890abcdef",
      "s3Key": "https://memed-media.s3.amazonaws.com/token-images/...",
      "createdAt": "2025-10-01T11:00:00.000Z",
      "updatedAt": "2025-10-01T11:00:00.000Z"
    },
    "createdAt": "2025-10-01T11:00:00.000Z",
    "updatedAt": "2025-10-01T11:00:00.000Z"
  }
}
```

**Notes:**
- The `s3Key` field contains a presigned URL valid for 1 hour
- `address` will be `null` until fair launch completes

**Error Response (404):**
```json
{
  "error": "Token not found"
}
```

---

#### `GET /api/tokens`

Get all tokens on the platform.

**Request:**
```bash
curl http://localhost:3001/api/tokens
```

**Response:**
```json
{
  "tokens": [
    {
      "id": "clx1111111111",
      "fairLaunchId": "42",
      "address": "0xabc123def456...",
      "userId": "clx1234567890",
      "imageId": "clx2222222222",
      "image": {
        "id": "clx2222222222",
        "ipfsCid": "QmX1234567890abcdef",
        "s3Key": "https://memed-media.s3.amazonaws.com/...",
        "createdAt": "2025-10-01T11:00:00.000Z",
        "updatedAt": "2025-10-01T11:00:00.000Z"
      },
      "createdAt": "2025-10-01T11:00:00.000Z",
      "updatedAt": "2025-10-01T11:00:00.000Z"
    }
  ]
}
```

**Notes:**
- Returns all tokens with presigned S3 URLs
- No pagination implemented yet

---

### Lens Integration Endpoints

#### `GET /api/lens-engagement/:handle`

Get engagement metrics for a Lens Protocol handle over the last 24 hours.

**Request:**
```bash
curl http://localhost:3001/api/lens-engagement/stani
```

**Response:**
```json
{
  "engagement": {
    "posts": 5,
    "comments": 12,
    "mirrors": 8,
    "reactions": 156,
    "totalEngagement": 181,
    "period": "24h"
  }
}
```

**Notes:**
- Handle should include the namespace (e.g., `lens/username`)
- Metrics are calculated from the last 24 hours

**Error Response (500):**
```json
{
  "error": "Failed to get lens engagement"
}
```

---

### Queue Management Endpoints

#### `POST /api/complete-token`

Internal webhook endpoint called when a fair launch completes on the blockchain. Adds token deployment to processing queue.

**Request:**
```bash
curl -X POST http://localhost:3001/api/complete-token \
  -H "Content-Type: application/json" \
  -d '{
    "result": [
      {
        "id": "42",
        "lpSupply": "250000000000000000000000000"
      }
    ]
  }'
```

**Request Body:**
```json
{
  "result": [
    {
      "id": "42",
      "lpSupply": "250000000000000000000000000"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Fair launch completed webhook processed successfully",
  "jobId": "job-uuid-1234",
  "fairLaunchId": "42"
}
```

**Notes:**
- This endpoint is typically called by blockchain monitoring services
- The job is processed asynchronously by BullMQ workers
- Use `/job-status/:jobId` to check processing status

**Error Response (400 - Invalid Data):**
```json
{
  "error": "Invalid webhook data",
  "details": [...]
}
```

---

#### `GET /api/job-status/:jobId`

Get the status and details of a background job.

**Request:**
```bash
curl http://localhost:3001/api/job-status/job-uuid-1234
```

**Response:**
```json
{
  "id": "job-uuid-1234",
  "state": "completed",
  "progress": 100,
  "data": {
    "fairLaunchId": "42",
    "lpSupply": "250000000000000000000000000"
  },
  "createdAt": 1728393600000,
  "processedAt": 1728393610000,
  "finishedAt": 1728393615000,
  "failedReason": null,
  "returnValue": {
    "success": true,
    "tokenAddress": "0xabc123..."
  }
}
```

**Job States:**
- `waiting` - Job is in queue
- `active` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed with error
- `delayed` - Job is delayed

**Error Response (404):**
```json
{
  "error": "Job not found"
}
```

---

#### `GET /api/queue-stats`

Get statistics and overview of the token deployment queue.

**Request:**
```bash
curl http://localhost:3001/api/queue-stats
```

**Response:**
```json
{
  "waiting": 2,
  "active": 1,
  "completed": 15,
  "failed": 0,
  "jobs": {
    "waiting": [
      {
        "id": "job-uuid-5678",
        "data": {
          "fairLaunchId": "44",
          "lpSupply": "250000000000000000000000000"
        }
      }
    ],
    "active": [
      {
        "id": "job-uuid-1234",
        "data": {
          "fairLaunchId": "43",
          "lpSupply": "250000000000000000000000000"
        },
        "progress": 50
      }
    ],
    "completed": [
      {
        "id": "job-uuid-0001",
        "data": {
          "fairLaunchId": "42",
          "lpSupply": "250000000000000000000000000"
        },
        "returnValue": {
          "success": true,
          "tokenAddress": "0xabc123..."
        }
      }
    ],
    "failed": []
  }
}
```

**Notes:**
- Shows up to 10 most recent completed jobs
- Shows up to 10 most recent failed jobs
- Shows all waiting and active jobs

## 🔧 Development

### Database Schema

The database includes the following models:

- **User** - Wallet addresses and user profiles
- **Social** - Connected social accounts (Lens, X, Farcaster, etc.)
- **Token** - Meme tokens created on the platform
- **Image** - Media files stored on S3 and IPFS
- **Session** - Active user sessions for authentication
- **Nonce** - One-time values for wallet signature verification
- **Config** - Application configuration key-value pairs

### Project Structure

```
backend/
├── src/
│   ├── clients/          # External service clients
│   │   ├── prisma.ts     # Database client
│   │   ├── redis.ts      # Redis client
│   │   ├── s3.ts         # AWS S3 client
│   │   └── pinata.ts     # IPFS/Pinata client
│   ├── config/           # Configuration files
│   │   ├── factory.ts    # Smart contract factory config
│   │   ├── lens.ts       # Lens Protocol config
│   │   ├── redis.ts      # Redis configuration
│   │   └── *.json        # Contract ABIs
│   ├── controllers/      # Request handlers
│   │   └── controller.ts # Main API controllers
│   ├── cron/             # Scheduled jobs
│   │   ├── heatUpdate.ts      # Heat score updates
│   │   └── battleResolve.ts   # Battle resolution
│   ├── functions/        # Utility functions
│   │   ├── mails.ts      # Email templates
│   │   └── sendemail.ts  # Email sending logic
│   ├── middleware/       # Express middleware
│   │   ├── session.ts    # Session authentication
│   │   └── nonce.ts      # Nonce validation
│   ├── queues/           # Background job queues
│   │   └── tokenDeployment.ts  # Token deployment queue
│   ├── routes/           # API route definitions
│   │   └── index.ts      # Route configuration
│   ├── services/         # Business logic
│   │   ├── blockchain.ts # Smart contract interactions
│   │   ├── lens.ts       # Lens Protocol integration
│   │   └── media.ts      # Media upload/storage
│   ├── types/            # TypeScript types and schemas
│   │   ├── express.d.ts  # Express type extensions
│   │   └── zod.ts        # Zod validation schemas
│   └── index.ts          # Application entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── docker-compose.yaml   # Docker services configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

### Scripts

```bash
# Development
yarn dev              # Start development server with hot reload
yarn build            # Compile TypeScript to JavaScript
yarn start            # Start production server

# Database
yarn db:generate      # Generate Prisma Client
yarn db:migrate       # Run database migrations
yarn db:studio        # Open Prisma Studio GUI

# Testing
yarn test             # Run tests (if configured)
```

## 🔐 Security

### Authentication Flow

1. Client requests nonce from `/api/create-nonce` with wallet address
2. Client signs the nonce with their wallet
3. Client sends address, signature, and nonce to `/api/connect-wallet`
4. Server verifies signature and creates session
5. Server returns JWT in HTTP-only cookie
6. Client includes cookie in subsequent authenticated requests

### Protected Routes

All routes requiring authentication use the `sessionMiddleware`:
- Token creation endpoints
- User profile endpoints
- Social connection endpoints
- Token claiming endpoints

### Additional Security Measures

- HTTP-only cookies prevent XSS attacks
- Secure cookies in production (HTTPS only)
- SameSite cookie attribute prevents CSRF
- Signature verification prevents impersonation
- One-time nonces prevent replay attacks
- Environment variables for sensitive credentials
- Rate limiting (recommended to add)

## 🔄 Background Jobs

### Token Deployment Queue

Handles asynchronous token deployment after fair launch completion:

1. Fair launch completes on blockchain
2. Webhook triggers job addition to queue
3. Worker processes token deployment:
   - Fetches token data from blockchain
   - Creates Uniswap V2 liquidity pool
   - Updates database with token address
   - Uploads metadata to IPFS

### Cron Jobs

- **Heat Update** - Runs periodically to update engagement-based heat scores
- **Battle Resolution** - Resolves completed battles and distributes rewards

## 🐳 Docker Setup

The project includes Docker configuration for local development:

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d

# Stop services
docker-compose down
```

## 📊 Monitoring and Debugging

### Queue Management

Monitor queue health and job status:

```bash
# Get queue statistics
curl http://localhost:3001/api/queue-stats

# Check specific job status
curl http://localhost:3001/api/job-status/{jobId}
```

### Database Inspection

Use Prisma Studio for visual database management:

```bash
yarn db:studio
```

Access at `http://localhost:5555`

### Logs

The application uses Morgan for HTTP request logging in development mode. Monitor console output for:
- API requests and responses
- Cron job execution
- Queue job processing
- Blockchain interactions
- Error messages

## 🌐 Deployment

### Environment Variables (Production)

Ensure all environment variables are properly set:
- Use strong, randomly generated `JWT_SECRET`
- Set `NODE_ENV=production`
- Use production RPC URLs (Base Mainnet)
- Configure production database and Redis instances
- Set `FRONTEND_URL` to production domain
- Enable HTTPS for secure cookies

### Production Checklist

- [ ] Set up production PostgreSQL database
- [ ] Configure Redis instance (managed service recommended)
- [ ] Deploy smart contracts to Base Mainnet
- [ ] Update contract addresses in environment
- [ ] Set up AWS S3 bucket with proper CORS
- [ ] Configure Pinata for production IPFS
- [ ] Set up monitoring and error tracking
- [ ] Configure log aggregation
- [ ] Set up automated database backups
- [ ] Enable SSL/TLS certificates
- [ ] Configure rate limiting and DDoS protection
- [ ] Set up health check monitoring
- [ ] Configure auto-scaling (if applicable)

### Deployment Platforms

Compatible with:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform
- AWS EC2/ECS
- Google Cloud Run
- Azure App Service
- Heroku

## 🤝 Integration with Smart Contracts

The backend interacts with the following smart contracts on Base:

1. **MemedFactory** - Creates fair launches and manages tokens
2. **MemedTokenSale** - Handles token bonding curve sales
3. **MemedWarriorNFT** - Manages Warrior NFT minting
4. **MemedBattle** - Coordinates token battles
5. **MemedBattleResolver** - Resolves battle outcomes
6. **MemedEngageToEarn** - Distributes engagement rewards

See the `/contracts` directory for smart contract documentation.

## 📝 License

This project is licensed under the ISC License.

## 🛟 Support

For questions and support:
- Open an issue in the GitHub repository
- Check existing documentation in `/contracts` and `/frontend`
- Review API endpoints in this README

---

Built with ❤️ for the Memed.fun platform
