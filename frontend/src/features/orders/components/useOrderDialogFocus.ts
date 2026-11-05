import { useEffect, type RefObject } from 'react';

/** Keep keyboard focus in the order dialog and return it to its trigger. */
export function useOrderDialogFocus(content: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = content.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    )).filter(element => element.getClientRects().length > 0 && !element.closest('fieldset:disabled'));
    controls()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      if (!dialog!.contains(document.activeElement)
        || (event.shiftKey && document.activeElement === first)
        || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); };
  }, [content]);
}
