# Sami的小本本 — module design

Status: implemented through Phase 4; Phase 5 release verification pending.

## Goal

Add `Sami的小本本` as an independent top-level Family Hub module, at the same level as Meal Builder, Day Trips, Library Activities, and the other registered modules. It is not part of Meal Builder and does not live under the Meal Builder route or domain. Its module card/navigation position should appear immediately after Meal Builder.

The module is a mobile-first shared household organizer. It is authenticated household state, not public-reference content.

The live system uses the existing Firebase project/authentication/household membership. Notebook data is a separate domain and must not be added to Meal Builder's `HouseholdState`.

Canonical runtime path:

```text
households/{householdId}/notebook
```

The public repository stores code, schema, tests, and module documentation only. It must never contain live notebook data, Gmail addresses, Firebase UIDs, or private household notes.

## Module placement and routing

- `Sami的小本本` is a sibling module in the Family Hub module registry.
- It gets its own top-level route, for example `/sami-notebook/`.
- Its registry entry is ordered immediately after `meal-builder`.
- The Developer page is a subpage of this module only, for example `/sami-notebook/developer/`.
- Sharing Firebase authentication/household infrastructure with Meal Builder does not make the notebook a Meal Builder feature or submodule.

## Privacy boundary required before activation

Current project rules and module registry assume every active module is `public-reference`. Before this module enters navigation, add an explicit authenticated-household privacy class and update the shared privacy rules accordingly.

The top-level notebook route may be publicly reachable as a shell, but no notebook content may be server-rendered into the static site. Private content loads only after the existing verified Google + household membership check succeeds. Production configuration errors must not fall back to local notebook data.

## Page structure

Top controls:

- `Active | Completed | All`, default `Active`.
- `Collapse all`.
- Board manager for shared Board ordering (`反复干` plus ordinary Boards) and ordinary Board visibility/editing.
- Developer page entry.

Then:

1. Fixed smart `Urgent` board, always first when it has rows. It is computed from active items with `priority = urgent` plus the hidden derived `due-soon` state; it is not a normal membership target.
2. Shared Board layout containing the computed `反复干` board and visible registered ordinary Boards. `反复干` may be moved before, between, or after ordinary Boards in Board Manager. Every live recurring item appears there and does not render in its ordinary Board memberships while recurrence is present. `反复干` is not a Firebase Board record and has no manual item ordering. Ordinary Boards render only non-recurring live items and one-time completion rows.
3. Quick Inbox input at the bottom. Submitting any non-empty sentence creates a ticket immediately with no schema gate.

`Urgent` remains a smart-view exception to recurring-item exclusivity: a recurring item that is manually urgent or due-soon may appear in both Smart Urgent and `反复干`. It still does not render in ordinary Boards while recurrence is present.

Ordinary Board visibility/collapse, the combined Board layout order, and the top filter state are household-shared state, not per-user preferences. `反复干` remains computed from item state; only its insertion position among ordinary Boards is persisted in notebook settings.

### Hidden due-soon state

`due-soon` is a computed display state only; it is never persisted to Firebase and never replaces or rewrites `priority`.

An item is `due-soon` when all of the following hold:

- `status = active`;
- it has a valid `dueDate`;
- the user's local calendar date is the day before `dueDate`, the due date itself, or later.

The hidden state starts at local midnight on the day before the deadline and remains until the item is completed or its due date is changed/removed. The page schedules a local-midnight rerender, so entering `due-soon` does not require a Firebase write or another user action.

Only Smart Urgent uses `due-soon` as an inclusion rule. Ordinary Boards keep the item's stored priority section and manual order unchanged. A due-soon card shows a small red hourglass in its upper-right status area; the icon's accessible label distinguishes `明天截止`, `今天截止`, and `已逾期`. When queue age is also shown, the hourglass appears first and the `x天` queue-age text follows it.

Recurring items use their materialized current `dueDate` for the same Smart Urgent rule.

### Queue age

Queue age is derived display state; it is not stored as `queuedAt` and does not require a daily Firebase write.

- A one-time item's queue start is its immutable `createdAt`.
- A recurring item's queue start is its latest `CompletionEvent.completedAt`; before the first completion it uses `createdAt`.
- Age is the difference between local calendar dates, so `今天创建 = 0天`, the next local day is `1天`, and DST does not distort the count.
- Only active live items show queue age. Completed items, one-time grace cards, and recurring completion-history rows do not.
- Smart Urgent always shows queue age.
- An ordinary Board shows queue age when its effective `showQueueAge` setting is true.
- The card displays only the compact text `x天` in the upper-right status area. The page's existing local-midnight rerender updates the number automatically.

