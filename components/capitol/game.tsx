'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/toggle';
import { CapitolMusic } from './music';
import {
  ArrowLeft,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Compass,
  Map,
  MessageCircle,
  Settings2,
  X,
  Volume2,
  VolumeX,
  BookOpen,
  Landmark,
  Download,
  MousePointer2,
  Sparkles,
} from 'lucide-react';
import {
  CHARACTERS,
  ZONES,
  dialogue,
  type Character,
  type ZoneId,
} from '@/lib/capitol/layout';
import {
  BILLS,
  STAGES,
  PROCEDURE_SOURCES,
  makeRollCall,
  assessVote,
  type Chamber,
  type VoteRule,
  type RollCall,
  type Vote,
} from '@/lib/capitol/procedure';
import type { WorldAPI, WorldState } from '@/lib/capitol/world';
import { useElectionData } from '@/lib/live/context';
import { DEFAULTS, simulate } from '@/lib/election/model';
type Round = {
  stage: number;
  chamber: Chamber;
  rule: VoteRule;
  counts: Vote;
  rows: RollCall[];
  assessment: ReturnType<typeof assessVote>;
  seed: number;
  demSupport: number;
  repSupport: number;
  attendance: number;
  abstentions: number;
  vpYea: boolean;
  baseSeed: number;
};
type ChatLine = { speaker: 'you' | 'character'; text: string };
const phaseChamber = (stage: number): Chamber =>
  stage === 1 || stage === 5 ? 'house' : 'senate';
const phaseRule = (stage: number): VoteRule =>
  stage === 2 ? 'cloture' : stage >= 5 ? 'override' : 'passage';
