/* BGM and SE. Drop real files on these paths to replace the synthesized stand-ins:
   assets/audio/bgm_title.wav
   assets/audio/bgm_map.wav
   assets/audio/bgm_battle.wav
   assets/audio/bgm_reward.wav
   assets/audio/bgm_gameover.wav
   assets/audio/se_card_hover.wav
   assets/audio/se_card_drag.wav
   assets/audio/se_machine_insert.wav
   assets/audio/se_hit_analog.wav
   assets/audio/se_glitch.wav
   assets/audio/se_printer_type.wav
   assets/audio/se_zippo_click.wav
   assets/audio/se_radio_noise.wav
   assets/audio/se_crt_on.wav
   assets/audio/se_switch.wav
   assets/audio/amb_fan.wav
   machine_insert reuses se_machine_insert.wav (the card-insert buffer).
*/

const AUDIO_FILES = {
  "bgm:title": "assets/audio/bgm_title.wav",
  "bgm:map": "assets/audio/bgm_map.wav",
  "bgm:battle": "assets/audio/bgm_battle.wav",
  "bgm:reward": "assets/audio/bgm_reward.wav",
  "bgm:gameover": "assets/audio/bgm_gameover.wav",
  "se:card_hover": "assets/audio/se_card_hover.wav",
  "se:card_drag": "assets/audio/se_card_drag.wav",
  "se:card_insert": "assets/audio/se_machine_insert.wav",
  "se:hit": "assets/audio/se_hit_analog.wav",
  "se:glitch": "assets/audio/se_glitch.wav",
  "se:heavy_glitch": "assets/audio/se_heavy_glitch.wav",
  "se:printer": "assets/audio/se_printer_type.wav",
  "se:zippo_click": "assets/audio/se_zippo_click.wav",
  "se:radio_noise": "assets/audio/se_radio_noise.wav",
  "se:alarm": "assets/audio/se_alarm.wav",
  "se:crt_on": "assets/audio/se_crt_on.wav",
  "se:switch": "assets/audio/se_switch.wav",
  "amb:fan": "assets/audio/amb_fan.wav",
};

