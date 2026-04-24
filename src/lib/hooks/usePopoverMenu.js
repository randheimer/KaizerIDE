import { useRef } from 'react';
import {
  useFloating,
  useInteractions,
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
 * Returns getter props that must be spread onto the trigger and floating
 * elements, plus the `refs`, `floatingStyles`, and nav state.
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
  itemCount = 0,
  onSelect,
}) {
  const listRef = useRef([]);
  const activeIndexRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement,
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

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'listbox' });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex: activeIndexRef.current,
    onNavigate: (idx) => {
      activeIndexRef.current = idx;
    },
    virtual: true,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    dismiss,
    role,
    listNav,
  ]);

  return {
    refs,
    floatingStyles,
    context,
    listRef,
    activeIndex: activeIndexRef.current,
    itemCount,
    onSelect,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
  };
}
