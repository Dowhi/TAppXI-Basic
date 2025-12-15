import { useEffect } from 'react';
import { Seccion } from '../types';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const ctrlMatch = shortcut.ctrlKey !== undefined 
          ? (shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey)
          : true;
        const metaMatch = shortcut.metaKey !== undefined
          ? (shortcut.metaKey ? e.metaKey : !e.metaKey)
          : true;
        const shiftMatch = shortcut.shiftKey === undefined 
          ? true 
          : shortcut.shiftKey === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // Para atajos con Ctrl o Meta, ambos deben estar presentes
        const modifierMatch = (shortcut.ctrlKey || shortcut.metaKey)
          ? (e.ctrlKey || e.metaKey)
          : (!e.ctrlKey && !e.metaKey);

        if (ctrlMatch && metaMatch && shiftMatch && keyMatch && modifierMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}





