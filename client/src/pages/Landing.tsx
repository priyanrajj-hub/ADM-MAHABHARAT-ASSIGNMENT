import { Link } from 'react-router-dom';

export default function Landing() {
    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 text-center mt-12">
            <div className="relative w-48 h-48 mx-auto mb-4">
                {/* Abstract graphic representing the circular structure */}
                <div className="absolute inset-0 rounded-full border border-gray-700 m-2"></div>
                <div className="absolute inset-0 rounded-full border border-gray-600 m-6"></div>
                <div className="absolute inset-0 rounded-full border border-gray-500 m-10"></div>
                <div className="absolute inset-0 rounded-full border border-primary m-14 animate-pulse"></div>
            </div>

            <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                Decision-Making Under Uncertainty
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A deterministic research simulator modeling multi-layer risk extraction and incomplete information.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                <Link to="/tutorial" className="btn btn-primary text-lg">
                    Interactive Tutorial
                </Link>
                <Link to="/scenarios" className="btn text-lg">
                    Browse Scenarios
                </Link>
            </div>
        </div>
    );
}
