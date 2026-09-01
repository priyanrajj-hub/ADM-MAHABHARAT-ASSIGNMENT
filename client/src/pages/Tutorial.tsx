import { Link } from 'react-router-dom';

export default function Tutorial() {
    return (
        <div className="w-full max-w-4xl mx-auto panel mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Understanding the Environment</h2>
            <div className="prose prose-invert max-w-none text-gray-300">
                <p>
                    The <strong>Chakravyūha Simulator</strong> places you in a multi-layered decision environment.
                    Your objective is to navigate toward the center of the formation while managing risk, resources, and time.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                    <div className="bg-background rounded-lg p-4 border border-gray-800">
                        <h3 className="text-primary font-medium mb-2">Available Actions</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Proceed:</strong> Attempt to break through to the next layer. Costs resources and time, adds risk.</li>
                            <li><strong>Gather Information:</strong> Expend resources to reveal hidden state details before moving.</li>
                            <li><strong>Change Strategy:</strong> Pivot to a different tactical approach.</li>
                            <li><strong>Withdraw:</strong> Extract safely with whatever progress you've made.</li>
                        </ul>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-gray-800">
                        <h3 className="text-primary font-medium mb-2">Constraints</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Resources:</strong> Depleted by most actions. Running out forces an immediate failure outcome.</li>
                            <li><strong>Time:</strong> Strictly limited. Each layer transition or intel-gathering takes time.</li>
                            <li><strong>Risk:</strong> Cumulative hazard level. High risk can heavily impact stochastic transitions in uncertain scenarios.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <Link to="/simulate/tutorial" className="btn btn-primary">
                    Start Tutorial Scenario →
                </Link>
            </div>
        </div>
    );
}
