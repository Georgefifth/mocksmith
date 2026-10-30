# AGENTS.md - MockSmith Project Guidelines

## 1. Project Overview & Objectives
- **Name**: MockSmith
- **Goal**: A zero-configuration stateful mock server and network chaos sandbox that ingests OpenAPI 3.0/3.1 or sample JSON models and provides a live relational REST backend with embedded browser dashboard and chaos simulation.
- **Core Principle**: Real developer utility over superficial complexity. Provide an instant, dependable, local-first developer experience without mandatory cloud logins or external dependencies.

---

## 2. System Architecture
- **Runtime**: Node.js (>= 18.0.0, current LTS / v20+ / v26)
- **Language**: TypeScript (strict mode enabled)
- **Core Modules**:
  1. `src/engine/store.ts`: In-memory relational store with automatic schema indexing, ID generation (UUID/numeric), filtering, sorting, pagination, cascade queries, and file snapshotting (`--persist`).
  2. `src/engine/schema-parser.ts`: OpenAPI 3.0 / 3.1 & JSON parser. Automatically extracts paths, resources, request/response schemas, and builds dynamic routes.
  3. `src/engine/faker-lite.ts`: Zero-dependency deterministic smart mock data generator using field names and semantic heuristics (`email`, `avatar`, `name`, `timestamp`, `currency`, `status`).
  4. `src/engine/chaos.ts`: Pluggable network interceptor handling latency delays, jitter, randomized HTTP failure codes (400, 401, 403, 404, 429, 500, 503), and auth simulation.
  5. `src/dashboard/`: Zero-dependency single-page web UI served at `/_mocksmith` with live SSE (Server-Sent Events) traffic stream, interactive state viewer, and live chaos configuration sliders.
  6. `src/server.ts`: HTTP / REST server orchestrating route matching, chaos middleware, store interactions, and SSE event dispatch.
  7. `src/cli.ts`: Clean, informative CLI with ASCII art, route overview, and terminal status indicators.

---

## 3. Development Constraints
- **Strict English**: All code, comments, commit messages, documentation, and error messages must be in English.
- **Zero Heavy Dependencies**: Avoid heavy binary native extensions where pure JS/TS alternatives exist (ensuring instant cross-platform portability across Linux, macOS, and Windows without build failures).
- **Local-First & Privacy Preserving**: Zero external network telemetry, zero forced account registrations, zero cloud leakage. All data remains strictly local.
- **Documentation Integrity**: Maintain code docstrings and update `SPEC.md` and `README.md` whenever architectural contracts change.

---

## 4. Testing & Verification Standards
- **Framework**: Vitest / Node test runner.
- **Coverage Areas**:
  - `store.test.ts`: CRUD operations, pagination, filtering, relational sub-resource queries, persistence.
  - `chaos.test.ts`: Latency injection, error rate calculations, auth header validation.
  - `schema-parser.test.ts`: OpenAPI path discovery, schema extraction, mock item synthesis.
  - `server.test.ts`: End-to-end HTTP requests across routes with headers and status codes.
- **Verification Rule**: All tests must pass cleanly (`npm test`) before considering any feature complete.

---

## 5. Quality Standards & Code Style
- Clean, modular TypeScript with strict type annotations.
- Comprehensive error handling with user-friendly messages for invalid OpenAPI YAML/JSON inputs.
- Clean REST conventions (`200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `404 Not Found`).
- CORS enabled by default for seamless browser frontend development.
