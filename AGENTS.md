# AGENTS.md

## Project Overview
A brief description of what this repository does.
- **Tech Stack:** ( TypeScript, OpenUI5, Node.js)
- **Package Manager:** (npm)

## Dev Environment & Setup
Commands the agent should run to prepare its temporary VM:
- **Install:** `npm install`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Testing Instructions
Jules needs to verify its work before creating a PR.
- **Run all tests:** `npm run test`
- **Coverage:** Tests must maintain at least 80% coverage.
- **Style:** Prefer `vitest` for unit tests and `playwright` for E2E.

## Local Infrastructure (Critical)
Since the environment uses specific DNS/Network tools:
- **DNS:** This project is developed in an environment using **Unbound** and **AdGuard Home**.          
- **Constraint:** Do not attempt to modify `/etc/resolv.conf` or local network interface settings unless explicitly asked.
- **Networking:** Assume outbound port 53 is managed; use standard hostnames.

## Coding Standards
- **Naming:** Use PascalCase for components, camelCase for functions.
- **Patterns:** Prefer functional components over classes.
- **Documentation:** Every new public function must have a TSDoc/JSDoc comment.

## Git Workflow
- **Branching:** Use `feature/` or `fix/` prefixes.
- **Commits:** Follow Conventional Commits (e.g., `feat: add auth`).
- **PRs:** Jules should always include a summary of "Why" the change was made, not just "What" was changed.