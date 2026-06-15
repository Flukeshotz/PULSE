import { useState, useEffect } from 'react';

export function useCountUp(endValue, duration = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (endValue === undefined || endValue === null) return;
    
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      // ease-out quartic
      const easeOut = 1 - Math.pow(1 - Math.min(progress / duration, 1), 4);
      
      setCount(Math.floor(easeOut * endValue));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return count;
}
