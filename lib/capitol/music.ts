export type Band = 'parade' | 'salon' | 'arcade';
export const BANDS: { id: Band; name: string; description: string }[] = [
  {
    id: 'parade',
    name: 'The 1776 parade',
    description: 'Piccolo, flute, snare rolls & a very earnest bass drum',
  },
  {
    id: 'salon',
    name: 'The candlelit salon',
    description: 'Harpsichord arpeggios, flute & polite percussion',
  },
  {
    id: 'arcade',
    name: '8-bit independence',
    description: 'A tiny square-wave band with enormous tricorne energy',
  },
];
// Original 32-bar march, in D major. These are eighth-note MIDI pitches;
// zero means a rest. No historical recording or copyrighted arrangement.
export const MARCH = [
  [86, 86, 90, 93, 95, 93, 90, 86],
  [88, 90, 91, 88, 90, 86, 85, 0],
  [86, 90, 93, 90, 95, 93, 90, 88],
  [85, 88, 93, 88, 86, 0, 86, 0],
  [93, 93, 95, 97, 95, 93, 90, 86],
  [91, 91, 90, 88, 90, 93, 88, 0],
  [86, 90, 93, 95, 97, 95, 93, 90],
  [88, 85, 88, 93, 86, 0, 0, 0],
  [90, 91, 93, 90, 86, 90, 93, 0],
  [95, 93, 91, 88, 90, 88, 85, 0],
  [86, 88, 90, 93, 95, 97, 95, 93],
  [90, 88, 85, 88, 86, 0, 86, 0],
  [98, 97, 95, 93, 91, 90, 88, 0],
  [97, 95, 93, 90, 88, 90, 93, 0],
  [95, 91, 90, 88, 93, 90, 88, 85],
  [86, 90, 93, 90, 86, 0, 0, 0],
  [93, 90, 86, 90, 93, 95, 97, 0],
  [95, 91, 88, 91, 95, 93, 91, 0],
  [90, 86, 83, 86, 90, 93, 95, 93],
  [88, 85, 81, 85, 88, 0, 93, 0],
  [86, 86, 88, 90, 93, 90, 88, 86],
  [91, 95, 98, 95, 93, 91, 88, 0],
  [90, 93, 97, 93, 95, 93, 90, 88],
  [85, 88, 93, 88, 86, 0, 0, 0],
  [98, 95, 91, 95, 97, 93, 90, 93],
  [95, 91, 88, 91, 93, 90, 86, 90],
  [91, 88, 85, 88, 90, 86, 83, 86],
  [88, 85, 81, 85, 93, 0, 93, 0],
  [86, 90, 93, 97, 98, 97, 95, 93],
  [91, 95, 93, 91, 90, 88, 85, 0],
  [86, 88, 90, 93, 95, 93, 88, 85],
  [86, 93, 90, 86, 86, 0, 0, 0],
];
const ROOTS = [
  62, 69, 62, 69, 62, 67, 62, 69, 62, 67, 62, 69, 67, 62, 69, 62, 62, 67, 59,
  69, 62, 67, 62, 69, 67, 62, 69, 59, 62, 67, 69, 62,
];
const SAMPLE_PITCH = {
  'piccolo-g5-staccato': 91,
  'piccolo-c5-sustain': 84,
  'flute-a4-staccato': 81,
  'harpsichord-c4': 72,
  'snare-f1': 60,
  'bass-drum': 60,
};
export function createBand(onStatus: (s: string) => void) {
  const ctx = new AudioContext();
  const gain = ctx.createGain(),
    compressor = ctx.createDynamicsCompressor();
  gain.gain.value = 0;
  gain.connect(compressor);
  compressor.connect(ctx.destination);
  const buffers = new Map<string, AudioBuffer>();
  const abort = new AbortController();
  let disposed = false,
    enabled = false,
    band: Band = 'parade',
    volume = 0.18,
    duck = false;
  let next = 0,
    step = 0;
  const beat = 60 / 108 / 2;
  const voices = new Set<AudioScheduledSourceNode>();
  const envelope = (time: number, length: number, loudness: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(loudness, time + 0.008);
    g.gain.setValueAtTime(loudness, time + Math.max(0.009, length - 0.04));
    g.gain.linearRampToValueAtTime(0, time + length);
    g.connect(gain);
    return g;
  };
  const note = (
    sample: keyof typeof SAMPLE_PITCH,
    pitch: number,
    t: number,
    length: number,
    loudness: number,
    synth = false,
  ) => {
    const b = buffers.get(sample);
    const node =
      b && !synth ? ctx.createBufferSource() : ctx.createOscillator();
    if (node instanceof AudioBufferSourceNode) {
      node.buffer = b!;
      node.playbackRate.value = 2 ** ((pitch - SAMPLE_PITCH[sample]) / 12);
    } else {
      node.type =
        sample === 'bass-drum'
          ? 'sine'
          : sample === 'snare-f1'
            ? 'triangle'
            : 'square';
      node.frequency.setValueAtTime(
        sample === 'bass-drum'
          ? 85
          : sample === 'snare-f1'
            ? 190
            : 440 * 2 ** ((pitch - 69) / 12),
        t,
      );
      if (sample === 'bass-drum' || sample === 'snare-f1')
        node.frequency.exponentialRampToValueAtTime(35, t + length);
      loudness *= 0.16;
    }
    const g = envelope(t, length, loudness);
    node.connect(g);
    voices.add(node);
    node.onended = () => {
      node.disconnect();
      g.disconnect();
      voices.delete(node);
    };
    node.start(t);
    node.stop(t + length + 0.01);
  };
  const schedule = () => {
    if (disposed || !enabled || document.hidden || ctx.state !== 'running')
      return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.04;
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % MARCH.length,
        at = step % 8,
        pitch = MARCH[bar][at],
        root = ROOTS[bar];
      const arcade = band === 'arcade';
      if (pitch)
        note(
          band === 'salon' ? 'flute-a4-staccato' : 'piccolo-g5-staccato',
          pitch - (band === 'salon' ? 12 : 0),
          next,
          beat * 0.88,
          0.48,
          arcade,
        );
      if (band === 'salon' || step % 2 === 0) {
        const chord = [root, root + 7, root + 12, root + 4];
        note(
          'harpsichord-c4',
          chord[at % 4],
          next,
          beat * 1.8,
          band === 'salon' ? 0.4 : 0.14,
          arcade,
        );
      }
      if (at === 0 || at === 4)
        note(
          'bass-drum',
          60,
          next,
          0.34,
          band === 'salon' ? 0.13 : 0.42,
          arcade,
        );
      if (at === 2 || at === 6)
        note(
          'snare-f1',
          60,
          next,
          0.19,
          band === 'salon' ? 0.12 : 0.34,
          arcade,
        );
      if (band !== 'salon' && bar % 4 === 3 && at >= 6) {
        for (let r = 0; r < 3; r++)
          note(
            'snare-f1',
            60,
            next + (r * beat) / 3,
            0.09,
            0.11 + r * 0.04,
            arcade,
          );
      }
      if (band === 'parade' && bar % 4 === 0 && at === 0)
        note('piccolo-c5-sustain', pitch - 12, next, beat * 3.7, 0.1);
      next += beat;
      step = (step + 1) % (MARCH.length * 8);
    }
  };
  const level = () =>
    gain.gain.setTargetAtTime(
      enabled && !document.hidden ? volume * (duck ? 0.2 : 1) : 0,
      ctx.currentTime,
      0.06,
    );
  const visibility = () => {
    level();
    if (document.hidden) {
      void ctx.suspend().catch(() => {});
    } else if (enabled) {
      void ctx.resume().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', visibility);
  const timer = window.setInterval(schedule, 25);
  void Promise.all(
    Object.keys(SAMPLE_PITCH).map(async (name) => {
      const response = await fetch(`/audio/capitol/${name}.wav`, {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error('Sample unavailable');
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      if (!disposed) buffers.set(name, buffer);
    }),
  )
    .then(() => {
      if (!disposed) onStatus('Versilian instrument band · original march');
    })
    .catch(() => {
      if (!disposed)
        onStatus('Synth fallback · some instrument samples unavailable');
    });
  return {
    play(value: boolean) {
      enabled = value;
      level();
      if (value) {
        next = Math.max(next, ctx.currentTime + 0.05);
        void ctx
          .resume()
          .catch(() => onStatus('Tap the music button to start audio'));
      }
    },
    volume(value: number) {
      volume = Math.max(0, Math.min(1, value));
      level();
    },
    band(value: Band) {
      band = value;
    },
    duck(value: boolean) {
      duck = value;
      level();
    },
    dispose() {
      disposed = true;
      enabled = false;
      clearInterval(timer);
      abort.abort();
      document.removeEventListener('visibilitychange', visibility);
      for (const v of voices) {
        try {
          v.stop();
        } catch {
          /* Already ended. */
        }
      }
      void ctx.close().catch(() => {});
    },
  };
}
