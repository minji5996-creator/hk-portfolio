// Original 32-second D-major loop: soft bells, plucked chords and tiny percussion.
const fs = require('fs');
const rate = 22050, duration = 32, length = rate * duration;
const left = new Float64Array(length), right = new Float64Array(length);
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 73421;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function note(start, midi, seconds, gain, voice, pan = 0) {
  const frequency = hz(midi), first = Math.round(start * rate);
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate, phase = 2 * Math.PI * frequency * t;
    const attack = Math.min(1, t / .008);
    const release = Math.min(1, (seconds - t) / .06);
    const decay = Math.exp(-t * (voice === 'bass' ? 6 : voice === 'bell' ? 4.5 : 9));
    const tone = voice === 'bell'
      ? Math.sin(phase) + .22 * Math.sin(phase * 2) * Math.exp(-t * 9) + .07 * Math.sin(phase * 3)
      : voice === 'bass' ? Math.sin(phase) + .12 * Math.sin(phase * 2)
      : Math.sin(phase) + .24 * Math.sin(phase * 2) + .09 * Math.sin(phase * 3);
    const value = tone * attack * release * decay * gain;
    const index = (first + i) % length;
    left[index] += value * Math.sqrt((1 - pan) / 2);
    right[index] += value * Math.sqrt((1 + pan) / 2);
  }
}
function tick(start, gain, kick = false) {
  const seconds = kick ? .12 : .045, first = Math.round(start * rate);
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate;
    const sound = kick ? Math.sin(2 * Math.PI * (85 * t - 130 * t * t)) : (random() * 2 - 1);
    const value = sound * gain * Math.min(1, t / .003) * Math.exp(-t * (kick ? 35 : 95));
    const index = (first + i) % length;
    left[index] += value * .7; right[index] += value * .7;
  }
}
const chords = [[50,62,66,69],[47,59,62,66],[43,59,62,67],[45,61,64,69]];
const melodies = [
  [74,78,81,78,76,74,78,0], [73,74,78,0,76,74,71,0],
  [74,79,78,76,74,71,74,0], [73,76,81,0,79,78,76,0],
  [78,81,86,81,78,76,74,0], [78,76,74,71,74,78,76,0],
  [79,78,76,74,71,74,78,0], [76,73,69,73,74,0,0,0]
];
for (let bar = 0; bar < 16; bar++) {
  const start = bar * 2, chord = chords[bar % 4];
  for (let step = 0; step < 8; step++) {
    const time = start + step * .25;
    const melody = melodies[bar % 8][step];
    if (melody) note(time, melody, .65, .15, 'bell', .12);
    note(time, chord[1 + step % 3], .32, .058, 'pluck', step % 2 ? -.3 : .3);
    if (step % 2) tick(time, .018);
  }
  note(start, chord[0], .48, .17, 'bass');
  note(start + 1, chord[0] + 7, .36, .1, 'bass');
  tick(start, .075, true); tick(start + 1, .055, true);
  if (bar % 4 === 0) note(start + 1.5, 90, .7, .026, 'bell', -.45);
}
// Gentle stereo echo wraps across the end for a continuous musical loop.
const dryL = left.slice(), dryR = right.slice();
for (let i = 0; i < length; i++) {
  const previous = (i - Math.round(.1875 * rate) + length) % length;
  left[i] += dryR[previous] * .12; right[i] += dryL[previous] * .12;
}
let peak = 0;
for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const scale = .78 / peak;
const wav = Buffer.alloc(44 + length * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 4, 40);
let energy = 0;
for (let i = 0; i < length; i++) {
  // A 4 ms seam taper avoids clicks when the file repeats.
  const fade = Math.min(1, i / (rate * .004), (length - 1 - i) / (rate * .004));
  const l = left[i] * scale * fade, r = right[i] * scale * fade;
  wav.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  energy += l * l + r * r;
}
fs.writeFileSync('assets/clover-pop.wav', wav);
console.log(`Created original loop: ${duration}s, stereo ${rate}Hz, peak 0.78, RMS ${Math.sqrt(energy / (length * 2)).toFixed(3)}`);
