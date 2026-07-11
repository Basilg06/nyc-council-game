# Council Game

A political simulation of being Mayor of New York City. React + Vite, no backend — game state lives in memory and autosaves to `localStorage`.

```bash
npm install
npm run dev
```

## Current content (demo)

**Year One — 2026:** inauguration calls (Hochul, Trump, Tisch — fire her at your peril) → the January desk (four invitations, time for two) → Speaker race (back Menin, Hudson, or Carr; whip votes bloc by bloc) → three-round budget fight → the NY1 sit-down (questions written by your own record) → governor's primary and general (endorse and campaign).

**Year Two — 2027:** the Mayor's desk — three events taken in any order (a crisis that depends on your Year 1 budget, a federal funding showdown with the White House, the Speaker calling in a favor) → the FY28 budget call → summer hub actions → October surprise scandal → **council elections across all 51 districts** → Operation Safeguard endgame → year-end report card.

## Architecture

Everything flows through `src/data/scenes.js` — a flat map of scene objects keyed by id. `App.jsx` renders the current scene by `type`:

| type | renderer | notes |
|---|---|---|
| `dialogue` | SceneView → DialogueScene | `urgent: true` = red emergency header |
| `phone_call` | App → PhoneCallPanel | ringing screen → draggable chat panel |
| `whip_vote` | SceneView → WhipScene | per-bloc negotiation, offer chits |
| `budget_fight` | SceneView → BudgetFightScene | multi-round package: `rounds: [{title, prompt, options}]` + optional `crisis`; picks are staged with free back-navigation and only apply on ADOPT |
| `hub` | App → HubMapOverlay | map pins, N of M actions |
| `time_pass` | App → TimePassOverlay | ADVANCE TIME gate + month ticker |
| `report` | SceneView → ReportScene | end-of-year report card (+ map peek) |
| `newspaper` | SceneView → NewspaperScene | The New York Ledger front page between chapters |
| `office` | SceneView → OfficeScene | the Mayor's desk — an inbox of events the player takes in any order; advance unlocks when all are handled |

Scene conventions:
- `lines` entries can be strings or `(state) => string` functions — use functions for anything that references earlier choices.
- `choices` support `show(state)` (hidden when false), `available(state)` + `tooltip` (visible but disabled), `effect(state)` (mutates a `structuredClone` draft), and `next`.
- Phone calls support `turns: [{ lines, choices }, ...]` for multi-exchange conversations in one panel. A choice **without** `next` advances to the next turn; a choice **with** `next` ends the call via CONTINUE. `speaker` can be a function of state (used for the sitting Speaker).
- `decline` on a phone call adds a DECLINE button on the ringing screen.
- `newspaper` scenes take `stories: [{ headline, body }]` (functions of state allowed; a null headline drops the story) — the first is the lead, the rest are secondary, and the sidebar auto-fills from `getHeadlines`. On continue, the resolved edition is snapshotted into `flags.pressArchive`, readable anytime from the 🗞 LEDGER button in the top bar.
- `office` scenes take `inbox: [{ id, label, desc, next, effect?, done, show? }]` — `done(state)` marks an item handled (use the flag the event sets), `next` can be a function of state, and the advance button stays locked until the inbox is clear.

## The election engine (`src/data/elections.js`)

Hidden from the player. Each district scores every faction:

```
raw   = factionApproval × factionInfluence
      + Σ groups( approval × influence × affinity[group][faction] × salience[district][group] )
score = raw × LEAN_WEIGHT[|position(faction) − position(districtLean)|]
      + 25 incumbency bonus
```

Highest score wins the seat. `LEAN_WEIGHT` anchors districts to their electorate: adjacent factions are competitive (×0.85), two steps is an upset (×0.5), three+ is effectively dead (≤×0.18) — so a south-shore Staten Island seat swings within the GOP family and a Bed-Stuy seat swings within the left, never across the whole spectrum. Inputs the player actually controls:
- **Approvals** move with nearly every choice.
- **Influence** (mobilization multipliers) moves with budget picks (`INFLUENCE_SHIFTS`, applied automatically in BudgetRoundScene), campaign-trail hub actions, and 2027 summer hub actions.

`runCouncilElectionMut` recomputes all 51 seats on election night 2027, seats replacement members on flips, and stores a summary in `flags.election2027`. The district map and seat arc recolor automatically because they read `state.council`.

## Other systems

- **News wire** (`src/data/news.js` + `NewsTicker`): deterministic, state-reactive headlines at the bottom of the map. Add headlines by pushing onto the array in `getHeadlines` — loudest stories first, evergreen filler pads the tail.
- **Autosave**: every state/scene change writes to `localStorage` (`cg_save`); NEW GAME in the top bar clears it. Saved state is spread over `initialState`, so adding new top-level fields is save-compatible.
- **Consequence flags**: `flags.*` is the long-term memory — deferred budget tricks come back as crises, `owesHochul` gates endorsements, `speakerElected` + `backedX` set the temperature of later conversations. When adding content, prefer reading existing flags over adding parallel ones.

## Roadmap (short version)

Alpha: full Term 1 (2028 presidential cycle, 2029 re-election campaign), crisis pool expansion, council bill mechanic. Beta: Term 2, endings, legacy scoring. See the scene graph in `scenes.js` — the demo currently ends at `year2_report`.