`反复干` does not use queue age as its primary status. Its card status is the recurrence `remainingDays` value described below.

## Board registry

Ordinary Boards are dynamic records. No ordinary task/media board names are hard-coded into rendering logic.

```text
Board
- id
- title
- kind: task | media
- description?: string
- showQueueAge?: boolean
- visible: boolean
- collapsed: boolean
- order: integer
- createdAt
- updatedAt
```

`description` is optional and normally absent. There are no board-level comments.

`showQueueAge` is independently editable in Board Manager. New task Boards persist `true` by default and new media Boards persist `false` by default. Legacy Boards may lack the field; for backward compatibility a legacy `task` Board behaves as `true` and a legacy `media` Board behaves as `false` until the setting is explicitly saved. This keeps the normal task queue such as `开干` showing queue age while movie/TV media Boards do not, without hard-coding Board names.

Each regular Board header keeps the collapse control, Board title, and `＋事项` on one row, including mobile widths; `＋事项` is aligned to the far right. Item cards do not repeat their Board membership names in metadata because the containing Board already supplies that context.

`kind = media` only changes the fields/editing UI offered by that board. Do not add a separate `mediaType` field to items; `Movies` and `TV` are simply board names.

`反复干` and Smart Urgent are computed views, not `Board` records. Smart Urgent is fixed first. `反复干` participates in Board Manager ordering through the shared `settings.recurringBoardOrder` insertion position, while its title/content semantics remain system-controlled and it is never a normal membership target.

## Items

Use one item model with common fields plus optional media fields. A non-recurring item may render in multiple ordinary Boards. A recurring item keeps its ordinary memberships as fallback metadata but renders only in `反复干` plus the Smart Urgent exception while `recurrence` exists.

```text
Item
- id
- title
- details
- priority: urgent | high | normal | low
- status: active | completed
- authorName?: string
- dueDate?: YYYY-MM-DD
- dueTime?: HH:MM
- recurrence?: supported recurrence rule
- createdAt
- updatedAt
- completedAt?: timestamp
- completedByName?: string

Optional media fields
- platform?: string
- imdbRating?: number
- myRating?: number
- notes?: string
- review?: string
```

For recurring items, `dueDate` is the materialized current occurrence / next due date. It is not the canonical schedule rule; it is the current schedule cursor used by the UI, Smart Urgent, remaining-day grouping, and completion advancement.

`authorName` is the private household display-name snapshot of the member who creates the item. The repository adds it only when the item is first created; normal edits, status changes, drag ordering, and Developer metadata patches must not rewrite it. Firebase rules keep a persisted author immutable and require a newly persisted author to match the creating member's current private display name.

Legacy items may have no persisted `authorName`. For current household data, those items are intentionally rendered as `猫猫` without a migration write. The title row starts with an author icon rather than visible author text: `猫猫` uses the supplied fluffy gray/white cat portrait as a compact image icon, `呜哇` uses the supplied watercolor shaggy-dog portrait, and any future unmatched display name uses a neutral fallback icon. The icon retains an accessible author label.

`completedByName` is a separate private display-name snapshot of the member who completes a one-time item. It is written only on the transition to `completed` and is cleared when that completion is undone. The completion metadata line shows the completer icon next to the completion date. Existing completed records that predate this field intentionally fall back to `呜哇` for display, matching the known legacy completion history, without backfilling Firebase.

The item editor exposes an explicit destructive `删除事项` action only while editing an existing item. Deletion requires confirmation and removes the item together with all Board memberships, comments, and recurring completion history for that item. It does not affect Inbox tickets or unrelated items.

Do not add an item-level media type.

## Membership and ordering

Membership is separate from the item because a normal item can appear in multiple ordinary Boards and have a different manual position in each board.

```text
memberships/{boardId}/{itemId}
- order: integer
```

A recurring item also retains its ordinary memberships while recurrence is active. Those memberships are deliberately hidden from ordinary Board rendering and are not part of `反复干` ordering. They provide:

- the ordinary Board destinations to restore if recurrence is removed;
- stable Board snapshots for recurring completion history;
- no duplicate live card in ordinary Boards.

