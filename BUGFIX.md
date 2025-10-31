# Bug Fix: @heroicons/react Import

## Issue
Vercel build was failing with error:
```
Rollup failed to resolve import '@heroicons/react/outline' from components/BookingPage.tsx
```

## Solution
Replaced the external @heroicons/react import with the local icons module that already exists in the project.

## Changes
- **components/BookingPage.tsx**: Changed `import { CalendarIcon } from '@heroicons/react/outline';` to `import { CalendarIcon } from './icons';`

## Verification
- ✅ Build completes successfully
- ✅ No @heroicons imports remaining in codebase
- ✅ CalendarIcon is already defined in components/icons.tsx
