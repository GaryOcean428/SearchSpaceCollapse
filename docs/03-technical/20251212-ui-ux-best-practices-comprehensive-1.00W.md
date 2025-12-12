---
id: ISMS-TECH-020
title: UI/UX Best Practices - Comprehensive Guide
filename: 20251212-ui-ux-best-practices-comprehensive-1.00W.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Working
function: "Comprehensive UI/UX best practices for AI/data search tools on Replit"
created: 2025-12-12
last_reviewed: 2025-12-12
next_review: 2026-06-12
category: Technical
supersedes: null
---

# UI/UX Best Practices: Comprehensive Guide for AI/Data Search Tools on Replit

## Overview

This document provides comprehensive UI/UX best practices for building robust, accessible, and user-friendly AI/data search applications on Replit, with specific focus on React, Radix UI, TypeScript, and Python backend architecture.

## Core Principles

### 1. Consistency
- **Design System**: Use a single UI paradigm throughout the application
  - Current stack: Radix UI primitives + Tailwind CSS utility classes
  - All components use consistent spacing (Tailwind units: 4, 6, 8, 12, 16, 20)
  - Typography follows defined scale (see Design Guidelines)
  - Colors use CSS variables for theme consistency

### 2. Accessibility (a11y)
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
  - Tab order follows logical reading order
  - Focus indicators are clearly visible
  - Modal traps focus appropriately (using Radix Dialog)
  - Esc key closes dialogs/modals
  
- **ARIA Labels**: Semantic HTML with proper ARIA attributes
  - Use `aria-label` for icon buttons
  - Use `aria-describedby` for help text
  - Use `role` attributes only when semantic HTML isn't sufficient
  - Screen reader testing with NVDA/JAWS
  
- **Color Contrast**: WCAG 2.1 Level AA compliance
  - Text: Minimum 4.5:1 contrast ratio
  - Large text (18pt+): Minimum 3:1
  - UI components: Minimum 3:1
  - Tools: axe DevTools, Lighthouse accessibility audit
  
- **Touch Targets**: Minimum 44x44px for mobile/touch interfaces

### 3. Responsive Design
- **Fluid Layouts**: Never rely on fixed widths
  - Use CSS Grid and Flexbox
  - Media queries for breakpoints (sm, md, lg, xl, 2xl)
  - Container queries where appropriate
  - Mobile-first approach
  
- **Adaptive Components**: Components adjust to viewport
  - Navigation collapses to hamburger on mobile
  - Tables become cards on small screens
  - Touch-friendly controls on mobile devices

### 4. Performance
- **Code Splitting**: Lazy-load heavy components
  ```tsx
  const HeavyComponent = lazy(() => import('./HeavyComponent'));
  ```
  
- **Render Optimization**:
  - Use `React.memo()` for expensive pure components
  - Use `useCallback()` for function props
  - Use `useMemo()` for expensive computations
  - Avoid inline object/array creation in render
  
- **Loading States**: Show skeletons/placeholders during async operations
  - Use Skeleton component for content loading
  - Show spinners for button actions
  - Implement progressive loading for large datasets

### 5. Feedback Everywhere
- **Async Operations**: User must always know system state
  - Show loading spinner/skeleton during fetch
  - Display toast notifications for success/error
  - Disable buttons during submission
  - Show progress bars for long operations
  
- **Form Validation**: Immediate, inline feedback
  - Validate on blur for individual fields
  - Show error messages inline below field
  - Disable submit until form is valid
  - Use React Hook Form + Zod for validation

### 6. Progressive Disclosure
- **Information Hierarchy**: Don't overwhelm users
  - Show critical information first
  - Hide advanced options behind accordions/dialogs
  - Use "More filters" pattern for search
  - Implement collapsible sections for dense content

### 7. Clarity & Simplicity
- **Clear Labeling**: Every control is labeled
  - Use `<Label>` component from Radix
  - Add tooltips for technical terms
  - Write active voice ("Search", "Upload", not "Searching...")
  - Include contextual help text

### 8. Undo/Cancel
- **Reversible Actions**: Allow users to undo mistakes
  - Confirmation dialogs for destructive actions
  - Toast notifications with "Undo" action where possible
  - Cancel buttons for long operations
  - Show progress and allow cancellation

### 9. Input Validation
- **Dual Validation**: Validate on both frontend and backend
  - Frontend: Immediate feedback (Zod schemas)
  - Backend: Security validation (Pydantic)
  - Never trust client-side validation alone
  - Show specific error messages

