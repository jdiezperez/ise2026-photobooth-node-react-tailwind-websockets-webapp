import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { Loader2, Camera } from 'lucide-react';
import ScreenLayout from './components/ScreenLayout';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;

const STEPS = {
    IDLE: 'IDLE',
    SELECT_BACKGROUND: 'SELECT_BACKGROUND',
    SELECT_ATMOSPHERE: 'SELECT_ATMOSPHERE',
    SELECT_PALETTE: 'SELECT_PALETTE',
    SELECT_LIGHT: 'SELECT_LIGHT',
    TAKE_PHOTO: 'TAKE_PHOTO',
    GENERATING: 'GENERATING',
    RESULT: 'RESULT'
};

export default function App() {
    const [step, setStep] = useState(STEPS.IDLE);
    const [selections, setSelections] = useState({
        background: null,
        atmosphere: null,
        palette: null,
        light: null
    });
    const [countdown, setCountdown] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [error, setError] = useState(null);
    const [transition, setTransition] = useState({ type: null, progress: 0, confirmed: false });
    const webcamRef = useRef(null);
    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const transitionIntervalRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to server');
        });

        socketRef.current.on('error', (msg) => {
            setError(msg || "Unknown Error");
        });

        socketRef.current.on('start', () => {
            setStep(STEPS.SELECT_BACKGROUND);
            setSelections({ background: null, atmosphere: null, palette: null, light: null });
            setCapturedImage(null);
            setGeneratedImage(null);
            setError(null);
            if (transitionIntervalRef.current) clearInterval(transitionIntervalRef.current);
            setTransition({ type: null, progress: 0, confirmed: false });
        });

        const startSelectionTransition = (type, idRaw) => {
            const id = Number(idRaw);
            console.log(`Starting transition for ${type} with ID ${id}`);

            setSelections(prev => ({ ...prev, [type]: id }));
            // Start transition immediately
            setTransition({ type, progress: 0, confirmed: true });

            // Delays: Background 2s, Others 4s
            const delay = type === 'background' ? 2000 : 4000;

            setTimeout(() => {
                console.log(`Transition timeout finished for ${type}`);
                setTransition({ type: null, progress: 0, confirmed: false });
                // Do NOT auto-advance step here. We wait for next socket event.
            }, delay);
        };

        socketRef.current.on('background', (id) => {
            // Background is the first selection, so no step change needed before it (we are already in SELECT_BACKGROUND or Start resets us)
            // Actually, if we are in IDLE, Start should have put us in SELECT_BACKGROUND.
            startSelectionTransition('background', id);
        });

        socketRef.current.on('atmosphere', (id) => {
            setStep(STEPS.SELECT_ATMOSPHERE);
            startSelectionTransition('atmosphere', id);
        });

        socketRef.current.on('palette', (id) => {
            setStep(STEPS.SELECT_PALETTE);
            startSelectionTransition('palette', id);
        });

        socketRef.current.on('light', (id) => {
            setStep(STEPS.SELECT_LIGHT);
            startSelectionTransition('light', id);
        });

        socketRef.current.on('takephoto', () => {
            setStep(STEPS.TAKE_PHOTO);
            startCountdown();
        });

        socketRef.current.on('generating', () => {
            setStep(STEPS.GENERATING);
            setError(null);
        });

        socketRef.current.on('generated', (url) => {
            setGeneratedImage(url);
            setStep(STEPS.RESULT);
        });

        socketRef.current.on('retake', () => {
            console.log('Retake requested: clearing images and resetting to TAKE_PHOTO');
            setCapturedImage(null);
            setGeneratedImage(null);
            setCountdown(null);
            setError(null);
            if (timerRef.current) clearInterval(timerRef.current);
            setStep(STEPS.TAKE_PHOTO);
        });

        socketRef.current.on('idle', () => {
            setStep(STEPS.IDLE);
            if (timerRef.current) clearInterval(timerRef.current);
        });
        return () => {
            if (transitionIntervalRef.current) clearInterval(transitionIntervalRef.current);
            socketRef.current.disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startCountdown = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        let count = 10;
        setCountdown(count);
        timerRef.current = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count === 0) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                takePhoto();
            }
        }, 1000);
    };

    const takePhoto = () => {
        const imageSrc = webcamRef.current.getScreenshot({ width: 1080, height: 1920 });
        setCapturedImage(imageSrc);
        setCountdown(null);

        // Send to server
        if (imageSrc) {
            socketRef.current.emit('photo_captured', imageSrc);
        }
    };

    const SELECTION_DATA = {
        background: ['Brand', 'Stage', 'Digital', 'Culture'],
        atmosphere: ['Organic', 'Industrial', 'Minimal', 'Futuristic'],
        palette: ['Neutral', 'Electric', 'Warm', 'Nature'],
        light: ['Day', 'Golden', 'Neon', 'Spotlight']
    };

    const renderSelectionGrid = (type, activeId, prevImg, isTransiting) => {
        const ids = [1, 2, 3, 4];
        const labels = SELECTION_DATA[type] || [];
        const isConfirmed = !!activeId; // Selection exists
        const isBackground = type === 'background';
        // console.log(`Loading image: /assets/images/bg_${type}${activeId}.png`);

        // --- BACKGROUND ANIMATION: Expand to fill ---
        if (isBackground && isConfirmed) {
            return (
                <div className="w-full h-full relative">
                    {/* Incoming: Selected Image Fading In */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="absolute inset-0 z-50 pointer-events-none"
                    >
                        <img
                            src={`/assets/images/bg_${type}${activeId}.png`}
                            alt="Selected"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>

                    {/* Outgoing: The 4-Quadrant Grid Fading Out */}
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="w-full h-full grid grid-cols-2 grid-rows-2 absolute inset-0 z-0"
                    >
                        {ids.map((id, idx) => (
                            <div
                                key={id}
                                className={`relative overflow-hidden border-white/20 
                                    ${id === 1 ? 'border-r border-b' : ''} 
                                    ${id === 2 ? 'border-b' : ''} 
                                    ${id === 3 ? 'border-r' : ''}
                                `}
                            >
                                {/* Image */}
                                <img
                                    src={`/assets/images/bg_${type}${id}.png`}
                                    alt={labels[idx]}
                                    className="w-full h-full object-cover grayscale"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22800%22 height%3D%221200%22%3E%3Crect width%3D%22800%22 height%3D%221200%22 fill%3D%22%23333%22%2F%3E%3Ctext x%3D%2250%25%22 y%3D%2250%25%22 dominant-baseline%3D%22middle%22 text-anchor%3D%22middle%22 fill%3D%22%22%22 font-size%3D%2240%22%3EMissing%20Asset%3C%2Ftext%3E%3C%2Fsvg%3E';
                                    }}
                                />

                                {/* Label - Bottom Left (To ensure it fades out too) */}
                                <div className="absolute bottom-8 left-8 z-30">
                                    <h3 className="text-4xl font-alphabet font-bold uppercase tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                                        {labels[idx]}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            );
        }

        // --- ATTRIBUTES PERSISTENCE & MORPH ---
        if (!isBackground) {
            return (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                    {/* 0. Base: Previous Image (Persisting until new selection is confirmed) */}
                    {prevImg && (
                        <motion.img
                            src={prevImg}
                            className="absolute inset-0 w-full h-full object-cover z-0"
                            initial={{ filter: 'blur(0px)', opacity: 1 }}
                            animate={isTransiting ? { filter: 'blur(20px)', opacity: 0.5 } : { filter: 'blur(0px)', opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            // If prevImg changes prop, we want a clean cut, not animation, so key it
                            key={prevImg}
                        />
                    )}

                    {/* 1. Loader Icon Center (Only when confirming/transiting) */}
                    {isTransiting && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute z-50 flex items-center justify-center pointer-events-none"
                        >
                            <Loader2 className="w-32 h-32 text-white animate-spin drop-shadow-2xl" />
                        </motion.div>
                    )}

                    {/* 2. Overlay: Morphing New Selection */}
                    {isConfirmed && (
                        <div className="relative w-full h-full overflow-hidden z-10">
                            <motion.img
                                src={`/assets/images/bg_${type}${activeId}.png`}
                                className="absolute inset-0 w-full h-full object-cover"
                                initial={isTransiting ? { filter: 'blur(40px) grayscale(100%)', scale: 1.2, opacity: 0 } : { filter: 'blur(0px) grayscale(0%)', scale: 1, opacity: 1 }}
                                animate={isTransiting ? {
                                    opacity: [0, 1, 1],
                                    filter: [
                                        'blur(40px) grayscale(100%)', // Start blurred blob
                                        'blur(20px) grayscale(100%)', // Mid morph
                                        'blur(0px) grayscale(0%)'     // Final clear
                                    ],
                                    scale: [1.2, 1.1, 1]
                                } : { opacity: 1, filter: 'blur(0px) grayscale(0%)', scale: 1 }}
                                transition={isTransiting ? {
                                    duration: 3.5, // Total 4s wait, 3.5s animation
                                    times: [0, 0.4, 1], // Keyframes
                                    ease: "easeInOut"
                                } : { duration: 0 }}
                            />
                        </div>
                    )}
                    {/* No default grid here. */}
                </div>
            );
        }

        // --- DEFAULT GRID VIEW (Before Selection, only for Background step) ---
        return (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full relative">
                {ids.map((id, idx) => (
                    <motion.div
                        key={id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className={`relative overflow-hidden group border-white/20 
                            ${id === 1 ? 'border-r border-b' : ''} 
                            ${id === 2 ? 'border-b' : ''} 
                            ${id === 3 ? 'border-r' : ''}
                        `}
                    >
                        {/* Image */}
                        <img
                            src={`/assets/images/bg_${type}${id}.png`}
                            alt={labels[idx]}
                            className="w-full h-full object-cover grayscale"
                            onError={(e) => {
                                // Use a simple solid color placeholder if image fails
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22800%22 height%3D%221200%22%3E%3Crect width%3D%22800%22 height%3D%221200%22 fill%3D%22%23333%22%2F%3E%3Ctext x%3D%2250%25%22 y%3D%2250%25%22 dominant-baseline%3D%22middle%22 text-anchor%3D%22middle%22 fill%3D%22%22%22 font-size%3D%2240%22%3EMissing%20Asset%3C%2Ftext%3E%3C%2Fsvg%3E';
                            }}
                        />

                        {/* Label - Bottom Left */}
                        <div className="absolute bottom-8 left-8 z-30">
                            <h3 className="text-4xl font-alphabet font-bold uppercase tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                                {labels[idx]}
                            </h3>
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    };

    const getStepLabels = () => {
        const base = { topLeftText: "ISE26", bottomLeftText: "VELORA" };
        switch (step) {
            case STEPS.IDLE:
                return { ...base, bottomText: "An interactive experience by <b>FRAMEMOV</b>" };
            case STEPS.SELECT_BACKGROUND:
                return { ...base, topLeftText: "ENVIRONMENT", bottomText: "" };
            case STEPS.SELECT_ATMOSPHERE:
                return { ...base, topLeftText: "ATMOSPHERE", bottomText: "AIBOOTH" };
            case STEPS.SELECT_PALETTE:
                return { ...base, topLeftText: "PALETTE", bottomText: "AIBOOTH" };
            case STEPS.SELECT_LIGHT:
                return { ...base, topLeftText: "LIGHTING", bottomText: "AIBOOTH" };
            case STEPS.TAKE_PHOTO:
                return { ...base, topLeftText: "GET READY", bottomText: "AIBOOTH" };
            case STEPS.GENERATING:
                return { ...base, topLeftText: "CREATING", bottomText: "AIBOOTH" };
            case STEPS.RESULT:
                return { ...base, topLeftText: "PHOTO READY", bottomText: "AIBOOTH" };
            default:
                return { ...base, bottomText: "AIBOOTH" };
        }
    };

    const labels = getStepLabels();

    return (
        <ScreenLayout
            topLeftText={labels.topLeftText}
            bottomLeftText={labels.bottomLeftText}
            bottomText={labels.bottomText}
        >
            <div className="relative w-full h-full bg-black overflow-hidden text-white">
                {/* Background Video */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none"
                    key={step} // Restart video on step change if it was different, or just keep it looping
                >
                    <source src="/assets/video/BG_LOOP_GRADIENT_VELORA_V.mp4" type="video/mp4" />
                </video>

                <AnimatePresence>
                    {step === STEPS.IDLE && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="z-10 w-full h-full relative isolate"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                                <h1 className="text-8xl font-alphabet font-bold tracking-tight text-white mix-blend-difference">VELORA</h1>
                            </div>
                            <div className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                                <p className="text-2xl font-alphabet font-light tracking-tight leading-relaxed">
                                    Step into new worlds.<br />Created by you.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {step === STEPS.SELECT_BACKGROUND && (
                        <motion.div key="background" className="z-10 w-full h-full">
                            {renderSelectionGrid('background', selections.background, null, transition.type === 'background' && transition.confirmed)}
                        </motion.div>
                    )}

                    {step === STEPS.SELECT_ATMOSPHERE && (
                        <motion.div key="atmosphere" className="z-10 w-full h-full relative">
                            {renderSelectionGrid(
                                `background${selections.background}_atmosphere`,
                                selections.atmosphere,
                                `/assets/images/bg_background${selections.background}.png`,
                                transition.type === 'atmosphere' && transition.confirmed
                            )}
                        </motion.div>
                    )}

                    {step === STEPS.SELECT_PALETTE && (
                        <motion.div key="palette" className="z-10 w-full h-full relative">
                            {renderSelectionGrid(
                                `background${selections.background}_atmosphere${selections.atmosphere}_palette`,
                                selections.palette,
                                `/assets/images/bg_background${selections.background}_atmosphere${selections.atmosphere}.png`,
                                transition.type === 'palette' && transition.confirmed
                            )}
                        </motion.div>
                    )}

                    {step === STEPS.SELECT_LIGHT && (
                        <motion.div key="light" className="z-10 w-full h-full relative">
                            {renderSelectionGrid(
                                //                                `background${selections.background}_atmosphere${selections.atmosphere}_palette${selections.palette}_light`,
                                `background${selections.background}_atmosphere${selections.atmosphere}_light`,
                                selections.light,
                                //                                `/assets/images/bg_background${selections.background}_atmosphere${selections.atmosphere}_palette${selections.palette}.png`,
                                `/assets/images/bg_background${selections.background}_atmosphere${selections.atmosphere}.png`,
                                transition.type === 'light' && transition.confirmed
                            )}
                        </motion.div>
                    )}

                    {step === STEPS.TAKE_PHOTO && (
                        <motion.div
                            key="photo"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="z-20 absolute inset-0 bg-black flex items-center justify-center"
                        >
                            {!capturedImage ? (
                                <>
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        screenshotQuality={1}
                                        width={1080}
                                        height={1920}
                                        forceScreenshotSourceSize={true}
                                        className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] object-contain"
                                        videoConstraints={{
                                            width: 1920,
                                            height: 1080,
                                            facingMode: "user"
                                        }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="text-9xl font-bold text-white drop-shadow-2xl animate-pulse">
                                            {countdown}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <img
                                    src={capturedImage}
                                    className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] object-contain"
                                />
                            )}
                        </motion.div>
                    )}

                    {step === STEPS.GENERATING && (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="z-30 absolute inset-0 flex flex-col items-center justify-center"
                        >
                            {error ? (
                                <>
                                    <h2 className="text-4xl font-alphabet font-bold uppercase tracking-widest text-red-500 mb-4">Generation Error</h2>
                                    <p className="text-2xl text-white/80">{error}</p>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-20 h-20 text-white animate-spin mb-8" />
                                    <h2 className="text-3xl font-alphabet font-bold uppercase tracking-widest text-center">Generating Image</h2>
                                </>
                            )}
                        </motion.div>
                    )}

                    {step === STEPS.RESULT && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="z-40 absolute inset-0 bg-black flex items-center justify-center"
                        >
                            <img src={generatedImage} className="w-full h-full object-contain" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ScreenLayout>
    );
}
