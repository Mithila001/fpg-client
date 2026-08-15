import { useEffect, useRef, useState } from "react";

interface Size {
  width: number;
  height: number;
}

export const useContainerSize = (minimumHeight = 320) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 900, height: minimumHeight });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(minimumHeight, Math.floor(rect.height));
      setSize((current) => current.width === width && current.height === height
        ? current
        : { width, height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimumHeight]);

  return { ref, size };
};
