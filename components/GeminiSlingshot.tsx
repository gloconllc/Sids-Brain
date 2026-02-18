
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { analyzeSpin, polishFeedback, speakAlien, generateSidImage } from '../services/geminiService';
import { SymbolType, ThemeType, FeedbackMessage, StrategicHint, ImageSize } from '../types';
import { 
  Heart, Rocket, Palette, 
  Check, Terminal, Mail,
  Cpu, Volume2, VolumeX, X, LogOut,
  BrainCircuit, Zap, Send, TrendingUp,
  ArrowDown, Sparkles, Smile, Image as ImageIcon, Loader2,
  Gamepad2, Menu as MenuIcon, BarChart3, Info, Settings
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
const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

const REEL_COUNT = 3;
const SPIN_SPEED_MAX = 110; 
const FRICTION = 0.94;    
const MIN_STOP_SPEED = 1.0;
const BOUNCE_FORCE = 0.15; 

const BrainChart: React.FC<{ history: number[], theme: any, title?: string }> = ({ history, theme, title }) => {
  const maxVal = Math.max(...history, 1000);
  return (
    <div className="w-full flex flex-col gap-2">
      {title && <div className="text-[10px] font-arcade opacity-50 uppercase" style={{ color: theme.primary }}>{title}</div>}
      <div className="w-full h-20 sm:h-28 bg-black/40 rounded-xl border border-white/5 p-2 relative flex items-end gap-1 overflow-hidden">
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeType>('CYBERPUNK');
  const [score, setScore] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<number[]>([100, 250, 400, 300, 600, 800, 1200]);
  const [legacyMessages, setLegacyMessages] = useState<FeedbackMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [aiResponse, setAiResponse] = useState<StrategicHint | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedImageSize, setSelectedImageSize] = useState<ImageSize>('1K');

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
    reelVelocities.current = reelVelocities.current.map((v, i) => (SPIN_SPEED_MAX + i * 4));
    reelBounces.current = [0, 0, 0];
    
    setNudgesRemaining(3);

    const spinDurations = [250, 500, 750];
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

    if (Math.random() > 0.5) {
      setTimeout(() => {
        speakAlien(`${response.hint.message}. Sid-Sight optimization complete.`, audioCtxRef.current!);
      }, 800);
    }
  }, [symbols, legacyMessages, activeTheme, selectedStrategy, playSfx, themeObj, score]);

  const submitFeedback = async (generateVision: boolean = false) => {
    if (!currentMessage.trim()) return;

    if (generateVision) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        speakAlien("To generate elite team visions, you must connect a paid API key. Opening selector now.", audioCtxRef.current!);
        await (window as any).aistudio.openSelectKey();
        return;
      }
    }

    const raw = currentMessage;
    setCurrentMessage("");
    setIsGeneratingImage(generateVision);
    
    let imageUrl = undefined;
    if (generateVision) {
      imageUrl = await generateSidImage(raw, selectedImageSize) || undefined;
    }

    const polished = await polishFeedback(raw);
    setLegacyMessages(prev => [...prev, { 
      firstName: playerName || 'Operator', 
      lastInitial: 'B',
      msg: polished.shortText, 
      longText: polished.longText,
      timestamp: new Date().toLocaleString(),
      imageUrl
    }]);
    
    setIsGeneratingImage(false);
    playSfx('ui');
    speakAlien(generateVision ? "Elite vision captured and logged. Sid will be impressed." : "Insight logged to the elite cortex. Nice work.", audioCtxRef.current!);
  };

  const shareLogWithSid = (m: FeedbackMessage) => {
    playSfx('ui');
    const subject = encodeURIComponent(`ELITE SYNC: Shoutout from ${m.firstName}`);
    const body = encodeURIComponent(`Hi Sid,\n\nTeam recognition established: "${m.msg}"\n\nFull Insight: ${m.longText}\n\nShared via Sid The Brain Arcade.${m.imageUrl ? '\n\nAn Elite Vision was also generated for this shoutout!' : ''}`);
    window.location.href = `mailto:sid.bartake@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleShareTheLove = () => {
    if (!aiResponse) return;
    playSfx('win');
    speakAlien("Sharing this elite insight with Sid Bartake.", audioCtxRef.current!);
    
    const latestFeedback = legacyMessages.length > 0 ? legacyMessages[legacyMessages.length - 1].longText : 'No additional feedback provided.';
    const subject = encodeURIComponent("Sid's VA Time");
    const body = encodeURIComponent(
      `Hi Sid,\n\n` +
      `Check out this Sid-Sight insight generated in the Brain Arcade!\n\n` +
      `Recognition: "${aiResponse.message}"\n` +
      `The Rationale: ${aiResponse.rationale}\n\n` +
      `Additional Team Feedback: "${latestFeedback}"\n\n` +
      `Submitted by: ${playerName}\n\n` +
      `you are a rockstar Sid`
    );
    window.location.href = `mailto:sid.bartake@gmail.com?subject=${subject}&body=${body}`;
  };

  const resetGame = () => {
    setIsGameActive(false);
    setShowJackpot(false);
    setIsSidebarOpen(false);
    setIsMobileMenuOpen(false);
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
          reelPositions.current[i] += reelVelocities.current[i] * dt * 0.12; 
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
            reelBounces.current[i] = 5;
            playSfx('stop');
          } else {
            reelVelocities.current[i] *= FRICTION;
            const step = Math.max(reelVelocities.current[i], MIN_STOP_SPEED);
            reelPositions.current[i] += step * dt * 0.12;
            anyReelMoving = true;
          }
        } else if (reelStates.current[i] === 'LOCKED') {
          if (reelBounces.current[i] > 0) {
            const bounceAmp = reelBounces.current[i] * BOUNCE_FORCE;
            const bounceOffset = Math.sin(time * 0.02) * bounceAmp;
            reelPositions.current[i] = targetSymbols.current[i] + bounceOffset;
            reelBounces.current[i] *= 0.75; 
            if (reelBounces.current[i] < 0.1) {
              reelBounces.current[i] = 0;
              reelPositions.current[i] = targetSymbols.current[i];
            }
          }
        }

        ctx.save();
        ctx.translate(i * reelWidth, 0);
        const pos = reelPositions.current[i];
        const blurAmount = Math.min(reelVelocities.current[i] / 1.8, 35); 
        
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
              ctx.font = `bold ${cellHeight * 0.45}px "Roboto"`; 
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(symbol.icon, reelWidth / 2, blurY + cellHeight / 2);
            }
          } else {
            ctx.globalAlpha = 1;
            ctx.fillStyle = symbol.color;
            ctx.font = `bold ${cellHeight * 0.45}px "Roboto"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol.icon, reelWidth / 2, y + cellHeight / 2);
            
            // Scalable Label Size
            const labelSize = Math.max(Math.min(cellHeight * 0.06, reelWidth * 0.12), 6);
            ctx.font = `900 ${labelSize}px "Press Start 2P"`;
            ctx.fillStyle = '#fff';
            // Truncate or wrap label if too long for reelWidth
            const label = symbol.label.length > 10 && dw < 400 ? symbol.label.slice(0, 8) + '..' : symbol.label;
            ctx.fillText(label, reelWidth / 2, y + cellHeight * 0.88);
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
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = themeObj.primary;
      ctx.strokeRect(4, cellHeight + 4, dw - 8, cellHeight - 8);
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

  const SidebarContent = useCallback(() => (
    <>
      <div className="p-4 bg-black/60 rounded-xl border border-white/10 shadow-lg group">
         <div className="text-[10px] font-arcade mb-2 opacity-70 group-hover:text-cyan-400 transition-colors" style={{ color: themeObj.primary }}>SID-POINTS</div>
         <div className="text-3xl font-mono font-black text-white tracking-widest tabular-nums">{score.toLocaleString()}</div>
      </div>
      
      <div className="p-4 bg-black/60 rounded-xl border border-white/10 shadow-lg flex-1 flex flex-col min-h-0 overflow-hidden">
         <BrainChart history={scoreHistory} theme={themeObj} title="TEAM GROWTH" />
         
         <div className="mt-8 space-y-4 overflow-y-auto pr-1 scrollbar-hide flex-1">
            <div className="text-[10px] font-arcade opacity-50 uppercase mb-2">Sid-Capabilities</div>
            {symbols.slice(0, 12).map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono uppercase tracking-widest hover:bg-white/10 transition-colors">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                </div>
            ))}
         </div>
      </div>
      
      <div className="mt-auto space-y-4 pt-4 border-t border-white/10">
         <div className="flex gap-2">
            <button onClick={() => { setIsMuted(!isMuted); playSfx('ui'); }} className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              {isMuted ? 'Muted' : 'Sound'}
            </button>
            <button onClick={() => { setIsMobileMenuOpen(false); setIsSidebarOpen(true); playSfx('ui'); }} className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              <Heart className="w-4 h-4 text-pink-400" /> Shoutouts
            </button>
         </div>

         <div className="space-y-2">
            <div className="text-[8px] font-arcade opacity-50 uppercase mb-2">Arcade Mode</div>
            <div className="grid grid-cols-1 gap-2">
              {THEMES.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setActiveTheme(t.id); playSfx('ui'); }} 
                  className={`flex justify-between items-center p-3 rounded-lg border transition-all ${activeTheme === t.id ? 'bg-white/10 border-white' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                >
                    <span className="font-arcade text-[8px] text-white uppercase">{t.name}</span>
                    {activeTheme === t.id && <Check className="w-4 h-4" style={{ color: t.primary }} />}
                </button>
              ))}
            </div>
         </div>
      </div>
    </>
  ), [themeObj, score, scoreHistory, symbols, isMuted, playSfx, activeTheme]);

  return (
    <div className="fixed inset-0 font-roboto text-white transition-all duration-700 flex flex-col items-center justify-center p-0 overflow-hidden" style={{ backgroundColor: themeObj.bg }}>
      
      <div className="absolute inset-0 pointer-events-none z-10 opacity-5 crt-glitch" />

      <div className="relative w-full max-w-7xl h-full flex flex-col cabinet-container animate-fade-in overflow-hidden">
        
        <header className="bg-[#111] border-b-2 border-white/5 p-2 sm:p-5 flex items-center justify-between sm:justify-center relative shadow-xl overflow-hidden shrink-0 z-50 h-14 sm:h-20">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-scan" />
           
           <div className="flex items-center gap-2 sm:hidden z-10 h-full">
              {isGameActive && (
                <button 
                  onClick={() => { setIsMobileMenuOpen(true); playSfx('ui'); }}
                  className="p-2 bg-white/5 rounded-lg border border-white/10 text-white flex items-center justify-center"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
              )}
           </div>

           <div className="flex flex-col items-center z-10">
              <h1 className="text-base sm:text-2xl md:text-5xl font-black italic tracking-tighter text-white neon-text uppercase text-center" style={{ textShadow: themeObj.shadow }}>
                  SID THE BRAIN
              </h1>
              <div className="hidden sm:block text-[6px] sm:text-[9px] md:text-xs font-arcade mt-0.5 sm:mt-1 tracking-widest opacity-80 uppercase" style={{ color: themeObj.primary }}>
                  THE SID-CORTEX CELEBRATOR
              </div>
           </div>
           
           <div className="z-10 flex gap-2 sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2">
             {isGameActive && (
               <button 
                  onClick={resetGame}
                  onMouseEnter={() => playSfx('ui')}
                  className="p-1.5 sm:p-3 bg-red-600/10 border border-red-500/30 rounded-full text-red-500 hover:bg-red-600/30 transition-all group"
               >
                 <LogOut className="w-4 h-4 sm:w-6 sm:h-6" />
               </button>
             )}
           </div>
        </header>

        <main className="flex-1 bg-[#050510] border-x-2 sm:border-x-4 border-white/5 relative flex flex-col md:flex-row overflow-hidden min-h-0">
           
           <aside className="hidden lg:flex w-72 bg-black/40 border-r border-white/5 flex-col p-6 gap-6 shrink-0">
              <SidebarContent />
           </aside>

           <section className="flex-1 relative flex flex-col crt min-h-0 bg-black">
              <canvas ref={canvasRef} className="w-full h-full block" />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/60" />
              
              <div className="absolute bottom-2 sm:bottom-10 inset-x-0 flex justify-around pointer-events-none px-2 sm:px-4">
                 {[0, 1, 2].map(i => (
                    <div key={i} className="flex flex-col gap-2 pointer-events-auto items-center">
                        <button 
                            disabled={isSpinning || nudgesRemaining <= 0}
                            onClick={() => handleNudge(i)}
                            className={`p-3 sm:p-6 rounded-full border-2 transition-all active:scale-90 shadow-glow ${nudgesRemaining > 0 && !isSpinning ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30' : 'bg-black/60 border-white/5 text-white/10 cursor-not-allowed'}`}
                        >
                            <ArrowDown className="w-5 h-5 sm:w-10 sm:h-10" />
                        </button>
                    </div>
                 ))}
              </div>

              <div className="absolute top-2 left-2 flex flex-col gap-1 sm:gap-2 scale-75 sm:scale-100 origin-top-left">
                 <div className="flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                    <span className="text-[7px] sm:text-[9px] font-arcade text-white uppercase">ONLINE</span>
                 </div>
                 <div className="flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-cyan-400 animate-bounce" />
                    <span className="text-[7px] sm:text-[9px] font-arcade text-white uppercase">{nudgesRemaining} NUDGES</span>
                 </div>
              </div>

              <div className="lg:hidden absolute top-2 right-2 flex gap-1.5 z-30 scale-90 sm:scale-100 origin-top-right">
                 <button onClick={() => { setIsSidebarOpen(true); playSfx('ui'); }} className="p-2 sm:p-3 bg-black/80 rounded-full border border-white/10 text-white shadow-lg backdrop-blur-sm"><Heart className="w-4 h-4 sm:w-6 sm:h-6 text-pink-400" /></button>
              </div>
           </section>
        </main>

        <footer className="bg-[#1a1a25] border-t-2 border-white/10 px-4 py-2 sm:p-6 flex flex-row items-center justify-between gap-4 shrink-0 z-50 shadow-2xl h-20 sm:h-32">
           <div className="hidden lg:flex items-center gap-5">
              <div className="space-y-1">
                 <div className="text-[7px] font-arcade text-white/40 uppercase">OPERATOR STATUS</div>
                 <div className="bg-black/80 px-3 py-2 rounded-md border border-white/10 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2" style={{ color: themeObj.primary }}>
                    <Smile className="w-4 h-4 animate-pulse" /> {playerName || 'TEAM MEMBER'}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-1 w-full max-w-[120px] sm:max-w-[280px]">
              <div className="text-[5px] sm:text-[8px] font-arcade text-white/20 uppercase text-center mb-0.5 tracking-widest">Neural Strategy</div>
              <div className="grid grid-cols-2 gap-1 sm:gap-2">
                 {STRATEGIES.slice(0, 4).map(s => (
                   <button 
                    key={s} 
                    onClick={() => { setSelectedStrategy(s); playSfx('ui'); }} 
                    className={`px-1 py-1 rounded-lg border text-[5px] sm:text-[9px] font-arcade transition-all active:scale-95 ${selectedStrategy === s ? 'text-black shadow-glow' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
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

           <div className="flex gap-2 items-center pr-1">
              <button 
                onClick={handleSpin}
                onMouseEnter={() => playSfx('ui')}
                disabled={isSpinning}
                className={`w-14 h-14 sm:w-24 sm:h-24 rounded-full border-4 transition-all flex flex-col items-center justify-center gap-1 shadow-2xl relative group active:translate-y-1
                  ${isSpinning ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-red-600 border-red-400 hover:bg-red-500 shadow-[0_0_40px_rgba(220,38,38,0.5)]'}
                `}
              >
                 <Rocket className={`w-6 h-6 sm:w-10 sm:h-10 text-white ${isSpinning ? 'animate-bounce' : 'group-hover:scale-125 transition-transform duration-300'}`} />
                 <span className="hidden sm:block text-[8px] font-arcade text-white leading-none uppercase mt-1">ELITE SYNC</span>
              </button>
           </div>
        </footer>
        
        <div className={`fixed inset-y-0 left-0 w-full sm:w-[480px] bg-[#050510] border-r-4 sm:border-r-8 flex flex-col shadow-6xl transition-transform duration-500 z-[200] lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ borderColor: themeObj.primary }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/95 backdrop-blur-3xl shrink-0">
              <div className="flex items-center gap-4">
                  <div className="p-2 bg-cyan-400/10 rounded-lg border border-cyan-400/30">
                    <Cpu className="w-6 h-6 text-cyan-400 animate-spin-slow" />
                  </div>
                  <h2 className="font-arcade text-lg sm:text-2xl text-white uppercase tracking-[0.2em]">Control Panel</h2>
              </div>
              <button onClick={() => { setIsMobileMenuOpen(false); playSfx('ui'); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white transition-transform hover:-rotate-90">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide bg-[#020205] crt flex flex-col">
              <SidebarContent />
            </div>
        </div>

        <div className={`fixed inset-y-0 right-0 w-full lg:w-[850px] sm:w-[650px] bg-[#050510] border-l-4 sm:border-l-8 flex flex-col shadow-6xl transition-transform duration-500 z-[200] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ borderColor: themeObj.primary }}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/95 backdrop-blur-3xl shrink-0">
              <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6 sm:w-10 sm:h-10 text-pink-400 animate-pulse" />
                  <h2 className="font-arcade text-lg sm:text-2xl md:text-3xl text-white uppercase tracking-[0.2em]">Shoutout Station</h2>
              </div>
              <button onClick={() => { setIsSidebarOpen(false); playSfx('ui'); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white transition-transform hover:rotate-90">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-8 sm:space-y-12 scrollbar-hide bg-[#020205] crt">
              <section className="bg-black/60 p-6 sm:p-10 rounded-3xl border border-white/5 shadow-2xl group">
                  <h3 className="font-arcade text-[10px] sm:text-xs mb-4 flex items-center gap-4 uppercase text-pink-400">
                    <Send className="w-5 h-5 sm:w-6 sm:h-6" /> Recognition for Sid Bartake
                  </h3>
                  <textarea 
                    value={currentMessage} 
                    onChange={e => setCurrentMessage(e.target.value)} 
                    placeholder="SAY SOMETHING SID-TASTIC..." 
                    className="w-full bg-black border-2 border-white/10 rounded-2xl p-6 focus:border-white outline-none uppercase font-mono text-sm sm:text-xl text-white tracking-widest resize-none min-h-[160px] transition-all" 
                  />
                  
                  <div className="mt-6 space-y-4">
                    <div className="text-[10px] font-arcade text-white/40 uppercase tracking-widest mb-2">Elite Vision Resolution</div>
                    <div className="flex gap-3">
                       {IMAGE_SIZES.map(sz => (
                         <button 
                           key={sz} 
                           onClick={() => setSelectedImageSize(sz)} 
                           className={`px-5 py-3 rounded-xl border-2 text-[10px] font-arcade transition-all ${selectedImageSize === sz ? 'bg-cyan-500 text-black border-cyan-400 shadow-glow' : 'bg-black text-white/40 border-white/10 hover:border-white/30'}`}
                         >
                            {sz}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => submitFeedback(false)} 
                      disabled={isGeneratingImage}
                      className="flex-1 py-6 text-black rounded-full font-arcade text-[10px] sm:text-xs shadow-lg transition-all active:scale-95 uppercase flex items-center justify-center gap-4 hover:opacity-90 bg-white"
                    >
                         <BrainCircuit className="w-6 h-6" /> Share Shoutout
                    </button>
                    <button 
                      onClick={() => submitFeedback(true)} 
                      disabled={isGeneratingImage}
                      className="flex-1 py-6 text-black rounded-full font-arcade text-[10px] sm:text-xs shadow-lg transition-all active:scale-95 uppercase flex items-center justify-center gap-4 hover:opacity-90" 
                      style={{ backgroundColor: themeObj.primary }}
                    >
                         {isGeneratingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                         {isGeneratingImage ? "Visualizing..." : "Generate Vision"}
                    </button>
                  </div>
              </section>

              <section className="space-y-8">
                  <h3 className="font-arcade text-[10px] flex items-center gap-4 uppercase text-white/60"><Terminal className="w-6 h-6" /> Team Brain Log</h3>
                  <div className="space-y-6 font-mono">
                    {legacyMessages.length === 0 ? (
                      <div className="text-white/20 text-center font-arcade text-[10px] py-24 border-2 border-dashed border-white/5 rounded-3xl uppercase tracking-widest">Awaiting team shoutouts...</div>
                    ) : (
                      [...legacyMessages].reverse().map((m, i) => (
                          <div key={i} className="bg-white/5 p-6 sm:p-8 rounded-3xl border-l-8 relative group/item transition-all hover:bg-white/10" style={{ borderLeftColor: themeObj.primary }}>
                            <div className="text-[10px] font-arcade mb-3 uppercase opacity-60 flex justify-between" style={{ color: themeObj.primary }}>
                              <span>{m.firstName}:~$</span>
                              <span className="text-[8px] opacity-40">{m.timestamp}</span>
                            </div>
                            <div className="text-lg sm:text-2xl md:text-3xl text-gray-100 font-light italic mb-4 leading-relaxed">"{m.msg}"</div>
                            
                            {m.imageUrl && (
                              <div className="mb-6 rounded-2xl overflow-hidden border-4 border-white/10 group-hover:border-cyan-400 transition-colors">
                                <img src={m.imageUrl} alt="Elite Vision" className="w-full object-cover max-h-[400px] hover:scale-105 transition-transform duration-700" />
                              </div>
                            )}

                            <button onClick={() => shareLogWithSid(m)} className="p-3 bg-white/5 hover:bg-pink-600/20 text-white/50 hover:text-pink-400 rounded-xl transition-all flex items-center gap-3 text-[10px] font-arcade uppercase">
                               <Mail className="w-5 h-5" /> Send to Sid
                            </button>
                          </div>
                      ))
                    )}
                  </div>
              </section>
            </div>
        </div>

        {showJackpot && aiResponse && (
          <div className="fixed inset-0 flex items-center justify-center z-[300] p-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto">
             <div className="bg-[#050510] border-4 rounded-[40px] p-8 sm:p-16 max-w-4xl w-full text-center relative overflow-hidden crt my-auto shadow-2xl animate-scale-up" style={{ borderColor: themeObj.primary }}>
                <button onClick={() => { setShowJackpot(false); playSfx('ui'); }} className="absolute right-6 top-6 p-2 text-white/50 hover:text-white transition-all z-50 hover:rotate-90"><X className="w-8 h-8" /></button>
                
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400/20" />
                  <Gamepad2 className="w-16 h-16 sm:w-28 sm:h-28 text-yellow-400 mx-auto animate-bounce" />
                </div>
                
                <h2 className="text-3xl sm:text-7xl font-black italic mb-4 tracking-tighter text-white uppercase" style={{ textShadow: themeObj.shadow }}>BRAIN BLAST!</h2>
                <div className="text-[10px] sm:text-2xl font-arcade uppercase mb-8 tracking-[0.3em] animate-pulse" style={{ color: themeObj.primary }}>"{aiResponse.message}"</div>
                
                <div className="bg-black/40 p-6 sm:p-10 rounded-2xl mb-10 border border-white/5 text-left shadow-inner transition-all hover:bg-black/60">
                  <h4 className="text-[8px] sm:text-[10px] font-arcade text-white/40 mb-4 uppercase">Sid-Sight Elite</h4>
                  <p className="text-base sm:text-3xl text-gray-100 italic leading-relaxed font-light font-mono">"{aiResponse.rationale}"</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handlePlayAgain} className="flex-1 bg-white/5 border border-white/10 text-white py-4 sm:py-6 rounded-full font-arcade text-[10px] hover:bg-white/10 transition-all uppercase active:scale-95">PLAY AGAIN</button>
                    <button onClick={handleShareTheLove} className="flex-1 text-black py-4 sm:py-6 rounded-full font-arcade text-[10px] transition-all uppercase active:scale-95 shadow-glow hover:opacity-90" style={{ backgroundColor: themeObj.primary }}>SHARE THE LOVE</button>
                </div>
             </div>
          </div>
        )}

        {!isGameActive && (
          <div className="fixed inset-0 bg-[#020205] flex items-center justify-center p-4 z-[400] crt overflow-y-auto">
            <div className="max-w-4xl w-full bg-[#0a0a1f] border-4 rounded-[40px] sm:rounded-[80px] p-10 sm:p-24 text-center shadow-2xl relative z-10 animate-scale-up arcade-cabinet-frame my-auto" style={{ borderColor: themeObj.primary }}>
               <BrainCircuit className="w-20 h-20 sm:w-56 mx-auto animate-pulse mb-10 sm:mb-12" style={{ color: themeObj.primary, filter: `drop-shadow(0 0 50px ${themeObj.primary})` }} />
               <h1 className="text-3xl sm:text-8xl md:text-9xl font-black text-white italic mb-6 tracking-tighter uppercase neon-text leading-none" style={{ textShadow: themeObj.shadow }}>SID THE BRAIN</h1>
               <p className="text-white/40 font-arcade text-[8px] sm:text-[12px] mb-12 sm:mb-14 uppercase tracking-[0.2em] animate-pulse">Syncing with the Elite Sid-Cortex...</p>
               <div className="space-y-6 max-w-lg mx-auto">
                 <input 
                   type="text" 
                   placeholder="OPERATOR NAME" 
                   value={playerName} 
                   onChange={e => setPlayerName(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && playerName.trim() && handleEstablishConnection()}
                   className="w-full bg-black border-4 border-white/10 rounded-2xl p-6 text-white text-center focus:border-white outline-none uppercase font-arcade text-xs sm:text-xl transition-all"
                   style={{ borderColor: themeObj.primary + '22' }}
                 />
                 <button 
                   onClick={handleEstablishConnection} 
                   disabled={!playerName.trim()}
                   className="w-full text-black font-arcade uppercase py-8 sm:py-10 rounded-full hover:scale-105 active:scale-95 disabled:opacity-30 transition-all text-xs sm:text-2xl shadow-glow tracking-widest"
                   style={{ backgroundColor: themeObj.primary }}
                 >
                   SYNC NOW
                 </button>
               </div>
            </div>
          </div>
        )}

        {(isAiThinking || isGeneratingImage) && (
          <div className="fixed inset-0 z-[600] bg-black/90 flex flex-col items-center justify-center gap-10 backdrop-blur-md animate-fade-in crt">
            <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                <Cpu className="w-20 h-20 sm:w-24 sm:h-24 text-cyan-400 animate-spin-slow relative z-10" />
            </div>
            <div className="text-xs sm:text-3xl font-arcade text-cyan-400 animate-pulse uppercase tracking-[0.4em] text-center px-6">
              {isGeneratingImage ? "Visualizing Team Legacy..." : "Querying Sid-Sight..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiSlingshot;
