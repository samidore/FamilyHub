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
- Board manager for board visibility and drag ordering.
- Developer page entry.

Then:

1. Fixed smart `Urgent` board, always first. It is computed from active items with `priority = urgent` plus the hidden derived `due-soon` state; it is not a normal membership target.
2. Visible registered boards in shared board order.
3. Quick Inbox input at the bottom. Submitting any non-empty sentence creates a ticket immediately with no schema gate.

All board visibility, board order, collapse state, and top filter state are household-shared state, not per-user preferences.

### Hidden due-soon state

`due-soon` is a computed display state only; it is never persisted to Firebase and never replaces or rewrites `priority`.

An item is `due-soon` when all of the following hold:

- `status = active`;
- it has a valid `dueDate`;
- the user's local calendar date is the day before `dueDate`, the due date itself, or later.

The hidden state starts at local midnight on the day before the deadline and remains until the item is completed or its due date is changed/removed. The page schedules a local-midnight rerender, so entering `due-soon` does not require a Firebase write or another user action.

Only Smart Urgent uses `due-soon` as an inclusion rule. Ordinary Boards keep the item's stored priority section and manual order unchanged. A due-soon card shows a small red hourglass in its upper-right status area; the icon's accessible label distinguishes `明天截止`, `今天截止`, and `已逾期`. When queue age is also shown, the hourglass appears first and the `x天` queue-age text follows it.

### Queue age

Queue age is derived display state; it is not stored as `queuedAt` and does not require a daily Firebase write.

- A one-time item's queue start is its immutable `createdAt`.
- A recurring item's queue start is its latest `CompletionEvent.completedAt`; before the first completion it uses `createdAt`.
- Age is the difference between local calendar dates, so `今天创建 = 0天`, the next local day is `1天`, and DST does not distort the count.
- Only active live items show queue age. Completed items, one-time grace cards, and recurring completion-history rows do not.
- Smart Urgent always shows queue age.
- An ordinary Board shows queue age when its effective `showQueueAge` setting is true.
- The card displays only the compact text `x天` in the upper-right status area. The page's existing local-midnight rerender updates the number automatically.

## Board registry

Boards are dynamic records. No task/media board names are hard-coded into rendering logic.

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

## Items

Use one item model with common fields plus optional media fields. An item may belong to multiple boards.

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

`authorName` is the private household display-name snapshot of the member who creates the item. The repository adds it only when the item is first created; normal edits, status changes, drag ordering, and Developer metadata patches must not rewrite it. Firebase rules keep a persisted author immutable and require a newly persisted author to match the creating member's current private display name.

Legacy items may have no persisted `authorName`. For current household data, those items are intentionally rendered as `猫猫` without a migration write. The title row starts with an author icon rather than visible author text: `猫猫` uses the supplied fluffy gray/white cat portrait as a compact image icon, `呜哇` uses the supplied watercolor shaggy-dog portrait, and any future unmatched display name uses a neutral fallback icon. The icon retains an accessible author label.

`completedByName` is a separate private display-name snapshot of the member who completes a one-time item. It is written only on the transition to `completed` and is cleared when that completion is undone. The completion metadata line shows the completer icon next to the completion date. Existing completed records that predate this field intentionally fall back to `呜哇` for display, matching the known legacy completion history, without backfilling Firebase.

The item editor exposes an explicit destructive `删除事项` action only while editing an existing item. Deletion requires confirmation and removes the item together with all Board memberships, comments, and recurring completion history for that item. It does not affect Inbox tickets or unrelated items.

Do not add an item-level media type.

## Membership and ordering

Membership is separate from the item because the same item can appear in multiple boards and have a different manual position in each board.

```text
memberships/{boardId}/{itemId}
- order: integer
```

Each board has fixed priority sections in this order:

1. Urgent
2. High
3. Normal
4. Low

### Active ordering

Within each priority section:

- Default behavior is newest-added first.
- A newly added item enters at the top and existing items shift down.
- Manual drag ordering overrides the default and persists.
- Dragging only reorders within the same board + priority section.
- Changing priority uses the priority control, not drag-and-drop; the item moves to the top of its new priority section in every board it belongs to.
- Restoring a completed one-time item to Active also places it at the top of its current priority section.
- Completing one occurrence of a recurring item keeps the live item active but moves it to the bottom of its current priority section in every Board it belongs to, starting a new queue-age cycle.
- Deleting an active item closes the ordering gap in its affected Board + priority sections.

For the expected household scale, use simple dense integer ordering and rewrite the affected section after insertion/drag. Do not introduce fractional ranking unless a measured need appears.

### Completed ordering

`Completed` keeps the same fixed priority sections. Within each section, sort by `completedAt DESC`. Manual membership order is ignored.

### All ordering

Within each board and priority section, show Active items first using their manual order, then completed entries using `completedAt DESC`.

