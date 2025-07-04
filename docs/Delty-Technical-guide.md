<tool_use name="create_project_document">
  <document_name>One-Shot Implementation Guide</document_name>
  <document_content_markdown># One-Shot Implementation Guide
## Lattice Console: Complete AI-Ready Development Manual

**Version**: 1.0  
**Date**: January 2025  
**Reference**: Solo MVP Technical Specification  
**Purpose**: Comprehensive AI-ready implementation guide for 100-node MVP  

---

## 1. Reference & Overview

### 1.1 Document Relationship
This document provides **granular implementation details** for the strategic roadmap outlined in the **Solo MVP Technical Specification**. 

**Strategic Document**: Solo MVP Technical Specification  
**Implementation Document**: This guide  
**Relationship**: This guide contains the tactical "how-to-build" instructions for every component defined in the strategic specification.

### 1.2 Complete Service Stack Implementation

**Core Services to Implement**:
- ✅ **S3-Compatible Storage** (MinIO containers)
- ✅ **PostgreSQL Database** (Managed database containers)
- ✅ **Redis Caching** (Redis containers)
- ✅ **Node.js Backend Hosting** (Express, tRPC, Next.js API)
- ✅ **Python App Hosting** (Django, Flask, FastAPI)
- ✅ **Build Pipelines** (Git → Build → Deploy automation)
- ✅ **Cron Job Scheduler** (Background task scheduling)
- ✅ **Serverless Frontends** (React, Vue, static sites)
- ✅ **Docker Container Support** (Any containerized application)

---

## 2. Development Environment Setup

### 2.1 Required Tools Installation

**System Requirements**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Install Python 3.10+
sudo apt install python3.10 python3.10-venv python3-pip

# Install Git
sudo apt install git

# Install build tools
sudo apt install build-essential
```

### 2.2 Project Structure Setup

**Complete File Structure**:
```
lattice-console/
├── apps/
│   ├── backend/                 # tRPC API server
│   │   ├── src/
│   │   │   ├── index.ts        # Main server entry
│   │   │   ├── routers/        # tRPC routers
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, CORS, etc.
│   │   │   └── utils/          # Helpers
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── frontend/               # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/            # App router
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities
│   │   │   └── hooks/          # Custom hooks
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── desktop/                # Electron app
│   │   ├── src/
│   │   │   ├── main/           # Main process
│   │   │   └── renderer/       # Renderer process
│   │   ├── assets/
│   │   └── package.json
│   └── agent/                  # Node agent
│       ├── src/
│       │   ├── index.ts        # Agent entry
│       │   ├── services/       # Docker, Build, Cron
│       │   ├── lib/            # API client
│       │   └── utils/          # Helpers
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── trpc/                   # Shared tRPC types
│   │   └── src/
│   │       └── routers/
│   ├── ui/                     # Shared UI components
│   │   └── src/
│   │       └── components/
│   └── utils/                  # Shared utilities
│       └── src/
│           ├── auth.ts
│           ├── crypto.ts
│           └── validation.ts
├── docs/                       # Documentation
├── infra/                      # Infrastructure
│   ├── docker/                 # Docker configs
│   ├── terraform/              # IaC
│   └── k8s/                    # Kubernetes
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### 2.3 Environment Configuration

**Root .env File**:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/lattice_console"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
BCRYPT_ROUNDS=12

# GitHub Integration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# API Configuration
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Agent Configuration
AGENT_PORT=3002
AGENT_DOCKER_SOCKET="/var/run/docker.sock"

# Build Configuration
BUILD_TIMEOUT=600
BUILD_MEMORY_LIMIT=2048
BUILD_CPU_LIMIT=2

# Monitoring
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3003"

