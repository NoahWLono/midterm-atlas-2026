'use client';
import { useEffect, useRef, useState } from 'react';
import { Landmark, ArrowUpRight } from 'lucide-react';
import { useElectionData } from '@/lib/live/context';
import { simulate, type Scenario } from '@/lib/election/model';
export function SecretDoor({ scenario }: { scenario: Scenario }) {
  const [unlocked, setUnlocked] = useState(false),
    [url, setUrl] = useState('/capitol');
  const clicks = useRef(0),
    last = useRef(0);
  const { races, bundle } = useElectionData();
  const unlock = () => {
    const h = simulate(
        races.filter((r) => r.chamber === 'house'),
        scenario,
        0,
        435,
        218,
      ).demMedian,
      s = simulate(
        races.filter((r) => r.chamber === 'senate'),
        scenario,
        34,
        100,
        51,
      ).demMedian;
    setUrl(
      `/capitol?h=${Math.round(h)}&s=${Math.round(s)}&edition=${bundle.revision}`,
    );
    setUnlocked(true);
    try {
      localStorage.setItem('atlas-after-hours', 'discovered');
    } catch {
      /* Optional discovery persistence. */
    }
  };
  const reveal = useRef(unlock);
  useEffect(() => {
    reveal.current = unlock;
  });
  useEffect(() => {
    let keys = '';
    const onKey = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable=true]',
        )
      )
        return;
      if (e.key.length === 1) {
        keys = (keys + e.key.toLowerCase()).slice(-7);
        if (keys === 'capitol') reveal.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="secret-door">
      <button
        aria-label="A curious Capitol seal"
        title="A curious Capitol seal"
        onClick={() => {
          if (Date.now() - last.current > 3500) clicks.current = 0;
          last.current = Date.now();
          clicks.current++;
          if (clicks.current >= 5) unlock();
        }}
      >
        <Landmark size={18} />
      </button>
      {unlocked && (
        <output className="secret-pass">
          <span>An after-hours pass slipped out.</span>
          <a href={url}>
            Enter the other chamber <ArrowUpRight size={14} />
          </a>
          <button
            onClick={() => setUnlocked(false)}
            aria-label="Put away the visitor pass"
          >
            ×
          </button>
        </output>
      )}
    </div>
  );
}