Board-level ordering is separate from item ordering. Ordinary Boards keep dense `Board.order` values. `settings.recurringBoardOrder` stores the insertion index of the computed `反复干` Board among those ordinary Boards. Board Manager drag and arrow controls update the combined shared layout; moving `反复干` does not create a membership, change any item, or enable manual ordering inside `反复干`.

Each ordinary board has fixed priority sections in this order:

1. Urgent
2. High
3. Normal
4. Low

### Ordinary Active ordering

Within each priority section:

- Default behavior is newest-added first.
- A newly added non-recurring item enters at the top and existing items shift down.
- Manual drag ordering overrides the default and persists.
- Dragging only reorders within the same board + priority section.
- Changing priority uses the priority control, not drag-and-drop; a non-recurring item moves to the top of its new priority section in every ordinary board it belongs to.
- Restoring a completed one-time item to Active also places it at the top of its priority section.
- Recurring items are excluded from ordinary section ordering while recurrence is present, so completing a recurrence never rewrites ordinary Board order.
- Deleting an active non-recurring item closes the ordering gap in its affected Board + priority sections.

For the expected household scale, use simple dense integer ordering and rewrite the affected ordinary section after insertion/drag. Do not introduce fractional ranking unless a measured need appears.

### `反复干` ordering and remaining-day groups

`反复干` has no manual item drag order and no top-level priority sections. Its Board-level position among ordinary Boards is shared and manually reorderable; its contents always remain automatically ordered. It always shows every active recurring item, including future items.

For each recurring item:

```text
remainingDays = dueDate(local calendar date) - today(local calendar date)
```

Group in this fixed order:

1. `过期`: `< 0`
2. `今天`: `= 0`
3. `马上`: `1–3`
4. `这周`: `4–7`
5. `近期`: `8–14`
6. `以后`: `> 14`
7. `未定日期`: legacy fallback only when an old recurring item has no usable due date

Within each group sort by:

1. priority: `urgent`, `high`, `normal`, `low`;
2. `remainingDays ASC`;
3. stable `createdAt ASC`, then `id`.

Thus more-overdue tasks come first within equal priority, and closer future dates come first within equal priority.

Recurring cards always show a compact status label:

- `< 0`: `已过期 N 天`
- `0`: `今天`
- `1`: `明天`
- `> 1`: `还有 N 天`
- no usable date: `未定日期`

The remaining-day group drives the card's status color / edge accent. Use progressively stronger urgency from neutral future → green/near → yellow/week → orange/soon → red/today/overdue. Do not fill the entire card with saturated color.

### Completed ordering

Ordinary `Completed` keeps the same fixed priority sections. Within each section, sort one-time items by `completedAt DESC`. Manual membership order is ignored.

Recurring completion events do not render in ordinary Boards. `反复干` renders recurring completion history in `Completed` and `All`, newest completion first, using the priority snapshot stored on each event.

### All ordering

Within an ordinary board and priority section, show Active non-recurring items first using their manual order, then completed one-time entries using `completedAt DESC`.

Within `反复干`, `All` shows the current active recurring groups first and recurring completion history after them.

## Completion and recurrence

### One-time completion

- set `status = completed`;
- set `completedAt`;
- snapshot the completing member's private display name into `completedByName`;
- use a direct completion button rather than a status dropdown;
- keep the completed card visible in the Active view for a one-hour grace period, with an explicit undo action;
- the grace period is display-only: Firebase records completion immediately, other devices synchronize immediately, and Completed views include the item immediately;
- after the grace period, the item disappears from Active without another database write;
- retain the item indefinitely unless the user explicitly deletes it later.

Restoring it clears both `completedAt` and `completedByName`, then returns it to Active at the top of its priority section.

### Recurrence rule model

New recurring items use one of two explicit modes.

#### Scheduled

Calendar-based recurrence is independent of when the user presses complete.

```text
recurrence:
  kind: scheduled
  startDate: YYYY-MM-DD
  unit: day | week | month | year
  interval: positive integer
  weekdays?: mon | tue | wed | thu | fri | sat | sun []
```

For `unit = week`, `weekdays` is required and may contain one or more unique weekdays. `startDate` anchors the recurrence cycle; the week containing `startDate` is cycle week 0, and every-N-week cadence is measured from that anchor. The first occurrence is the first selected weekday on or after `startDate`; if none remains in the anchor week, use the first selected weekday in the next active cycle week.

