#!/bin/bash

# 🚀 Lattice Console Production Setup Script
# This script prepares the entire system for production deployment

set -e

echo "🚀 Lattice Console Production Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 could not be found. Please install $1 first."
        exit 1
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."
check_command "node"
check_command "pnpm"
check_command "docker"
check_command "git"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE="18.0.0"
if ! node -e "process.exit(process.version.slice(1).split('.')[0] >= 18 ? 0 : 1)"; then
    log_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18 or later."
    exit 1
fi

log_success "Prerequisites check passed"

# Create environment files
log_info "Setting up environment configuration..."

# Backend environment
cat > lattice-console/.env << EOF
# Database
DATABASE_URL="postgresql://lattice:lattice_secure_password@localhost:5432/lattice_console?schema=public"

# Authentication
JWT_SECRET="$(openssl rand -base64 64)"
AGENT_SECRET="$(openssl rand -base64 32)"

# Application
NODE_ENV="production"
BACKEND_PORT="3001"
FRONTEND_PORT="3000"
CORS_ORIGIN="http://localhost:3000"

# External Services
NGROK_AUTH_TOKEN=""
WEBHOOK_SECRET="$(openssl rand -base64 32)"

# Monitoring
LOG_LEVEL="info"
METRICS_ENABLED="true"

# Security
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
EOF

# Onboarding app environment
cat > lattice-console/apps/onboarding-app/.env << EOF
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
TAURI_PRIVATE_KEY=""
TAURI_KEY_PASSWORD=""
EOF

log_success "Environment files created"

# Install dependencies
log_info "Installing dependencies..."
cd lattice-console
pnpm install
log_success "Dependencies installed"

# Setup database
log_info "Setting up database..."
if ! docker ps | grep -q lattice-postgres; then
    log_info "Starting PostgreSQL container..."
    docker run -d \
        --name lattice-postgres \
        -e POSTGRES_USER=lattice \
        -e POSTGRES_PASSWORD=lattice_secure_password \
        -e POSTGRES_DB=lattice_console \
        -p 5432:5432 \
        -v lattice_postgres_data:/var/lib/postgresql/data \
        postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10
fi

# Initialize database schema
log_info "Initializing database schema..."
cd apps/backend
pnpm prisma db push
cd ../..

log_success "Database setup complete"

# Build all packages
log_info "Building all packages..."
pnpm build
log_success "Build complete"

# Setup Redis (for production)
log_info "Setting up Redis..."
if ! docker ps | grep -q lattice-redis; then
    docker run -d \
        --name lattice-redis \
        -p 6379:6379 \
        -v lattice_redis_data:/data \
        redis:7-alpine redis-server --appendonly yes
fi
log_success "Redis setup complete"

# Setup monitoring (optional)
log_info "Setting up monitoring stack..."
cat > docker-compose.monitoring.yml << EOF
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: lattice-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: lattice-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus_data:
  grafana_data:
EOF

# Create monitoring directory
mkdir -p monitoring
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lattice-backend'
    static_configs:
      - targets: ['localhost:3001']
  
  - job_name: 'lattice-agents'
    static_configs:
      - targets: ['localhost:3002']
EOF

log_success "Monitoring stack prepared"

# Create deployment scripts
log_info "Creating deployment scripts..."

# Production deployment script
cat > deploy-production.sh << EOF
#!/bin/bash
set -e

echo "🚀 Deploying Lattice Console to Production"

# Build for production
pnpm build

# Start infrastructure
docker-compose -f docker-compose.yml up -d

# Start monitoring (optional)
# docker-compose -f docker-compose.monitoring.yml up -d

echo "✅ Production deployment complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "📊 API: http://localhost:3001"
echo "📈 Grafana: http://localhost:3000 (admin/admin)"
echo "📊 Prometheus: http://localhost:9090"
EOF

chmod +x deploy-production.sh

# Development startup script
cat > start-dev.sh << EOF
#!/bin/bash
set -e

echo "🛠️  Starting Lattice Console Development Environment"

# Start infrastructure
docker-compose up -d postgres redis

# Start development servers
pnpm dev &

echo "✅ Development environment started!"
echo "🌐 Frontend: http://localhost:3000"
echo "📊 API: http://localhost:3001"
echo "🖥️  Onboarding App: pnpm --filter @lattice-console/onboarding-app tauri dev"
EOF

chmod +x start-dev.sh

# Cleanup script
cat > cleanup.sh << EOF
#!/bin/bash
echo "🧹 Cleaning up Lattice Console"

# Stop all containers
docker-compose down

# Remove containers
docker rm -f lattice-postgres lattice-redis 2>/dev/null || true

# Remove volumes (WARNING: This will delete all data!)
read -p "⚠️  Remove all data volumes? (y/N): " -n 1 -r
echo
if [[ \$REPLY =~ ^[Yy]\$ ]]; then
    docker volume rm lattice_postgres_data lattice_redis_data 2>/dev/null || true
    echo "✅ Data volumes removed"
fi

echo "✅ Cleanup complete"
EOF

chmod +x cleanup.sh

log_success "Deployment scripts created"

# Build onboarding app binaries
log_info "Building onboarding app for all platforms..."
cd apps/onboarding-app

# Install Rust if not present
if ! command -v rustc &> /dev/null; then
    log_warning "Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# Install Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    log_info "Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Build for current platform
log_info "Building onboarding app for current platform..."
pnpm tauri build

cd ../..
log_success "Onboarding app built successfully"

# Final setup summary
log_success "🎉 Lattice Console Production Setup Complete!"
echo ""
echo "📁 Project Structure:"
echo "   lattice-console/"
echo "   ├── apps/"
echo "   │   ├── backend/          # Production-hardened API server"
echo "   │   ├── frontend/         # Next.js web interface"
echo "   │   ├── agent/            # Docker agent for nodes"
echo "   │   └── onboarding-app/   # Cross-platform desktop app"
echo "   ├── packages/"
echo "   │   └── utils/            # Shared utilities"
echo "   └── scripts/              # Deployment and utility scripts"
echo ""
echo "🚀 Quick Start Commands:"
echo "   ./start-dev.sh           # Start development environment"
echo "   ./deploy-production.sh   # Deploy to production"
echo "   ./cleanup.sh             # Clean up everything"
echo ""
echo "📱 Onboarding App:"
echo "   Built binaries are in: apps/onboarding-app/src-tauri/target/release/"
echo ""
echo "🔧 Configuration:"
echo "   Backend:     lattice-console/.env"
echo "   Frontend:    lattice-console/apps/frontend/.env.local"
echo "   Onboarding:  lattice-console/apps/onboarding-app/.env"
echo ""
echo "📊 Monitoring:"
echo "   Grafana:     http://localhost:3000 (after starting monitoring)"
echo "   Prometheus:  http://localhost:9090"
echo ""
echo "🎯 Next Steps:"
echo "   1. Customize .env files for your environment"
echo "   2. Run './start-dev.sh' for development"
echo "   3. Run './deploy-production.sh' for production"
echo "   4. Test the onboarding app on target machines"
echo ""
echo "🚨 Mission Status: LAUNCH READY ✅"