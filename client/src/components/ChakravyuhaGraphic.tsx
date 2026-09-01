export function ChakravyuhaGraphic({ currentLayer, totalLayers }: { currentLayer: number; totalLayers: number }) {
    const rings = [];

    // Create outer rings to inner rings
    for (let i = 0; i <= totalLayers; i++) {
        const isCurrent = currentLayer === i;
        const isPassed = currentLayer > i;

        // Closer to center = smaller div / higher margin
        // We reverse the logic so i=0 (layer 0) is the outermost ring
        const sizePercent = 100 - (i * (100 / (totalLayers + 2)));
        const offsetPercent = (100 - sizePercent) / 2;

        rings.push(
            <div
                key={i}
                className={`absolute rounded-full border-2 transition-all duration-1000 ${isCurrent ? 'border-primary shadow-[0_0_20px_rgba(56,189,248,0.5)] z-10 animate-pulse' :
                        isPassed ? 'border-gray-500 opacity-40' : 'border-gray-700'
                    }`}
                style={{
                    top: `${offsetPercent}%`,
                    left: `${offsetPercent}%`,
                    width: `${sizePercent}%`,
                    height: `${sizePercent}%`
                }}
            />
        );
    }

    return (
        <div className="relative w-64 h-64 mx-auto my-8">
            {rings}
            {/* Center objective marker */}
            <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-colors duration-1000 ${currentLayer === totalLayers ? 'bg-success shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'bg-gray-800'}`}
            />
        </div>
    );
}
