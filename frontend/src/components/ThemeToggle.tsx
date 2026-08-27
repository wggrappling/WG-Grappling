import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'escuro' : 'claro';
  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Ativar tema ${next}`} title={`Ativar tema ${next}`}><span aria-hidden="true">{theme === 'light' ? '☀' : '☾'}</span></button>;
}
