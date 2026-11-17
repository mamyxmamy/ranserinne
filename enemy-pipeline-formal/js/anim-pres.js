/* 戦闘演出プレゼンテーション層（BATTLE-ANIM JOB 0-1）
   設計正本: design/DESIGN-BATTLE-ANIM-DRAFT.md §1.2〜§1.4（確定版）／判断記録 U-6／U-10〜U-13
   役割: Battle エンジン（js/battle.js）の同期解決結果を受け取り、「イベント列」へ変換して
   時系列で再生する。表示用 HP／BLK／スタンを論理値と分離し、命中フェーズで一致させる。
   エンジン（数値・確率・効果）には一切触れない。イベント列インターフェースの確定形は
   design/BATTLE-ANIM-JOB0-1-MEMO.md を参照。 */
(function (root) {
  "use strict";

  // ==== 時系列定数（秒・×1。設計 §1.2／§1.3）====
  const FULL_CYCLE = 0.6;     // 通常手の総尺（絶対上限）
  const HIT_AT = 0.3;         // 1ヒット目の命中点
  const SHORT_CYCLE = 0.25;   // 多段ヒット2発目以降の短縮サイクル（U-10: 敵側規則の鏡像）
  const SHORT_HIT_AT = 0.1;   // 短縮サイクル内の命中点
  const COMP_CYCLE = 0.18;    // 間引き③: 多段サイクル圧縮後（U-11）
  const COMP_HIT_AT = 0.06;
  const NON_ATTACK_DUR = 0.4; // 非攻撃・防御・回復などの短縮形
  const NON_ATTACK_AT = 0.2;
  const TRAP_DUR = 0.5;       // 罠1個の発動（§1.3）
  const TRAP_AT = 0.25;
  const TRAP_OVERLAP = 0.15;  // 罠の連鎖再生の重なり
  const TRAP_CHAIN_CAP = 1.2; // 罠連鎖の合計上限
  const BOUNDARY_DUR = 0.3;   // フェイズ境界イベントの短縮形（U-13）
  const BOUNDARY_AT = 0.15;
  const DOWN_DUR = 0.5;       // 撃破（決着として通常手の0.6秒枠の外）
  const DOWN_AT = 0.1;
  const HITSTOP = 0.06;       // ヒットストップ60msは C フェーズの内数（総尺へ加算しない。§1.4）
  const ENEMY_PHASE_CAP = 2.0; // 敵フェイズ総尺上限 ×1（U-11）

  // (a) カード定義 effects のうち「敵へのダメージ」として扱う種別（参照系・変換系は解決後の type が
  // damage へ寄せられる前段の定義名でも拾う。実際の解決値は (d) スナップショット差分で確定させる）
  const DAMAGE_TYPES = new Set([
    "damage", "damage_per_noise", "damage_plus_noise", "damage_plus_played",
    "damage_per_exhausted", "damage_stance_bonus", "damage_stun_bonus",
    "damage_if_hand_le", "damage_hold_bonus", "damage_per_negative_noise",
    "damage_silence_bonus",
  ]);

  // ==== 表示状態（論理値と分離した表示用 HP／BLK／スタン）====
  let liveState = null;   // 論理状態（battle）への参照
  let display = null;     // { php, pblock, ehp, eblock, estun }
  let displayActive = false;
  let renderer = null;    // main.js が登録する表示レンダラ
  let playing = false;
  let speed = 1;          // 演出速度（×1／×2。設定 UI と保存は JOB 0-2 が結線）
  let currentEvent = null;
  const activeEvents = new Set(); // 再生中のイベント（罠の連鎖など並行分を含む。スキップ対象）
  let skipRequested = false;      // 現在のタイムライン全体へのスキップ要求（JOB 0-2 で意味を拡張）

  function snapshot(state) {
    return {
      php: state.player.hp,
      pblock: state.player.block || 0,
      ehp: state.enemy.hp,
      eblock: state.enemy.block || 0,
      estun: state.enemy.stun || 0,
    };
  }

  function render() {
    if (renderer && display) renderer({ ...display });
  }

  function bindRenderer(fn) { renderer = fn; }

  // 表示を before スナップショットに留めて分離を開始する
  function begin(state, snap) {
    liveState = state;
    display = { ...snap };
    displayActive = true;
    render();
  }

  // renderCombat の末尾から呼ばれる: 分離中に論理値とずれていれば表示値を優先描画する
  function applyDisplay() {
    if (!displayActive || !liveState || !display) return;
    const l = snapshot(liveState);
    if (display.php !== l.php || display.pblock !== l.pblock || display.ehp !== l.ehp
      || display.eblock !== l.eblock || display.estun !== l.estun) render();
  }

  // 分離の終了: 表示を論理値へ完全一致させる
  function finishDisplay() {
    if (liveState) display = snapshot(liveState);
    displayActive = false;
    render();
  }

  function applyStep(step) {
    if (!step || !display) return;
    Object.assign(display, step);
    render();
  }

  // ==== 再生器（AnimTimeline 本体。JS 駆動で CSS アニメーションの再生状態に依存しない）====
  function reducedMotion() {
    try {
      return typeof window !== "undefined" && !!window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      return false;
    }
  }

  function delay(ms, ev) {
    return new Promise((resolve) => {
      if (ms <= 0 || reducedMotion() || skipRequested || (ev && ev.__skip)) { resolve(); return; }
      const wait = ms / Math.max(0.05, speed);
      const t0 = performance.now();
      const id = setInterval(() => {
        if (skipRequested || (ev && ev.__skip) || performance.now() - t0 >= wait) {
          clearInterval(id);
          resolve();
        }
      }, 8);
    });
  }

  function fireFx(ev, hooks) {
    if (!ev.fx || !hooks || !hooks.onFx) return;
    for (const name of Object.keys(ev.fx)) {
      if (ev.fx[name]) hooks.onFx(name, ev);
    }
  }

  // JOB 1-3: ステップ適用の通知フック。表示値の前後差分（prev／next）を渡し、
  // エフェクト層（数字ポップ／ポーズ／盾）が差分から描画できるようにする。
  // フック側の例外で時系列を止めないため、呼び出しは必ず try/catch で包む。
  function applyStepFx(step, ev, hooks, meta) {
    if (!step || !display) return;
    const prev = { ...display };
    applyStep(step);
    if (hooks && hooks.onStep) {
      try {
        hooks.onStep({ ev, prev, next: { ...display }, ...(meta || {}) });
      } catch (err) { /* エフェクト失敗は時系列へ波及させない */ }
    }
  }

  function fireHook(hooks, name, arg) {
    if (!hooks || !hooks[name]) return;
    try { hooks[name](arg); } catch (err) { /* 同上 */ }
  }

  async function playEvent(ev, hooks) {
    currentEvent = ev;
    activeEvents.add(ev);
    fireHook(hooks, "onEventStart", ev);
    try {
      await playEventBody(ev, hooks);
    } finally {
      // スキップ・打ち切り時も必ず終了フックを打ち、ポーズ復帰を保証する
      fireHook(hooks, "onEventEnd", ev);
      activeEvents.delete(ev);
    }
  }

  async function playEventBody(ev, hooks) {
    const firstAt = ev.hits && ev.hits.length ? ev.hits[0].at
      : (typeof ev.applyAt === "number" ? ev.applyAt : 0);
    const items = [];
    (ev.logLines || []).forEach((entry) => items.push({
      at: firstAt, ord: 0,
      fn: () => { if (hooks.onLog) hooks.onLog(entry, ev); },
    }));
    (ev.hits || []).forEach((hit, hi) => items.push({
      at: hit.at, ord: 1,
      fn: () => { applyStepFx(hit.step, ev, hooks, { hitIndex: hi }); if (hi === 0) fireFx(ev, hooks); },
    }));
    if (!ev.hits || !ev.hits.length) {
      items.push({
        at: firstAt, ord: 1,
        fn: () => { if (ev.step) applyStepFx(ev.step, ev, hooks, { hitIndex: -1 }); fireFx(ev, hooks); },
      });
    }
    if (ev.endStep) items.push({
      at: ev.dur, ord: 2,
      fn: () => applyStepFx(ev.endStep, ev, hooks, { hitIndex: -2, end: true }),
    });
    items.sort((a, b) => (a.at - b.at) || (a.ord - b.ord));
    let clock = 0;
    for (let i = 0; i < items.length; i += 1) {
      await delay((items[i].at - clock) * 1000, ev);
      clock = items[i].at;
      items[i].fn();
      if (ev.__skip || skipRequested) {
        for (let j = i + 1; j < items.length; j += 1) items[j].fn();
        return;
      }
    }
    await delay((ev.dur - clock) * 1000, ev);
  }

  // イベント列を再生する。startOffset を持つイベント（罠の連鎖）は前イベントの開始から
  // その秒数だけ遅れて並行開始する。fatal なイベントが完了したら残りは再生しない
  // （§1.3 敗北時の打ち切り）。完了時は表示を論理値へ完全一致させる。
  async function play(events, hooks) {
    hooks = hooks || {};
    if (playing || !events || !events.length) return;
    playing = true;
    skipRequested = false;
    const inflight = [];
    try {
      for (let i = 0; i < events.length; i += 1) {
        const ev = events[i];
        inflight.push(playEvent(ev, hooks));
        const next = events[i + 1];
        if (next && typeof next.startOffset === "number") {
          await delay(next.startOffset * 1000, null);
          continue;
        }
        await Promise.all(inflight.splice(0));
        if (ev.fatal) break;
      }
      await Promise.all(inflight.splice(0));
    } finally {
      playing = false;
      currentEvent = null;
      finishDisplay();
      if (hooks.onDone) hooks.onDone();
    }
  }

  // 現在の1手を即完了させる逃げ道（CCTV タップ。結線は JOB 0-2）。
  // 「再生中のタイムラインを即時完了させる」：再生中のイベント列全体を対象とし、
  // 未再生イベントも待ち時間を 0 に落としてステップ／ログ／fx を順序どおり適用し切る。
  // 表示の最終一致は play() 完了時の finishDisplay が保証する（スキップでも不変条件は不変）。
  // 再生中でないときのタップは無効（次のタイムラインへ要求を持ち越さない）。
  function skipCurrent() {
    if (!playing) return;
    skipRequested = true;
    if (currentEvent) currentEvent.__skip = true;
    for (const ev of activeEvents) ev.__skip = true;
  }

  function isPlaying() { return playing; }
  function setSpeed(x) { speed = x > 0 ? x : 1; }
  function getSpeed() { return speed; }

  // ==== 時系列ヘルパ ====
  function hitTimes(hits, compressed) {
    const cyc = compressed ? COMP_CYCLE : SHORT_CYCLE;
    const at = compressed ? COMP_HIT_AT : SHORT_HIT_AT;
    const times = [];
    for (let k = 0; k < hits; k += 1) {
      times.push(k === 0 ? HIT_AT : FULL_CYCLE + cyc * (k - 1) + at);
    }
    return times;
  }

  function attackDur(hits, compressed) {
    if (hits <= 1) return FULL_CYCLE;
    return FULL_CYCLE + (compressed ? COMP_CYCLE : SHORT_CYCLE) * (hits - 1);
  }

  // startOffset（重なり）を織り込んだイベント列全体の再生スパン
  function timelineSpan(events) {
    let cursor = 0;
    let prevStart = 0;
    for (const ev of events) {
      const s = typeof ev.startOffset === "number" ? prevStart + ev.startOffset : cursor;
      prevStart = s;
      cursor = Math.max(cursor, s + ev.dur);
    }
    return cursor;
  }

  // ==== 生成部 1: プレイヤーのカード使用（playFromHand の結果から）====
  // 生成規則（§1.4）: (a) カード定義 effects 順 ＞ (b) インテント hits ＞ (c) result.log 順序
  // ＞ (d) 使用前後スナップショット。敵HPの総減少量は (d) で確定し、ヒット配分は (a) の
  // 基礎値の重みで按分、最終ヒットで論理値へ正確に一致させる。
  function buildPlayEvents(ctx) {
    const { card, result, before, after } = ctx;
    const state = ctx.state;
    const events = [];
    let selfDamageFx = false;
    const logs = result.log || [];

    // 『炉心溶融』の自傷は効果解決より前に支払われるコスト（ログ行から検出）
    let meltdown = 0;
    for (const line of logs) {
      const m = /炉心溶融: PWR不足 \d+ を HP (\d+) で/.exec(line);
      if (m) { meltdown = Number(m[1]); break; }
    }
    if (meltdown > 0) selfDamageFx = true; // タイムライン側で扱うため settlePlay の被弾fxは抑制する
    const phpAfterMeltdown = Math.max(0, before.php - meltdown);

    const effects = card && Array.isArray(card.effects) ? card.effects : [];
    const dmgEffects = effects.filter((e) => e
      && (DAMAGE_TYPES.has(e.type) || (e.type === "instant_kill" && e.target === "enemy")));
    const totalHits = dmgEffects.reduce(
      (sum, e) => sum + (e.type === "instant_kill" ? 1 : (e.hits || 1)), 0);

    if (totalHits > 0) {
      const delta = Math.max(0, before.ehp - after.ehp);
      const weights = [];
      for (const e of dmgEffects) {
        const n = e.type === "instant_kill" ? 1 : (e.hits || 1);
        const w = e.type === "instant_kill" ? Math.max(1, before.ehp) : (e.value || 0);
        for (let k = 0; k < n; k += 1) weights.push(w);
      }
      const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
      const times = hitTimes(totalHits, false);
      const hits = [];
      let cum = 0;
      for (let k = 0; k < totalHits; k += 1) {
        cum += delta * (weights[k] / totalWeight);
        const step = {
          ehp: k === totalHits - 1 ? after.ehp
            : Math.max(after.ehp, before.ehp - Math.round(cum)),
        };
        // 自傷と敵被弾が同時発生する場合は敵側を優先し、素体側はステップのみ（§1.2）
        if (k === 0 && meltdown > 0) step.php = phpAfterMeltdown;
        hits.push({ at: times[k], step });
      }
      events.push({
        type: "vessel_attack", actor: "vessel",
        dur: attackDur(totalHits, false),
        hits,
        endStep: {
          ehp: after.ehp, eblock: after.eblock, estun: after.estun,
          php: after.php, pblock: after.pblock,
        },
        fx: delta > 0 ? { enemyHit: true } : {},
        label: card ? card.id : "",
      });
    } else {
      // 非攻撃カードは 0.4秒の短縮形。自傷のみの場合は self_damage として被弾 fx を出す
      const isGuard = effects.some((e) => e && e.target === "player"
        && (e.type === "block" || e.type === "heal" || e.type === "block_plus_noise"
          || e.type === "block_per_noise" || e.type === "block_per_trap"));
      events.push({
        type: meltdown > 0 ? "self_damage" : (isGuard ? "guard" : "support"),
        actor: "vessel",
        dur: NON_ATTACK_DUR, applyAt: NON_ATTACK_AT,
        step: {
          php: after.php, pblock: after.pblock,
          ehp: after.ehp, eblock: after.eblock, estun: after.estun,
        },
        fx: meltdown > 0 ? { playerDamage: true } : {},
        label: card ? card.id : "",
      });
    }

    // 撃破は通常手の枠外（決着として別枠。§1.3 の敵撃破に準じる）
    if (state.enemy.dead && after.ehp <= 0 && before.ehp > 0) {
      events.push({
        type: "enemy_down", actor: "enemy",
        dur: DOWN_DUR, applyAt: DOWN_AT,
        step: { ehp: 0 },
        fx: { enemyDown: true },
        label: "down",
      });
    }
    return { events, selfDamageFx };
  }

  // ==== 生成部 2: 敵フェイズ（endTurn の結果から）====
  // 敵ログ区間（enemyLogStart〜）だけを命中フェーズへ同期させる（U-6）。
  // ヒット分割は (c) result.enemy.log の HIT 行（strikeVolley がヒットごとに残す実績）から復元し、
  // BLK 吸収はエンジンと同じ順序でシミュレーションして表示ステップを作る。
  const TRAP_FOLLOW = /^(BLOCKED \d+$|DMG \d+|STUN|TRAP SELF BLOCK|DRAW |RESHUFFLE)/;

  function buildEnemyPhaseEvents(ctx) {
    const { result, before, after, enemyLines, resetLine } = ctx;
    const events = [];
    const thinned = [];
    const enemy = result.enemy || {};

    // ---- 境界イベント（U-13: 本行動に先立つ 0.3秒の短縮形で先行再生）----
    const sim = {
      php: before.php, pblock: before.pblock,
      ehp: before.ehp, eblock: before.eblock, estun: before.estun,
    };
    const preCount = typeof result.enemyLogStart === "number" ? result.enemyLogStart : 0;
    const preLog = (result.log || []).slice(0, preCount);
    for (const line of preLog) {
      const slip = /臨界排熱 スリップ (\d+)  HP (\d+)/.exec(line);
      if (slip) {
        sim.php = Number(slip[2]);
        events.push({
          type: "boundary", actor: "vessel",
          dur: BOUNDARY_DUR, applyAt: BOUNDARY_AT,
          step: { php: sim.php },
          // 所見2の修正（JOB 1-4）: 境界イベントがエンジンのログ行自体を運び、
          // 短縮形のタイミングで表示ログへ出す（U-13 の「タイムライン側で出す」を完結させる。
          // exposed_reset と同じ logLines の形。U-6 の同期対象は敵ログ区間の命中同期であり、
          // 境界行は自イベントの applyAt で出すため矛盾しない）
          logLines: [{ text: line, kind: undefined }],
          fx: { playerDamage: true },
          label: "purge_slip",
          fatal: sim.php <= 0,
        });
        continue;
      }
      const armor = /待機防護 \+(\d+)/.exec(line);
      if (armor) {
        sim.pblock = before.pblock + Number(armor[1]);
        events.push({
          type: "boundary", actor: "vessel",
          dur: BOUNDARY_DUR, applyAt: BOUNDARY_AT,
          step: { pblock: sim.pblock },
          logLines: [{ text: line, kind: undefined }], // 所見2の修正（上記 slip と同旨）
          fx: { guard: true }, // F-4（防御の盾表示）の発火点として結線（JOB 1-3）
          label: "standby_armor",
        });
      }
    }
    // スリップで敗北した場合は以後の敵区間を再生しない（§1.3 敗北時の打ち切り）
    if (events.some((e) => e.fatal)) return { events, thinned };

    // ---- 敵ログ区間のセグメント分割（罠／本行動／追加行動）----
    const lineObjs = enemyLines && enemyLines.length
      ? enemyLines
      : (enemy.log || []).map((text) => ({ text, kind: undefined }));
    const segments = [];
    let cur = null;
    for (const entry of lineObjs) {
      const text = entry.text;
      if (text.startsWith("TRAP:")) {
        cur = { kind: "trap", lines: [entry] };
        segments.push(cur);
        continue;
      }
      if (text.startsWith("追加行動")) {
        cur = { kind: "extra", lines: [entry] };
        segments.push(cur);
        continue;
      }
      if (!cur) {
        cur = { kind: "main", lines: [entry] };
        segments.push(cur);
        continue;
      }
      if (cur.kind === "trap" && !TRAP_FOLLOW.test(text)) {
        cur = { kind: "main", lines: [entry] };
        segments.push(cur);
        continue;
      }
      cur.lines.push(entry);
    }

    const segEvents = [];
    // 所見1の修正（JOB 1-4）: 本行動が攻撃だったかは「HIT 行の有無」でなく敵インテントで判定する。
    // result.enemy.action.kind は enemyTurn が解決した本行動の action そのもの
    // （battle.js の isAttackIntent と同じ3種が攻撃）。キャンセル／スタン時は
    // kind が "cancelled"／"stunned"、行動なしは action 自体が null になるため誤判定しない。
    const mainActionKind = enemy.action && enemy.action.kind;
    const MAIN_IS_ATTACK = mainActionKind === "attack" || mainActionKind === "heavy_attack"
      || mainActionKind === "attack_stun";
    for (const seg of segments) {
      if (seg.kind === "trap") {
        const step = {};
        let dmgFx = false;
        for (const entry of seg.lines) {
          const t = entry.text;
          let m = /^DMG (\d+)  HP (\d+)/.exec(t);
          if (m) { sim.ehp = Number(m[2]); step.ehp = sim.ehp; dmgFx = true; continue; }
          m = /^BLOCKED (\d+)$/.exec(t);
          if (m) { sim.eblock = Math.max(0, sim.eblock - Number(m[1])); step.eblock = sim.eblock; continue; }
          m = /^STUN (\d+)\//.exec(t);
          if (m) { sim.estun = Number(m[1]); step.estun = sim.estun; continue; }
          m = /TRAP SELF BLOCK \+\d+  BLK (\d+)/.exec(t);
          if (m) { sim.pblock = Number(m[1]); step.pblock = sim.pblock; }
        }
        segEvents.push({
          type: "trap_fire", actor: "enemy",
          dur: TRAP_DUR, applyAt: TRAP_AT,
          step, logLines: seg.lines,
          fx: dmgFx ? { enemyHit: true } : {},
          label: "trap",
        });
        continue;
      }
      // 本行動／追加行動: HIT 行からヒット分割を復元する
      const hitDmgs = [];
      for (const entry of seg.lines) {
        const m = /^HIT (\d+)$/.exec(entry.text);
        if (m) hitDmgs.push(Number(m[1]));
      }
      if (hitDmgs.length) {
        const times = hitTimes(hitDmgs.length, false);
        const hits = [];
        let fatal = false;
        hitDmgs.forEach((d, k) => {
          const soaked = Math.min(sim.pblock, d);
          sim.pblock -= soaked;
          const loss = Math.min(sim.php, d - soaked);
          sim.php -= loss;
          if (sim.php <= 0) fatal = true;
          hits.push({ at: times[k], step: { php: sim.php, pblock: sim.pblock } });
        });
        segEvents.push({
          type: "enemy_attack", actor: "enemy",
          dur: attackDur(hitDmgs.length, false),
          hits, logLines: seg.lines,
          fx: { playerDamage: true },
          label: seg.kind === "extra" ? "extra_attack" : "main_attack",
          extra: seg.kind === "extra",
          fatal,
        });
        continue;
      }
      // 所見1の修正（JOB 1-4）: 完全防御・回避で HIT 行が出なかった攻撃も enemy_attack として扱う。
      // battle.js の strikeVolley は防護相殺後の残値でのみ HIT を出すため、全ヒットが無効化された
      // 攻撃は HIT 行を持たない（残るのは BLOCKED n BLK m／HP n 行のみ）。従来は下の非攻撃分岐へ
      // 落ちて攻撃ポーズ・F-4 盾・0.6秒尺が付かなかった（チュートリアル T1 の見せ場で常時発生）。
      // 判定は表示層で完結する3信号: 本行動=MAIN_IS_ATTACK（インテント）、追加行動=先頭行の種別
      // （攻撃なのは追撃のみ。攪乱／照準は非攻撃）、補助=strikeVolley 固有行の有無
      // （BLOCKED n  BLK m と HP n は strikeVolley だけが出す行）。
      const firstText = seg.lines.length ? seg.lines[0].text : "";
      const isAttackSeg = (seg.kind === "main" && MAIN_IS_ATTACK)
        || (seg.kind === "extra" && firstText.startsWith("追加行動: 追撃"))
        || seg.lines.some((entry) => /^BLOCKED \d+  BLK \d+$/.test(entry.text) || /^HP \d+$/.test(entry.text));
      if (isAttackSeg) {
        // 全ヒット無効化のため命中点は1点で代表させる。ステップは BLOCKED／HP 行から復元する
        // （相殺量は onStep 側の pblock 差分として現れ、F-4 盾と BLK ポップが発火する）。
        // HP ダメージは発生していないため fx.playerDamage は付けない（被弾シェイクは出さない）
        const step = {};
        for (const entry of seg.lines) {
          const t = entry.text;
          let m = /^BLOCKED \d+  BLK (\d+)$/.exec(t);
          if (m) { sim.pblock = Number(m[1]); step.pblock = sim.pblock; continue; }
          m = /^HP (\d+)$/.exec(t);
          if (m) { sim.php = Number(m[1]); step.php = sim.php; }
        }
        segEvents.push({
          type: "enemy_attack", actor: "enemy",
          dur: attackDur(1, false),
          hits: [{ at: HIT_AT, step }],
          logLines: seg.lines,
          fx: {},
          label: seg.kind === "extra" ? "extra_attack" : "main_attack",
          extra: seg.kind === "extra",
          fatal: typeof step.php === "number" && step.php <= 0,
        });
        continue;
      }
      // 非攻撃行動は 0.4秒の短縮形（攻撃ポーズを使わない。§1.3）
      const step = {};
      for (const entry of seg.lines) {
        const t = entry.text;
        let m = /(?:GUARD|STEALTH) \+\d+  BLK (\d+)/.exec(t);
        if (m) { sim.eblock = Number(m[1]); step.eblock = sim.eblock; continue; }
        m = /^BLOCKED (\d+)  BLK (\d+)$/.exec(t);
        if (m) { sim.pblock = Number(m[2]); step.pblock = sim.pblock; continue; }
        m = /^HP (\d+)$/.exec(t);
        if (m) { sim.php = Number(m[1]); step.php = sim.php; continue; }
        if (t === "VENT") { sim.eblock = 0; step.eblock = 0; continue; }
        if (t === "SCAN") { sim.pblock = 0; step.pblock = 0; }
      }
      const isDown = seg.lines.length === 1 && seg.lines[0].text === "TARGET DOWN";
      segEvents.push({
        type: isDown ? "enemy_down" : "enemy_action", actor: "enemy",
        dur: isDown ? DOWN_DUR : NON_ATTACK_DUR,
        applyAt: isDown ? DOWN_AT : NON_ATTACK_AT,
        step, logLines: seg.lines,
        fx: isDown ? { enemyDown: true } : {},
        label: seg.kind === "extra" ? "extra_action" : "main_action",
        extra: seg.kind === "extra",
      });
    }

    // 罠の連鎖再生: 2個目以降は 0.15秒ずつ重ねる。連鎖の合計が 1.2秒を超える場合は
    // 同時発動化する（間引き①の先行適用。§1.3）
    let trapSeen = 0;
    for (const ev of segEvents) {
      if (ev.type === "trap_fire") {
        if (trapSeen > 0) ev.startOffset = TRAP_OVERLAP;
        trapSeen += 1;
      }
    }
    if (trapSeen > 1 && TRAP_DUR + TRAP_OVERLAP * (trapSeen - 1) > TRAP_CHAIN_CAP) {
      for (const ev of segEvents) {
        if (ev.type === "trap_fire" && ev.startOffset) ev.startOffset = 0;
      }
      thinned.push("trap_simultaneous_cap");
    }
    events.push(...segEvents);

    // 完全露呈の NOISE リセットは境界イベントとして時系列の末尾に置く（(c) ログ順序に従う）
    if (resetLine) {
      events.push({
        type: "boundary", actor: "enemy",
        dur: BOUNDARY_DUR, applyAt: BOUNDARY_AT,
        step: {},
        logLines: [{ text: resetLine, kind: undefined }],
        fx: {},
        label: "exposed_reset",
      });
    }

    // 最終一致（(d) スナップショット）: 末尾イベントの endStep で論理値へ寄せる
    if (events.length) {
      const last = events[events.length - 1];
      last.endStep = {
        ...(last.endStep || {}),
        php: after.php, pblock: after.pblock,
        ehp: after.ehp, eblock: after.eblock, estun: after.estun,
      };
    }

    // ---- 敵フェイズ総尺の上限と間引き（U-11: 罠→追加行動→多段圧縮の優先順）----
    if (timelineSpan(events) > ENEMY_PHASE_CAP) {
      let merged = false;
      for (const ev of events) {
        if (ev.type === "trap_fire" && typeof ev.startOffset === "number" && ev.startOffset > 0) {
          ev.startOffset = 0;
          merged = true;
        }
      }
      if (merged) thinned.push("trap_simultaneous");
    }
    if (timelineSpan(events) > ENEMY_PHASE_CAP) {
      for (const ev of events) {
        if (ev.extra && ev.type === "enemy_attack" && ev.hits && ev.hits.length) {
          const lastStep = ev.hits[ev.hits.length - 1].step;
          ev.hits = [{ at: NON_ATTACK_AT, step: lastStep }];
          ev.dur = NON_ATTACK_DUR;
          thinned.push("extra_shortened");
        }
      }
    }
    if (timelineSpan(events) > ENEMY_PHASE_CAP) {
      for (const ev of events) {
        if (ev.type === "enemy_attack" && ev.hits && ev.hits.length > 1) {
          const times = hitTimes(ev.hits.length, true);
          ev.hits.forEach((h, k) => { h.at = times[k]; });
          ev.dur = attackDur(ev.hits.length, true);
          thinned.push("cycle_compressed");
        }
      }
    }
    return { events, thinned };
  }

  root.AnimPres = {
    // インターフェース（マルチ段階2で生成側が作り直しになっても壊れない境界。§1.4／§12）
    snapshot,
    begin,
    applyDisplay,
    finishDisplay,
    bindRenderer,
    buildPlayEvents,
    buildEnemyPhaseEvents,
    play,
    skipCurrent,
    isPlaying,
    setSpeed,
    getSpeed,
    get display() { return display ? { ...display } : null; },
    TIMING: {
      FULL_CYCLE, HIT_AT, SHORT_CYCLE, SHORT_HIT_AT, COMP_CYCLE, COMP_HIT_AT,
      NON_ATTACK_DUR, NON_ATTACK_AT, TRAP_DUR, TRAP_AT, TRAP_OVERLAP, TRAP_CHAIN_CAP,
      BOUNDARY_DUR, BOUNDARY_AT, DOWN_DUR, DOWN_AT, HITSTOP, ENEMY_PHASE_CAP,
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
