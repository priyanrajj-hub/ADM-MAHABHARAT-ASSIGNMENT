import { Link } from 'react-router-dom';
import { listScenarios, getScenario } from '@engine/scenarios';
import type { ScenarioDefinition } from '@engine/types';

export default function Scenarios() {
    const scenarioIds = listScenarios();
    const scenarios = scenarioIds.map(id => getScenario(id));

    return (
        <div className="w-full max-w-5xl mx-auto mt-8">
            <h2 className="text-3xl font-bold text-white mb-8">Scenario Library</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenarios.map((scenario: ScenarioDefinition) => (
                    <div key={scenario.scenario_id} className="panel flex flex-col hover:border-gray-600 transition-colors">
                        <h3 className="text-xl font-bold text-white mb-2">{scenario.title}</h3>
                        <div className="text-sm text-gray-400 mb-4 flex-1">
                            {scenario.description}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6 text-xs font-mono">
                            <span className="bg-background px-2 py-1 rounded text-primary border border-gray-800">
                                {scenario.layers} Layers
                            </span>
                            <span className="bg-background px-2 py-1 rounded text-danger border border-gray-800">
                                Risk: {scenario.risk_level}
                            </span>
                            <span className="bg-background px-2 py-1 rounded text-warning border border-gray-800">
                                Uncert: {scenario.uncertainty_level}
                            </span>
                        </div>

                        <Link to={`/simulate/${scenario.scenario_id}`} className="btn btn-primary w-full text-center">
                            Launch Scenario
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
