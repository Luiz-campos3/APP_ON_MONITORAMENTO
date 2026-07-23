import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ThemeMode } from '@/constants/theme';

export type ThemePreference = ThemeMode | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  preference: ThemePreference;
  colors: (typeof palettes)[ThemeMode];
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = '@onway/theme-preference';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function OnWayThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      })
      .catch(() => undefined);
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({ mode, preference, colors: palettes[mode], setPreference, toggleTheme }),
    [mode, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useOnWayTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useOnWayTheme deve ser usado dentro de OnWayThemeProvider');
  return context;
}
