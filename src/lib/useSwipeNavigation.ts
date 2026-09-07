import { useRef, type TouchEvent } from 'react';

// A tap has ~0px of movement; a real swipe is deliberate. This threshold is
// what tells the two apart, so a simple tap on the card never triggers navigation.
const SWIPE_MIN_DISTANCE_PX = 40;
// If the vertical movement is this large, the gesture is a page scroll, not
// a horizontal swipe — even if it also happened to clear the horizontal minimum.
const SWIPE_MAX_VERTICAL_PX = 60;

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: TouchEvent<HTMLDivElement>) => void;
}

// Swipe-left/right-to-advance gesture for a horizontal item list — shared by
// the Machines and Employees mobile "main card" views so both reuse one
// gesture implementation instead of two copies, and stay in sync with
// whatever selection state the caller already keeps for its bottom
// carousel (this hook holds no item/index state of its own). Swiping left
// moves to the next item, right to the previous one, matching a photo
// gallery's convention regardless of the app's RTL text direction.
// Never calls preventDefault, so native vertical scrolling is completely
// untouched — only the touchend position is read, after the browser has
// already handled (or not) any scrolling itself.
export function useSwipeNavigation(onSwipe: (direction: 'next' | 'prev') => void): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX) return;
    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_PX) return;
    onSwipe(deltaX < 0 ? 'next' : 'prev');
  }

  return { onTouchStart, onTouchEnd };
}
