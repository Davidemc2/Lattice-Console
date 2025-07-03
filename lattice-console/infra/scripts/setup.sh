#!/bin/bash
set -e

echo "🚀 Setting up Lattice Console MVP..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@8.14.1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need Docker for full functionality."
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Build packages
echo "🏗️  Building packages..."
pnpm run build

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
cd apps/backend
pnpm prisma generate
cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'pnpm --filter @lattice-console/backend prisma migrate dev' to setup database"
echo "3. Run 'pnpm dev' to start all services"
echo "4. Or use 'docker-compose up' for containerized development"
echo ""
echo "🎯 Ready to build the future of cloud computing!"