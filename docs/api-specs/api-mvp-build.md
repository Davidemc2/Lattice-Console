# API MVP Build Plan

## MVP Scope
- Auth (login, register, logout, refresh)
- Workloads (CRUD, logs, metrics)
- Nodes (register, list, details, metrics)
- Marketplace (list, deploy)

## Sprint 1 Endpoints
- POST /api/v1/auth/register — Register new user
- POST /api/v1/auth/login — User login
- POST /api/v1/auth/logout — User logout
- GET /api/v1/users/me — Get current user profile
- GET /api/v1/workloads — List workloads
- POST /api/v1/workloads — Deploy new workload
- GET /api/v1/workloads/{id} — Get workload details

## Sprint 2 Endpoints
- PATCH /api/v1/workloads/{id} — Update workload
- DELETE /api/v1/workloads/{id} — Delete workload
- GET /api/v1/workloads/{id}/logs — Get workload logs
- GET /api/v1/workloads/{id}/metrics — Get workload metrics
- GET /api/v1/nodes — List nodes
- POST /api/v1/nodes — Register new node
- GET /api/v1/nodes/{id} — Get node details
- GET /api/v1/nodes/{id}/metrics — Get node metrics

## Sprint 3 Endpoints
- PATCH /api/v1/users/me — Update profile
- GET /api/v1/marketplace — List marketplace apps
- GET /api/v1/marketplace/{id} — Get app details
- POST /api/v1/marketplace/{id}/deploy — Deploy marketplace app

## Dependencies
- Auth endpoints must be implemented before protected endpoints
- Workload and node endpoints depend on database and orchestration integration
- Marketplace endpoints depend on workload deployment logic

## Acceptance Criteria (Examples)
- All endpoints return correct status codes and error messages
- Auth endpoints issue and validate JWT tokens
- Workload deploy returns workload ID and status
- Node registration validates and stores node info
- Marketplace deploy triggers workload creation 