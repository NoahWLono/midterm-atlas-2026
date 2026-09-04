'use client';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { FlaskConical, RotateCcw, ChevronDown, Share2 } from 'lucide-react';
import { useElectionData } from '@/lib/live/context';
import { DEFAULTS, marginLabel, type Scenario } from '@/lib/election/model';
export function Parameter({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
  format,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  description?: string;
}) {
  return (
    <div className="parameter">
      <div className="parameter-heading">
        <label>{label}</label>
        <output>{format ? format(value) : `${value.toFixed(1)} pp`}</output>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      {description && <p>{description}</p>}
    </div>
  );
}
export function Controls({
  scenario,
  onChange,
  onShare,
  onAnchor,
  busy,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  onShare: () => void;
  onAnchor: () => void;
  busy: boolean;
}) {
  const { bundle } = useElectionData();
  const patch = (key: keyof Scenario, v: number | boolean) =>
    onChange({ ...scenario, [key]: v });
  return (
    <aside className="panel lab-panel">
      <div className="control-top">
        <span className="tag">
          <FlaskConical size={15} />
          Scenario lab
        </span>
        <button
          className="icon-button"
          title="Restore baseline settings"
          aria-label="Restore baseline settings"
          onClick={() => {
            onChange({
              ...DEFAULTS,
              environment: bundle.referenceEnvironment,
              referenceEnvironment: bundle.referenceEnvironment,
              overrides: {},
            });
            onAnchor();
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <h2>What if the electorate shifts?</h2>
      <p className="muted">
        Move the national margin. Every race responds; the simulations update
        together.
      </p>
      <div
        className={`slider-value ${scenario.environment > 0 ? 'dem-text' : scenario.environment < 0 ? 'rep-text' : ''}`}
      >
        {marginLabel(scenario.environment)}
      </div>
      <Slider
        aria-label="National Democratic minus Republican two-party margin"
        min={-15}
        max={15}
        step={0.5}
        value={[scenario.environment]}
        onValueChange={(v) => patch('environment', Array.isArray(v) ? v[0] : v)}
      />
      <div className="slider-labels">
        <span>R +15</span>
        <span>Even</span>
        <span>D +15</span>
      </div>
      <div className="preset-row">
        <button onClick={() => patch('environment', -5)}>R +5</button>
        <button onClick={() => patch('environment', 0)}>Even</button>
        <button onClick={() => patch('environment', 5)}>D +5</button>
        <button onClick={onAnchor}>Evidence anchor</button>
      </div>
      <p className="anchor-note">
        Anchor: {bundle.anchorPollIds.length} selected firms over 30 days,
        latest eligible wave per firm. Sample size capped at 1,500; 14-day
        recency half-life. D/R normalized; no fitted pollster effects.
      </p>
      <div className="switch-row">
        <div>
          <label htmlFor="poll-toggle">Use selected Senate polls</label>
          <small>Partial coverage; view evidence below</small>
        </div>
        <Switch
          id="poll-toggle"
          checked={scenario.usePolls}
          onCheckedChange={(v) => patch('usePolls', v)}
        />
      </div>
      <details className="advanced">
        <summary>
          Uncertainty assumptions <ChevronDown size={15} />
        </summary>
        <Parameter
          label="National shared error"
          value={scenario.nationalSigma}
          min={0}
          max={8}
          onChange={(v) => patch('nationalSigma', v)}
          description="One shock moves every race in the same direction."
        />
        <Parameter
          label="Regional shared error"
          value={scenario.regionalSigma}
          min={0}
          max={6}
          onChange={(v) => patch('regionalSigma', v)}
          description="A common shock within each Census region."
        />
        <Parameter
          label="Race-specific error"
          value={scenario.localSigma}
          min={1}
          max={12}
          onChange={(v) => patch('localSigma', v)}
          description="Residual uncertainty, before data-quality penalties."
        />
        <label className="seed-label">
          Random seed{' '}
          <input
            type="number"
            min="0"
            max="4294967295"
            value={scenario.seed}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 0 && v <= 4294967295)
                patch('seed', Math.floor(v));
            }}
          />
        </label>
        <p className="anchor-note">
          Scales are analyst-set standard deviations, not fitted parameters.
          Preset seed makes runs reproducible.
        </p>
      </details>
      <button className="share-button" onClick={onShare}>
        <Share2 size={15} />
        Copy this scenario
      </button>
      <output className="model-status">
        <span className={busy ? 'status-busy' : ''} />
        {busy
          ? 'Recalculating 10,000 model worlds…'
          : '10,000 correlated model worlds'}
      </output>
    </aside>
  );
}