For day/month/year schedules, `startDate` is the calendar anchor. Month/year advancement preserves the anchored calendar day where possible and clamps to the last valid day of a shorter month.

Completing a scheduled recurrence advances exactly one scheduled occurrence. Completion timing does not reset the cadence and does not auto-skip missed occurrences. Example: if a Monday occurrence is still pending on Friday and the user completes it, the item advances to the next occurrence in the schedule even if that next occurrence is already overdue. Repeated completion is required to catch up, so missed work never silently disappears.

#### After completion

Rough maintenance cadence is relative to actual completion:

```text
recurrence:
  kind: afterCompletion
  intervalDays: positive integer
```

The item keeps a current / first `dueDate`. When the user completes it:

```text
next dueDate = completedOn(local calendar date) + intervalDays
```

Example: `洗桶` with `intervalDays = 30` completed today remains visible immediately and changes to `还有 30 天`, then moves automatically to the appropriate `反复干` group/order.

### Legacy recurrence compatibility

Existing live data may still use the old shape:

```text
{ unit: day | week | month | year, interval: N }
```

The domain and Firebase rules continue to read/accept the supported legacy shape so existing household data is not lost and no migration write is required. New item-editor saves and Developer new-item patches use the explicit `scheduled` / `afterCompletion` schema. Editing a legacy recurrence converts it to the modern scheduled form when enough existing due-date information is available; the UI must not invent an unknown old anchor date.

### Recurring completion history

Recurring completion preserves history while keeping the same live item active. Do not overwrite the only completion timestamp. On each completion:

1. store a completion event;
2. snapshot the completing member into that event;
3. advance the item's materialized `dueDate` using its recurrence mode;
4. leave `status = active`;
5. leave the card visible in `反复干`, where its group and position are recomputed from the new due date.

A recurrence completion event needs only the minimum snapshot required for stable history:

```text
CompletionEvent
- id
- itemId
- completedAt
- completedByName?: string
- priority
- boardIds[]
```

`boardIds[]` snapshots the item's retained ordinary memberships at completion time. These IDs are history/fallback metadata; they do not cause recurring history rows to render in those ordinary Boards.

New completion events persist `completedByName`. Existing legacy events may omit it and render as `呜哇` without migration.

Comments remain attached to the live recurring item, not duplicated into each event.

After `dueDate` advances, the hidden `due-soon` rule decides Smart Urgent membership. A recurring item that is no longer due soon drops out unless it is manually `priority = urgent`; when its next deadline reaches the due-soon window it automatically re-enters Smart Urgent. A daily or overdue scheduled recurrence may remain in Smart Urgent immediately after completion.

## Comments

Item comments support add, edit, and delete from the page.

```text
Comment
- id
- itemId
- body
- authorName
- createdAt
- updatedAt?
```

The UI shows comment `authorName`, never email. The public repo must not contain an email-to-name map. Resolve the signed-in member to a private household display name in Firebase and snapshot that display name onto a new comment. Authentication identity data is not part of notebook export data.

Item content and comments are no longer hidden behind a `内容与评论` disclosure row. Item `details` render directly when present; an empty item does not show a `暂无内容` placeholder.

Comment presentation is intentionally compact on mobile:

- 0 comments: show only `＋ 添加评论`;
- 1 comment: show that comment, then `＋ 添加评论`;
- 2 comments: show both comments, then `＋ 添加评论`;
- 3 or more comments: show the first comment, a compact `展开中间 N 条` disclosure, then the last comment, followed by `＋ 添加评论`;
- opening the middle disclosure shows the comments in their normal chronological order and changes the control to `收起中间 N 条`;
- `＋ 添加评论` expands the textarea only when needed instead of keeping an editor open on every card.

## Media boards

A media board uses the same one-time item lifecycle, priority sections, memberships, comments, filters, and completion dates as task boards. It additionally exposes editing for:

- platform
- IMDb score
- personal score (`myRating`)
- notes
- watched review

If a media item is recurring, it follows the same `反复干` visibility and recurrence completion behavior as any other recurring item; its media metadata remains on the card.

Do not create a second media-specific item hierarchy unless future behavior requires it.

## Inbox

Homepage quick input:

```text
InboxTicket
- id
- text
- createdAt
- updatedAt
```

Submission has no classification, priority, due-date, or board requirement. iPhone keyboard dictation is sufficient for voice input in the first version; do not add a speech service.

## Developer page

The Developer page uses the same household authentication and contains:

### Inbox management

