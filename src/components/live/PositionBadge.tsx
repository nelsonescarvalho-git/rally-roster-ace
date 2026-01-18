import { cn } from '@/lib/utils';

interface PositionBadgeProps {
  position: string | null | undefined;
  className?: string;
}

// Position display config with colors and labels
const POSITION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  // Libero
  'L': { label: 'L', bg: 'bg-amber-500', text: 'text-amber-950' },
  'LIBERO': { label: 'L', bg: 'bg-amber-500', text: 'text-amber-950' },
  
  // Setter
  'S': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  'SET': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  'SETTER': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  'P': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  'PASSADOR': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  'DISTRIBUIDOR': { label: 'S', bg: 'bg-blue-500', text: 'text-blue-50' },
  
  // Outside Hitter
  'OH': { label: 'OH', bg: 'bg-green-600', text: 'text-green-50' },
  'Z4': { label: 'OH', bg: 'bg-green-600', text: 'text-green-50' },
  'OUTSIDE': { label: 'OH', bg: 'bg-green-600', text: 'text-green-50' },
  'PONTA': { label: 'OH', bg: 'bg-green-600', text: 'text-green-50' },
  
  // Opposite
  'OP': { label: 'OP', bg: 'bg-red-500', text: 'text-red-50' },
  'OPP': { label: 'OP', bg: 'bg-red-500', text: 'text-red-50' },
  'OPPOSITE': { label: 'OP', bg: 'bg-red-500', text: 'text-red-50' },
  'OPOSTO': { label: 'OP', bg: 'bg-red-500', text: 'text-red-50' },
  
  // Middle Blocker
  'MB': { label: 'MB', bg: 'bg-purple-600', text: 'text-purple-50' },
  'M': { label: 'MB', bg: 'bg-purple-600', text: 'text-purple-50' },
  'MIDDLE': { label: 'MB', bg: 'bg-purple-600', text: 'text-purple-50' },
  'CENTRAL': { label: 'MB', bg: 'bg-purple-600', text: 'text-purple-50' },
  'C': { label: 'MB', bg: 'bg-purple-600', text: 'text-purple-50' },
};

export function getPositionConfig(position: string | null | undefined): { label: string; bg: string; text: string } | null {
  if (!position) return null;
  const normalized = position.trim().toUpperCase();
  return POSITION_CONFIG[normalized] || null;
}

export function PositionBadge({ position, className }: PositionBadgeProps) {
  const config = getPositionConfig(position);
  
  if (!config) return null;
  
  return (
    <span className={cn(
      'text-xs font-bold px-1.5 py-0.5 rounded',
      config.bg,
      config.text,
      className
    )}>
      {config.label}
    </span>
  );
}
