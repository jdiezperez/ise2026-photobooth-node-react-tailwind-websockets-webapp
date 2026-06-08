import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import GridBackground from './GridBackground';
import Webcam from 'react-webcam';
import { Loader2 } from 'lucide-react';

// --- Reusable UI ---
const Title = ({ children }) => (
    <h1 className="text-4xl md:text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-sm uppercase tracking-wider">
        {children}
    </h1>
);

const SelectionButton = ({ label, img, onClick, active }) => (
    <button
        onClick={onClick}
        className="relative group overflow-hidden w-full h-full transition-all duration-300 transform active:scale-[0.98] cursor-pointer min-h-0 min-w-0"
    >
        {/* Image Background */}
        <div className="absolute inset-0 z-0">
            {img ? (
                <img src={img} alt={label} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
            ) : (
                <div className="w-full h-full bg-neutral-900" />
            )}
        </div>

        {/* Selection Overlay */}
        {active && (
            <div className="absolute inset-0 bg-pink-500/60 z-10 mix-blend-overlay" />
        )}

        {/* Text Label - Bottom Left */}
        <div className="absolute bottom-10 left-10 z-20">
            <h3 className="text-4xl font-alphabet font-bold uppercase tracking-wider text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                {label}
            </h3>
        </div>
    </button>
);

// --- Steps ---

const StartStep = ({ onStart, sectionName = "MAIN", onHome }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName={sectionName} onHome={onHome} />

        {/* Loop Background Video */}
        <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
            >
                <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
            </video>
        </div>

        <button
            onClick={onStart}
            className="relative px-20 py-10 rounded-[50px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-105 active:scale-95 z-10 cursor-pointer"
            style={{
                background: 'radial-gradient(circle at center, black 10%, #ffffff44 100%)',
            }}
        >
            {/* Secondary Inner Glow/Glass effect */}
            <div className="absolute inset-0 bg-white/[0.05] backdrop-blur-lg group-hover:bg-white/[0.1] transition-colors" />

            <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">
                START
            </span>
        </button>
    </div>
);

