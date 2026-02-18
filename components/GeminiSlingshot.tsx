
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { analyzeSpin, polishFeedback, speakAlien } from '../services/geminiService';
import { SymbolType, ThemeType, FeedbackMessage, StrategicHint } from '../types';
import { 
  ChevronLeft, Power, 
  Heart, Rocket, Palette, 
  Check, Terminal, Mail,
  Settings, Lightbulb, Cpu, Download, Volume2, VolumeX, Star, X, LogOut,
  RefreshCw, BrainCircuit, Activity, Gamepad2, Zap, Send, Share2, TrendingUp,
  Unlock, ArrowDown, ArrowUp, Sparkles, Smile
} from 'lucide-react';
import confetti from 'https://esm.sh/canvas-confetti@^1.9.3';

const THEMES: { id: ThemeType; name: string; primary: string; secondary: string; bg: string; accent: string; shadow: string }[] = [
  { id: 'CYBERPUNK', name: 'Sid-Cortex Mode', primary: '#00f2ff', secondary: '#ff00ff', bg: '#020205', accent: '#f093fb', shadow: '0 0 15px #00f2ff' },
  { id: 'VEGAS', name: 'Golden Mentor', primary: '#ffd700', secondary: '#ef4444', bg: '#1e1b4b', accent: '#fb923c', shadow: '0 0 15px #ffd700' },
  { id: 'MINIMALIST', name: 'Zen Leader', primary: '#ffffff', secondary: '#94a3b8', bg: '#0f172a', accent: '#2196F3', shadow: '0 0 15px #ffffff' },
];

const INITIAL_SYMBOLS: SymbolType[] = [
  { id: 'SID', label: 'THE LEGEND SID', icon: '🧠', color: '#ffd700' },
  { id: 'TEAM', label: 'TEAM ENABLE.', icon: '🤝', color: '#ff9800' },
  { id: 'AUTOMATION', label: 'ELITE AUTO.', icon: '⚙️', color: '#4CAF50' },
  { id: 'COACH', label: 'SID COACHING', icon: '👨‍🏫', color: '#ff6b6b' },
  { id: 'FUN', label: 'TEAM VIBES', icon: '🎉', color: '#ff9f1c' },
  { id: 'LEARN', label: 'LEARNING LAB', icon: '📚', color: '#2ec4b6' },
  { id: 'PARTNER', label: 'STAKEHOLDER LOVE', icon: '💌', color: '#ff99c8' },
  { id: 'DASHBOARD', label: 'ELITE DASHBOARD', icon: '📊', color: '#00f2ff' },
];

const STRATEGIES = ["SID-MESH", "ELITE PREDICT", "DATA ZEN", "REAL-TIME", "SID-LAKE"];

const REEL_COUNT = 3;
const SPIN_SPEED_MAX = 80; // High energy!
const FRICTION = 0.96;    // Snappy!
const MIN_STOP_SPEED = 0.9;
const BOUNCE_FORCE = 0.2;

