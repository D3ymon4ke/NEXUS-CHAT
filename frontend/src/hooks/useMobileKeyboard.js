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
    let frameId = null;
    let lastState = { open: false, height: 0 };

    const updateViewport = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);

      if (!vv) {
        const heightDiff = window.screen.height - window.innerHeight;
        const isOpen = heightDiff > 140;
        const nextHeight = isOpen ? heightDiff : 0;
        if (lastState.open !== isOpen) setIsKeyboardOpen(isOpen);
        if (lastState.height !== nextHeight) setKeyboardHeight(nextHeight);
        lastState = { open: isOpen, height: nextHeight };
        document.documentElement.style.setProperty('--keyboard-height', `${nextHeight}px`);
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--viewport-offset-top', '0px');
        return;
      }

      const currentVisualHeight = vv.height;
      const viewportOffsetTop = Math.max(0, vv.offsetTop || 0);
      const calculatedKeyboardHeight = Math.max(0, window.innerHeight - currentVisualHeight - viewportOffsetTop);
      const isOpen = calculatedKeyboardHeight > 100;

      if (lastState.open !== isOpen) setIsKeyboardOpen(isOpen);
      if (Math.abs(lastState.height - calculatedKeyboardHeight) > 1) {
        setKeyboardHeight(calculatedKeyboardHeight);
      }
      lastState = { open: isOpen, height: calculatedKeyboardHeight };

      document.documentElement.style.setProperty('--app-height', `${currentVisualHeight}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${calculatedKeyboardHeight}px`);
      document.documentElement.style.setProperty('--viewport-offset-top', `${viewportOffsetTop}px`);
      document.documentElement.style.setProperty('--is-keyboard-open', isOpen ? '1' : '0');
    };

    const handleViewportChange = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateViewport);
    };

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
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return {
    isKeyboardOpen,
    keyboardHeight,
    dismissKeyboard
  };
}
