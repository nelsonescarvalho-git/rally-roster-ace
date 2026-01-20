import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  enabled: boolean;
  onQualitySelect?: (code: number) => void;
  onUndo?: () => void;
  onCancel?: () => void;
  onPlayerNav?: (direction: -1 | 1) => void;
  onDestinationSelect?: (dest: string) => void;
  onConfirm?: () => void;
}

export function useKeyboardShortcuts({
  enabled,
  onQualitySelect,
  onUndo,
  onCancel,
  onPlayerNav,
  onDestinationSelect,
  onConfirm,
}: ShortcutConfig) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();

    // Quality codes 0-3
    if (['0', '1', '2', '3'].includes(key) && onQualitySelect) {
      e.preventDefault();
      onQualitySelect(parseInt(key, 10));
      return;
    }

    // Undo
    if (key === 'u' && onUndo) {
      e.preventDefault();
      onUndo();
      return;
    }

    // Cancel/Escape
    if (key === 'escape' && onCancel) {
      e.preventDefault();
      onCancel();
      return;
    }

    // Player navigation
    if ((key === 'arrowleft' || key === 'arrowright') && onPlayerNav) {
      e.preventDefault();
      onPlayerNav(key === 'arrowleft' ? -1 : 1);
      return;
    }

    // Confirm
    if (key === 'enter' && onConfirm) {
      e.preventDefault();
      onConfirm();
      return;
    }

    // Distribution destination shortcuts
    if (onDestinationSelect) {
      const destMap: Record<string, string> = {
        '2': 'P2',
        '3': 'P3',
        '4': 'P4',
        'o': 'OP',
        'i': 'PIPE',
        'b': 'BACK',
        'x': 'OUTROS',
      };
      
      if (destMap[key]) {
        e.preventDefault();
        onDestinationSelect(destMap[key]);
        return;
      }
    }
  }, [enabled, onQualitySelect, onUndo, onCancel, onPlayerNav, onDestinationSelect, onConfirm]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}
