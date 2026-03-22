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

    // Ensure team colors are visible on both light and dark themes
    const ensureVisible = (colors: Partial<TeamColors> | undefined, defaults: TeamColors): TeamColors => {
      let primary = colors?.primary || defaults.primary;
      let secondary = colors?.secondary || defaults.secondary;
      
      const primLum = getRelativeLuminance(primary);
      const secLum = getRelativeLuminance(secondary);
      
      // Check which colors are in a usable range (not too dark, not too light)
      const isUsable = (lum: number) => lum >= 0.08 && lum <= 0.85;
      
      if (!isUsable(primLum) && isUsable(secLum)) {
        // Primary is extreme, secondary is usable — swap
        [primary, secondary] = [secondary, primary];
      } else if (!isUsable(primLum) && !isUsable(secLum)) {
        // Both are extreme — fall back to defaults
        primary = defaults.primary;
        secondary = defaults.secondary;
      }
      
      return { primary, secondary };
    };

    // Home team colors
    const home = ensureVisible(homeColors, HOME_DEFAULT);
    const homePrimary = home.primary;
    const homeSecondary = home.secondary;
    
    // Away team colors
    const away = ensureVisible(awayColors, AWAY_DEFAULT);
    const awayPrimary = away.primary;
    const awaySecondary = away.secondary;

    // Set CSS custom properties with HEX values
    root.style.setProperty('--team-home-primary', homePrimary);
    root.style.setProperty('--team-home-secondary', homeSecondary);
    root.style.setProperty('--team-away-primary', awayPrimary);
    root.style.setProperty('--team-away-secondary', awaySecondary);

    // ALSO set HSL versions for Tailwind compatibility (--home, --away)
    root.style.setProperty('--home', hexToHsl(homePrimary));
    root.style.setProperty('--away', hexToHsl(awayPrimary));
    root.style.setProperty('--home-secondary', hexToHsl(homeSecondary));
    root.style.setProperty('--away-secondary', hexToHsl(awaySecondary));

    // Dynamic foreground colors for contrast
    root.style.setProperty('--home-foreground', getContrastForeground(homePrimary));
    root.style.setProperty('--away-foreground', getContrastForeground(awayPrimary));

    // Cleanup
    return () => {
      root.style.removeProperty('--team-home-primary');
      root.style.removeProperty('--team-home-secondary');
      root.style.removeProperty('--team-away-primary');
      root.style.removeProperty('--team-away-secondary');
      root.style.removeProperty('--home');
      root.style.removeProperty('--away');
      root.style.removeProperty('--home-secondary');
      root.style.removeProperty('--away-secondary');
      root.style.removeProperty('--home-foreground');
      root.style.removeProperty('--away-foreground');
    };
  }, [homeColors, awayColors]);

  // Return the visibility-adjusted colors (computed inside useEffect, recompute here for return)
  const ensureVisibleReturn = (colors: Partial<TeamColors> | undefined, defaults: TeamColors): TeamColors => {
    let primary = colors?.primary || defaults.primary;
    let secondary = colors?.secondary || defaults.secondary;
    const primLum = getRelativeLuminance(primary);
    const secLum = getRelativeLuminance(secondary);
    const isUsable = (lum: number) => lum >= 0.08 && lum <= 0.85;
    if (!isUsable(primLum) && isUsable(secLum)) {
      [primary, secondary] = [secondary, primary];
    } else if (!isUsable(primLum) && !isUsable(secLum)) {
      primary = defaults.primary;
      secondary = defaults.secondary;
    }
    return { primary, secondary };
  };

  return {
    home: ensureVisibleReturn(homeColors, HOME_DEFAULT),
    away: ensureVisibleReturn(awayColors, AWAY_DEFAULT),
  };
}

// Helper: get relative luminance from hex
function getRelativeLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Helper: calculate contrast foreground for a given hex background
export function getContrastForeground(hex: string): string {
  const r = parseInt(hex.replace('#', '').substring(0, 2), 16) / 255;
  const g = parseInt(hex.replace('#', '').substring(2, 4), 16) / 255;
  const b = parseInt(hex.replace('#', '').substring(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.55 ? '220 30% 10%' : '0 0% 100%';
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
