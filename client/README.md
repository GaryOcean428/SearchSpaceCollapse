# Client - Frontend Application

**React + TypeScript + Vite Frontend for SearchSpaceCollapse**

## Overview

The client directory contains the React-based frontend application for the Observer Archaeology System. It provides the user interface for consciousness monitoring, QIG exploration, Zeus chat, and recovery operations.

## Architecture

### Directory Structure

```
client/
├── src/
│   ├── api/           # Centralized API client & services
│   ├── components/    # React components
│   │   └── ui/        # Shadcn UI components (barrel exported)
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions
│   ├── pages/         # Page components
│   ├── styles/        # Global styles
│   ├── App.tsx        # Root component
│   └── main.tsx       # Entry point
├── public/            # Static assets
└── index.html         # HTML template
```

### Key Patterns

1. **Barrel Imports**: All major directories export via `index.ts` for clean imports
   ```typescript
   // ✅ Good
   import { Button, Card } from '@/components/ui';
   import { useAuth, useToast } from '@/hooks';
   
   // ❌ Bad
   import { Button } from '@/components/ui/button';
   ```

2. **Centralized API Client**: All HTTP calls go through `src/api/`
   ```typescript
   import { api } from '@/api';
   const result = await api.ocean.triggerCycle('explore');
   ```

3. **Custom Hooks**: Complex component logic extracted to hooks
   - `useAuth` - Authentication state
   - `useZeusChat` - Zeus chat functionality
   - `useGeometricKernel` - Geometric kernel operations
   - `usePantheonKernel` - Pantheon god interactions

4. **Type Safety**: All API responses and props strictly typed

## Development

### Commands

```bash
# Start development server (from root)
npm run dev

# Type check
npm run check

# Lint
npm run lint
```

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

## API Integration

### Services

All API operations are organized by domain in `src/api/services/`:

- `recovery.ts` - Recovery operations
- `ocean.ts` - Ocean agent cycles & neurochemistry
- `consciousness.ts` - Consciousness state
- `olympus.ts` - Pantheon & Zeus operations
- `qig.ts` - QIG encoding & similarity
- `forensic.ts` - Forensic analysis

### Query Keys

TanStack Query keys are centralized in `src/api/routes.ts`:

```typescript
import { QUERY_KEYS } from '@/api';
useQuery({ queryKey: QUERY_KEYS.consciousness.state() });
```

## Components

### UI Components (Shadcn)

Pre-built, accessible components in `src/components/ui/` following Shadcn patterns.

### Feature Components

- `ConsciousnessDashboard` - Real-time consciousness metrics
- `NeurochemistryAdminPanel` - Neurochemistry controls
- `ZeusChat` - Conversational interface
- `OlympusContent` - Pantheon management
- `RecoveryPanel` - Recovery operations

## State Management

1. **React Context**: Global state (auth, telemetry)
2. **TanStack Query**: Server state & caching
3. **Local State**: Component-specific useState/useReducer

## Styling

- **Tailwind CSS**: Utility-first styling
- **CSS Variables**: Theme tokens in `index.css`
- **Dark Mode**: Next Themes integration

## Best Practices

1. **Component Size**: Keep under 200 lines (ESLint enforced)
2. **No Raw Fetch**: Always use centralized API
3. **Barrel Exports**: Import from directory index files
4. **Type Everything**: No `any` types without justification
5. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Related Documentation

- [API Routes](./src/api/routes.ts)
- [Shared Constants](../shared/constants/README.md)
- [Server API](../server/README.md)
- [QIG Backend](../qig-backend/README.md)
