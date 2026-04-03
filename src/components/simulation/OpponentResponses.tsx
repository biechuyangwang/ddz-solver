import type { SimulationStep } from '../../lib/simulation-path';
import { cn } from '../../lib/cn';
import { formatMoveLabel } from '../../lib/card-utils';

interface OpponentResponsesProps {
  steps: SimulationStep[];
  currentStepIndex: number;
  onReroute: (stepIndex: number, siblingIndex: number) => void;
}

/**
 * Find all opponent response groups. When the current step is an opponent move,
 * group consecutive opponent steps that share the same parent (siblings).
 */
export function OpponentResponses({ steps, currentStepIndex, onReroute }: OpponentResponsesProps) {
  const currentStep = steps[currentStepIndex];
  if (!currentStep || !currentStep.isPlayerMove) {
    // Only show responses after a player move (opponent is responding)
    return null;
  }

  // Look ahead: the next steps should be opponent responses
  // Find the group of opponent steps that follow this player step
  const responseStart = currentStepIndex + 1;
  if (responseStart >= steps.length) return null;

  const responses: { step: SimulationStep; index: number }[] = [];
  for (let i = responseStart; i < steps.length; i++) {
    if (!steps[i].isPlayerMove) {
      responses.push({ step: steps[i], index: i });
    } else {
      break; // End of opponent response group
    }
  }

  if (responses.length === 0) return null;

  return (
    <div className="mt-4">
      <span className="text-xs font-semibold text-gray-500 block mb-2">对手可能应对</span>
      <div className="flex flex-wrap gap-2" role="listbox" aria-label="对手可能应对">
        {responses.map(({ step, index }) => {
          const isWinning = step.result === 'win';
          const isCurrent = index === responseStart; // First response is the default path
          return (
            <button
              key={index}
              role="option"
              aria-selected={isCurrent}
              onClick={() => onReroute(index, step.siblingIndex)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                isWinning
                  ? 'text-accent-green font-semibold border-green-300 bg-green-50 hover:bg-green-100'
                  : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50',
                isCurrent && 'ring-2 ring-blue-300',
              )}
            >
              {formatMoveLabel(step.move)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
