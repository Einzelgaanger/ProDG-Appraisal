import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  speed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  onCycleComplete?: () => void;
  /** When true, hides the blinking caret (calmer for paired layouts). */
  hideCursor?: boolean;
}

export default function TypewriterText({
  texts,
  className = '',
  speed = 80,
  deleteSpeed = 40,
  pauseDuration = 2000,
  onCycleComplete,
  hideCursor = false,
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    const currentText = texts[textIndex];

    if (!isDeleting && displayText === currentText) {
      // Full cycle complete when we finish typing the last text
      if (textIndex === texts.length - 1 && !hasFiredRef.current) {
        hasFiredRef.current = true;
        onCycleComplete?.();
      }
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText((prev) =>
        isDeleting
          ? prev.slice(0, -1)
          : currentText.slice(0, prev.length + 1)
      );
    }, isDeleting ? deleteSpeed : speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, speed, deleteSpeed, pauseDuration, onCycleComplete]);

  return (
    <span className={className}>
      {displayText}
      {!hideCursor && (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0.2] }}
          transition={{
            duration: 1.05,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="inline-block w-[3px] h-[0.85em] bg-current ml-0.5 align-middle rounded-full"
        />
      )}
    </span>
  );
}