const parties = {
  D: 'Democratic',
  R: 'Republican',
  I: 'Independent',
  staff: 'Fictional staff',
};
function downloadSession(value: unknown) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = u;
  a.download = 'capitol-fictional-session.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function CapitolGame() {
  const { bundle, races } = useElectionData();
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<WorldAPI | null>(null),
    chatEnd = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(true),
    [ready, setReady] = useState(false),
    [graphicsError, setGraphicsError] = useState(''),
    [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<
      'map' | 'vote' | 'settings' | 'guide' | null
    >(null),
    [character, setCharacter] = useState<Character | null>(null),
    [room, setRoom] = useState<ZoneId | null>(null);
  const [state, setState] = useState<WorldState>({
    x: -55,
    z: 0,
    yaw: -Math.PI / 2,
    zone: 'grounds',
    near: null,
    fps: 60,
  });
  const [visited, setVisited] = useState<ZoneId[]>(['grounds']),
    [met, setMet] = useState<string[]>([]),
    [voice, setVoice] = useState(false),
    [motion, setMotion] = useState(true),
    [daylight, setDaylight] = useState(1);
  const [chat, setChat] = useState<ChatLine[]>([]),
    [question, setQuestion] = useState('');
  const [demHouse, setDemHouse] = useState(218),
    [demSenate, setDemSenate] = useState(50),
    [balanceSource, setBalanceSource] = useState(
      'Loading election-model scenario…',
    );
  const [bill, setBill] = useState(0),
    [amended, setAmended] = useState(false),
    [stage, setStage] = useState(0),
    [demSupport, setDemSupport] = useState(72),
    [repSupport, setRepSupport] = useState(48),
    [attendance, setAttendance] = useState(100),
    [abstentions, setAbstentions] = useState(0),
    [vpYea, setVpYea] = useState(true),
    [contested, setContested] = useState(true),
    [seed, setSeed] = useState(1202027),
    [rounds, setRounds] = useState<Round[]>([]),
    [outcome, setOutcome] = useState('');
  const initialized = useRef(false);
  const interactRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    const sync = () =>
      setDaylight(
        document.documentElement.classList.contains('dark') ? 0.25 : 1,
      );
    const timer = setTimeout(sync, 0);
    window.addEventListener('atlas-theme-change', sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('atlas-theme-change', sync);
    };
  }, []);
  const paused = intro || !!panel || !!character || !!room;
  const speak = useCallback(
    (text: string) => {
      if (!voice || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.97;
      window.speechSynthesis.speak(u);
    },
    [voice],
  );
  const interact = useCallback(
    (id: string) => {
      if (id.startsWith('zone:')) {
        setRoom(id.slice(5) as ZoneId);
        return;
      }
      const c = CHARACTERS.find((x) => x.id === id);
      if (!c) return;
      setCharacter(c);
      setChat([{ speaker: 'character', text: c.line }]);
      setMet((old) => (old.includes(id) ? old : [...old, id]));
      speak(c.line);
    },
    [speak],
  );
  useEffect(() => {
    interactRef.current = interact;
  }, [interact]);
  useEffect(() => {
    if (initialized.current) return;
    const timer = setTimeout(() => {
      initialized.current = true;
      const q = new URLSearchParams(window.location.search);
      const s = {
        ...DEFAULTS,
        environment: bundle.referenceEnvironment,
        referenceEnvironment: bundle.referenceEnvironment,
      };
      const h = Number(q.get('h')),
        sen = Number(q.get('s'));
      const fromURL =
        q.has('h') &&
        q.has('s') &&
        Number.isInteger(h) &&
        h >= 0 &&
        h <= 435 &&
        Number.isInteger(sen) &&
        sen >= 0 &&
        sen <= 100;
      setDemHouse(
        fromURL
          ? h
          : Math.round(
              simulate(
                races.filter((r) => r.chamber === 'house'),
                s,
                0,
                435,
                218,
              ).demMedian,
            ),
      );
      setDemSenate(
        fromURL
          ? sen
          : Math.round(
              simulate(
                races.filter((r) => r.chamber === 'senate'),
                s,
                34,
                100,
                51,
              ).demMedian,
            ),
      );
      setBalanceSource(
        fromURL
          ? 'Balance carried from your election-lab scenario'
          : 'Separate chamber medians from the bundled polling edition',
      );
      setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }, 0);
    return () => clearTimeout(timer);
  }, [bundle, races]);
  useEffect(() => {
    let active = true;
    let world: WorldAPI | null = null;
    import('@/lib/capitol/world')
      .then(({ createWorld }) => {
        if (!active || !canvas.current) return;
        try {
          world = createWorld(canvas.current, {
            demHouse: 218,
            demSenate: 50,
            onState: setState,
            onInteract: (id) => interactRef.current(id),
            onError: setGraphicsError,
          });
          engine.current = world;
          setReady(true);
        } catch {
          setGraphicsError(
            '3D rendering is unavailable on this device. The room guide, conversations, and complete vote simulation still work.',
          );
        }
      })
      .catch(() =>
        setGraphicsError(
          'The 3D engine could not load. The accessible room guide and vote simulation remain available.',
        ),
      );
    return () => {
      active = false;
      world?.dispose();
      engine.current = null;
    };
    // Geometry is initialized once; votes recolor the seats without rebuilding it.
  }, []);
  useEffect(() => {
    if (!rounds.length) {
      engine.current?.setVotes(
        'house',
        Array.from({ length: 435 }, (_, i) => (i < demHouse ? 'dem' : 'rep')),
      );
      engine.current?.setVotes(
        'senate',
        Array.from({ length: 100 }, (_, i) => (i < demSenate ? 'dem' : 'rep')),
      );
    }
  }, [demHouse, demSenate, rounds.length, ready]);
  useEffect(() => {
    engine.current?.pause(paused);
  }, [paused, ready]);
  useEffect(() => {
    engine.current?.motion(motion);
  }, [motion, ready]);
  useEffect(() => {
    engine.current?.daylight(daylight);
  }, [daylight, ready]);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setVisited((old) =>
          old.includes(state.zone) ? old : [...old, state.zone],
        ),
      0,
    );
    return () => clearTimeout(timer);
  }, [state.zone]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({
      behavior: motion ? 'smooth' : 'instant',
      block: 'nearest',
    });
  }, [chat, motion]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCharacter(null);
        setRoom(null);
        setPanel(null);
        window.speechSynthesis?.cancel();
      }
      if (
        e.code === 'KeyM' &&
        !(e.target as HTMLElement).closest('input,textarea,select')
      )
        setPanel((p) => (p === 'map' ? null : 'map'));
    };
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!paused) return;
    const target = document.querySelector<HTMLElement>(
      '.cap-overlay dialog, .cap-intro',
    );
    if (!target) return;
    const focusable = () =>
      Array.from(
        target.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        ),
      );
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const all = focusable(),
        first = all[0],
        last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [paused, panel, character, room]);
  const ask = (text: string) => {
    if (!character || !text.trim()) return;
    const answer = dialogue(character, text);
    setChat((c) => [
      ...c,
      { speaker: 'you', text: text.trim() },
      { speaker: 'character', text: answer },
    ]);
    setQuestion('');
    speak(answer);
  };
  const travel = (id: ZoneId) => {
    engine.current?.teleport(id);
    setState((s) => ({
      ...s,
      zone: id,
      x: ZONES.find((z) => z.id === id)!.x,
      z: ZONES.find((z) => z.id === id)!.z,
    }));
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
    setPanel(null);
    setRoom(id);
    setIntro(false);
  };
  const currentRound = rounds.findLast((r) => r.stage === stage);
  const recordedSettingsMatch =
    !!currentRound &&
    currentRound.demSupport === demSupport &&
    currentRound.repSupport === repSupport &&
    currentRound.attendance === attendance &&
    currentRound.abstentions === abstentions &&
    currentRound.vpYea === vpYea &&
    currentRound.baseSeed === seed;
  const currentBill = BILLS[bill];
  const cast = () => {
    const chamber = phaseChamber(stage),
      rule = phaseRule(stage),
      thisSeed = seed + rounds.length * 7919;
    const roll = makeRollCall(
      chamber,
      chamber === 'house' ? demHouse : demSenate,
      demSupport,
      repSupport,
      attendance,
      thisSeed,
      abstentions,
    );
    const assessment = assessVote(chamber, rule, roll.counts, vpYea);
    setRounds((r) => [
      ...r,
      {
        stage,
        chamber,
        rule,
        ...roll,
        assessment,
        seed: thisSeed,
        demSupport,
        repSupport,
        attendance,
        abstentions,
        vpYea,
        baseSeed: seed,
      },
    ]);
    engine.current?.setVotes(
      chamber,
      roll.rows.map((r) => r.choice),
    );
    setNotice(
      `${chamber === 'house' ? 'House' : 'Senate'} ${rule}: ${roll.counts.yea} yea, ${roll.counts.nay} nay. ${assessment.passed ? 'Agreed to.' : assessment.quorum ? 'Not agreed to.' : 'No quorum.'}`,
    );
  };
  const advance = () => {
    if (stage === 0) {
      setStage(1);
      engine.current?.teleport('house');
    } else if (stage === 1) {
      setStage(contested ? 2 : 3);
      engine.current?.teleport('senate');
    } else if (stage === 2) setStage(3);
    else if (stage === 3) setStage(4);
    else if (stage === 5) {
      setStage(6);
      engine.current?.teleport('senate');
    } else if (stage === 6) {
      setOutcome(
        'Enacted over the veto after separate two-thirds votes in both chambers.',
      );
      setStage(7);
    }
  };
  const endFailed = () => {
    setOutcome(
      'The proposal did not clear this stage under your assumptions. It has not become law.',
    );
    setStage(7);
  };
  const exportJournal = () =>
    downloadSession({
      fictional: true,
      identitiesVerified: '2026-09-04',
      congress: '120th',
      term: '2027-01-03T12:00:00-05:00 to 2029-01-03T12:00:00-05:00',
      pollingEdition: bundle.revision,
      balanceSource,
      demHouse,
      demSenate,
      bill: currentBill,
      amended,
      contested,
      vicePresidentYea: vpYea,
      seed,
      rounds,
      outcome,
      visited,
      charactersMet: met,
      limitations:
        'Votes are anonymous abstract seats, not predictions or statements of real lawmakers. Chambers simulated separately. Full qualifying membership assumed. No ten-day or pocket-veto branch.',
    });
  const close = () => {
    setPanel(null);
    setRoom(null);
    setCharacter(null);
    window.speechSynthesis?.cancel();
  };
  const nearName = state.near?.startsWith('zone:')
    ? ZONES.find((z) => z.id === state.near!.slice(5))?.name
    : CHARACTERS.find((c) => c.id === state.near)?.name;
  const place = ZONES.find((z) => z.id === state.zone)!;
  const membershipControls = (
    <div className="cap-membership">
      <label>
        House Democratic seats{' '}
        <input
          type="number"
          min={0}
          max={435}
          value={demHouse}
          disabled={stage > 0}
          onChange={(e) => {
            setDemHouse(
              Math.max(
                0,
                Math.min(435, Math.round(Number(e.target.value) || 0)),
              ),
            );
            setBalanceSource('Your hypothetical chamber balance');
          }}
        />
      </label>
      <label>
        Senate Democratic caucus seats{' '}
        <input
          type="number"
          min={0}
          max={100}
          value={demSenate}
          disabled={stage > 0}
          onChange={(e) => {
            setDemSenate(
              Math.max(
                0,
                Math.min(100, Math.round(Number(e.target.value) || 0)),
              ),
            );
            setBalanceSource('Your hypothetical chamber balance');
          }}
        />
      </label>
      <p>
        {demHouse} D / {435 - demHouse} R House · {demSenate} D caucus /{' '}
        {100 - demSenate} R Senate. {balanceSource}. These marginal medians are
        a scenario, not a sampled joint election.
      </p>
    </div>
  );
  return (
    <main className="capitol-game">
      <canvas
        ref={canvas}
        className="capitol-canvas"
        aria-label="First-person 3D Capitol. Use WASD to walk, drag to look, E to interact, or use the room menu."
        tabIndex={0}
      />
      <div className="cap-vignette" />
      <header className="cap-header">
        <Link
          href="/"
          className="cap-back"
          aria-label="Return to Midterm Atlas"
        >
          <ArrowLeft size={17} />
          <span>Election lab</span>
        </Link>
        <div className="cap-brand">
          <Landmark size={22} />
          <span>
            Capitol after hours
            <small>The 120th Congress · a fictional sitting</small>
          </span>
        </div>
        <ThemeToggle />
        <CapitolMusic duck={!!character} />
        <button onClick={() => setPanel('settings')} aria-label="Game settings">
          <Settings2 size={19} />
        </button>
      </header>
      <div className="cap-fiction">
        Real senator identities · fictional dialogue and votes · stylized
        architecture
      </div>
      {!intro && (
        <>
          <div className="cap-location">
            <Compass size={18} />
            <div>
              <strong>{place.name}</strong>
              <span>
                {visited.length}/{ZONES.length} places · {met.length}/16
                conversations
              </span>
            </div>
          </div>
          <div className="cap-crosshair" aria-hidden="true">
            +
          </div>
          <nav className="cap-tools" aria-label="Capitol activities">
            <button onClick={() => setPanel('map')}>
              <Map size={19} />
              <span>Explore</span>
            </button>
            <button onClick={() => setPanel('vote')}>
              <Landmark size={19} />
              <span>Simulate a vote</span>
            </button>
            <button onClick={() => setPanel('guide')}>
              <BookOpen size={19} />
              <span>Field guide</span>
            </button>
            <button
              onClick={() => {
                canvas.current?.focus();
                engine.current?.capture();
              }}
            >
              <MousePointer2 size={19} />
              <span>Capture mouse</span>
            </button>
          </nav>
          {state.near && !paused && (
            <button
              className="cap-interact"
              onClick={() => interact(state.near!)}
            >
              <span>E</span>
              {state.near.startsWith('zone:') ? 'Read about' : 'Talk to'}{' '}
              {nearName}
              <MessageCircle size={17} />
            </button>
          )}
          <div className="cap-controls">
            <span>
              WASD move · drag to look · E interact · M map · Esc release
            </span>
            <div className="cap-dpad">
              {[
                ['KeyW', ArrowUp],
                ['KeyA', ArrowLeft],
                ['KeyS', ArrowDown],
                ['KeyD', ArrowRight],
              ].map(([key, Icon]) => {
                const I = Icon as typeof ArrowUp;
                return (
                  <button
                    key={String(key)}
                    aria-label={`Move ${key === 'KeyW' ? 'forward' : key === 'KeyS' ? 'back' : key === 'KeyA' ? 'left' : 'right'}`}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      engine.current?.key(String(key), true);
                    }}
                    onPointerUp={() => engine.current?.key(String(key), false)}
                    onPointerCancel={() =>
                      engine.current?.key(String(key), false)
                    }
                  >
                    <I size={18} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {graphicsError && (
        <div className="cap-graphics-note">
          <p>{graphicsError}</p>
          <button
            onClick={() => {
              setIntro(false);
              setPanel('map');
            }}
          >
            Open accessible explorer
          </button>
          <button
            aria-label="Dismiss graphics message"
            onClick={() => setGraphicsError('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {notice && !paused && (
        <output className="cap-notice">
          {notice}
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss vote update"
          >
            ×
          </button>
        </output>
      )}
      {intro && (
        <section className="cap-intro cap-glass">
          <span className="cap-pass">
            <Sparkles size={15} /> After-hours visitor pass
          </span>
          <h1>You found the other chamber.</h1>
          <p>
            Step into a small, improbable Capitol. Follow the marble corridors,
            meet wandering lawmakers, and see what it takes to turn a proposal
            into law.
          </p>
          <div className="cap-intro-facts">
            <span>
              <b>9</b> places to explore
            </span>
            <span>
              <b>16</b> conversations
            </span>
            <span>
              <b>535</b> simulated voting seats
            </span>
          </div>
          <button
            className="cap-primary"
            onClick={() => {
              setIntro(false);
              canvas.current?.focus();
              window.dispatchEvent(new Event('atlas-capitol-enter'));
            }}
            disabled={!ready && !graphicsError}
          >
            {ready
              ? 'Enter the Capitol'
              : graphicsError
                ? 'Open the accessible tour'
                : 'Opening the visitor doors…'}{' '}
            <ArrowRight size={18} />
          </button>
          <button
            className="cap-text"
            onClick={() => {
              setIntro(false);
              setPanel('guide');
              window.dispatchEvent(new Event('atlas-capitol-enter'));
            }}
          >
            Read the field guide first
          </button>
          <p className="cap-music-invitation">
            A tiny fife-and-drum band starts at a gentle volume when you enter.
            Mute or choose the harpsichord salon from the music controls above.
          </p>
          <small>
            The constitutional term is noon Jan. 3, 2027–noon Jan. 3, 2029.
            Future membership and leadership are not yet settled. Every
            conversation and vote in this scene is fictional.
          </small>
        </section>
      )}
      {panel && (
        <div className="cap-overlay">
          <dialog
            open
            className={`cap-panel ${panel === 'vote' ? 'cap-vote-panel' : ''}`}
            aria-modal="true"
            aria-label={
              panel === 'vote'
                ? 'Congressional vote simulator'
                : 'Capitol ' + panel
            }
          >
            <button
              className="cap-close"
              onClick={close}
              aria-label="Close panel"
            >
              <X />
            </button>
            {panel === 'map' && (
              <>
                <p className="cap-eyebrow">Your after-hours route</p>
                <h2>A little republic to wander.</h2>
                <p>
                  The Senate is north, the House south, and the Rotunda is
                  central. Select a place to walk there instantly. Distances and
                  paths are compressed; this is not an authorized visitor route.
                </p>
                <nav
                  className="cap-map"
                  aria-label="Stylized Capitol campus map; north at top"
                >
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      className={visited.includes(z.id) ? 'visited' : ''}
                      style={{
                        left: `${((z.x + 70) / 190) * 100}%`,
                        top: `${((z.z + 95) / 200) * 100}%`,
                      }}
                      onClick={() => travel(z.id)}
                    >
                      {z.id === 'rotunda' ? (
                        <Landmark size={20} />
                      ) : (
                        <span>•</span>
                      )}
                      <b>{z.name.split(' ·')[0]}</b>
                    </button>
                  ))}
                  <span className="cap-north">N ↑</span>
                </nav>
                <div className="cap-place-list">
                  {ZONES.map((z) => (
                    <button key={z.id} onClick={() => travel(z.id)}>
                      <span>{visited.includes(z.id) ? '✓' : '○'}</span>
                      {z.name}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
                <h3>Meet the people</h3>
                <p>
                  Conversations are available here as well as by walking up to a
                  figure.
                </p>
                <div className="cap-people-list">
                  {CHARACTERS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setPanel(null);
                        interact(c.id);
                      }}
                    >
                      <i className={`cap-party-${c.party}`} />
                      {c.name}
                      <small>
                        {c.party === 'staff'
                          ? 'Fictional staff'
                          : `${parties[c.party]} · ${c.state}`}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {panel === 'guide' && (
              <>
                <p className="cap-eyebrow">The pocket field guide</p>
                <h2>Whimsy outside. Procedure inside.</h2>
                <p>
                  This is a single-player, stylized Capitol tour. Walking stick
                  figures, bill text, conversations, vote preferences, and the
                  imagined sitting are original fiction. No line of dialogue is
                  a real quotation or a real person’s policy position.
                </p>
                <div className="cap-guide-grid">
                  <article>
                    <h3>Find your way</h3>
                    <p>
                      WASD walks, Shift walks faster, and dragging looks around.
                      Arrow keys move forward/back or turn. E speaks to a nearby
                      person or reads an exhibit. M opens the map. Escape closes
                      panels and releases the mouse. Touch controls work without
                      mouse capture.
                    </p>
                  </article>
                  <article>
                    <h3>Keep the two chambers separate</h3>
                    <p>
                      There are 435 abstract House seats and 100 Senate seats. A
                      combined 535-person vote cannot pass a bill. The named
                      senators are conversational characters; the roll-call
                      seats are anonymous to avoid inventing real people’s
                      policy positions.
                    </p>
                  </article>
                  <article>
                    <h3>Know what is simplified</h3>
                    <p>
                      Full qualifying membership, fixed chamber balances, a
                      compressed committee process, ordinary legislation,
                      identical text, and explicit quorum checks. Vacancies,
                      amendments on the floor, motions to reconsider,
                      conference, House rules procedures, reconciliation,
                      nominations, treaties, and pocket vetoes are outside this
                      lesson.
                    </p>
                  </article>
                  <article>
                    <h3>Check the identities</h3>
                    <p>
                      Twelve senator identities were verified September 4, 2026.
                      Their scheduled terms extend beyond 2026, but later
                      departures are possible. No 120th leadership role is
                      asserted. King and Sanders remain labelled Independent;
                      Democratic caucus counts are a separate model convention.
                    </p>
                  </article>
                </div>
                <h3>Sources on the visitor desk</h3>
                <div className="cap-source-list">
                  {[
                    ...PROCEDURE_SOURCES,
                    [
                      'Capitol architecture',
                      'https://www.aoc.gov/explore-capitol-campus/buildings-grounds/capitol-building',
                    ],
                    [
                      'Senator identities · Class I',
                      'https://www.senate.gov/senators/Class_I.htm',
                    ],
                    [
                      'Senator identities · Class III',
                      'https://www.senate.gov/senators/Class_III.htm',
                    ],
                    [
                      'Actual visitor information',
                      'https://www.visitthecapitol.gov/us-capitol-visitor-guide',
                    ],
                  ].map(([label, url]) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer">
                      {label} ↗
                    </a>
                  ))}
                </div>
                <button className="cap-secondary" onClick={exportJournal}>
                  <Download size={16} /> Export your session journal
                </button>
              </>
            )}
            {panel === 'settings' && (
              <>
                <p className="cap-eyebrow">A comfortable little universe</p>
                <h2>Make yourself at home.</h2>
                <label
                  className="cap-setting"
                  aria-label="Wandering figures and movement"
                >
                  <span>
                    <b>Wandering figures & gentle movement</b>
                    <small>
                      Starts off when your device requests reduced motion.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={motion}
                    onChange={(e) => setMotion(e.target.checked)}
                  />
                </label>
                <label
                  className="cap-setting"
                  aria-label="Read fictional dialogue aloud"
                >
                  <span>
                    <b>Read fictional dialogue aloud</b>
                    <small>
                      Uses your browser’s ordinary voice; no real-person voice
                      imitation.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={voice}
                    onChange={(e) => {
                      setVoice(e.target.checked);
                      if (!e.target.checked) window.speechSynthesis?.cancel();
                    }}
                  />
                </label>
                <label className="cap-setting" aria-label="Time of day">
                  <span>
                    <b>Time of day</b>
                    <small>Evening lamplight to bright afternoon</small>
                  </span>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.01}
                    value={daylight}
                    onChange={(e) => setDaylight(Number(e.target.value))}
                  />
                </label>
                <p>
                  3D canvas: {state.fps} frames per second. Touch and drag
                  controls work without pointer lock. The menu offers a text
                  route through every room and conversation.
                </p>
                <button
                  className="cap-secondary"
                  onClick={() => travel('grounds')}
                >
                  Return to the West Front
                </button>
                <button className="cap-secondary" onClick={exportJournal}>
                  Download session journal
                </button>
              </>
            )}
            {panel === 'vote' && (
              <>
                <p className="cap-eyebrow">The legislative laboratory</p>
                <h2>A bill needs more than a majority somewhere.</h2>
                <div className="cap-stage-track">
                  {STAGES.slice(0, 5).map((s, i) => (
                    <span
                      key={s[0]}
                      className={
                        stage === i
                          ? 'current'
                          : (
                                i === 0
                                  ? stage > 0
                                  : i === 4
                                    ? rounds.some(
                                        (r) =>
                                          r.stage === 3 && r.assessment.passed,
                                      ) && stage > 4
                                    : rounds.some(
                                        (r) =>
                                          r.stage === i && r.assessment.passed,
                                      )
                              )
                            ? 'done'
                            : ''
                      }
                    >
                      {i + 1}
                      <small>
                        {s[1]}
                        {i === 2 && !contested && stage > 1
                          ? ' · skipped by consent'
                          : ''}
                      </small>
                    </span>
                  ))}
                </div>
                <div className="cap-stage-copy">
                  <span>
                    {stage >= 5 && stage < 7
                      ? 'Veto reconsideration'
                      : `Stage ${Math.min(stage + 1, 5)}`}
                  </span>
                  <h3>{STAGES[stage][1]}</h3>
                  <p>{STAGES[stage][2]}</p>
                </div>
                {stage === 0 && (
                  <>
                    <div className="cap-bills">
                      {BILLS.map((b, i) => (
                        <button
                          key={b.id}
                          className={bill === i ? 'selected' : ''}
                          onClick={() => setBill(i)}
                        >
                          <span>Fictional proposal {i + 1}</span>
                          <b>{b.title}</b>
                          <small>{b.summary}</small>
                        </button>
                      ))}
                    </div>
                    <p className="cap-hearing">
                      <b>At the hearing:</b> {currentBill.debate}
                    </p>
                    <label className="cap-amend">
                      <input
                        type="checkbox"
                        checked={amended}
                        onChange={(e) => setAmended(e.target.checked)}
                      />
                      <span>Committee amendment: {currentBill.amendment}</span>
                    </label>
                    {membershipControls}
                    <label className="cap-setting">
                      <span>
                        Senate route{' '}
                        <small>
                          Cloture is not required for every bill; consent can
                          avoid a contested debate.
                        </small>
                      </span>
                      <select
                        value={contested ? 'contested' : 'consent'}
                        onChange={(e) =>
                          setContested(e.target.value === 'contested')
                        }
                      >
                        <option value="contested">
                          Contested debate: seek cloture
                        </option>
                        <option value="consent">
                          Assume unanimous consent to proceed
                        </option>
                      </select>
                    </label>
                    <button className="cap-primary" onClick={advance}>
                      Report the bill to the House <ArrowRight size={16} />
                    </button>
                  </>
                )}
                {[1, 2, 3, 5, 6].includes(stage) && (
                  <>
                    <div className="cap-bill-caption">
                      <b>{currentBill.title}</b>
                      <span>
                        {amended
                          ? 'With the committee amendment'
                          : 'Original demonstration text'}
                      </span>
                    </div>
                    <div className="cap-vote-workspace">
                      <div className="cap-vote-assumptions">
                        <h3>Your hypothetical support</h3>
                        {[
                          [
                            'Democratic yea preference',
                            demSupport,
                            setDemSupport,
                          ],
                          [
                            'Republican yea preference',
                            repSupport,
                            setRepSupport,
                          ],
                          ['Attendance', attendance, setAttendance],
                          [
                            'Present abstentions among attendees',
                            abstentions,
                            setAbstentions,
                          ],
                        ].map(([label, value, setter]) => (
                          <label key={String(label)}>
                            <span>
                              {String(label)} <b>{Number(value)}%</b>
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={Number(value)}
                              onChange={(e) =>
                                (setter as (n: number) => void)(
                                  Number(e.target.value),
                                )
                              }
                            />
                          </label>
                        ))}
                        <label className="cap-check">
                          <input
                            type="checkbox"
                            checked={vpYea}
                            onChange={(e) => setVpYea(e.target.checked)}
                          />
                          Assume the VP votes yea on a Senate passage tie
                        </label>
                        <p>
                          Support applies among yes/no voters. These are your
                          assumptions, applied symmetrically; they are not
                          inferred real-person preferences. The VP is not part
                          of the Senate quorum and cannot supply a cloture or
                          override supermajority.
                        </p>
                        <label>
                          Session seed{' '}
                          <input
                            type="number"
                            min={0}
                            max={4294967295}
                            value={seed}
                            onChange={(e) =>
                              setSeed(
                                Math.max(
                                  0,
                                  Math.min(
                                    4294967295,
                                    Math.round(Number(e.target.value) || 0),
                                  ),
                                ),
                              )
                            }
                          />
                        </label>
                        <button className="cap-primary" onClick={cast}>
                          {currentRound
                            ? 'Run another hypothetical roll call'
                            : 'Call the roll'}
                        </button>
                      </div>
                      <div className="cap-rollcall">
                        <h3>
                          {phaseChamber(stage) === 'house'
                            ? 'House of Representatives'
                            : 'United States Senate'}
                        </h3>
                        <p>
                          {phaseRule(stage) === 'cloture'
                            ? '60 yeas required with 100 sworn senators'
                            : phaseRule(stage) === 'override'
                              ? 'Two-thirds of yes/no votes, with a quorum'
                              : 'Majority of yes/no votes, with a quorum'}
                        </p>
                        {currentRound ? (
                          <>
                            <div className="cap-vote-numbers">
                              <div>
                                <b>{currentRound.counts.yea}</b>
                                <span>Yea</span>
                              </div>
                              <div>
                                <b>{currentRound.counts.nay}</b>
                                <span>Nay</span>
                              </div>
                              <div>
                                <b>{currentRound.counts.present}</b>
                                <span>Present</span>
                              </div>
                              <div>
                                <b>{currentRound.counts.absent}</b>
                                <span>Absent</span>
                              </div>
                            </div>
                            <figure
                              className={`cap-seat-grid ${currentRound.chamber}`}
                              aria-label={`${currentRound.counts.yea} yea, ${currentRound.counts.nay} nay, ${currentRound.counts.present} present, ${currentRound.counts.absent} absent`}
                            >
                              {currentRound.rows.map((r) => (
                                <span
                                  key={r.seat}
                                  className={`vote-${r.choice}`}
                                  title={`Abstract ${r.party} seat ${r.seat}: ${r.choice}`}
                                />
                              ))}
                            </figure>
                            <div
                              className={`cap-result ${currentRound.assessment.passed ? 'passed' : 'failed'}`}
                            >
                              <b>
                                {!currentRound.assessment.quorum
                                  ? 'No quorum'
                                  : currentRound.assessment.passed
                                    ? 'Agreed to'
                                    : 'Not agreed to'}
                              </b>
                              <p>
                                {currentRound.assessment.attending} present ·{' '}
                                {currentRound.assessment.required} yeas required
                                {currentRound.assessment.tieBreak
                                  ? ' · VP breaks the passage tie'
                                  : ''}
                              </p>
                            </div>
                            {!recordedSettingsMatch ? (
                              <p>
                                Assumptions changed. Call the roll again before
                                continuing.
                              </p>
                            ) : currentRound.assessment.passed ? (
                              <button className="cap-primary" onClick={advance}>
                                {stage === 6
                                  ? 'Record enactment'
                                  : 'Continue to the next stage'}{' '}
                                <ArrowRight size={15} />
                              </button>
                            ) : (
                              <button
                                className="cap-secondary"
                                onClick={endFailed}
                              >
                                Record this outcome
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="cap-empty-roll">
                            <Landmark size={36} />
                            <p>
                              The clerk is ready. Set the assumptions and call
                              the roll.
                            </p>
                            <small>
                              Votes will also recolor the 3D chamber seats.
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {stage === 4 && (
                  <>
                    <div className="cap-presentment">
                      <BookOpen size={44} />
                      <h3>Identical text has passed both chambers.</h3>
                      <p>
                        {currentBill.title} is enrolled and presented to the
                        president. Choose a fictional presidential action; this
                        makes no claim about the real president’s preference.
                      </p>
                      <div>
                        <button
                          className="cap-primary"
                          onClick={() => {
                            setOutcome(
                              'Enacted with a presidential signature after House and Senate passage.',
                            );
                            setStage(7);
                          }}
                        >
                          Sign the bill
                        </button>
                        <button
                          className="cap-secondary"
                          onClick={() => setStage(5)}
                        >
                          Return a regular veto
                        </button>
                      </div>
                      <small>
                        The ten-day and pocket-veto branches are outside this
                        demonstration.
                      </small>
                    </div>
                  </>
                )}
                {stage === 7 && (
                  <div className="cap-presentment">
                    <Landmark size={44} />
                    <h3>
                      {outcome.startsWith('Enacted')
                        ? 'A fictional law reaches the statute book.'
                        : 'This proposal has not become law.'}
                    </h3>
                    <p>{outcome}</p>
                    <p>
                      {rounds.length} roll calls recorded. Every result can be
                      inspected in the session journal.
                    </p>
                    <div>
                      <button className="cap-primary" onClick={exportJournal}>
                        <Download size={16} /> Download the session
                      </button>
                      <button
                        className="cap-secondary"
                        onClick={() => {
                          setStage(0);
                          setRounds([]);
                          setOutcome('');
                        }}
                      >
                        Start a new demonstration
                      </button>
                    </div>
                  </div>
                )}
                {rounds.length > 0 && (
                  <details className="cap-journal">
                    <summary>
                      Session journal · {rounds.length} recorded votes
                    </summary>
                    {rounds.map((r, i) => (
                      <div key={i}>
                        <b>
                          {i + 1}. {STAGES[r.stage][1]}
                        </b>
                        <span>
                          {r.counts.yea}–{r.counts.nay}; {r.counts.present}{' '}
                          present, {r.counts.absent} absent ·{' '}
                          {r.assessment.passed ? 'agreed' : 'not agreed'} · seed{' '}
                          {r.seed}
                        </span>
                      </div>
                    ))}
                  </details>
                )}
                <p className="cap-fine-print">
                  Full qualifying membership is assumed. Quorum is explicitly
                  checked for teaching; in real floor practice it is normally
                  presumed unless its absence is raised. Vote thresholds are
                  based on current procedure, which the 120th Congress may
                  change.
                </p>
              </>
            )}
          </dialog>
        </div>
      )}
      {character && (
        <div className="cap-overlay">
          <dialog
            open
            className="cap-dialogue"
            aria-modal="true"
            aria-label={`Fictional conversation with ${character.name}`}
          >
            <button
              className="cap-close"
              onClick={close}
              aria-label="Close conversation"
            >
              <X />
            </button>
            <div className="cap-person-header">
              <div
                className={`cap-avatar cap-party-${character.party}`}
                aria-hidden="true"
              >
                ○<br />
                ╱│╲
                <br />╱ ╲
              </div>
              <div>
                <span className="cap-fiction-label">
                  Scripted fictional dialogue
                </span>
                <h2>{character.name}</h2>
                <p>
                  {parties[character.party]} · {character.state}
                </p>
                {character.party !== 'staff' && (
                  <small>
                    Current senator verified Sept. 4, 2026 · scheduled term end{' '}
                    {character.termEnd}
                  </small>
                )}
              </div>
              <button
                onClick={() => {
                  setVoice(!voice);
                  if (voice) window.speechSynthesis?.cancel();
                }}
                aria-label={
                  voice ? 'Disable spoken dialogue' : 'Enable browser voice'
                }
              >
                {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
            <div className="cap-chat-log" aria-live="polite">
              {chat.map((line, i) => (
                <div key={i} className={`chat-${line.speaker}`}>
                  <small>
                    {line.speaker === 'you' ? 'You' : 'Fictional dialogue'}
                  </small>
                  <p>{line.text}</p>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div className="cap-topics">
              {[
                'How does cloture work?',
                'What counts as a quorum?',
                'How does a veto work?',
                'Tell me about the tour.',
                'The 120th Congress?',
                'Are these real quotes?',
              ].map((q) => (
                <button key={q} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <input
                aria-label="Ask a procedural question"
                placeholder="Ask about voting, committees, the tour…"
                value={question}
                maxLength={280}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button className="cap-primary" type="submit">
                Ask <ArrowRight size={15} />
              </button>
            </form>
            <p className="cap-fine-print">
              No invented policy position is attributed to this person. This is
              a keyword-based civics conversation.{' '}
              <a href={character.source} target="_blank" rel="noreferrer">
                Check the factual source ↗
              </a>
            </p>
          </dialog>
        </div>
      )}
      {room && (
        <div className="cap-overlay">
          <dialog
            open
            className="cap-room-card cap-panel"
            aria-modal="true"
            aria-label="Room exhibit"
          >
            <button
              className="cap-close"
              onClick={close}
              aria-label="Close exhibit"
            >
              <X />
            </button>
            <p className="cap-eyebrow">An exhibit on your route</p>
            <Landmark size={32} />
            <h2>{ZONES.find((z) => z.id === room)!.name}</h2>
            <p>{ZONES.find((z) => z.id === room)!.fact}</p>
            <a
              href={ZONES.find((z) => z.id === room)!.source}
              target="_blank"
              rel="noreferrer"
            >
              Read the official source ↗
            </a>
            {['house', 'senate', 'committee'].includes(room) && (
              <button
                className="cap-primary"
                onClick={() => {
                  setRoom(null);
                  setPanel('vote');
                }}
              >
                Open the vote simulation
              </button>
            )}
            <p className="cap-fine-print">
              Public geography and institutional facts inform this scene. The
              walkable model simplifies architecture, doors, distances, and
              visitor access.
            </p>
          </dialog>
        </div>
      )}
    </main>
  );
}
