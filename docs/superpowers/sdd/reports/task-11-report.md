# Task 11 Report: Add periodic notification check to the layout

**Status:** Completed  
**Commit:** 0f76af2 - "feat: add periodic notification check"  
**Modified Files:** `src/app/taxi/layout.tsx`

## Changes Made

1. Added import for `checkAndSendNotifications` from `./lib/notification-service`
2. Added `useEffect` hook inside `AuthGuard` component that:
   - Runs immediately when user is authenticated
   - Sets up an interval to run every 5 minutes
   - Cleans up interval on unmount or user change

## Verification

- Build completed successfully with no type errors (`npm run build`)
- No additional concerns identified

## Notes

The notification check will now run automatically every 5 minutes for authenticated users, checking for upcoming scheduled rides and sending appropriate notifications.