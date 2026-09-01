# Metrics Documentation

This document explains the mathematical and conceptual foundations for the metrics produced by the Chakravyūha Decision Simulator.

## 1. How "Optimal" is Computed

For both `decisionQuality` and `regret`, "optimal" is **NOT** computed via a brute-force or exhaustive search over the decision graph.

Instead, it is a **hand-authored reference policy** written directly into the scenario JSON (e.g., `reference_policy` and `reference_score`). This score serves as a human-authored benchmark representing the best-known path, not a mathematically proven true optimum. Any dashboard or future paper must label this as a "reference policy" (or baseline) rather than an absolute mathematical optimum. `decisionQuality` measures how close the run came to this hand-authored reference score, and `regret` measures the gap.

## 2. Robustness Perturbation Mechanism

The `robustness` metric perturbs the baseline scenario by measuring the stochastic variance of a static decision sequence:

- **Same decisions, multiple seeds (perturbing the environment's randomness).**

When `runPerturbationTrials` is executed, the EXACT same sequence of decision actions is replayed against the same scenario, but the PRNG seed is incremented for each trial (`seed`, `seed+1`, ..., `seed+n`). This isolates the effect of the environment's stochastic transitions (e.g. probability checks) on the outcome. `robustness` is derived from the standard deviation of outcomes across these identical-decision trials, penalizing variance.

## 3. Edge Cases

The transition engine is designed to handle edge cases predictably:

- **Exhausted Information**: If `gather_info` is called when no hidden information remains in the current state/scenario, the simulation treats this as a **no-op that still consumes resources** and time (representing wasted intelligence efforts).
- **Invalid Actions**: If an action is requested that the scenario does not allow in that state (e.g., `withdraw` on a state where withdrawal isn't defined in `availableActions`), the engine will **reject it with a hard Error**. Such behavior must be caught and prevented by upstream UI or policy agents.
- **Resource/Time Exhaustion**: Hitting 0 resources or 0 time remaining instantly triggers a forced outcome (`out_of_resources` or `out_of_time`) with degraded task completion scores.

## 4. Metric Range Enforcement

All 8 metrics—`decisionQuality`, `riskExposure`, `informationEfficiency`, `regret`, `robustness`, `decisionTime`, `resourceEfficiency`, and `taskCompletion`—are explicitly clamped to the `[0,1]` range in code via a `clamp01()` helper function. This is enforced regardless of pathological inputs, such as negative remaining resources, extreme risk additions, or generating scores higher than the reference policy limit.