function clampGain(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.seGain = null;
    this._bgmVolume = 0.55;
    this._seVolume = 0.8;
    this.fadeSeconds = 0.7;
    this.wanted = null;
    this.currentName = null;
    this.current = null;
    this.wantedAmb = null;
    this.ambName = null;
    this.amb = null;
    this.buffers = new Map();
    this.raw = new Map();
    this.voices = [];
    this.fadeCount = 0;
    this.booted = false;
    this.booting = null;
    this.loaded = this.preload();
    this.armUnlock();
  }

  get bgmVolume() {
    return this._bgmVolume;
  }

  set bgmVolume(value) {
    this._bgmVolume = clampGain(value);
    if (this.bgmGain) this.bgmGain.gain.value = this._bgmVolume;
  }

  get seVolume() {
    return this._seVolume;
  }

  set seVolume(value) {
    this._seVolume = clampGain(value);
    if (this.seGain) this.seGain.gain.value = this._seVolume;
  }

  get liveVoices() {
    return this.voices.length;
  }

  armUnlock() {
    const poke = () => {
      this.unlock();
    };
    window.addEventListener("pointerdown", poke, true);
    window.addEventListener("keydown", poke, true);
  }

  unlock() {
    this.ensureGraph();
    if (!this.ctx) return Promise.resolve();
    /* A resume started before the gesture can stay pending. Call it again
       inside the gesture so that in-flight boot is allowed to continue. */
    const resume = this.ctx.state === "running" ? null : this.ctx.resume();
    if (this.booted) {
      if (resume) resume.then(() => this.kick()).catch(() => {});
      else this.kick();
      return Promise.resolve();
    }
    if (!this.booting) {
      this.booting = this.boot().then(() => {
        this.booting = null;
      }).catch(() => {
        this.booting = null;
      });
    }
    return this.booting;
  }

  ensureGraph() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.bgmGain = this.ctx.createGain();
    this.seGain = this.ctx.createGain();
    this.bgmGain.gain.value = this._bgmVolume;
    this.seGain.gain.value = this._seVolume;
    this.bgmGain.connect(this.ctx.destination);
    this.seGain.connect(this.ctx.destination);
  }

  async boot() {
    this.ensureGraph();
    if (!this.ctx) return;
    if (this.ctx.state !== "running") await this.ctx.resume();
    if (this.ctx.state !== "running") throw new Error("audio suspended");
    await this.loaded;
    if (this.buffers.size === 0) await this.decodeAll();
    this.booted = true;
    this.kick();
  }

  preload() {
    const jobs = Object.entries(AUDIO_FILES).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));
        this.raw.set(key, await response.arrayBuffer());
      } catch {
        this.raw.set(key, null);
      }
    });
    return Promise.all(jobs);
  }

  async decodeAll() {
    for (const [key, raw] of this.raw) {
      let buffer = null;
      if (raw) {
        try {
          buffer = await this.ctx.decodeAudioData(raw.slice(0));
        } catch {
          buffer = null;
        }
      }
      this.buffers.set(key, buffer || this.synthesize(key));
    }
  }

  synthesize(key) {
    const rate = this.ctx.sampleRate;
    const spec = this.recipe(key);
    const length = Math.max(1, Math.floor(rate * spec.dur));
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const edge = Math.floor(rate * (spec.edge || 0));
    for (let i = 0; i < length; i += 1) {
      const t = i / rate;
      let env = Math.min(1, i / Math.max(1, spec.attack)) * (1 - i / length);
      if (spec.flat) {
        env = 1;
        if (edge > 0) env = Math.min(i, length - 1 - i, edge) / edge;
      }
      const tone = Math.sin(2 * Math.PI * spec.freq * t + spec.bend * t * t);
      const noise = Math.random() * 2 - 1;
      data[i] = (tone * (1 - spec.noise) + noise * spec.noise) * env * spec.gain;
    }
    return buffer;
  }

  recipe(key) {
    const table = {
      "bgm:title": { freq: 110, dur: 2.4, noise: 0.05, gain: 0.12, attack: 400, bend: 0 },
      "bgm:map": { freq: 146, dur: 2.4, noise: 0.04, gain: 0.1, attack: 500, bend: 0 },
      "bgm:battle": { freq: 92, dur: 1.6, noise: 0.08, gain: 0.14, attack: 200, bend: 12 },
      "bgm:reward": { freq: 174, dur: 2.2, noise: 0.03, gain: 0.1, attack: 500, bend: 0 },
      "bgm:gameover": { freq: 70, dur: 2.8, noise: 0.15, gain: 0.12, attack: 300, bend: -8 },
      "se:card_hover": { freq: 1800, dur: 0.045, noise: 0.85, gain: 0.35, attack: 20, bend: 0 },
      "se:card_drag": { freq: 420, dur: 0.16, noise: 0.75, gain: 0.4, attack: 40, bend: -30 },
      "se:card_insert": { freq: 140, dur: 0.28, noise: 0.35, gain: 0.7, attack: 10, bend: -80 },
      "se:hit": { freq: 90, dur: 0.12, noise: 0.25, gain: 0.8, attack: 8, bend: -40 },
      "se:glitch": { freq: 740, dur: 0.18, noise: 0.7, gain: 0.45, attack: 5, bend: 220 },
      "se:heavy_glitch": { freq: 130, dur: 0.75, noise: 1.0, gain: 0.85, attack: 2, bend: 45 },
      "se:alarm": { freq: 920, dur: 0.85, noise: 0.3, gain: 0.8, attack: 2, bend: -260 },
      "se:printer": { freq: 2400, dur: 0.018, noise: 0.55, gain: 0.28, attack: 2, bend: 0 },
      "se:zippo_click": { freq: 2100, dur: 0.04, noise: 0.7, gain: 0.55, attack: 2, bend: -600 },
      "se:radio_noise": { freq: 1800, dur: 0.04, noise: 0.92, gain: 0.2, attack: 1, bend: 40 },
      "se:crt_on": { freq: 62, dur: 0.55, noise: 0.2, gain: 0.5, attack: 90, bend: -10 },
      "se:switch": { freq: 98, dur: 0.22, noise: 0.42, gain: 0.8, attack: 2, bend: -140 },
      "amb:fan": { freq: 58, dur: 2.4, noise: 0.8, gain: 0.2, attack: 1, bend: 0, flat: true, edge: 0.03 },
    };
    return table[key] || { freq: 440, dur: 0.1, noise: 0.2, gain: 0.2, attack: 20, bend: 0 };
  }

  playBgm(name) {
    this.wanted = name || null;
    this.kick();
  }

  playAmbient(name) {
    this.wantedAmb = name || null;
    this.kick();
  }

  stopAmbient() {
    this.playAmbient(null);
  }

  kick() {
    if (!this.booted || !this.ctx || this.ctx.state !== "running") return;
    if (this.wanted !== this.currentName) this.crossTo(this.wanted);
    this.kickAmbient();
  }

  kickAmbient() {
    if (!this.booted || !this.ctx || this.ctx.state !== "running") return;
    if (this.wantedAmb === this.ambName) return;
    this.crossAmbient(this.wantedAmb);
  }

  crossAmbient(name) {
    const now = this.ctx.currentTime;
    const fade = this.fadeSeconds;
    if (this.amb) {
      this.fadeOut(this.amb, now, fade);
      this.amb = null;
      this.ambName = null;
    }
    if (!name) return;
    const buffer = this.buffers.get(`amb:${name}`);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    source.connect(gain).connect(this.bgmGain);
    source.start(now);
    this.amb = { source, gain, name };
    this.ambName = name;
  }

  crossTo(name) {
    const now = this.ctx.currentTime;
    const fade = this.fadeSeconds;
    if (this.current) {
      this.fadeOut(this.current, now, fade);
      this.current = null;
      this.currentName = null;
    }
    if (!name) return;
    const buffer = this.buffers.get(`bgm:${name}`);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    source.connect(gain).connect(this.bgmGain);
    source.start(now);
    this.current = { source, gain, name };
    this.currentName = name;
    this.fadeCount += 1;
  }

  fadeOut(entry, now, fade) {
    const param = entry.gain.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(0, now + fade);
    try {
      entry.source.stop(now + fade + 0.03);
    } catch {
      /* already stopped */
    }
  }

  /* A BufferSource can start only once. Each SE clones a fresh source so overlaps keep ringing. */
  playSE(name) {
    if (!this.booted || !this.ctx || this.ctx.state !== "running") return;
    const key = name === "machine_insert" ? "card_insert" : name;
    const buffer = this.buffers.get(`se:${key}`);
    if (!buffer) return;
    while (this.voices.length >= 32) {
      const oldest = this.voices.shift();
      try { oldest.stop(); } catch { /* already ended */ }
    }
    const voice = this.ctx.createBufferSource();
    voice.buffer = buffer;
    voice.connect(this.seGain);
    voice.onended = () => {
      const index = this.voices.indexOf(voice);
      if (index >= 0) this.voices.splice(index, 1);
    };
    this.voices.push(voice);
    voice.start();
  }
}

window.AudioManager = AudioManager;
window.audioManager = new AudioManager();
