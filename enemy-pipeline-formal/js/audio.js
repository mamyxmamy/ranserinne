/* BGM and SE. Drop real files on these paths to replace the synthesized stand-ins:
   bgm_title.mp3 / bgm_intro.mp3 / bgm_map.mp3 / bgm_battle.mp3 /
   bgm_battle_lowhp.mp3 / bgm_reward.mp3 / bgm_gameover.mp3 (in assets/audio/)
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
   assets/audio/se_heartbeat.wav (v15.3: boss low-HP warning layer)
   assets/audio/amb_fan.wav
   machine_insert reuses se_machine_insert.wav (the card-insert buffer).
*/

const AUDIO_FILES = {
  "bgm:title": "assets/audio/bgm_title.mp3",
  "bgm:intro": "assets/audio/bgm_intro.mp3",
  "bgm:map": "assets/audio/bgm_map.mp3",
  "bgm:battle": "assets/audio/bgm_battle.mp3",
  "bgm:battle_lowhp": "assets/audio/bgm_battle_lowhp.mp3",
  "bgm:reward": "assets/audio/bgm_reward.mp3",
  "bgm:gameover": "assets/audio/bgm_gameover.mp3",
  "bgm:boss": "assets/audio/heartbeat_at_the_gate.mp3",
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
  "se:heartbeat": "assets/audio/se_heartbeat.wav",
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
    this.heartbeatOn = false;
    this.heartbeatPulses = 0;
    this._hbTimer = 0;
    this._hbVoices = [];
    this.fadeCount = 0;
    this.booted = false;
    this.seReady = false;
    this.booting = null;
    this.muted = false;
    try { this.muted = window.localStorage.getItem("enemy-pipeline-formal-muted") === "1"; } catch { /* storage unavailable */ }
    this.loaded = this.preload();
    this.armUnlock();
  }

  setMuted(muted) {
    this.muted = !!muted;
    try { window.localStorage.setItem("enemy-pipeline-formal-muted", this.muted ? "1" : "0"); } catch { /* ignore */ }
    if (this.bgmGain) this.bgmGain.gain.value = this.muted ? 0 : this._bgmVolume;
    if (this.seGain) this.seGain.gain.value = this.muted ? 0 : this._seVolume;
    return this.muted;
  }

  /* 音響穿孔サウンド: ダイヤルアップ様の電子音に続けて金属箔を打ち抜く音。
     intensity はカードのノイズ値（孔の複雑さ）。大きいほど打撃が強く甲高い。 */
  playPunch(intensity = 1) {
    this.ensureGraph();
    if (!this.ctx || !this.seGain) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.seGain);
    // 電子音（ピーーッガガガ…）: 短いトーンの階段＋上昇スイープ
    const chirpGain = ctx.createGain();
    chirpGain.connect(out);
    chirpGain.gain.setValueAtTime(0.0001, t);
    chirpGain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.connect(chirpGain);
    [1180, 1180, 1560, 980, 1740].forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.055));
    osc.frequency.exponentialRampToValueAtTime(2100, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.36);
    // 打ち抜き（ガシャシャン！）: ノイズバースト＋重低音サンプ＋金属ピング
    const pt = t + 0.3;
    const level = Math.min(1, 0.35 + Math.max(0, intensity) * 0.16);
    const dur = 0.16;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600 + intensity * 220;
    bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.value = level;
    src.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    src.start(pt);
    const th = ctx.createOscillator();
    th.type = "sine";
    th.frequency.setValueAtTime(220, pt);
    th.frequency.exponentialRampToValueAtTime(48, pt + 0.14);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(level * 0.9, pt);
    tg.gain.exponentialRampToValueAtTime(0.0001, pt + 0.16);
    th.connect(tg);
    tg.connect(out);
    th.start(pt);
    th.stop(pt + 0.18);
    [2350, 3170].forEach((f, i) => {
      const p = ctx.createOscillator();
      p.type = "sine";
      p.frequency.value = f + intensity * 60;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(level * 0.22, pt);
      pg.gain.exponentialRampToValueAtTime(0.0001, pt + 0.22 + i * 0.05);
      p.connect(pg);
      pg.connect(out);
      p.start(pt);
      p.stop(pt + 0.3);
    });
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
    if (this.seReady) {
      if (resume) resume.then(() => this.kickAmbient()).catch(() => {});
      else this.kickAmbient();
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
    this.bgmGain.gain.value = this.muted ? 0 : this._bgmVolume;
    this.seGain.gain.value = this.muted ? 0 : this._seVolume;
    this.bgmGain.connect(this.ctx.destination);
    this.seGain.connect(this.ctx.destination);
  }

  /* v15.2: 2段構えブート。BGM mp3（実ファイル7曲＋ボス曲）は fetch・デコードが重く、
     全件完了まで待つと SE が実機で数秒〜十数秒無言になる（v15.1 実機報告の主因）。
     先に SE＋環境音（小さな wav 群）だけをデコードして seReady で playSE を解放し、
     BGM は後段デコードが済んでから booted を立てて kick する。
     v15.3: タイトル曲（bgm:title、71.6秒）だけは第1段に含める。クレジットカードの
     タップ時点で確実に再生可能にし、タイトル画面へ BGM が鳴った状態で入るため。 */
  async boot() {
    this.ensureGraph();
    if (!this.ctx) return;
    if (this.ctx.state !== "running") await this.ctx.resume();
    if (this.ctx.state !== "running") throw new Error("audio suspended");
    await this.decodeGroup((key) => key.startsWith("se:") || key.startsWith("amb:") || key === "bgm:title");
    this.seReady = true;
    this.kickAmbient();
    this.kick(); // v15.3: wanted がタイトル曲なら、この時点で開始できる
    await this.decodeGroup((key) => key.startsWith("bgm:"));
    this.booted = true;
    this.kick();
  }

  preload() {
    this.rawJobs = new Map();
    const jobs = Object.entries(AUDIO_FILES).map(([key, url]) => {
      const job = (async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(String(response.status));
          this.raw.set(key, await response.arrayBuffer());
        } catch {
          this.raw.set(key, null);
        }
      })();
      this.rawJobs.set(key, job);
      return job;
    });
    return Promise.all(jobs);
  }

  async decodeKey(key) {
    if (this.buffers.has(key)) return;
    const job = this.rawJobs && this.rawJobs.get(key);
    if (job) await job;
    const raw = this.raw.get(key);
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

  async decodeGroup(pred) {
    for (const key of Object.keys(AUDIO_FILES)) {
      if (pred(key)) await this.decodeKey(key);
    }
  }

  async decodeAll() {
    await this.decodeGroup(() => true);
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
      "bgm:intro": { freq: 98, dur: 2.6, noise: 0.06, gain: 0.11, attack: 600, bend: 4 },
      "bgm:map": { freq: 146, dur: 2.4, noise: 0.04, gain: 0.1, attack: 500, bend: 0 },
      "bgm:battle": { freq: 92, dur: 1.6, noise: 0.08, gain: 0.14, attack: 200, bend: 12 },
      "bgm:battle_lowhp": { freq: 82, dur: 1.5, noise: 0.14, gain: 0.15, attack: 120, bend: 22 },
      "bgm:reward": { freq: 174, dur: 2.2, noise: 0.03, gain: 0.1, attack: 500, bend: 0 },
      "bgm:gameover": { freq: 70, dur: 2.8, noise: 0.15, gain: 0.12, attack: 300, bend: -8 },
      "se:card_hover": { freq: 1800, dur: 0.045, noise: 0.85, gain: 0.35, attack: 20, bend: 0 },
      "se:card_drag": { freq: 420, dur: 0.16, noise: 0.75, gain: 0.4, attack: 40, bend: -30 },
      "se:card_insert": { freq: 140, dur: 0.28, noise: 0.35, gain: 0.7, attack: 10, bend: -80 },
      "se:hit": { freq: 90, dur: 0.12, noise: 0.25, gain: 0.8, attack: 8, bend: -40 },
      "se:glitch": { freq: 740, dur: 0.18, noise: 0.7, gain: 0.45, attack: 5, bend: 220 },
      "se:heavy_glitch": { freq: 130, dur: 0.75, noise: 1.0, gain: 0.85, attack: 2, bend: 45 },
      "se:alarm": { freq: 920, dur: 0.85, noise: 0.3, gain: 0.8, attack: 2, bend: -260 },
      "se:heartbeat": { freq: 55, dur: 1.0, noise: 0.08, gain: 0.55, attack: 8, bend: -18 },
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
    if (!this.ctx || this.ctx.state !== "running") return;
    if (this.wanted !== this.currentName) {
      // v15.3: booted 前でも、wanted トラックのバッファが既にあれば開始できる
      // （第1段で先行デコードしたタイトル曲用）。バッファが無いトラックへの切替は
      // 従来どおり booted 後の kick（boot 完了時）に委ね、再生中の曲も止めない。
      // wanted が null（停止）の場合はバッファ不要なので即座にフェードアウトする。
      const ready = this.booted || !this.wanted || !!this.buffers.get(`bgm:${this.wanted}`);
      if (ready) this.crossTo(this.wanted);
    }
    this.kickAmbient();
  }

  kickAmbient() {
    if (!this.seReady || !this.ctx || this.ctx.state !== "running") return;
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

  /* v15.3: ボス戦の低耐久警告層。BGM（ボス曲）は切り替えず、心拍ループだけを
     SE バスへ重ねる。音源 se_heartbeat.wav は「ドクン」1周期（1.0秒）で、
     周期ごとに新しい BufferSource を起こして再生する（playSE と同じ流儀）。
     SOUND OFF（ミュート）は seGain 経由でそのまま効く。 */
  startHeartbeat() {
    if (this.heartbeatOn) return;
    this.heartbeatOn = true;
    this._heartbeatPulse();
  }

  stopHeartbeat() {
    this.heartbeatOn = false;
    if (this._hbTimer) {
      window.clearTimeout(this._hbTimer);
      this._hbTimer = 0;
    }
    for (const voice of this._hbVoices.splice(0)) {
      try { voice.stop(); } catch { /* already ended */ }
    }
  }

  _heartbeatPulse() {
    if (!this.heartbeatOn) return;
    if (this.seReady && this.ctx && this.ctx.state === "running") {
      const buffer = this.buffers.get("se:heartbeat");
      if (buffer) {
        const voice = this.ctx.createBufferSource();
        voice.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.9;
        voice.connect(gain).connect(this.seGain);
        voice.onended = () => {
          const index = this._hbVoices.indexOf(voice);
          if (index >= 0) this._hbVoices.splice(index, 1);
        };
        this._hbVoices.push(voice);
        voice.start();
        this.heartbeatPulses += 1;
      }
    }
    this._hbTimer = window.setTimeout(() => this._heartbeatPulse(), 1000);
  }

  /* A BufferSource can start only once. Each SE clones a fresh source so overlaps keep ringing. */
  playSE(name) {
    if (!this.seReady || !this.ctx || this.ctx.state !== "running") return;
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
