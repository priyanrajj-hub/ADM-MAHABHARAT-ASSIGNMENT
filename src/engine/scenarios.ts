/**
 * Scenario loader — loads scenario JSON definitions.
 */

import type { ScenarioDefinition } from './types.js';

import tutorialData from '../scenarios/tutorial.json' assert { type: 'json' };
import lowUncertaintyData from '../scenarios/low-uncertainty.json' assert { type: 'json' };
import highUncertaintyData from '../scenarios/high-uncertainty.json' assert { type: 'json' };
import highRiskIrreversibleData from '../scenarios/high-risk-irreversible.json' assert { type: 'json' };

/** All built-in scenarios */
export const scenarios: Record<string, ScenarioDefinition> = {
    tutorial: tutorialData as unknown as ScenarioDefinition,
    low_uncertainty: lowUncertaintyData as unknown as ScenarioDefinition,
    high_uncertainty: highUncertaintyData as unknown as ScenarioDefinition,
    high_risk_irreversible: highRiskIrreversibleData as unknown as ScenarioDefinition,
};

/** Get a scenario by ID */
export function getScenario(id: string): ScenarioDefinition {
    const scenario = scenarios[id];
    if (!scenario) {
        throw new Error(`Scenario "${id}" not found. Available: ${Object.keys(scenarios).join(', ')}`);
    }
    return scenario;
}

/** List all available scenario IDs */
export function listScenarios(): string[] {
    return Object.keys(scenarios);
}