### 10. Session Management
- **Auth State Handling**: Graceful session management
  - Detect session expiration via 401 responses
  - Show re-authentication modal
  - Preserve user work during re-auth
  - Clear sensitive data on logout

### 11. Secure Handling
- **Input Sanitization**: Always sanitize/validate inputs
  - Use Zod schemas for type safety
  - Escape HTML in user-generated content
  - Validate file uploads
  - Never expose API keys in client code
  
- **XSS Prevention**: Sanitize before rendering
  - Use React's built-in XSS protection
  - Avoid `dangerouslySetInnerHTML` unless necessary
  - Sanitize with DOMPurify if rendering HTML

### 12. Error Handling
- **User-Friendly Messages**: Clear, actionable error feedback
  - Show what went wrong
  - Explain why it happened
  - Suggest how to fix it
  - Log technical details for developers
  
- **Error Boundaries**: Catch rendering errors
  - Use React Error Boundaries
  - Show fallback UI
  - Report to error tracking service
  - Allow recovery without page refresh

## UI Wiring Checklist: API Coverage Matrix

### Purpose
Ensure 100% backend feature coverage in frontend UI. Every backend capability must be discoverable and testable through the UI.

### Process

#### 1. Inventory Backend Endpoints
Document every backend route, method, and parameter:

**Example Structure:**
```
Endpoint: POST /api/ocean/cycles/:type
Purpose: Trigger Ocean autonomic cycle
Parameters: type (sleep|dream|mushroom)
Auth Required: Yes
Response: Cycle status
```

**Current Endpoint Count:** 36+ endpoints across multiple domains

#### 2. Map Endpoints to UI Elements
For each backend endpoint, identify:
- [ ] **UI Control**: Button, form, or menu item
- [ ] **Location**: Which page/component
- [ ] **Discoverability**: Is it visible/findable?
- [ ] **State Management**: How is response handled?
- [ ] **Error Handling**: How are errors displayed?
- [ ] **Loading State**: What shows during request?

#### 3. Verify Parameter Coverage
For endpoints with parameters:
- [ ] Each query parameter has a UI control (filter, input, select)
- [ ] Pagination controls exist for paginated endpoints
- [ ] Sort controls exist for sortable endpoints
- [ ] Advanced options are accessible (even if hidden by default)

#### 4. Mutation Testing
For all POST/PUT/DELETE endpoints:
- [ ] Loading indicator shows during request
- [ ] Button/control is disabled while pending
- [ ] Success feedback is displayed (toast, message)
- [ ] Error feedback is displayed with retry option
- [ ] Optimistic UI updates where appropriate
- [ ] State refresh after mutation

#### 5. Auth Wiring
- [ ] Auth-required endpoints hide controls when unauthenticated
- [ ] Login/logout flow is clear
- [ ] Session expiration shows re-auth dialog
- [ ] Unauthorized actions show permission error

#### 6. Edge Cases & Limits
- [ ] Rate limits surface in UI ("Too many requests")
- [ ] Pagination limits are visible
- [ ] Search result caps are communicated
- [ ] Backend constraints are user-friendly

#### 7. Health Check
- [ ] Backend health endpoint exists
- [ ] UI pings health on load
- [ ] Connection errors show user-friendly message
- [ ] Retry mechanism for transient failures

#### 8. Logging & Telemetry
- [ ] User-visible errors are friendly
- [ ] Technical details logged to console
- [ ] Error tracking service integration
- [ ] Analytics for user interactions

## API Coverage Matrix: Current State

### Olympus Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/olympus/status` | GET | Status display | Olympus page | ✅ Complete |
| `/api/olympus/zeus/chat` | POST | Chat input | Zeus Chat component | ✅ Complete |
| `/api/olympus/zeus/search` | POST | Search form | Zeus Chat component | ✅ Complete |
| `/api/olympus/war/blitzkrieg` | POST | Blitzkrieg button | War Status panel | ✅ Complete |
| `/api/olympus/war/siege` | POST | Siege button | War Status panel | ✅ Complete |
| `/api/olympus/war/hunt` | POST | Hunt button | War Status panel | ✅ Complete |
| `/api/olympus/war/end` | POST | End War button | War Status panel | ✅ Complete |
| `/api/olympus/shadow/status` | GET | Shadow status | Shadow tab | ✅ Complete |
| `/api/olympus/shadow/poll` | POST | Poll button | Shadow tab | ✅ Complete |
| `/api/olympus/shadow/:godName/act` | POST | Act buttons | Shadow tab | ✅ Complete |

