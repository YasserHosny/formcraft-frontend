# FormCraft Frontend

Angular frontend for the Universal Form Designer & Print Studio.

## Tech Stack

- **Angular 19** (latest LTS)
- **Angular Material** (UI components)
- **Konva.js** (canvas editor)
- **ngx-translate** (i18n with runtime switching)
- **Zod** (runtime validation)
- **RxJS** (reactive state)

## Project Structure

```
src/app/
├── core/              # Singleton services
│   ├── auth/          # AuthService, guards, interceptor
│   ├── i18n/          # DirectionService, LanguageService
│   ├── error-handler/ # GlobalErrorHandler
│   └── services/      # TemplateService
├── shared/            # SharedModule, directives, pipes, Material re-exports
├── models/            # TypeScript interfaces, element defaults
├── features/
│   ├── auth/          # Login page (lazy-loaded)
│   ├── templates/     # Template list (lazy-loaded)
│   └── designer/      # Design studio with Konva canvas (lazy-loaded)
└── app.module.ts      # Root module
```

## Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Dev Server

```bash
npm start
# Opens at http://localhost:4200
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Docker

```bash
docker build -t formcraft-frontend .
docker run -p 80:80 formcraft-frontend
```

## Key Features

- **Arabic-first, RTL-native** — Default direction is RTL, instant language toggle
- **Lazy-loaded modules** — Auth, Templates, Designer loaded on demand
- **Angular Material** — Consistent Material Design components
- **Translation-key architecture** — All strings via ngx-translate (`ar.json`, `en.json`)
- **Role-based routing** — AuthGuard + RoleGuard on all protected routes
- **Global error handler** — MatSnackBar toasts for unhandled errors

## Environment

| File | Purpose |
|------|---------|
| `src/environments/environment.ts` | Development (localhost:8000) |
| `src/environments/environment.prod.ts` | Production (relative /api) |
