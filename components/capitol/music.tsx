'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { BANDS, createBand, type Band } from '@/lib/capitol/music';

export function CapitolMusic({ duck }: { duck: boolean }) {
  const audio = useRef<ReturnType<typeof createBand> | null>(null);
  const duckRef = useRef(duck);
  const [enabled, setEnabled] = useState(true),
    [band, setBand] = useState<Band>('parade'),
    [volume, setVolume] = useState(0.18),
    [status, setStatus] = useState(
      'An original march for an improbable republic',
    );
  const preferences = useRef({
    enabled: true,
    band: 'parade' as Band,
    volume: 0.18,
  });
  const [expanded, setExpanded] = useState(false);
  const start = useCallback(() => {
    try {
      if (!audio.current) audio.current = createBand(setStatus);
      const p = preferences.current;
      audio.current.band(p.band);
      audio.current.volume(p.volume);
      audio.current.duck(duckRef.current);
      audio.current.play(p.enabled);
    } catch {
      setStatus('Audio is unavailable in this browser');
    }
  }, []);
  const save = (p: typeof preferences.current) => {
    preferences.current = p;
    try {
      localStorage.setItem('atlas-capitol-band', JSON.stringify(p));
    } catch {
      /* Preferences are optional. */
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = JSON.parse(
          localStorage.getItem('atlas-capitol-band') || 'null',
        );
        if (
          raw &&
          typeof raw.enabled === 'boolean' &&
          BANDS.some((b) => b.id === raw.band) &&
          Number.isFinite(raw.volume) &&
          raw.volume >= 0 &&
          raw.volume <= 1
        ) {
          preferences.current = raw;
          setEnabled(raw.enabled);
          setBand(raw.band);
          setVolume(raw.volume);
        }
      } catch {
        /* Use the quiet default. */
      }
    }, 0);
    const enter = () => start();
    window.addEventListener('atlas-capitol-enter', enter);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('atlas-capitol-enter', enter);
      audio.current?.dispose();
      audio.current = null;
    };
  }, [start]);
  useEffect(() => {
    duckRef.current = duck;
    audio.current?.duck(duck);
  }, [duck]);
  return (
    <div className="cap-music">
      <button
        title={enabled ? 'Mute the band' : 'Play the band'}
        aria-label={enabled ? 'Mute Capitol music' : 'Play Capitol music'}
        aria-pressed={enabled}
        onClick={() => {
          const value = !enabled;
          setEnabled(value);
          save({ ...preferences.current, enabled: value });
          if (value) start();
          else audio.current?.play(false);
        }}
      >
        {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </button>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="cap-music-controls"
      >
        <Music2 size={15} />
        <span>{BANDS.find((b) => b.id === band)?.name}</span>
      </button>
      {expanded && (
        <div id="cap-music-controls" className="cap-music-popover">
          <strong>A little 1776 energy</strong>
          <label>
            Instrument band
            <select
              value={band}
              onChange={(e) => {
                const v = e.target.value as Band;
                setBand(v);
                save({ ...preferences.current, band: v });
                audio.current?.band(v);
              }}
            >
              {BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <small>{BANDS.find((b) => b.id === band)?.description}</small>
          <label>
            Volume · {Math.round(volume * 100)}%
            <input
              aria-label="Music volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                save({ ...preferences.current, volume: v });
                audio.current?.volume(v);
              }}
            />
          </label>
          <small>
            {status}. Begins on entry; softens during conversation and pauses in
            background tabs.
          </small>
          <a
            href="/audio/capitol/sources.json"
            target="_blank"
            rel="noreferrer"
          >
            Sample sources & CC0 credits ↗
          </a>
          <button onClick={() => setExpanded(false)}>
            Close music controls
          </button>
        </div>
      )}
    </div>
  );
}
