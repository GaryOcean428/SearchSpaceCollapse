import { Sword } from "lucide-react";

interface EmptyDebatesStateProps {
  variant?: 'full' | 'compact';
}

export function EmptyDebatesState({ variant = 'full' }: EmptyDebatesStateProps) {
  if (variant === 'compact') {
    return (
      <p className="text-muted-foreground text-center py-4 text-sm" data-testid="text-no-debates">
        No active debates
      </p>
    );
  }

  return (
    <div className="text-center text-muted-foreground py-8" data-testid="text-no-debates">
      <Sword className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">No active debates</p>
      <p className="text-xs">Debates emerge when gods disagree on assessments</p>
    </div>
  );
}
