type Vowel = "a" | "e" | "i" | "o" | "u";

type LeadNote = {
  m: number;
  b: number;
  v: Vowel;
  li: number;
  syl: string;
};

const LINES = [
  "Огонёк на крыше",
  "Шляпа, плащ и танцы",
  "Лови монетки",
  "Строй дом — пой со мной",
];

const LEAD: LeadNote[] = [
  { m: 72, b: 0.5, v: "o", li: 0, syl: "О" },
  { m: 74, b: 0.5, v: "o", li: 0, syl: "го" },
  { m: 76, b: 0.5, v: "o", li: 0, syl: "нёк" },
  { m: 79, b: 0.5, v: "a", li: 0, syl: "на" },
  { m: 76, b: 0.5, v: "i", li: 0, syl: "кры" },
  { m: 74, b: 1, v: "e", li: 0, syl: "ше" },
  { m: 79, b: 0.5, v: "a", li: 1, syl: "Шля" },
  { m: 77, b: 0.5, v: "a", li: 1, syl: "па" },
  { m: 76, b: 0.5, v: "a", li: 1, syl: "плащ" },
  { m: 74, b: 0.5, v: "i", li: 1, syl: "и" },
  { m: 72, b: 0.5, v: "a", li: 1, syl: "тан" },
  { m: 74, b: 1, v: "i", li: 1, syl: "цы" },
  { m: 67, b: 0.5, v: "o", li: 2, syl: "Ло" },
  { m: 72, b: 0.5, v: "i", li: 2, syl: "ви" },
  { m: 76, b: 0.5, v: "o", li: 2, syl: "мо" },
  { m: 79, b: 0.5, v: "e", li: 2, syl: "нет" },
  { m: 76, b: 1, v: "i", li: 2, syl: "ки" },
  { m: 74, b: 0.5, v: "o", li: 3, syl: "Строй" },
  { m: 76, b: 0.5, v: "o", li: 3, syl: "дом" },
  { m: 77, b: 0.5, v: "o", li: 3, syl: "пой" },
  { m: 76, b: 0.5, v: "o", li: 3, syl: "со" },
  { m: 74, b: 0.5, v: "o", li: 3, syl: "мной" },
  { m: 72, b: 1.5, v: "u", li: 3, syl: "♪" },
];

const BPM = 108;
const BEAT = 60 / BPM;
const CHORDS = [48, 43, 45, 41];

const FORMANTS: Record<Vowel, [number, number]> = {
  a: [800, 1200],
  e: [450, 2100],
  i: [320, 2600],
  o: [520, 900],
  u: [360, 720],
};

type Event = LeadNote & { t: number; dur: number };