## Completion and recurrence

One-time item completion:

- set `status = completed`;
- set `completedAt`;
- snapshot the completing member's private display name into `completedByName`;
- use a direct completion button rather than a status dropdown;
- keep the completed card visible in the Active view for a one-hour grace period, with an explicit undo action;
- the grace period is display-only: Firebase records completion immediately, other devices synchronize immediately, and Completed views include the item immediately;
- after the grace period, the item disappears from Active without another database write;
- retain the item indefinitely unless the user explicitly deletes it later.

Restoring it clears both `completedAt` and `completedByName`, then returns it to Active at the top of its priority section.

Recurring completion must preserve history while keeping the next occurrence active. Do not overwrite the only completion timestamp. Store a completion event for each occurrence, snapshot the completing member into that event, advance the same item's next due date, leave the item active, and move the live item to the bottom of the current priority section in every Board membership. The new queue-age cycle starts from that completion timestamp. Completed views render recurring completion events as historical rows, grouped by the priority recorded at completion time, with the completer icon next to the completion date.

After the next due date advances, the existing hidden `due-soon` rule decides Smart Urgent membership. A recurring item that is no longer due soon drops out unless it is manually `priority = urgent`; when its next deadline reaches the due-soon window it automatically re-enters Smart Urgent. A daily recurrence may therefore remain due-soon immediately after completion because its next due date is tomorrow.

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

New completion events persist `completedByName`. Existing legacy events may omit it and render as `呜哇` without migration.

Comments remain attached to the live recurring item, not duplicated into each event.

Initial recurrence support:

- every N days
- weekly
- monthly
- every N months
- yearly

Do not implement a general calendar RRULE editor in the first version.

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

A media board uses the same item lifecycle, priority sections, memberships, comments, filters, and completion dates as task boards. It additionally exposes editing for:

- platform
- IMDb score
- personal score (`myRating`)
- notes
- watched review

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

`Copy all` copies a self-contained prompt that can be pasted directly to ChatGPT. It contains only the current board IDs/titles/kinds and Inbox ticket IDs/text that ChatGPT needs for classification; it does not expose the rest of the private notebook database. The prompt requires live IMDb verification for media items, forbids guessed ratings, requires `myRating` to come only from an explicit user rating, and tells ChatGPT it may use a unique exact Board title instead of copying an opaque Board UUID.

### Chat patch input

A textarea accepts a complete JSON patch returned by ChatGPT. Version 1 supports two schema-limited patch modes:

1. create normalized items using existing Board references; each `boardIds[]` entry may be a real Board ID or a unique exact Board title. `ticketId` is optional, so a patch may create brand-new items directly, convert Inbox tickets, or mix both in one `items[]` payload;
2. update a safe allowlist of fields on existing items.

New-item / Inbox-conversion shape:

```text
NotebookPatch
- patchVersion: 1
- items[]
    - ticketId?      # only when converting a real Inbox ticket
    - title
    - details
    - boardIds[]     # real Board ID or unique exact Board title
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

A direct new item omits `ticketId`. A ticket-backed item must reference a currently existing Inbox ticket. Only referenced ticket-backed items delete Inbox tickets; direct items never delete Inbox state.

Board references are resolved during patch validation. An exact Board ID wins first. If no ID matches, the resolver requires exactly one Board whose `title` exactly matches the supplied text. Zero matches are rejected as unknown; multiple title matches are rejected as ambiguous rather than guessed. The validated patch is normalized to canonical Board IDs before preview/apply. Firebase remains the only runtime source of truth for the Board registry; the public Git repo must not maintain a duplicate title-to-UUID mapping.

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

Existing-item updates are intentionally metadata-only. They must not change title, Board membership, priority, status, due date, recurrence, manual order, comments, completion history, Inbox, auth, item author, completion actor, or any arbitrary Firebase path. Media-specific fields are accepted only for items that already belong to at least one `kind = media` Board. Ratings remain constrained to 0–10.

Apply flow:

1. Parse JSON.
2. Detect the supported narrow patch mode and validate the complete payload against its strict schema.
3. Resolve Board references, then reject unknown/ambiguous Boards, duplicate references to the same resolved Board, unknown item/ticket IDs, duplicate referenced ticket IDs, unsupported fields, malformed ratings, invalid enums/dates/times, or referenced tickets no longer present.
4. Show a compact preview of exactly what will be created or updated, including how many referenced Inbox tickets will be removed.
5. One Apply action performs one Firebase transaction. New-item patches create generated item IDs and memberships; only items carrying a valid `ticketId` delete that referenced Inbox ticket. Existing-item updates change only the allowlisted fields.
6. The repository snapshots the current member display name onto any newly created item and any new completion actor before the transaction is normalized and written.
7. Revalidate against the current transaction state so concurrent changes cannot bypass validation.
8. A validation or transaction failure writes nothing.

Patch parse/validation/apply feedback belongs in the Chat patch panel beside the JSON input. Do not surface patch-format errors as a page-level Developer status message.

Do not allow version-1 patches to write arbitrary Firebase paths, create/rename Boards, alter membership/auth records, change item lifecycle/order/author/completion actor, or execute deletes outside the explicitly referenced Inbox tickets.

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

The export must contain all notebook business state needed to reconstruct the module, including persisted item author/completion-actor snapshots and any persisted Board `showQueueAge` overrides, but must exclude:

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
src/lib/notebookRepository.ts
src/pages/sami-notebook.astro
src/pages/sami-notebook/developer.astro
```

