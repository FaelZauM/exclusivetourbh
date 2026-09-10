# Task 3 Report: Notification Service

## Status
DONE

## Commits
- `a28333c` feat: add notification service for scheduled rides

## Test Summary
- TypeScript compilation: PASSED (no errors)
- `npm run build`: PASSED (all pages generated successfully)

## Implementation
Created `src/app/taxi/lib/notification-service.ts` with 5 exported functions:

| Function | Purpose |
|----------|---------|
| `checkAndSendNotifications()` | Checks scheduled rides due within thresholds and creates notifications (1h for own rides, 15min for passed rides) |
| `getUserNotifications(userId)` | Returns last 50 notifications for a user, ordered by created_at desc |
| `getUnreadCount(userId)` | Returns count of unread notifications |
| `markNotificationRead(id)` | Marks a single notification as read |
| `markAllAsRead(userId)` | Marks all unread notifications as read for a user |

## Concerns
None
