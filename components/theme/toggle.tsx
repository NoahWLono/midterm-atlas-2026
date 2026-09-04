'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.classList.contains('dark'));
    const timer = setTimeout(sync, 0);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const system = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('atlas-theme');
      } catch {
        /* System preference remains usable. */
      }
      if (!saved) {
        document.documentElement.classList.toggle('dark', media.matches);
        document.documentElement.style.colorScheme = media.matches
          ? 'dark'
          : 'light';
        window.dispatchEvent(new Event('atlas-theme-change'));
      }
      sync();
    };
    media.addEventListener('change', system);
    window.addEventListener('atlas-theme-change', sync);
    return () => {
      clearTimeout(timer);
      media.removeEventListener('change', system);
      window.removeEventListener('atlas-theme-change', sync);
    };
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('atlas-theme', next ? 'dark' : 'light');
    } catch {
      /* Choice still applies to this page. */
    }
    setDark(next);
    window.dispatchEvent(new Event('atlas-theme-change'));
  };
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
