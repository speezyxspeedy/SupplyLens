# SupplyLens

### Understand every dependency in your project.

SupplyLens is a **local-first software dependency intelligence and SBOM-style inventory tool** for Node.js / npm projects. It parses `package.json`, `package-lock.json` (v1, v2, v3), and `npm-shrinkwrap.json` strictly inside your browser to construct real direct and transitive dependency graphs, detect duplicate package versions, trace dependency paths, check manifest/lockfile consistency, and export machine-readable component inventories.

---

## Problem Statement

Modern JavaScript projects routinely pull in hundreds of transitive packages. Developers often only see top-level entries in `package.json`, making it difficult to understand:
- Which resolved versions are actually locked in `package-lock.json`.
- How a deep transitive package entered the project.
- Why multiple versions of a package (e.g. `semver`) exist in the tree.
- Whether `package.json` and `package-lock.json` have drifted out of sync.

SupplyLens answers these questions locally with zero network requests and zero external code uploads.

---

## Key Features

- **Three Local Import Methods**: Project folder picker (`webkitdirectory`), local ZIP extraction via JSZip (with path-traversal and ZIP-bomb safeguards), and individual manifest/lockfile selection.
- **Multi-Manifest & Workspace Discovery**: Identifies root and nested workspace `package.json` files without silently mixing unrelated projects.
- **Genuine npm Manifest & Lockfile Parsing**:
  - `package.json` parser preserving `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `bundledDependencies`, and `workspaces`.
  - `package-lock.json` v2 and v3 `packages` map parser.
  - `package-lock.json` v1 recursive `dependencies` parser.
  - `npm-shrinkwrap.json` support.
  - Honest **Manifest Only** fallback when no lockfile exists (never fabricates resolved versions or transitive trees).
- **npm Ancestor Resolution Engine**: Resolves nested `node_modules` lookups, workspace links, unresolved references, and dependency cycles safely.
- **Interactive SVG Dependency Graph**: Zoom, pan, fit-to-screen, package search, path-to-root highlighting, dependency-type filters, branch collapse/expand, depth bounds, and node/edge inspectors.
- **Dependency Explorer & Path Tracer**: Sortable/filterable package table, shortest-path and bounded parent-path tracing, and cycle-safe downstream subtrees.
- **Duplicate Version Detection**: Groups packages installed in multiple versions or nested paths without falsely labeling duplicates as security vulnerabilities.
- **Manifest & Lockfile Health Analyzer**: Flags structural issues across `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `INFO` severities.
- **Insights & License Inventory**: Composition, depth distribution, largest branches, metadata coverage, and local license metadata inventory without legal conclusions.
- **SBOM-Style Inventory Export**: JSON, formula-injection-protected CSV, and HTML-escaped printable reports.
- **Local Scan History & Settings**: Stores non-sensitive preferences and scan summary metadata in browser `localStorage`, including two-scan comparison.
- **Built-in Demo Project**: Realistic fictional Node.js project (`@acme-fictional/orbit-telemetry-cli`) processed through the complete parsing and graph pipeline.

---

## Technology Stack

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS v4** (Dark Graphite default theme + Light theme)
- **Lucide React**
- **JSZip**
- **Web Workers** for off-main-thread parsing and graph construction
- **Vitest** for automated unit and pipeline tests

---

## Architecture Overview

```
Import (Folder / ZIP / Files / Demo)
  └── File Discovery Engine (exclusions, size checks, workspace discovery)
        └── Manifest Parser (package.json) + Lockfile Parser (v1 / v2 / v3 / shrinkwrap)
              └── Ancestor Dependency Resolver (cycle-safe, workspace-aware, unresolved-explicit)
                    └── Graph Engine (BFS depth, node/edge metrics)
                          ├── Duplicate Version Analyzer
                          ├── Path Analyzer (shortest path, bounded parent paths)
                          ├── Health Analyzer (consistency & metadata checks)
                          ├── License Analyzer (declared metadata only)
                          ├── Insights Engine
                          └── Report Exporter (JSON / CSV / Printable HTML)
```

---

## Privacy & Security Model

- **100% Local Execution**: All parsing and graph processing runs inside your browser memory and Web Worker.
- **Zero Registry Calls / Zero Telemetry**: SupplyLens makes no requests to npm or external APIs.
- **Safe File Handling**: Never executes uploaded files, never runs `npm` scripts, blocks ZIP path traversal (`..`, absolute paths), and enforces archive/file expansion limits.
- **Safe Exports**: CSV cells neutralize spreadsheet formula injection (`=`, `+`, `-`, `@`); HTML reports escape all project strings.

---

## Supported Lockfile Versions & Known Limitations

- **Initial Ecosystem Focus**: npm (`package.json`, `package-lock.json` v1/v2/v3, `npm-shrinkwrap.json`). Yarn, pnpm, Python, Rust, Go, and Java are not yet supported.
- **Lockfile v1 Limitations**: npm lockfile v1 does not record license identifiers and does not store root `devDependencies` separately; `package.json` is used to classify direct dependency types.
- **No Vulnerability Claims**: SupplyLens does not bundle or query a CVE advisory database and never fabricates vulnerability alerts.
- **License Inventory Limitations**: Extracted strictly from local lockfile `license` fields. Missing metadata is clearly separated and no legal compatibility conclusions are drawn.
- **Non-Certified Inventory**: Exported JSON/CSV/HTML reports include an explicit notice that they are locally generated dependency inventories rather than certified CycloneDX or SPDX documents.

---

## Setup & Commands (Windows 11 / macOS / Linux & VS Code)

### Prerequisites
- **Node.js 20+** and **npm**
- **VS Code** (recommended extensions: ESLint, Tailwind CSS IntelliSense)

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open the local URL printed in the terminal (port `3000`).

### Run Automated Tests
```bash
npm test
```

### Run TypeScript Checks
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Using the Built-In Demo Project
Click **Load Demo Project** in the sidebar or Overview page to load `@acme-fictional/orbit-telemetry-cli` and inspect a multi-version, cyclic, optional/peer-populated dependency graph through the real parser pipeline.

---

## Future Roadmap

- `pnpm-lock.yaml` and `yarn.lock` parsers via ecosystem plugin adapters.
- Optional offline user-imported OSV/advisory JSON matching.
- Graph export to SVG/PNG.
- Monorepo cross-workspace dependency matrix.