### Ocean Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/ocean/cycles` | GET | Cycle display | Home page | ✅ Complete |
| `/api/ocean/cycles/:type` | POST | Cycle buttons | Home page | ✅ Complete |
| `/api/ocean/neurochemistry` | GET | Neurochemistry panel | Home page | ✅ Complete |
| `/api/ocean/neurochemistry/boost` | POST | Boost controls | Admin panel | ✅ Complete |

### Consciousness Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/consciousness/state` | GET | Consciousness dashboard | Home page | ✅ Complete |
| `/api/consciousness/complete` | GET | Full metrics | Consciousness component | ✅ Complete |
| `/api/consciousness/beta-attention` | GET | Beta attention display | Beta Attention component | ✅ Complete |

### Recovery Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/recovery/start` | POST | Start button | Recovery page | ✅ Complete |
| `/api/recovery/stop` | POST | Stop button | Recovery page | ✅ Complete |
| `/api/recovery/candidates` | GET | Candidates list | Recovery page | ✅ Complete |

### Observer Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/observer/addresses/dormant` | GET | Address list | Observer page | ✅ Complete |
| `/api/observer/workflows` | GET | Workflow list | Observer page | ✅ Complete |
| `/api/observer/qig-search/start` | POST | Start search button | Observer page | ✅ Complete |
| `/api/observer/qig-search/stop/:address` | POST | Stop button | Observer page | ✅ Complete |

### Target Addresses Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/target-addresses` | GET | Address list | Recovery page | ✅ Complete |
| `/api/target-addresses` | POST | Add address form | Recovery page | ✅ Complete |
| `/api/target-addresses/:id` | DELETE | Delete button | Address list item | ✅ Complete |

### Forensic Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/forensic/analyze/:address` | GET | Analyze button | Forensic Investigation | ✅ Complete |
| `/api/forensic/hypotheses` | GET | Hypotheses list | Forensic Investigation | ✅ Complete |

### Balance Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/balance-hits` | GET | Balance hits list | Recovery Results | ✅ Complete |
| `/api/balance-queue/status` | GET | Queue status | Balance Queue component | ✅ Complete |
| `/api/balance-monitor/status` | GET | Monitor status | Balance Monitor component | ✅ Complete |
| `/api/balance-monitor/refresh` | POST | Refresh button | Balance Monitor component | ⚠️ Needs verification |

### Sweeps Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/sweeps` | GET | Sweeps list | Recovery page | ⚠️ UI needs improvement |
| `/api/sweeps/stats` | GET | Stats display | Recovery page | ⚠️ UI needs improvement |
| `/api/sweeps/:id/audit` | GET | Audit button | Sweep detail | ⚠️ UI missing |
| `/api/sweeps/:id/approve` | POST | Approve button | Sweep detail | ⚠️ UI missing |
| `/api/sweeps/:id/reject` | POST | Reject button | Sweep detail | ⚠️ UI missing |
| `/api/sweeps/:id/broadcast` | POST | Broadcast button | Sweep detail | ⚠️ UI missing |

### Auth Domain
| Endpoint | Method | UI Element | Location | Status |
|----------|--------|------------|----------|--------|
| `/api/auth/user` | GET | User state | Global | ✅ Complete |
| `/api/auth/login` | POST | Login form | Landing page | ✅ Complete |
| `/api/auth/logout` | POST | Logout button | Sidebar | ✅ Complete |

## React/TypeScript Best Practices

### Component Structure
```tsx
// ✅ GOOD: Proper component structure
import { FC, memo } from 'react';
import { Button } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/api/routes';

interface Props {
  userId: string;
  onUpdate?: () => void;
}

export const UserProfile: FC<Props> = memo(({ userId, onUpdate }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.user.profile(userId),
    queryFn: () => api.user.getProfile(userId),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>{data.name}</CardHeader>
      <CardContent>{data.email}</CardContent>
    </Card>
  );
});

UserProfile.displayName = 'UserProfile';
```

### Hooks Pattern
```tsx
// ✅ GOOD: Extract logic to custom hooks
export function useUserProfile(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.user.profile(userId),
    queryFn: () => api.user.getProfile(userId),
  });

  const updateMutation = useMutation({
    mutationFn: api.user.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user.profile(userId) });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return { data, isLoading, error, update: updateMutation.mutate };
}
```

### Service Layer Pattern
```tsx
// ✅ GOOD: Service layer in lib/services/
// client/src/lib/services/user.ts
import { get, post, put, del } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { User, UpdateUserDTO } from '@/types';

export const userService = {
  getProfile: (id: string) => 
    get<User>(API_ROUTES.user.profile(id)),
  
  updateProfile: (id: string, data: UpdateUserDTO) =>
    put<User>(API_ROUTES.user.profile(id), data),
  
  deleteProfile: (id: string) =>
    del(API_ROUTES.user.profile(id)),
};
```

