import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { buildStep, pickWinningIndex, collectMovesFromSteps, type SimulationStep } from '../../lib/simulation-path';
import { reconstructStateFromSteps } from '../../lib/tree-state';
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
  const tree = useGameStore((s) => s.tree);
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const result = useGameStore((s) => s.result);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const autoPlaying = useGameStore((s) => s.autoPlaying);
  const autoPlaySpeed = useGameStore((s) => s.autoPlaySpeed);
  const setStepIndex = useGameStore((s) => s.setStepIndex);
  const nextStep = useGameStore((s) => s.nextStep);
  const prevStep = useGameStore((s) => s.prevStep);
  const startAutoPlay = useGameStore((s) => s.startAutoPlay);
  const stopAutoPlay = useGameStore((s) => s.stopAutoPlay);
  const setAutoPlaySpeed = useGameStore((s) => s.setAutoPlaySpeed);
  const callExpandNode = useGameStore((s) => s.callExpandNode);

  // Track direction for animation
  const [direction, setDirection] = useState(0);
  // Incrementally built simulation steps
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  // Loading state
  const [loading, setLoading] = useState(false);
  // Prevent duplicate fetches
  const buildingRef = useRef(false);

  // Fetch the next step(s) via the store's callExpandNode
  const fetchNextStep = useCallback(async (
    currentSteps: SimulationStep[],
  ): Promise<{ newSteps: SimulationStep[]; reachedEnd: boolean } | null> => {
    const pathMoves = collectMovesFromSteps(currentSteps);
    const expandResult = await callExpandNode(pathMoves);

    if (expandResult.children.length === 0) {
      return { newSteps: currentSteps, reachedEnd: true };
    }

    const newSteps = [...currentSteps];
    const isPlayerMove = expandResult.children[0].isPlayerMove;
    const pickIdx = isPlayerMove
      ? pickWinningIndex(expandResult.children)
      : 0;

    const parentPath = currentSteps.length > 0
      ? currentSteps[currentSteps.length - 1].pathIndices
      : [];

    newSteps.push(buildStep(expandResult.children, pickIdx, parentPath));

    // Check if next expand returns empty (game over)
    const nextPathMoves = collectMovesFromSteps(newSteps);
    const nextExpand = await callExpandNode(nextPathMoves);
    if (nextExpand.children.length === 0) {
      return { newSteps, reachedEnd: true };
    }

    return { newSteps, reachedEnd: false };
  }, [callExpandNode]);

  // Build initial steps when solve completes
  useEffect(() => {
    if (!tree || !result?.winnable) return;

    const buildInitial = async () => {
      if (buildingRef.current) return;
      buildingRef.current = true;
      setLoading(true);
      try {
        let currentSteps: SimulationStep[] = [];
        let reachedEnd = false;
        let maxFetch = 20;

        while (!reachedEnd && maxFetch-- > 0) {
          const nextResult = await fetchNextStep(currentSteps);
          if (!nextResult) break;
          currentSteps = nextResult.newSteps;
          reachedEnd = nextResult.reachedEnd;
        }

        setSteps(currentSteps);
        setStepIndex(0);
      } catch (err) {
        console.error('Failed to build simulation steps:', err);
      }
      setLoading(false);
      buildingRef.current = false;
    };

    buildInitial();
  }, [tree, result?.winnable, fetchNextStep, setStepIndex]);

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
        setStepIndex(0);
      }
      startAutoPlay();
    }
  }, [autoPlaying, currentStepIndex, steps.length, startAutoPlay, stopAutoPlay, setStepIndex]);

  const handleJump = useCallback((step: number) => {
    setDirection(step > currentStepIndex ? 1 : -1);
    setStepIndex(step);
  }, [currentStepIndex, setStepIndex]);

  const handleReroute = useCallback(async (stepIndex: number, siblingIndex: number) => {
    if (!result?.winnable) return;

    const kept = steps.slice(0, stepIndex);
    const rerouteStep = steps[stepIndex];
    const parentPath = rerouteStep.pathIndices.slice(0, -1);

    const newStep = buildStep(rerouteStep.siblings, siblingIndex, parentPath);
    const reroutedSteps = [...kept, newStep];

    setLoading(true);
    try {
      let currentSteps = reroutedSteps;
      let reachedEnd = false;
      let maxFetch = 20;

      // Check if game over after the rerouted step
      const nextPathMoves = collectMovesFromSteps(currentSteps);
      const nextExpand = await callExpandNode(nextPathMoves);
      if (nextExpand.children.length === 0) {
        reachedEnd = true;
      }

      while (!reachedEnd && maxFetch-- > 0) {
        const nextResult = await fetchNextStep(currentSteps);
        if (!nextResult) break;
        currentSteps = nextResult.newSteps;
        reachedEnd = nextResult.reachedEnd;
      }

      setSteps(currentSteps);
      setDirection(1);
      setStepIndex(stepIndex);
    } catch (err) {
      console.error('Failed to reroute:', err);
    }
    setLoading(false);
  }, [steps, result, callExpandNode, fetchNextStep, setStepIndex]);

  // Empty state
  if (!tree || !result?.winnable) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-2">求解完成后可逐步模拟</p>
        <p className="text-sm">请先输入手牌并点击"求解"，模拟仅支持必胜局面</p>
      </div>
    );
  }

  if (loading && steps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">正在构建模拟路径...</p>
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
  const gameState = reconstructStateFromSteps(
    playerCards,
    opponentCards,
    steps,
    currentStepIndex,
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

      {/* Opponent responses */}
      <OpponentResponses
        steps={steps}
        currentStepIndex={currentStepIndex}
        onReroute={handleReroute}
        loading={loading}
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