const events: Event[] = [];
let loopDur = 0;
{
  let t = 0;
  for (const note of LEAD) {
    const dur = note.b * BEAT;
    events.push({ ...note, t, dur });
    t += dur;
  }
  loopDur = t;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let playing = false;
let muted = false;
let songStart = 0;
let nextK = 0;
let boundVis = false;

function midiToHz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function ensure() {
  if (!ctx) ctx = new AudioContext({ latencyHint: "interactive" });
  if (master) return;
  master = ctx.createGain();
  master.gain.value = muted ? 0.0001 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 2.4;
  comp.attack.value = 0.008;
  comp.release.value = 0.18;
  master.connect(comp);
  comp.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  musicBus.connect(master);
  sfxBus.connect(master);
  const len = Math.floor(ctx.sampleRate * 0.25);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
}

function tone(
  when: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  bus: GainNode,
  slideTo?: number,
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), when + dur);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + Math.min(0.03, dur * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(when);
  osc.stop(when + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function sing(ev: Event, when: number) {
  if (!ctx || !musicBus) return;
  const [f1, f2] = FORMANTS[ev.v];
  const osc = ctx.createOscillator();
  const body = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const b1 = ctx.createBiquadFilter();
  const b2 = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const freq = midiToHz(ev.m);
  osc.type = "triangle";
  body.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  body.frequency.setValueAtTime(freq * 0.5, when);
  lfo.frequency.value = 5.4;
  lfoGain.gain.value = freq * 0.012;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  b1.type = "peaking";
  b1.frequency.value = f1;
  b1.Q.value = 6;
  b1.gain.value = 7;
  b2.type = "peaking";
  b2.frequency.value = f2;
  b2.Q.value = 7;
  b2.gain.value = 5;
  const dur = Math.max(0.12, ev.dur * 0.96);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.11, when + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.35;
  osc.connect(b1);
  body.connect(bodyGain);
  bodyGain.connect(b1);
  b1.connect(b2);
  b2.connect(gain);
  gain.connect(musicBus);
  osc.start(when);
  body.start(when);
  lfo.start(when);
  const stop = when + dur + 0.03;
  osc.stop(stop);
  body.stop(stop);
  lfo.stop(stop);
  osc.onended = () => {
    osc.disconnect();
    body.disconnect();
    lfo.disconnect();
    lfoGain.disconnect();
    b1.disconnect();
    b2.disconnect();
    gain.disconnect();
    bodyGain.disconnect();
  };
}

function scheduleAt(index: number, when: number) {
  if (!ctx || !musicBus) return;
  const ev = events[index % events.length];
  if (when < ctx.currentTime - 0.04) return;
  sing(ev, when);
  if (index % 4 === 0) {
    const root = midiToHz(CHORDS[Math.floor(index / 4) % CHORDS.length]);
    tone(when, root, BEAT * 1.8, "sine", 0.055, musicBus);
    tone(when, root * 1.5, BEAT * 1.6, "triangle", 0.018, musicBus);
    tone(when, root * 2, BEAT * 1.5, "sine", 0.012, musicBus);
  }
}

export function unlockAudio() {
  ensure();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (!playing) {
    playing = true;
    songStart = ctx.currentTime + 0.08;
    nextK = 0;
  }
  if (!boundVis && typeof document !== "undefined") {
    boundVis = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && ctx && ctx.state === "suspended") {
        void ctx.resume();
      }
    });
  }
}

export function setMusicMuted(next: boolean) {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0.0001 : 0.9, ctx.currentTime, 0.03);
}

export function toggleMusicMuted() {
  setMusicMuted(!muted);
  return muted;
}

export function isMusicMuted() {
  return muted;
}

export type LyricNow = { mouth: number; line: string; syl: string };

export function pollAudio(): LyricNow {
  if (!playing || !ctx) return { mouth: 0, line: "", syl: "" };
  const t = ctx.currentTime;
  let guard = 0;
  while (guard++ < 8) {
    const ev = events[nextK % events.length];
    const loopIndex = Math.floor(nextK / events.length);
    const when = songStart + loopIndex * loopDur + ev.t;
    if (when > t + 0.2) break;
    scheduleAt(nextK, when);
    nextK++;
  }
  const ph = (((t - songStart) % loopDur) + loopDur) % loopDur;
  let active = events[0];
  for (const ev of events) {
    if (ev.t <= ph + 0.02) active = ev;
  }
  const u = (ph - active.t) / active.dur;
  const mouth = u >= 0 && u <= 1 ? Math.sin(u * Math.PI) : 0;
  return { mouth, line: LINES[active.li] ?? "", syl: active.syl };
}

export function sfxCoin() {
  if (!ctx || !sfxBus || !playing) return;
  const when = ctx.currentTime;
  const wobble = 0.94 + Math.random() * 0.12;
  tone(when, 860 * wobble, 0.09, "sine", 0.08, sfxBus, 1280 * wobble);
  tone(when + 0.06, 1280 * wobble, 0.12, "triangle", 0.05, sfxBus);
}

export function sfxPlace() {
  if (!ctx || !sfxBus || !playing || !noiseBuf) return;
  const when = ctx.currentTime;
  tone(when, 180, 0.09, "sine", 0.07, sfxBus, 90);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 420;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxBus);
  src.start(when);
  src.stop(when + 0.1);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

export function sfxDeny() {
  if (!ctx || !sfxBus || !playing) return;
  tone(ctx.currentTime, 196, 0.16, "triangle", 0.05, sfxBus, 110);
}

export function sfxFanfare() {
  if (!ctx || !sfxBus || !playing) return;
  const bus = sfxBus;
  const when = ctx.currentTime;
  [523, 659, 784, 1046].forEach((freq, i) => {
    tone(when + i * 0.09, freq, 0.22, "triangle", 0.07, bus);
  });
}
