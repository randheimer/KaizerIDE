import { useRef, useState } from 'react';
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  autoUpdate,
  flip,
  shift,
  offset,
  size,
} from '@floating-ui/react';

/**
 * usePopoverMenu - thin Floating UI wrapper for a click-triggered menu.
 *
 * Handles positioning, keyboard navigation, click-outside dismissal,
 * ARIA roles, and viewport clamping. Callers provide controlled `open`
 * state and an `onOpenChange` callback (typically wired to chatStore).
 *
 * The returned getters MUST be spread onto the trigger and floating
 * elements — don't add your own `onClick` on the trigger (Floating UI's
 * `useClick` wires that for you via `getReferenceProps`).
 *
 * Usage:
 *   const {
 *     refs, floatingStyles, context,
 *     getReferenceProps, getFloatingProps, getItemProps,
 *     activeIndex,
 *   } = usePopoverMenu({ open, onOpenChange, placement: 'top-start' });
 */
export function usePopoverMenu({
  open,
  onOpenChange,
  placement = 'top-start',
}) {
  const listRef = useRef([]);
  // Use real state so Floating UI's list navigation re-renders correctly.
  const [activeIndex, setActiveIndex] = useState(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement,
    // `fixed` strategy positions the menu in viewport coordinates, which
    // plays nicely with FloatingPortal (no offsetParent surprises).
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(140, availableHeight - 8)}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  // useClick wires onClick on the reference to toggle `open` via onOpenChange.
  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  // 'menu' is the correct ARIA role for a button-triggered popover.
  const role = useRole(context, { role: 'menu' });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav,
  ]);

  return {
    refs,
    floatingStyles,
    context,
    listRef,
    activeIndex,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
  };
}
