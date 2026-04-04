import type { SimulationStep } from '../../lib/simulation-path';
import { cn } from '../../lib/cn';
import { formatMoveLabel } from '../../lib/card-utils';

interface OpponentResponsesProps {
  steps: SimulationStep[];
  currentStepIndex: number;
  onReroute: (stepIndex: number, siblingIndex: number) => void;
  loading?: boolean;
}

/**
 * Show alternative moves at the current step when there are multiple choices.
 * Works for both player and opponent steps.
 */
export function OpponentResponses({ steps, currentStepIndex, onReroute, loading }: OpponentResponsesProps) {
  const currentStep = steps[currentStepIndex];
  if (!currentStep) {
    return null;
  }

  const siblings = currentStep.siblings;
  if (!siblings || siblings.length <= 1) return null;

  const label = currentStep.isPlayerMove ? '我方可选方案' : '对手可能应对';

  return (
    <div className="mt-4">
      <span className="text-xs font-semibold text-gray-500 block mb-2">
        {label}
        {loading && <span className="ml-2 text-blue-400">切换中...</span>}
      </span>
      <div className="flex flex-wrap gap-2" role="listbox" aria-label={label}>
        {siblings.map((sibling, i) => {
          const isWinning = sibling.result === 'win';
          const isCurrent = i === currentStep.siblingIndex;
          return (
            <button
              key={i}
              role="option"
              aria-selected={isCurrent}
              disabled={loading}
              onClick={() => onReroute(currentStepIndex, i)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                isWinning
                  ? 'text-accent-green font-semibold border-green-300 bg-green-50 hover:bg-green-100'
                  : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50',
                isCurrent && 'ring-2 ring-blue-300',
                loading && 'opacity-50 cursor-wait',
              )}
            >
              {formatMoveLabel(sibling.move)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
