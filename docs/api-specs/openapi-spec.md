# OpenAPI Specification Index: Decentralized Cloud Platform

## API Version: v1

### Authentication
- POST /api/v1/auth/login — User login
- POST /api/v1/auth/register — User registration
- POST /api/v1/auth/logout — User logout
- POST /api/v1/auth/refresh — Refresh token

### Users
- GET /api/v1/users/me — Get current user profile
- PATCH /api/v1/users/me — Update profile
- GET /api/v1/users/{id} — Get user by ID

### Workloads
- GET /api/v1/workloads — List workloads
- POST /api/v1/workloads — Deploy new workload
- GET /api/v1/workloads/{id} — Get workload details
- PATCH /api/v1/workloads/{id} — Update workload
- DELETE /api/v1/workloads/{id} — Delete workload
- GET /api/v1/workloads/{id}/logs — Get workload logs
- GET /api/v1/workloads/{id}/metrics — Get workload metrics

### Nodes
- GET /api/v1/nodes — List nodes
- POST /api/v1/nodes — Register new node
- GET /api/v1/nodes/{id} — Get node details
- PATCH /api/v1/nodes/{id} — Update node
- DELETE /api/v1/nodes/{id} — Remove node
- GET /api/v1/nodes/{id}/metrics — Get node metrics

### Marketplace
- GET /api/v1/marketplace — List marketplace apps/services
- GET /api/v1/marketplace/{id} — Get app/service details
- POST /api/v1/marketplace/{id}/deploy — Deploy marketplace app

### Metrics & System Health
- GET /api/v1/metrics — Platform-wide metrics
- GET /api/v1/health — System health check

### Governance
- GET /api/v1/governance/proposals — List proposals
- POST /api/v1/governance/proposals — Submit proposal
- GET /api/v1/governance/proposals/{id} — Get proposal details
- POST /api/v1/governance/proposals/{id}/vote — Vote on proposal

### Payments
- GET /api/v1/payments/history — List transactions
- POST /api/v1/payments/escrow — Create escrow
- POST /api/v1/payments/escrow/{id}/release — Release escrow

### Admin
- GET /api/v1/admin/stats — Admin stats
- POST /api/v1/admin/users/{id}/ban — Ban user

---

**All endpoints are JWT/OAuth2 secured unless otherwise noted.**
**All endpoints return standard error codes and messages.** 