### Form Handling
```tsx
// ✅ GOOD: React Hook Form + Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.auth.login(data);
      toast.success('Login successful');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

## Radix UI Best Practices

### Dialog Pattern
```tsx
// ✅ GOOD: Accessible dialog with Radix
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Tooltip Pattern
```tsx
// ✅ GOOD: Informative tooltips
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

export function HelpText({ children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help information">
          <InfoIcon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

## Replit-Specific Considerations

### 1. File System Handling
```tsx
// ✅ GOOD: Handle file system errors gracefully
async function saveData(data: unknown) {
  try {
    await api.storage.save(data);
    toast.success('Data saved successfully');
  } catch (error) {
    if (error.code === 'ENOSPC') {
      toast.error('Storage full. Please free up space.');
    } else if (error.code === 'EACCES') {
      toast.error('Permission denied. Check file permissions.');
    } else {
      toast.error('Failed to save data');
    }
    console.error('Storage error:', error);
  }
}
```

### 2. Environment Variables
```tsx
// ✅ GOOD: Use environment variables for API URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// In api client:
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
```

### 3. Hot Reload Setup
Ensure `vite.config.ts` supports hot reload:
```ts
export default defineConfig({
  server: {
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()],
});
```

### 4. Development/Production Parity
```tsx
// ✅ GOOD: Mock data for development
const useMockData = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';

export function useUserData() {
  if (useMockData) {
    return { data: mockUser, isLoading: false, error: null };
  }
  return useQuery({ queryKey: ['user'], queryFn: api.user.getCurrent });
}
```

### 5. Deployment Checklist
- [ ] `.replit` file configured with correct run command
- [ ] `build` script in package.json works
- [ ] Environment variables documented in README
- [ ] Database migrations run automatically
- [ ] Health check endpoint returns 200
- [ ] Error logging configured
- [ ] HTTPS enabled in production

## Testing Best Practices

### Unit Tests (Vitest)
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should show validation error for invalid email', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);
    
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
  });
  
  it('should disable submit button while submitting', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });
});
```

### Accessibility Tests
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('LoginForm accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### E2E Tests (Playwright)
```ts
import { test, expect } from '@playwright/test';

test('user can complete login flow', async ({ page }) => {
  await page.goto('/');
  
  // Check keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('id', 'email');
  
  // Test form submission
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  
  // Verify success
  await expect(page.locator('[role="alert"]')).toContainText('Login successful');
});
```

## Security Checklist

- [ ] Input validation on both frontend and backend
- [ ] XSS prevention (escape user content)
- [ ] CSRF protection (credentials: 'include')
- [ ] Auth tokens in httpOnly cookies (never localStorage)
- [ ] Rate limiting on sensitive endpoints
- [ ] Content Security Policy headers
- [ ] HTTPS in production
- [ ] Secrets in environment variables (never in code)
- [ ] SQL injection prevention (parameterized queries)
- [ ] File upload validation (type, size, content)

## Performance Checklist

- [ ] Code splitting for routes
- [ ] Lazy loading for heavy components
- [ ] Image optimization (WebP, lazy loading)
- [ ] Bundle size monitoring (<1MB initial)
- [ ] React.memo for expensive components
- [ ] useMemo/useCallback for expensive operations
- [ ] Debounce for search inputs
- [ ] Pagination for large lists
- [ ] Skeleton loaders for async content
- [ ] Service worker for offline support

## Accessibility Checklist

- [ ] Keyboard navigation works for all interactions
- [ ] Focus indicators visible on all interactive elements
- [ ] Skip links for main content
- [ ] ARIA labels on all icon buttons
- [ ] Form labels associated with inputs
- [ ] Error messages announced to screen readers
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets at least 44x44px
- [ ] Motion reduced respects prefers-reduced-motion
- [ ] Page title updates on route changes

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [React Hook Form](https://react-hook-form.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Playwright Testing](https://playwright.dev/)
- [axe Accessibility Testing](https://www.deque.com/axe/)

## Related Documents

- `20251208-design-guidelines-ui-ux-1.00F.md` - Design system guidelines
- `20251208-api-documentation-rest-endpoints-1.50F.md` - API documentation
- `20251208-best-practices-ts-python-1.00F.md` - TypeScript/Python practices
- `20251208-testing-guide-vitest-playwright-1.00F.md` - Testing guide

---
**Document Status**: Working - Subject to updates as patterns evolve
**Last Updated**: 2025-12-12
