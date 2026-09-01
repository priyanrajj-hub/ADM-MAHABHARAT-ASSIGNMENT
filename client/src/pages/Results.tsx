import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Results() {
    const [trialData, setTrialData] = useState<any>(null);

    useEffect(() => {
        const data = localStorage.getItem('last_trial');
        if (data) {
            setTrialData(JSON.parse(data));
        }
    }, []);

    if (!trialData) return <div className="mt-12 text-center text-white">Loading...</div>;

    const { finalState, metrics, decisions, scenarioId } = trialData;

    const metricCards = [
        { label: 'Decision Quality', value: metrics.decisionQuality },
        { label: 'Info Efficiency', value: metrics.informationEfficiency },
        { label: 'Regret', value: metrics.regret },
        { label: 'Task Completion', value: metrics.taskCompletion },
        { label: 'Risk Exposure', value: metrics.riskExposure },
        { label: 'Resource Efficiency', value: metrics.resourceEfficiency },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 flex flex-col gap-6">
            <div className="text-center mb-4">
                <h2 className="text-3xl font-extrabold text-white">Trial Concluded</h2>
                <p className="text-gray-400 mt-2">Scenario: {scenarioId} • Reason: <span className="text-primary uppercase">{finalState.terminationReason}</span></p>
            </div>

            <div className="panel grid grid-cols-2 md:grid-cols-3 gap-6">
                {metricCards.map((m, i) => (
                    <div key={i} className="text-center p-4 bg-background border border-gray-800 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase mb-2">{m.label}</div>
                        <div className={`text-2xl font-mono ${m.value > 0.7 ? 'text-success' : m.value < 0.3 ? 'text-danger' : 'text-warning'}`}>
                            {(m.value * 100).toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>

            <div className="panel">
                <h3 className="text-xl font-bold text-white mb-4">Decision History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-background">
                            <tr>
                                <th className="px-4 py-2">Step</th>
                                <th className="px-4 py-2">Action</th>
                                <th className="px-4 py-2">Layer</th>
                                <th className="px-4 py-2">Risk</th>
                                <th className="px-4 py-2">Resources</th>
                                <th className="px-4 py-2">Time (ms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {decisions.map((d: any) => (
                                <tr key={d.step} className="border-b border-gray-800">
                                    <td className="px-4 py-2 font-mono">{d.step}</td>
                                    <td className="px-4 py-2 text-primary">{d.action}</td>
                                    <td className="px-4 py-2">{d.layer}</td>
                                    <td className="px-4 py-2">{(d.riskAfter * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-2">{d.resourcesAfter}</td>
                                    <td className="px-4 py-2 font-mono">{d.decision_time_ms}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <Link to="/scenarios" className="btn btn-primary">
                    Return to Scenarios
                </Link>
            </div>
        </div>
    );
}
