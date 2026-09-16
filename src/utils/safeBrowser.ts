/**
 * Utilidades seguras de interacción del navegador para prevenir errores
 * en entornos de ejecución embebidos como iframes y WebView (donde
 * window.confirm, window.alert o navigator.clipboard pueden lanzar DOMExceptions).
 */

export function safeConfirm(message: string, defaultValue = true): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
  } catch (e) {
    console.warn('[safeBrowser] window.confirm no permitido en el entorno actual:', e);
  }
  return defaultValue;
}

export function safeAlert(message: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
      return;
    }
  } catch (e) {
    console.warn('[safeBrowser] window.alert bloqueado en el entorno actual:', message);
  }
}

export async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('[safeBrowser] navigator.clipboard.writeText bloqueado, usando mecanismo de respaldo:', e);
  }

  // Respaldo confiable mediante textarea
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.warn('[safeBrowser] Falló fallback execCommand copy:', err);
  }

  return false;
}
