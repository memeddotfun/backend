# CrossMind Backend

Backend for CrossMind - Autonomous Web3 Investment Agent using TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

- AI-powered autonomous DeFi agent
- Cross-chain execution via Chainlink CCIP
- Yield optimization across multiple protocols
- Continuous monitoring and rebalancing
- Transparent decision logging

## 📋 Tech Stack

- **TypeScript**: Type-safe JavaScript
- **Prisma**: Type-safe ORM for database operations
- **PostgreSQL**: Relational database for data storage
- **Express**: Web framework for API endpoints
- **Chainlink**: For secure cross-chain execution, automation, and data feeds
- **AWS Bedrock**: For AI agent reasoning and planning

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- AWS Account (for Bedrock)

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on `.env.example` and fill in your credentials:

```
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/crossmind?schema=public"

# JWT Secret for authentication
JWT_SECRET="your-jwt-secret"

# AWS Bedrock API credentials
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"

# Chainlink node URLs
CHAINLINK_NODE_URL="your-chainlink-node-url"

# RPC URLs for different chains
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/your-api-key"
AVALANCHE_RPC_URL="https://api.avax.network/ext/bc/C/rpc"
BASE_RPC_URL="https://mainnet.base.org"
ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
POLYGON_RPC_URL="https://polygon-rpc.com"
OPTIMISM_RPC_URL="https://mainnet.optimism.io"

# Server configuration
PORT=3001
NODE_ENV="development"
```

5. Set up the database:

```bash
npx prisma migrate dev
```

6. Generate Prisma client:

```bash
npx prisma generate
```

7. Start the development server:

```bash
npm run dev
```

## 📚 API Documentation

### User Endpoints

- `POST /api/users`: Register a new user
- `GET /api/users/profile`: Get user profile
- `PUT /api/users/profile`: Update user profile
- `GET /api/users/portfolio`: Get user portfolio summary

### Strategy Endpoints

- `POST /api/strategies`: Create a new strategy
- `GET /api/strategies`: Get all strategies for a user
- `GET /api/strategies/:id`: Get a strategy by ID
- `PUT /api/strategies/:id`: Update a strategy
- `DELETE /api/strategies/:id`: Delete a strategy
- `POST /api/strategies/generate`: Generate a strategy using AI agent

### Agent Endpoints

- `POST /api/agent/execute/:decisionId`: Execute agent decision
- `POST /api/agent/rebalance/:strategyId`: Generate a rebalancing recommendation
- `POST /api/agent/automate/:strategyId`: Set up Chainlink Automation for a strategy
- `GET /api/agent/decisions/:strategyId`: Get agent decisions for a strategy

### Transaction Endpoints

- `POST /api/transactions`: Record a transaction
- `GET /api/transactions`: Get all transactions for a user
- `POST /api/transactions/deposit`: Create a deposit
- `POST /api/transactions/withdrawal`: Create a withdrawal
- `GET /api/transactions/deposits`: Get all deposits for a user
- `GET /api/transactions/withdrawals`: Get all withdrawals for a user
- `PUT /api/transactions/:id/status`: Update transaction status

### Market Data Endpoints

- `POST /api/market-data`: Fetch and store market data
- `GET /api/market-data/latest`: Get latest market data
- `GET /api/market-data/history`: Get market data history for a specific protocol
- `GET /api/market-data/price-feed/:feedId`: Get Chainlink price feed data
- `GET /api/market-data/compare`: Compare APYs across different protocols

## 📝 Development

### Database Schema

The database schema includes the following models:

- User
- Strategy
- Allocation
- AgentDecision
- Transaction
- Deposit
- Withdrawal
- MarketData

### Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server
- `npm run build`: Build the TypeScript code
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Open Prisma Studio to view database

## 🔐 Security

- Wallet signature verification for authentication
- Protected routes for authenticated users
- Environment variables for sensitive information
