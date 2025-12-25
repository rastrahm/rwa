'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      
      console.log('Applying theme:', newTheme);
      
      // Forzar la actualización removiendo y agregando la clase en html
      // Primero remover todas las clases posibles
      root.classList.remove('dark', 'light');
      body.classList.remove('dark', 'light');
      
      // Agregar la clase correspondiente
      if (newTheme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.add('light');
        body.classList.remove('dark');
      }
      
      // También actualizar el atributo data-theme para mayor compatibilidad
      root.setAttribute('data-theme', newTheme);
      body.setAttribute('data-theme', newTheme);
      
      // Forzar re-renderizado forzando un reflow
      void root.offsetHeight;
      void body.offsetHeight;
      
      console.log('HTML classes after apply:', root.classList.toString());
      console.log('Body classes after apply:', body.classList.toString());
      console.log('Body data-theme:', body.getAttribute('data-theme'));
      
      // Verificar que las clases se aplicaron
      setTimeout(() => {
        console.log('Verificación después de 100ms - HTML classes:', root.classList.toString());
        console.log('Verificación después de 100ms - Body classes:', body.classList.toString());
      }, 100);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      console.log('Toggling theme from', currentTheme, 'to', newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
        // Aplicar el tema inmediatamente
        applyTheme(newTheme);
      }
      return newTheme;
    });
  }, [applyTheme]);

  useEffect(() => {
    setMounted(true);
    // Leer tema del localStorage o preferencia del sistema
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const initialTheme = savedTheme || systemPreference;
      
      setThemeState(initialTheme);
      applyTheme(initialTheme);
    }
  }, [applyTheme]);

  // Siempre proporcionar el contexto, incluso antes de montar
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div data-theme={theme} key={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

