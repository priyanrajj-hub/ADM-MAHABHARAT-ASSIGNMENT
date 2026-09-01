# Chakravyūha: An Incomplete-Information Decision Simulator

## What this actually is

This is **not** a mythology game and **not** a chatbot. It's a browser-based
research tool for studying how people make sequential decisions when
information is incomplete, risk changes, and time/resources run out. The
Chakravyūha (from the Mahābhārata) is used only as a structural metaphor —
a layered, narrowing decision space — not as a historical retelling.

There is no AI opponent and no generative-AI component in the simulator
itself. Any AI (Claude/Antigravity) was used only to help build the code —
see `docs/ai-disclosure.md`.

## Where things live

| What you're looking for | Where it is |
| --- | --- |
| The decision engine (pure logic, no UI) | `src/engine/` |
| Scenario definitions (data, not code) | `src/scenarios/*.json` |
| Metrics (decision quality, risk, regret, etc.) | `src/engine/metrics.ts` |
| Unit tests | `src/__tests__/` |
| The web app / simulation screen (Milestone 2) | `client/` |
| Backend + database (Milestone 3) | *not built yet* |
| Analytics dashboard (Milestone 4) | *not built yet* |
| Live deployed website | *not deployed yet — TODO* |

## Current status

- ✅ **Milestone 1**: Core engine, 4 scenarios, 8 metrics, 86 passing tests,
  seed reproducibility verified.
- ✅ **Milestone 2**: React frontend built (Pages, Routing, UI, localStorage event log).
- 🚧 **Milestone 3**: Backend/DB/API — next up.
- ⬜ **Milestone 4**: Full scenario set, baselines, dashboard — not started.
- ⬜ **Milestone 5**: Deployment — not started. No live URL exists yet.

## Running it right now

### Engine tests (Milestone 1 — works now)

```bash
npm install
npm test
```

### Web app (Milestone 2 — once built)

```bash
cd client
npm install
npm run dev
```

## Project structure

```
chakravyuha/
├── src/
│   ├── engine/
│   │   ├── prng.ts          # Seeded PRNG (Mulberry32) — deterministic randomness
│   │   ├── types.ts         # State/Action/Observation/Scenario type definitions
│   │   ├── transition.ts    # Core transition function (S_t, I_t, action → S_(t+1))
│   │   ├── metrics.ts       # 8 metric functions (all clamped [0,1])
│   │   ├── simulation.ts    # Trial orchestrator + perturbation trials
│   │   ├── scenarios.ts     # Scenario loader
│   │   └── index.ts         # Barrel export
│   ├── scenarios/
│   │   ├── tutorial.json            # 3 layers, low risk, full info
│   │   ├── low-uncertainty.json     # 5 layers, mostly visible
│   │   ├── high-uncertainty.json    # 5 layers, heavy hidden info
│   │   └── high-risk-irreversible.json  # 4 layers, irreversible decisions
│   └── __tests__/
│       ├── prng.test.ts        # 14 tests
│       ├── transition.test.ts  # 12 tests
│       ├── metrics.test.ts     # 47 tests
│       └── simulation.test.ts  # 13 tests (includes seed reproducibility proof)
├── client/                     # React frontend (Milestone 2)
├── docs/
│   └── ai-disclosure.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## What still needs a human decision

- **"Optimal" / "regret" computation**: Each scenario uses a hand-authored
  "reference policy" (best-known path), not a mathematically proven optimum.
  This is documented in `metrics.ts` JSDoc. Whether to replace this with
  brute-force search over the decision tree is a research design choice.
- **Robustness perturbation**: Currently measured by replaying the same
  decisions with seeds `[seed, seed+1, ..., seed+n]`. Whether to also
  perturb scenario parameters is a methodology decision.
- **Real participant studies**: This repo currently only supports
  synthetic/demo data. No research claims should be made from it yet.
  IRB/ethics review is required before any human-subjects work.

## AI disclosure

Portions of this code were generated with AI coding assistance (Claude,
Google Antigravity). All logic has been reviewed against the acceptance
criteria in the milestone spec before being committed. AI did not design the
research methodology and should not be cited as a source of research
findings. See `docs/ai-disclosure.md` for details.
