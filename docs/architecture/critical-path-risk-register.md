# Critical Path & Risk Register: MVP (First Principles)

## Critical Path to MVP

1. **Blockchain Layer**
   - Deploy Cosmos SDK/Tendermint testnet
   - Implement provider registration, resource registry, and payment escrow smart contracts
2. **Node Software**
   - Build node daemon (blockchain client + Kubernetes integration)
   - Enable node registration, heartbeat, and resource reporting
3. **Kubernetes Orchestration**
   - Deploy multi-tenant Kubernetes cluster(s)
   - Implement workload deployment via API
4. **API Layer**
   - Expose REST API for workload deployment, node management, and user auth
5. **Frontend (Next.js)**
   - Build dashboard for workload deployment and monitoring
6. **End-to-End Test**
   - User deploys workload via UI/API
   - Workload scheduled on a registered node
   - Payment escrowed and released on completion

## Existential Risks & Mitigations

| Risk                                 | Mitigation                                      |
|--------------------------------------|-------------------------------------------------|
| Blockchain consensus failure         | Use proven BFT consensus, monitor, auto-recover |
| Node software bugs                   | CI/CD, automated tests, canary deploys          |
| Kubernetes security breach           | Hardened configs, RBAC, network policies        |
| API auth/session compromise          | JWT/OAuth2, rate limiting, audit logs           |
| Payment/escrow logic failure         | Smart contract audits, testnets, bug bounties   |
| No nodes join network                | Incentives, easy onboarding, community outreach |
| Workload scheduling fails            | Fallbacks, manual override, monitoring          |
| Data loss/corruption                 | Backups, redundancy, integrity checks           |
| Regulatory non-compliance            | Privacy by design, legal review, compliance doc |
| Talent/maintainer attrition          | Open-source incentives, clear governance        | 