# Development
NODE_ENV="development"
LOG_LEVEL="debug"
```

---

## 3. Complete Database Implementation

### 3.1 Prisma Schema Definition

**Complete Schema** (`apps/backend/prisma/schema.prisma`):
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String?
  avatar       String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  
  // Relationships
  agents       Agent[]
  workloads    Workload[]
  builds       Build[]
  
  @@map("users")
}

model Agent {
  id           String    @id @default(cuid())
  userId       String    @map("user_id")
  hostname     String
  platform     String
  arch         String
  dockerVersion String   @map("docker_version")
  token        String?   @unique
  status       AgentStatus @default(OFFLINE)
  resources    Json      // CPU, memory, disk specs
  usage        Json?     // Current usage stats
  lastHeartbeat DateTime? @map("last_heartbeat")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  
  // Relationships
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workloads    Workload[]
  
  @@map("agents")
}

model Workload {
  id          String        @id @default(cuid())
  userId      String        @map("user_id")
  agentId     String        @map("agent_id")
  name        String
  type        WorkloadType
  status      WorkloadStatus @default(PENDING)
  config      Json          // Service-specific configuration
  credentials Json?         // Generated credentials
  publicUrl   String?       @map("public_url")
  internalUrl String?       @map("internal_url")
  containerId String?       @map("container_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  
  // Relationships
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent       Agent         @relation(fields: [agentId], references: [id], onDelete: Cascade)
  builds      Build[]
  cronJobs    CronJob[]
  
  @@map("workloads")
}

model Build {
  id           String      @id @default(cuid())
  userId       String      @map("user_id")
  workloadId   String      @map("workload_id")
  gitUrl       String      @map("git_url")
  gitBranch    String      @default("main") @map("git_branch")
  gitCommit    String?     @map("git_commit")
  framework    Framework
  status       BuildStatus @default(PENDING)
  logs         String?     @db.Text
  imageId      String?     @map("image_id")
  artifacts    Json?       // Build artifacts metadata
  startedAt    DateTime?   @map("started_at")
  completedAt  DateTime?   @map("completed_at")
  createdAt    DateTime    @default(now()) @map("created_at")
  
  // Relationships
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  workload     Workload    @relation(fields: [workloadId], references: [id], onDelete: Cascade)
  
  @@map("builds")
}

model CronJob {
  id          String        @id @default(cuid())
  workloadId  String        @map("workload_id")
  name        String
  schedule    String        // Cron expression
  command     String        @db.Text
  env         Json?         // Environment variables
  status      CronJobStatus @default(ACTIVE)
  lastRun     DateTime?     @map("last_run")
  nextRun     DateTime?     @map("next_run")
  lastOutput  String?       @map("last_output") @db.Text
  lastError   String?       @map("last_error") @db.Text
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  
  // Relationships
  workload    Workload      @relation(fields: [workloadId], references: [id], onDelete: Cascade)
  executions  CronExecution[]
  
  @@map("cron_jobs")
}

model CronExecution {
  id        String   @id @default(cuid())
  cronJobId String   @map("cron_job_id")
  startedAt DateTime @map("started_at")
  completedAt DateTime? @map("completed_at")
  success   Boolean?
  output    String?  @db.Text
  error     String?  @db.Text
  duration  Int?     // Duration in milliseconds
  
  // Relationships
  cronJob   CronJob  @relation(fields: [cronJobId], references: [id], onDelete: Cascade)
  
  @@map("cron_executions")
}

model ServiceDeployment {
  id           String      @id @default(cuid())
  workloadId   String      @map("workload_id")
  serviceType  ServiceType @map("service_type")
  containerId  String?     @map("container_id")
  port         Int?
  internalPort Int?        @map("internal_port")
  tunnelUrl    String?     @map("tunnel_url")
  config       Json        // Service-specific configuration
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")
  
  // Relationships
  workload     Workload    @relation(fields: [workloadId], references: [id], onDelete: Cascade)
  
  @@map("service_deployments")
}

// Enums
enum AgentStatus {
  ONLINE
  OFFLINE
  BUSY
  MAINTENANCE
}

enum WorkloadType {
  POSTGRESQL
  REDIS
  MINIO
  NODEJS
  PYTHON
  STATIC
  DOCKER
}

enum WorkloadStatus {
  PENDING
  BUILDING
  DEPLOYING
  RUNNING
  STOPPED
  ERROR
  FAILED
}

enum BuildStatus {
  PENDING
  BUILDING
  SUCCESS
  FAILED
  CANCELLED
}

enum Framework {
  NODEJS_EXPRESS
  NODEJS_NEXTJS
  NODEJS_NESTJS
  PYTHON_DJANGO
  PYTHON_FLASK
  PYTHON_FASTAPI
  STATIC_REACT
  STATIC_VUE
  STATIC_SVELTE
  DOCKER_CUSTOM
}

enum ServiceType {
  POSTGRESQL
  REDIS
  MINIO
  NODEJS
  PYTHON
  STATIC
  DOCKER
}

enum CronJobStatus {
  ACTIVE
  PAUSED
  DISABLED
}
```

### 3.2 Database Migration Setup

**Migration Script** (`apps/backend/prisma/migrations/init.sql`):
```sql
-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WorkloadType" AS ENUM ('POSTGRESQL', 'REDIS', 'MINIO', 'NODEJS', 'PYTHON', 'STATIC', 'DOCKER');

-- CreateEnum
CREATE TYPE "WorkloadStatus" AS ENUM ('PENDING', 'BUILDING', 'DEPLOYING', 'RUNNING', 'STOPPED', 'ERROR', 'FAILED');

-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('PENDING', 'BUILDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Framework" AS ENUM ('NODEJS_EXPRESS', 'NODEJS_NEXTJS', 'NODEJS_NESTJS', 'PYTHON_DJANGO', 'PYTHON_FLASK', 'PYTHON_FASTAPI', 'STATIC_REACT', 'STATIC_VUE', 'STATIC_SVELTE', 'DOCKER_CUSTOM');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('POSTGRESQL', 'REDIS', 'MINIO', 'NODEJS', 'PYTHON', 'STATIC', 'DOCKER');

-- CreateEnum
CREATE TYPE "CronJobStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "arch" TEXT NOT NULL,
    "docker_version" TEXT NOT NULL,
    "token" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "resources" JSONB NOT NULL,
    "usage" JSONB,
    "last_heartbeat" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workloads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkloadType" NOT NULL,
    "status" "WorkloadStatus" NOT NULL DEFAULT 'PENDING',
    "config" JSONB NOT NULL,
    "credentials" JSONB,
    "public_url" TEXT,
    "internal_url" TEXT,
    "container_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workload_id" TEXT NOT NULL,
    "git_url" TEXT NOT NULL,
    "git_branch" TEXT NOT NULL DEFAULT 'main',
    "git_commit" TEXT,
    "framework" "Framework" NOT NULL,
    "status" "BuildStatus" NOT NULL DEFAULT 'PENDING',
    "logs" TEXT,
    "image_id" TEXT,
    "artifacts" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_jobs" (
    "id" TEXT NOT NULL,
    "workload_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "env" JSONB,
    "status" "CronJobStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_run" TIMESTAMP(3),
    "next_run" TIMESTAMP(3),
    "last_output" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_executions" (
    "id" TEXT NOT NULL,
    "cron_job_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "success" BOOLEAN,
    "output" TEXT,
    "error" TEXT,
    "duration" INTEGER,

    CONSTRAINT "cron_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_deployments" (
    "id" TEXT NOT NULL,
    "workload_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "container_id" TEXT,
    "port" INTEGER,
    "internal_port" INTEGER,
    "tunnel_url" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_token_key" ON "agents"("token");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workloads" ADD CONSTRAINT "workloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workloads" ADD CONSTRAINT "workloads_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_workload_id_fkey" FOREIGN KEY ("workload_id") REFERENCES "workloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cron_jobs" ADD CONSTRAINT "cron_jobs_workload_id_fkey" FOREIGN KEY ("workload_id") REFERENCES "workloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cron_executions" ADD CONSTRAINT "cron_executions_cron_job_id_fkey" FOREIGN KEY ("cron_job_id") REFERENCES "cron_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_deployments" ADD CONSTRAINT "service_deployments_workload_id_fkey" FOREIGN KEY ("workload_id") REFERENCES "workloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 4. Complete Backend Implementation

### 4.1 Main Server Setup

**Backend Entry Point** (`apps/backend/src/index.ts`):
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';
import { appRouter } from './routers';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// tRPC middleware
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ error, type, path, input }) => {
    logger.error(`tRPC Error - ${type} ${path}:`, {
      error: error.message,
      input,
      stack: error.stack,
    });
  },
}));

// WebSocket server for real-time updates
const server = app.listen(process.env.PORT || 3000, () => {
  logger.info(`Backend server running on port ${process.env.PORT || 3000}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
