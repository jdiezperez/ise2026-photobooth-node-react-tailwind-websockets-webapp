import React, { useState, useEffect } from 'react';

const ScreenLayout = ({ topLeftText, bottomLeftText, bottomText, children }) => {
    const [randomNumber, setRandomNumber] = useState('000000');

    useEffect(() => {
        const interval = setInterval(() => {
            setRandomNumber(Math.floor(Math.random() * 900000 + 100000).toString());
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full bg-black text-white flex flex-col font-alphabet">
            {/* Top Row */}
            <div className="h-[15vh] w-full flex items-center justify-between px-10 border-b border-white/20">
                <span className="text-sm font-mono font-medium tracking-widest uppercase truncate">ISE26</span>
                <span className="text-sm font-mono tracking-tighter opacity-80">{randomNumber}</span>
            </div>

            {/* Central Row */}
            <div className="h-[70vh] w-full flex relative overflow-hidden">
                {/* Left Margin Line */}
                <div className="w-[10vw] h-full border-r border-white/20 flex-shrink-0" />

                {/* Main Content Area */}
                <div className="flex-grow h-full relative overflow-hidden">
                    {children}
                </div>

                {/* Right Margin Line */}
                <div className="w-[10vw] h-full border-l border-white/20 flex-shrink-0" />
            </div>

            {/* Bottom Row */}
            <div className="h-[15vh] w-full flex items-center justify-between px-10 border-t border-white/20">
                <span className="text-sm font-mono font-medium tracking-widest uppercase truncate">{bottomLeftText}</span>
                <span className="text-sm font-alphabet font-regular tracking-tight truncate text-center px-4">An interactive experience by <b>FRAMEMOV</b></span>
                <span className="text-sm font-mono tracking-widest uppercase text-right">FRAMEMOV</span>
            </div>
        </div>
    );
};

export default ScreenLayout;
