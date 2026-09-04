'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { JarAPI } from '@/lib/capitol/jar';
export function ProbabilityJar({ p }: { p: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    jar = useRef<JarAPI | null>(null),
    probability = useRef(p);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    probability.current = p;
    jar.current?.setProbability(p);
  }, [p]);
  useEffect(() => {
    let active = true,
      loaded = false;
    let instance: JarAPI | null = null;
    const boot = async () => {
      if (loaded || !canvas.current) return;
      loaded = true;
      try {
        const { createJar } = await import('@/lib/capitol/jar');
        if (!active || !canvas.current) return;
        instance = createJar(canvas.current, probability.current, () =>
          setReady(true),
        );
        jar.current = instance;
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        setPaused(reduced);
        if (!reduced) instance.shake();
      } catch {
        if (active) setFailed(true);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void boot();
      },
      { rootMargin: '200px' },
    );
    if (canvas.current) observer.observe(canvas.current);
    return () => {
      active = false;
      observer.disconnect();
      instance?.dispose();
      jar.current = null;
    };
  }, []);
  const d = Math.round(p * 100);
  return (
    <div className="probability-jar">
      <canvas
        ref={canvas}
        aria-label={`100 balls: ${d} blue for Democratic control, ${100 - d} red for Republican control. Drag to turn the jar.`}
      />
      {(!ready || failed) && (
        <div className="jar-fallback">
          {failed ? (
            <>
              <strong>
                {d} blue · {100 - d} red
              </strong>
              <span>3D unavailable on this device</span>
            </>
          ) : (
            <span>Filling 100 possible worlds…</span>
          )}
        </div>
      )}
      <div className="jar-caption">
        <span>
          <i className="dem-dot" />
          {d} D
        </span>
        <span>
          <i className="rep-dot" />
          {100 - d} R
        </span>
        <small>Rounded to 100 balls</small>
      </div>
      <div className="jar-buttons">
        <button onClick={() => jar.current?.shake()} disabled={!ready}>
          <RotateCcw size={13} />
          {paused ? 'Turn jar' : 'Shake the jar'}
        </button>
        <button
          onClick={() => {
            setPaused(!paused);
            jar.current?.pause(!paused);
          }}
          disabled={!ready}
          aria-label={paused ? 'Enable jar animation' : 'Pause jar animation'}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </div>
    </div>
  );
}