const SelectionStep = ({ title, sectionName, options, onSelect, selections, type, isProcessing, onHome }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        {/* Pass the title to be displayed in the Top Center quadrant of the main grid */}
        <GridBackground sectionName={sectionName} topCenter={title} onHome={onHome} />

        {/* Central area quadrants (filling the space between the 15% grid lines) */}
        <div className="absolute top-[15%] bottom-[15%] left-[15%] right-[15%] z-10 overflow-hidden">
            <div className={`w-full h-full grid grid-cols-2 grid-rows-2 transition-all duration-500 ${isProcessing && type !== 'background' ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Internal dividers for the 4 central quadrants */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 z-30 pointer-events-none" />
                <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/20 z-30 pointer-events-none" />

                {options.map((opt, idx) => (
                    <SelectionButton
                        key={idx}
                        label={opt.label}
                        img={opt.img}
                        active={selections[type] === opt.id}
                        onClick={() => !isProcessing && onSelect(opt.id)}
                    />
                ))}
            </div>

            {/* Processing Loader Overlay - Hide for Background */}
            {isProcessing && type !== 'background' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                    <Loader2 className="w-24 h-24 text-white animate-spin drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                </div>
            )}
        </div>
    </div>
);

const CaptureTriggerStep = ({ title, sectionName, onTakePhoto, isCountingDown, countdown, webcamRef, onHome }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName={sectionName} topCenter={title} onHome={onHome} />
        {/* Loop Background Video */}
        <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
            >
                <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
            </video>
        </div>

        {!isCountingDown && (
            <button
                onClick={onTakePhoto}
                className="relative px-20 py-10 rounded-[50px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                style={{
                    background: 'radial-gradient(circle at center, black 10%, #ffffff44 100%)',
                }}
            >
                {/* Secondary Inner Glow/Glass effect */}
                <div className="absolute inset-0 bg-white/[0.05] backdrop-blur-lg group-hover:bg-white/[0.1] transition-colors" />

                <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">
                    CONTINUE
                </span>
            </button>
        )}

        {countdown !== null && <CountdownOverlay count={countdown} />}
    </div>
);

const CountdownOverlay = ({ count }) => (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
        <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            className="text-[12rem] font-alphabet font-bold text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
        >
            {count}
        </motion.div>
    </div>
);

const ReviewStep = ({ onRetake, onGenerate, capturedImage, onHome }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName="READY" topCenter="Photo ready. Enjoy!" onHome={onHome} />

        {/* Central Audio/Visual Area */}
        <div className="relative w-[1000px] aspect-video flex items-center justify-center">
            {/* Captured Image Preview - HIDDEN/REMOVED as it shows on SCREEN */}
            <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0 opacity-100 bg-black flex items-center justify-center">
                {/* Empty container as per request */}
            </div>
            {/* Loop Background Video */}
            <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
                </video>
            </div>

            <div className="relative z-10 flex gap-12">
                {/* Repeat Button */}
                <button
                    onClick={onRetake}
                    className="relative px-16 py-8 rounded-[40px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    style={{
                        background: 'radial-gradient(circle at center, black 10%, #ffffff33 110%)',
                    }}
                >
                    <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">
                        Repeat
                    </span>
                </button>

                {/* Generate Button */}
                <button
                    onClick={onGenerate}
                    className="relative px-16 py-8 rounded-[40px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    style={{
                        background: 'radial-gradient(circle at center, black 10%, #ffffff33 110%)',
                    }}
                >
                    <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">
                        Generate
                    </span>
                </button>
            </div>
        </div>
    </div>
);

const ProcessingStep = ({ sectionName, onHome, error, onRetry }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName={sectionName} topCenter={error ? "Error" : "Creating..."} onHome={onHome} />

        <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Loop Background Video */}
            <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
                </video>
            </div>
            {error ? (
                <>
                    <div className="text-4xl font-alphabet font-bold text-red-500 mb-8 max-w-[600px] text-center uppercase tracking-wider drop-shadow-md">
                        {error}
                    </div>
                    <button
                        onClick={onRetry}
                        className="relative px-10 py-5 rounded-[50px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                        style={{
                            background: 'radial-gradient(circle at center, black 10%, #ffffff44 100%)',
                        }}
                    >
                        {/* Secondary Inner Glow/Glass effect */}
                        <div className="absolute inset-0 bg-white/[0.05] backdrop-blur-lg group-hover:bg-white/[0.1] transition-colors" />

                        <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">
                            TRY AGAIN
                        </span>
                    </button>
                </>
            ) : (
                <>
                    <Loader2 className="w-32 h-32 text-white animate-spin drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] mb-8" />
                    <h2 className="text-4xl font-alphabet font-bold text-white uppercase tracking-widest animate-pulse">
                        Generating...
                    </h2>
                </>
            )}
        </div>
    </div>
);

const DownloadForm = ({ onSubmit, onCancelForm, onHome, isSending, error }) => {
    const [formData, setFormData] = useState({ name: '', company: '', email: '', privacy: false });
    const [errors, setErrors] = useState({});
    const [showPrivacy, setShowPrivacy] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.company.trim()) newErrors.company = "Company is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate() && formData.privacy) {
            onSubmit(formData);
        }
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <GridBackground sectionName="DOWNLOAD" topCenter="" onHome={onHome} />

            {/* Central area (matching the 15% grid lines) */}
            <div className="absolute top-[15%] bottom-[15%] left-[15%] right-[15%] z-10 flex flex-col items-center justify-center">
                {/* Loop Background Video - REMOVED to prevent play icon */}
                {/* <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0 opacity-80 pointer-events-none">
                    <video ... />
                </div> */}
                {/* Loop Background Video */}
                <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0]">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_BIG_BLUR_H.mp4" type="video/mp4" />
                    </video>
                </div>
                <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0 backdrop-blur-sm pointer-events-none" />
                <form
                    onSubmit={handleSubmit}
                    className="relative z-10 w-full h-full flex flex-col justify-evenly items-center p-4 md:p-8"
                >
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-alphabet font-bold text-white tracking-tight text-center shadow-black drop-shadow-lg">
                        Get your Photo
                    </h2>

                    <div className="w-full grid grid-cols-2 gap-x-8 md:gap-x-16 gap-y-4 md:gap-y-8 px-4 md:px-12">
                        <div className="flex flex-col gap-2">
                            <label className="text-xl md:text-2xl font-alphabet font-medium text-white/90 ml-2 uppercase tracking-tight">Full name</label>
                            <input
                                type="text"
                                value={formData.name}
                                className="w-full bg-black/40 border border-white/20 rounded-[2rem] px-6 py-3 md:py-4 text-2xl md:text-3xl text-white outline-none focus:border-white/50 transition-colors"
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xl md:text-2xl font-alphabet font-medium text-white/90 ml-2 uppercase tracking-tight">Company</label>
                            <input
                                type="text"
                                value={formData.company}
                                className="w-full bg-black/40 border border-white/20 rounded-[2rem] px-6 py-3 md:py-4 text-2xl md:text-3xl text-white outline-none focus:border-white/50 transition-colors"
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-2 px-4 md:px-12">
                        <label className="text-xl md:text-2xl font-alphabet font-medium text-white/90 ml-2 uppercase tracking-tight">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            className="w-full bg-black/40 border border-white/20 rounded-[2rem] px-6 py-3 md:py-4 text-2xl md:text-3xl text-white outline-none focus:border-white/50 transition-colors"
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="w-full flex items-center justify-between px-4 md:px-12 mt-4">
                        <div className="flex items-center gap-4 group">
                            <div
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 border-white/30 flex items-center justify-center transition-all cursor-pointer ${formData.privacy ? 'bg-white/20' : 'bg-transparent'}`}
                                onClick={() => setFormData({ ...formData, privacy: !formData.privacy })}
                            >
                                {formData.privacy && <div className="w-6 h-6 bg-white rounded-md" />}
                            </div>
                            <span className="text-xl md:text-2xl font-alphabet font-medium text-white/90">
                                I accept the <button type="button" onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }} className="underline cursor-pointer hover:text-white transition-colors">Privacy Policy</button>
                            </span>
                        </div>

                        <div className="flex gap-4 md:gap-8">
                            <button
                                type="button"
                                onClick={onCancelForm}
                                className="px-8 md:px-12 py-3 md:py-5 bg-neutral-900/50 border border-white/10 rounded-[2rem] text-2xl md:text-3xl font-alphabet font-bold text-white uppercase tracking-tighter hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={!formData.privacy || !formData.name.trim() || !formData.company.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) || isSending}
                                className="px-8 md:px-12 py-3 md:py-5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-[2rem] text-2xl md:text-3xl font-alphabet font-bold text-white uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? 'SENDING...' : 'SEND'}
                            </button>
                        </div>
                    </div>


                    {/* Error Message */}
                    {error && (
                        <div className="absolute font-bold text-red-500 bg-black/80 px-4 py-2 rounded-lg border border-red-500 animate-pulse text-2xl bottom-10">
                            {error}
                        </div>
                    )}
                </form>

                {/* Privacy Modal */}
                {
                    showPrivacy && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 md:p-10" onClick={() => setShowPrivacy(false)}>
                            <div className="bg-neutral-900 border border-white/20 p-8 md:p-12 rounded-[3rem] max-w-4xl w-full text-left shadow-2xl relative" onClick={e => e.stopPropagation()}>
                                <h2 className="text-4xl md:text-5xl font-alphabet font-bold mb-6 md:mb-8 text-white">Privacy Policy</h2>
                                <div className="overflow-y-scroll space-y-4 text-xl md:text-2xl text-gray-400 font-alphabet leading-relaxed max-h-[40vh] overflow-y-auto pr-6 custom-scrollbar">
                                    <p><strong>LEGAL NOTICE · IMAGE & DATA CONSENT</strong></p>
                                    <p><strong>VELORA · Framemov</strong></p>
                                    <p>Data protection and image consent (Long form)</p>
                                    <p>By continuing, I expressly consent to Framemov, S.L. processing my image and the data provided for the purpose of generating a personalized image through artificial intelligence systems and allowing me to download it or receive it by email.</p>
                                    <p>The data controller is Framemov, S.L., located at Pallars 84, 4º 3ª, 08018 Barcelona, Spain, Tax ID: B66937079.</p>
                                    <p>Captured images may be processed using artificial intelligence services provided by third-party technology partners. This may involve data processing on servers located within or outside the European Union, always under appropriate safeguards in accordance with applicable data protection regulations.</p>
                                    <p>The data will not be used for commercial purposes nor shared with third parties, and will be retained only for as long as necessary to fulfill the stated purpose, unless otherwise required by law.</p>
                                    <p>You may exercise your rights of access, rectification, erasure, objection, restriction, and data portability by contacting info@framemov.com.</p>
                                    <p>I also authorize the use of my image exclusively for the described experience. No further promotional or advertising use will be made without additional explicit consent.</p>
                                </div>
                                <button
                                    onClick={() => setShowPrivacy(false)}
                                    className="mt-8 md:mt-10 w-full py-4 md:py-6 bg-white text-black text-3xl font-alphabet font-bold rounded-[20px] hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

const ThankYou = ({ onRestart, onHome }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName="THANKS" topCenter="" onHome={onHome} />

        <div className="absolute top-[16%] bottom-[16%] left-[16%] right-[16%] z-10 flex flex-col items-center justify-center">
            {/* Loop Background Video */}
            <div className="absolute inset-0 overflow-hidden z-0 rounded-[80px]">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
                </video>
            </div>
            <h2 className="relative z-10 text-6xl font-alphabet font-bold text-white mb-6 text-center leading-tight">
                I hope you liked it! <br /> Shall we start again?
            </h2>

            <button
                onClick={onRestart}
                className="relative z-10 px-15 py-8 rounded-[50px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                style={{
                    background: 'radial-gradient(circle at center, black 10%, #ffffff33 110%)',
                }}
            >
                <span className="relative z-10 text-5xl font-alphabet font-bold tracking-tighter text-white">
                    YES
                </span>
            </button>
        </div>
    </div>
);


