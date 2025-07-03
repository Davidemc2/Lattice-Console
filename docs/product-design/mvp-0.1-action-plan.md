# MVP 0.1 Action Plan: Decentralized Cloud Platform (Node.js/tRPC/Next.js/Neon/Prisma)

## 🚀 Visual Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Lattice Console MVP 0.1                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Frontend (User Interface)                                │
│    - Next.js (React, TypeScript)                            │
│    - Tailwind CSS (for styling)                             │
│    - tRPC client (typed API calls)                          │
│    - Auth: JWT, session management                          │
├─────────────────────────────────────────────────────────────┤
│ 2. Backend API                                              │
│    - Node.js (TypeScript)                                   │
│    - tRPC (end-to-end typesafe API)                         │
│    - Neon (serverless Postgres) + Prisma ORM                │
│    - JWT Auth, CORS, input validation                       │
├─────────────────────────────────────────────────────────────┤
│ 3. Local Agent/Daemon (on ONIS MAF computer)                │
│    - Node.js (TypeScript)                                   │
│    - Docker SDK (for launching containers)                  │
│    - Ngrok/localtunnel (for remote access/tunneling)        │
│    - Exposes:                                               │
│        - Postgres container                                 │
│        - MinIO (S3-compatible) container                    │
│        - Other app containers (Nginx, Ubuntu, etc.)         │
├─────────────────────────────────────────────────────────────┤
│ 4. Networking & Security                                    │
│    - Ngrok/localtunnel for exposing local services          │
│    - HTTPS (self-signed for dev, Let's Encrypt for prod)    │
│    - JWT for all API endpoints                              │
│    - Password hashing (bcrypt)                              │
│    - CORS, input validation                                 │
├─────────────────────────────────────────────────────────────┤
│ 5. Storage                                                  │
│    - Postgres (as a container, managed by agent)            │
│    - MinIO (S3-compatible, as a container)                  │
│    - Docker volumes for persistent data                     │
├─────────────────────────────────────────────────────────────┤
│ 6. DevOps/Testing                                           │
│    - Docker Compose for local dev                           │
│    - GitHub Actions for CI/CD                               │
│    - Jest (unit/integration), Playwright (E2E)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Monorepo Directory Structure

```
/lattice-console
  /apps
    /frontend         # Next.js app
    /backend          # Node.js/tRPC API
    /agent            # Node.js Docker agent
  /packages
    /trpc             # Shared tRPC types, routers
    /ui               # Shared React UI components
    /utils            # Shared utilities (TS)
  /infra
    /docker           # Dockerfiles, compose
    /scripts          # Dev scripts
  /tests
    /e2e              # Playwright tests
    /integration      # API/agent tests
  /docs               # Specs, wireframes, API docs
  README.md
```

---

## 1. UI/UX Flows (Provisioning & Management)

### A. User Stories
- As a user, I can sign up, log in, and see my dashboard
- As a user, I can deploy a Postgres database (one click)
- As a user, I can deploy an S3 bucket (MinIO, one click)
- As a user, I can deploy a generic workload (choose image, set resources)
- As a user, I can view status, logs, and access info for each workload
- As a user, I can stop/restart workloads

### B. Pages & Components
- **Login/Signup Page**: Auth form, error handling
- **Dashboard**: List of workloads (name, type, status, access URL, actions)
- **Provision Modal**: Choose service (Postgres, S3, custom), set name/resources
- **Workload Details**: Status, logs (tail), access info, stop/restart
- **AccessLink**: Shows public URL, credentials (auto-generated per service)

### C. Acceptance Criteria
- All forms validate required fields, show errors
- Dashboard auto-refreshes (polling or websockets)
- User can access provisioned Postgres/MinIO from another computer
- Credentials are unique per workload, shown only to owner
- All loading/error states are handled gracefully

---

## 2. Backend (tRPC/Neon/Prisma) Implementation

### A. tRPC Routers & Procedures
- **auth:** register, login, logout, getSession
- **workload:** list, deploy, status, logs, stop, restart
- **provision:** postgres, minio, custom

### B. Prisma + Neon Integration
- Use Neon connection string in `.env` (never hardcode)
- Use Prisma Data Proxy or Neon's pooling for serverless compatibility
- Run `prisma migrate` for schema changes; migrations run in CI/CD
- Handle connection errors, query timeouts, and Prisma errors (e.g., unique constraint)
- On DB downtime, retry with exponential backoff, show user-friendly error
- All secrets/credentials in `.env` and Git-ignored

### C. API Contract Examples
- All inputs validated with zod
- All errors use tRPC error format (code, message, data)
- Example: `{ code: 'BAD_REQUEST', message: 'Name required' }`

### D. Auth & Security
- JWT for all endpoints (middleware)
- Passwords hashed with bcrypt
- CORS: allow only frontend origin
- Per-service credentials auto-generated, stored encrypted

### E. Persistent Storage
- Use Docker volumes for Postgres/MinIO data
- Store workload metadata in Neon via Prisma

---

## 3. Agent/Daemon Implementation (Node.js)

### A. Responsibilities
- Listen for deploy/stop/status/logs commands (tRPC or REST over local network)
- Launch Docker containers (Postgres, MinIO, custom)
- Map ports, start ngrok/localtunnel, return public URL
- Generate and inject credentials (e.g., POSTGRES_USER/PASSWORD)
- Track running containers, report status
- Collect and stream logs

### B. Example: Docker Launch Command
```
docker run -d --name mydb -e POSTGRES_USER=user123 -e POSTGRES_PASSWORD=pass456 -v mydb_data:/var/lib/postgresql/data -p 5432 <host_port> postgres:15
```

### C. Networking/Tunneling
- Use ngrok/localtunnel to expose mapped port (e.g., `ngrok tcp 5432`)
- Store public URL in workload record
- Return access URL and credentials to backend

### D. Security
- Only accept commands from backend (localhost or signed JWT)
- Validate all inputs (image name, resource limits)
- Never expose agent API to public

### E. Error Handling & Edge Cases
- Docker daemon not running: detect and alert
- Port conflicts: auto-select or retry with a new port
- Container startup failure: surface logs and error to user
- Volume mount errors: detect and handle
- Credential leakage: ensure credentials are only shown to the owner, never logged
- Agent not responding: timeout, retries, alert

---

## 4. Networking & Security
- JWT for all API endpoints
- CORS: allow only frontend origin
- Input validation: zod
- Passwords: bcrypt
- HTTPS: self-signed for dev, Let's Encrypt for prod
- Per-service credentials: auto-generate, show once to user
- Docker volumes for persistent data
- Never expose host system or agent API to public
- Brute force login attempts: rate limiting, lockout
- JWT expiration/refresh: handle token expiry gracefully
- Secrets in logs: ensure no sensitive data is logged

---

## 5. Testing & Operational Readiness
- **Unit Tests:** Jest for backend, agent, and shared packages
- **Integration Tests:** tRPC API to agent, agent to Docker, Neon/Prisma DB
- **E2E Tests:** Playwright for full user flows (login, deploy, access workload)
- **Manual Demo:** Step through all flows, check for errors, edge cases
- **CI/CD:** GitHub Actions runs all tests on PR/merge
- **Monitoring:** Basic health checks for backend, agent, and database
- **Logging:** Centralized, structured logs for all components
- **Backup/restore:** Document how to back up Neon DB and Docker volumes

---

## 6. Failure/Recovery/Incident Response
- **Database/Prisma/Neon:**
  - Connection pooling: use Neon's recommended pooling or Prisma Data Proxy
  - Migration failures: rollback plan, alert, block deploy
  - Schema drift: detect and alert if schema is out of sync
  - Query timeouts: set and handle, retry if safe
  - Unique constraint errors: handle and surface to user
  - DB downtime: retry/backoff, user-friendly error, alert
- **Agent/Container:**
  - Docker daemon not running: detect, alert, block deploy
  - Port conflicts: auto-select, retry, alert
  - Container startup failure: show logs, error to user
  - Volume mount errors: detect, alert
  - Credential leakage: never log secrets
- **Networking:**
  - Ngrok/localtunnel failure: retry, alert, fallback
  - Firewall issues: detect, surface to user
  - Public URL expiration: refresh or re-provision
- **Security:**
  - JWT expiration/refresh: handle gracefully
  - Brute force login: rate limiting, lockout
  - Secrets in logs: never log sensitive data
- **User Experience:**
  - All API/UI actions have clear loading and error feedback
  - Credential copy/paste: one-click copy for DB/S3 credentials
  - Access instructions: show clear instructions for connecting from another machine
- **Operational:**
  - Monitoring: health checks for all components
  - Logging: centralized, structured logs
  - Backup/restore: document and test

---

## 7. Customer Onboarding & Support
- **Onboarding:**
  - Welcome email with getting started guide
  - In-app onboarding tour (highlight deploy, access, credentials)
  - Clear instructions for connecting to Postgres/MinIO from another machine
- **Support:**
  - In-app feedback form or support email
  - Incident response: logs, health checks, and alerting for fast debugging

---

## 8. Demo Script & Expected Outputs
1. Start backend, agent, and frontend
2. Sign up and log in via UI
3. Deploy Postgres workload
   - UI shows "deploying..." then "running"
   - Access link appears (e.g., `tcp://abc123.ngrok.io:12345`)
   - Credentials shown (user/pass)
   - Connect from another computer (e.g., `psql` CLI)
4. Deploy MinIO (S3) workload
   - UI shows access URL, credentials
   - Connect from S3 client (e.g., `aws s3 ls --endpoint-url ...`)
5. Deploy custom workload (Nginx, Ubuntu, etc.)
   - UI shows access URL, logs
6. Stop workload, status updates to "stopped"

---

## 9. Timeline & Critical Path
- **Week 1:** Monorepo setup, backend/agent scaffolding, tRPC contracts, Docker SDK POC, Neon/Prisma integration
- **Week 2:** Frontend scaffolding, auth flows, dashboard, provision Postgres/MinIO
- **Week 3:** Agent integration, Docker/volume/credential flows, ngrok/localtunnel
- **Week 4:** UI polish, error handling, E2E tests, demo prep
- **Week 5:** Bugfixes, stretch goals (web shell, multi-user), launch

---

## 10. Launch Readiness Checklist
- [ ] All critical user stories implemented and tested
- [ ] Neon/Prisma DB integration with pooling, migrations, error handling
- [ ] All edge cases and failure/recovery scenarios tested
- [ ] All secrets/credentials handled securely
- [ ] All API/UI actions have loading/error feedback
- [ ] Unit, integration, and E2E tests passing in CI
- [ ] Demo script runs end-to-end without manual intervention
- [ ] Onboarding and support flows in place
- [ ] Monitoring, logging, and backup/restore documented

---

## 11. Mindset & Principles (Elon Musk Style)
- **First Principles:** Question every assumption. What is the minimum needed to prove the concept?
- **Zero Tolerance for Failure:** Every error is a blocker. Test, verify, automate.
- **Bias for Action:** Ship something that works, then improve it.
- **Learning Fast:** Every failure is a data point. Iterate quickly.
- **Ownership:** You are the architect, builder, and tester. Make it happen.
- **One-Shot, One-Kill:** Treat this as a rocket launch. No excuses, no shortcuts. Deliver.

---

**If you deliver this, you will have built the foundation for a new kind of cloud. Let's go.** 