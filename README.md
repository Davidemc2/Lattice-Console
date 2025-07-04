# Lattice Console E2E Tests

## 🚀 How to Run E2E Tests

1. **Start all required services:**
   - Backend API: `pnpm --filter @lattice-console/backend dev`
   - Frontend: `pnpm --filter @lattice-console/frontend dev`
   - Desktop App: `pnpm --filter @lattice-console/desktop dev`
   - (Or use Docker Compose if available)

2. **In a new terminal, run E2E tests:**
   ```sh
   cd e2e
   npx playwright test
   ```

## 🛠️ Debugging Failures
- If you see `ERR_CONNECTION_REFUSED`, make sure all services are running and accessible.
- Use Playwright's HTML report for detailed debugging:
  ```sh
  npx playwright show-report
  ```
- You can run a single test file:
  ```sh
  npx playwright test onboarding.spec.ts
  ```

## ✍️ Adding New E2E Tests
- Add new test files in this directory (`e2e/`).
- Use Playwright's API: https://playwright.dev/docs/test-intro
- Keep tests atomic and focused on user journeys.

## 🧑‍💻 Elon-Style Principles
- Ruthlessly eliminate ambiguity: every test should have a clear, user-facing outcome.
- Automate everything: if it can be tested, it should be tested.
- If a test fails, treat it as a production incident until root cause is found.

---

**MVP launch is now fully automated and testable.**