const ResultStep = ({ onRepeat, onSend, onHome, onGenerateVideo, videoUrl, isVideoLoading }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <GridBackground sectionName="RESULT" topCenter="Image Ready" onHome={onHome} />

        <div className="relative w-[800px] aspect-video flex items-center justify-center">
            {/* Loop Background Video */}
            <div className="absolute inset-0 overflow-hidden rounded-[80px] z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src="/ui/assets/video/BG_LOOP_GRADIENT_VELORA_SMALL_BLUR_H.mp4" type="video/mp4" />
                </video>
            </div>

            {/* Central Area: Video or Image Placeholder */}
            {videoUrl ? (
                <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-20 shadow-2xl bg-black">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                /* Empty center as image is on screen, but we might want to show loading spinner here for video */
                isVideoLoading && (
                    <div className="absolute w-[800px] aspect-video flex items-center justify-center z-20">
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-20 h-20 text-white animate-spin drop-shadow-lg mb-4" />
                            <span className="text-2xl font-alphabet font-bold text-white tracking-widest animate-pulse">CREATING VIDEO...</span>
                        </div>
                    </div>
                )
            )}

            {/* Empty center as image is on screen */}
            <div className="absolute w-[800px] aspect-video overflow-hidden rounded-[80px] z-0 opacity-100 flex items-center justify-center">
            </div>

            <div className="relative z-10 flex gap-12">
                {/* Repeat Button */}
                <button
                    onClick={onRepeat}
                    className="relative px-16 py-8 rounded-[40px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    style={{ background: 'radial-gradient(circle at center, black 10%, #ffffff33 110%)' }}
                >
                    <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">Repeat</span>
                </button>

                {/* Send Button */}
                <button
                    onClick={onSend}
                    className="relative px-16 py-8 rounded-[40px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                    style={{ background: 'radial-gradient(circle at center, black 10%, #ffffff33 110%)' }}
                >
                    <span className="relative z-10 text-7xl font-alphabet font-bold tracking-tighter text-white">Send</span>
                </button>
            </div>

        </div>
    </div>
);


