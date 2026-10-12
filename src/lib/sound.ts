// Sons sintetizados na hora (sem arquivos de áudio).
import { useStore } from '../store';

let ctx: AudioContext | null = null;

function beep(freq: number, duration: number, volume: number, type: OscillatorType = 'square', when = 0) {
  if (!useStore.getState().sound) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    // áudio indisponível: segue em silêncio
  }
}

export const tick = () => beep(900, 0.04, 0.05);
export const winSound = (big: boolean) =>
  (big ? [523, 659, 784, 1047] : [523, 784]).forEach((f, i) => beep(f, 0.25, 0.08, 'triangle', i * 0.09));
export const loseSound = () => [220, 165].forEach((f, i) => beep(f, 0.3, 0.07, 'sawtooth', i * 0.12));
