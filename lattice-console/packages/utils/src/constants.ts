// Service ports
export const PORTS = {
  FRONTEND: 3000,
  BACKEND: 3001,
  AGENT: 3002,
} as const;

// Default resource limits
export const DEFAULT_RESOURCES = {
  CPU: 1, // cores
  MEMORY: 512, // MB
  STORAGE: 10, // GB
} as const;

// Docker images
export const DOCKER_IMAGES = {
  POSTGRES: 'postgres:15-alpine',
  MINIO: 'minio/minio:latest',
  NGINX: 'nginx:alpine',
  UBUNTU: 'ubuntu:22.04',
} as const;

// Timeouts
export const TIMEOUTS = {
  CONTAINER_START: 30000, // 30 seconds
  CONTAINER_STOP: 10000, // 10 seconds
  HEALTH_CHECK: 5000, // 5 seconds
  API_REQUEST: 30000, // 30 seconds
  JWT_EXPIRES_IN: '7d',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_REQUESTS: 100,
  API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const;

// Container labels
export const CONTAINER_LABELS = {
  MANAGED_BY: 'lattice-console',
  USER_ID: 'lattice.user.id',
  WORKLOAD_ID: 'lattice.workload.id',
  WORKLOAD_TYPE: 'lattice.workload.type',
  CREATED_AT: 'lattice.created.at',
} as const;

// Health check paths
export const HEALTH_PATHS = {
  BACKEND: '/health',
  AGENT: '/health',
  POSTGRES: 'pg_isready',
  MINIO: '/minio/health/live',
} as const;

// Environment prefixes
export const ENV_PREFIXES = {
  POSTGRES: 'POSTGRES_',
  MINIO: 'MINIO_',
  APP: 'APP_',
} as const;

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DOCKER_IMAGE: /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[a-z0-9]+(?:[._-][a-z0-9]+)*)?(?:@[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/i,
  WORKLOAD_NAME: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
  ENV_VAR_KEY: /^[A-Z_][A-Z0-9_]*$/,
} as const;

// Volume paths
export const VOLUME_PATHS = {
  BASE: '/var/lib/lattice/volumes',
  POSTGRES_DATA: '/var/lib/postgresql/data',
  MINIO_DATA: '/data',
} as const;

// Default credentials (for development only)
export const DEFAULT_CREDENTIALS = {
  POSTGRES: {
    USER: 'postgres',
    PASSWORD: 'postgres',
    DB: 'postgres',
  },
  MINIO: {
    ROOT_USER: 'minioadmin',
    ROOT_PASSWORD: 'minioadmin123',
  },
} as const;

// API versions
export const API_VERSIONS = {
  V1: '/api/v1',
  TRPC: '/trpc',
} as const;