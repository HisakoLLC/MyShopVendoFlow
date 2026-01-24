# Error Handling & Loading States Guide

## Overview

This guide documents the comprehensive error handling and loading state infrastructure implemented across the VendoFlow app.

## Components

### 1. Error Boundary (`app/error.tsx`)

Catches unhandled React errors and displays a user-friendly error page.

**Features:**
- Shows "Something went wrong" message
- "Try Again" button (resets error boundary)
- "Go Home" button (navigates to `/dashboard`)
- Logs errors to console (dev) or error tracking service (prod)
- Shows error details in development mode

**Usage:**
- Automatically catches errors in React component tree
- No manual setup required (Next.js handles it)

### 2. Skeleton Loaders (`components/ui/skeleton.tsx`)

Shadcn UI Skeleton component for loading states.

**Usage:**
```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-4 w-[250px]" />
```

### 3. Empty State Component (`components/EmptyState.tsx`)

Reusable empty state component with icon, title, description, and action.

**Usage:**
```tsx
import { EmptyState } from "@/components/EmptyState"
import { Package } from "lucide-react"

<EmptyState
  icon={Package}
  title="No products yet"
  description="Add your first style to get started."
  action={{
    label: "Add New Style",
    href: "/products/new",
  }}
/>
```

### 4. Error Handler (`lib/errors.ts`)

Centralized error handling utilities.

**Functions:**
- `getErrorMessage(error, fallback?)` - Get user-friendly error message
- `logError(error, context?)` - Log errors (console in dev, external service in prod)
- `handleSupabaseError(error)` - Handle Supabase-specific errors
- `isOffline()` - Check if user is offline

**Error Messages:**
- Predefined user-friendly messages for common errors
- Maps technical errors to user-friendly messages
- Handles Supabase error codes

**Usage:**
```tsx
import { getErrorMessage, logError, handleSupabaseError } from "@/lib/errors"

try {
  // ... operation
} catch (error) {
  logError(error, "operationName")
  const message = getErrorMessage(error, "Default message")
  toast.error(message)
}
```

### 5. Toast Helper (`lib/toast.ts`)

Centralized toast notification helpers.

**Functions:**
- `toastSuccess(message, options?)` - Green toast, auto-dismiss 3s
- `toastError(message, options?)` - Red toast, manual dismiss
- `toastInfo(message, options?)` - Blue toast, auto-dismiss 5s
- `toastWarning(message, options?)` - Yellow toast, auto-dismiss 4s
- `toastLoading(message)` - Loading toast
- `toastPromise(promise, messages)` - Promise-based toast

**Usage:**
```tsx
import { toastSuccess, toastError } from "@/lib/toast"

toastSuccess("Operation completed!")
toastError("Something went wrong")
```

### 6. Offline Banner (`components/OfflineBanner.tsx`)

Shows banner when user goes offline.

**Features:**
- Automatically detects online/offline status
- Shows yellow banner at top of page
- Auto-hides when connection restored

**Usage:**
- Already included in root layout
- No manual setup required

### 7. Form Validation (`lib/form-validation.ts`)

Form validation helpers and common schemas.

**Usage:**
```tsx
import { getFieldError, isFieldInvalid, getErrorClass } from "@/lib/form-validation"

// In form component
const error = getFieldError(formState.errors, "fieldName")
const hasError = isFieldInvalid(formState.errors, "fieldName")
const errorClass = getErrorClass(formState.errors, "fieldName")
```

## Implementation Patterns

### Server Components

```tsx
async function fetchData() {
  try {
    // ... fetch logic
  } catch (error) {
    logError(error, "fetchData")
    throw handleSupabaseError(error)
  }
}

async function PageContent() {
  let data
  try {
    data = await fetchData()
  } catch (err) {
    // Re-throw redirect errors
    if (err?.digest?.includes("NEXT_REDIRECT")) throw err
    return <ErrorState message={getErrorMessage(err)} />
  }

  if (data.length === 0) {
    return <EmptyState ... />
  }

  return <Content data={data} />
}

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <PageContent />
    </Suspense>
  )
}
```

### Client Components (Forms)

```tsx
"use client"

import { toastError, toastSuccess } from "@/lib/toast"
import { getErrorMessage } from "@/lib/errors"

const onSubmit = async (values: FormValues) => {
  setIsSubmitting(true)
  try {
    await submitAction(values)
    toastSuccess("Saved successfully!")
    onSuccess()
  } catch (error) {
    const message = getErrorMessage(error)
    toastError(message)
  } finally {
    setIsSubmitting(false)
  }
}
```

## Error Scenarios

### Network Errors
- **Detection**: Supabase query failures, fetch errors
- **Message**: "Failed to load data. Check your connection."
- **Action**: Show retry button

### Permission Errors
- **Detection**: Supabase RLS errors, 403 responses
- **Message**: "You don't have permission to perform this action. Contact your account owner."
- **Action**: Redirect to appropriate page

### Validation Errors
- **Detection**: Form validation failures
- **Message**: Field-specific error messages
- **Action**: Highlight invalid fields, prevent submission

### Business Logic Errors
- **Duplicate SKU**: "SKU already exists. Please use a unique SKU."
- **Out of Stock**: "Warning: Item out of stock. Inventory will go negative."
- **M-Pesa Timeout**: "Payment request timed out. Customer may not have received prompt. Try again."

### File Upload Errors
- **Too Large**: "Image must be under 2MB."
- **Invalid Type**: "Invalid file type. Please upload PNG or JPG."

## Best Practices

1. **Always wrap async operations in try-catch**
2. **Use `getErrorMessage()` for user-facing messages**
3. **Log errors with context using `logError()`**
4. **Show loading states during async operations**
5. **Provide retry mechanisms for network errors**
6. **Use EmptyState for empty data sets**
7. **Use Skeleton loaders for better UX**
8. **Handle offline state gracefully**

## Production Error Tracking

To integrate with error tracking service (e.g., Sentry):

1. Install Sentry:
```bash
npm install @sentry/nextjs
```

2. Update `lib/errors.ts`:
```typescript
import * as Sentry from "@sentry/nextjs"

export function logError(error: unknown, context?: string) {
  // ... existing code ...
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      tags: { context },
    })
  }
}
```

3. Initialize Sentry in `sentry.client.config.ts` and `sentry.server.config.ts`
