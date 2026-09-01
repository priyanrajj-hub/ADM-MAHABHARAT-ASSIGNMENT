import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Tutorial from './pages/Tutorial';
import Scenarios from './pages/Scenarios';
import Simulate from './pages/Simulate';
import Results from './pages/Results';

function App() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-h-screen flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-pulse" />
                    Chakravyūha Simulator
                </h1>
            </header>

            <main className="flex-1 w-full flex flex-col items-center">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/tutorial" element={<Tutorial />} />
                    <Route path="/scenarios" element={<Scenarios />} />
                    <Route path="/simulate/:id" element={<Simulate />} />
                    <Route path="/results/:id" element={<Results />} />
                </Routes>
            </main>

            <footer className="mt-12 text-sm text-gray-500 text-center">
                <p>Research Simulator Interface • Deterministic Decision Engine</p>
            </footer>
        </div>
    );
}

export default App;