// --- Main Switcher ---
export default function Steps({ step, selections, isProcessing, onStart, onSelect, onTakePhoto, onRetake, onGenerate, onDownload, onRestart, onPhotoCaptured, onCancelForm, generatedImage, goToStep, onHome, error, onRetry, isSending, autoStart, onAutoStartConsumed, onGenerateVideo, videoUrl, isVideoLoading }) {
    const [localCountdown, setLocalCountdown] = useState(null);
    const [hasStartedCapture, setHasStartedCapture] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const timerRef = useRef(null);
    const webcamRef = useRef(null);

    // Reset capture state when entering step 6 (Capture Trigger) or leaving it
    useEffect(() => {
        if (step !== 6) {
            setHasStartedCapture(false);
            setLocalCountdown(null);
            if (timerRef.current) clearInterval(timerRef.current);
        }

        // Cleanup on unmount
        // Cleanup on unmount
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step]);

    // Auto-start logic for Retake
    useEffect(() => {
        console.log(`[Steps] Effect check: step=${step}, autoStart=${autoStart}`);
        if (step === 6 && autoStart) {
            console.log('[Steps] Auto-starting countdown for retake...');
            handleTakePhotoInternal();
            if (onAutoStartConsumed) onAutoStartConsumed();
        }
    }, [step, autoStart]);

    const handleTakePhotoInternal = () => {
        console.log('[Steps] handleTakePhotoInternal called');
        // Clear any existing interval before starting a new one
        if (timerRef.current) clearInterval(timerRef.current);

        setHasStartedCapture(true);
        onTakePhoto();

        let count = 10;

        setLocalCountdown(count);

        timerRef.current = setInterval(() => {
            count -= 1;
            setLocalCountdown(count);
            if (count === 0) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                setLocalCountdown(null);

                // CAPTURE PHOTO
                if (webcamRef.current) {
                    const imageSrc = webcamRef.current.getScreenshot();
                    if (imageSrc) {
                        onPhotoCaptured(imageSrc);
                    }
                }

                // onGenerate(); // REMOVED: Wait for 'photo_saved' event from server to trigger generation
                goToStep(8); // Move directly to Processing Step
            }
        }, 1000);
    };

    // Data for selection steps
    const backgrounds = [
        { id: 1, label: 'Brand', img: '/ui/assets/images/bg_background1.png' },
        { id: 2, label: 'Stage', img: '/ui/assets/images/bg_background2.png' },
        { id: 3, label: 'Digital', img: '/ui/assets/images/bg_background3.png' },
        { id: 4, label: 'Culture', img: '/ui/assets/images/bg_background4.png' },
    ];

    const atmospheres = [
        { id: 1, label: 'Organic', img: '/ui/assets/images/bg_atmosphere1.png' },
        { id: 2, label: 'Industrial', img: '/ui/assets/images/bg_atmosphere2.png' },
        { id: 3, label: 'Minimal', img: '/ui/assets/images/bg_atmosphere3.png' },
        { id: 4, label: 'Futuristic', img: '/ui/assets/images/bg_atmosphere4.png' },
    ];

    const palettes = [
        { id: 1, label: 'Neutral', img: '/ui/assets/images/bg_palette1.png' },
        { id: 2, label: 'Electric', img: '/ui/assets/images/bg_palette2.png' },
        { id: 3, label: 'Warm', img: '/ui/assets/images/bg_palette3.png' },
        { id: 4, label: 'Nature', img: '/ui/assets/images/bg_palette4.png' },
    ];

    const lights = [
        { id: 1, label: 'Day', img: '/ui/assets/images/bg_light1.png' },
        { id: 2, label: 'Golden', img: '/ui/assets/images/bg_light2.png' },
        { id: 3, label: 'Neon', img: '/ui/assets/images/bg_light3.png' },
        { id: 4, label: 'Spotlight', img: '/ui/assets/images/bg_light4.png' },
    ];

    return (
        <div className="w-full h-full relative">
            {(() => {
                switch (step) {
                    case 1: return <StartStep onStart={onStart} sectionName="ISE26" onHome={onHome} />;
                    case 2: return <SelectionStep title="Select Background" sectionName="ISE26" options={backgrounds} selections={selections} type="background" onSelect={(id) => onSelect('background', id, 3)} isProcessing={isProcessing} onHome={onHome} />;
                    case 3: return <SelectionStep title="Select Atmosphere" sectionName="ISE26" options={atmospheres} selections={selections} type="atmosphere" onSelect={(id) => onSelect('atmosphere', id, 5)} isProcessing={isProcessing} onHome={onHome} />;
                    case 4: return <SelectionStep title="Select Palette" sectionName="ISE26" options={palettes} selections={selections} type="palette" onSelect={(id) => onSelect('palette', id, 5)} isProcessing={isProcessing} onHome={onHome} />;
                    case 5: return <SelectionStep title="Select Lighting" sectionName="ISE26" options={lights} selections={selections} type="light" onSelect={(id) => onSelect('light', id, 6)} isProcessing={isProcessing} onHome={onHome} />;
                    case 6: return <CaptureTriggerStep title="Strike a Pose!" sectionName="ISE26" onTakePhoto={handleTakePhotoInternal} isCountingDown={hasStartedCapture} countdown={localCountdown} webcamRef={webcamRef} onHome={onHome} />;
                    case 7: return <ReviewStep onRetake={onRetake} onGenerate={onGenerate} capturedImage={capturedImage} onHome={onHome} />;
                    case 8: return <ProcessingStep sectionName="ISE26" onHome={onHome} error={error} onRetry={onRetry} />;
                    case 9: return <ResultStep onRepeat={onRetake} onSend={() => goToStep(10)} onHome={onHome} onGenerateVideo={onGenerateVideo} videoUrl={videoUrl} isVideoLoading={isVideoLoading} />;
                    case 10: return <DownloadForm onSubmit={onDownload} onCancelForm={onCancelForm} onHome={onHome} isSending={isSending} error={error} />;
                    case 11: return <ThankYou onRestart={onRestart} onHome={onHome} />;
                    default: return <StartStep onStart={onStart} onHome={onHome} />;
                }
            })()}
        </div>
    );
}
