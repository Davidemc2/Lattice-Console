#!/bin/bash

# Lattice Console MVP 0.1 Setup Script
echo "🚀 Setting up Lattice Console MVP 0.1..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
pnpm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd apps/backend
pnpm install
cd ../..

# Install agent dependencies
echo "📦 Installing agent dependencies..."
cd apps/agent
pnpm install
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd apps/frontend
pnpm install
cd ../..

# Create environment files
echo "🔧 Creating environment files..."

# Backend .env
if [ ! -f "apps/backend/.env" ]; then
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created apps/backend/.env (please configure your database URL)"
fi

# Agent .env
if [ ! -f "apps/agent/.env" ]; then
    cat > apps/agent/.env << EOF
# Agent Configuration
PORT=4001
NODE_ENV=development

# Ngrok (optional, for tunneling)
# NGROK_AUTH_TOKEN=your-ngrok-auth-token

# Backend API
BACKEND_URL=http://localhost:4000
EOF
    echo "✅ Created apps/agent/.env"
fi

# Frontend .env
if [ ! -f "apps/frontend/.env.local" ]; then
    cat > apps/frontend/.env.local << EOF
# Frontend Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
EOF
    echo "✅ Created apps/frontend/.env.local"
fi

# Build shared packages
echo "🔨 Building shared packages..."
cd packages/shared
pnpm build
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Configure your Neon database URL in apps/backend/.env"
echo "2. Run database migrations: cd apps/backend && pnpm db:migrate"
echo "3. Start the services:"
echo "   - Backend: cd apps/backend && pnpm dev"
echo "   - Agent: cd apps/agent && pnpm dev"
echo "   - Frontend: cd apps/frontend && pnpm dev"
echo ""
echo "🌐 Services will be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:4000"
echo "   - Agent API: http://localhost:4001"
echo ""
echo "📚 See IMPLEMENTATION_STATUS.md for detailed progress and next steps"