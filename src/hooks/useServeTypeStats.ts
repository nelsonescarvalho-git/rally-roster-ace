import { useMemo } from 'react';
import { Rally, ServeType, SERVE_TYPE_LABELS, Side } from '@/types/volleyball';

export interface ServeTypeStats {
  type: ServeType;
  label: string;
  emoji: string;
  total: number;
  aces: number;
  errors: number;
  neutral: number;
  aceRate: number;       // aces / total
  errorRate: number;     // errors / total
  efficiency: number;    // (aces - errors) / total
}

export interface ServeTypeStatsBySide {
  home: ServeTypeStats[];
  away: ServeTypeStats[];
}

export function useServeTypeStats(rallies: Rally[]) {
  return useMemo(() => {
    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    const serveTypes: ServeType[] = ['FLOAT', 'JUMP_FLOAT', 'POWER', 'OTHER'];
    
    const calculateForSide = (side: Side): ServeTypeStats[] => {
      return serveTypes.map(type => {
        const relevantRallies = Object.values(finalPhases).filter(
          r => r.serve_side === side && r.s_type === type && r.s_code !== null
        );
        
        const total = relevantRallies.length;
        const aces = relevantRallies.filter(r => r.s_code === 3).length;
        const errors = relevantRallies.filter(r => r.s_code === 0).length;
        const neutral = total - aces - errors;
        
        const typeInfo = SERVE_TYPE_LABELS[type];
        
        return {
          type,
          label: typeInfo.label,
          emoji: typeInfo.emoji,
          total,
          aces,
          errors,
          neutral,
          aceRate: total > 0 ? aces / total : 0,
          errorRate: total > 0 ? errors / total : 0,
          efficiency: total > 0 ? (aces - errors) / total : 0,
        };
      }).filter(s => s.total > 0); // Only show types that were used
    };

    // Also calculate "no type" for legacy data
    const calculateNoType = (side: Side): ServeTypeStats | null => {
      const relevantRallies = Object.values(finalPhases).filter(
        r => r.serve_side === side && !r.s_type && r.s_code !== null
      );
      
      if (relevantRallies.length === 0) return null;
      
      const total = relevantRallies.length;
      const aces = relevantRallies.filter(r => r.s_code === 3).length;
      const errors = relevantRallies.filter(r => r.s_code === 0).length;
      const neutral = total - aces - errors;
      
      return {
        type: 'OTHER' as ServeType,
        label: 'Sem tipo',
        emoji: '❓',
        total,
        aces,
        errors,
        neutral,
        aceRate: total > 0 ? aces / total : 0,
        errorRate: total > 0 ? errors / total : 0,
        efficiency: total > 0 ? (aces - errors) / total : 0,
      };
    };

    const homeStats = calculateForSide('CASA');
    const awayStats = calculateForSide('FORA');
    
    // Add no-type stats if they exist
    const homeNoType = calculateNoType('CASA');
    const awayNoType = calculateNoType('FORA');
    
    if (homeNoType) homeStats.push(homeNoType);
    if (awayNoType) awayStats.push(awayNoType);

    return {
      home: homeStats,
      away: awayStats,
    };
  }, [rallies]);
}