- List every current ticket.
- Edit ticket text.
- Delete a ticket.
- `Copy all` button.

`Copy all` copies a self-contained prompt that can be pasted directly to ChatGPT. It contains only the current ordinary Board IDs/titles/kinds and Inbox ticket IDs/text that ChatGPT needs for classification; it does not expose the rest of the private notebook database. The prompt requires live IMDb verification for media items, forbids guessed ratings, requires `myRating` to come only from an explicit user rating, and tells ChatGPT it may use a unique exact Board title instead of copying an opaque Board UUID.

`反复干` is not included as a writable Board reference because it is computed from `item.recurrence`.

### Chat patch input

A textarea accepts a complete JSON patch returned by ChatGPT. Version 1 supports two schema-limited patch modes:

1. create normalized items using existing ordinary Board references; each `boardIds[]` entry may be a real Board ID or a unique exact Board title. `ticketId` is optional, so a patch may create brand-new items directly, convert Inbox tickets, or mix both in one `items[]` payload;
2. update a safe allowlist of fields on existing items.

New-item / Inbox-conversion shape:

```text
NotebookPatch
- patchVersion: 1
- items[]
    - ticketId?      # only when converting a real Inbox ticket
    - title
    - details
    - boardIds[]     # real ordinary Board ID or unique exact Board title
    - priority
    - dueDate?
    - dueTime?
    - recurrence?
    - platform?
    - imdbRating?
    - myRating?
    - notes?
    - review?
```

New recurrence patches use only modern recurrence shapes:

```text
scheduled:
{ kind: "scheduled", startDate: "YYYY-MM-DD", unit: "day|week|month|year", interval: N, weekdays?: [...] }

after completion:
{ kind: "afterCompletion", intervalDays: N }
```

For `scheduled`, the validator computes the first `dueDate` from the rule. If a patch explicitly supplies `dueDate`, it must equal that computed first occurrence. For `afterCompletion`, the patch must supply a valid first/current `dueDate`.

A recurring patch still needs at least one ordinary `boardIds[]` target. Those memberships are retained as fallback/history metadata but the live recurring card renders in `反复干` instead of those ordinary Boards.

A direct new item omits `ticketId`. A ticket-backed item must reference a currently existing Inbox ticket. Only referenced ticket-backed items delete Inbox tickets; direct items never delete Inbox state.

Board references are resolved during patch validation. An exact Board ID wins first. If no ID matches, the resolver requires exactly one Board whose `title` exactly matches the supplied text. Zero matches are rejected as unknown; multiple title matches are rejected as ambiguous rather than guessed. The validated patch is normalized to canonical Board IDs before preview/apply. Firebase remains the only runtime source of truth for the ordinary Board registry; the public Git repo must not maintain a duplicate title-to-UUID mapping.

Existing-item update shape:

```text
NotebookItemUpdatePatch
- patchVersion: 1
- itemUpdates[]
    - itemId
    - details?
    - platform?
    - imdbRating?
    - myRating?
    - notes?
    - review?
```

Existing-item updates are intentionally metadata-only. They must not change title, Board membership, priority, status, due date, recurrence, manual order, comments, completion history, Inbox, auth, item author, completion actor, or any arbitrary Firebase path. Media-specific fields are accepted only for items that already belong to at least one `kind = media` ordinary Board. Ratings remain constrained to 0–10.

Apply flow:

1. Parse JSON.
2. Detect the supported narrow patch mode and validate the complete payload against its strict schema.
3. Resolve Board references, then reject unknown/ambiguous Boards, duplicate references to the same resolved Board, unknown item/ticket IDs, duplicate referenced ticket IDs, unsupported fields, malformed ratings, invalid enums/dates/times/recurrence rules, or referenced tickets no longer present.
4. Show a compact preview of exactly what will be created or updated, including how many referenced Inbox tickets will be removed.
5. One Apply action performs one Firebase transaction. New-item patches create generated item IDs and memberships; only items carrying a valid `ticketId` delete that referenced Inbox ticket. Existing-item updates change only the allowlisted fields.
6. The repository snapshots the current member display name onto any newly created item and any new completion actor before the transaction is normalized and written.
7. Revalidate against the current transaction state so concurrent changes cannot bypass validation.
8. A validation or transaction failure writes nothing.

Patch parse/validation/apply feedback belongs in the Chat patch panel beside the JSON input. Do not surface patch-format errors as a page-level Developer status message.

