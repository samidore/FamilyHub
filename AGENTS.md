# AGENTS.md

Before making a change:

1. Read [`PROJECT.md`](PROJECT.md) as the concise project index and mandatory-policy summary.
2. Read [`gpt.md`](gpt.md) for coding behavior rules.
3. Read the relevant page README under [`docs/modules/`](docs/modules/) and the linked shared rules under [`docs/project/`](docs/project/).
4. For Meal Builder changes, read its `README.md`, `behavior.md`, `data-model.md`, `maintenance.md`, and the relevant `sources.md` or `firebase.md` before editing data, UI, or shared state.
5. Consult `HANDOFF_Family_Hub.md`, `family_outing_hub_combined_prototype.html`, and `docs/archive/FAMILY_MEAL_KB.dump.md` only as historical migration references. They are historical input, not current sources.
6. Preserve existing research and uncommitted user work unless the user explicitly asks to replace it. If current user instructions conflict with the project docs, report the conflict before implementing.
7. Run the relevant checks, then the complete verification gate in [`docs/project/acceptance-release.md`](docs/project/acceptance-release.md). After requested implementation work passes, commit and push task-related changes unless the user explicitly says not to. Never include unrelated user work in that commit or push.
