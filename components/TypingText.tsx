"use client";

import { useEffect, useState } from "react";

// Rotating typewriter: types a phrase, holds, erases, types the next.
// Falls back to static first phrase when the user prefers reduced motion.
export function TypingText({
  words,
  className = "",
  typeMs = 85,
  eraseMs = 40,
  holdMs = 1500,
}: {
  words: string[];
  className?: string;
  typeMs?: number;
  eraseMs?: number;
  holdMs?: number;
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [len, setLen] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const word = words[wordIndex % words.length];
    let delay = erasing ? eraseMs : typeMs;

    if (!erasing && len === word.length) delay = holdMs; // hold at full
    if (erasing && len === 0) delay = 320; // brief pause before next word

    const t = setTimeout(() => {
      if (!erasing && len < word.length) setLen((n) => n + 1);
      else if (!erasing && len === word.length) setErasing(true);
      else if (erasing && len > 0) setLen((n) => n - 1);
      else {
        setErasing(false);
        setWordIndex((i) => (i + 1) % words.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [len, erasing, wordIndex, words, reduced, typeMs, eraseMs, holdMs]);

  const word = words[wordIndex % words.length];
  const shown = reduced ? words[0] : word.slice(0, len);

  return (
    <span className={className}>
      {shown}
      {!reduced && (
        <span
          aria-hidden
          className="ml-0.5 inline-block w-[3px] -translate-y-[2px] animate-pulse bg-current align-middle"
          style={{ height: "0.9em" }}
        />
      )}
    </span>
  );
}
