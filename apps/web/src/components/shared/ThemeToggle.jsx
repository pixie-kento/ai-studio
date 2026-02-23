import { Moon, Sun } from 'lucide-react';
import useUIStore from '../../stores/uiStore.js';
import { cn } from '../../lib/utils.js';

export function ThemeToggle({ className = '' }) {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'group inline-flex h-9 items-center gap-1 rounded-full border px-1.5 transition-all',
        'border-slate-300 bg-white/85 text-slate-600 hover:border-slate-400 hover:text-slate-900',
        'dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/25 dark:hover:text-white',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full transition-all',
          theme === 'light'
            ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
            : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200',
        )}
      >
        <Moon size={14} />
      </span>
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full transition-all',
          theme === 'dark'
            ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
            : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200',
        )}
      >
        <Sun size={14} />
      </span>
    </button>
  );
}

export default ThemeToggle;
