import { DegradationStage, STAGE_LABELS } from '@/types/archive';
import { cn } from '@/lib/utils';

interface StageBadgeProps {
  stage: DegradationStage;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StageBadge({ stage, size = 'md', showLabel = true }: StageBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-mono font-medium',
        sizeClasses[size],
        stage === 'FULL' && 'stage-full border',
        stage === 'COMPRESSED' && 'stage-compressed border',
        stage === 'SUMMARIZED' && 'stage-summarized border',
        stage === 'MINIMAL' && 'stage-minimal border',
        stage === 'DELETED' && 'stage-deleted border'
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        stage === 'FULL' && 'bg-stage-full',
        stage === 'COMPRESSED' && 'bg-stage-compressed',
        stage === 'SUMMARIZED' && 'bg-stage-summarized',
        stage === 'MINIMAL' && 'bg-stage-minimal',
        stage === 'DELETED' && 'bg-stage-deleted'
      )} />
      {showLabel && STAGE_LABELS[stage]}
    </span>
  );
}
