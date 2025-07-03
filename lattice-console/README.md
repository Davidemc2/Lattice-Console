# Lattice Console - Decentralized Cloud Platform MVP 0.1

A revolutionary decentralized cloud platform that enables users to deploy and manage cloud services (PostgreSQL, S3-compatible storage, custom workloads) on their own infrastructure.

## 🚀 Features

- **One-click Deployment**: Deploy PostgreSQL, MinIO (S3), and custom containers
- **Remote Access**: Automatic tunneling via ngrok/localtunnel
- **Secure by Default**: JWT auth, encrypted credentials, HTTPS
- **Real-time Monitoring**: Live status, logs, and metrics
- **Type-safe API**: End-to-end TypeScript with tRPC
- **Production Ready**: Comprehensive error handling and testing

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│  tRPC Backend   │────▶│  Docker Agent   │
│   (Frontend)    │     │   (API Server)   │     │  (Local Host)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────┐          ┌─────────────────┐
                        │  Neon DB    │          │ Docker Containers│
                        │  (Prisma)   │          │ (PG, MinIO, etc)│
                        └─────────────┘          └─────────────────┘
```

## 📦 Monorepo Structure

```
/lattice-console
  /apps
    /frontend         # Next.js application
    /backend          # Node.js/tRPC API server
    /agent            # Docker management agent
  /packages
    /trpc             # Shared tRPC types and routers
    /ui               # Shared React components
    /utils            # Shared utilities
  /infra
    /docker           # Dockerfiles and compose files
    /scripts          # Development and deployment scripts
  /tests
    /e2e              # Playwright E2E tests
    /integration      # API and agent integration tests
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm 8+
- Docker and Docker Compose
- PostgreSQL (for Neon connection)
- ngrok account (for tunneling)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/lattice-console.git
cd lattice-console
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Neon DB URL and other configs
```

4. Start development servers:
```bash
pnpm dev
```

This will start:
- Frontend at http://localhost:3000
- Backend API at http://localhost:3001
- Agent at http://localhost:3002

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch
```

## 🚢 Deployment

### Production Build

```bash
# Build all packages
pnpm build

# Start production servers
pnpm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing
- Encrypted credential storage
- CORS protection
- Input validation with Zod
- Rate limiting on auth endpoints

## 🛠️ Configuration

### Environment Variables

See `.env.example` for all available configuration options:

- `DATABASE_URL`: Neon PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `NGROK_AUTH_TOKEN`: ngrok authentication token
- `AGENT_SECRET`: Shared secret for agent communication

## 📝 API Documentation

The tRPC API is self-documenting. Visit `/api/panel` in development for the tRPC panel.

### Main API Endpoints

- `auth.register`: User registration
- `auth.login`: User login
- `workload.deploy`: Deploy a new workload
- `workload.list`: List user's workloads
- `workload.stop`: Stop a workload
- `workload.logs`: Get workload logs

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🚀 Mission

Building the foundation for a new kind of cloud - decentralized, secure, and user-controlled.

---

**"First Principles. Zero Tolerance for Failure. Ship Fast. Learn Faster."**