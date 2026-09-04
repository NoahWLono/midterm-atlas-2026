'use client';
import { useState } from 'react';
import { RotateCcw, ArrowUpRight } from 'lucide-react';
import ratings from '@/lib/election/house-ratings.json';
export function HousePaths() {
  const [assigned, setAssigned] = useState<Record<string, 'D' | 'R'>>({});
  const tossups = ratings.races.filter((r) => r.rating === 'Toss Up');
  const d = 205 + Object.values(assigned).filter((x) => x === 'D').length,
    r = 209 + Object.values(assigned).filter((x) => x === 'R').length,
    u = 435 - d - r;
  return (
    <section className="house-paths panel" id="house-paths">
      <div className="section-title">
        <div>
          <span className="tag">2026 ratings map · August 25 snapshot</span>
          <h2>Build a path to 218.</h2>
        </div>
        <button className="outline-button" onClick={() => setAssigned({})}>
          <RotateCcw size={15} />
          Reset assignments
        </button>
      </div>
      <p className="muted">
        Cook’s categories put 205 seats on the Democratic side, 209 on the
        Republican side, and 21 in Toss Up. Assume every non-tossup follows its
        rating, then assign the remaining races. This is seat arithmetic, not a
        probability model.
      </p>
      <div className="path-summary">
        <div className="dem-text">
          <strong>{d}</strong>
          <span>Democratic</span>
        </div>
        <div className="unassigned">
          <strong>{u}</strong>
          <span>Unassigned</span>
        </div>
        <div className="rep-text">
          <strong>{r}</strong>
          <span>Republican</span>
        </div>
      </div>
      <div className="path-bar">
        <span style={{ width: `${(d / 435) * 100}%` }} className="dem-dot" />
        <span style={{ width: `${(u / 435) * 100}%` }} />
        <span style={{ width: `${(r / 435) * 100}%` }} className="rep-dot" />
        <i style={{ left: `${(218 / 435) * 100}%` }} />
      </div>
      <output className="path-needed">
        <span>
          {d >= 218
            ? 'Democratic majority assigned'
            : 218 - d > u
              ? 'D cannot reach 218 under these assignments'
              : `D need ${218 - d} of ${u} remaining`}
        </span>
        <b>218 for a majority</b>
        <span>
          {r >= 218
            ? 'Republican majority assigned'
            : 218 - r > u
              ? 'R cannot reach 218 under these assignments'
              : `R need ${218 - r} of ${u} remaining`}
        </span>
      </output>
      <div className="tossup-grid">
        {tossups.map((x) => (
          <div key={x.id} className="tossup-assignment">
            <strong>{x.id}</strong>
            <fieldset aria-label={`${x.id} outcome`}>
              <button
                aria-pressed={assigned[x.id] === 'D'}
                className={assigned[x.id] === 'D' ? 'assigned-d' : ''}
                onClick={() =>
                  setAssigned((a) => {
                    const n = { ...a };
                    if (n[x.id] === 'D') delete n[x.id];
                    else n[x.id] = 'D';
                    return n;
                  })
                }
              >
                D
              </button>
              <button
                aria-pressed={assigned[x.id] === 'R'}
                className={assigned[x.id] === 'R' ? 'assigned-r' : ''}
                onClick={() =>
                  setAssigned((a) => {
                    const n = { ...a };
                    if (n[x.id] === 'R') delete n[x.id];
                    else n[x.id] = 'R';
                    return n;
                  })
                }
              >
                R
              </button>
            </fieldset>
          </div>
        ))}
      </div>
      <details className="plain-details">
        <summary>
          Inspect all seven rating categories and the lean races
        </summary>
        <div className="ratings-summary">
          {Object.entries(ratings.summary).map(([label, n]) => (
            <div key={label}>
              <strong>{n}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p>
          Lean D:{' '}
          {ratings.races
            .filter((r) => r.rating === 'Lean D')
            .map((r) => r.id)
            .join(', ')}
          .
        </p>
        <p>
          Lean R:{' '}
          {ratings.races
            .filter((r) => r.rating === 'Lean R')
            .map((r) => r.id)
            .join(', ')}
          .
        </p>
        <p>
          Races outside Toss Up can change hands. This exercise deliberately
          fixes those outcomes to isolate a simple path. The underlying
          categories are qualitative and do not imply any fixed numerical win
          probability.
        </p>
      </details>
      <a
        className="source-link"
        href={ratings.source}
        target="_blank"
        rel="noreferrer"
      >
        The Cook Political Report · original dated House ratings{' '}
        <ArrowUpRight size={14} />
      </a>
      <p className="footnote">
        Retrieved September 4 from indexed text of the publisher’s page; direct
        retrieval was restricted. Individual Solid/Likely race rows are not
        included. These 2026 district labels are not silently joined to
        historical district boundaries.
      </p>
    </section>
  );
}
