import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import Steps from './components/Steps';

// Connect to the server
const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;
const socket = io(serverUrl);

function App() {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState({
    background: null,
    atmosphere: null,
    palette: null,
    light: null,
  });
  const [generatedImage, setGeneratedImage] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const idleTimerRaw = useRef(null);
  const idleWarningTimer = useRef(null);
  const [countdown, setCountdown] = useState(10);

  // Helper to change step
  const goToStep = (newStep) => {
    setStep(newStep);
    resetIdleTimer();
  };

  // --- WebSocket Handlers ---
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('generated', (url) => {
      console.log('Image generated:', url);
      setGeneratedImage(url);
      // Go to ResultStep (9) to choose Repeat or Send
      goToStep(9);
    });

    socket.on('photo_saved', () => {
      console.log('Photo saved on server, starting generation...');
      socket.emit('generating'); // Now valid to start generation
    });

    socket.on('error', (msg) => {
      console.error('Socket error:', msg);
      setGenerationError(msg);
      setIsProcessing(false); // Enable buttons again if needed, though we are in a specific step
    });

    socket.on('start', () => {
      // External start command
      goToStep(2);
      setGenerationError(null);
    });

    socket.on('email_sent', () => {
      console.log('Email sent successfully');
      setIsSending(false);
      goToStep(11); // Thank you page
    });

    socket.on('email_error', (msg) => {
      console.error('Email error:', msg);
      setIsSending(false);
      setGenerationError(msg || 'Failed to send email');
    });

    socket.on('sending_email', () => {
      setIsSending(true);
    });

    socket.on('video_generated', (url) => {
      console.log('Video generated:', url);
      setVideoUrl(url);
      setIsVideoLoading(false);
    });

    socket.on('video_error', (msg) => {
      console.error('Video error:', msg);
      setGenerationError(msg || 'Video generation failed');
      setIsVideoLoading(false);
    });

    socket.on('video_generating', () => {
      setIsVideoLoading(true);
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('generated');
      socket.off('photo_saved');
      socket.off('error');
      socket.off('start');
      socket.off('email_sent');
      socket.off('email_error');
      socket.off('sending_email');
      socket.off('video_generated');
      socket.off('video_error');
      socket.off('video_generating');
    };
  }, []);


  // --- Idle Timer Logic ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRaw.current) clearTimeout(idleTimerRaw.current);
    if (idleWarningTimer.current) clearInterval(idleWarningTimer.current);

    setShowIdleWarning(false);
    setCountdown(10);

    // 60 seconds to warning
    idleTimerRaw.current = setTimeout(() => {
      setShowIdleWarning(true);
      // Start countdown
      idleWarningTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Time up
            handleIdleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 60000);
  }, []);

  const handleIdleTimeout = () => {
    if (idleWarningTimer.current) clearInterval(idleWarningTimer.current);
    setShowIdleWarning(false);
    socket.emit('idle');
    socket.emit('idle');
    setStep(1); // Reset to start
    setSelections({ background: null, atmosphere: null, palette: null, light: null });
    setVideoUrl(null);
    setIsVideoLoading(false);
    setGenerationError(null);
    setIsSending(false);
  };

  const handleUserAction = () => {
    resetIdleTimer();
  };

  // Initial timer start
  useEffect(() => {
    resetIdleTimer();
    // Add global click listener to reset timer on any interaction
    window.addEventListener('click', handleUserAction);
    return () => {
      window.removeEventListener('click', handleUserAction);
      if (idleTimerRaw.current) clearTimeout(idleTimerRaw.current);
      if (idleWarningTimer.current) clearInterval(idleWarningTimer.current);
    };
  }, [resetIdleTimer]);


  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [isRetaking, setIsRetaking] = useState(false);

  // --- Actions ---
  const handleStart = () => {
    socket.emit('start');
    setGenerationError(null);
    setVideoUrl(null); // Reset video on start
    goToStep(2);
  };

  // --- Actions ---
  const handleCancelForm = () => {
    goToStep(9);
  };

  const handleSelection = (type, value, nextStep) => {
    if (isProcessing) return; // Prevent double clicks

    setSelections(prev => ({ ...prev, [type]: value }));
    socket.emit(type, value); // Notify server/screen immediately

    setIsProcessing(true);

    // Delays based on type
    let delay = 1000;
    if (type !== 'background') {
      delay = 4000; // 2s allow screen expand animation
    }

    setTimeout(() => {
      setIsProcessing(false);
      goToStep(nextStep);
    }, delay);
  };

  const handleTakePhoto = () => {
    socket.emit('takephoto');
    setGenerationError(null);
    // Step 6 internal logic handles countdown, then we wait or manual next?
    // Req: "Clicking ... will send ... and a countdown ... will start. After countdown ends, two buttons appear"
    // So we stay on Step 6 but change view state inside it? Or move to Step 7?
    // Let's say Step 6 is camera view. Step 7 is Review.
    // We'll let the Step component handle the UI flow for camera.
  };

  const handleRetake = () => {
    socket.emit('retake');
    setGenerationError(null);
    setIsRetaking(true);
    goToStep(6);
  };

  const handleGenerate = () => {
    setGenerationError(null);
    socket.emit('generating');
    goToStep(8); // Processing
  };

  const handleDownload = (formData) => {
    // formData contains { name, company, email, privacy }
    console.log('Send Email requested', formData);
    if (!formData.email) {
      setGenerationError('Email is required');
      return;
    }
    socket.emit('send_email', {
      email: formData.email,
      name: formData.name,
      company: formData.company
    });
    // Visual feedback handled by socket events (sending_email -> email_sent)
  };

  const handlePhotoCaptured = (base64) => {
    socket.emit('photo_captured', base64);
  };

  const handleGenerateVideo = () => {
    socket.emit('generate_video_test');
    setIsVideoLoading(true);
  };


  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">

      {/* Content Layer */}
      <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center">
        <AnimatePresence mode='wait'>
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <Steps
              step={step}
              selections={selections}
              isProcessing={isProcessing}
              onStart={handleStart}
              onSelect={handleSelection}
              onTakePhoto={handleTakePhoto}
              onRetake={handleRetake}
              onGenerate={handleGenerate}
              onDownload={handleDownload}
              onRestart={() => handleStart()}
              onCancelForm={() => handleCancelForm()}
              onPhotoCaptured={handlePhotoCaptured}
              generatedImage={generatedImage}
              goToStep={goToStep}
              onHome={handleIdleTimeout}
              error={generationError}
              onRetry={handleGenerate}
              isSending={isSending}
              autoStart={isRetaking}
              onAutoStartConsumed={() => setIsRetaking(false)}
              onGenerateVideo={handleGenerateVideo}
              videoUrl={videoUrl}
              isVideoLoading={isVideoLoading}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Idle Warning Modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl text-center">
            <h2 className="text-2xl font-alphabet font-bold mb-4">Are you still there?</h2>
            <p className="text-xl font-alphabet font-medium mb-6">Resetting in {countdown} seconds...</p>
            <button
              onClick={handleUserAction}
              className="relative z-10 px-10 py-2 rounded-[50px] border-[1px] border-white shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
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
      )}
    </div>
  );
}

export default App;
