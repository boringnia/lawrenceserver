import { useState, useRef, useEffect } from "react";
import Game from "./components/Game";
import UI from "./components/UI";
import { Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { useStore } from "./store";

export default function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tickTimer = useStore(state => state.tickTimer);
  const gameStatus = useStore(state => state.gameState.status);
  const mapType = useStore(state => state.gameState.mapType);

  const bgmMap: Record<string, string> = {
    classic: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
    desert: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
    penang: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
  };

  const currentBgm = bgmMap[mapType] || bgmMap.classic;

  const { isOnline, syncAction } = useStore();

  // 1. Handle user interaction to unlock audio context
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current && audioRef.current.paused && gameStatus === 'playing') {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [gameStatus]);

  // 2. Handle BGM switching and loading
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleMapChange = async () => {
      // Only change src if it's actually different to avoid restart loops
      // Use URL object to normalize comparison
      const normalizedCurrent = new URL(currentBgm, window.location.origin).href;
      const normalizedAudio = audio.src ? new URL(audio.src, window.location.origin).href : "";

      if (normalizedAudio !== normalizedCurrent) {
        audio.pause();
        audio.src = currentBgm;
        audio.load();
      }

      if (gameStatus === 'playing' && !isMuted) {
        try {
          // Wait for enough data to be loaded
          await audio.play();
          console.log("BGM Playing:", mapType);
        } catch (err) {
          console.log("Autoplay prevented, waiting for user interaction");
        }
      } else {
        audio.pause();
      }
    };

    handleMapChange();
  }, [currentBgm, gameStatus, isMuted, mapType]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus, tickTimer]);

  return (
    <div 
      className="relative h-screen h-[100dvh] w-full overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop")' }}
    >
      <div className="absolute inset-0 bg-black/20" /> {/* Slight overlay for better visibility */}
      <audio 
        ref={audioRef}
        loop 
        muted={isMuted}
        preload="auto"
        crossOrigin="anonymous"
      />
      <Game />
      <UI toggleFullscreen={toggleFullscreen} isFullscreen={isFullscreen} />
      
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-zinc-900/80 text-white rounded-full hover:bg-zinc-800 transition-colors backdrop-blur-sm"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>
        <button 
          onClick={toggleMute}
          className="p-3 bg-zinc-900/80 text-white rounded-full hover:bg-zinc-800 transition-colors backdrop-blur-sm"
          title={isMuted ? "Unmute BGM" : "Mute BGM"}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>
    </div>
  );
}
