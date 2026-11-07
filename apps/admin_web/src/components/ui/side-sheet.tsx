'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, type ButtonProps } from './button';
import { ButtonLink } from './button-link';
import { Icon, type IconName } from './icon';
import { IconButton } from './icon-button';
import { Toast, type ToastMessage } from './toast';

const OPEN_EVENT = 'sevenpalette:open-side-sheet';

/** Opens the side sheet with this id from anywhere on the page. */
export function openSideSheet(id: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
}

interface SideSheetApi {
  /** Closes the sheet after a save, clears its form and shows a toast. */
  done: (message: ToastMessage) => void;
  close: () => void;
}

const SideSheetContext = createContext<SideSheetApi | null>(null);

/** The sheet a form sits in, or null when the form is on a page. */
export function useSideSheet() {
  return useContext(SideSheetContext);
}

/**
 * Closes the surrounding side sheet when its form saved (`state.saved`).
 * Does nothing when the form is on a page.
 */
export function useCloseSheetOnSave(state: {
  saved?: string;
  savedLink?: { href: string; label: string };
}) {
  const sheet = useSideSheet();
  useEffect(() => {
    if (sheet && state.saved) {
      sheet.done({ text: state.saved, link: state.savedLink });
    }
  }, [sheet, state]);
}

/**
 * A panel that slides in from the right over a blurred page (WEB-007) for
 * small add and edit forms, so the list stays where it was. A native modal
 * <dialog>: focus stays inside, Escape or a click outside closes it, and
 * focus returns to the button that opened it. The form stays mounted, so a
 * draft survives closing; after a save it starts empty again.
 */
export function SideSheet({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  /** Open on load, for links such as `?add=product`. */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [round, setRound] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const titleId = useId();

  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) {
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      // Every supported browser has showModal; the fallback is for tests.
      if (typeof element.showModal === 'function') {
        element.showModal();
      } else {
        element.setAttribute('open', '');
      }
    } else if (!open && element.open) {
      if (typeof element.close === 'function') {
        element.close();
      } else {
        element.removeAttribute('open');
      }
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const done = useCallback((message: ToastMessage) => {
    setOpen(false);
    setRound((value) => value + 1);
    setToast(message);
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const api = useMemo(() => ({ done, close }), [done, close]);

  return (
    <SideSheetContext value={api}>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          // A click on the blurred backdrop lands on the dialog itself.
          if (event.target === event.currentTarget) {
            close();
          }
        }}
        className="side-sheet-enter fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-narrow border-l border-card-border bg-sheet-background p-0 text-text-primary shadow-xl backdrop:bg-text-primary/40 backdrop:backdrop-blur-sm medium:rounded-l-sheet"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-3 border-b border-card-border px-6 py-4">
            <div className="flex flex-1 flex-col gap-1 pt-1.5">
              <h2 id={titleId} className="text-heading3 font-semibold">
                {title}
              </h2>
              {description ? (
                <p className="text-body text-text-secondary">{description}</p>
              ) : null}
            </div>
            <IconButton icon="close" label="Close" onClick={close} />
          </header>
          <div key={round} className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      </dialog>
      {toast ? <Toast message={toast} onDismiss={dismissToast} /> : null}
    </SideSheetContext>
  );
}

/**
 * Cancel for forms that may sit in a side sheet: closes the sheet there, or
 * goes back to `href` on a page.
 */
export function SheetCancel({ href }: { href?: string }) {
  const sheet = useSideSheet();
  if (sheet) {
    return (
      <Button variant="secondary" onClick={sheet.close}>
        Cancel
      </Button>
    );
  }
  return href ? (
    <ButtonLink href={href} variant="secondary">
      Cancel
    </ButtonLink>
  ) : null;
}

/** A button that opens the side sheet with this id. */
export function SideSheetButton({
  sheet,
  icon,
  children,
  ...rest
}: Omit<ButtonProps, 'onClick' | 'type'> & {
  sheet: string;
  icon?: IconName;
}) {
  return (
    <Button
      type="button"
      aria-haspopup="dialog"
      onClick={() => openSideSheet(sheet)}
      {...rest}
    >
      {icon ? <Icon name={icon} className="size-5" /> : null}
      {children}
    </Button>
  );
}
