import { z } from 'zod';

// Common validation schemas
export const EmailSchema = z.string().email('Invalid email address');
export const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const IdSchema = z.string().min(1, 'ID is required');
export const NameSchema = z.string().min(1, 'Name is required').max(255);

// User schemas
export const UserCreateSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: NameSchema.optional(),
});

export const UserLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Workload schemas
export const WorkloadTypeSchema = z.enum(['postgres', 'minio', 'custom']);

export const WorkloadCreateSchema = z.object({
  name: NameSchema,
  type: WorkloadTypeSchema,
  image: z.string().optional(),
  resources: z.object({
    cpu: z.number().min(0.1).max(16).default(1),
    memory: z.number().min(128).max(32768).default(512),
    storage: z.number().min(1).max(1000).default(10),
  }).optional(),
  env: z.record(z.string()).optional(),
  ports: z.array(z.number()).optional(),
});

export const WorkloadStatusSchema = z.enum([
  'pending',
  'provisioning',
  'running',
  'stopping',
  'stopped',
  'error',
]);

// Docker schemas
export const DockerImageSchema = z.string().regex(
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[a-z0-9]+(?:[._-][a-z0-9]+)*)?(?:@[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/i,
  'Invalid Docker image format'
);

export const PortMappingSchema = z.object({
  host: z.number().min(1).max(65535),
  container: z.number().min(1).max(65535),
  protocol: z.enum(['tcp', 'udp']).default('tcp'),
});

// Environment variable schema
export const EnvVarSchema = z.object({
  key: z.string().regex(/^[A-Z_][A-Z0-9_]*$/i, 'Invalid environment variable name'),
  value: z.string(),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Response schemas
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// Type exports
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type WorkloadCreate = z.infer<typeof WorkloadCreateSchema>;
export type WorkloadType = z.infer<typeof WorkloadTypeSchema>;
export type WorkloadStatus = z.infer<typeof WorkloadStatusSchema>;
export type PortMapping = z.infer<typeof PortMappingSchema>;
export type EnvVar = z.infer<typeof EnvVarSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;