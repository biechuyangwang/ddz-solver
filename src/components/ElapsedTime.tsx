import { useEffect, useState } from 'react';
import { useGameStore } from '../store/game-store';

/**
 * Live elapsed time counter during solving.
 * Displays "已用时 X.Xs" format, updating every 100ms.
 * Only renders when status is 'solving' and solveStartTime is set.
 */
export function ElapsedTime() {
  const status = useGameStore((s) => s.status);
  const solveStartTime = useGameStore((s) => s.solveStartTime);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'solving' || solveStartTime === null) {
      return;
    }

    // Update immediately
    setElapsed((Date.now() - solveStartTime) / 1000);

    const interval = setInterval(() => {
      setElapsed((Date.now() - solveStartTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [status, solveStartTime]);

  if (status !== 'solving' || solveStartTime === null) {
    return null;
  }

  return (
    <span className="text-sm text-gray-500">
      已用时 {elapsed.toFixed(1)}s
    </span>
  );
}
