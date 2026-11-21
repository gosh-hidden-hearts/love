/**
 * GOSH Hidden Hearts - Web Audio API Synthesizer for Calling Tones
 * Synthesizes ringtones, dial tones, and status chimes without external audio files.
 */

let audioCtx = null;
let activeLoopInterval = null;
let activeOscillators = [];

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const stopAllCallSounds = () => {
  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {}
  });
  activeOscillators = [];
};

/**
 * Romantic incoming ringtone loop:
 * Pleasant melodic harmonic chime (C5 523Hz -> E5 659Hz -> G5 784Hz)
 */
export const playIncomingRingtone = () => {
  stopAllCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playChimeSequence = () => {
    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: now, dur: 0.25 },       // C5
        { freq: 659.25, time: now + 0.15, dur: 0.25 }, // E5
        { freq: 783.99, time: now + 0.30, dur: 0.4 },  // G5
        { freq: 1046.5, time: now + 0.50, dur: 0.6 }   // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.2, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
        activeOscillators.push(osc);
      });
    } catch (e) {
      console.warn('Call sound error:', e);
    }
  };

  playChimeSequence();
  activeLoopInterval = setInterval(playChimeSequence, 2600);
};

/**
 * WhatsApp-style outgoing dial tone loop:
 * Soft dual frequency (440Hz + 480Hz) pulsing tone
 */
export const playOutgoingDialTone = () => {
  stopAllCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playDialBeep = () => {
    try {
      const now = ctx.currentTime;
      const duration = 1.2;

      [440, 480].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        activeOscillators.push(osc);
      });
    } catch (e) {
      console.warn('Call sound error:', e);
    }
  };

  playDialBeep();
  activeLoopInterval = setInterval(playDialBeep, 3500);
};

/**
 * Call connected chime: quick ascending soft chime
 */
export const playCallConnectedChime = () => {
  stopAllCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {}
};

/**
 * Call ended chime: descending gentle tone
 */
export const playCallEndedChime = () => {
  stopAllCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [659.25, 523.25, 392.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (e) {}
};
