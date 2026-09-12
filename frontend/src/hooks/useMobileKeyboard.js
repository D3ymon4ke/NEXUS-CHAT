import { useState, useEffect, useCallback } from 'react';

/**
 * useMobileKeyboard
 * Gerencia a sincronização em tempo real do teclado virtual mobile (iOS Safari / Android Chrome)
 * através da Visual Viewport API, eliminando o empurrão abrupto de tela, travando o cabeçalho no topo
 * e fornecendo suporte para fechar o teclado ao arrastar mensagens para baixo (WhatsApp / Telegram style).
 */
export function useMobileKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Fecha o teclado virtual retirando o foco do campo ativo
  const dismissKeyboard = useCallback(() => {
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.blur();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;

    const handleViewportChange = () => {
      // Previne que o Safari desloque o body para cima
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }

      if (!vv) {
        // Fallback para navegadores sem visualViewport
        const heightDiff = window.screen.height - window.innerHeight;
        const isOpen = heightDiff > 140;
        setIsKeyboardOpen(isOpen);
        setKeyboardHeight(isOpen ? heightDiff : 0);
        document.documentElement.style.setProperty('--keyboard-height', `${isOpen ? heightDiff : 0}px`);
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        return;
      }

      // Medição exata da altura visível acima do teclado
      const currentVisualHeight = vv.height;
      const totalScreenHeight = window.innerHeight;
      const calculatedKeyboardHeight = Math.max(0, totalScreenHeight - currentVisualHeight);
      const isOpen = calculatedKeyboardHeight > 100;

      setIsKeyboardOpen(isOpen);
      setKeyboardHeight(calculatedKeyboardHeight);

      // Seta variáveis CSS no :root para layout ultra-responsivo
      document.documentElement.style.setProperty('--app-height', `${currentVisualHeight}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${calculatedKeyboardHeight}px`);
      document.documentElement.style.setProperty('--is-keyboard-open', isOpen ? '1' : '0');

      // Se o Safari tentar deslocar o offset top do visual viewport, reposiciona
      if (vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    // Chamada inicial
    handleViewportChange();

    if (vv) {
      vv.addEventListener('resize', handleViewportChange, { passive: true });
      vv.addEventListener('scroll', handleViewportChange, { passive: true });
    }

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
    dismissKeyboard
  };
}
