import { useEffect } from 'react';

interface TeamColors {
  primary: string;
  secondary: string;
}

// Default fallback colors
const HOME_DEFAULT: TeamColors = {
  primary: '#3B82F6', // blue-500
  secondary: '#1E40AF', // blue-800
};

const AWAY_DEFAULT: TeamColors = {
  primary: '#EF4444', // red-500
  secondary: '#991B1B', // red-800
};

interface UseTeamColorsProps {
  homeColors?: Partial<TeamColors>;
  awayColors?: Partial<TeamColors>;
}

export function useTeamColors({ homeColors, awayColors }: UseTeamColorsProps = {}) {
  useEffect(() => {
    const root = document.documentElement;

    // Home team colors
    const homePrimary = homeColors?.primary || HOME_DEFAULT.primary;
    const homeSecondary = homeColors?.secondary || HOME_DEFAULT.secondary;
    
    // Away team colors
    const awayPrimary = awayColors?.primary || AWAY_DEFAULT.primary;
    const awaySecondary = awayColors?.secondary || AWAY_DEFAULT.secondary;

    // Set CSS custom properties
    root.style.setProperty('--team-home-primary', homePrimary);
    root.style.setProperty('--team-home-secondary', homeSecondary);
    root.style.setProperty('--team-away-primary', awayPrimary);
    root.style.setProperty('--team-away-secondary', awaySecondary);

    // Cleanup
    return () => {
      root.style.removeProperty('--team-home-primary');
      root.style.removeProperty('--team-home-secondary');
      root.style.removeProperty('--team-away-primary');
      root.style.removeProperty('--team-away-secondary');
    };
  }, [homeColors, awayColors]);

  return {
    home: {
      primary: homeColors?.primary || HOME_DEFAULT.primary,
      secondary: homeColors?.secondary || HOME_DEFAULT.secondary,
    },
    away: {
      primary: awayColors?.primary || AWAY_DEFAULT.primary,
      secondary: awayColors?.secondary || AWAY_DEFAULT.secondary,
    },
  };
}

// Helper to convert HEX to HSL for Tailwind compatibility
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