```

### 4.2 Context Setup

**tRPC Context** (`apps/backend/src/context.ts`):
```typescript
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from './utils/auth';

const prisma = new PrismaClient();

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Try to get user from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  let user = null;
  
  if (token) {
    try {
      const decoded = verifyJWT(token);
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true }
      });
    } catch (error) {
      // Invalid token, user remains null
    }
  }
  
  return {
    req,
    res,
    prisma,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### 4.3 Authentication Router

**Auth Router** (`apps/backend/src/routers/auth.ts`):
```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { hashPassword, verifyPassword, generateJWT } from '../utils/auth';

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User already exists',
        });
      }
      
      // Hash password
      const passwordHash = await hashPassword(input.password);
      
      // Create user
      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
      
      // Generate JWT
      const token = generateJWT({ userId: user.id });
      
      return {
        user,
        token,
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find user
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid credentials',
        });
      }
      
      // Verify password
      const validPassword = await verifyPassword(input.password, user.passwordHash);
      
      if (!validPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid credentials',
        });
      }
      
      // Generate JWT
      const token = generateJWT({ userId: user.id });
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user;
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      avatar: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user!.id },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      });
      
      return updatedUser;
    }),
});
```

### 4.4 Agent Router

**Agent Router** (`apps/backend/src/routers/agent.ts`):
```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { generateSecureToken } from '../utils/crypto';

export const agentRouter = router({
  register: protectedProcedure
    .input(z.object({
      hostname: z.string(),
      platform: z.string(),
      arch: z.string(),
      dockerVersion: z.string(),
      resources: z.object({
        cpuCores: z.number(),
        totalMemory: z.number(),
        totalDisk: z.number(),
        availableMemory: z.number(),
        availableDisk: z.number(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate secure token for agent
      const token = generateSecureToken();
      
      // Create agent
      const agent = await ctx.prisma.agent.create({
        data: {
          userId: ctx.user!.id,
          hostname: input.hostname,
          platform: input.platform,
          arch: input.arch,
          dockerVersion: input.dockerVersion,
          token,
          status: 'ONLINE',
          resources: input.resources,
          usage: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
          },
          lastHeartbeat: new Date(),
        },
      });
      
      return {
        agentId: agent.id,
        token,
      };
    }),

  heartbeat: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      usage: z.object({
        cpuUsage: z.number(),
        memoryUsage: z.number(),
        diskUsage: z.number(),
        availableMemory: z.number(),
        availableDisk: z.number(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify agent token
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.agentId,
          token: input.token,
        },
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid agent credentials',
        });
      }
      
      // Update agent status
      await ctx.prisma.agent.update({
        where: { id: input.agentId },
        data: {
          status: 'ONLINE',
          usage: input.usage,
          lastHeartbeat: new Date(),
        },
      });
      
      return { success: true };
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const agents = await ctx.prisma.agent.findMany({
        where: { userId: ctx.user!.id },
        select: {
          id: true,
          hostname: true,
          platform: true,
          status: true,
          resources: true,
          usage: true,
          lastHeartbeat: true,
          createdAt: true,
          workloads: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            },
          },
        },
      });
      
      return agents;
    }),

  getById: protectedProcedure
    .input(z.object({
      agentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.agentId,
          userId: ctx.user!.id,
        },
        include: {
          workloads: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              publicUrl: true,
              createdAt: true,
            },
          },
        },
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent not found',
        });
      }
      
      return agent;
    }),

  reportWorkloadStatus: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      workloadId: z.string(),
      status: z.enum(['PENDING', 'BUILDING', 'DEPLOYING', 'RUNNING', 'STOPPED', 'ERROR', 'FAILED']),
      message: z.string().optional(),
      publicUrl: z.string().optional(),
      credentials: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify agent
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.agentId,
          token: input.token,
        },
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid agent credentials',
        });
      }
      
      // Update workload status
      await ctx.prisma.workload.update({
        where: { id: input.workloadId },
        data: {
          status: input.status,
          publicUrl: input.publicUrl,
          credentials: input.credentials,
        },
      });
      
      return { success: true };
    }),
});
```

### 4.5 Workload Router

**Workload Router** (`apps/backend/src/routers/workload.ts`):
```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { WorkloadScheduler } from '../services/WorkloadScheduler';

const workloadScheduler = new WorkloadScheduler();

export const workloadRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const workloads = await ctx.prisma.workload.findMany({
        where: { userId: ctx.user!.id },
        include: {
          agent: {
            select: {
              id: true,
              hostname: true,
              status: true,
            },
          },
          builds: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return workloads;
    }),

  getById: protectedProcedure
    .input(z.object({
      workloadId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.workloadId,
          userId: ctx.user!.id,
        },
        include: {
          agent: true,
          builds: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          cronJobs: true,
        },
      });
      
      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }
      
      return workload;
    }),

  deployPostgreSQL: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      version: z.string().default('15'),
      database: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(8).optional(),
      resources: z.object({
        cpu: z.number().min(0.1).max(8),
        memory: z.number().min(128).max(16384),
        disk: z.number().min(1).max(1000),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate secure password if not provided
      const password = input.password || generateSecureToken();
      
      // Find optimal agent
      const agent = await workloadScheduler.selectOptimalAgent({
        cpu: input.resources.cpu,
        memory: input.resources.memory,
        disk: input.resources.disk,
        userId: ctx.user!.id,
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No available agents with sufficient resources',
        });
      }
      
      // Create workload
      const workload = await ctx.prisma.workload.create({
        data: {
          userId: ctx.user!.id,
          agentId: agent.id,
          name: input.name,
          type: 'POSTGRESQL',
          status: 'PENDING',
          config: {
            version: input.version,
            database: input.database,
            username: input.username,
            password,
            resources: input.resources,
          },
        },
      });
      
      // Schedule deployment
      await workloadScheduler.scheduleDeployment(workload.id, {
        type: 'POSTGRESQL',
        config: workload.config,
      });
      
      return workload;
    }),

  deployRedis: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      version: z.string().default('7'),
      password: z.string().min(8).optional(),
      resources: z.object({
        cpu: z.number().min(0.1).max(4),
        memory: z.number().min(64).max(8192),
        disk: z.number().min(1).max(100),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate secure password if not provided
      const password = input.password || generateSecureToken();
      
      // Find optimal agent
      const agent = await workloadScheduler.selectOptimalAgent({
        cpu: input.resources.cpu,
        memory: input.resources.memory,
        disk: input.resources.disk,
        userId: ctx.user!.id,
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No available agents with sufficient resources',
        });
      }
      
      // Create workload
      const workload = await ctx.prisma.workload.create({
        data: {
          userId: ctx.user!.id,
          agentId: agent.id,
          name: input.name,
          type: 'REDIS',
          status: 'PENDING',
          config: {
            version: input.version,
            password,
            resources: input.resources,
          },
        },
      });
      
      // Schedule deployment
      await workloadScheduler.scheduleDeployment(workload.id, {
        type: 'REDIS',
        config: workload.config,
      });
      
      return workload;
    }),

  deployNodeJS: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      gitUrl: z.string().url(),
      gitBranch: z.string().default('main'),
      env: z.record(z.string()).default({}),
      resources: z.object({
        cpu: z.number().min(0.1).max(8),
        memory: z.number().min(128).max(16384),
        disk: z.number().min(1).max(100),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find optimal agent
      const agent = await workloadScheduler.selectOptimalAgent({
        cpu: input.resources.cpu,
        memory: input.resources.memory,
        disk: input.resources.disk,
        userId: ctx.user!.id,
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No available agents with sufficient resources',
        });
      }
      
      // Create workload
      const workload = await ctx.prisma.workload.create({
        data: {
          userId: ctx.user!.id,
          agentId: agent.id,
          name: input.name,
          type: 'NODEJS',
          status: 'PENDING',
          config: {
            gitUrl: input.gitUrl,
            gitBranch: input.gitBranch,
            env: input.env,
            resources: input.resources,
          },
        },
      });
      
      // Create build record
      await ctx.prisma.build.create({
        data: {
          userId: ctx.user!.id,
          workloadId: workload.id,
          gitUrl: input.gitUrl,
          gitBranch: input.gitBranch,
          framework: 'NODEJS_EXPRESS', // Will be detected later
          status: 'PENDING',
        },
      });
      
      // Schedule deployment
      await workloadScheduler.scheduleDeployment(workload.id, {
        type: 'NODEJS',
        config: workload.config,
      });
      
      return workload;
    }),

  deployPython: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      gitUrl: z.string().url(),
      gitBranch: z.string().default('main'),
      env: z.record(z.string()).default({}),
      resources: z.object({
        cpu: z.number().min(0.1).max(8),
        memory: z.number().min(128).max(16384),
        disk: z.number().min(1).max(100),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find optimal agent
      const agent = await workloadScheduler.selectOptimalAgent({
        cpu: input.resources.cpu,
        memory: input.resources.memory,
        disk: input.resources.disk,
        userId: ctx.user!.id,
      });
      
      if (!agent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No available agents with sufficient resources',
        });
      }
      
      // Create workload
      const workload = await ctx.prisma.workload.create({
        data: {
          userId: ctx.user!.id,
          agentId: agent.id,
          name: input.name,
          type: 'PYTHON',
          status: 'PENDING',
          config: {
            gitUrl: input.gitUrl,
            gitBranch: input.gitBranch,
            env: input.env,
            resources: input.resources,
          },
        },
      });
      
      // Create build record
      await ctx.prisma.build.create({
        data: {
          userId: ctx.user!.id,
          workloadId: workload.id,
          gitUrl: input.gitUrl,
          gitBranch: input.gitBranch,
          framework: 'PYTHON_DJANGO', // Will be detected later
          status: 'PENDING',
        },
      });
      
      // Schedule deployment
      await workloadScheduler.scheduleDeployment(workload.id, {
        type: 'PYTHON',
        config: workload.config,
      });
      
      return workload;
    }),

  stop: protectedProcedure
    .input(z.object({
      workloadId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.workloadId,
          userId: ctx.user!.id,
        },
        include: {
          agent: true,
        },
      });
      
      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }
      
      // Schedule stop
      await workloadScheduler.scheduleStop(workload.id);
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({
      workloadId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.workloadId,
          userId: ctx.user!.id,
        },
      });
      
      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }
      
      // Schedule deletion
      await workloadScheduler.scheduleDelete(workload.id);
      
      return { success: true };
    }),
});
```

### 4.6 Workload Scheduler Service

**Workload Scheduler** (`apps/backend/src/services/WorkloadScheduler.ts`):
```typescript
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { AgentAPIClient } from '../lib/AgentAPIClient';

const prisma = new PrismaClient();

interface ResourceRequirements {
  cpu: number;
  memory: number;
  disk: number;
  userId: string;
}

interface DeploymentConfig {
  type: string;
  config: any;
}

export class WorkloadScheduler {
  private agentClients: Map<string, AgentAPIClient> = new Map();

  async selectOptimalAgent(requirements: ResourceRequirements) {
    // Find available agents for the user
    const agents = await prisma.agent.findMany({
      where: {
        userId: requirements.userId,
        status: 'ONLINE',
        lastHeartbeat: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    // Filter agents with sufficient resources
    const suitableAgents = agents.filter(agent => {
      const usage = agent.usage as any;
      const resources = agent.resources as any;
      
      const availableCpu = resources.cpuCores - (usage.cpuUsage || 0);
      const availableMemory = usage.availableMemory || 0;
      const availableDisk = usage.availableDisk || 0;
      
      return (
        availableCpu >= requirements.cpu &&
        availableMemory >= requirements.memory &&
        availableDisk >= requirements.disk
      );
    });

    if (suitableAgents.length === 0) {
      return null;
    }

    // Select agent with least utilization
    const optimalAgent = suitableAgents.reduce((best, current) => {
      const bestUsage = best.usage as any;
      const currentUsage = current.usage as any;
      
      const bestUtilization = (bestUsage.cpuUsage || 0) + (bestUsage.memoryUsage || 0);
      const currentUtilization = (currentUsage.cpuUsage || 0) + (currentUsage.memoryUsage || 0);
      
      return currentUtilization < bestUtilization ? current : best;
    });

    return optimalAgent;
  }

  async scheduleDeployment(workloadId: string, config: DeploymentConfig) {
    const workload = await prisma.workload.findUnique({
      where: { id: workloadId },
      include: { agent: true },
    });

    if (!workload) {
      throw new Error('Workload not found');
    }

    const agent = workload.agent;
    const agentClient = this.getAgentClient(agent.id, agent.token!);

    try {
      // Update status to deploying
      await prisma.workload.update({
        where: { id: workloadId },
        data: { status: 'DEPLOYING' },
      });

      // Deploy based on type
      let deployment;
      switch (config.type) {
        case 'POSTGRESQL':
          deployment = await agentClient.deployPostgreSQL({
            workloadId,
            config: config.config,
          });
          break;
        case 'REDIS':
          deployment = await agentClient.deployRedis({
            workloadId,
            config: config.config,
          });
          break;
        case 'NODEJS':
          deployment = await agentClient.deployNodeJS({
            workloadId,
            config: config.config,
          });
          break;
        case 'PYTHON':
          deployment = await agentClient.deployPython({
            workloadId,
            config: config.config,
          });
          break;
        default:
          throw new Error(`Unsupported workload type: ${config.type}`);
      }

      // Update workload with deployment info
      await prisma.workload.update({
        where: { id: workloadId },
        data: {
          status: 'RUNNING',
          containerId: deployment.containerId,
          publicUrl: deployment.publicUrl,
          internalUrl: deployment.internalUrl,
          credentials: deployment.credentials,
        },
      });

    } catch (error) {
      // Update status to failed
      await prisma.workload.update({
        where: { id: workloadId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async scheduleStop(workloadId: string) {
    const workload = await prisma.workload.findUnique({
      where: { id: workloadId },
      include: { agent: true },
    });

    if (!workload) {
      throw new Error('Workload not found');
    }

    const agent = workload.agent;
    const agentClient = this.getAgentClient(agent.id, agent.token!);

    try {
      await agentClient.stopWorkload({
        workloadId,
        containerId: workload.containerId!,
      });

      await prisma.workload.update({
        where: { id: workloadId },
        data: { status: 'STOPPED' },
      });

    } catch (error) {
      await prisma.workload.update({
        where: { id: workloadId },
        data: { status: 'ERROR' },
      });
      throw error;
    }
  }

  async scheduleDelete(workloadId: string) {
    const workload = await prisma.workload.findUnique({
      where: { id: workloadId },
      include: { agent: true },
    });

    if (!workload) {
      throw new Error('Workload not found');
    }

    const agent = workload.agent;
    const agentClient = this.getAgentClient(agent.id, agent.token!);

    try {
      await agentClient.deleteWorkload({
        workloadId,
        containerId: workload.containerId!,
      });

      await prisma.workload.delete({
        where: { id: workloadId },
      });

    } catch (error) {
      await prisma.workload.update({
        where: { id: workloadId },
        data: { status: 'ERROR' },
      });
      throw error;
    }
  }

  private getAgentClient(agentId: string, token: string): AgentAPIClient {
    const key = `${agentId}:${token}`;
    if (!this.agentClients.has(key)) {
      this.agentClients.set(key, new AgentAPIClient(agentId, token));
    }
    return this.agentClients.get(key)!;
  }
}
```

---

## 5. Complete Agent Implementation

### 5.1 Agent Main Entry Point

**Agent Entry Point** (`apps/agent/src/index.ts`):
```typescript
import { Agent } from './Agent';
import { logger } from './utils/logger';

async function main() {
  const agent = new Agent();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await agent.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await agent.shutdown();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception:', error);
    await agent.shutdown();
    process.exit(1);
  });
  
  try {
    await agent.start();
    logger.info('Agent started successfully');
  } catch (error) {
    logger.error('Failed to start agent:', error);
    process.exit(1);
  }
}

main().catch(console.error);
```

### 5.2 Agent Core Class

**Agent Class** (`apps/agent/src/Agent.ts`):
```typescript
import * as cron from 'node-cron';
import { DockerService } from './services/DockerService';
import { BuildService } from './services/BuildService';
import { CronService } from './services/CronService';
import { TunnelService } from './services/TunnelService';
import { APIClient } from './lib/APIClient';
import { SystemInfo } from './utils/SystemInfo';
import { logger } from './utils/logger';

export class Agent {
  private dockerService: DockerService;
  private buildService: BuildService;
  private cronService: CronService;
  private tunnelService: TunnelService;
  private apiClient: APIClient;
  private systemInfo: SystemInfo;
  
  private agentId?: string;
  private agentToken?: string;
  private heartbeatTask?: cron.ScheduledTask;
  private isShuttingDown = false;

  constructor() {
    this.dockerService = new DockerService();
    this.buildService = new BuildService();
    this.cronService = new CronService();
    this.tunnelService = new TunnelService();
    this.apiClient = new APIClient();
    this.systemInfo = new SystemInfo();
  }

  async start(): Promise<void> {
    logger.info('Starting agent...');

    try {
      // Initialize services
      await this.dockerService.initialize();
      await this.buildService.initialize();
      await this.cronService.initialize();
      await this.tunnelService.initialize();

      // Register with backend
      await this.register();

      // Start heartbeat
      this.startHeartbeat();

      // Start listening for commands
      await this.startCommandListener();

      logger.info('Agent started successfully');
    } catch (error) {
      logger.error('Failed to start agent:', error);
      throw error;
    }
  }

  private async register(): Promise<void> {
    logger.info('Registering agent with backend...');

    try {
      const systemInfo = await this.systemInfo.gather();
      const resources = await this.dockerService.getResourceUsage();

      const registration = await this.apiClient.registerAgent({
        hostname: systemInfo.hostname,
        platform: systemInfo.platform,
        arch: systemInfo.arch,
        dockerVersion: systemInfo.dockerVersion,
        resources: {
          cpuCores: systemInfo.cpuCores,
          totalMemory: systemInfo.totalMemory,
          totalDisk: systemInfo.totalDisk,
          availableMemory: resources.availableMemory,
          availableDisk: resources.availableDisk,
        },
      });

      this.agentId = registration.agentId;
      this.agentToken = registration.token;

      logger.info(`Agent registered with ID: ${this.agentId}`);
    } catch (error) {
      logger.error('Failed to register agent:', error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    if (!this.agentId || !this.agentToken) {
      throw new Error('Agent not registered');
    }

    logger.info('Starting heartbeat...');

    this.heartbeatTask = cron.schedule('*/30 * * * * *', async () => {
      if (this.isShuttingDown) return;

      try {
        const resources = await this.dockerService.getResourceUsage();
        
        await this.apiClient.sendHeartbeat({
          agentId: this.agentId!,
          token: this.agentToken!,
          usage: {
            cpuUsage: resources.cpuUsage,
            memoryUsage: resources.memoryUsage,
            diskUsage: resources.diskUsage,
            availableMemory: resources.availableMemory,
            availableDisk: resources.availableDisk,
          },
        });
      } catch (error) {
        logger.error('Failed to send heartbeat:', error);
      }
    });
  }

  private async startCommandListener(): Promise<void> {
    // This would typically be a WebSocket connection or polling mechanism
    // For now, we'll implement a simple polling approach
    setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.checkForCommands();
      } catch (error) {
        logger.error('Error checking for commands:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async checkForCommands(): Promise<void> {
    if (!this.agentId || !this.agentToken) return;

    try {
      const commands = await this.apiClient.getCommands({
        agentId: this.agentId,
        token: this.agentToken,
      });

      for (const command of commands) {
        await this.executeCommand(command);
      }
    } catch (error) {
      logger.error('Failed to check for commands:', error);
    }
  }

  private async executeCommand(command: any): Promise<void> {
    logger.info(`Executing command: ${command.type}`);

    try {
      switch (command.type) {
        case 'DEPLOY_POSTGRESQL':
          await this.deployPostgreSQL(command.payload);
          break;
        case 'DEPLOY_REDIS':
          await this.deployRedis(command.payload);
          break;
        case 'DEPLOY_NODEJS':
          await this.deployNodeJS(command.payload);
          break;
        case 'DEPLOY_PYTHON':
          await this.deployPython(command.payload);
          break;
        case 'DEPLOY_CRON':
          await this.deployCronJob(command.payload);
          break;
        case 'STOP_WORKLOAD':
          await this.stopWorkload(command.payload);
          break;
        case 'DELETE_WORKLOAD':
          await this.deleteWorkload(command.payload);
          break;
        default:
          logger.warn(`Unknown command type: ${command.type}`);
      }
    } catch (error) {
      logger.error(`Failed to execute command ${command.type}:`, error);
      
      // Report failure to backend
      await this.apiClient.reportWorkloadStatus({
        agentId: this.agentId!,
        token: this.agentToken!,
        workloadId: command.payload.workloadId,
        status: 'FAILED',
        message: error.message,
      });
    }
  }

  private async deployPostgreSQL(payload: any): Promise<void> {
    const { workloadId, config } = payload;

    logger.info(`Deploying PostgreSQL for workload ${workloadId}`);

    // Report building status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'DEPLOYING',
    });

    // Deploy PostgreSQL container
    const container = await this.dockerService.deployPostgreSQL({
      workloadId,
      version: config.version,
      database: config.database,
      username: config.username,
      password: config.password,
      resources: config.resources,
    });

    // Create tunnel for public access
    const tunnel = await this.tunnelService.createTunnel({
      localPort: container.port,
      subdomain: `postgres-${workloadId}`,
    });

    // Report success
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'RUNNING',
      publicUrl: tunnel.url,
      credentials: {
        host: tunnel.host,
        port: tunnel.port,
        database: config.database,
        username: config.username,
        password: config.password,
        connectionString: `postgresql://${config.username}:${config.password}@${tunnel.host}:${tunnel.port}/${config.database}`,
      },
    });

    logger.info(`PostgreSQL deployed successfully for workload ${workloadId}`);
  }

  private async deployRedis(payload: any): Promise<void> {
    const { workloadId, config } = payload;

    logger.info(`Deploying Redis for workload ${workloadId}`);

    // Report deploying status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'DEPLOYING',
    });

    // Deploy Redis container
    const container = await this.dockerService.deployRedis({
      workloadId,
      version: config.version,
      password: config.password,
      resources: config.resources,
    });

    // Create tunnel for public access
    const tunnel = await this.tunnelService.createTunnel({
      localPort: container.port,
      subdomain: `redis-${workloadId}`,
    });

    // Report success
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'RUNNING',
      publicUrl: tunnel.url,
      credentials: {
        host: tunnel.host,
        port: tunnel.port,
        password: config.password,
        connectionString: `redis://:${config.password}@${tunnel.host}:${tunnel.port}`,
      },
    });

    logger.info(`Redis deployed successfully for workload ${workloadId}`);
  }

  private async deployNodeJS(payload: any): Promise<void> {
    const { workloadId, config } = payload;

    logger.info(`Deploying Node.js app for workload ${workloadId}`);

    // Report building status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'BUILDING',
    });

    // Build from Git repository
    const buildResult = await this.buildService.buildNodeJS({
      workloadId,
      gitUrl: config.gitUrl,
      gitBranch: config.gitBranch,
      env: config.env,
    });

    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.logs.join('\n')}`);
    }

    // Report deploying status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'DEPLOYING',
    });

    // Deploy built container
    const container = await this.dockerService.deployNodeJS({
      workloadId,
      imageId: buildResult.imageId!,
      env: config.env,
      resources: config.resources,
    });

    // Create tunnel for public access
    const tunnel = await this.tunnelService.createTunnel({
      localPort: container.port,
      subdomain: `app-${workloadId}`,
    });

    // Report success
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'RUNNING',
      publicUrl: tunnel.url,
    });

    logger.info(`Node.js app deployed successfully for workload ${workloadId}`);
  }

  private async deployPython(payload: any): Promise<void> {
    const { workloadId, config } = payload;

    logger.info(`Deploying Python app for workload ${workloadId}`);

    // Report building status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'BUILDING',
    });

    // Build from Git repository
    const buildResult = await this.buildService.buildPython({
      workloadId,
      gitUrl: config.gitUrl,
      gitBranch: config.gitBranch,
      env: config.env,
    });

    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.logs.join('\n')}`);
    }

    // Report deploying status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'DEPLOYING',
    });

    // Deploy built container
    const container = await this.dockerService.deployPython({
      workloadId,
      imageId: buildResult.imageId!,
      env: config.env,
      resources: config.resources,
    });

    // Create tunnel for public access
    const tunnel = await this.tunnelService.createTunnel({
      localPort: container.port,
      subdomain: `app-${workloadId}`,
    });

    // Report success
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'RUNNING',
      publicUrl: tunnel.url,
    });

    logger.info(`Python app deployed successfully for workload ${workloadId}`);
  }

  private async deployCronJob(payload: any): Promise<void> {
    const { workloadId, config } = payload;

    logger.info(`Deploying cron job for workload ${workloadId}`);

    // Deploy cron job
    const cronJob = await this.cronService.deployCronJob({
      workloadId,
      schedule: config.schedule,
      command: config.command,
      env: config.env,
    });

    // Report success
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'RUNNING',
    });

    logger.info(`Cron job deployed successfully for workload ${workloadId}`);
  }

  private async stopWorkload(payload: any): Promise<void> {
    const { workloadId, containerId } = payload;

    logger.info(`Stopping workload ${workloadId}`);

    await this.dockerService.stopContainer(containerId);

    // Report stopped status
    await this.apiClient.reportWorkloadStatus({
      agentId: this.agentId!,
      token: this.agentToken!,
      workloadId,
      status: 'STOPPED',
    });

    logger.info(`Workload ${workloadId} stopped successfully`);
  }

  private async deleteWorkload(payload: any): Promise<void> {
    const { workloadId, containerId } = payload;

    logger.info(`Deleting workload ${workloadId}`);

    // Remove container
    await this.dockerService.removeContainer(containerId);

    // Close tunnel
    await this.tunnelService.closeTunnel(workloadId);

    // Stop cron job if exists
    await this.cronService.stopCronJob(workloadId);

    logger.info(`Workload ${workloadId} deleted successfully`);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down agent...');
    this.isShuttingDown = true;

    // Stop heartbeat
    if (this.heartbeatTask) {
      this.heartbeatTask.stop();
    }

    // Shutdown services
    await this.cronService.shutdown();
    await this.tunnelService.shutdown();
    await this.dockerService.shutdown();

    logger.info('Agent shutdown complete');
  }
}
```

### 5.3 Docker Service Implementation

**Docker Service** (`apps/agent/src/services/DockerService.ts`):
```typescript
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface DeploymentConfig {
  workloadId: string;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface PostgreSQLConfig extends DeploymentConfig {
  version: string;
  database: string;
  username: string;
  password: string;
}

interface RedisConfig extends DeploymentConfig {
  version: string;
  password: string;
}

interface NodeJSConfig extends DeploymentConfig {
  imageId: string;
  env: Record<string, string>;
}

interface PythonConfig extends DeploymentConfig {
  imageId: string;
  env: Record<string, string>;
}

interface ContainerInfo {
  id: string;
  port: number;
  internalPort: number;
  status: string;
}

export class DockerService {
  private docker: Docker;
  private containers: Map<string, Docker.Container> = new Map();

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Docker service...');

    try {
      // Test Docker connection
      const info = await this.docker.info();
      logger.info(`Docker connected: ${info.ServerVersion}`);

      // Pull required base images
      await this.pullBaseImages();

      logger.info('Docker service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Docker service:', error);
      throw error;
    }
  }

  private async pullBaseImages(): Promise<void> {
    const images = [
      'postgres:15',
      'postgres:14',
      'postgres:13',
      'redis:7',
      'redis:6',
      'node:18-alpine',
      'node:16-alpine',
      'python:3.11-slim',
      'python:3.10-slim',
      'python:3.9-slim',
    ];

    for (const image of images) {
      try {
        logger.info(`Pulling image: ${image}`);
        await this.docker.pull(image);
      } catch (error) {
        logger.warn(`Failed to pull image ${image}:`, error);
      }
    }
  }

  async deployPostgreSQL(config: PostgreSQLConfig): Promise<ContainerInfo> {
    logger.info(`Deploying PostgreSQL for workload ${config.workloadId}`);

    const containerName = `postgres-${config.workloadId}`;
    const port = await this.getAvailablePort();

    const container = await this.docker.createContainer({
      name: containerName,
      Image: `postgres:${config.version}`,
      Env: [
        `POSTGRES_DB=${config.database}`,
        `POSTGRES_USER=${config.username}`,
        `POSTGRES_PASSWORD=${config.password}`,
      ],
      ExposedPorts: {
        '5432/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5432/tcp': [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024, // Convert MB to bytes
        CpuShares: Math.floor(config.resources.cpu * 1024), // CPU shares
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'postgresql',
      },
    });

    await container.start();

    // Wait for PostgreSQL to be ready
    await this.waitForPostgreSQL(container, config.username, config.password, config.database);

    this.containers.set(config.workloadId, container);

    return {
      id: container.id!,
      port,
      internalPort: 5432,
      status: 'running',
    };
  }

  private async waitForPostgreSQL(container: Docker.Container, username: string, password: string, database: string): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const exec = await container.exec({
          Cmd: ['pg_isready', '-U', username, '-d', database],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});
        const output = await this.streamToString(stream);

        if (output.includes('accepting connections')) {
          logger.info('PostgreSQL is ready');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('PostgreSQL failed to start within timeout');
  }

  async deployRedis(config: RedisConfig): Promise<ContainerInfo> {
    logger.info(`Deploying Redis for workload ${config.workloadId}`);

    const containerName = `redis-${config.workloadId}`;
    const port = await this.getAvailablePort();

    const container = await this.docker.createContainer({
      name: containerName,
      Image: `redis:${config.version}`,
      Cmd: ['redis-server', '--requirepass', config.password],
      ExposedPorts: {
        '6379/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '6379/tcp': [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'redis',
      },
    });

    await container.start();

    // Wait for Redis to be ready
    await this.waitForRedis(container, config.password);

    this.containers.set(config.workloadId, container);

    return {
      id: container.id!,
      port,
      internalPort: 6379,
      status: 'running',
    };
  }

  private async waitForRedis(container: Docker.Container, password: string): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const exec = await container.exec({
          Cmd: ['redis-cli', '-a', password, 'ping'],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});
        const output = await this.streamToString(stream);

        if (output.includes('PONG')) {
          logger.info('Redis is ready');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Redis failed to start within timeout');
  }

  async deployNodeJS(config: NodeJSConfig): Promise<ContainerInfo> {
    logger.info(`Deploying Node.js app for workload ${config.workloadId}`);

    const containerName = `nodejs-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const internalPort = 3000; // Default Node.js port

    const envVars = Object.entries(config.env).map(([key, value]) => `${key}=${value}`);
    envVars.push(`PORT=${internalPort}`);

    const container = await this.docker.createContainer({
      name: containerName,
      Image: config.imageId,
      Env: envVars,
      ExposedPorts: {
        [`${internalPort}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${internalPort}/tcp`]: [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },