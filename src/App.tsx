import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Minus, Settings2, ChevronDown, Check, X } from 'lucide-react';

type ThemeKey = 'emerald' | 'pastel' | 'wood';

const THEMES = {
  emerald: {
    name: 'Emerald',
    bead: 'from-emerald-400 via-emerald-700 to-emerald-950',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-400',
    lightBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    borderSubtle: 'border-emerald-500/20',
  },
  pastel: {
    name: 'Pastel',
    bead: 'from-rose-300 via-rose-400 to-rose-600',
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    bgHover: 'hover:bg-rose-400',
    lightBg: 'bg-rose-500/10',
    border: 'border-rose-500/50',
    borderSubtle: 'border-rose-500/20',
  },
  wood: {
    name: 'Wood',
    bead: 'from-amber-600 via-amber-800 to-amber-950',
    text: 'text-amber-500',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    lightBg: 'bg-amber-500/10',
    border: 'border-amber-500/50',
    borderSubtle: 'border-amber-500/20',
  }
};

// Helper to safely parse local storage
const loadState = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('tasbih-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.theme) parsed.theme = 'emerald';
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }
  return { count: 0, target: 33, currentLap: 1, totalLaps: 1, theme: 'emerald' as ThemeKey };
};

export default function App() {
  const [state, setState] = useState(loadState);
  const [direction, setDirection] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const { count, target, currentLap, totalLaps, theme } = state;
  const currentTheme = THEMES[theme as ThemeKey] || THEMES.emerald;
  
  // -1 represents Infinity (Infinite Laps) to be JSON serializable
  const isInfinite = totalLaps === -1;
  const isCompleted = count === target && currentLap === totalLaps && !isInfinite;

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState((prev: typeof state) => ({ ...prev, ...updates }));
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    localStorage.setItem('tasbih-state', JSON.stringify(state));
  }, [state]);

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch (e) {
        // Ignore haptic errors
      }
    }
  }, []);

  const handleIncrease = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    if (isCompleted) return;

    setDirection(1);

    if (count === target) {
      // We are at target, but not completed (so currentLap < totalLaps OR totalLaps === -1)
      updateState({ count: 1, currentLap: currentLap + 1 });
      triggerHaptic(40);
    } else {
      const next = count + 1;
      updateState({ count: next });
      
      if (next === target) {
        if (currentLap === totalLaps && !isInfinite) {
          triggerHaptic([100, 200, 100, 200, 100]); // Final complete
        } else {
          triggerHaptic([50, 100, 50]); // Lap complete
        }
      } else {
        triggerHaptic(40);
      }
    }
  }, [count, target, currentLap, totalLaps, isCompleted, isInfinite, updateState, triggerHaptic]);

  const handleDecrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) return;

    if (count > 0) {
      setDirection(-1);
      updateState({ count: count - 1 });
      triggerHaptic(30);
    }
  }, [count, isCompleted, updateState, triggerHaptic]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    updateState({ count: 0, currentLap: 1 });
    triggerHaptic([30, 50, 30]);
  }, [updateState, triggerHaptic]);

  // Keyboard support for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || isCompleted) return;
      
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleIncrease(e);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (count > 0) {
          setDirection(-1);
          updateState({ count: count - 1 });
          triggerHaptic(30);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleIncrease, count, showSettings, isCompleted, updateState, triggerHaptic]);

  return (
    <div 
      className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden select-none touch-manipulation"
      onClick={handleIncrease}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 z-20">
        <div className="text-zinc-500 font-medium tracking-widest uppercase text-sm">
          Tasbih
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
          className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800 px-4 py-2 rounded-full transition-colors border border-zinc-800"
        >
          <Settings2 size={16} className={currentTheme.text} />
          <span className="text-sm font-medium">
            {target} / {isInfinite ? '∞' : `${totalLaps} Laps`}
          </span>
        </button>
      </div>

      {/* Main Interactive Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center">
        
        {/* Decrease Tap Area (Top portion) */}
        <div 
          className="absolute top-0 left-0 right-0 h-1/3 z-20 flex items-start justify-center pt-8 cursor-pointer group"
          onClick={handleDecrease}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-zinc-500 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-zinc-800">
            <Minus size={14} />
            <span className="text-xs uppercase tracking-widest font-medium">Tap to decrease</span>
          </div>
        </div>

        {/* The String */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 -translate-x-1/2 shadow-[0_0_15px_rgba(0,0,0,0.8)] z-0 pointer-events-none" />

        {/* The Beads */}
        <div className="relative w-full h-[400px] flex items-center justify-center perspective-[1000px] z-10 pointer-events-none">
          <AnimatePresence custom={direction}>
            {[count - 1, count, count + 1].map((i) => {
              const isTop = i === count + 1;
              const isMiddle = i === count;
              const isBottom = i === count - 1;

              let y = 16;
              let scale = 1;
              let opacity = 1;
              let zIndex = 10;
              let rotateX = 0;

              if (isTop) {
                y = -144; // Gap of 32px
                scale = 0.85;
                opacity = 0.9;
                zIndex = 5;
                rotateX = -15;
              } else if (isMiddle) {
                y = 16;
                scale = 1;
                opacity = 1;
                zIndex = 10;
                rotateX = 0;
              } else if (isBottom) {
                y = 144; // Touching middle bead (128px height)
                scale = 0.95;
                opacity = 0.9;
                zIndex = 8;
                rotateX = 15;
              }

              return (
                <motion.div
                  key={i}
                  custom={direction}
                  initial={(dir: number) => ({
                    y: dir > 0 ? -300 : 300,
                    scale: 0.5,
                    opacity: 0,
                    rotateX: dir > 0 ? -30 : 30,
                  })}
                  animate={{
                    y,
                    scale,
                    opacity,
                    zIndex,
                    rotateX,
                  }}
                  exit={(dir: number) => ({
                    y: dir > 0 ? 300 : -300,
                    scale: 0.5,
                    opacity: 0,
                    zIndex: 0,
                    rotateX: dir > 0 ? 30 : -30,
                  })}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                    mass: 1,
                  }}
                  className="absolute"
                >
                  {/* Bead Design */}
                  <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${currentTheme.bead} shadow-[inset_-8px_-8px_20px_rgba(0,0,0,0.8),inset_8px_8px_20px_rgba(255,255,255,0.4),0_15px_30px_rgba(0,0,0,0.9)] flex items-center justify-center`}>
                    {/* Highlight */}
                    <div className="absolute top-3 left-5 w-10 h-6 bg-white/20 rounded-full blur-[3px] rotate-[-30deg]" />
                    
                    {/* String hole top */}
                    <div className="absolute -top-1 w-6 h-3 bg-black/90 rounded-[100%] blur-[1px] shadow-[inset_0_2px_4px_rgba(0,0,0,1)]" />
                    {/* String hole bottom */}
                    <div className="absolute -bottom-1 w-6 h-3 bg-black/90 rounded-[100%] blur-[1px] shadow-[inset_0_-2px_4px_rgba(0,0,0,1)]" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Instruction / Hint */}
        <div className="absolute bottom-10 flex flex-col items-center text-zinc-700 pointer-events-none z-20">
          <span className="text-xs uppercase tracking-widest font-medium">Tap anywhere to count</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-8 pb-12 z-20 flex flex-col items-center bg-gradient-to-t from-black via-black to-transparent">
        
        {/* Counter Display */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-8xl font-light tracking-tighter tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            {count}
          </motion.div>
          <div className="text-zinc-500 tracking-widest uppercase text-sm mt-3 font-medium flex items-center gap-2">
            <span>Target: {target}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className={count === target ? currentTheme.text : ''}>
              {isInfinite ? `Lap ${currentLap}` : `Lap ${currentLap} of ${totalLaps}`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-4">
          <button
            onClick={handleDecrease}
            className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
            aria-label="Decrease count"
          >
            <Minus size={20} />
            <span className="font-medium text-sm uppercase tracking-wider">Decrease</span>
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
            aria-label="Reset count"
          >
            <RotateCcw size={20} />
            <span className="font-medium text-sm uppercase tracking-wider">Reset</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => { e.stopPropagation(); setShowSettings(false); }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-white">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-3 block font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(THEMES) as ThemeKey[]).map(tKey => (
                    <button 
                      key={tKey}
                      onClick={() => updateState({ theme: tKey })}
                      className={`py-3 rounded-xl border font-medium transition-colors ${theme === tKey ? `${currentTheme.lightBg} ${currentTheme.border} ${currentTheme.text}` : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {THEMES[tKey].name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-3 block font-medium">Beads per Lap</label>
                <div className="flex gap-3">
                  {[33, 100].map(t => (
                    <button 
                      key={t}
                      onClick={() => updateState({ target: t, count: 0, currentLap: 1 })}
                      className={`flex-1 py-3 rounded-xl border font-medium transition-colors ${target === t ? `${currentTheme.lightBg} ${currentTheme.border} ${currentTheme.text}` : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-3 block font-medium">Number of Laps</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 7, '∞'].map(l => {
                    const val = l === '∞' ? -1 : l;
                    return (
                      <button 
                        key={l}
                        onClick={() => updateState({ totalLaps: val, count: 0, currentLap: 1 })}
                        className={`py-3 rounded-xl border font-medium transition-colors ${totalLaps === val ? `${currentTheme.lightBg} ${currentTheme.border} ${currentTheme.text}` : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
            >
              <div className={`w-20 h-20 ${currentTheme.lightBg} rounded-full flex items-center justify-center mx-auto mb-6 border ${currentTheme.borderSubtle}`}>
                <Check size={40} className={currentTheme.text} />
              </div>
              <h2 className="text-2xl font-medium text-white mb-2">Tasbih Complete</h2>
              <p className="text-zinc-400 mb-8">
                You have completed {totalLaps} {totalLaps === 1 ? 'lap' : 'laps'} of {target} beads.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateState({ count: 0, currentLap: 1 });
                  }}
                  className={`w-full py-4 ${currentTheme.bg} text-black rounded-xl font-medium ${currentTheme.bgHover} transition-colors`}
                >
                  Restart
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateState({ totalLaps: -1 }); // Set to infinite
                  }}
                  className="w-full py-4 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                >
                  Continue (Infinite)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
