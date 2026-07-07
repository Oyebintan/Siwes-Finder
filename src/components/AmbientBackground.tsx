'use client';

function CircuitSVG({ id, flip }: { id: string; flip?: boolean }) {
    const path = "M400 40 L260 40 L260 120 L160 120 L160 200 L40 200";
    const branch = "M260 80 L200 80 L200 40";

    return (
        <svg
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
            style={flip ? { transform: 'scaleX(-1) scaleY(-1)' } : undefined}
        >
            <defs>
                <filter id={`glow-${id}`} x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <path d={path} fill="none" stroke="var(--circuit-color)" strokeWidth="1.5" strokeLinecap="round" />
            <path d={branch} fill="none" stroke="var(--circuit-color)" strokeWidth="1" strokeLinecap="round" opacity="0.6" />

            {[[260, 40], [260, 120], [160, 120], [160, 200], [200, 40]].map(([cx, cy], i) => (
                <rect key={i} x={cx - 3} y={cy - 3} width="6" height="6" fill="var(--circuit-color)" opacity="0.7" />
            ))}

            <circle r="4" fill="var(--circuit-color)" filter={`url(#glow-${id})`}>
                <animateMotion dur="9s" repeatCount="indefinite" path={path} />
            </circle>
        </svg>
    );
}

export default function AmbientBackground() {
    return (
        <div className="ambient-backdrop" aria-hidden="true">
            <div className="circuit-corner top-right">
                <CircuitSVG id="tr" />
            </div>
            <div className="circuit-corner bottom-left">
                <CircuitSVG id="bl" flip />
            </div>
        </div>
    );
}
