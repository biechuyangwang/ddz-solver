import { cn } from '../../lib/cn';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface SimulationControlsProps {
  currentStep: number;
  totalSteps: number;
  autoPlaying: boolean;
  speed: number; // ms: 3000, 1500, 750
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoPlay: () => void;
  onSpeedChange: (ms: number) => void;
  onJump: (step: number) => void;
}

const SPEED_OPTIONS = [
  { label: '0.5x', ms: 3000 },
  { label: '1x', ms: 1500 },
  { label: '2x', ms: 750 },
];

export function SimulationControls({
  currentStep,
  totalSteps,
  autoPlaying,
  speed,
  onPrev,
  onNext,
  onToggleAutoPlay,
  onSpeedChange,
  onJump,
}: SimulationControlsProps) {
  const isAtStart = currentStep === 0;
  const isAtEnd = currentStep >= totalSteps - 1;

  return (
    <div className="space-y-3 mt-6">
      {/* Step counter */}
      <div className="text-center">
        <span className="text-sm text-gray-500">
          第 {currentStep + 1} / {totalSteps} 步
        </span>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          disabled={isAtStart}
          aria-label="上一步"
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isAtStart
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <ChevronLeft size={16} />
          上一步
        </button>

        <button
          onClick={onToggleAutoPlay}
          aria-label={autoPlaying ? '暂停' : '自动播放'}
          className={cn(
            'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            autoPlaying
              ? 'bg-blue-100 text-tab-active'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
        >
          {autoPlaying ? <Pause size={16} /> : <Play size={16} />}
          {autoPlaying ? '暂停' : '自动播放'}
        </button>

        <button
          onClick={onNext}
          disabled={isAtEnd}
          aria-label="下一步"
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isAtEnd
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          下一步
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Step slider */}
      {totalSteps > 1 && (
        <div className="flex items-center justify-center px-4">
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => onJump(Number(e.target.value))}
            className="w-full max-w-[300px] accent-tab-active"
            aria-label="步骤跳转"
          />
        </div>
      )}

      {/* Speed selector */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-gray-500">速度:</span>
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.ms}
            onClick={() => onSpeedChange(opt.ms)}
            aria-pressed={speed === opt.ms}
            className={cn(
              'text-xs px-2 py-1 rounded transition-colors',
              speed === opt.ms
                ? 'text-tab-active font-semibold underline underline-offset-2'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
