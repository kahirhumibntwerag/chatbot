import { useEffect, RefObject, useLayoutEffect } from 'react';

export function useAutoScroll(
  scrollRef: RefObject<HTMLDivElement>,
  dependencies: any[],
  delay: number = 100
) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevOpacity = el.style.opacity;
    el.style.opacity = '0';

    const scrollTimeout = setTimeout(() => {
      const node = scrollRef.current;
      if (!node) return;

      node.scrollTo({
        top: node.scrollHeight
      });

      // after scroll completes, make it fully visible
      node.style.opacity = '1';
    }, delay);

    return () => {
      clearTimeout(scrollTimeout);
      // restore previous opacity if effect is cleaned up before timeout fires
      el.style.opacity = prevOpacity;
    };
  }, dependencies);


}