# 🚀 Lattice Console MVP Testing Guide

## ✅ Setup Completed Successfully

Your Lattice Console is ready for testing! Here's what's been configured:

### 🗄️ Database
- **Neon PostgreSQL**: Connected and schema deployed
- **Tables**: Users, Sessions, Workloads, Agents, Credentials, WorkloadLogs, WorkloadStats
- **Connection**: SSL-enabled with proper timeout settings

### 🏗️ Applications
- **Backend**: Express + tRPC + Prisma (Port 3001)
- **Agent**: Docker management + tunneling (Port 3002)  
- **Packages**: @lattice-console/utils and @lattice-console/trpc

---

## 🧪 Testing Steps

### 1. Start the Backend Server
```bash
cd /workspace/lattice-console/apps/backend
pnpm run dev
```

### 2. Test Health Endpoints
```bash
# Basic health check
curl http://localhost:3001/health

# Database readiness
curl http://localhost:3001/health/ready

# Liveness probe
curl http://localhost:3001/health/live
```

### 3. Test User Registration & Authentication
```bash
# Register a new user
curl -X POST http://localhost:3001/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@lattice.dev",
    "password": "securepassword123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@lattice.dev", 
    "password": "securepassword123"
  }'
```

### 4. Start the Agent (In New Terminal)
```bash
cd /workspace/lattice-console/apps/agent
pnpm run dev
```

### 5. Test Docker Container Management
```bash
# List Docker containers via agent
curl http://localhost:3002/api/docker/containers

# Agent health check
curl http://localhost:3002/health
```

---

## 🐳 Test Workload Deployment

### Deploy PostgreSQL Database
```bash
curl -X POST http://localhost:3001/trpc/workload.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "postgres-test",
    "type": "postgresql",
    "config": {
      "database": "testdb",
      "username": "testuser",
      "password": "testpass"
    }
  }'
```

### Deploy MinIO S3 Storage
```bash
curl -X POST http://localhost:3001/trpc/workload.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "minio-storage",
    "type": "minio",
    "config": {
      "accessKey": "minioadmin",
      "secretKey": "minioadmin123"
    }
  }'
```

---

## 🌐 Test Tunneling & Remote Access

### 1. Enable Localtunnel
```bash
# The agent will automatically create tunnels for your workloads
# Check tunnel status
curl http://localhost:3002/api/tunnels
```

### 2. Access Your Workloads Remotely
- Your deployed PostgreSQL and MinIO will be accessible via public URLs
- URLs will be returned in the workload creation response
- Example: `https://abc123.loca.lt` → Your PostgreSQL database

---

## 📊 Monitoring & Logs

### View Workload Status
```bash
curl http://localhost:3001/trpc/workload.list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Workload Logs
```bash
curl http://localhost:3001/trpc/workload.logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"workloadId": "WORKLOAD_ID"}'
```

### View Agent Status
```bash
curl http://localhost:3001/trpc/agent.status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Success Criteria

✅ **Backend Health**: All health endpoints return 200 OK  
✅ **Database Connection**: Ready endpoint shows database connected  
✅ **User Registration**: Can create new user accounts  
✅ **Authentication**: JWT tokens generated and validated  
✅ **Agent Communication**: Docker containers listed successfully  
✅ **Workload Deployment**: PostgreSQL/MinIO containers created  
✅ **Tunnel Creation**: Public URLs generated for workloads  
✅ **Remote Access**: Can connect to databases via tunnel URLs

---

## 🐛 Troubleshooting

### Backend Won't Start
- Check `.env` file has correct DATABASE_URL
- Verify Neon database is accessible
- Run `pnpm prisma generate` in backend directory

### Agent Can't Access Docker
- Ensure Docker daemon is running: `sudo systemctl start docker`
- Add user to docker group: `sudo usermod -aG docker $USER`
- Check Docker socket: `ls -la /var/run/docker.sock`

### Tunneling Issues  
- Install localtunnel globally: `npm install -g localtunnel`
- Check firewall settings for ports 3001, 3002
- Verify internet connectivity

---

## 🚀 Next Steps

1. **Test Core Platform** (Database + Workloads)
2. **Fix Frontend Build** (TailwindCSS configuration)
3. **Add ngrok Integration** (Better tunneling)
4. **Deploy to Production** (Docker containers)
5. **Scale to Multiple Agents** (Distributed architecture)

Your Lattice Console MVP is ready for distributed cloud workloads! 🎉