Do not allow version-1 patches to write arbitrary Firebase paths, create/rename Boards, alter membership/auth records, change item lifecycle/order/author/completion actor, edit existing recurrence, or execute deletes outside the explicitly referenced Inbox tickets.

## Portable database export and Git backup

Firebase is the live database. Git is a portable versioned snapshot, not the runtime store.

Developer page provides `Export database`, downloading one stable file such as:

```text
sami-notebook.json
```

Export shape is versioned and portable:

```text
NotebookExport
- schemaVersion
- exportedAt
- boards
- items
- memberships
- comments
- completionEvents
- inbox
- settings
```

The export must contain all notebook business state needed to reconstruct the module, including persisted item author/completion-actor snapshots, recurrence rules/current due dates, persisted Board `showQueueAge` overrides, and the shared `recurringBoardOrder` layout position, but must exclude:

- Gmail addresses
- Firebase UIDs
- tokens/credentials
- household membership/access-control records
- Firebase configuration

The intended Git backup is a separate private repository because the current FamilyHub repository is public and explicitly prohibits committed private household state. The private repository should normally overwrite one canonical `sami-notebook.json`; Git history supplies prior snapshots without creating dated duplicate files.

Initial backup workflow:

1. Developer page → Export database.
2. Commit/replace `sami-notebook.json` in the private backup repo.

Direct browser-to-GitHub push is not part of version 1; it would require an additional write credential/backend and is unnecessary for the first version.

Import/restore should use the same export schema eventually, but it is a separate destructive workflow and is not required to ship the first read/write notebook unless explicitly requested.

## Firebase/domain architecture

Do not extend Meal Builder's `HouseholdState` with notebook fields.

Preferred separation:

```text
src/lib/notebookDomain.ts
src/lib/notebookRecurrence.ts
src/lib/notebookRepository.ts
src/pages/sami-notebook.astro
src/pages/sami-notebook/developer.astro
```

The notebook repository should reuse the existing Firebase project, Google authentication, and household membership model. If sharing the current authentication/membership code requires a small extraction, keep that extraction behavior-preserving and separately covered so Meal Builder does not regress.

Firebase rules should authorize the notebook path only to existing verified household members and validate both legacy-read-compatible recurrence data and the modern `scheduled` / `afterCompletion` shapes. Keep notebook rule tests separate from Meal Builder state assertions where practical.

## Implementation sequence

### Phase 0 — privacy/auth boundary

- Add `authenticated-household` as an explicit module privacy class.
- Update shared privacy documentation/validation to permit an authenticated private module without permitting private committed/static data.
- Define the rule that the static route contains only a locked shell until household auth succeeds.

### Phase 1 — notebook domain + repository

- Add typed normalization/validation for boards, items, memberships, comments, completion events, inbox, and settings.
- Add notebook Firebase repository at the separate notebook path.
- Add database rules and emulator tests.
- Add private display-name resolution for item/comment author and completion-actor snapshots.

### Phase 2 — core mobile page

- Add `Sami的小本本` as its own top-level module registry entry immediately after Meal Builder.
- Add its own authenticated top-level page shell and connection/error states.
- Add Active/Completed/All, smart Urgent, board registry, board visibility/order/collapse, fixed priority sections, item controls, comments, and quick Inbox.
- Add touch/keyboard-safe reorder controls. Drag must not be the only accessible way to reorder ordinary Board items or the shared Board layout.

### Phase 3 — recurrence + media

- Add recurrence completion events and due-date advancement.
- Add computed `反复干` with exclusive ordinary-Board visibility, a shared reorderable Board-level position, remaining-day groups/colors, automatic group/priority/date item ordering, scheduled calendar recurrence, and after-completion recurrence.
- Preserve old recurrence records without requiring a migration write.
- Add media-field UI for `kind = media` boards with no `mediaType` field.

### Phase 4 — Developer workflow + export

- Add Inbox edit/delete/copy-all.
- Add schema-validated atomic Chat patch apply for direct new items, Inbox conversion, unique-title/ID Board resolution, modern recurrence creation, and safe existing-item metadata updates.
- Add portable database export.

### Phase 5 — release verification

Run focused checks during implementation, then the repository release gate:

```bash
pnpm run verify
```

