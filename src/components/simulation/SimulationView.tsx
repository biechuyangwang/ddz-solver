import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { extractSimulationSteps, rerouteSimulationPath, type SimulationStep } from '../../lib/simulation-path';
import { reconstructState } from '../../lib/tree-state';
import { StepDisplay } from './StepDisplay';
import { SimulationControls } from './SimulationControls';
import { OpponentResponses } from './OpponentResponses';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function SimulationView() {
  const result = useGameStore((s) => s.result);
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const autoPlaying = useGameStore((s) => s.autoPlaying);
  const autoPlaySpeed = useGameStore((s) => s.autoPlaySpeed);
  const setStepIndex = useGameStore((s) => s.setStepIndex);
  const nextStep = useGameStore((s) => s.nextStep);
  const prevStep = useGameStore((s) => s.prevStep);
  const startAutoPlay = useGameStore((s) => s.startAutoPlay);
  const stopAutoPlay = useGameStore((s) => s.stopAutoPlay);
  const setAutoPlaySpeed = useGameStore((s) => s.setAutoPlaySpeed);

  const tree = result?.tree;

  // Track direction for animation
  const [direction, setDirection] = useState(0);

  // Compute simulation steps
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  useMemo(() => {
    if (tree) {
      const newSteps = extractSimulationSteps(tree);
      setSteps(newSteps);
      setStepIndex(0);
    }
  }, [tree]);

  // Auto-play interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (autoPlaying && steps.length > 0) {
      intervalRef.current = setInterval(() => {
        const store = useGameStore.getState();
        if (store.currentStepIndex >= steps.length - 1) {
          stopAutoPlay();
          return;
        }
        setDirection(1);
        nextStep(steps.length);
      }, autoPlaySpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlaying, autoPlaySpeed, steps.length, nextStep, stopAutoPlay]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    prevStep();
  }, [prevStep]);

  const handleNext = useCallback(() => {
    setDirection(1);
    nextStep(steps.length);
  }, [nextStep, steps.length]);

  const handleToggleAutoPlay = useCallback(() => {
    if (autoPlaying) {
      stopAutoPlay();
    } else {
      if (currentStepIndex >= steps.length - 1) {
        setStepIndex(0); // Restart from beginning
      }
      startAutoPlay();
    }
  }, [autoPlaying, currentStepIndex, steps.length, startAutoPlay, stopAutoPlay, setStepIndex]);

  const handleJump = useCallback((step: number) => {
    setDirection(step > currentStepIndex ? 1 : -1);
    setStepIndex(step);
  }, [currentStepIndex, setStepIndex]);

  const handleReroute = useCallback((stepIndex: number, siblingIndex: number) => {
    if (!tree) return;
    const newSteps = rerouteSimulationPath(tree, steps, stepIndex, siblingIndex);
    setSteps(newSteps);
    // Jump to the rerouted step
    setDirection(1);
    setStepIndex(stepIndex);
  }, [tree, steps, setStepIndex]);

  // Empty state
  if (!tree) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-2">求解完成后可逐步模拟</p>
        <p className="text-sm">请先输入手牌并点击"求解"，模拟仅支持必胜局面</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">无法提取模拟路径</p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  if (!currentStep) {
    setStepIndex(0);
    return null;
  }

  // Reconstruct game state at current step
  const gameState = reconstructState(
    playerCards,
    opponentCards,
    tree,
    currentStep.pathIndices,
  );

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Step display with animation */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentStepIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <StepDisplay step={currentStep} gameState={gameState} />
        </motion.div>
      </AnimatePresence>

      {/* Opponent responses (only after player moves) */}
      <OpponentResponses
        steps={steps}
        currentStepIndex={currentStepIndex}
        onReroute={handleReroute}
      />

      {/* Navigation controls */}
      <SimulationControls
        currentStep={currentStepIndex}
        totalSteps={steps.length}
        autoPlaying={autoPlaying}
        speed={autoPlaySpeed}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleAutoPlay={handleToggleAutoPlay}
        onSpeedChange={setAutoPlaySpeed}
        onJump={handleJump}
      />
    </div>
  );
}
