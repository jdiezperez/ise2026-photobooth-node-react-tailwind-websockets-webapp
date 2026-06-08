import React, { useState, useEffect } from 'react';

const GridBackground = ({ sectionName = "MAIN", topCenter = "", onHome }) => {
    const [randomNumber, setRandomNumber] = useState("000000");

    useEffect(() => {
        const interval = setInterval(() => {
            const num = Math.floor(Math.random() * 900000) + 100000;
            setRandomNumber(num.toString());
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 z-0 flex flex-col pointer-events-none select-none">
            {/* Horizontal Line 1 (Top) */}
            <div className="absolute top-[15%] left-0 w-full h-[1px] bg-white/20" />
            {/* Horizontal Line 2 (Bottom) */}
            <div className="absolute bottom-[15%] left-0 w-full h-[1px] bg-white/20" />
            {/* Vertical Line 1 (Left) */}
            <div className="absolute left-[15%] top-0 h-full w-[1px] bg-white/20" />
            {/* Vertical Line 2 (Right) */}
            <div className="absolute right-[15%] top-0 h-full w-[1px] bg-white/20" />

            {/* Labels */}
            {/* Top Left: Section Name */}
            <div className="absolute top-[7.5%] left-[7.5%] -translate-x-1/2 -translate-y-1/2">
                <span className="font-mono text-lg tracking-widest uppercase opacity-80">{sectionName}</span>
            </div>

            {/* Top Center: Context Title */}
            <div className="absolute top-[7.5%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="font-alphabet font-medium text-4xl tracking-tight text-white">{topCenter}</span>
            </div>

            {/* Top Right: Random Number */}
            <div className="absolute top-[7.5%] right-[7.5%] translate-x-1/2 -translate-y-1/2">
                <span className="font-mono text-lg tracking-widest opacity-80">{randomNumber}</span>
            </div>

            {/* Bottom Left: VELORA - Home Link */}
            <div
                className={`absolute bottom-[7.5%] left-[7.5%] -translate-x-1/2 translate-y-1/2 ${onHome ? 'pointer-events-auto cursor-pointer group' : ''}`}
                onClick={onHome}
            >
                <span className={`font-mono text-lg tracking-widest uppercase opacity-80 ${onHome ? 'group-hover:opacity-100 transition-opacity text-white' : ''}`}>VELORA</span>
            </div>

            {/* Bottom Center: Subhead */}
            <div className="absolute bottom-[7.5%] left-1/2 -translate-x-1/2 translate-y-1/2 whitespace-nowrap">
                <span className="font-alphabet font-medium text-xl tracking-wider opacity-80">
                    An interactive experience by <span className="font-bold">FRAMEMOV</span>
                </span>
            </div>

            {/* Bottom Right: FRAMEMOV */}
            <div className="absolute bottom-[7.5%] right-[7.5%] translate-x-1/2 translate-y-1/2">
                <span className="font-mono text-lg tracking-widest uppercase opacity-80">FRAMEMOV</span>
            </div>
        </div>
    );
};

export default GridBackground;
