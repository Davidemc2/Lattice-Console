# 🌟 Lattice Console - Decentralized Cloud Platform MVP 0.1

**A revolutionary approach to cloud computing - Deploy and manage containerized workloads on any machine, accessible from anywhere.**

> **Vision**: Transform any computer into a cloud provider. Deploy Postgres, MinIO, or custom applications with one click, then access them securely from anywhere in the world.

## 🚀 **Project Overview**

Lattice Console is a decentralized cloud platform that allows users to:
- 🔐 **Deploy with One Click**: Postgres databases, S3-compatible storage (MinIO), or custom Docker containers
- 🌐 **Access from Anywhere**: Automatic tunnel creation makes local services globally accessible
- 🔒 **Secure by Default**: JWT authentication, encrypted credentials, and secure tunneling
- 📊 **Full Visibility**: Real-time status monitoring, logs, and management controls
- 🎯 **Production Ready**: Type-safe APIs, comprehensive error handling, and scalable architecture

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Lattice Console MVP 0.1                  │
├─────────────────────────────────────────────────────────────┤
│ Frontend (Next.js) ←→ Backend API (tRPC) ←→ Agent (Docker)  │
│                            ↓                       ↓        │
│                    Neon Database            Local Containers │
│                                                    ↓        │
│                                              Ngrok Tunnels  │
└─────────────────────────────────────────────────────────────┘
```

### **Components:**
- **Frontend**: Modern React dashboard with real-time updates
- **Backend**: Type-safe tRPC API with JWT authentication
- **Agent**: Local Docker manager with automatic tunneling
- **Database**: Serverless Postgres via Neon with Prisma ORM

## 🛠️ **Tech Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js, TypeScript, Tailwind CSS | User interface and dashboard |
| **Backend** | Node.js, tRPC, Fastify, Prisma | API server and business logic |
| **Database** | Neon (Postgres), Prisma ORM | Data persistence and migrations |
| **Agent** | Node.js, Dockerode, Ngrok | Container management and tunneling |
| **Auth** | JWT, bcrypt | Secure authentication |
| **Deployment** | Docker, Docker Compose | Containerization and deployment |

## 📁 **Project Structure**

```
lattice-console/
├── apps/
│   ├── frontend/          # Next.js dashboard
│   ├── backend/           # tRPC API server
│   └── agent/             # Docker agent
├── packages/
│   ├── trpc/              # Shared tRPC types
│   ├── ui/                # Shared React components
│   └── utils/             # Shared utilities
├── infra/
│   ├── docker/            # Docker configurations
│   └── scripts/           # Setup and deployment scripts
├── tests/
│   ├── e2e/               # End-to-end tests
│   └── integration/       # Integration tests
└── docs/                  # Documentation
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ and pnpm
- Docker and Docker Compose
- Git

### **Setup**

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd lattice-console
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Configure database:**
   - Create a [Neon](https://neon.tech) database
   - Add the connection URL to `apps/backend/.env`
   ```bash
   # apps/backend/.env
   DATABASE_URL="postgresql://username:password@host/database"
   JWT_SECRET="your-super-secret-jwt-key"
   ```

3. **Run migrations:**
   ```bash
   cd apps/backend
   pnpm db:migrate
   ```

4. **Start all services:**
   ```bash
   # Terminal 1 - Backend
   cd apps/backend && pnpm dev

   # Terminal 2 - Agent  
   cd apps/agent && pnpm dev

   # Terminal 3 - Frontend
   cd apps/frontend && pnpm dev
   ```

### **Access Points**
- 🌐 **Frontend Dashboard**: http://localhost:3000
- 📡 **Backend API**: http://localhost:4000
- 🤖 **Agent API**: http://localhost:4001

## 💼 **User Journey**

1. **Sign Up**: Create account via the dashboard
2. **Deploy**: Choose Postgres, MinIO, or custom container
3. **Access**: Get instant public URL and credentials
4. **Manage**: Monitor, restart, or scale your workloads
5. **Connect**: Use from any application worldwide

### **Example: Deploy Postgres**
```typescript
// Via Dashboard UI
{
  name: "my-database",
  type: "postgres",
  config: {}
}

// Result
{
  status: "running",
  publicUrl: "tcp://abc123.ngrok.io:12345", 
  credentials: {
    username: "lattice_user",
    password: "secure123",
    database: "lattice_db"
  }
}
```

## 🔧 **API Reference**

### **Backend tRPC Routes**
```typescript
// Authentication
user.register({ email, password })
user.login({ email, password })
user.me()

// Workload Management
workload.list()
workload.deploy({ name, type, config })
workload.get({ id })
workload.start({ id })
workload.stop({ id })
workload.delete({ id })
workload.logs({ id, lines })
```

### **Agent API Routes**
```typescript
// Container Operations
POST /api/workloads/deploy
GET  /api/workloads
GET  /api/workloads/:id
POST /api/workloads/:id/start
POST /api/workloads/:id/stop
DELETE /api/workloads/:id
GET  /api/workloads/:id/logs
```

## 🎯 **Current Status**

### ✅ **Completed (Production Ready)**
- Complete backend API with authentication
- Full Docker container management
- Automatic tunnel creation and management
- Type-safe database operations
- Comprehensive error handling
- Security best practices

### 🚧 **In Progress**
- Frontend dashboard implementation
- Real-time status updates
- Enhanced UI/UX components

### 📅 **Roadmap**
- [ ] Complete frontend dashboard
- [ ] End-to-end testing suite
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Production deployment guides
- [ ] Multi-node support
- [ ] Resource monitoring
- [ ] Automated backups

## 🧪 **Testing**

```bash
# Unit tests
pnpm test

# Integration tests  
pnpm test:integration

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check
```

## 🔒 **Security**

- **Authentication**: JWT tokens with secure secret rotation
- **Authorization**: User-scoped resource access
- **Encryption**: Encrypted credential storage
- **Validation**: Comprehensive input validation with Zod
- **Tunneling**: Secure ngrok tunnels with HTTPS
- **Isolation**: Docker container isolation

## 📈 **Performance**

- **Database**: Connection pooling via Neon
- **API**: Type-safe tRPC with minimal overhead  
- **Frontend**: Next.js optimization and lazy loading
- **Caching**: Intelligent query caching
- **Scaling**: Horizontal scaling ready

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📚 **Documentation**

- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Architecture Overview](./docs/architecture.md)

## 📞 **Support**

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **Email**: support@lattice-console.com

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the decentralized future.**

> "Every computer is a potential cloud provider. Lattice Console makes it reality."
