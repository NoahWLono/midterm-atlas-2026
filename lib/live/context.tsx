'use client';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import fallbackRaw from '@/public/data/live-polls.json';
import { RACES } from '@/lib/election/data';
import { pollTwoParty } from '@/lib/election/model';
import {
  LIVE_URL,
  EDITION_URL,
  validateBundle,
  bundleIsNewer,
  type LiveBundle,
} from './schema';
export const FALLBACK = fallbackRaw as unknown as LiveBundle;
const Context = createContext({
  bundle: FALLBACK,
  races: RACES,
  loading: true,
  error: '',
  pinned: false,
  editionReady: true,
  now: FALLBACK.checkedAt,
  refresh: () => {},
});
export function ElectionDataProvider({ children }: { children: ReactNode }) {
  const latest = useRef(FALLBACK);
  const requested = useRef<string | undefined>(undefined);
  const [bundle, setBundle] = useState(FALLBACK),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [pinned, setPinned] = useState(false),
    [editionReady, setEditionReady] = useState(true),
    [now, setNow] = useState(FALLBACK.checkedAt),
    [request, setRequest] = useState(0);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    if (requested.current === undefined)
      requested.current =
        new URLSearchParams(window.location.search).get('edition') || '';
    const edition = requested.current;
    const pin = !!edition && /^[a-f0-9]{16}$/.test(edition);
    const load = async () => {
      try {
        const url = pin
          ? `${EDITION_URL}${edition}.json`
          : `${LIVE_URL}?refresh=${Math.floor(Date.now() / 300000)}`;
        const response = await fetch(url, {
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!response.ok)
          throw new Error(
            `Polling update unavailable (HTTP ${response.status})`,
          );
        const text = await response.text();
        if (text.length > 12_000_000)
          throw new Error('Polling payload exceeds limit');
        const next = validateBundle(JSON.parse(text));
        if (pin && next.revision !== edition)
          throw new Error('Data edition does not match');
        if (active) {
          if (pin || bundleIsNewer(next, latest.current)) {
            latest.current = next;
            setBundle(next);
            if (!pin)
              try {
                localStorage.setItem('atlas-polls-v1', JSON.stringify(next));
              } catch {
                /* Storage is optional. */
              }
          }
          setEditionReady(true);
          setError('');
        }
      } catch (e) {
        if (active && !abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : 'Polling update unavailable',
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    const boot = setTimeout(() => {
      setNow(new Date().toISOString());
      setPinned(pin);
      setEditionReady(!pin || latest.current.revision === edition);
      if (!pin)
        try {
          const saved = localStorage.getItem('atlas-polls-v1');
          if (saved) {
            const next = validateBundle(JSON.parse(saved));
            if (bundleIsNewer(next, latest.current)) {
              latest.current = next;
              setBundle(next);
            }
          }
        } catch {
          /* Keep the bundled edition. */
        }
      void load();
    }, 0);
    const timer = setInterval(
      () => {
        setNow(new Date().toISOString());
        if (!pin && document.visibilityState === 'visible') void load();
      },
      15 * 60 * 1000,
    );
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date().toISOString());
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      abort.abort();
      clearTimeout(boot);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [request]);
  const races = useMemo(
    () =>
      RACES.map((r) => {
        if (r.chamber !== 'senate') return r;
        const p = bundle.polls.find((x) => x.id === bundle.senatePollIds[r.id]);
        return {
          ...r,
          pollId: p?.id || null,
          poll:
            p && p.dem !== null && p.rep !== null
              ? pollTwoParty(p.dem, p.rep, p.sample)
              : undefined,
        };
      }),
    [bundle],
  );
  return (
    <Context.Provider
      value={{
        bundle,
        races,
        loading,
        error,
        pinned,
        editionReady,
        now,
        refresh: () => setRequest((x) => x + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useElectionData() {
  return useContext(Context);
}
