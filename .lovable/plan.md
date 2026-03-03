

# Fix: Setter Quality Not Showing in Rally History Timeline

## Problem
In `RallyActionsTimeline.tsx` (line 87), the code passed to `TimelineItem` is always `action.code`. For setter actions, the quality is stored in `action.pass_code`, not `action.code` (which is null). This means the quality dots never render for "Passe" entries in the history.

## Fix — `src/components/rally/RallyActionsTimeline.tsx`

One-line change: use `pass_code` for setter actions when building the `code` prop.

```typescript
// Line ~87: change from
code={action.code}
// to
code={action.action_type === 'setter' ? action.pass_code : action.code}
```

This follows the same pattern already used in `RallyTimeline.tsx` (line 96): `const effectiveCode = action.type === 'setter' ? action.passCode : action.code;`

No other files need changes.