Verify mobile widths, two-phone realtime synchronization, member authorization, rule rejection for non-members, item/comment author names, completion-actor snapshots/icons, comment collapsing, all ordinary ordering transitions, item deletion cleanup, recurrence schedule advancement, after-completion date reset, `反复干` exclusivity/grouping/priority/date sorting/colors and Board-level placement, queue-age calendar math and midnight rollover, due-soon/Smart Urgent inclusion, Board `showQueueAge` rules, direct/Inbox patch atomicity and Board-reference resolution, modern recurrence patch validation, legacy recurrence read compatibility, and export exclusion of auth identity data.

## Design acceptance criteria

This design is ready for implementation when all of the following are fixed:

- `Sami的小本本` is an independent top-level sibling module, not part of Meal Builder; its navigation/module-card position is immediately after Meal Builder.
- Live state is Firebase, with a separate notebook domain/path.
- Git backup is a private portable snapshot, not runtime storage.
- Module privacy classification is explicitly authenticated-household before activation.
- Ordinary Boards are dynamic and may be reordered/hidden/collapsed as household-shared state.
- Regular Board headers keep `＋事项` on the title row at the far right on mobile and desktop.
- Smart Urgent is computed and fixed first, combining stored `priority = urgent` with the hidden derived `due-soon` state.
- `反复干` is a computed system Board, not a writable Board record; all active recurring items always appear there, and its Board-level position among ordinary Boards is household-shared and reorderable in Board Manager.
- While `recurrence` exists, a recurring item does not render in ordinary Boards; its ordinary memberships remain stored as fallback/history metadata. Smart Urgent remains the only duplicate smart-view exception.
- `反复干` groups by `<0`, `0`, `1–3`, `4–7`, `8–14`, `>14` remaining days; within a group it orders `urgent → high → normal → low`, then remaining days ascending, with stable tie-breakers.
- `反复干` cards show remaining-day text and group-linked color accents and are not manually draggable inside the Board.
- Scheduled recurrence stores start date, cadence interval, and weekly weekdays; every-N-week schedules are anchored to the start week. Completing advances exactly one scheduled occurrence and never silently skips overdue occurrences.
- After-completion recurrence sets the next due date from the actual local completion date plus `intervalDays`; the card remains visible and immediately re-sorts.
- Legacy `{unit, interval}` recurrence remains readable/valid without a forced migration, while new editor/Developer writes use modern recurrence shapes.
- `due-soon` never rewrites stored priority or ordinary Board ordering and rolls over at local midnight.
- Smart Urgent always shows active queue age; ordinary Boards use `showQueueAge`, with legacy task/media defaults of true/false and no ordinary Board-name hard-coding.
- Queue age is local-calendar-day based, uses `createdAt` for one-time items, resets to the latest recurring completion timestamp, and is never stored as a daily counter.
- The upper-right ordinary-card status shows red hourglass first when due-soon, then compact `x天` when queue age is enabled.
- One normal item may belong to multiple ordinary Boards with per-board manual ordering, but item cards do not repeat Board names in metadata.
- Ordinary priority sections are fixed Urgent/High/Normal/Low.
- Ordinary Active ordering is new-first with persistent manual overrides; recurring items do not participate in ordinary section ordering while recurrence is present; Completed keeps the same priority sections and sorts one-time items by completion date descending.
- Recurring completion events are shown from `反复干` Completed/All history rather than duplicated into old ordinary Boards.
- New items snapshot the creating member's private display name; legacy missing authors render as 猫猫; persisted authors are immutable.
- Author icons lead the title row: 猫猫 = supplied fluffy cat portrait, 呜哇 = supplied watercolor shaggy-dog portrait, unmatched names = neutral fallback.
- New one-time and recurring completions snapshot the completing member's display name; completion rows show that member's icon; legacy missing completion actors render as 呜哇 without a migration.
- Existing items can be explicitly deleted from the editor after confirmation; deletion removes memberships, comments, and recurrence history for that item.
- Item content is directly visible; comments use 0/1/2/3+ compact presentation with first/last preservation for long threads.
- Media items do not have `mediaType`.
- Board description is optional; board comments do not exist.
- Item comments are editable and show private display names, never email.
- Inbox accepts unrestricted one-line capture.
- Developer patching is schema-limited and atomic: `items[]` can create direct items without a ticket or convert referenced Inbox tickets; ordinary Board references may use canonical IDs or unique exact titles and normalize to IDs before apply; new recurrence creation uses modern shapes; `itemUpdates[]` remains safe existing-item metadata only.
- Export is complete for notebook business state and excludes authentication identity data.