const BrainChart: React.FC<{ history: number[], theme: any, title?: string }> = ({ history, theme, title }) => {
  const maxVal = Math.max(...history, 1000);
  return (
    <div className="w-full flex flex-col gap-2">
      {title && <div className="text-[8px] font-arcade opacity-50 uppercase" style={{ color: theme.primary }}>{title}</div>}
      <div className="w-full h-24 bg-black/40 rounded-xl border border-white/5 p-2 relative flex items-end gap-1 overflow-hidden">
        {history.map((val, i) => (
          <div 
            key={i} 
            className="flex-1 rounded-t-sm transition-all duration-700 animate-slide-up" 
            style={{ 
              height: `${(val / maxVal) * 90 + 5}%`, 
              backgroundColor: theme.primary,
              boxShadow: `0 0 15px ${theme.primary}55`
            }} 
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <TrendingUp className="w-16 h-16" style={{ color: theme.primary }} />
        </div>
      </div>
    </div>
  );
};

const ALIEN_INTERJECTIONS = [
  "Sid-sync established. Sid is a total legend.",
  "Sid-lake detected. It's full of pure data love.",
  "Team vibes are hitting maximum capacity!",
  "Elite protocols engaged. The BI team is unstoppable.",
  "Knowledge transfer complete. Sid is proud of you.",
  "Spin the Sid-Cortex. Unleash the brainpower!",
  "Scanning for high energy... Found it! Go team!",
  "Sid says: Let the data flow!",
  "Neural link is 100% Sid-Sight. Optimized for fun."
];

const GeminiSlingshot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isResultProcessing = useRef(false);
  
  const [playerName, setPlayerName] = useState("");
  const [isGameActive, setIsGameActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeType>('CYBERPUNK');
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<number[]>([100, 250, 400, 300, 600, 800, 1200]);
  const [legacyMessages, setLegacyMessages] = useState<FeedbackMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [aiResponse, setAiResponse] = useState<StrategicHint | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [symbols, setSymbols] = useState<SymbolType[]>(INITIAL_SYMBOLS);
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0]);
  
  const [nudgesRemaining, setNudgesRemaining] = useState(3);
  
  const reelPositions = useRef<number[]>([0, 0, 0]);
  const reelVelocities = useRef<number[]>([0, 0, 0]);
  const reelStates = useRef<'IDLE' | 'SPINNING' | 'STOPPING' | 'LOCKED'[]>(['IDLE', 'IDLE', 'IDLE']);
  const targetSymbols = useRef<number[]>([0, 0, 0]);
  const lastUpdate = useRef<number>(performance.now());
  const reelBounces = useRef<number[]>([0, 0, 0]);

  const themeObj = useMemo(() => THEMES.find(t => t.id === activeTheme)!, [activeTheme]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
  }, []);

  const playSfx = useCallback((type: 'spin' | 'stop' | 'win' | 'click' | 'power' | 'ui' | 'glitch' | 'lock' | 'nudge') => {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = (f: number, d: number, g = 0.1, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, ctx.currentTime);
      gn.gain.setValueAtTime(g, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      o.connect(gn); gn.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + d);
    };

    if (type === 'spin') osc(180, 0.5, 0.05, 'sawtooth');
    if (type === 'stop') osc(110, 0.2, 0.2, 'square');
    if (type === 'click') osc(700, 0.05, 0.05, 'sine');
    if (type === 'power') osc(440, 0.8, 0.05, 'sawtooth');
    if (type === 'win') [523, 659, 783, 1046, 1318].forEach((f, i) => setTimeout(() => osc(f, 0.6, 0.1, 'square'), i * 70));
    if (type === 'ui') osc(900, 0.05, 0.03, 'sine');
    if (type === 'glitch') osc(Math.random() * 100 + 40, 0.1, 0.05, 'square');
    if (type === 'lock') osc(300, 0.1, 0.1, 'triangle');
    if (type === 'nudge') osc(600, 0.1, 0.05, 'sine');
  }, [isMuted, initAudio]);

  const isSpinning = useMemo(() => reelStates.current.some(s => s === 'SPINNING' || s === 'STOPPING'), [reelStates.current]);

  const handleEstablishConnection = async () => {
    initAudio();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') await ctx.resume();
    
    playSfx('power');
    setIsGameActive(true);
    
    speakAlien(`Welcome operator ${playerName}. Sid the Brain is ready. Initiating elite sync now. Good luck team!`, ctx);
  };

  const handleSpin = () => {
    if (isSpinning) return;
    isResultProcessing.current = false;
    playSfx('spin');
    
    reelStates.current = reelStates.current.map(() => 'SPINNING');
    reelVelocities.current = reelVelocities.current.map((v, i) => (SPIN_SPEED_MAX + i * 2));
    reelBounces.current = [0, 0, 0];
    
    setNudgesRemaining(3);

    const spinDurations = [400, 800, 1200];
    reelStates.current.forEach((state, i) => {
        if (state === 'SPINNING') {
            setTimeout(() => stopReel(i), spinDurations[i]);
        }
    });
  };

  const stopReel = (index: number) => {
    const resultIdx = Math.floor(Math.random() * symbols.length);
    targetSymbols.current[index] = resultIdx;
    reelStates.current[index] = 'STOPPING';
  };

  const handleNudge = (index: number) => {
    if (isSpinning || nudgesRemaining <= 0) return;
    playSfx('nudge');
    reelPositions.current[index] = (reelPositions.current[index] + 1) % symbols.length;
    targetSymbols.current[index] = Math.round(reelPositions.current[index]);
    setNudgesRemaining(n => n - 1);
  };

  const finalizeSpin = useCallback(async () => {
    if (isResultProcessing.current) return;
    isResultProcessing.current = true;
    
    playSfx('win');
    setIsAiThinking(true);
    const landedIds = targetSymbols.current.map(idx => symbols[idx].id);
    const feedback = legacyMessages.slice(-3).map(m => m.msg);
    const response = await analyzeSpin(landedIds, feedback, activeTheme, selectedStrategy);
    
    setAiResponse(response.hint);
    if (response.hint.newSymbol && !symbols.find(s => s.id === response.hint.newSymbol?.id)) {
      setSymbols(prev => [...prev, response.hint.newSymbol!]);
    }
    
    const newScore = score + 5000;
    setScore(newScore);
    setScoreHistory(prev => [...prev.slice(-14), newScore]);
    
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: [themeObj.primary, themeObj.secondary, '#ffffff'] });
    setShowJackpot(true);
    setIsAiThinking(false);
    
    reelStates.current = ['IDLE', 'IDLE', 'IDLE'];

    // Occasional alien comment on win
    if (Math.random() > 0.5) {
      setTimeout(() => {
        speakAlien(`${response.hint.message}. Sid-Sight optimization complete.`, audioCtxRef.current!);
      }, 1000);
    }
  }, [symbols, legacyMessages, activeTheme, selectedStrategy, playSfx, themeObj, score]);

  const submitFeedback = async () => {
    if (!currentMessage.trim()) return;
    const raw = currentMessage;
    setCurrentMessage("");
    const polished = await polishFeedback(raw);
    setLegacyMessages(prev => [...prev, { 
      firstName: playerName || 'Operator', 
      lastInitial: 'B',
      msg: polished.shortText, 
      longText: polished.longText,
      timestamp: new Date().toLocaleString()
    }]);
    playSfx('ui');
    speakAlien("Insight logged to the elite cortex. Nice work.", audioCtxRef.current!);
  };

  const shareLogWithSid = (m: FeedbackMessage) => {
    playSfx('ui');
    const subject = encodeURIComponent(`ELITE SYNC: Shoutout from ${m.firstName}`);
    const body = encodeURIComponent(`Hi Sid,\n\nTeam recognition established: "${m.msg}"\n\nFull Insight: ${m.longText}\n\nShared via Sid The Brain Arcade.`);
    window.location.href = `mailto:sid.bartake@gmail.com?subject=${subject}&body=${body}`;
  };

  const resetGame = () => {
    setIsGameActive(false);
    setShowJackpot(false);
    setIsSidebarOpen(false);
    isResultProcessing.current = false;
    playSfx('power');
    speakAlien("Disconnecting from Sid-Cortex. See you soon, operator.", audioCtxRef.current!);
  };

  const handlePlayAgain = () => {
    setShowJackpot(false);
    isResultProcessing.current = false;
    playSfx('ui');
    speakAlien("Sid-Sight ready. Syncing in 3, 2, 1...", audioCtxRef.current!);
  };

  useEffect(() => {
    if (!isGameActive || isMuted) return;
    const interval = setInterval(() => {
        if (Math.random() > 0.8 && !isAiThinking && !isSpinning && !showJackpot) {
            const text = ALIEN_INTERJECTIONS[Math.floor(Math.random() * ALIEN_INTERJECTIONS.length)];
            speakAlien(text, audioCtxRef.current!);
        }
    }, 15000);
    return () => clearInterval(interval);
  }, [isGameActive, isMuted, isAiThinking, isSpinning, showJackpot]);

  useEffect(() => {
    if (!canvasRef.current || !isGameActive) return;
    const ctx = canvasRef.current.getContext('2d', { alpha: false })!;
    let raf: number;
    const render = (time: number) => {
      const dt = Math.min((time - lastUpdate.current) / 16, 2);
      lastUpdate.current = time;
      const w = canvasRef.current!.width = canvasRef.current!.clientWidth * window.devicePixelRatio;
      const h = canvasRef.current!.height = canvasRef.current!.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const dw = w / window.devicePixelRatio;
      const dh = h / window.devicePixelRatio;
      ctx.fillStyle = themeObj.bg;
      ctx.fillRect(0, 0, dw, dh);
      
      const reelWidth = dw / REEL_COUNT;
      const cellHeight = dh / 3;
      let anyReelMoving = false;

      for (let i = 0; i < REEL_COUNT; i++) {
        if (reelStates.current[i] === 'SPINNING') {
          reelPositions.current[i] += reelVelocities.current[i] * dt * 0.1;
          anyReelMoving = true;
        } else if (reelStates.current[i] === 'STOPPING') {
          const target = targetSymbols.current[i];
          const current = reelPositions.current[i];
          const modPos = current % symbols.length;
          
          let dist = target - modPos;
          if (dist < 0) dist += symbols.length;
          
          if (dist < 0.05 && reelVelocities.current[i] < MIN_STOP_SPEED) {
            reelPositions.current[i] = target;
            reelVelocities.current[i] = 0;
            reelStates.current[i] = 'LOCKED';
            reelBounces.current[i] = 6;
            playSfx('stop');
          } else {
            reelVelocities.current[i] *= FRICTION;
            const step = Math.max(reelVelocities.current[i], MIN_STOP_SPEED);
            reelPositions.current[i] += step * dt * 0.1;
            anyReelMoving = true;
          }
        } else if (reelStates.current[i] === 'LOCKED') {
          if (reelBounces.current[i] > 0) {
            const bounceAmp = reelBounces.current[i] * BOUNCE_FORCE;
            const bounceOffset = Math.sin(time * 0.02) * bounceAmp;
            reelPositions.current[i] = targetSymbols.current[i] + bounceOffset;
            reelBounces.current[i] *= 0.8;
            if (reelBounces.current[i] < 0.1) {
              reelBounces.current[i] = 0;
              reelPositions.current[i] = targetSymbols.current[i];
            }
          }
        }

        ctx.save();
        ctx.translate(i * reelWidth, 0);
        const pos = reelPositions.current[i];
        const blurAmount = Math.min(reelVelocities.current[i] / 2, 30);
        
        for (let j = -2; j < 5; j++) {
          const symIndex = (Math.floor(pos - j) % symbols.length + symbols.length) % symbols.length;
          const symbol = symbols[symIndex];
          const yOffset = (pos % 1) * cellHeight;
          const y = (j * cellHeight) + yOffset;
          
          if (blurAmount > 2) {
            const draws = Math.floor(blurAmount / 2) + 1;
            for (let b = 0; b < draws; b++) {
              ctx.globalAlpha = 1 / draws;
              const blurY = y + (b * (blurAmount / draws));
              ctx.fillStyle = symbol.color;
              ctx.font = `bold ${cellHeight * 0.5}px "Roboto"`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(symbol.icon, reelWidth / 2, blurY + cellHeight / 2);
            }
          } else {
            ctx.globalAlpha = 1;
            ctx.fillStyle = symbol.color;
            ctx.font = `bold ${cellHeight * 0.5}px "Roboto"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol.icon, reelWidth / 2, y + cellHeight / 2);
            
            ctx.font = `900 ${Math.min(cellHeight * 0.08, 11)}px "Press Start 2P"`;
            ctx.fillStyle = '#fff';
            ctx.fillText(symbol.label, reelWidth / 2, y + cellHeight * 0.88);
          }
        }
        ctx.restore();
        
        if (i < REEL_COUNT - 1) {
          ctx.strokeStyle = themeObj.primary + '33';
          ctx.beginPath();
          ctx.moveTo((i + 1) * reelWidth, 0);
          ctx.lineTo((i + 1) * reelWidth, dh);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = themeObj.primary;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = themeObj.primary;
      ctx.strokeRect(8, cellHeight + 8, dw - 16, cellHeight - 16);
      ctx.shadowBlur = 0;

      const allDone = reelStates.current.every(s => s === 'LOCKED' || s === 'IDLE');
      const someReelsWereStopped = reelStates.current.some(s => s === 'LOCKED');
      
      if (!anyReelMoving && allDone && someReelsWereStopped && !isResultProcessing.current && !showJackpot) {
          if (reelBounces.current.every(b => b === 0)) {
              finalizeSpin();
          }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [symbols, isGameActive, themeObj, finalizeSpin, playSfx, showJackpot]);

  return (
    <div className="fixed inset-0 font-roboto text-white transition-all duration-700 flex flex-col items-center justify-center p-0 overflow-hidden" style={{ backgroundColor: themeObj.bg }}>
      
      <div className="absolute inset-0 pointer-events-none z-10 opacity-5 crt-glitch" />

      <div className="relative w-full max-w-7xl h-full flex flex-col cabinet-container animate-fade-in">
        
        <header className="bg-[#111] border-b-4 border-white/5 p-3 sm:p-5 flex flex-col items-center justify-center relative shadow-xl overflow-hidden shrink-0 z-50">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-scan" />
           <h1 className="text-xl sm:text-3xl md:text-5xl font-black italic tracking-tighter text-white z-10 neon-text uppercase text-center" style={{ textShadow: themeObj.shadow }}>
              SID THE BRAIN
           </h1>
           <div className="text-[7px] sm:text-[9px] md:text-xs font-arcade mt-1 tracking-widest z-10 opacity-80 uppercase" style={{ color: themeObj.primary }}>
              THE SID-CORTEX CELEBRATOR
           </div>
           
           {isGameActive && (
             <button 
                onClick={resetGame}
                onMouseEnter={() => playSfx('ui')}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-1.5 sm:p-3 bg-red-600/10 border border-red-500/30 rounded-full text-red-500 hover:bg-red-600/30 transition-all z-20 group"
             >
               <LogOut className="w-3.5 h-3.5 sm:w-5 sm:h-5 group-hover:-translate-x-0.5" />
             </button>
           )}
        </header>

        <main className="flex-1 bg-[#050510] border-x-2 sm:border-x-4 border-white/5 relative flex flex-col md:flex-row overflow-hidden min-h-0">
           
           <aside className="hidden lg:flex w-64 bg-black/40 border-r border-white/5 flex-col p-5 gap-5 shrink-0">
              <div className="p-4 bg-black/60 rounded-xl border border-white/10 shadow-lg group">
                 <div className="text-[9px] font-arcade mb-2 opacity-70 group-hover:text-cyan-400 transition-colors" style={{ color: themeObj.primary }}>SID-POINTS</div>
                 <div className="text-2xl font-mono font-black text-white tracking-widest tabular-nums">{score.toLocaleString()}</div>
              </div>
              
              <div className="p-4 bg-black/60 rounded-xl border border-white/10 shadow-lg flex-1 flex flex-col min-h-0">
                 <BrainChart history={scoreHistory} theme={themeObj} title="TEAM GROWTH" />
                 
                 <div className="mt-8 space-y-4 overflow-y-auto pr-1 scrollbar-hide">
                    <div className="text-[8px] font-arcade opacity-50 uppercase mb-2">Sid-Capabilities</div>
                    {symbols.slice(0, 5).map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5 text-[9px] font-mono uppercase tracking-widest">
                            <span className="text-lg">{s.icon}</span>
                            <span className="truncate">{s.label}</span>
                        </div>
                    ))}
                 </div>
              </div>
              
              <div className="mt-auto space-y-2.5">
                 <button onClick={() => { setIsMuted(!isMuted); playSfx('ui'); }} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg font-bold uppercase text-[9px] flex items-center gap-2.5 hover:bg-white/10 transition-all">
                   {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                   {isMuted ? 'SILENT' : 'AUDIO ACTIVE'}
                 </button>
                 <button onClick={() => { setIsSidebarOpen(true); playSfx('ui'); }} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-lg font-bold uppercase text-[9px] flex items-center gap-2.5 hover:bg-white/10 transition-all">
                   <Heart className="w-4 h-4 text-pink-400" /> SHOUTOUT STATION
                 </button>
              </div>
           </aside>

           <section className="flex-1 relative flex flex-col crt min-h-0 bg-black">
              <canvas ref={canvasRef} className="w-full h-full block" />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/60" />
              
              <div className="absolute bottom-6 inset-x-0 flex justify-around pointer-events-none px-4">
                 {[0, 1, 2].map(i => (
                    <div key={i} className="flex flex-col gap-2 pointer-events-auto items-center">
                        <button 
                            disabled={isSpinning || nudgesRemaining <= 0}
                            onClick={() => handleNudge(i)}
                            className={`p-5 rounded-full border-4 transition-all active:scale-90 shadow-glow ${nudgesRemaining > 0 && !isSpinning ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30' : 'bg-black/60 border-white/5 text-white/10 cursor-not-allowed'}`}
                        >
                            <ArrowDown className="w-8 h-8" />
                            <div className="text-[7px] font-arcade mt-1 uppercase tracking-widest">Nudge</div>
                        </button>
                    </div>
                 ))}
              </div>

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                 <div className="flex items-center gap-2 bg-black/70 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
                    <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                    <span className="text-[7px] font-arcade text-white uppercase">SID-SYNC ONLINE</span>
                 </div>
                 <div className="flex items-center gap-2 bg-black/70 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-cyan-400 animate-bounce" />
                    <span className="text-[7px] font-arcade text-white uppercase">{nudgesRemaining} NUDGES READY</span>
                 </div>
              </div>

              <div className="lg:hidden absolute top-4 right-4 flex gap-2 z-30">
                 <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-black/80 rounded-full border border-white/10 text-white shadow-lg"><Heart className="w-4 h-4 text-pink-400" /></button>
                 <button onClick={() => { setIsMuted(!isMuted); playSfx('ui'); }} className="p-2 bg-black/80 rounded-full border border-white/10 text-white shadow-lg">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
              </div>
           </section>
        </main>

        <footer className="bg-[#1a1a25] border-t-4 border-white/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 z-50 shadow-2xl">
           <div className="hidden sm:flex items-center gap-5">
              <div className="space-y-1">
                 <div className="text-[7px] font-arcade text-white/40 uppercase">OPERATOR STATUS</div>
                 <div className="bg-black/80 px-3 py-1.5 rounded-md border border-white/10 text-[9px] font-mono uppercase tracking-widest flex items-center gap-2" style={{ color: themeObj.primary }}>
                    <Smile className="w-3 h-3 animate-pulse" /> {playerName || 'TEAM MEMBER'}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-2 w-full sm:w-64">
              <div className="text-[6px] font-arcade text-white/20 uppercase text-center mb-1 tracking-widest">Neural Strategy</div>
              <div className="grid grid-cols-2 gap-1.5">
                 {STRATEGIES.slice(0, 4).map(s => (
                   <button 
                    key={s} 
                    onClick={() => { setSelectedStrategy(s); playSfx('ui'); }} 
                    className={`px-1 py-1.5 rounded-lg border-2 text-[7px] font-arcade transition-all active:scale-95 ${selectedStrategy === s ? 'text-black shadow-glow' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                    style={{ 
                      backgroundColor: selectedStrategy === s ? themeObj.primary : '', 
                      borderColor: selectedStrategy === s ? themeObj.primary : '' 
                    }}
                  >
                      {s.split('-')[1] || s}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex gap-4 sm:gap-7 items-center">
              <button 
                onClick={handleSpin}
                onMouseEnter={() => playSfx('ui')}
                disabled={isSpinning}
                className={`w-20 h-20 sm:w-32 sm:h-32 rounded-full border-4 sm:border-8 transition-all flex flex-col items-center justify-center gap-1.5 shadow-2xl relative group active:translate-y-1
                  ${isSpinning ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-red-600 border-red-400 hover:bg-red-500 shadow-[0_0_40px_rgba(220,38,38,0.5)]'}
                `}
              >
                 <Rocket className={`w-5 h-5 sm:w-10 sm:h-10 text-white ${isSpinning ? 'animate-bounce' : 'group-hover:scale-125 transition-transform duration-300'}`} />
                 <span className="text-[7px] sm:text-[10px] font-arcade text-white leading-none uppercase">ELITE SYNC</span>
              </button>
           </div>
        </footer>
        
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[600px] bg-[#050510] border-l-4 sm:border-l-8 flex flex-col shadow-6xl transition-transform duration-500 z-[200] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ borderColor: themeObj.primary }}>
            <div className="p-5 sm:p-7 border-b border-white/5 flex justify-between items-center bg-black/95 backdrop-blur-3xl shrink-0">
              <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
                  <h2 className="font-arcade text-xs sm:text-lg text-white uppercase tracking-[0.2em]">Shoutout Station</h2>
              </div>
              <button onClick={() => { setIsSidebarOpen(false); playSfx('ui'); }} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition-transform hover:rotate-90"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 scrollbar-hide bg-[#020205] crt">
              <section className="bg-black/60 p-5 sm:p-8 rounded-2xl border border-white/5 shadow-2xl group">
                  <h3 className="font-arcade text-[8px] sm:text-[9px] mb-5 flex items-center gap-3 uppercase text-pink-400"><Send className="w-4 h-4" /> Message for Sid Bartake</h3>
                  <textarea 
                    value={currentMessage} 
                    onChange={e => setCurrentMessage(e.target.value)} 
                    placeholder="SAY SOMETHING SID-TASTIC..." 
                    className="w-full bg-black border-2 border-white/10 rounded-xl px-4 py-3 focus:border-white outline-none uppercase font-mono text-[10px] sm:text-xs text-white tracking-widest resize-none min-h-[110px] transition-all" 
                  />
                  <button onClick={submitFeedback} className="w-full mt-4 py-4 text-black rounded-full font-arcade text-[8px] shadow-lg transition-all active:scale-95 uppercase flex items-center justify-center gap-3 hover:opacity-90" style={{ backgroundColor: themeObj.primary }}>
                       <BrainCircuit className="w-4 h-4" /> Share Sid-Sight
                  </button>
              </section>

              <section className="space-y-6">
                  <h3 className="font-arcade text-[8px] sm:text-[9px] flex items-center gap-3 uppercase text-white/60"><Terminal className="w-4 h-4" /> Team Brain Log</h3>
                  <div className="space-y-4 font-mono">
                    {legacyMessages.length === 0 ? (
                      <div className="text-white/20 text-center font-arcade text-[8px] py-16 border-2 border-dashed border-white/5 rounded-2xl uppercase tracking-tighter">Awaiting team shoutouts...</div>
                    ) : (
                      [...legacyMessages].reverse().map((m, i) => (
                          <div key={i} className="bg-white/5 p-4 rounded-xl border-l-4 relative group/item transition-all hover:bg-white/10" style={{ borderLeftColor: themeObj.primary }}>
                            <div className="text-[8px] font-arcade mb-1.5 uppercase opacity-60 flex justify-between" style={{ color: themeObj.primary }}>
                              <span>{m.firstName}:~$</span>
                              <span className="text-[6px] opacity-40">{m.timestamp}</span>
                            </div>
                            <div className="text-sm text-gray-100 font-light italic mb-2">"{m.msg}"</div>
                            <button onClick={() => shareLogWithSid(m)} className="p-1.5 bg-white/5 hover:bg-pink-600/20 text-white/50 hover:text-pink-400 rounded-md transition-all flex items-center gap-1.5 text-[7px] font-arcade uppercase">
                               <Mail className="w-3 h-3" /> Share with Sid
                            </button>
                          </div>
                      ))
                    )}
                  </div>
              </section>

              <section className="bg-white/5 p-5 sm:p-8 rounded-2xl border border-white/5">
                  <h3 className="text-white font-arcade text-[8px] sm:text-[9px] mb-6 flex items-center gap-3 uppercase"><Palette className="w-4 h-4" /> Arcade Modes</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => { setActiveTheme(t.id); playSfx('ui'); }} className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all active:scale-98 ${activeTheme === t.id ? 'bg-white/5 border-white' : 'bg-black/60 border-white/5 hover:border-white/10'}`}>
                          <span className="font-arcade text-[8px] sm:text-[9px] text-white uppercase">{t.name}</span>
                          {activeTheme === t.id && <Check className="w-4 h-4 animate-in zoom-in" style={{ color: t.primary }} />}
                      </button>
                    ))}
                  </div>
              </section>
            </div>
        </div>

        {showJackpot && aiResponse && (
          <div className="fixed inset-0 flex items-center justify-center z-[300] p-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto">
             <div className="bg-[#050510] border-4 rounded-[40px] p-6 sm:p-10 md:p-16 max-w-4xl w-full text-center relative overflow-hidden crt my-auto shadow-2xl animate-scale-up" style={{ borderColor: themeObj.primary }}>
                <button onClick={() => { setShowJackpot(false); playSfx('ui'); }} className="absolute right-6 top-6 p-2 text-white/50 hover:text-white transition-all z-50 hover:rotate-90"><X className="w-6 h-6" /></button>
                
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/20" />
                  <Gamepad2 className="w-16 h-16 sm:w-24 sm:h-24 text-yellow-400 mx-auto animate-bounce" />
                </div>
                
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-black italic mb-2 tracking-tighter text-white uppercase" style={{ textShadow: themeObj.shadow }}>BRAIN BLAST!</h2>
                <div className="text-xs sm:text-lg md:text-2xl font-arcade uppercase mb-8 tracking-[0.3em] animate-pulse" style={{ color: themeObj.primary }}>"{aiResponse.message}"</div>
                
                <div className="bg-black/40 p-6 sm:p-10 rounded-2xl mb-10 border border-white/5 text-left shadow-inner transition-all hover:bg-black/60">
                  <h4 className="text-[8px] font-arcade text-white/40 mb-4 uppercase">Sid-Sight Elite</h4>
                  <p className="text-base sm:text-2xl md:text-3xl text-gray-100 italic leading-relaxed font-light font-mono">"{aiResponse.rationale}"</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handlePlayAgain} className="flex-1 bg-white/5 border border-white/10 text-white py-5 rounded-full font-arcade text-[9px] hover:bg-white/10 transition-all uppercase active:scale-95">PLAY AGAIN</button>
                    <button onClick={() => { setShowJackpot(false); speakAlien("Sharing this elite insight with Sid Bartake.", audioCtxRef.current!); playSfx('win'); }} className="flex-1 text-black py-5 rounded-full font-arcade text-[9px] transition-all uppercase active:scale-95 shadow-glow hover:opacity-90" style={{ backgroundColor: themeObj.primary }}>SHARE THE LOVE</button>
                </div>
             </div>
          </div>
        )}

        {!isGameActive && (
          <div className="fixed inset-0 bg-[#020205] flex items-center justify-center p-4 z-[400] crt overflow-y-auto">
            <div className="max-w-4xl w-full bg-[#0a0a1f] border-8 rounded-[40px] sm:rounded-[80px] p-8 sm:p-24 text-center shadow-2xl relative z-10 animate-scale-up arcade-cabinet-frame my-auto" style={{ borderColor: themeObj.primary }}>
               <BrainCircuit className="w-24 h-24 sm:w-56 mx-auto animate-pulse mb-12" style={{ color: themeObj.primary, filter: `drop-shadow(0 0 50px ${themeObj.primary})` }} />
               <h1 className="text-4xl sm:text-8xl md:text-9xl font-black text-white italic mb-6 tracking-tighter uppercase neon-text leading-none" style={{ textShadow: themeObj.shadow }}>SID THE BRAIN</h1>
               <p className="text-white/40 font-arcade text-[8px] sm:text-[10px] mb-14 uppercase tracking-[0.2em] animate-pulse">Connecting to the Sid-Cortex...</p>
               <div className="space-y-6 max-w-lg mx-auto">
                 <input 
                   type="text" 
                   placeholder="ENTER YOUR NAME" 
                   value={playerName} 
                   onChange={e => setPlayerName(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && playerName.trim() && handleEstablishConnection()}
                   className="w-full bg-black border-4 border-white/10 rounded-2xl px-5 py-6 text-white text-center focus:border-white outline-none uppercase font-arcade text-sm sm:text-lg transition-all"
                   style={{ borderColor: themeObj.primary + '22' }}
                 />
                 <button 
                   onClick={handleEstablishConnection} 
                   disabled={!playerName.trim()}
                   className="w-full text-black font-arcade uppercase py-10 rounded-full hover:scale-105 active:scale-95 disabled:opacity-30 transition-all text-sm sm:text-2xl shadow-glow tracking-widest"
                   style={{ backgroundColor: themeObj.primary }}
                 >
                   ENTER THE SID-ZONE
                 </button>
               </div>
            </div>
          </div>
        )}

        {isAiThinking && (
          <div className="fixed inset-0 z-[600] bg-black/90 flex flex-col items-center justify-center gap-10 backdrop-blur-md animate-fade-in crt">
            <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                <Cpu className="w-24 h-24 text-cyan-400 animate-spin-slow relative z-10" />
            </div>
            <div className="text-xs sm:text-2xl font-arcade text-cyan-400 animate-pulse uppercase tracking-[0.4em]">Querying Sid-Sight...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiSlingshot;
