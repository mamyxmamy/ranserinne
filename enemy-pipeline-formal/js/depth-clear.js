// ============================================================
// 深度クリア演出（一枚絵＋文章／VN式）— DESIGN-DEPTH-CLEAR-FINAL 実装A
// ------------------------------------------------------------
// ・前提工事（bossClearSequence 改修／onRunClear の Promise 化）は main.js 側。
//   本モジュールは window.DepthClear.playForContext(context) を提供し、
//   main.js の onRunClear が await する。演出が完了（読み切り or SKIP）するまで
//   Promise は解決されず、フェード解除と busy 解除は bossClearSequence 側に残る。
// ・context.depth は深度システム本体（main.js）から run.depth の実値が供給される。
//   depth が無い（null）場合は演出を出さず false を返す（現行フロー維持）。
//   検証用に深度を強制指定できる:
//     URL クエリ ?depth=15（&branch=liberation で分岐の事前記録も可）
//     コンソール window.forceDepth(15) / forceDepth(null) で解除
// ・一枚絵は ART_READY に artFile 名を登録した時点で実絵に差し替わる
//   （未登録の深度は仮絵＝単色＋深度番号で動作する。配信は runtime cache
//   前提、sw.js CORE 外）。
// ・文章データは js/ending-data.js（window.ENDING_DATA）。
// ・回収の間（DESIGN-RECOVERY-BEAT-FINAL）: 深度15以下のクリア時、再生の前に
//   「管理ノードへ有線接続して記録断片を回収する」約6秒の間を差し込む。
//   接続は playForContext 内部に閉じ、main.js の変更はゼロ。回想では出さない。
// ============================================================
(function () {
  "use strict";
  const DATA = window.ENDING_DATA || null;
  const BRANCH_KEY = "enemy-pipeline-formal-ending-branch-v1";
  const SEEN_KEY = "enemy-pipeline-formal-ending-seen-v1";
  const ART_BASE = "assets/endings/";
  const VOICE_BASE = "assets/voice/";
  const BRANCHES = ["liberation", "destruction", "alteration"];
  const BRANCH_JP = { liberation: "解放", destruction: "破壊", alteration: "改竄" };
  // 栄光枠（深度16〜20 後日談）の Gray ボイス対応表（VOICE-ENDINGS-PREP-REPORT 対応表B）。
  // 破壊・改竄は深度帯で文面が共通のため収録ファイルも共用する（生成は distinct 9本）。
  const AFTERMATH_VOICE = {
    liberation: { 16: "ending_after_liberation_16", 17: "ending_after_liberation_17", 18: "ending_after_liberation_18", 19: "ending_after_liberation_19", 20: "ending_after_liberation_20" },
    destruction: { 16: "ending_after_destruction_16", 17: "ending_after_destruction_16", 18: "ending_after_destruction_18", 19: "ending_after_destruction_18", 20: "ending_after_destruction_18" },
    alteration: { 16: "ending_after_alteration_16", 17: "ending_after_alteration_16", 18: "ending_after_alteration_18", 19: "ending_after_alteration_18", 20: "ending_after_alteration_18" },
  };
  function aftermathVoiceId(branch, depth) {
    const m = AFTERMATH_VOICE[branch];
    return (m && m[depth]) || null;
  }
  // 実絵が納品された artFile をここへ登録する。未登録の深度は仮絵で動作する。
  // パイロット2枚は 2026-11-19 に本人が選定し公式化（PILOT-ART-OFFICIAL-REPORT.md）。
  const ART_READY = {
    "depth01.webp": true, // 深度1（選定元：design/depth-clear-candidates/e01-cand1-wide.jpg）
    "depth12.webp": true, // 深度12（選定元：design/depth-clear-candidates/e12-cand1-wide.jpg）
  };

  // ---------- 回収の間（DESIGN-RECOVERY-BEAT-FINAL／RB-1〜RB-6 は推奨どおり仮確定） ----------
  // ノード絵は RB-3 (b) の専用絵を仮採用（design/depth-clear-candidates/node-cand1.jpg。
  // 本人の正式選定は後日）。差し替えはこの登録と assets/endings/ のファイル差し替えだけで済む。
  // 配信は一枚絵と同じ経路：CORE precache 外・runtime cache、第3層ボス戦開始時の
  // preloadForContext から先読みする（§2.2）。
  const BEAT_ART_FILE = "node.jpg";
  const BEAT_ART_READY = true;
  // 文案・ラベルのデータ定義はこの1か所に集約する（差し替えはここだけ直せばよい）。
  // Gray キュー3本（役割固定：接続開始／転送中／回収確定）は RECOVERY-CUE-AUDIT.md で
  // 精査済み（2026-11-19）。キュー1は精査対案で確定：探知の断定（旧「嗅ぎつけられん」）は
  // 正典（探知軸は物理的な駆動音 NOISE）と矛盾するため「有線は奴の目に映らん」に差し替えた。
  // voiceId は 2026-11-23 に収録・配線済み（声Dクローン、assets/voice/recovery_*.mp3）。
  const RECOVERY_BEAT = {
    grayCues: {
      start: { g: "……ノードに直結しろ。有線は奴の目に映らん。", voiceId: "recovery_start" },
      transfer: { g: "抜き終わるまで回線を切るな。そのまま送れ。", voiceId: "recovery_transfer" },
      done: { g: "……来たな。記録断片、回収を確認した。", voiceId: "recovery_done" },
    },
    // ノードの呼称ラベル（§4：深度帯で文言のみ変える）[上限深度, ラベル]
    nodeLabels: [[4, "記録端末"], [8, "保管系管理ノード"], [12, "編纂系管理ノード"], [14, "管制系管理ノード"], [15, "中核管理ノード"]],
  };
  function nodeLabelFor(depth) {
    for (const pair of RECOVERY_BEAT.nodeLabels) if (depth <= pair[0]) return pair[1];
    return "管理ノード";
  }

  const $id = (id) => document.getElementById(id);
  const els = {};
  let elsReady = false;
  function grabEls() {
    if (elsReady) return true;
    els.root = $id("depth-clear");
    if (!els.root) return false;
    els.artImg = $id("dc-art-img");
    els.artPh = $id("dc-art-ph");
    els.artPhNum = $id("dc-art-ph-num");
    els.artPhCap = $id("dc-art-ph-cap");
    els.chipMain = $id("dc-chip-main");
    els.chipSub = $id("dc-chip-sub");
    els.skip = $id("dc-skip");
    els.ff = $id("dc-ff");
    els.speaker = $id("dc-speaker");
    els.text = $id("dc-text");
    els.next = $id("dc-next");
    els.report = $id("dc-report");
    els.choices = $id("dc-choices");
    buildBeatEls();
    elsReady = true;
    return true;
  }

  // 回収の間レイヤー（#dc-beat）。index.html は変更せず、ここで構築して
  // .dc-art の直後（チップより後ろ）に差し込む（§6.2：チップ／SKIP は既存要素を共用）。
  // ケーブル・リール・波形・カウンタ・表示灯はすべて DOM／CSS／SVG のオーバーレイ（§2.2）。
  function buildBeatEls() {
    if (els.beat || !els.root) return;
    const beat = document.createElement("div");
    beat.className = "dc-beat";
    beat.id = "dc-beat";
    beat.hidden = true;
    beat.innerHTML =
      '<img class="dc-beat__img" id="dc-beat-img" alt="">' +
      '<div class="dc-beat__grain" aria-hidden="true"></div>' +
      '<svg class="dc-beat__cable" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<path class="dc-beat__cable-shadow" d="M-20 660 C 300 730, 560 580, 820 540 C 950 520, 1040 486, 1112 472" fill="none"/>' +
        '<path class="dc-beat__cable-line" id="dc-beat-cable" d="M-20 660 C 300 730, 560 580, 820 540 C 950 520, 1040 486, 1112 472" fill="none"/>' +
        '<g class="dc-beat__connector" id="dc-beat-connector">' +
          '<circle class="dc-beat__port" cx="1120" cy="470" r="66"/>' +
          '<g class="dc-beat__lock" id="dc-beat-lock"><circle class="dc-beat__lockring" cx="1120" cy="470" r="52"/></g>' +
          '<circle class="dc-beat__plug" cx="1120" cy="470" r="30"/>' +
        '</g>' +
      '</svg>' +
      '<p class="dc-beat__nodelabel" id="dc-beat-nodelabel"></p>' +
      '<div class="dc-beat__hud">' +
        '<p class="dc-beat__counter" id="dc-beat-counter">RECOVERED SEGMENTS 000 / 100</p>' +
        '<p class="dc-beat__lamps" aria-hidden="true"><span class="dc-beat__lamp" id="dc-beat-lamp1"></span><span class="dc-beat__lamp" id="dc-beat-lamp2"></span><span class="dc-beat__lamp" id="dc-beat-lamp3"></span></p>' +
      '</div>' +
      '<div class="dc-beat__reel" id="dc-beat-reel" aria-hidden="true">' +
        '<svg viewBox="0 0 100 100"><circle class="dc-beat__reel-rim" cx="50" cy="50" r="44"/>' +
        '<line x1="50" y1="10" x2="50" y2="90"/><line x1="10" y1="50" x2="90" y2="50"/>' +
        '<line x1="22" y1="22" x2="78" y2="78"/><line x1="78" y1="22" x2="22" y2="78"/>' +
        '<circle class="dc-beat__reel-hub" cx="50" cy="50" r="10"/></svg>' +
      '</div>' +
      '<svg class="dc-beat__wave" viewBox="0 0 1600 60" preserveAspectRatio="none" aria-hidden="true"><path class="dc-beat__wave-line" id="dc-beat-wave" d="M0 30 L1600 30"/></svg>' +
      '<div class="dc-beat__stamp" id="dc-beat-stamp" hidden>' +
        '<p class="dc-beat__stamp-main" id="dc-beat-stamp-main">記録断片を回収</p>' +
        '<p class="dc-beat__stamp-sub" id="dc-beat-stamp-sub">FRAGMENT RECOVERED — 07 / 15</p>' +
      '</div>' +
      '<div class="dc-beat__caption" id="dc-beat-caption" hidden>' +
        '<p class="dc-beat__speaker">[ GRAY ]</p>' +
        '<p class="dc-beat__captext" id="dc-beat-captext"></p>' +
      '</div>';
    const chip = els.root.querySelector(".dc-chip");
    els.root.insertBefore(beat, chip || null);
    els.beat = beat;
    els.beatImg = beat.querySelector("#dc-beat-img");
    els.beatCables = [beat.querySelector(".dc-beat__cable-shadow"), beat.querySelector("#dc-beat-cable")];
    els.beatConnector = beat.querySelector("#dc-beat-connector");
    els.beatLock = beat.querySelector("#dc-beat-lock");
    els.beatNodeLabel = beat.querySelector("#dc-beat-nodelabel");
    els.beatCounter = beat.querySelector("#dc-beat-counter");
    els.beatLamps = [beat.querySelector("#dc-beat-lamp1"), beat.querySelector("#dc-beat-lamp2"), beat.querySelector("#dc-beat-lamp3")];
    els.beatReel = beat.querySelector("#dc-beat-reel");
    els.beatWave = beat.querySelector("#dc-beat-wave");
    els.beatStamp = beat.querySelector("#dc-beat-stamp");
    els.beatStampMain = beat.querySelector("#dc-beat-stamp-main");
    els.beatStampSub = beat.querySelector("#dc-beat-stamp-sub");
    els.beatCaption = beat.querySelector("#dc-beat-caption");
    els.beatCapText = beat.querySelector("#dc-beat-captext");
  }

  // ---------- 保存（§3.5: 既存の解禁記録と同形式の版管理つきキー） ----------
  function loadSeen() {
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      const o = raw ? JSON.parse(raw) : null;
      if (o && typeof o === "object") {
        return { pages: (o.pages && typeof o.pages === "object") ? o.pages : {},
                 cleared: (o.cleared && typeof o.cleared === "object") ? o.cleared : {} };
      }
    } catch (e) { /* 読めない場合は空として扱う */ }
    return { pages: {}, cleared: {} };
  }
  function saveSeen(s) {
    try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) { /* noop */ }
  }
  function markSeenPage(key) {
    if (!key) return;
    const s = loadSeen();
    if (!s.pages[key]) { s.pages[key] = 1; saveSeen(s); }
  }
  function markCleared(depth) {
    const s = loadSeen();
    const k = String(depth);
    if (!s.cleared[k]) { s.cleared[k] = 1; saveSeen(s); }
  }
  function getBranch() {
    try {
      const v = window.localStorage.getItem(BRANCH_KEY);
      return BRANCHES.indexOf(v) >= 0 ? v : null;
    } catch (e) { return null; }
  }
  function setBranch(b) {
    if (BRANCHES.indexOf(b) < 0) return;
    try { window.localStorage.setItem(BRANCH_KEY, b); } catch (e) { /* noop */ }
  }

  // ---------- 深度の強制指定（検証用。実値接続は深度システム実装時） ----------
  let forcedDepth = null;
  try {
    const q = new URLSearchParams(window.location.search);
    const d = parseInt(q.get("depth"), 10);
    if (Number.isInteger(d) && d >= 1 && d <= 20) forcedDepth = d;
    const b = q.get("branch");
    if (b && BRANCHES.indexOf(b) >= 0 && !getBranch()) setBranch(b);
  } catch (e) { /* noop */ }
  window.forceDepth = function (n) {
    if (n === null || n === undefined) { forcedDepth = null; return forcedDepth; }
    const d = parseInt(n, 10);
    if (Number.isInteger(d) && d >= 1 && d <= 20) forcedDepth = d;
    return forcedDepth;
  };
  function resolveDepth(context) {
    let d = (context && context.depth !== null && context.depth !== undefined) ? context.depth : forcedDepth;
    d = parseInt(d, 10);
    return (Number.isInteger(d) && d >= 1 && d <= 20) ? d : null;
  }

  // ---------- 一枚絵（仮絵／実絵の差し替え口＋preload） ----------
  function bandFor(depth, branch) {
    // 剥がれグラデーション（J-2）の段階。CSS フィルタ段階として仮絵・実絵の双方に効かせる。
    if (depth === 15) return branch === "liberation" ? 5 : 4;
    if (depth >= 16) return branch === "liberation" ? 5 : (branch === "destruction" ? 3 : 4);
    if (depth >= 12) return 4;
    if (depth >= 9) return 3;
    if (depth >= 5) return 2;
    return 1;
  }
  function artFilesForDepth(depth) {
    if (!DATA) return [];
    const files = [];
    if (depth >= 1 && depth <= 14) {
      if (DATA.fragments[depth]) files.push(DATA.fragments[depth].artFile);
    } else if (depth === 15) {
      files.push(DATA.depth15.artFile);
      for (const b of BRANCHES) files.push(DATA.depth15.branches[b].artFile);
    } else if (depth >= 16) {
      const br = getBranch();
      if (br) files.push(DATA.afterArtFiles[br]);
      else for (const b of BRANCHES) files.push(DATA.afterArtFiles[b]);
    }
    return files;
  }
  function preloadForDepth(depth) {
    const d = parseInt(depth, 10);
    if (!Number.isInteger(d)) return;
    if (d <= 15 && BEAT_ART_READY) {
      // 回収の間のノード絵も一枚絵と同じ経路で先読みする（RECOVERY-BEAT-FINAL §2.2）
      const bimg = new Image();
      bimg.src = ART_BASE + BEAT_ART_FILE; // SW の runtime cache に乗る（CORE precache 外）
    }
    for (const f of artFilesForDepth(d)) {
      if (!ART_READY[f]) continue; // 仮絵の間は取得しない（構造のみ）
      const img = new Image();
      img.src = ART_BASE + f; // SW の runtime cache に乗る（CORE precache 外・J-12）
    }
  }
  function preloadForContext(context) {
    const d = resolveDepth(context || {});
    if (d) preloadForDepth(d);
  }
  function setArt(artFile, depth, branch, capText) {
    if (!grabEls()) return;
    const band = bandFor(depth, branch);
    els.root.dataset.band = String(band);
    if (artFile && ART_READY[artFile]) {
      els.artPh.hidden = true;
      els.artImg.hidden = false;
      els.artImg.onerror = () => { // 取得失敗時は仮絵で完走させる（§3.6）
        els.artImg.hidden = true;
        els.artPh.hidden = false;
      };
      els.artImg.src = ART_BASE + artFile;
    } else {
      els.artImg.hidden = true;
      els.artImg.removeAttribute("src");
      els.artPh.hidden = false;
      els.artPhNum.textContent = String(depth).padStart(2, "0");
      els.artPhCap.textContent = capText || ("DEPTH " + String(depth).padStart(2, "0") + " — IMAGE NOT RECOVERED");
    }
  }

  // ---------- 音声（voiceId: ファイルが存在すれば再生、無ければ無音で進む） ----------
  let voiceEl = null;
  function stopVoice() {
    if (voiceEl) { try { voiceEl.pause(); } catch (e) { /* noop */ } voiceEl = null; }
  }
  function playVoice(page) {
    stopVoice();
    if (!page || !page.voiceId) return;
    try {
      if (typeof audio !== "undefined" && audio && audio.muted) return;
      const a = new Audio(VOICE_BASE + page.voiceId + ".mp3");
      a.onerror = () => { /* 未収録なら無音のまま進む */ };
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      voiceEl = a;
    } catch (e) { /* noop */ }
  }
  function playSE(name) {
    try { if (typeof audio !== "undefined" && audio) audio.playSE(name); } catch (e) { /* noop */ }
  }

  function isReducedMotion() {
    try {
      if (typeof reducedMotion === "function") return reducedMotion();
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  // ---------- VN プレイヤー ----------
  let dcToken = 0;
  let S = null; // 実行中セッション { mode, depth, typing, atEnd, skip, ff, closed, waitResolve, choiceResolve, finishResolve }

  function setChip(depth, branch) {
    if (depth >= 16) {
      const t = DATA.titles[depth];
      els.chipMain.textContent = "DEPTH " + depth;
      els.chipSub.textContent = t ? (t.jp + " " + t.en) : "";
    } else {
      els.chipMain.textContent = "DEPTH " + String(depth).padStart(2, "0");
      els.chipSub.textContent = "FRAGMENT " + String(depth).padStart(2, "0") + " / 15";
    }
  }

  async function typePage(page, token) {
    const isGray = typeof page.g === "string";
    const text = isGray ? ("「" + page.g + "」") : (page.t || "");
    els.speaker.hidden = !isGray;
    els.text.classList.toggle("dc-text--title", !!page.title);
    els.next.hidden = true;
    try { session.advance = false; } catch (e) { /* noop */ }
    S.typing = true;
    playVoice(page);
    const live = () => token === dcToken && S && !S.closed && !S.skip && !S.ff;
    let ok = false;
    if (typeof typeText === "function") {
      // 既存の無線UIと同一仕様（28ms/字・印字中タップで全文・reduced-motion で即時表示）
      ok = await typeText(els.text, text, live, { gap: 28, caret: true, radio: isGray });
    } else {
      els.text.textContent = text;
      ok = live();
    }
    S.typing = false;
    if (S.closed || token !== dcToken) return "closed";
    if (S.skip) return "skip";
    if (S.ff) return "ff";
    return ok ? "ok" : "closed";
  }

  function waitAdvance() {
    return new Promise((resolve) => { S.waitResolve = resolve; });
  }
  function pokeWaiter(result) {
    if (S && S.waitResolve) { const r = S.waitResolve; S.waitResolve = null; r(result); }
  }

  // ページ列を送る。戻り値: "done"（読み切り）/ "skip" / "ff" / "closed"
  // opts.holdLast: 最終ページもタップ待ちを挟む（選択提示ページ用）。
  //   reduced-motion では即時全文表示の直後に次画面へ切り替わると実質読めないため、
  //   このページだけは reduced-motion でもタップで進むまで表示を留める。
  //   通常設定時の挙動は従来どおり（印字完了で次へ）。
  async function runPages(pages, token, seenKey, opts) {
    for (let i = 0; i < pages.length; i += 1) {
      if (!S || S.closed || token !== dcToken) return "closed";
      if (S.skip) return "skip";
      if (S.ff) return "ff";
      S.atEnd = false;
      const r = await typePage(pages[i], token);
      if (r !== "ok") return r;
      if (seenKey) markSeenPage(seenKey);
      const isLast = i === pages.length - 1;
      if (isLast) {
        if (opts && opts.holdLast && isReducedMotion()) {
          els.next.hidden = false;
          const wl = await waitAdvance();
          if (wl !== "advance") return wl;
          playSE("printer");
        }
        return "done";
      }
      els.next.hidden = false;
      const w = await waitAdvance();
      if (w !== "advance") return w;
      playSE("printer"); // 文章送りの穿孔音（§3.7: 既存素材の流用）
    }
    return "done";
  }

  function showEndButton() {
    S.atEnd = true;
    els.next.hidden = true;
    els.report.textContent = S.mode === "archive" ? "CLOSE ▶" : "REPORT ▶";
    els.report.hidden = false;
  }

  function waitFinish() {
    return new Promise((resolve) => { S.finishResolve = resolve; });
  }

  function runChoice(token) {
    return new Promise((resolve) => {
      S.phase = "choice";
      els.skip.hidden = true; // 深度15の3択は必須UI（SKIP不可・§2.3）
      els.ff.hidden = true;
      els.next.hidden = true;
      els.speaker.hidden = true;
      els.text.textContent = "";
      els.choices.replaceChildren();
      for (const c of DATA.depth15.choices) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dc-choice";
        b.textContent = c.label;
        b.addEventListener("click", () => {
          playSE("switch");
          els.choices.hidden = true;
          S.phase = "pages";
          resolve(c.id);
        });
        els.choices.append(b);
      }
      els.choices.hidden = false;
      S.choiceResolve = resolve;
    });
  }

  function openOverlay() {
    els.root.hidden = false;
    void els.root.offsetWidth;
    els.root.classList.add("is-on");
  }
  function closeOverlay() {
    els.root.classList.remove("is-on");
    els.root.hidden = true;
  }

  // ---------- 回収の間（RECOVERY-BEAT-FINAL §1／§6） ----------
  // playForContext の内部だけで呼ばれ、戻り値 "done" | "skipAll" | "skipIntro" で
  // SKIP の伝播を担保する（§6.2）。セッション S は本演出の開始時点で先行生成し
  // phase: "beat" を持たせ、SKIP／タップの既存ハンドラを共用する。
  let beatLastPrint = -10;
  function setBeatProgress(n) {
    if (!els.beatCounter) return;
    els.beatCounter.textContent = "RECOVERED SEGMENTS " + String(n).padStart(3, "0") + " / 100";
    if (els.beatReel) els.beatReel.style.transform = "rotate(" + (n * 7.2) + "deg)"; // 転送で2回転
    drawBeatWave(n);
    if (n === 0) { beatLastPrint = -10; return; }
    if (n >= beatLastPrint + 5 && n < 100) { beatLastPrint = n; playSE("printer"); } // カウンタの刻みに同期（§2.3）
  }
  function drawBeatWave(n) {
    if (!els.beatWave) return;
    const amp = (n > 0 && n < 100) ? 13 : 0; // 転送中だけ波打ち、完了で平らに戻る（§2.3）
    let d = "M0 30";
    for (let x = 40; x <= 1600; x += 40) {
      const y = amp ? 30 + Math.sin(x / 110 + n / 5) * amp * 0.6 + (Math.random() - 0.5) * amp : 30;
      d += " L" + x + " " + y.toFixed(1);
    }
    els.beatWave.setAttribute("d", d);
  }
  function resetCable() {
    if (!els.beatCables) return;
    for (const p of els.beatCables) {
      if (!p) continue;
      const len = p.getTotalLength();
      p.style.transition = "none";
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
    }
    els.beatConnector.style.transition = "none";
    els.beatConnector.style.opacity = "0";
    els.beatLock.style.transition = "none";
    els.beatLock.style.transform = "rotate(0deg)";
  }
  function startCable() {
    if (!els.beatCables) return;
    void els.beat.offsetWidth;
    for (const p of els.beatCables) {
      if (!p) continue;
      p.style.transition = "stroke-dashoffset 0.95s ease";
      p.style.strokeDashoffset = "0";
    }
    els.beatConnector.style.transition = "opacity 0.35s ease 0.55s";
    els.beatConnector.style.opacity = "1";
  }
  function snapCable() {
    if (!els.beatCables) return;
    for (const p of els.beatCables) {
      if (!p) continue;
      p.style.transition = "none";
      p.style.strokeDashoffset = "0";
    }
    els.beatConnector.style.transition = "none";
    els.beatConnector.style.opacity = "1";
    els.beatLock.style.transition = "transform 0.5s ease";
    els.beatLock.style.transform = "rotate(90deg)"; // ロックリング 1/4 回転で締結（§2.1）
  }
  function showBeatStamp(depth) {
    if (!els.beatStamp) return;
    els.beatStampMain.textContent = depth === 15 ? "中核記録を回収" : "記録断片を回収"; // §3.1
    els.beatStampSub.textContent = "FRAGMENT RECOVERED — " + String(depth).padStart(2, "0") + " / 15";
    els.beatStamp.hidden = false; // スタンプ的な即時出現（打刻 SE と同期・§3.2）
  }
  function runBeatTransfer(ms, B) {
    return new Promise((resolve) => {
      const start = performance.now();
      let raf = 0;
      const finish = (v) => { cancelAnimationFrame(raf); B.tapResolve = null; resolve(v); };
      B.tapResolve = () => { setBeatProgress(100); finish("tap"); }; // タップで区間を即時完了
      const step = () => {
        if (B.result) { finish("skip"); return; }
        if (!S || S.closed) { finish("closed"); return; }
        const p = Math.min(1, (performance.now() - start) / ms);
        setBeatProgress(Math.floor(p * 100));
        if (p >= 1) { finish("timer"); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
  }

  async function playRecoveryBeat(depth) {
    if (!grabEls() || !els.beat) return "done";
    const token = ++dcToken;
    const seen = loadSeen();
    const seenBefore = depth === 15
      ? !!(seen.pages["15"] || BRANCHES.some((b) => seen.pages["15:" + b]))
      : !!seen.pages[String(depth)];
    const shortForm = seenBefore; // RB-6 (b): 既読深度の再クリアは短縮形（接続→即時100→確定表示・約2秒）
    const reduced = isReducedMotion();
    S = { mode: "clear", depth, typing: false, atEnd: false, skip: false, ff: false, closed: false,
          waitResolve: null, choiceResolve: null, finishResolve: null, phase: "beat",
          branchChosen: false, seenBefore, beatCtl: null };

    // --- 画面の初期化（チップは DEPTH のみ先行表示。FRAGMENT は再生開始時に setChip で出す・§6.2） ---
    els.root.dataset.band = String(bandFor(depth, null)); // 剥がれグラデーションをビートにも適用（§4）
    els.root.classList.add("is-beat");
    els.ff.hidden = true;
    els.report.hidden = true;
    els.choices.hidden = true;
    els.skip.hidden = false;
    els.skip.textContent = "SKIP";
    els.chipMain.textContent = "DEPTH " + String(depth).padStart(2, "0");
    els.chipSub.textContent = "";
    els.beatImg.src = ART_BASE + BEAT_ART_FILE;
    els.beatNodeLabel.textContent = nodeLabelFor(depth);
    els.beatStamp.hidden = true;
    els.beatCaption.hidden = true;
    els.beatCapText.textContent = "";
    for (const l of els.beatLamps) l.classList.remove("is-on");
    setBeatProgress(0);
    resetCable();
    els.beat.hidden = false;
    openOverlay();
    void els.beat.offsetWidth;
    els.beat.classList.add("is-on");

    // --- 区間送りの制御（タップ＝現在区間を即時完了／SKIP＝戻り値の確定・§6.2） ---
    const B = { result: null, tapResolve: null };
    S.beatCtl = {
      tap() { if (B.tapResolve) { const r = B.tapResolve; B.tapResolve = null; r("tap"); } },
      skip(result) {
        B.result = result;
        if (B.tapResolve) { const r = B.tapResolve; B.tapResolve = null; r("skip"); }
      },
    };
    const alive = () => !B.result && S && !S.closed && token === dcToken;
    function seg(ms) {
      if (B.result) return Promise.resolve("skip");
      return new Promise((resolve) => {
        const t = setTimeout(() => { B.tapResolve = null; resolve("timer"); }, ms);
        B.tapResolve = () => { clearTimeout(t); resolve("tap"); };
      });
    }
    async function typeCue(cue) {
      if (!cue || !S || S.phase !== "beat") return;
      els.beatCaption.hidden = false;
      S.typing = true;
      playVoice(cue);
      try { session.advance = false; } catch (e) { /* noop */ }
      const live = () => alive() && S && S.phase === "beat" && !S.skip;
      if (typeof typeText === "function") {
        // 既存無線UIと同一仕様（28ms/字・タップで全文・reduced-motion で即時表示）。
        // 対象はビート専用のキャプション要素（VN ウィンドウの els.text は流用しない・§6.2）
        await typeText(els.beatCapText, "「" + cue.g + "」", live, { gap: 28, caret: true, radio: true });
      } else {
        els.beatCapText.textContent = "「" + cue.g + "」";
      }
      if (S && S.phase === "beat") S.typing = false;
    }
    function finishBeat(result) {
      if (S) S.beatCtl = null;
      els.beat.classList.add("is-out"); // 再生へのフェード（§1 #7）。畳み切りはタイマー側
      const b = els.beat;
      setTimeout(() => {
        b.hidden = true;
        b.classList.remove("is-on", "is-out");
        els.root.classList.remove("is-beat");
      }, 750);
      return result;
    }

    const cues = RECOVERY_BEAT.grayCues;
    try {
      if (reduced) {
        // reduced-motion: 接続済みの静止画＋確定表示を即時表示し、タップを待たず
        // 約1.2秒で自動的に再生開始へ進む（§1 の確定仕様。holdLast 例外は適用しない）
        snapCable();
        for (const l of els.beatLamps) l.classList.add("is-on");
        setBeatProgress(100);
        showBeatStamp(depth);
        typeCue(cues.done);
        await seg(1200);
      } else if (shortForm) {
        playSE("radio_noise");
        await seg(300);
        if (!alive()) return B.result || "done";
        snapCable();
        playSE("card_insert"); playSE("switch");
        els.beatLamps[0].classList.add("is-on");
        setBeatProgress(100);
        playSE("printer");
        await seg(250);
        if (!alive()) return B.result || "done";
        for (const l of els.beatLamps) l.classList.add("is-on");
        showBeatStamp(depth);
        playSE("card_insert");
        typeCue(cues.done);
        await seg(700);
      } else {
        playSE("radio_noise"); playSE("glitch"); // ノード顕現の乱れ（§2.5）
        typeCue(cues.start); // キューは #2〜#4 と並行表示し、尺は延ばさない（§1）
        await seg(800); // #2 ノード顕現
        if (!alive()) return B.result || "done";
        startCable(); // #4 有線接続
        await seg(1000);
        if (!alive()) return B.result || "done";
        snapCable();
        playSE("card_insert"); playSE("switch"); // 装着音＋ロックリング締結（§2.5）
        els.beatLamps[0].classList.add("is-on");
        typeCue(cues.transfer);
        await runBeatTransfer(2600, B); // #5 転送（カウンタ／リール／波形・§2.3）
        if (!alive()) return B.result || "done";
        for (const l of els.beatLamps) l.classList.add("is-on");
        showBeatStamp(depth); // #6 回収確定表示
        playSE("card_insert"); // 確定の打刻
        await typeCue(cues.done);
        await seg(600);
      }
    } catch (e) { /* 演出側の例外でクリア導線を止めない */ }
    if (B.result) return B.result;
    return finishBeat("done");
  }

  // 1深度分の演出本体。mode: "clear"（クリア時）/ "archive"（回想）
  // opts.session: 回収の間（phase: "beat"）が先行生成したセッションの引き継ぎ（§6.2）
  // opts.skipIntro: ビート中の SKIP（深度15）→ 導入ページを飛ばして選択UIから開始する
  async function playPresentation(depth, mode, opts) {
    if (!DATA || !grabEls()) return;
    const token = ++dcToken;
    const branch0 = getBranch();
    const keep = (opts && opts.session && S === opts.session) ? S : null;
    if (keep) {
      // ビートレイヤーを畳み、VN ウィンドウを出す（is-beat 解除）。
      // "done" の場合は finishBeat 側のフェードが走っているためレイヤー自体は触らない。
      if (opts.skipIntro && els.beat) { els.beat.hidden = true; els.beat.classList.remove("is-on", "is-out"); }
      els.root.classList.remove("is-beat");
      S.mode = mode; S.depth = depth; S.phase = "pages";
      S.typing = false; S.atEnd = false; S.skip = false; S.ff = false;
      S.waitResolve = null; S.choiceResolve = null; S.finishResolve = null;
      S.branchChosen = depth === 15 && mode === "archive";
    } else {
      S = { mode, depth, typing: false, atEnd: false, skip: false, ff: false, closed: false,
            waitResolve: null, choiceResolve: null, finishResolve: null, phase: "pages",
            branchChosen: depth === 15 && mode === "archive", seenBefore: false };
    }
    // 既読スキップ（§3.4）: その深度の既読がある場合のみ FF を出す（初回は出さない）
    const seen = loadSeen();
    const seenBefore = depth === 15
      ? !!(seen.pages["15"] || BRANCHES.some((b) => seen.pages["15:" + b]))
      : !!seen.pages[String(depth)];
    S.seenBefore = seenBefore;
    els.ff.hidden = !(mode === "clear" && seenBefore);
    els.skip.hidden = false;
    els.skip.textContent = mode === "archive" ? "CLOSE ✕" : "SKIP";
    els.report.hidden = true;
    els.choices.hidden = true;
    // 回想（archive）経由では playForContext の BGM 切替を通らないため、ここで演出専用曲
    // bgm:ending へ切り替え、終了時に元の wanted（タイトル等）へ戻す（v25）。
    const archiveBgmPrev = (mode === "archive" && typeof audio !== "undefined" && audio) ? audio.wanted : undefined;
    if (archiveBgmPrev !== undefined) { try { audio.playBgm("ending"); } catch (e) { /* noop */ } }
    openOverlay();
    try {
      if (depth >= 1 && depth <= 14) {
        const f = DATA.fragments[depth];
        setChip(depth, null);
        setArt(f.artFile, depth, null);
        const r = await runPages(f.pages, token, String(depth));
        if (r === "closed" || r === "skip") return; // SKIP は演出全体を飛ばして戦績へ（§3.4）
      } else if (depth === 15) {
        setChip(15, null);
        setArt(DATA.depth15.artFile, 15, null);
        // 導入の最終ページ（選択提示文）は回想でも同じく reduced-motion で読めないため、
        // モードを問わずタップ待ちを挟む（holdLast は reduced-motion 時のみ作用する）
        let r1 = "done";
        if (!(opts && opts.skipIntro)) { // ビート中 SKIP の着地点は選択UIの手前（§6.2 "skipIntro"）
          r1 = await runPages(DATA.depth15.intro, token, "15", { holdLast: true });
          if (r1 === "closed") return;
        }
        // SKIP / FF の着地点は選択UIの手前まで（§2.3・§3.4）。選択だけは必須。
        S.skip = false; S.ff = false; // セグメントを跨いだらフラグは解除する
        let branch = null;
        if (mode === "archive") {
          branch = branch0; // 回想で読めるのは選択済み分岐のみ（§3.5）
          if (!branch) return;
        } else {
          branch = await runChoice(token);
          if (!branch || !S || S.closed) return;
          setBranch(branch); // 選択した瞬間に保存（再クリアで上書き可・§3.5）
          S.branchChosen = true;
          els.skip.hidden = false;
          els.ff.hidden = !(mode === "clear" && S.seenBefore);
        }
        const br = DATA.depth15.branches[branch];
        setArt(br.artFile, 15, branch, "DEPTH 15 — " + branch.toUpperCase());
        const r2 = await runPages(br.pages, token, "15:" + branch);
        if (r2 === "closed" || r2 === "skip") return;
      } else { // 16〜20 栄光枠: 結末別共有絵＋称号＋後日談（J-5）
        const branch = branch0;
        if (!branch) return; // 分岐未記録では出さない（§2.3 状態表）
        const t = DATA.titles[depth];
        setChip(depth, branch);
        setArt(DATA.afterArtFiles[branch], depth, branch, "DEPTH " + depth + " — " + branch.toUpperCase());
        const pages = [
          { t: t.jp + " — " + t.en, title: true },
          { g: DATA.aftermath[branch][depth], voiceId: aftermathVoiceId(branch, depth) },
        ];
        const r = await runPages(pages, token, String(depth));
        if (r === "closed" || r === "skip") return;
      }
      if (!S || S.closed) return;
      showEndButton();
      await waitFinish();
    } finally {
      stopVoice();
      if (archiveBgmPrev !== undefined) { try { audio.playBgm(archiveBgmPrev); } catch (e) { /* noop */ } }
      closeOverlay();
      if (S && S.choiceResolve) { const r = S.choiceResolve; S.choiceResolve = null; r(null); }
      S = null;
    }
  }

  // クリア時フック（main.js の onRunClear から await される）
  async function playForContext(context) {
    const depth = resolveDepth(context || {});
    if (!depth || !DATA) return false;
    markCleared(depth);
    if (depth >= 16 && !getBranch()) return false; // §2.3: 分岐未記録なら演出なし（現行フロー）
    // §3.7 改訂（v25）: 演出開始時にボスBGMから演出専用曲 bgm:ending へ切り替える。
    // 音量は audio.js の BGM_TRACK_GAIN で一段下げてあり、Gray ボイスが上に乗る前提。
    // 演出後の文脈復帰は main.js の onRunClear → changeScene("CLEAR") が担う。
    try { if (typeof audio !== "undefined" && audio) audio.playBgm("ending"); } catch (e) { /* noop */ }
    if (depth <= 15) {
      // 回収の間（RECOVERY-BEAT-FINAL §6.1 手順5）: 深度15以下の場合のみ差し込む。
      // 深度16〜20では出さない（手順3を通過した分岐記録ありでも、ここのガードで担保）。
      // 差し込みは playForContext の内部に閉じ、main.js 側の変更はゼロ。
      const beat = await playRecoveryBeat(depth);
      if (beat === "skipAll") {
        // 演出全体を飛ばして戦績へ（遷移は main.js 側の現行フロー）。セッションを畳む。
        dcToken += 1;
        stopVoice();
        if (els.beat) { els.beat.hidden = true; els.beat.classList.remove("is-on", "is-out"); }
        if (els.root) els.root.classList.remove("is-beat");
        closeOverlay();
        S = null;
        return true;
      }
      await playPresentation(depth, "clear", { session: S, skipIntro: beat === "skipIntro" });
      return true;
    }
    await playPresentation(depth, "clear");
    return true;
  }

  // ---------- 回想（アーカイブ） ----------
  function archiveAvailability(depth, seen, branch) {
    if (!seen.cleared[String(depth)]) return false;
    if (depth >= 15 && !branch) return false; // 15は分岐記録が前提、16〜20は §2.3 状態表どおり
    return true;
  }
  function openArchive() {
    const root = $id("archive-screen");
    const list = $id("archive-list");
    if (!root || !list || !DATA) return;
    const seen = loadSeen();
    const branch = getBranch();
    list.replaceChildren();
    for (let d = 1; d <= 20; d += 1) {
      const avail = archiveAvailability(d, seen, branch);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "archive-row" + (avail ? "" : " is-locked");
      const main = document.createElement("span");
      main.className = "archive-row__main";
      const sub = document.createElement("span");
      sub.className = "archive-row__sub";
      if (!avail) {
        main.textContent = "DEPTH " + String(d).padStart(2, "0") + " — NO SIGNAL";
        sub.textContent = ""; // 未到達は見出しも伏せる（ネタバレ防止・§3.5）
      } else if (d <= 14) {
        main.textContent = "DEPTH " + String(d).padStart(2, "0");
        sub.textContent = "FRAGMENT " + String(d).padStart(2, "0") + " / 15";
      } else if (d === 15) {
        main.textContent = "DEPTH 15";
        sub.textContent = "真エンド — " + (BRANCH_JP[branch] || "");
      } else {
        const t = DATA.titles[d];
        main.textContent = "DEPTH " + d;
        sub.textContent = t ? (t.jp + " " + t.en) : "";
      }
      row.append(main, sub);
      if (avail) {
        row.addEventListener("click", async () => {
          playSE("switch");
          await playPresentation(d, "archive");
        });
      } else {
        row.disabled = true;
      }
      list.append(row);
    }
    root.hidden = false;
    void root.offsetWidth;
    root.classList.add("is-on");
  }
  function closeArchive() {
    const root = $id("archive-screen");
    if (!root) return;
    root.classList.remove("is-on");
    root.hidden = true;
  }

  // ---------- DOM 配線 ----------
  function wire() {
    if (!grabEls()) return;
    els.root.addEventListener("pointerdown", (event) => {
      if (!S || S.closed) return;
      if (event.target.closest && event.target.closest("button")) return; // ボタンは本来動作を優先
      if (S.phase === "choice") return;
      if (S.typing) { try { session.advance = true; } catch (e) { /* noop */ } return; }
      if (S.phase === "beat") { if (S.beatCtl) S.beatCtl.tap(); return; } // 回収の間: タップで区間送り（§1）
      if (S.atEnd) { if (S.finishResolve) { const r = S.finishResolve; S.finishResolve = null; r(); } return; }
      pokeWaiter("advance");
    });
    els.skip.addEventListener("click", () => {
      if (!S) return;
      playSE("switch");
      if (S.phase === "beat" && S.beatCtl) {
        // 回収の間での SKIP は「演出全体スキップ」の既存意味を維持する（深度15は
        // 選択UIの手前まで）。伝播は playRecoveryBeat の戻り値で担保する（§6.2）
        S.beatCtl.skip(S.depth === 15 ? "skipIntro" : "skipAll");
        return;
      }
      if (S.mode === "archive") { // 回想中は CLOSE として働く
        S.closed = true;
        dcToken += 1;
        pokeWaiter("closed");
        if (S.finishResolve) { const r = S.finishResolve; S.finishResolve = null; r(); }
        return;
      }
      if (S.depth === 15 && S.phase !== "choice" && !S.branchChosen) {
        // 深度15: SKIP の着地点は選択UIの手前（導入を飛ばして選択へ）
        S.skip = true;
        pokeWaiter("skip");
        return;
      }
      S.skip = true;
      pokeWaiter("skip");
      if (S.finishResolve) { const r = S.finishResolve; S.finishResolve = null; r(); }
    });
    els.ff.addEventListener("click", () => {
      if (!S) return;
      if (S.phase === "beat") return; // 回収の間に FF の役割はない（ボタンも出していない）
      playSE("switch");
      S.ff = true;
      pokeWaiter("ff");
    });
    els.report.addEventListener("click", () => {
      if (S && S.finishResolve) { const r = S.finishResolve; S.finishResolve = null; playSE("switch"); r(); }
    });
    const ac = $id("archive-close");
    if (ac) ac.addEventListener("click", () => { playSE("switch"); closeArchive(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();

  window.DepthClear = {
    playForContext,
    playPresentation,
    preloadForDepth,
    preloadForContext,
    openArchive,
    closeArchive,
    getForcedDepth: () => forcedDepth,
    getBranch,
    debug: { markCleared, setBranch, loadSeen },
  };
})();