The notebook repository should reuse the existing Firebase project, Google authentication, and household membership model. If sharing the current authentication/membership code requires a small extraction, keep that extraction behavior-preserving and separately covered so Meal Builder does not regress.

Firebase rules should authorize the notebook path only to existing verified household members and validate the notebook domain shape. Keep notebook rule tests separate from Meal Builder state assertions where practical.

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
- Add touch/keyboard-safe reorder controls. Drag must not be the only accessible way to reorder.

### Phase 3 — recurrence + media

- Add recurrence completion events and due-date advancement.
- Add media-field UI for `kind = media` boards with no `mediaType` field.

### Phase 4 — Developer workflow + export

- Add Inbox edit/delete/copy-all.
- Add schema-validated atomic Chat patch apply for direct new items, Inbox conversion, unique-title/ID Board resolution, and safe existing-item metadata updates.
- Add portable database export.

### Phase 5 — release verification

Run focused checks during implementation, then the repository release gate:

```bash
pnpm run verify
```

Verify mobile widths, two-phone realtime synchronization, member authorization, rule rejection for non-members, item/comment author names, completion-actor snapshots/icons, comment collapsing, all ordering transitions, item deletion cleanup, recurring requeue-to-bottom behavior, queue-age calendar math and midnight rollover, due-soon/Smart Urgent inclusion, Board `showQueueAge` rules, direct/Inbox patch atomicity and Board-reference resolution, and export exclusion of auth identity data.

## Design acceptance criteria

This design is ready for implementation when all of the following are fixed:

- `Sami的小本本` is an independent top-level sibling module, not part of Meal Builder; its navigation/module-card position is immediately after Meal Builder.
- Live state is Firebase, with a separate notebook domain/path.
- Git backup is a private portable snapshot, not runtime storage.
- Module privacy classification is explicitly authenticated-household before activation.
- Boards are dynamic and may be reordered/hidden/collapsed as household-shared state.
- Regular Board headers keep `＋事项` on the title row at the far right on mobile and desktop.
- Smart Urgent is computed and fixed first, combining stored `priority = urgent` with the hidden derived `due-soon` state.
- `due-soon` never rewrites stored priority or ordinary Board ordering and rolls over at local midnight.
- Smart Urgent always shows active queue age; ordinary Boards use `showQueueAge`, with legacy task/media defaults of true/false and no Board-name hard-coding.
- Queue age is local-calendar-day based, uses `createdAt` for one-time items, resets to the latest recurring completion timestamp, and is never stored as a daily counter.
- The upper-right card status shows red hourglass first when due-soon, then compact `x天` when queue age is enabled.
- One item may belong to multiple boards with per-board manual ordering, but item cards do not repeat Board names in metadata.
- Priority sections are fixed Urgent/High/Normal/Low.
- Active ordering is new-first with persistent manual overrides; completing a recurring occurrence moves the live item to the bottom of its current priority section in every Board; Completed keeps the same priority sections and sorts each by completion date descending.
- New items snapshot the creating member's private display name; legacy missing authors render as 猫猫; persisted authors are immutable.
- Author icons lead the title row: 猫猫 = supplied fluffy cat portrait, 呜哇 = supplied watercolor shaggy-dog portrait, unmatched names = neutral fallback.
- New one-time and recurring completions snapshot the completing member's display name; completion rows show that member's icon; legacy missing completion actors render as 呜哇 without a migration.
- Existing items can be explicitly deleted from the editor after confirmation; deletion removes memberships, comments, and recurrence history for that item.
- Item content is directly visible; comments use 0/1/2/3+ compact presentation with first/last preservation for long threads.
- Media items do not have `mediaType`.
- Board description is optional; board comments do not exist.
- Item comments are editable and show private display names, never email.
- Inbox accepts unrestricted one-line capture.
- Developer patching is schema-limited and atomic: `items[]` can create direct items without a ticket or convert referenced Inbox tickets; Board references may use canonical IDs or unique exact titles and normalize to IDs before apply; `itemUpdates[]` remains safe existing-item metadata only.
- Export is complete for notebook business state and excludes authentication identity data.
