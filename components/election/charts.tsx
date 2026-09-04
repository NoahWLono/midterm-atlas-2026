/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG and generated seat marks need image semantics; a raster img cannot represent these interactive charts. */
'use client';
import { useState } from 'react';
import type { Simulation } from '@/lib/election/model';
import {
  controlAt,
  marginLabel,
  probabilityLabel,
  histogramBins,
} from '@/lib/election/model';
export function Distribution({ result }: { result: Simulation }) {
  const [hover, setHover] = useState<{
    seat: number;
    end: number;
    count: number;
  } | null>(null);
  const { total, demNeeded, histogram } = result;
  const step = total > 100 ? 3 : 1;
  const min = Math.max(
      0,
      Math.floor((result.dem95Low - (total > 100 ? 12 : 3)) / step) * step,
    ),
    max = Math.min(
      total,
      Math.ceil((result.dem95High + (total > 100 ? 12 : 3)) / step) * step,
    );
  const bins = histogramBins(histogram, min, max, step, demNeeded);
  const peak = Math.max(...bins.map((b) => b.count), 1);
  const x = (v: number) => 50 + ((v - min) / (max - min + 1)) * 670;
  const unit = 670 / (max - min + 1);
  const threshold = x(demNeeded);
  return (
    <div className="distribution">
      <div className="distribution-label">
        <span>More Republican seats</span>
        <span>More Democratic seats</span>
      </div>
      <svg
        viewBox="0 0 770 272"
        role="img"
        aria-label={`Distribution of Democratic seats. Central 80 percent of simulations: ${result.demLow} to ${result.demHigh}.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="50"
              x2="720"
              y1={218 - t * 165}
              y2={218 - t * 165}
              stroke="#e6eaf2"
              strokeDasharray={t ? '3 4' : undefined}
            />
            <text
              x="39"
              y={222 - t * 165}
              textAnchor="end"
              className="axis-text"
            >
              {((100 * peak * t) / result.iterations).toFixed(1)}%
            </text>
          </g>
        ))}
        <rect
          x={x(result.demLow)}
          y="42"
          width={Math.max(0, x(result.demHigh + 1) - x(result.demLow))}
          height="176"
          fill="#6548c7"
          opacity=".035"
        />
        {bins.map((b) => (
          <rect
            key={b.seat}
            x={x(b.seat) + 1}
            y={218 - (b.count / peak) * 165}
            width={Math.max(1, (b.end - b.seat + 1) * unit - 2)}
            height={Math.max(0, (b.count / peak) * 165)}
            fill={b.seat >= demNeeded ? 'var(--dem)' : 'var(--rep)'}
            opacity={hover && hover.seat !== b.seat ? 0.55 : 0.86}
            rx="1.5"
            onMouseEnter={() => setHover(b)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${b.seat}${b.end > b.seat ? `–${b.end}` : ''} D seats: ${((100 * b.count) / result.iterations).toFixed(2)}% of simulations`}</title>
          </rect>
        ))}
        {threshold >= 50 && threshold <= 720 && (
          <g>
            <line
              x1={threshold}
              x2={threshold}
              y1="27"
              y2="225"
              stroke="#443764"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={Math.min(640, Math.max(115, threshold))}
              y="18"
              textAnchor="middle"
              className="axis-text emphasized"
            >
              {demNeeded} for D control
            </text>
          </g>
        )}
        {Array.from({ length: 7 }, (_, i) =>
          Math.round(min + ((max - min) * i) / 6),
        ).map((v, i) => (
          <text
            x={x(v) + unit / 2}
            y="242"
            textAnchor="middle"
            key={i}
            className="axis-text"
          >
            {v}
          </text>
        ))}
        <text x="385" y="267" textAnchor="middle" className="axis-text">
          Democratic caucus seats
        </text>
      </svg>
      <div className="chart-caption">
        <span>
          {hover
            ? `${hover.seat}${hover.end > hover.seat ? `–${hover.end}` : ''} D seats · ${((100 * hover.count) / result.iterations).toFixed(2)}% of simulations`
            : `Each bar groups ${step === 1 ? 'one seat' : `up to ${step} seats`}. Hover for frequency.`}
        </span>
        <span>
          Central 80%:{' '}
          <b>
            {result.demLow}–{result.demHigh}
          </b>
        </span>
      </div>
    </div>
  );
}
export function Sensitivity({
  result,
  environment,
  onChange,
}: {
  result: Simulation;
  environment: number;
  onChange: (v: number) => void;
}) {
  const values = Array.from({ length: 61 }, (_, i) => -15 + i * 0.5);
  const path = values
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${50 + (v + 15) * 21.6},${218 - controlAt(result, v) * 180}`,
    )
    .join(' ');
  const activeX = 50 + (environment + 15) * 21.6;
  return (
    <div>
      <svg
        viewBox="0 0 750 270"
        role="img"
        aria-label="Democratic control probability across national environment scenarios"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="50"
              x2="698"
              y1={218 - t * 180}
              y2={218 - t * 180}
              stroke="#e5e9f2"
              strokeDasharray="3 4"
            />
            <text
              x="39"
              y={222 - t * 180}
              textAnchor="end"
              className="axis-text"
            >
              {t * 100}%
            </text>
          </g>
        ))}
        <path d={`${path} L698,218 L50,218 Z`} fill="#e3eafa" />
        <path d={path} stroke="var(--dem)" strokeWidth="3" fill="none" />
        <line
          x1={activeX}
          x2={activeX}
          y1="28"
          y2="218"
          stroke="var(--primary)"
          strokeDasharray="4 3"
        />
        <circle
          cx={activeX}
          cy={218 - controlAt(result, environment) * 180}
          r="5"
          fill="var(--primary)"
          stroke="white"
          strokeWidth="2"
        />
        {[-15, -10, -5, 0, 5, 10, 15].map((v) => (
          <g key={v}>
            <text
              x={50 + (v + 15) * 21.6}
              y="242"
              textAnchor="middle"
              className="axis-text"
            >
              {marginLabel(v, 0)}
            </text>
            <rect
              x={40 + (v + 15) * 21.6}
              y="25"
              width="20"
              height="225"
              fill="transparent"
              className="svg-hit"
              onClick={() => onChange(v)}
            >
              <title>{`Set environment to ${marginLabel(v)}`}</title>
            </rect>
          </g>
        ))}
        <text x="375" y="266" textAnchor="middle" className="axis-text">
          Hypothetical national two-party margin
        </text>
      </svg>
      <div className="chart-caption">
        <span>Same simulated shocks, different national environment.</span>
        <span>
          D control at this setting:{' '}
          <b>{probabilityLabel(controlAt(result, environment))}</b>
        </span>
      </div>
    </div>
  );
}
export function ProbabilityDots({ p }: { p: number }) {
  return (
    <div
      className="probability-dots"
      role="img"
      aria-label={`${Math.round(p * 100)} out of 100 simulated worlds have Democratic control`}
    >
      {Array.from({ length: 100 }, (_, i) => (
        <i
          key={i}
          className={i < Math.round(p * 100) ? 'dem-dot' : 'rep-dot'}
        />
      ))}
    </div>
  );
}
export function MarginInterval({ mean, sd }: { mean: number; sd: number }) {
  const min = -40,
    max = 40;
  const x = (v: number) =>
    30 + ((Math.max(min, Math.min(max, v)) - min) / 80) * 430;
  return (
    <svg
      className="interval-chart"
      viewBox="0 0 490 88"
      role="img"
      aria-label={`Mean ${marginLabel(mean)}, central 80 percent range ${marginLabel(mean - 1.28155 * sd)} to ${marginLabel(mean + 1.28155 * sd)}`}
    >
      <line
        x1="30"
        x2="460"
        y1="32"
        y2="32"
        stroke="#e5e9f2"
        strokeWidth="12"
      />
      <line
        x1={x(mean - 1.64485 * sd)}
        x2={x(mean + 1.64485 * sd)}
        y1="32"
        y2="32"
        stroke="#bbafdf"
        strokeWidth="12"
      />
      <line
        x1={x(mean - 1.28155 * sd)}
        x2={x(mean + 1.28155 * sd)}
        y1="32"
        y2="32"
        stroke="#8165c1"
        strokeWidth="12"
      />
      <line
        x1={x(0)}
        x2={x(0)}
        y1="12"
        y2="50"
        stroke="#303c54"
        strokeDasharray="3 3"
      />
      <circle
        cx={x(mean)}
        cy="32"
        r="7"
        fill="#35275d"
        stroke="white"
        strokeWidth="2"
      />
      {[-40, -20, 0, 20, 40].map((v) => (
        <text key={v} x={x(v)} y="74" textAnchor="middle" className="axis-text">
          {marginLabel(v, 0)}
        </text>
      ))}
    </svg>
  );
}
export const TILE_GRID: Record<string, [number, number]> = {
  AK: [0, 0],
  ME: [11, 0],
  VT: [10, 1],
  NH: [11, 1],
  WA: [1, 2],
  ID: [2, 2],
  MT: [3, 2],
  ND: [4, 2],
  MN: [5, 2],
  IL: [6, 2],
  WI: [7, 2],
  MI: [8, 2],
  NY: [10, 2],
  MA: [11, 2],
  OR: [1, 3],
  NV: [2, 3],
  WY: [3, 3],
  SD: [4, 3],
  IA: [5, 3],
  IN: [6, 3],
  OH: [7, 3],
  PA: [8, 3],
  NJ: [9, 3],
  CT: [10, 3],
  RI: [11, 3],
  CA: [1, 4],
  UT: [2, 4],
  CO: [3, 4],
  NE: [4, 4],
  MO: [5, 4],
  KY: [6, 4],
  WV: [7, 4],
  VA: [8, 4],
  MD: [9, 4],
  DE: [10, 4],
  AZ: [2, 5],
  NM: [3, 5],
  KS: [4, 5],
  AR: [5, 5],
  TN: [6, 5],
  NC: [7, 5],
  SC: [8, 5],
  OK: [4, 6],
  LA: [5, 6],
  MS: [6, 6],
  AL: [7, 6],
  GA: [8, 6],
  HI: [0, 7],
  TX: [4, 7],
  FL: [9, 7],
};
export function StateGrid({
  values,
  selected,
  onSelect,
}: {
  values: Record<string, { p: number; count: number; label: string }>;
  selected: string;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="state-grid" aria-label="Schematic United States state grid">
      {Object.entries(TILE_GRID).map(([s, [col, row]]) => {
        const v = values[s];
        return (
          <button
            key={s}
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
              background: !v
                ? '#eef1f7'
                : v.p > 0.5
                  ? `rgba(34,97,189,${0.18 + 0.8 * (v.p - 0.5) * 2})`
                  : `rgba(195,64,81,${0.18 + 0.8 * (0.5 - v.p) * 2})`,
              color: v && Math.abs(v.p - 0.5) > 0.28 ? 'white' : '#25314b',
            }}
            className={selected === s ? 'selected' : ''}
            onClick={() => onSelect(selected === s ? 'all' : s)}
            title={
              v ? `${s} · ${v.label}` : `${s} · no Senate race in this model`
            }
            aria-label={
              v
                ? `${s}: ${v.label}; filter races`
                : `${s}: no Senate race; filter races`
            }
          >
            {s}
            {v && v.count > 1 && <small>{v.count}</small>}
          </button>
        );
      })}
    </div>
  );
}
