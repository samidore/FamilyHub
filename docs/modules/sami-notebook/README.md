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

1. Fixed smart `Urgent` board, always first. It is computed from active items with `priority = urgent`; it is not a normal membership target.
2. Visible registered boards in shared board order.
3. Quick Inbox input at the bottom. Submitting any non-empty sentence creates a ticket immediately with no schema gate.

All board visibility, board order, collapse state, and top filter state are household-shared state, not per-user preferences.

## Board registry

Boards are dynamic records. No task/media board names are hard-coded into rendering logic.

```text
Board
- id
- title
- kind: task | media
- description?: string
- visible: boolean
- collapsed: boolean
- order: integer
- createdAt
- updatedAt
```

`description` is optional and normally absent. There are no board-level comments.

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
- dueDate?: YYYY-MM-DD
- dueTime?: HH:MM
- recurrence?: supported recurrence rule
- createdAt
- updatedAt
- completedAt?: timestamp

Optional media fields
- platform?: string
- imdbRating?: number
- myRating?: number
- notes?: string
- review?: string
```

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

For the expected household scale, use simple dense integer ordering and rewrite the affected section after insertion/drag. Do not introduce fractional ranking unless a measured need appears.

### Completed ordering

`Completed` keeps the same fixed priority sections. Within each section, sort by `completedAt DESC`. Manual membership order is ignored.

### All ordering

Within each board and priority section, show Active items first using their manual order, then completed entries using `completedAt DESC`.

## Completion and recurrence

One-time item completion:

- set `status = completed`;
- set `completedAt`;
- retain the item indefinitely unless the user explicitly deletes it later.

Restoring it clears `completedAt` and returns it to Active at the top of its priority section.

Recurring completion must preserve history while keeping the next occurrence active. Do not overwrite the only completion timestamp. Store a completion event for each occurrence, then advance the same item's next due date and leave the item active. Completed views render those recurring completion events as historical rows, grouped by the priority recorded at completion time.

A recurrence completion event needs only the minimum snapshot required for stable history:

```text
CompletionEvent
- id
- itemId
- completedAt
- priority
- boardIds[]
```

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

The UI shows `authorName`, never email. The public repo must not contain an email-to-name map. Resolve the signed-in member to a private household display name in Firebase and snapshot that display name onto a new comment. Authentication identity data is not part of notebook export data.

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

`Copy all` produces one JSON payload containing:

- protocol version;
- current board IDs/titles/kinds;
- all Inbox ticket IDs/text/timestamps.

It intentionally does not copy the rest of the private notebook database.

### Chat patch input

A textarea accepts a complete JSON patch returned by ChatGPT. Version 1 is intentionally narrow: it converts Inbox tickets into normalized items using existing board IDs. Board creation/renaming remains normal website UI rather than arbitrary patch behavior.

Patch shape:

```text
NotebookPatch
- patchVersion
- items[]
    - ticketId
    - title
    - details
    - boardIds[]
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

Apply flow:

1. Parse JSON.
2. Validate the complete patch against the notebook patch schema.
3. Reject unknown board IDs, duplicate ticket IDs, invalid enums/dates/times, malformed ratings, or tickets no longer present.
4. Show a compact preview: number of tickets to convert and target boards.
5. One Apply action performs one transaction: create generated item IDs, create board memberships, then delete only the successfully converted Inbox tickets.
6. A validation or transaction failure writes nothing.

Do not allow version-1 patches to write arbitrary Firebase paths, modify unrelated existing items, alter membership/auth records, or execute deletes outside the referenced Inbox tickets.

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

The export must contain all notebook business state needed to reconstruct the module, but must exclude:

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
- Add private display-name resolution for comment author names.

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
- Add schema-validated atomic Chat patch apply.
- Add portable database export.

### Phase 5 — release verification

Run focused checks during implementation, then the repository release gate:

```bash
pnpm run verify
```

Verify mobile widths, two-phone realtime synchronization, member authorization, rule rejection for non-members, comment author names, all ordering transitions, recurrence history, patch atomicity, and export exclusion of auth identity data.

## Design acceptance criteria

This design is ready for implementation when all of the following are fixed:

- `Sami的小本本` is an independent top-level sibling module, not part of Meal Builder; its navigation/module-card position is immediately after Meal Builder.
- Live state is Firebase, with a separate notebook domain/path.
- Git backup is a private portable snapshot, not runtime storage.
- Module privacy classification is explicitly authenticated-household before activation.
- Boards are dynamic and may be reordered/hidden/collapsed as household-shared state.
- Smart Urgent is computed and fixed first.
- One item may belong to multiple boards with per-board manual ordering.
- Priority sections are fixed Urgent/High/Normal/Low.
- Active ordering is new-first with persistent manual overrides; Completed keeps the same priority sections and sorts each by completion date descending.
- Media items do not have `mediaType`.
- Board description is optional; board comments do not exist.
- Item comments are editable and show private display names, never email.
- Inbox accepts unrestricted one-line capture.
- Developer patching is schema-limited and atomic.
- Export is complete for notebook business state and excludes authentication identity data.
