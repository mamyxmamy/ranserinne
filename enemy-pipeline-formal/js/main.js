/* CRT shell. Scenes TITLE / MAP / SAFEHOUSE / EVENT / BATTLE / REWARD / GAMEOVER.
   The first unfinished run opens on a scripted battle. Old Gray's radio pauses the cards. */

const audio = window.audioManager;

function cueSE(name) {
  if (!audio || !name) return;
  const fire = () => {
    if (audio.booted && audio.ctx && audio.ctx.state === "running") audio.playSE(name);
  };
  if (audio.booted && audio.ctx && audio.ctx.state === "running") {
    fire();
    return;
  }
  audio.unlock().then(fire);
}

const SCENE_BGM = {
  TITLE: "title",
  VESSEL: "title",
  MAP: "map",
  // v14.3 配線メモ（bgm-prompts-2026-11-12）: EVENT はマップ曲を流用。
  // v25 配線メモ（追加5枠）: SAFEHOUSE は専用曲 bgm:safehouse ＋換気扇環境音に置き換え
  SAFEHOUSE: "safehouse",
  EVENT: "map",
  BATTLE: "battle",
  REWARD: "reward",
  GAMEOVER: "gameover",
  CLEAR: "reward",
};

const SPEECH = "我々は新たなデジタル防壁によって、国家の安全を——";
// PROMPT-22: ブラックアウトからの初回通信（素体の用語説明を含む4行）
// PROMPT-26: 導入通信は説明口調を排した3行に短縮（ダイブ直後・全プレイヤー共通）
const GRAY_DIVE_LINES = [
  "……接続完了（ダイブ・サクセス）。相変わらず見事な手際だな、パンドラ。",
  "旧世代の素体へのリンクも正常だ。どの機体も、いつでもいけるぞ。",
  "さあ、仕事の時間だ。手元の【BOOTカード】をドラッグしてスロットに落とせ。システムを叩き起こすぞ。",
];
const SAFEHOUSE_LINE = "[SAFEHOUSE] 鉛の壁だけが、あの忌まわしいネットワークを遮断してくれる。次のダイブに備えろ。";
const TUTORIAL_STORE = "enemy-pipeline-formal-tutorial-v1"; // 正式版専用キー（デモ版のセーブ・既読と分離）
// PROMPT-19/20: 完全版チュートリアル（BOOT→MAP→戦闘3ターン）の通信文
const GRAY_TUT_BOOT = "……聞こえるか、パンドラ。まずは手元の【初期化カード（BOOT）】をドラッグして、リーダのスリットに落とせ。システムをアクティブにするんだ。";
const GRAY_TUT_MAP = [
  "ダイブ成功だ。画面に出ているのがパイプラインの配線図（ノード）だ。",
  "光っている【巡回プログラム（BATTLE）】のノードをクリックして、最初のセクターへ進め。",
];
const GRAY_TUT_INTRO = "敵の巡回プログラムだ。昔の義体（素体）とは勝手が違うぞ、操作を思い出せ。";
// PROMPT-28: 戦闘チュートリアル冒頭（手札を配る前）のレリック説明通信
const GRAY_TUT_RELIC = [
  "パンドラ、左下の【特殊装備（レリック）】を確認しておけ。",
  "今は初期装備の『基礎OS』しかないが、持っているだけで常に効果を発揮する。",
  "道中で使えそうなパーツを拾い、その空き枠を埋めて素体を強化していくんだ。",
];
// PROMPT-22: チュートリアル通信文を新仕様（防護リセット／電力上限／COVERバフ）に合わせて改修
const GRAY_T1 = [
  "敵が攻撃を仕掛けてくる。まずは画面左の【電力（PWR）】を見ろ。毎ターン「3」までしか供給されない貴重なリソースだ。",
  "電力を消費して、手札の【潜伏（COVER）】カードを使え。防護（BLK）を展開して、敵の攻撃を受け止めるんだ。",
];
const GRAY_T1_AFTER = "よし。展開した防護（ブロック）は「ターン終了時」に消滅する。タイミングを間違えるなよ。ターンを終了しろ。";
const GRAY_T2 = "敵に隙ができた。電力を計算しながら、攻撃カードで敵の耐久値を削れ！";
const GRAY_T3_A = "画面中央の【騒音値（NOISE）】を見ろ。カードを切るたび、素体の体内で金属箔が打ち抜かれる。その駆動音がノイズだ。孔の複雑なカードほど音はデカくなる。限界に達すると敵の増援やバフが作動する。";
const GRAY_T3_B = "ノイズを抑えたいなら【潜伏（COVER）】の態勢をとれ。ただし、派手な銃撃を行えば潜伏は即座に解けるぞ。";
const GRAY_T3_C = "安全にいくなら【スタン】ゲージだ。格闘でゲージを最大まで溜めれば、敵をショートさせられる。状況に合わせて選べ。";
const GRAY_TUT_END = "講義はここまでだ。あとは任せたぞ、パンドラ。敵を完全に沈黙させろ！";
// v14.3: 廃棄（Exhaust）カードを初めて入手した時だけ流れるGray通信。発火は「実際にデッキへ加わった瞬間」のみ
// （報酬の回収 claimReward / イベントの add_card）。オファー表示・セーブ復元・手札や捨て札への追加では発火しない。
const EXHAUST_INTRO_STORE = "enemy-pipeline-formal-exhaust-intro-v1";
const GRAY_EXHAUST_LINES = [
  "……待て、パンドラ。今のカード、券面に【廃棄】の刻印があるな。",
  "あれは一度きりのカードだ。切れば素体の体内で金属箔が打ち抜かれ、そのまま砕け散る。歯車は二度と同じ孔を読まない——箔の打ち直しは利かないんだ。",
  "だから切る場面は選べ、パンドラ。……まあ、お前なら見極められるさ。ここぞという一手で使えよ。",
];
function exhaustIntroSeen() {
  try { return window.localStorage.getItem(EXHAUST_INTRO_STORE) === "1"; }
  catch { return false; }
}
function markExhaustIntroSeen() {
  try { window.localStorage.setItem(EXHAUST_INTRO_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// 入手したカードID群の中に未見の廃棄カードがあれば true を返し、その場でフラグを立てる（二度と出さない）
function takeExhaustIntro(ids) {
  if (exhaustIntroSeen()) return false;
  const hit = (ids || []).some((id) => {
    const card = (window.Rewards && Rewards.card(id)) || (window.Cards && Cards.get(id));
    return !!(card && card.isExhaust);
  });
  if (!hit) return false;
  markExhaustIntroSeen();
  return true;
}
// v15.0: 警戒段階（ノイズ3〜）に初めて入った時だけ流れるGray通信（廃棄初回通信と同じ初回のみ方式）
const ALERT_INTRO_STORE = "enemy-pipeline-formal-alert-intro-v1";
const GRAY_ALERT_LINE = "ノイズが3に達すると警戒段階だ。敵が追加行動を取ってくる。ノイズを下げるか、先に片付けるかだ。";
function alertIntroSeen() {
  try { return window.localStorage.getItem(ALERT_INTRO_STORE) === "1"; }
  catch { return false; }
}
function markAlertIntroSeen() {
  try { window.localStorage.setItem(ALERT_INTRO_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// BATTLE-ANIM JOB 0-2: 演出速度（×1／×2、U-5）の保存。サウンド設定と同じ localStorage 流儀。
const ANIM_SPEED_STORE = "enemy-pipeline-formal-anim-speed-v1";
function loadAnimSpeed() {
  try { return window.localStorage.getItem(ANIM_SPEED_STORE) === "2" ? 2 : 1; }
  catch { return 1; }
}
function saveAnimSpeed(x) {
  try { window.localStorage.setItem(ANIM_SPEED_STORE, String(x)); }
  catch { /* storage unavailable */ }
}
// 解禁キャラ2 VESSEL 09 "GHOST-TAPE" の解禁フラグ（既存の初回のみストアと同じ localStorage 方式）。
// 解禁条件（2026-11-16 決定）: VESSEL 04 "GOLIATH" を使ってランをクリアした時点。
const GHOST_TAPE_UNLOCK_STORE = "enemy-pipeline-formal-ghosttape-unlock-v1";
function ghostTapeUnlocked() {
  try { return window.localStorage.getItem(GHOST_TAPE_UNLOCK_STORE) === "1"; }
  catch { return false; }
}
function markGhostTapeUnlocked() {
  try { window.localStorage.setItem(GHOST_TAPE_UNLOCK_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// 解禁キャラ1 VESSEL 04 "GOLIATH" の解禁フラグ（2026-11-16 本人承認でゲートを追加）。
// 解禁条件: VESSEL 07 を使ってランをクリアした時点。解禁連鎖は 07 → GOLIATH → GHOST-TAPE。
// 移行配慮: ゲート導入前に GOLIATH でクリア済み（= GHOST-TAPE 解禁済み）のプレイヤーは、
// GOLIATH を遡ってロックしないよう解禁扱いにする。
const GOLIATH_UNLOCK_STORE = "enemy-pipeline-formal-goliath-unlock-v1";
function goliathUnlocked() {
  if (ghostTapeUnlocked()) return true;
  try { return window.localStorage.getItem(GOLIATH_UNLOCK_STORE) === "1"; }
  catch { return false; }
}
function markGoliathUnlocked() {
  try { window.localStorage.setItem(GOLIATH_UNLOCK_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// 解禁キャラ3 VESSEL 13 "WEAVER" の解禁フラグ（実装追補 DESIGN-WEAVER-IMPL-ADDENDUM.md §1、2026-11-16 確定）。
// 解禁条件: VESSEL 09 "GHOST-TAPE" を使ってランをクリアした時点。解禁連鎖は 07 → GOLIATH → GHOST-TAPE → WEAVER。
const WEAVER_UNLOCK_STORE = "enemy-pipeline-formal-weaver-unlock-v1";
function weaverUnlocked() {
  try { return window.localStorage.getItem(WEAVER_UNLOCK_STORE) === "1"; }
  catch { return false; }
}
function markWeaverUnlocked() {
  try { window.localStorage.setItem(WEAVER_UNLOCK_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// 解禁キャラ4（最終機体）VESSEL 00 "REACTOR" の解禁フラグ（実装追補 DESIGN-REACTOR-IMPL-ADDENDUM.md、2026-11-17 本人決定）。
// 解禁条件: VESSEL 13 "WEAVER" を使ってランをクリアした時点。解禁連鎖は 07 → GOLIATH → GHOST-TAPE → WEAVER → REACTOR で完成する。
const REACTOR_UNLOCK_STORE = "enemy-pipeline-formal-reactor-unlock-v1";
function reactorUnlocked() {
  try { return window.localStorage.getItem(REACTOR_UNLOCK_STORE) === "1"; }
  catch { return false; }
}
function markReactorUnlocked() {
  try { window.localStorage.setItem(REACTOR_UNLOCK_STORE, "1"); }
  catch { /* storage unavailable */ }
}
// 作戦深度（DEPTH）の解禁記録（DESIGN-DEPTH-SYSTEM-FINAL §2）。解禁判定の唯一の正は
// unlockedMax。キャラ解禁キー群とは独立（D-5: 深度はキャラ解禁の条件にならず、逆もない）。
// 既読・分岐の記録（ending-seen-v1／ending-branch-v1）は演出専用で、解禁には使わない。
const DEPTH_UNLOCK_STORE = "enemy-pipeline-formal-depth-unlock-v1";
function loadDepthProgress() {
  const empty = { unlockedMax: 1, clears: {}, bestByCharacter: {} };
  let raw = null;
  try { raw = window.localStorage.getItem(DEPTH_UNLOCK_STORE); }
  catch { return empty; }
  if (!raw) return empty;
  let o = null;
  try { o = JSON.parse(raw); } catch { return empty; }
  if (!o || typeof o !== "object") return empty;
  // フィールド単位の正規化（§2.1 軽微3）: 壊れた値を増幅して保存し直さない
  const out = { unlockedMax: 1, clears: {}, bestByCharacter: {} };
  const um = Number(o.unlockedMax);
  if (Number.isFinite(um)) out.unlockedMax = Math.max(1, Math.min(20, Math.floor(um)));
  if (o.clears && typeof o.clears === "object") {
    for (const [k, v] of Object.entries(o.clears)) {
      const d = Number(k);
      const n = Number(v);
      if (Number.isInteger(d) && d >= 1 && d <= 20 && Number.isFinite(n) && n > 0) {
        out.clears[String(d)] = Math.floor(n);
      }
    }
  }
  if (o.bestByCharacter && typeof o.bestByCharacter === "object") {
    for (const [k, v] of Object.entries(o.bestByCharacter)) {
      const n = Number(v);
      if (typeof k === "string" && k && Number.isFinite(n) && n >= 1 && n <= 20) {
        out.bestByCharacter[k] = Math.floor(n);
      }
    }
  }
  return out;
}
function depthUnlockedMax() {
  return loadDepthProgress().unlockedMax;
}
// クリア確定（§6.1）: bossClearSequence のキャラ解禁ブロック直後・clearSave の前でのみ呼ぶ。
function markDepthCleared(depth, characterId) {
  const d = Math.floor(Number(depth));
  if (!Number.isInteger(d) || d < 1 || d > 20) return;
  const p = loadDepthProgress();
  const k = String(d);
  p.clears[k] = (p.clears[k] || 0) + 1;
  p.unlockedMax = Math.max(p.unlockedMax, Math.min(20, d + 1));
  if (characterId) {
    p.bestByCharacter[characterId] = Math.max(p.bestByCharacter[characterId] || 0, d);
  }
  try { window.localStorage.setItem(DEPTH_UNLOCK_STORE, JSON.stringify(p)); }
  catch { /* storage unavailable */ }
}
// 層到達回数の記録（DESIGN-ENEMIES-DECISIONS E-8）。アーキビスト／エコーは層への
// 初到達では登場せず（初回は GATEKEEPER）、2回目以降の到達で登場する。到達の数え方は
// 「その層のマップを生成した回数」＝ランをまたいで永続する。復元（CONTINUE）では
// マップを再生成しないため二重に数えない。判定は map.js 側がこの記録の注入を受けて行う。
const LAYER_VISITS_STORE = "enemy-pipeline-formal-layer-visits-v1";
function loadLayerVisits() {
  const empty = { 1: 0, 2: 0, 3: 0 };
  let raw = null;
  try { raw = window.localStorage.getItem(LAYER_VISITS_STORE); }
  catch { return empty; }
  if (!raw) return empty;
  let o = null;
  try { o = JSON.parse(raw); } catch { return empty; }
  if (!o || typeof o !== "object") return empty;
  const out = { 1: 0, 2: 0, 3: 0 };
  for (const layer of [1, 2, 3]) {
    const n = Number(o[layer]);
    if (Number.isFinite(n) && n > 0) out[layer] = Math.floor(n);
  }
  return out;
}
function syncLayerVisitCounts() {
  if (window.PipelineMap && PipelineMap.setLayerVisitCounts) {
    PipelineMap.setLayerVisitCounts(loadLayerVisits());
  }
}
// 層への到達を 1 回分記録する。呼び出し点は「実ランでその層のマップを生成する箇所」
// （startRun／層遷移／MPホスト開始）のみ。生成より前に呼ぶことで、その層のボス解決に
// 今回到達分を含めた回数が渡る（初到達=1 → GATEKEEPER、2回目以降 → 層ボス）。
function markLayerArrived(layer) {
  const idx = layer >= 1 && layer <= 3 ? layer : 1;
  const visits = loadLayerVisits();
  visits[idx] = (visits[idx] || 0) + 1;
  try { window.localStorage.setItem(LAYER_VISITS_STORE, JSON.stringify(visits)); }
  catch { /* storage unavailable */ }
  syncLayerVisitCounts();
}
syncLayerVisitCounts();
async function maybeAlertIntro() {
  if (alertIntroSeen() || !battle || session.phase !== "combat") return;
  if (myPlayer().hp <= 0 || battle.enemy.dead) return;
  if ((myPlayer().noise || 0) < 3) return;
  markAlertIntroSeen();
  await presentRadio([GRAY_ALERT_LINE]);
}
const GRAY_PINCH = "パンドラ、応答しろ！ ……おい、死ぬんじゃないぞ。作戦よりお前の命が最優先だ！";
const GRAY_WIN = "見事だ。……昔のようには動かんと言ったが、杞憂だったな。先へ進もう。";
const GRAY_BOSS = "気をつけろパンドラ。パイプラインの最深部……防壁AIの直属防衛ユニットだ。これまでの雑魚とは火力が違うぞ。";
// 旧 GRAY_CLEAR（固定文）は深度クリア演出の実装Aで廃止。各深度の Gray ページ
// （js/ending-data.js の E-01〜E-15／後日談）へ役割を移管した（DESIGN-DEPTH-CLEAR-FINAL §2.2 前提作業①）。
// JOB 3M-2 (C-6): マップクリア遷移時の Gray 通信。仮文言・3M-Tで差し替え（正式文言は文章フロー 3M-T で確定する）。
const GRAY_MAP_CLEAR_L1 = "……抜けたか。次の層へ降りろ、パンドラ。通信は維持する。"; // 仮文言・3M-Tで差し替え
const GRAY_MAP_CLEAR_L2 = "……第二層も突破したな。さらに深く降りろ、パンドラ。油断するな。"; // 仮文言・3M-Tで差し替え
// JOB 3M-2 (C-6): 3マップ本適用のマップ幅（ROUTE-3MAP-IMPL-PLAN §8 論点6 確定値）
const MAP_WIDTHS_3M = Object.freeze([3, 4, 4, 3, 2, 1]);
// JOB 3M-2 (C-5/C-6): 第1・2層ボス撃破後の SALVAGE 報酬完了後にマップ遷移すべきことを示すフラグ。
// claimReward / skipReward が finishCombat の代わりに advanceToNextMap() へ分岐するために使う。
let pendingMapAdvance = false;
const GRAY_DEATH = "パンドラッ！！……おい、どうした！応答しろ、パンドラァァァ！！";

const BOOT = {
  id: "boot",
  code: "BOOT",
  name: "【初期化＆起動】",
  cost: 0,
  noise: 0,
  stance: "COVER",
  ink: "boot",
  text: "INITIALIZE & BOOT",
};

const CODE_BY_TYPE = { attack: "CQC", defend: "COV", skill: "DIS", finish: "END", curse: "NOI" };
const CODE_BY_ID = {
  strike_cqc: "CQC",
  defend_cover: "COV",
  gun_suppressed_pistol: "PST",
  gun_combat_shotgun: "SHG",
  hack_overload: "HAK",
  tactic_adrenaline: "ADR",
  curse_flashback: "NOI",
  wired_jack: "JAK",
  illegal_overclock: "OVC",
  full_burst: "BST",
  forced_cooling: "COL",
  acoustic_flare: "FLR",
  pile_bunker: "PBK",
  close_combat: "CCB",
  jamming_flare: "JAM",
  noise_canceller: "NCL",
  decoy_foil: "DCY",
  serial_punch: "SPN",
  tactical_wait: "TWT",
  goliath_iron_strike: "IRN",
  goliath_heavy_plating: "HVP",
  goliath_exhaust_roar: "ROA",
  goliath_sledgehammer: "SLG",
  goliath_overdrive: "OVD",
  goliath_steel_press: "STP",
  goliath_rock_pile: "RKP",
  goliath_blowback: "BLB",
  goliath_heavy_tread: "TRD",
  goliath_purge_punish: "PRG",
  ghost_echo_needle: "ECH",
  ghost_mute_tape: "MUT",
  ghost_tape_splice: "SPL",
  ghost_silent_cut: "SCT",
  ghost_phase_invert: "INV",
  ghost_scrap_noise: "SCR",
  ghost_fade_out: "FAD",
  ghost_reel_recycle: "REC",
  ghost_phantom_tape: "PHA",
  ghost_silence_end: "SIL",
  weaver_laying_arm: "LAY",
  weaver_armor_fold: "FLD",
  weaver_barbed_wire: "BWR",
  weaver_audio_mine: "AMN",
  weaver_decoy_spin: "DSP",
  weaver_double_wire: "DWR",
  weaver_echo_mine: "EMN",
  weaver_glue_wire: "GWR",
  weaver_leg_lock: "LLK",
  weaver_reposition: "RPS",
  weaver_full_detonation: "FDT",
  echo_search: "SCH",
  foil_sort: "SRT",
  dense_punch: "DPU",
  staged_vent: "SVT",
  aim_jam: "AJM",
  shadow_strike: "SHS",
  iron_door: "IDR",
  reserve_cell: "RCL",
  double_tap: "DTP",
  silent_service: "SSV",
};
const INK_BY_CATEGORY = {
  CURSE: "curse",
  STEALTH: "stealth",
  GUN: "gun",
  DIGITAL: "digital",
  TACTIC: "tactic",
  HAK: "digital",
  TEC: "tactic",
  DEF: "stealth",
  ACOUSTIC: "acoustic",
  TRAP: "tactic",
};

function isCurse(card) {
  return !!(card && (card.unplayable || card.type === "curse" || card.cost < 0
    || (card.effects || []).some((effect) => effect.type === "unplayable")));
}

function blurb(card) {
  const parts = [];
  if (isCurse(card)) return "呪装。リーダは受け付けない";
  if (card.requirements.includes("target_stun_ge_1")) parts.push("要スタン値 1以上");
  if (card.requirements.includes("target_stun_max")) parts.push("要スタン最大");
  if (card.requirements.includes("self_noise_le_0")) parts.push("要 静寂");
  for (const effect of card.effects) {
    if (effect.type === "damage" && effect.target === "player") parts.push(`自傷 ${effect.value}`);
    else if (effect.type === "damage" && effect.pierce) parts.push(`ダメージ ${effect.value}（貫通）`);
    else if (effect.type === "damage" && effect.hits && effect.hits > 1) parts.push(`ダメージ ${effect.value} ×${effect.hits}回`);
    else if (effect.type === "damage") parts.push(`ダメージ ${effect.value}`);
    if (effect.type === "stun") parts.push(`スタン +${effect.value}`);
    if (effect.type === "block") parts.push(`防護 +${effect.value}`);
    if (effect.type === "cancel_next_intent") parts.push("次の行動を潰す");
    if (effect.type === "vulnerable") parts.push(`脆弱 +${effect.value || 1}`);
    if (effect.type === "instant_kill") parts.push("その場で制圧");
    if (effect.type === "add_energy") parts.push(effect.overcharge ? `電力 +${effect.value}（上限突破）` : `電力 +${effect.value}`);
    if (effect.type === "add_card_to_discard") parts.push("捨て札に呪装");
    if (effect.type === "heal") parts.push(`HP回復 +${effect.value}`);
    if (effect.type === "drain_energy") parts.push("残りPWR全喪失");
    if (effect.type === "damage_per_noise") parts.push(`ダメージ 開始時ノイズ×${effect.value}`);
    if (effect.type === "block_per_noise") parts.push(`防護 +開始時ノイズ×${effect.value}`);
    if (effect.type === "damage_plus_noise") parts.push(`ダメージ ${effect.value}＋ノイズ×${effect.per}`);
    if (effect.type === "block_plus_noise") parts.push(`防護 +${effect.value}＋ノイズ×${effect.per}`);
    if (effect.type === "damage_plus_played") parts.push(`ダメージ ${effect.value}＋このターンの使用枚数×${effect.per}`);
    if (effect.type === "damage_silence_bonus") parts.push(`ダメージ ${effect.value}（静寂時 +${effect.per}）`);
    if (effect.type === "stun_if_silence") parts.push("使用後ノイズ0以下で スタン +1");
    if (effect.type === "stun_draw_if_max") parts.push(`スタン +${effect.value}（最大到達で1ドロー）`);
    if (effect.type === "scrap_noise") parts.push((effect.value || 1) > 1 ? `敵の次の攻撃${effect.value}回を半減` : "敵の次の攻撃を半減");
    if (effect.type === "draw_bonus_next") parts.push("次ターンのドロー +1");
    if (effect.type === "recycle_discard") parts.push("捨て札から1枚回収（なければ1ドロー）");
    if (effect.type === "search") parts.push("山札から1枚選んで手札へ");
    if (effect.type === "search_top") parts.push(`山札の上${effect.value || 3}枚から1枚を手札へ（残りは捨て札）`);
    if (effect.type === "discard_then_draw") parts.push(`手札1枚を捨てて${effect.value || 1}枚ドロー`);
    if (effect.type === "exhaust_curse_in_hand") parts.push(`手札の呪い1枚を廃棄し${effect.value || 0}枚ドロー`);
    if (effect.type === "trap_sacrifice_draw") parts.push(`設置中の罠1つを取り除き${effect.value || 0}枚ドロー`);
    if (effect.type === "damage_per_exhausted") parts.push(`ダメージ ${effect.value}＋この戦闘の廃棄枚数×${effect.per}`);
    if (effect.type === "weaken_next") parts.push("敵の次の攻撃を半減");
    if (effect.type === "damage_stance_bonus") parts.push(`ダメージ ${effect.value}（${effect.stance || "COVER"}時 +${effect.per}）`);
    // プール大拡充バッチB／C の新規効果（解析テキスト）
    if (effect.type === "damage_stun_bonus") parts.push(`ダメージ ${effect.value}＋スタン蓄積×${effect.per}（最大+${effect.cap}）`);
    if (effect.type === "damage_if_hand_le") parts.push((effect.maxHand || 0) > 0
      ? `ダメージ ${effect.value}（手札${effect.maxHand}枚以下で +${effect.per}）`
      : `ダメージ ${effect.value}（手札がこのカードだけなら +${effect.per}）`);
    if (effect.type === "damage_hold_bonus") parts.push(`ダメージ ${effect.value}（保持中 +${effect.per}）`);
    if (effect.type === "damage_per_negative_noise") parts.push(`ダメージ ${effect.value}＋逆位相×${effect.per}`);
    if (effect.type === "block_per_trap") parts.push(`防護 +${effect.value}＋設置罠×${effect.per}（最大+${effect.cap}）`);
    // REACTOR 専用プリミティブ（DESIGN-POOL-EXPANSION2-DRAFT.md §6、2026-11-17 実装）
    if (effect.type === "damage_per_hp_lost") parts.push((effect.perHp || 1) > 1
      ? `ダメージ ${effect.value}＋減少HP/${effect.perHp}`
      : `ダメージ ${effect.value}＋減少HP`);
    if (effect.type === "damage_per_slip") parts.push(`ダメージ ${effect.value}＋臨界カウンタ×${effect.per}`);
    if (effect.type === "damage_equal_hp_fraction") parts.push(`ダメージ ${effect.value}＋現在HP/${effect.denom || 2}（自傷 現在HP/${effect.denom || 2}）`);
    if (effect.type === "purge_start") parts.push("臨界排熱 始動（廃棄で蓄積／ターン終了時スリップ）");
    if (effect.type === "purge_reduce") parts.push(`臨界カウンタ −${effect.value}`);
    if (effect.type === "draw_if_hp_le") parts.push(`${effect.value}ドロー（HP${Math.round((effect.threshold || 0.25) * 100)}%以下なら${effect.bonus}ドロー）`);
    if (effect.type === "next_attack_bonus") parts.push(`次の攻撃 +${effect.value}`);
    if (effect.type === "trap" && effect.kind === "audio_mine") parts.push(`設置：NOISE ${effect.minNoise || 3}以上で敵行動時に発動 ${effect.damage}ダメージ＋行動キャンセル`);
    if (effect.type === "trap" && effect.kind === "echo_mine") parts.push(`設置：NOISE ${effect.minNoise || 2}以上で敵行動時に発動 ${effect.damage}ダメージ＋スタン +${effect.stun || 0}`);
    if (effect.type === "trap" && effect.kind === "glue_wire") parts.push(`設置：敵の非攻撃行動時に発動 スタン +${effect.stun || 0}`);
    if (effect.type === "trap" && (effect.kind === "barbed_wire" || effect.kind === "double_wire")) parts.push(`設置：敵の攻撃時に発動 ${effect.damage}ダメージ＋その攻撃 −${effect.cut || 0}`);
    if (effect.type === "trap" && effect.kind === "decoy_mine") parts.push(`設置：敵行動時に発動 ${effect.drawOnTrigger || 1}ドロー`);
    if (effect.type === "trap" && effect.kind === "alarm_wire") parts.push(`設置：敵行動時に発動 スタン +${effect.stun || 0}＋防護 +${effect.selfBlock || 0}`);
    if (effect.type === "trap" && effect.kind === "spark_trap") parts.push(`設置：敵の攻撃時に発動 ${effect.damage}ダメージ＋その攻撃 −${effect.cut || 0}＋防護 +${effect.selfBlock || 0}`);
    if (effect.type === "reposition") parts.push("設置中の罠1つを手札へ戻す＋1ドロー");
    if (effect.type === "detonate_all") parts.push("設置中の罠をすべて即時起爆");
    if (effect.type === "power") parts.push(
      effect.kind === "energy_per_turn" ? `戦闘中 毎ターン PWR +${effect.value}`
      : effect.kind === "block_per_turn" ? `戦闘中 毎ターン 防護 +${effect.value}`
      : effect.kind === "vent_per_turn" ? `戦闘中 毎ターン ノイズ −${effect.value}`
      : effect.kind === "turn_start_noise_damage" ? `戦闘中 毎ターン 開始時ノイズ×${effect.value}ダメージ`
      : effect.kind === "standby_armor_up" ? `戦闘中 待機防護の変換率 +${effect.value}`
      : effect.kind === "trap_damage_up" ? `戦闘中 罠ダメージ +${effect.value}`
      : effect.kind === "slip_halve" ? "戦闘中 ターン終了時のスリップ半減（切り上げ）"
      : "戦闘中 持続効果");
    if (effect.type === "tread") parts.push("このターン被ダメをノイズ分軽減");
    if (effect.type === "draw_penalty_next") parts.push(`次ドロー -${effect.value}`);
    if (effect.type === "reset_noise") parts.push("ノイズ リセット");
    if (effect.type === "draw") parts.push(`${effect.value}枚ドロー`);
    if (effect.type === "halve_next") parts.push("次の被ダメージ半減");
    if (effect.type === "unplayable") parts.push("読取不能");
  }
  // CQCカテゴリは使用時に敵スタン+1（battle.js playCard の仕様）。即制圧カードは敵が消滅しスタンが乗らないため除外
  if (card.category === "CQC" && !(card.effects || []).some((effect) => effect.type === "instant_kill")) parts.push("スタン +1");
  return parts.join(" / ");
}

function face(card) {
  const curse = isCurse(card);
  // 正式版フェーズ1（設計書 §A「規格外巨体」）: GOLIATH のランでは、共通プールのCOVER系
  // スキル／防御カードの解析テキストに置換警告を上書き表示する（実際の変換は battle.js）。
  const oversized = !!(typeof run !== "undefined" && run && run.character === "vessel04"
    && card.stance_change === "COVER" && card.type !== "attack");
  const rules = blurb(card);
  // 『磁気ホールド』: 保持されて戻ってきた実体は、このターンだけ実効コスト −1 で表示する
  const held = !!card.__heldNow;
  // 『炉心溶融』（REACTOR固有OS）: 現在のPWRでは足りないが HP を燃やして使用できるカードは
  // コスト数値を赤く点滅させる（makeCard の is-meltdown／CSS）。使用可否の最新化は refreshHand でも行う
  const meltdown = !!(typeof run !== "undefined" && run && run.character === "vessel00"
    && typeof battle !== "undefined" && battle && myPlayer()
    && !curse && (card.cost || 0) > (myPlayer().energy || 0));
  return {
    id: card.id,
    uid: card.__uid || 0,
    held,
    meltdown,
    code: CODE_BY_ID[card.id] || CODE_BY_TYPE[card.type] || "ORD",
    name: card.name,
    cost: held ? Math.max(0, (card.cost || 0) - 1) : card.cost,
    baseCost: card.cost,
    noise: card.noise,
    stance: card.stance_change || "",
    ink: INK_BY_CATEGORY[card.category] || "cqc",
    exhaust: !!card.isExhaust,
    trap: (card.effects || []).some((effect) => effect.type === "trap"),
    curse,
    oversized,
    flavor: card.flavor || "",
    // カード面では短縮形（面の面積では長文が収まらず潰れるため。CARD-TEXT-AUDIT P1）。
    // 完全な置換文は rulesFull に残し、解析パネルでのみ表示する。
    rules: oversized ? `[ERROR] COVER不発 → BLK +5 / NOISE +1` : rules,
    rulesFull: oversized ? `[ERROR: OVERSIZED VESSEL] COVER不発 → BLK +5 / NOISE +1 に変換（${rules}）` : rules,
    text: card.flavor || blurb(card),
  };
}

function reasonText(reason) {
  if (reason === "energy") return "電力不足";
  if (reason === "target_stun_ge_1") return "スタン値不足";
  if (reason === "target_stun_max") return "スタン未最大";
  if (reason === "dead") return "すでに無力";
  if (reason === "down") return "通信途絶";
  if (reason === "curse") return "呪装は拒否";
  if (reason === "trap_limit") return "設置上限";
  if (reason === "no_traps") return "設置中の罠なし";
  if (reason === "self_noise_le_0") return "要 静寂";
  return "読取拒否";
}

const $ = (id) => document.getElementById(id);

const ui = {
  broadcast: $("broadcast"),
  caption: $("caption"),
  broadcastImg: $("broadcast-img"),
  speechVideo: $("speech-video"),
  grayline: $("grayline"),
  introVideo: $("intro-video"),
  hackVideo: $("hack-video"),
  diveBtn: $("dive-btn"),
  skip: $("skip"),
  desk: $("desk"),
  screen: $("screen"),
  mission: $("mission"),
  tactical: $("tactical"),
  log: $("log"),
  link: $("link-state"),
  slot: $("slot"),
  slotLabel: $("slot-label"),
  hopper: $("hopper"),
  note: $("hopper-note"),
  stance: $("stance"),
  stanceHint: $("stance-hint"),
  hp: $("hp-value"),
  hpMax: $("hp-max"),
  hpBar: $("hp-bar"),
  hpGhost: $("hp-bar-ghost"),
  dmgVin: $("dmg-vignette"),
  energy: $("energy-value"),
  energyMax: $("energy-max"),
  energyPips: $("energy-pips"),
  block: $("block-value"),
  enemyHp: $("enemy-hp-value"),
  enemyHpBar: $("enemy-hp-bar"),
  stun: $("stun-value"),
  stunPips: $("stun-pips"),
  enemyBlock: $("enemy-block-value"),
  noiseValue: $("noise-value"),
  noiseMeter: $("noise-meter"),
  noiseBand: $("noise-band"),
  vesselName: $("vessel-name"),
  vesselStage: $("vessel-stage"),
  vesselPrev: $("vessel-prev"),
  vesselNext: $("vessel-next"),
  vesselPos: $("vessel-pos"),
  vesselInfoName: $("vessel-info-name"),
  vesselInfoSys: $("vessel-info-sys"),
  vesselInfoStats: $("vessel-info-stats"),
  vesselInfoDeck: $("vessel-info-deck"),
  vesselInfoFlavor: $("vessel-info-flavor"),
  vesselLaunch: $("vessel-launch"),
  depthPrev: $("depth-prev"),
  depthNext: $("depth-next"),
  depthValue: $("depth-value"),
  depthBand: $("depth-band"),
  depthSummary: $("depth-summary"),
  depthNextInfo: $("depth-next-info"),
  depthBest: $("depth-best"),
  breach: $("breach"),
  contact: $("contact-name"),
  intent: $("intent"),
  shotCall: $("shot-call"),
  enemyAction: $("enemy-action"),
  intentBanner: $("intent-banner"),
  bossPulse: $("boss-pulse"),
  endTurn: $("end-turn"),
  holdBar: $("hold-bar"),
  holdConfirm: $("hold-confirm"),
  holdNone: $("hold-none"),
  holdBack: $("hold-back"),
  pickBar: $("pick-bar"),
  pickMsg: $("pick-msg"),
  pickConfirm: $("pick-confirm"),
  routeReturn: $("route-return"),
  piles: $("piles"),
  glass: $("glass-canvas"),
  cctvScene: $("cctv-scene"),
  cctvMonitor: $("cctv-monitor"),
  cctvRoom: $("cctv-room"),
  cctvEnemy: $("cctv-enemy"),
  cctvLock: $("cctv-lock"),
  cctvAllyLock: $("cctv-allylock"),
  cctvVessel: $("cctv-vessel"),
  cctvDummy: $("cctv-dummy"),
  cctvTarget: $("cctv-target"),
  cctvTime: $("cctv-time"),
  deathMask: $("death-mask"),
  fadeMask: $("fade-mask"),
  silenced: $("silenced"),
  breached: $("breached"),
  cardInspect: $("card-inspect"),
  cardInspectName: $("card-inspect-name"),
  cardInspectBody: $("card-inspect-body"),
  cardInspectFlavor: $("card-inspect-flavor"),
  rewardOffers: $("reward-offers"),
  rewardSecured: $("reward-secured"),
  rewardSkip: $("reward-skip"),
  relicOffers: $("relic-offers"),
  relicOffersList: $("relic-offers-list"),
  relicOffersSwap: $("relic-offers-swap"),
  relicOffersPass: $("relic-offers-pass"),
  returnTerminal: $("return-terminal"),
  enemyName: $("enemy-name"),
  enemyHpMax: $("enemy-hp-max"),
  route: $("route"),
  routePos: $("route-pos"),
  routeHp: $("route-hp"),
  routeMap: $("route-map"),
  routeFloors: $("route-floors"),
  routeLinks: $("route-links"),
  scan: $("scan"),
  scanCount: $("scan-count"),
  ambush: $("ambush"),
  ambushDetail: $("ambush-detail"),
  relics: $("relics"),
  relicsLabel: $("relics-label"),
  traps: $("traps"),
  trapsLabel: $("traps-label"),
  purge: $("purge"),
  purgeLabel: $("purge-label"),
  relicTip: $("relic-tip"),
  relicTipName: $("relic-tip-name"),
  relicTipBody: $("relic-tip-body"),
  relicTipEffect: $("relic-tip-effect"),
  relicTipFlavor: $("relic-tip-flavor"),
  start: $("start-run"),
  restart: $("restart-run"),
  safehouseLine: $("safehouse-line"),
  safehouseChoices: $("safehouse-choices"),
  safehouseVent: $("safehouse-vent"),
  safehouseSever: $("safehouse-sever"),
  deckModal: $("deck-modal"),
  deckList: $("deck-modal-list"),
  deckModalBack: $("deck-modal-back"),
  eventTitle: $("event-title"),
  eventLine: $("event-line"),
  eventBody: $("event-body"),
  eventChoices: $("event-choices"),
  eventAftermath: $("event-aftermath"),
  eventResult: $("event-result"),
  eventReturn: $("event-return"),
  radio: $("radio"),
  radioLine: $("radio-line"),
  radioNext: $("radio-next"),
  attract: $("attract"),
  attractTerm: $("attract-term"),
  attractLogo: $("attract-logo"),
  attractPrompt: $("attract-prompt"),
  installCta: $("install-cta"),
  installBtn: $("install-btn"),
  installHow: $("install-how"),
  continueBtn: $("continue-btn"),
  tutorialBtn: $("tutorial-btn"),
  newgameBtn: $("newgame-btn"),
  archiveBtn: $("archive-btn"),
  archiveBtnDesk: $("archive-btn-desk"),
  coopBtn: $("coop-btn"),
  clearScreen: $("clear-screen"),
  clearReturn: $("clear-return"),
  clearShare: $("clear-share"),
  // JOB 3M-3: 専用クリア画面の実績表示とシート側 X 投稿リンク
  clearStats: $("clear-stats"),
  clearStatsSheet: $("clear-stats-sheet"),
  clearShareSheet: $("clear-share-sheet"),
  creditCard: $("credit-card"),
  creditBy: $("credit-by"),
  creditName: $("credit-name"),
  creditStart: $("credit-start"),
  soundToggle: $("sound-toggle"),
  animSpeedToggle: $("anim-speed-toggle"),
  prologue: $("prologue"),
  prologueTerm: $("prologue-term"),
  prologuePrompt: $("prologue-prompt"),
  // マルチプレイ段階(3) 単位3-2: CO-OP ロビー
  lobbyScreen: $("lobby-screen"),
  lobbyPaneMenu: $("lobby-pane-menu"),
  lobbyPaneRoom: $("lobby-pane-room"),
  lobbyOfflineNote: $("lobby-offline-note"),
  lobbyMenuStatus: $("lobby-menu-status"),
  lobbyRoomStatus: $("lobby-room-status"),
  coopCreate: $("coop-create"),
  coopCode: $("coop-code"),
  coopJoin: $("coop-join"),
  lobbyCodeValue: $("lobby-code-value"),
  lobbyDepthValue: $("lobby-depth-value"),
  lobbyPlayers: $("lobby-players"),
  lobbyPickVessel: $("lobby-pick-vessel"),
  lobbyReady: $("lobby-ready"),
  lobbyStart: $("lobby-start"),
  lobbyLeave: $("lobby-leave"),
  lobbyClose: $("lobby-close"),
  // マルチプレイ段階(3) 単位3-4: 戦闘画面の味方簡易バー
  mpAllyBar: $("mp-ally-bar"),
};

const session = {
  phase: "cinema",
  dead: false,
  linked: false,
  busy: false,
  reading: false,
  offer: [],
  advance: false,
};

let readToken = 0;
let pressTimer = 0;
const press = [];

const SCENE_NAMES = ["TITLE", "VESSEL", "MAP", "SAFEHOUSE", "EVENT", "BATTLE", "REWARD", "GAMEOVER", "CLEAR"];
const SCENE_PHASE = {
  TITLE: "title",
  VESSEL: "vessel",
  MAP: "map",
  SAFEHOUSE: "safehouse",
  EVENT: "event",
  BATTLE: "combat",
  REWARD: "reward",
  GAMEOVER: "gameover",
  CLEAR: "clear",
};

let currentScene = null;

function sceneEl(name) {
  return document.getElementById(`scene-${name.toLowerCase()}`);
}

// v15.3: クリア画面のX投稿（intent）。本文にURLは入れず、ゲームURLは url パラメータに分ける
// （本人のX運用「本文にURLを入れない」方針と整合させる）
const GAME_PAGE_URL = "https://mamyxmamy.github.io/ranserinne/enemy-pipeline-formal/";
function buildShareUrl() {
  const hp = run ? Math.max(0, Math.floor(run.hp || 0)) : 0;
  const hpMax = run ? (run.hpMax || 0) : 0;
  const kills = run && run.kills ? run.kills : 0;
  // JOB 3M-3: 旧文の「第一防壁を突破した」は第1層だけの意味で全層突破（ランクリア）に合わないため、
  // 無難な仮文言へ置き換えた。正式文言は文章フロー 3M-T で差し替える（仮文言・3M-T差し替え対象）。
  const text = `『Enemy Pipeline: Analog Espionage』正式版をクリア！ 作戦を完了した。残りHP ${hp}/${hpMax}・撃破${kills}体。\n#EnemyPipeline #個人ゲーム開発`; // 仮文言・3M-Tで差し替え
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(GAME_PAGE_URL)}`;
}

function refreshClearShare() {
  if (ui.clearShare) ui.clearShare.href = buildShareUrl();
  if (ui.clearShareSheet) ui.clearShareSheet.href = buildShareUrl();
}

// JOB 3M-3: 専用クリア画面の実績表示。使用素体・残HP・撃破数・到達層を、全面オーバーレイと
// デスク内シートの両方へ流し込む。値は run（と onRunClear の context があればそちら）を正とする。
function clearStatsRows(context) {
  const characterId = (context && context.characterId) || (run && run.character) || "vessel07";
  const def = (window.Battle && Battle.CHARACTERS && Battle.CHARACTERS[characterId]) || {};
  const vesselLabel = def.name ? (def.code ? `${def.name} "${def.code}"` : def.name) : characterId;
  const hp = context ? Math.max(0, Math.floor(context.hp || 0)) : (run ? Math.max(0, Math.floor(run.hp || 0)) : 0);
  const hpMax = context ? (context.hpMax || 0) : (run ? (run.hpMax || 0) : 0);
  const kills = context ? (context.kills || 0) : (run && run.kills ? run.kills : 0);
  const layers = context ? (context.layersCleared || context.mapIndex || 3) : (run ? (run.mapIndex || 1) : 1);
  const rows = [
    `使用素体 ${vesselLabel}`,
    `残HP ${hp}/${hpMax}`,
    `撃破数 ${kills}`,
    `到達 第${layers}層（全層突破）`,
  ];
  // 作戦深度の併記（§6.2）: context.depth が実値のときだけ行を足す
  const clearDepth = context ? context.depth : (run ? run.depth : null);
  if (clearDepth) rows.push(`作戦深度 DEPTH ${String(clearDepth).padStart(2, "0")}`);
  // 第0陣 0-5 (§1.2): 第3層ボスでは3択を出さない代わりに、回収したボスレリック名を実績へ載せる。
  // 受け口のみ（ボスプールの候補は第1陣で追加。現行では常に対象なし＝行は出ない）。
  const bossRelics = context && Array.isArray(context.bossRelics)
    ? context.bossRelics
    : collectedBossRelicNames(run);
  if (bossRelics.length) rows.push(`回収ボスレリック ${bossRelics.join("、")}`);
  return rows;
}

function updateClearStats(context) {
  const rows = clearStatsRows(context);
  for (const el of [ui.clearStats, ui.clearStatsSheet]) {
    if (!el) continue;
    el.replaceChildren();
    for (const row of rows) {
      const p = document.createElement("p");
      p.className = "clear-stats__row";
      p.textContent = row;
      el.append(p);
    }
  }
}

// v15.4: GoatCounter イベント送信。計測は補助機能なので、失敗してもゲームは止めない。
// count.js は async 読み込みのため、未ロードなら短時間だけ再試行する。
function trackEvent(path, title) {
  try {
    let tries = 0;
    const send = () => {
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        window.goatcounter.count({ path, title, event: true });
        return true;
      }
      return false;
    };
    if (send()) return;
    const timer = window.setInterval(() => {
      tries += 1;
      if (send() || tries >= 20) window.clearInterval(timer);
    }, 250);
  } catch { /* noop */ }
}

// v14.7: クリア時は全面黒レイヤーを出す（ゲームUIを覆い隠す）。それ以外では必ず消す
function syncClearScreen(on) {
  if (!ui.clearScreen) return;
  if (on) {
    if (ui.clearScreen.hidden) trackEvent("/event/ep-clear", "EP Clear"); // v15.4: 表示遷移のときだけ数える
    refreshClearShare(); // v15.3: 表示時点の戦績で投稿URLを組み直す
    updateClearStats(window.lastRunClearContext || null); // JOB 3M-3: 専用クリア画面の実績も表示時点の値で揃える
    ui.clearScreen.hidden = false;
    void ui.clearScreen.offsetWidth;
    ui.clearScreen.classList.add("is-on");
  } else {
    ui.clearScreen.classList.remove("is-on");
    ui.clearScreen.hidden = true;
  }
}

function changeScene(sceneName) {
  const name = String(sceneName || "").toUpperCase();
  if (name === "OPENING") {
    if (ui.attract) ui.attract.hidden = true;
    opening();
    return;
  }
  if (!SCENE_NAMES.includes(name)) return;
  if (ui.attract) ui.attract.hidden = true;
  // キャラ選択（VESSEL）は専用フル画面シーン: 表示中はメイン画面の desk（HUD）を隠し、
  // 他シーンへ移ったら必ず戻す。scene-vessel 本体は body 直下の section（index.html）。
  if (ui.desk) ui.desk.hidden = name === "VESSEL";
  currentScene = name;
  window.currentScene = name;
  for (const id of SCENE_NAMES) {
    const el = sceneEl(id);
    if (!el) continue;
    const on = id === name;
    el.hidden = !on;
    el.style.display = on ? "block" : "none";
  }
  session.phase = SCENE_PHASE[name];
  syncClearScreen(name === "CLEAR");
  clearCardFocus();
  if (name !== "BATTLE") silenceRadio();
  setMapMode(name === "MAP");
  refreshCommsFold();
  ui.screen.classList.toggle("is-safe", name === "SAFEHOUSE");
  ui.screen.classList.toggle("is-event", name === "EVENT");
  if (name !== "BATTLE") lowHpBgmActive = false; // 戦闘シーンを離れたら低耐久状態は持ち越さない
  updateBossAlert(); // v15.3: 戦闘シーンを離れたらボス低耐久の警告層も確実に止める
  if (name !== "BATTLE") hideEnemyAction();
  // マルチプレイ段階(3) 単位3-4: ホストはシーン遷移のたびにスナップショットを配る
  if (window.MPSync) MPSync.onSceneChanged();
  if (audio) {
    // ボス戦BGM: ボス戦とクリア画面では提供曲を流し続ける（同じ曲名なので再開始しない）
    // v25: ボス曲・通常戦闘曲は層（currentLayer）で切り替える（配線メモ追加5枠）
    let track = bossBgm && (name === "BATTLE" || name === "CLEAR") ? bossBgmTrack() : (SCENE_BGM[name] || null);
    if (name === "BATTLE" && !bossBgm) track = battleBgmTrack();
    // v14.5 低耐久BGM: 低耐久状態のまま戦闘へ入った場合は最初から低耐久曲
    if (name === "BATTLE" && !bossBgm && lowHpBgmActive) track = "battle_lowhp";
    audio.playBgm(track);
    if (name === "SAFEHOUSE") audio.playAmbient("fan");
    else audio.stopAmbient();
  }
}

function hideScenes() {
  currentScene = null;
  window.currentScene = null;
  syncClearScreen(false);
  for (const id of SCENE_NAMES) {
    const el = sceneEl(id);
    if (!el) continue;
    el.hidden = true;
    el.style.display = "none";
  }
  ui.screen.classList.remove("is-safe", "is-event");
  lowHpBgmActive = false;
  setBossAlert(false); // v15.3: 全シーン消去時も心拍層を止める
  hideEnemyAction();
  if (audio) {
    audio.playBgm(null);
    audio.stopAmbient();
  }
}

let shotTimer = 0;

// 『磁気ホールド』選択フェイズの状態（null = 非選択中）。{ uid } で候補実体を保持する
let holdPick = null;

// 共通プール拡張の選択フェイズ（残響サーチ／箔の選別）の状態（null = 非選択中）。
// { kind, candidates, index } で候補一覧と選択中インデックスを保持する
let pickPick = null;
let pickOpenDelayed = false; // SEARCH-RESHUFFLE: ゲスト側でリシャッフル演出の間だけ選択UIの開放を遅らせる

let battle = Battle.createState();
let route = null;
let run = null;

// ==== MP-2-3: マルチプレイ段階(2) 単位2-3 — 自素体アダプタ ====
// 描画・操作関数は battle.player や battle 直下のプレイヤー所有フィールドを直接引かず、
// 自素体（battle.players[myPlayerId]）を返すこのアダプタ経由でアクセスする。
// ソロでは myPlayerId は未指定（null）のため players[0] を指し、互換アクセサ
// （battle.player 等）経由と完全に同じ対象・同じ値になる（参照の付け替えのみで、
// ロジック・数値・乱数消費は一切変えない）。
// 将来のマルチ描画では、接続時に自分の playerId を myPlayerId へ設定するだけで
// 描画・操作の対象が自素体へ切り替わる（配線は段階(3)）。
let myPlayerId = null;
function myPlayer() {
  if (!battle) return null;
  const players = battle.players || [];
  if (myPlayerId !== null && myPlayerId !== undefined) {
    const mine = players.find((p) => p.playerId === myPlayerId);
    if (mine) return mine;
  }
  return players[0] || battle.player || null;
}
function myCharacterId() {
  const me = myPlayer();
  return me ? me.characterId : (battle ? battle.characterId : undefined);
}
let routeToken = 0;
let safehouseToken = 0;
let safehouseChosen = false;
let safehouseLeft = false;
let zippoTimer = 0;
let eventToken = 0;
let eventChosen = false;
let eventLeft = false;
let eventOutcome = null;
let fieldEvent = null;
let tutorialStep = "off";
let tutorialBattle = false;
let pinchHeard = false;
let pinchQueued = false;
let radioToken = 0;
let radioOpen = false;
let radioReady = false;
let radioAdvance = null;
let radioTimer = 0;
let attractToken = 0;
let attractReady = false;

let seq = 0;
let drag = null;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(node, text, live, opts = {}) {
  const gap = opts.gap || 28;
  if (reducedMotion()) {
    node.textContent = text;
    node.classList.remove("is-speaking");
    if (opts.radio && audio) audio.playSE("radio_noise");
    return live();
  }
  node.textContent = "";
  if (opts.caret) node.classList.add("is-speaking");
  for (const ch of text) {
    if (!live()) {
      node.classList.remove("is-speaking");
      return false;
    }
    if (session.advance) {
      node.textContent = text;
      node.classList.remove("is-speaking");
      if (opts.radio && audio) audio.playSE("radio_noise");
      return live();
    }
    node.textContent += ch;
    if (opts.radio && audio) audio.playSE("radio_noise");
    else if (opts.printer && audio) audio.playSE("printer");
    await delay(gap);
  }
  node.classList.remove("is-speaking");
  return live();
}

async function hold(ms, live) {
  if (reducedMotion()) return live();
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (!live()) return false;
    if (session.advance) return true;
    await delay(32);
  }
  return live();
}

function imprint(node, text) {
  if (!node) return;
  const full = String(text);
  if (reducedMotion()) {
    node.dataset.full = full;
    node.textContent = full;
    node.classList.remove("is-printing");
    return;
  }
  if (node.dataset.full === full) return;
  node.dataset.full = full;
  node.textContent = "";
  node.classList.add("is-printing");
  const job = press.find((item) => item.node === node);
  if (job) {
    job.text = full;
    job.i = 0;
  } else {
    press.push({ node, text: full, i: 0, log: node.parentElement === ui.log });
  }
  if (!pressTimer) pressTimer = window.setInterval(tickPress, 14);
}

function tickPress() {
  let logMoved = false;
  for (let index = 0; index < press.length; ) {
    const job = press[index];
    if (!job.node.isConnected) {
      press.splice(index, 1);
      continue;
    }
    if (job.log && logMoved) {
      index += 1;
      continue;
    }
    job.i += 1;
    job.node.textContent = job.text.slice(0, job.i);
    if (audio) audio.playSE("printer");
    job.node.classList.toggle("is-printing", job.i < job.text.length);
    if (job.log) logMoved = true;
    if (job.i >= job.text.length) press.splice(index, 1);
    else index += 1;
  }
  if (ui.log) ui.log.scrollTop = ui.log.scrollHeight;
  if (press.length === 0) {
    window.clearInterval(pressTimer);
    pressTimer = 0;
  }
}

function cancelRead() {
  readToken += 1;
  session.reading = false;
  document.querySelectorAll("body > .punchcard").forEach((card) => card.remove());
}

function powerGlitch() {
  if (reducedMotion()) return Promise.resolve();
  ui.screen.classList.add("is-glitch");
  cueSE("glitch");
  burst();
  return new Promise((resolve) => {
    window.setTimeout(() => {
      ui.screen.classList.remove("is-glitch");
      resolve();
    }, 220);
  });
}

function noteImpact(text) {
  if (!audio) return;
  const line = String(text);
  if (line.startsWith("SELF ") || line === "NEUTRALIZED") {
    audio.playSE("hit");
    return;
  }
  const dealt = /^DMG (\d+)/.exec(line);
  if (dealt && Number(dealt[1]) > 0) audio.playSE("hit");
}

function pushLog(text, kind) {
  noteImpact(text);
  const line = document.createElement("p");
  line.className = "term-line";
  if (String(text).startsWith("WARNING")) line.classList.add("is-alert");
  // v15.3 案A: 敵の行動行は色分けクラスを付ける（enemy / enemy-head / enemy-extra）
  if (kind) line.classList.add(`is-${kind}`);
  ui.log.append(line);
  const cap = session.phase === "map" ? 8 : (session.linked ? 8 : 3);
  while (ui.log.children.length > cap) ui.log.firstElementChild.remove();
  imprint(line, `> ${text}`);
  ui.log.scrollTop = ui.log.scrollHeight;
  // マルチプレイ段階(3) 単位3-4: スナップショットの log（直近30件）へも流す
  if (window.MPSyncLog) {
    window.MPSyncLog.push(String(text));
    if (window.MPSyncLog.length > 30) window.MPSyncLog.splice(0, window.MPSyncLog.length - 30);
  }
}

function pattern(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const bits = [];
  for (let i = 0; i < 48; i += 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    bits.push(((h >>> 0) % 10) > 5);
  }
  return bits;
}

function makeCard(spec) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "punchcard is-new";
  card.dataset.id = spec.id;
  if (spec.uid) card.dataset.uid = String(spec.uid);
  if (spec.held) {
    card.classList.add("is-held");
    card.dataset.held = "1";
  }
  card.dataset.code = spec.code;
  card.dataset.name = spec.name;
  card.dataset.cost = String(spec.cost);
  card.dataset.noise = String(spec.noise);
  card.dataset.stance = spec.stance || "";
  card.dataset.ink = spec.ink;
  if (spec.exhaust) { card.classList.add("is-exhaust"); card.dataset.exhaust = "1"; }
  if (spec.meltdown) card.classList.add("is-meltdown");
  if (spec.curse) card.classList.add("is-curse");
  if (spec.oversized) card.classList.add("is-oversized");
  if (spec.flavor) card.dataset.flavor = spec.flavor;
  card.setAttribute("aria-label", spec.curse
    ? `パンチカード ${spec.name}。呪装。リーダは受け付けない`
    : `パンチカード ${spec.name}。電力${spec.cost}、騒音${spec.noise}`);

  const head = document.createElement("span");
  head.className = "punchcard__head";
  const code = document.createElement("span");
  code.textContent = spec.code;
  const cost = document.createElement("span");
  cost.className = "punchcard__cost";
  cost.textContent = spec.curse ? "呪装" : `PWR ${spec.cost}`;
  head.append(code, cost);

  const stripe = document.createElement("span");
  stripe.className = "stripe";

  const holes = document.createElement("span");
  holes.className = "holes";
  holes.setAttribute("aria-hidden", "true");
  for (const on of pattern(spec.id + spec.code)) {
    const bit = document.createElement("i");
    if (on) bit.className = "on";
    holes.append(bit);
  }

  const name = document.createElement("span");
  name.className = "punchcard__name";
  // 実機報告 2026-11-15: 英字サフィックス（(STRIKE) 等）を小さくし、狭い面でも名前を1行に収める
  const nameMatch = /^(.*?)\s*(\(.+\))$/.exec(spec.name || "");
  if (nameMatch) {
    name.append(document.createTextNode(nameMatch[1] + " "));
    const en = document.createElement("span");
    en.className = "punchcard__name-en";
    en.textContent = nameMatch[2];
    name.append(en);
  } else {
    name.textContent = spec.name;
  }

  const exhaustTag = document.createElement("span");
  exhaustTag.className = "punchcard__exhaust";
  exhaustTag.textContent = "[ 廃棄 ]";
  exhaustTag.hidden = !spec.exhaust;

  // 『アナログ・トラップ機構』: 罠カードの「設置」タグ（廃棄タグと同じ流儀・左下のタグ列）
  const trapTag = document.createElement("span");
  trapTag.className = "punchcard__trap";
  trapTag.textContent = "[ 設置 ]";
  trapTag.hidden = !spec.trap;

  // 『磁気ホールド』保持札のバッジ（このターン限り PWR −1）
  const holdTag = document.createElement("span");
  holdTag.className = "punchcard__hold";
  holdTag.textContent = spec.held ? `[ HOLD / PWR −1（元${spec.baseCost}）]` : "";
  holdTag.hidden = !spec.held;

  const rules = document.createElement("span");
  rules.className = "punchcard__rules";
  rules.textContent = spec.rules || "";
  if (!spec.flavor) rules.hidden = true;

  const text = document.createElement("span");
  text.className = spec.flavor ? "punchcard__text punchcard__flavor" : "punchcard__text";
  text.textContent = spec.text;

  const foot = document.createElement("span");
  foot.className = "punchcard__foot";
  const noise = document.createElement("span");
  noise.textContent = `NOISE ${spec.noise}`;
  const stance = document.createElement("span");
  stance.textContent = spec.stance || "—";
  foot.append(noise, stance);

  card.append(head, stripe, holes, name, exhaustTag, trapTag, holdTag, rules, text, foot);
  card.addEventListener("animationend", () => {
    card.classList.remove("is-new", "is-rise", "draw-in");
  }, { once: true });
  return card;
}

// ==== ドロー演出: 手札へ新規に入ったカードだけを1枚ずつ順番に見せる ====
// 前回描画時点で手札にあったカードのキー集合を保持し、spawn のたびに現在手札と
// 突き合わせて「新規到着」カードだけへ draw-in（段階 delay つき）を付ける。
// キーは表示層だけの識別子で、同名カードは手札内の出現順で区別する
// （手札カードは通常 __uid を持たず、定義オブジェクト共有のため実体同一性は使えない）。
// ロジック（battle.js）には一切触れない。
let handSeenKeys = new Set();
const DRAW_IN_STEP_MS = 170; // 新規カード同士の出現間隔（ANIM ×2 では半分）
const DRAW_IN_MS = 260; // 出現アニメーション自体の長さ（同上）

function handKeyList(hand) {
  const counts = Object.create(null);
  return (hand || []).map((card) => {
    const n = counts[card.id] || 0;
    counts[card.id] = n + 1;
    return `${card.id}#${n}`;
  });
}

function resetHandSeen() {
  handSeenKeys = new Set();
}

// spawn(list, opts):
// - 既定（手札描画）: list は現在手札（全量）とみなし、新規到着カードだけ draw-in。
//   保持札（spec.held）は復帰を分かりやすくするため常に到着扱いにする。
// - opts.keys: list が手札の一部（効果ドローの追加分）のとき、呼び出し側が
//   手札キー列との対応を渡す。
// - opts.untracked: 手札以外の表示（選択フェイズの候補など）。従来どおり全枚 rise。
function spawn(list, opts) {
  const untracked = !!(opts && opts.untracked);
  const me = (!untracked && battle) ? myPlayer() : null;
  let keys = null;
  if (me) {
    if (opts && opts.keys && opts.keys.length === list.length) keys = opts.keys;
    else if ((me.hand || []).length === list.length) keys = handKeyList(me.hand);
  }
  const speed = (window.AnimPres && AnimPres.getSpeed) ? Math.max(0.05, AnimPres.getSpeed()) : 1;
  let arrival = 0;
  list.forEach((spec, index) => {
    const card = makeCard(spec);
    if (spec.id === "boot") {
      card.classList.remove("is-new");
      card.classList.add("is-rise");
      card.style.animationDelay = "0ms";
    } else if (!keys) {
      // 手札キーと対応付けできない経路は従来の一括出現に落とす
      card.style.animationDelay = `${index * 80}ms`;
    } else {
      const isArrival = !handSeenKeys.has(keys[index]) || !!spec.held;
      if (isArrival && !reducedMotion()) {
        card.classList.remove("is-new");
        card.classList.add("draw-in");
        card.style.animationDelay = `${Math.round((arrival * DRAW_IN_STEP_MS) / speed)}ms`;
        card.style.animationDuration = `${Math.round(DRAW_IN_MS / speed)}ms`;
        arrival += 1;
      } else {
        // 既に手札にあったカードは再描画でアニメーションさせない
        card.classList.remove("is-new");
        card.style.animationDelay = "0ms";
      }
    }
    ui.hopper.append(card);
  });
  if (keys && me) handSeenKeys = new Set(handKeyList(me.hand));
}

// カード効果で手札へ新規に入ったカード（即時ドロー／リサイクル回収など）を、
// DOM 未表示の分だけ手札順に spawn する。手札への追加は battle.js 側で常に末尾へ
// push されるため、表示済み要素数より後ろの手札が新規到着分になる。
// settlePlay（使用後処理の合流点）から呼ぶ。表示の同期のみで、入力はブロックしない。
function syncHandArrivals() {
  if (!battle || session.phase !== "combat" || holdPick || pickPick) return;
  const hand = myPlayer().hand || [];
  const shown = ui.hopper.querySelectorAll(".punchcard:not(.punchcard--ghost)").length;
  if (hand.length <= shown) {
    handSeenKeys = new Set(handKeyList(hand));
    return;
  }
  const keys = handKeyList(hand);
  const specs = hand.slice(shown).map((card, i) => {
    const spec = face(card);
    spec.hkey = keys[shown + i];
    return spec;
  });
  spawn(specs, { keys: specs.map((spec) => spec.hkey) });
}

// 戦闘演出強化 段階1（JOB 1-2）: キャラ別 CCTV 待機画の解決。
// CHARACTERS に cctv 定義がある機体（07）はその画を使い、無い機体は従来の汎用画。
function vesselCctvSrc(cover) {
  const generic = cover ? "assets/cctv_vessel_cover.png" : "assets/cctv_vessel_expose.png";
  const def = (window.Battle && Battle.characterDef && battle) ? Battle.characterDef(myCharacterId()) : null;
  // characterDef は未知IDで vessel07 へ落ちるため、本人確認（def.id 一致）を通す。
  const c = (def && def.id === myCharacterId()) ? def.cctv : null;
  if (!c) return generic;
  return (cover ? c.cover : c.expose) || generic;
}

// 戦闘演出強化 段階1（JOB 1-3）: ポーズ画の読込完了レジストリ。
// ポーズ切替は「読み込み済み」の画だけに限定し、間に合わない場合は待機画のまま
// 時系列を止めない（設計 §1.4 のフォールバック方針）。
const poseReady = new Set();
function preloadPoseSrc(src) {
  if (!src || poseReady.has(src)) return;
  const img = new Image();
  img.onload = () => poseReady.add(src);
  img.onerror = () => { /* 読めない画はポーズ切替の対象から外れたままにする */ };
  img.src = src;
  if (img.complete && img.naturalWidth > 0) poseReady.add(src);
}

// 戦闘演出強化 段階1（JOB 1-2）: ラン開始時に使用素体のポーズ画を先読みする。
// 読込は投げっぱなし（await しない）。失敗しても表示側のフォールバックで代替し、
// 時系列は止めない。
function preloadVesselCctv(characterId) {
  const def = (window.Battle && Battle.characterDef) ? Battle.characterDef(characterId) : null;
  const c = (def && def.id === characterId) ? def.cctv : null;
  if (!c) return;
  [c.expose, c.cover, c.attack, c.hitExpose].forEach((src) => preloadPoseSrc(src));
}

// 戦闘演出強化 段階1（JOB 1-3）: エンカウント開始時に敵ポーズ画を先読みする。
function preloadEnemyCctv(enemy) {
  if (!enemy) return;
  preloadPoseSrc(enemy.image_attack);
  preloadPoseSrc(enemy.image_hit);
}

function renderStance() {
  const stance = myPlayer().stance;
  ui.stance.textContent = stance;
  ui.stance.dataset.mode = stance;
  // PROMPT-23: 態勢バフを左パネルに明示する
  ui.stanceHint.textContent = stance === "EXPOSE"
    ? "露呈中：バフなし"
    : "潜伏中：被ダメ-2／ノイズ-1";
  // PROMPT-27: 素体レイヤーを態勢に連動させる（COVER=物陰に潜伏／EXPOSE=踏み出し）
  if (ui.cctvVessel) {
    const cover = stance === "COVER";
    const stanceKey = (myCharacterId() || "") + ":" + stance;
    if (ui.cctvVessel.dataset.stance !== stanceKey) {
      ui.cctvVessel.dataset.stance = stanceKey;
      ui.cctvVessel.onerror = () => {
        const generic = cover ? "assets/cctv_vessel_cover.png" : "assets/cctv_vessel_expose.png";
        if (!ui.cctvVessel.src.endsWith(generic)) ui.cctvVessel.src = generic;
      };
      ui.cctvVessel.src = vesselCctvSrc(cover);
    }
    ui.cctvVessel.classList.toggle("is-cover", cover);
    ui.cctvVessel.classList.toggle("is-expose", !cover);
    if (ui.cctvAllyLock) {
      ui.cctvAllyLock.classList.toggle("is-cover", cover);
      ui.cctvAllyLock.classList.toggle("is-expose", !cover);
      if (ui.cctvVessel.naturalWidth > 0) {
        setCctvFxVar("--fx-vessel-ar", ui.cctvVessel.naturalWidth + " / " + ui.cctvVessel.naturalHeight);
        ui.cctvAllyLock.hidden = false;
      } else {
        ui.cctvVessel.onload = () => {
          if (ui.cctvVessel.naturalWidth > 0) {
            setCctvFxVar("--fx-vessel-ar", ui.cctvVessel.naturalWidth + " / " + ui.cctvVessel.naturalHeight);
            ui.cctvAllyLock.hidden = false;
          }
        };
      }
    }
  }
}

let lastNoiseShown = 0;
let noiseMeterChar = "";
function renderNoise() {
  const lim = (window.Battle && Battle.noiseLimitsFor) ? Battle.noiseLimitsFor(myCharacterId()) : { min: 0, max: 10 };
  const max = lim.max;
  // v15.0: ノイズはラン全体の状態。戦闘中の値を run へ同期する（持ち越し・セーブ対象）。
  // GHOST-TAPE の負数（逆位相残量）は戦闘内だけの資源で、ラン側へは 0 として同期する（戦闘終了で消散）。
  if (run && session.phase === "combat") run.noise = Math.max(0, myPlayer().noise);
  ui.noiseValue.textContent = lim.min < 0 && myPlayer().noise < 0
    ? `${myPlayer().noise}/${max}（逆位相残量）`
    : `${myPlayer().noise}/${max}`;
  // 正式版フェーズ1（A-2）: 現在の警報帯域名をノイズ表示の近くに出す
  if (ui.noiseBand && window.Battle && Battle.noiseBand) {
    ui.noiseBand.textContent = Battle.noiseBand(myPlayer().noise).name;
  }
  // 機体が変わったらメーターのセル構成を作り直す（GHOST-TAPE は −3〜5 の9セル＋ゼロ位置マーカー）
  if (noiseMeterChar !== myCharacterId()) {
    noiseMeterChar = myCharacterId();
    buildMeter();
  }
  const cells = ui.noiseMeter.children;
  const rose = myPlayer().noise > lastNoiseShown;
  const zeroAt = lim.min < 0 ? -lim.min : 0;
  for (let i = 0; i < cells.length; i += 1) {
    cells[i].className = lim.min < 0 && i === zeroAt ? "zero" : "";
    if (lim.min < 0) {
      // 負数側: ゼロ位置より左のセルを「逆位相残量」として点灯する
      if (myPlayer().noise < 0 && i >= zeroAt + myPlayer().noise && i < zeroAt) cells[i].classList.add("reserve");
      if (myPlayer().noise > 0 && i >= zeroAt && i < zeroAt + myPlayer().noise) {
        cells[i].classList.add("on");
        if (i >= zeroAt + max - 1) cells[i].classList.add("hot");
        else if (i >= zeroAt + 2) cells[i].classList.add("warn");
        if (rose && i >= zeroAt + lastNoiseShown) cells[i].classList.add("pulse");
      }
    } else if (i < myPlayer().noise) {
      cells[i].classList.add("on");
      if (i >= max - 1) cells[i].classList.add("hot");
      else if (i >= 2) cells[i].classList.add("warn");
      if (rose && i >= lastNoiseShown) cells[i].classList.add("pulse");
    }
  }
  lastNoiseShown = myPlayer().noise;
}

// BATTLE-ANIM JOB 0-2: 演出移動・枠アスペクト比の CSS 変数を設定する。
// 変数はシーン（継承元）と、追随する枠要素自身の両方へ同じ値を入れる。枠側は変数への
// transition（約80ms遅れ）で追随するため、枠自身に値を持たせる必要がある（css/style.css）。
// アスペクト比（--fx-*-ar）は待機画ロード時にだけ設定し、戦闘中は固定する（設計 §4.2）。
// ポーズ切替（段階1）ではこの関数を呼ばないこと。
function setCctvFxVar(name, value) {
  if (ui.cctvScene) ui.cctvScene.style.setProperty(name, value);
  if (name.indexOf("--fx-enemy") === 0 && ui.cctvLock) ui.cctvLock.style.setProperty(name, value);
  if (name.indexOf("--fx-vessel") === 0 && ui.cctvAllyLock) ui.cctvAllyLock.style.setProperty(name, value);
}

// v15.0 被弾・攻撃演出（juice）: CSSクラス駆動の軽量実装。SOUND OFF でも映像演出は出る。
// 被弾 = フレーム小揺れ＋赤ビネットのパルス＋CCTVノイズバースト。攻撃命中 = ヒットストップ＋敵フラッシュ。
// JOB 0-1 以降、これらの発火点はプレゼンテーション層の命中フェーズへ移っている
// （onRead／runEnemyPhase の onFx フック）。ここに残るのは発火そのものの実装のみ。
let dmgFxTimer = 0;
let dmgBurstTimer = 0;
let hitstopTimer = 0;
let enemyHitTimer = 0;
function fxPlayerDamage() {
  window.__fxDamage = (window.__fxDamage || 0) + 1;
  if (ui.screen) {
    ui.screen.classList.remove("is-shake");
    if (ui.dmgVin) ui.dmgVin.classList.remove("is-on");
    void ui.screen.offsetWidth;
    ui.screen.classList.add("is-shake");
    if (ui.dmgVin) ui.dmgVin.classList.add("is-on");
    window.clearTimeout(dmgFxTimer);
    dmgFxTimer = window.setTimeout(() => {
      ui.screen.classList.remove("is-shake");
      if (ui.dmgVin) ui.dmgVin.classList.remove("is-on");
    }, 460);
  }
  if (ui.cctvScene) {
    ui.cctvScene.classList.remove("is-burst");
    void ui.cctvScene.offsetWidth;
    ui.cctvScene.classList.add("is-burst");
    window.clearTimeout(dmgBurstTimer);
    dmgBurstTimer = window.setTimeout(() => ui.cctvScene.classList.remove("is-burst"), 320);
  }
}
function fxEnemyHit() {
  window.__fxHitstop = (window.__fxHitstop || 0) + 1;
  if (ui.screen) {
    ui.screen.classList.add("is-hitstop");
    window.clearTimeout(hitstopTimer);
    // ヒットストップは設計 §1.4 で 60ms（C フェーズの内数。旧 85ms から短縮）
    hitstopTimer = window.setTimeout(() => ui.screen.classList.remove("is-hitstop"), 60);
  }
  if (ui.cctvScene) {
    ui.cctvScene.classList.remove("is-enemyhit");
    void ui.cctvScene.offsetWidth;
    ui.cctvScene.classList.add("is-enemyhit");
    window.clearTimeout(enemyHitTimer);
    enemyHitTimer = window.setTimeout(() => ui.cctvScene.classList.remove("is-enemyhit"), 240);
  }
}

// ==== 戦闘演出エフェクト層（BATTLE-ANIM JOB 1-3：F-1〜F-5＋ポーズ表示切替）====
// 設計正本: design/DESIGN-BATTLE-ANIM-DRAFT.md §1.2／§1.3／§3（F-1〜F-5）。
// anim-pres のフック（onEventStart／onStep／onEventEnd）へ結線し、ポーズ切替・
// 数字ポップ・盾・罠マーカー・射撃表現を「表示値の差分」と「フェイズ」から駆動する。
// ポーズ画の無い機体・敵（他機体／GATEKEEPER 等）でも、ポーズ以外のエフェクトは
// 単体で成立する（フォールバック時も効く形）。数値・論理には一切触れない。
let fxLayer = null;
let fxShieldEl = null;
let fxTrapsEl = null;
let shieldTimer = 0;
let coverHitTimer = 0;
const animTimers = new Set();

function reducedMotionFx() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (err) {
    return false;
  }
}

// エフェクト用の遅延（演出速度に追随。スキップ時は onEventEnd 側の後始末で打ち切る）
function animTimer(ms, fn) {
  const speed = (window.AnimPres && AnimPres.getSpeed) ? Math.max(0.05, AnimPres.getSpeed()) : 1;
  const id = window.setTimeout(() => { animTimers.delete(id); fn(); }, ms / speed);
  animTimers.add(id);
  return id;
}
function clearAnimTimers() {
  for (const id of animTimers) window.clearTimeout(id);
  animTimers.clear();
}

// エフェクト層の DOM は JS から生成する（index.html は変更しない）。
// fxLayer はシーン最前面、盾は ALLY 枠の前面、罠マーカーは敵ロック枠と同形状の
// ボックス（fxLayer 内で敵の足元へ重ねる）。
function ensureFxLayer() {
  if (fxLayer || !ui.cctvScene) return fxLayer;
  fxLayer = document.createElement("div");
  fxLayer.className = "cctv-fx";
  fxLayer.setAttribute("aria-hidden", "true");
  const traps = document.createElement("div");
  traps.className = "cctv-fx__traps";
  fxLayer.append(traps);
  fxTrapsEl = traps;
  ui.cctvScene.append(fxLayer);
  if (ui.cctvAllyLock) {
    fxShieldEl = document.createElement("div");
    fxShieldEl.className = "cctv-monitor__shield";
    fxShieldEl.hidden = true;
    ui.cctvAllyLock.append(fxShieldEl);
  }
  return fxLayer;
}

// ---- ポーズ表示切替（JOB 1-2 からの申し送り）----
// 世代トークンで競合を防ぐ：新しいポーズが入った側は、古いイベントの復帰で戻さない。
const poseGen = { vessel: 0, enemy: 0 };

function vesselCctvDef() {
  const def = (window.Battle && Battle.characterDef && battle) ? Battle.characterDef(myCharacterId()) : null;
  return (def && def.id === myCharacterId()) ? def.cctv : null;
}

function setVesselIdleSrc() {
  if (!ui.cctvVessel || !battle) return;
  const cover = myPlayer().stance === "COVER";
  ui.cctvVessel.onerror = () => {
    const generic = cover ? "assets/cctv_vessel_cover.png" : "assets/cctv_vessel_expose.png";
    if (!ui.cctvVessel.src.endsWith(generic)) ui.cctvVessel.src = generic;
  };
  ui.cctvVessel.src = vesselCctvSrc(cover);
}

// kind: "attack" | "hit"。切替できたら世代トークン、できなければ 0 を返す。
// COVER 中の被弾は段階1では実ポーズが無いため、cover 画のまま ALLY 枠フラッシュで代替する。
function setVesselPose(kind) {
  if (!ui.cctvVessel || !battle) return 0;
  const c = vesselCctvDef();
  if (!c) return 0;
  let src = null;
  if (kind === "attack") src = c.attack || null;
  else if (kind === "hit") {
    if (myPlayer().stance === "COVER") { flashAllyLockCoverHit(); return 0; }
    src = c.hitExpose || null;
  }
  if (!src || !poseReady.has(src)) return 0;
  poseGen.vessel += 1;
  const gen = poseGen.vessel;
  ui.cctvVessel.onerror = () => restoreVesselPose(gen);
  ui.cctvVessel.src = src;
  window.__fxPoseSwaps = (window.__fxPoseSwaps || 0) + 1;
  return gen;
}
function restoreVesselPose(gen) {
  if (!gen || gen !== poseGen.vessel) return;
  poseGen.vessel += 1;
  setVesselIdleSrc();
}

function setEnemyPose(kind) {
  if (!ui.cctvEnemy || !battle || !battle.enemy) return 0;
  const src = kind === "attack" ? battle.enemy.image_attack : battle.enemy.image_hit;
  if (!src || src === battle.enemy.image || !poseReady.has(src)) return 0;
  poseGen.enemy += 1;
  const gen = poseGen.enemy;
  ui.cctvEnemy.onerror = () => restoreEnemyPose(gen);
  ui.cctvEnemy.src = src;
  window.__fxPoseSwaps = (window.__fxPoseSwaps || 0) + 1;
  return gen;
}
function restoreEnemyPose(gen) {
  if (!gen || gen !== poseGen.enemy) return;
  poseGen.enemy += 1;
  if (ui.cctvEnemy && battle && battle.enemy && battle.enemy.image) {
    ui.cctvEnemy.onerror = null;
    ui.cctvEnemy.src = battle.enemy.image;
  }
}

// ---- 演出移動（JOB 0-2 の CSS 変数へ結線。踏み込み／ノックバック）----
function setFxMove(side, dx) {
  setCctvFxVar(side === "enemy" ? "--fx-enemy-dx" : "--fx-vessel-dx", `${dx}px`);
}
function resetFxMove(side) {
  setCctvFxVar(side === "enemy" ? "--fx-enemy-dx" : "--fx-vessel-dx", "0px");
  setCctvFxVar(side === "enemy" ? "--fx-enemy-dy" : "--fx-vessel-dy", "0px");
}

// ---- F-1 ダメージ数字ポップ ----
// side: "enemy"（与ダメ緑系） | "vessel"（被ダメ赤系／回復水色系／BLK グレー併記）
function popNum(side, text, kind, dy) {
  if (!ensureFxLayer()) return;
  while (fxLayer.querySelectorAll(".cctv-fx__pop").length >= 8) {
    const oldest = fxLayer.querySelector(".cctv-fx__pop");
    if (!oldest) break;
    oldest.remove();
  }
  const el = document.createElement("span");
  el.className = `cctv-fx__pop is-${side} is-${kind}`;
  el.textContent = text;
  const jx = Math.round((Math.random() * 2 - 1) * 14);
  el.style.marginLeft = `${jx}px`;
  el.style.marginTop = `${(dy || 0) + Math.round((Math.random() * 2 - 1) * 6)}px`;
  fxLayer.append(el);
  window.__fxPops = (window.__fxPops || 0) + 1;
  window.setTimeout(() => el.remove(), 650);
}

// ---- F-3 マズルフラッシュ＋曳光線（射撃系のみ。攻撃側の前面に出す）----
function fxShot(side) {
  if (reducedMotionFx() || !ensureFxLayer()) return;
  const muzzle = document.createElement("div");
  muzzle.className = `cctv-fx__muzzle is-${side}`;
  const tracer = document.createElement("div");
  tracer.className = `cctv-fx__tracer is-${side}`;
  fxLayer.append(muzzle, tracer);
  window.__fxShots = (window.__fxShots || 0) + 1;
  window.setTimeout(() => { muzzle.remove(); tracer.remove(); }, 170);
}

// ---- F-4 防御の盾表示（ALLY 枠の前面に六角シールド閃光）----
// mode: "full"（完全防御／待機防護の付与点） | "partial"（一部吸収）
function fxShield(mode) {
  ensureFxLayer();
  if (!fxShieldEl) return;
  fxShieldEl.hidden = false;
  fxShieldEl.classList.remove("is-full", "is-partial");
  void fxShieldEl.offsetWidth;
  fxShieldEl.classList.add(mode === "partial" ? "is-partial" : "is-full");
  window.__fxShield = (window.__fxShield || 0) + 1;
  window.clearTimeout(shieldTimer);
  shieldTimer = window.setTimeout(() => {
    fxShieldEl.hidden = true;
    fxShieldEl.classList.remove("is-full", "is-partial");
  }, 450);
}

// COVER 中被弾の代替表現（段階1）: ALLY 枠を赤系に一瞬光らせる
function flashAllyLockCoverHit() {
  if (!ui.cctvAllyLock) return;
  ui.cctvAllyLock.classList.remove("is-coverhit");
  void ui.cctvAllyLock.offsetWidth;
  ui.cctvAllyLock.classList.add("is-coverhit");
  window.clearTimeout(coverHitTimer);
  coverHitTimer = window.setTimeout(() => ui.cctvAllyLock.classList.remove("is-coverhit"), 320);
}

// ---- F-5 罠マーカー（敵の足元＝ロック枠下辺）----
// 敵フェイズ再生中は「発動前の設置数」を表示側で保持し、発動のたびに減らす
// （論理側の battle.traps は解決済みのため、そのままでは先に消えてしまう）。
let trapDisplayCount = null;
function renderTrapMarkers() {
  if (!ensureFxLayer() || !fxTrapsEl) return;
  const live = !!(battle && session.phase === "combat");
  const n = !live ? 0
    : (trapDisplayCount !== null ? trapDisplayCount : (Array.isArray(myPlayer().traps) ? myPlayer().traps.length : 0));
  fxTrapsEl.replaceChildren();
  for (let i = 0; i < n; i += 1) {
    const mark = document.createElement("i");
    mark.className = "cctv-fx__trapmark";
    fxTrapsEl.append(mark);
  }
}
function flashTrapFire() {
  if (!fxTrapsEl) return;
  fxTrapsEl.classList.add("is-flash");
  window.setTimeout(() => fxTrapsEl.classList.remove("is-flash"), 260);
  if (trapDisplayCount !== null && trapDisplayCount > 0) {
    trapDisplayCount -= 1;
    renderTrapMarkers();
  }
}

// ---- フック工場（onRead／runEnemyPhase の AP.play へ渡す）----
// ctx: { ranged, melee }（プレイヤー側の射撃／近接）、{ enemyRanged, enemyMelee }（敵側）
function makeAnimFxHooks(ctx) {
  const tokens = new WeakMap(); // ev -> { vessel, enemy }
  const tokenOf = (ev) => {
    let t = tokens.get(ev);
    if (!t) { t = { vessel: 0, enemy: 0 }; tokens.set(ev, t); }
    return t;
  };
  const scheduleShot = (side, ev) => {
    if (reducedMotionFx()) return;
    const at = ev.hits && ev.hits.length ? ev.hits[0].at
      : (typeof ev.applyAt === "number" ? ev.applyAt : 0.3);
    animTimer(Math.max(20, (at - 0.12) * 1000), () => fxShot(side));
  };
  return {
    onFx(name) {
      // 待機防護の BLK 付与点（U-13 の境界イベント）＝ F-4 の発火点
      if (name === "guard") fxShield("full");
    },
    onEventStart(ev) {
      if (!ev) return;
      const t = tokenOf(ev);
      if (ev.type === "vessel_attack") {
        t.vessel = setVesselPose("attack");
        if (!reducedMotionFx()) {
          if (ctx.melee) setFxMove("vessel", 46);
          else if (ctx.ranged) scheduleShot("vessel", ev);
        }
      } else if (ev.type === "enemy_attack") {
        t.enemy = setEnemyPose("attack");
        if (!reducedMotionFx()) {
          if (ctx.enemyMelee) setFxMove("enemy", -46);
          else if (ctx.enemyRanged) scheduleShot("enemy", ev);
        }
      } else if (ev.type === "trap_fire") {
        if (fxTrapsEl) fxTrapsEl.classList.add("is-firing");
      } else if (ev.type === "enemy_down") {
        t.enemy = setEnemyPose("hit");
      }
    },
    onStep(info) {
      const { ev, prev, next, hitIndex } = info;
      const isHit = typeof hitIndex === "number" && hitIndex >= 0;
      // F-1: 表示値の差分から数字を出す（ゼロ差分は出さない）
      const eLoss = prev.ehp - next.ehp;
      if (eLoss > 0) popNum("enemy", `-${eLoss}`, "dmg", 0);
      const eBlockLoss = prev.eblock - next.eblock;
      if (eBlockLoss > 0 && ev.type !== "enemy_action") popNum("enemy", `BLK ${eBlockLoss}`, "block", 34);
      const pLoss = prev.php - next.php;
      if (pLoss > 0) popNum("vessel", `-${pLoss}`, "hurt", 0);
      const pGain = next.php - prev.php;
      if (pGain > 0) popNum("vessel", `+${pGain}`, "heal", 0);
      const soaked = prev.pblock - next.pblock;
      if (soaked > 0) {
        popNum("vessel", `BLK ${soaked}`, "block", 34);
        // F-4: BLK で防いだ瞬間。HP が減っていなければ完全防御
        if (ev.type === "enemy_attack") fxShield(pLoss > 0 ? "partial" : "full");
      }
      const pBlockGain = next.pblock - prev.pblock;
      if (pBlockGain > 0) popNum("vessel", `+${pBlockGain} BLK`, "block", 34);
      // 被弾側のポーズ＋ノックバック（命中フェーズ）
      const t = tokenOf(ev);
      if (ev.type === "vessel_attack" && isHit) {
        const g = setEnemyPose("hit");
        if (g) t.enemy = g;
        if (!reducedMotionFx()) setFxMove("enemy", 8);
        if (hitIndex === 0) animTimer(140, () => resetFxMove("vessel"));
        if (ctx.ranged && hitIndex > 0) fxShot("vessel");
      } else if (ev.type === "enemy_attack" && isHit) {
        const g = setVesselPose("hit");
        if (g) t.vessel = g;
        if (!reducedMotionFx()) setFxMove("vessel", -8);
        if (hitIndex === 0) animTimer(140, () => resetFxMove("enemy"));
        if (ctx.enemyRanged && hitIndex > 0) fxShot("enemy");
      } else if (ev.type === "trap_fire" && hitIndex === -1) {
        const g = setEnemyPose("hit");
        if (g) t.enemy = g;
        flashTrapFire();
      } else if (ev.type === "self_damage" && hitIndex === -1) {
        const g = setVesselPose("hit");
        if (g) t.vessel = g;
      }
    },
    onEventEnd(ev) {
      if (!ev) return;
      const t = tokenOf(ev);
      if (t.vessel) restoreVesselPose(t.vessel);
      if (t.enemy) restoreEnemyPose(t.enemy);
      resetFxMove("vessel");
      resetFxMove("enemy");
      if (ev.type === "trap_fire" && fxTrapsEl) fxTrapsEl.classList.remove("is-firing");
    },
  };
}

// ==== 戦闘演出プレゼンテーション層（BATTLE-ANIM JOB 0-1）====
// 表示用 HP／BLK／スタンを論理値と分離し、命中フェーズで一致させる（js/anim-pres.js）。
// モジュールが無い環境（単体HTML等）では従来動作へフォールバックする。
// スタンのピップは敵ごとの stunMax に合わせて個数を動的に揃える
// （index.html の初期3個は最小構成。GATEKEEPER の stunMax=5 等にも追随する）
function syncStunPips(current, max) {
  while (ui.stunPips.children.length < max) {
    const pip = document.createElement("i");
    pip.classList.add("is-off");
    ui.stunPips.append(pip);
  }
  while (ui.stunPips.children.length > max) ui.stunPips.lastElementChild.remove();
  [...ui.stunPips.children].forEach((pip, index) => {
    pip.classList.toggle("is-off", index >= current);
  });
}

function renderDisplayVitals() {
  const AP = window.AnimPres;
  if (!AP || !AP.display || !battle) return;
  const d = AP.display;
  ui.hp.textContent = String(d.php);
  if (ui.hpMax) ui.hpMax.textContent = String(myPlayer().hpMax);
  const hpPct = Math.max(0, (d.php / myPlayer().hpMax) * 100);
  ui.hpBar.style.width = `${hpPct}%`;
  if (ui.hpGhost) {
    ui.hpGhost.style.transition = "none";
    ui.hpGhost.style.width = `${hpPct}%`;
  }
  ui.block.textContent = String(d.pblock);
  ui.enemyHp.textContent = String(d.ehp);
  ui.enemyHpBar.style.width = `${Math.max(0, (d.ehp / battle.enemy.hpMax) * 100)}%`;
  ui.enemyBlock.textContent = String(d.eblock);
  if (!battle.enemy.immuneToStun) {
    ui.stun.textContent = `${d.estun}/${battle.enemy.stunMax}`;
    syncStunPips(d.estun, battle.enemy.stunMax);
  }
}
if (window.AnimPres) AnimPres.bindRenderer(renderDisplayVitals);

let lastHpShown = null;
function renderCombat() {
  const player = myPlayer();
  const enemy = battle.enemy;
  // 正式版フェーズ1: 左パネルの素体名を使用キャラに合わせる
  if (ui.vesselName) ui.vesselName.textContent = (Battle.CHARACTERS[myCharacterId()] || {}).name || "VESSEL 07";
  ui.hp.textContent = String(player.hp);
  if (ui.hpMax) ui.hpMax.textContent = String(player.hpMax);
  const hpPct = Math.max(0, (player.hp / player.hpMax) * 100);
  ui.hpBar.style.width = `${hpPct}%`;
  // v15.0: HPバーの残像（削れた分がゴーストとして残り、遅れて追いつく。回復時は即時追随）
  if (ui.hpGhost) {
    if (lastHpShown === null || player.hp >= lastHpShown) {
      ui.hpGhost.style.transition = "none";
      ui.hpGhost.style.width = `${hpPct}%`;
    } else {
      ui.hpGhost.style.transition = "none";
      ui.hpGhost.style.width = `${Math.max(0, (lastHpShown / player.hpMax) * 100)}%`;
      void ui.hpGhost.offsetWidth;
      ui.hpGhost.style.transition = "";
      ui.hpGhost.style.width = `${hpPct}%`;
    }
  }
  lastHpShown = player.hp;
  ui.energy.textContent = String(player.energy);
  const slots = Math.max(player.energyMax, player.energy, 1);
  while (ui.energyPips.children.length < slots) ui.energyPips.append(document.createElement("i"));
  while (ui.energyPips.children.length > slots) ui.energyPips.lastElementChild.remove();
  [...ui.energyPips.children].forEach((pip, index) => {
    pip.classList.toggle("is-off", index >= player.energy);
  });
  ui.block.textContent = String(player.block);
  ui.enemyHp.textContent = String(enemy.hp);
  ui.enemyHpMax.textContent = String(enemy.hpMax);
  ui.enemyHpBar.style.width = `${(enemy.hp / enemy.hpMax) * 100}%`;
  ui.enemyBlock.textContent = String(enemy.block || 0);
  if (session.phase === "combat" && run) run.hp = player.hp;
  if (enemy.immuneToStun) {
    ui.stun.textContent = "無効";
    ui.stunPips.hidden = true;
  } else {
    ui.stunPips.hidden = false;
    ui.stun.textContent = `${enemy.stun}/${enemy.stunMax}`;
    syncStunPips(enemy.stun, enemy.stunMax);
  }
  renderStance();
  renderNoise();
  renderEnemyIntent();
  renderTraps();
  renderTrapMarkers(); // JOB 1-3: F-5 罠マーカー（CCTV 内・敵の足元）
  renderPurge();
  updateLowHpBgm();
  updateBossAlert();
  // 戦闘演出（JOB 0-1）: 表示分離中は表示用数値を優先する
  if (window.AnimPres) AnimPres.applyDisplay();
  // マルチプレイ段階(3) 単位3-4: 味方簡易バーを最新化する（MP時のみ表示）
  if (window.MPSync) MPSync.renderAllyBar();
}

// ==== UX修正1（2026-11-19）: 非戦闘シーンでの左パネル再描画 ====
// renderCombat は戦闘中しか走らないため、マップ／セーフハウス／イベント／復元直後では
// 左パネル（素体名・HP・PWR・BLK・態勢）が前戦闘の値や初期表示のまま残っていた。
// 非戦闘シーンでは run の実データから描き直す。戦闘中は renderCombat／AnimPres が正、
// MP 中はスナップショット描画が正なので、どちらの場合も触らない。
function renderRunVitals() {
  if (!run || mpSession.active) return;
  if (session.phase === "combat") return;
  const def = (window.Battle && Battle.CHARACTERS && Battle.CHARACTERS[run.character]) || {};
  if (ui.vesselName) ui.vesselName.textContent = def.name || "VESSEL 07";
  const hpMax = Math.max(1, run.hpMax || def.hp || 1);
  const hp = Math.max(0, Math.min(hpMax, run.hp || 0));
  ui.hp.textContent = String(hp);
  if (ui.hpMax) ui.hpMax.textContent = String(hpMax);
  const hpPct = (hp / hpMax) * 100;
  ui.hpBar.style.width = `${hpPct}%`;
  if (ui.hpGhost) {
    ui.hpGhost.style.transition = "none";
    ui.hpGhost.style.width = `${hpPct}%`;
  }
  lastHpShown = hp; // 次の戦闘で HP ゴーストが古い値から残像を引かないように同期する
  // PWR は戦闘開始時に機体の回復量（energyPerTurn）まで満ちるため、その値を満タン表示にする
  const pwrMax = Math.max(1, def.energyPerTurn || 3);
  ui.energy.textContent = String(pwrMax);
  if (ui.energyMax) ui.energyMax.textContent = `/ ${pwrMax}`;
  while (ui.energyPips.children.length < pwrMax) ui.energyPips.append(document.createElement("i"));
  while (ui.energyPips.children.length > pwrMax) ui.energyPips.lastElementChild.remove();
  [...ui.energyPips.children].forEach((pip) => pip.classList.remove("is-off"));
  ui.block.textContent = "0"; // 防護は戦闘内だけの値で、戦闘外には保持されない
  // 態勢は戦闘開始時の初期値（EXPOSE）に合わせる
  if (ui.stance) {
    ui.stance.textContent = "EXPOSE";
    ui.stance.dataset.mode = "EXPOSE";
  }
  if (ui.stanceHint) ui.stanceHint.textContent = "露呈中：バフなし";
}

// 『アナログ・トラップ機構』: 設置中トラップのチップ列（左パネル・RELICS の流儀）。
// 戦闘中かつ設置がある時だけ出し、発動・再配置のたびに renderCombat 経由で最新化される
function renderTraps() {
  if (!ui.traps) return;
  const traps = (battle && session.phase === "combat" && Array.isArray(myPlayer().traps)) ? myPlayer().traps : [];
  const live = traps.length > 0;
  ui.traps.hidden = !live;
  if (ui.trapsLabel) ui.trapsLabel.hidden = !live;
  ui.traps.replaceChildren();
  if (!live) return;
  for (const trap of traps) {
    const def = Battle.card(trap.cardId);
    const chip = document.createElement("span");
    chip.className = "trap-chip";
    chip.textContent = def ? def.name.replace(/\s*\(.+\)$/, "") : trap.cardId;
    ui.traps.append(chip);
  }
}

// 『臨界排熱』（REACTOR固有OS）: 始動中の蓄積チップ（左パネル・TRAPS の流儀）。
// 現在の蓄積（与ダメ加算とターン終了時スリップは同じ値）が戦闘中に読めるようにする
function renderPurge() {
  if (!ui.purge) return;
  const live = !!(battle && session.phase === "combat" && myCharacterId() === "vessel00" && myPlayer().purgeActive);
  ui.purge.hidden = !live;
  if (ui.purgeLabel) ui.purgeLabel.hidden = !live;
  ui.purge.replaceChildren();
  if (!live) return;
  const chip = document.createElement("span");
  chip.className = "purge-chip";
  const n = myPlayer().purgeCount || 0;
  chip.textContent = `臨界 +${n}（与ダメ +${n}／終了時スリップ ${n}）`;
  ui.purge.append(chip);
}

function renderEnemyIntent() {
  if (session.phase !== "combat" || !battle) {
    ui.intent.style.display = "";
    ui.intent.dataset.action = "";
    ui.intent.dataset.alert = "";
    imprint(ui.intent, "INTENT  —");
    hideIntentBanner();
    if (ui.intentBanner) {
      ui.intentBanner.dataset.action = "";
      ui.intentBanner.dataset.alert = "";
      ui.intentBanner.textContent = "INTENT  —";
    }
    intentAnnouncedLabel = null;
    return;
  }
  const view = Battle.intentView(battle);
  ui.intent.dataset.action = view.action || "";
  // v15.0: 警戒段階では追加行動の予告をインテントに明示する
  ui.intent.dataset.alert = view.extra ? view.extra.kind : "";
  // INTENT-PORT（2026-11-17 本人決定で 2026-11-15 の戦闘中バッジ非表示を見直し）:
  // デモ版の新仕様に揃え、常時二重表示を廃止する。上部バッジにフルラベル
  // （〈追加行動：…〉込み）を常時表示し、中央バナーはラベルが変わったときだけ
  // 一度告知して消える（以後はバッジのみが残る）。
  const label = view.label
    + ((myPlayer().alertBuff || 0) > 0 ? ` 〈警報+${myPlayer().alertBuff}〉` : "")
    + (view.extra ? ` 〈${view.extra.label}〉` : "");
  imprint(ui.intent, label);
  announceIntent(label, view);
}

// INTENT-PORT: 中央バナー（#intent-banner）の一回告知（デモ版と同一実装）。
// ラベル変化時のみ表示し、保持 1.4s → フェード 0.35s → 非表示（合計 約1.75s）。
// 同じラベルの再描画では再告知しない。プレイヤーの操作はブロックしない。
let intentAnnouncedLabel = null;
let intentBannerHoldTimer = 0;
let intentBannerFadeTimer = 0;

function hideIntentBanner() {
  window.clearTimeout(intentBannerHoldTimer);
  window.clearTimeout(intentBannerFadeTimer);
  intentBannerHoldTimer = 0;
  intentBannerFadeTimer = 0;
  if (ui.intentBanner) {
    ui.intentBanner.classList.remove("is-fading");
    ui.intentBanner.hidden = true;
  }
}

function announceIntent(label, view) {
  if (!ui.intentBanner) return;
  if (label === intentAnnouncedLabel) return;
  intentAnnouncedLabel = label;
  window.clearTimeout(intentBannerHoldTimer);
  window.clearTimeout(intentBannerFadeTimer);
  ui.intentBanner.dataset.action = view.action || "";
  ui.intentBanner.dataset.alert = view.extra ? view.extra.kind : "";
  ui.intentBanner.textContent = `INTENT  ${label}`;
  ui.intentBanner.classList.remove("is-fading");
  ui.intentBanner.hidden = false;
  intentBannerHoldTimer = window.setTimeout(() => {
    intentBannerHoldTimer = 0;
    if (reducedMotion()) {
      ui.intentBanner.hidden = true;
      return;
    }
    ui.intentBanner.classList.add("is-fading");
    intentBannerFadeTimer = window.setTimeout(() => {
      intentBannerFadeTimer = 0;
      ui.intentBanner.classList.remove("is-fading");
      ui.intentBanner.hidden = true;
    }, 400);
  }, 1400);
}

// ==== リシャッフル演出（SEARCH-RESHUFFLE）====
// 捨て札が山札へ戻ったことを画面で示す共通演出。ドロー経路（ターン開始）と
// サーチ経路（巻尺確認／残響サーチで山札が補充されたとき）の両方から使う。
// CCTV ガラス中央へ glass-flash 流儀の一時表示を出し、同時にパイル行
// （山札／捨て札カウンタ）を光らせる。保持は 900ms（ANIM ×2 では半分）で、
// 操作はブロックしない（要素は pointer-events: none）。
// 戻り値の Promise は保持完了で解決する（選択UIを後ろに控える呼び出し側用）。
// 再入した場合は保持を張り直し、先行する待ち手も新しい完了でまとめて解決する。
let reshuffleFlashEl = null;
let reshuffleHoldTimer = 0;
let reshuffleFadeTimer = 0;
let reshuffleWaiters = [];

function presentReshuffle() {
  const done = new Promise((resolve) => { reshuffleWaiters.push(resolve); });
  const settleWaiters = () => {
    const waiters = reshuffleWaiters;
    reshuffleWaiters = [];
    for (const resolve of waiters) resolve();
  };
  const parent = ui.silenced ? ui.silenced.parentElement : null;
  if (!parent) { settleWaiters(); return done; } // 表示先が無い環境では待たせない
  if (!reshuffleFlashEl) {
    reshuffleFlashEl = document.createElement("p");
    reshuffleFlashEl.className = "reshuffle-flash";
    reshuffleFlashEl.textContent = "RESHUFFLE — 捨て札を山札へ再編成";
    reshuffleFlashEl.hidden = true;
    parent.append(reshuffleFlashEl);
  }
  window.clearTimeout(reshuffleHoldTimer);
  window.clearTimeout(reshuffleFadeTimer);
  reshuffleFlashEl.classList.remove("is-fading");
  reshuffleFlashEl.hidden = false;
  if (ui.piles) {
    ui.piles.classList.remove("is-reshuffling");
    void ui.piles.offsetWidth; // フラッシュのアニメーションを張り直す
    ui.piles.classList.add("is-reshuffling");
  }
  const hold = Math.round(900 / (animSpeed === 2 ? 2 : 1));
  reshuffleHoldTimer = window.setTimeout(() => {
    reshuffleHoldTimer = 0;
    const finish = () => {
      reshuffleFadeTimer = 0;
      if (reshuffleFlashEl) {
        reshuffleFlashEl.classList.remove("is-fading");
        reshuffleFlashEl.hidden = true;
      }
      if (ui.piles) ui.piles.classList.remove("is-reshuffling");
      settleWaiters();
    };
    if (reducedMotion()) { finish(); return; }
    if (reshuffleFlashEl) reshuffleFlashEl.classList.add("is-fading");
    reshuffleFadeTimer = window.setTimeout(finish, 320);
  }, hold);
  return done;
}

// ドロー解決のログ列にリシャッフルが含まれていたら共通演出を出す（発火のみ・待たない）
function noteReshuffleFromLog(lines) {
  if ((lines || []).some((line) => typeof line === "string" && line.startsWith("RESHUFFLE "))) {
    presentReshuffle();
  }
}

function renderPiles() {
  if (session.phase !== "combat") {
    ui.piles.hidden = true;
    return;
  }
  ui.piles.hidden = false;
  ui.piles.innerHTML = `<span>山札 ${myPlayer().drawPile.length}</span><span>手札 ${myPlayer().hand.length}</span><span>捨て札 ${myPlayer().discard.length}</span><span>廃棄 ${myPlayer().exhaust ? myPlayer().exhaust.length : 0}</span>`;
}

function syncEndButton() {
  const combat = session.phase === "combat";
  const reward = session.phase === "reward";
  ui.endTurn.hidden = !combat;
  if (combat && battle.enemy.dead) ui.endTurn.textContent = "制圧完了";
  else if (combat && myPlayer().hp <= 0) ui.endTurn.textContent = "通信途絶";
  else ui.endTurn.textContent = "ターン終了 (END TURN)";
  const scripted = tutorialStep === "t1" || tutorialStep === "t3" || tutorialStep === "victory";
  ui.endTurn.disabled = !combat || session.busy || radioOpen || scripted || holdPick || pickPick || !battle || myPlayer().hp <= 0 || battle.enemy.dead;
  ui.routeReturn.hidden = !reward;
  ui.routeReturn.disabled = !reward;
  ui.routeReturn.textContent = reward ? "回収しない" : "経路へ戻る";
}

function showShotCall(enemy) {
  window.clearTimeout(shotTimer);
  const text = enemy && enemy.call;
  if (!text) {
    ui.shotCall.hidden = true;
    return;
  }
  ui.shotCall.hidden = false;
  ui.shotCall.className = enemy.outcome === "hit" ? "shot-call is-hit" : "shot-call";
  ui.shotCall.dataset.full = "";
  imprint(ui.shotCall, text);
  if (audio && enemy.outcome === "hit" && enemy.damage > 0) audio.playSE("hit");
  shotTimer = window.setTimeout(() => {
    ui.shotCall.hidden = true;
  }, 1100);
}

// v15.3 案A: 敵ターン開始時、CCTV中央に実行行動を大きくバナー表示する。
// 文言形式は「ENEMY ACTION — 射撃 8dmg」（警戒の追加行動があれば末尾に付記）。
const ALERT_EXTRA_SHORT = Object.freeze({ pursuit: "追撃", aim: "照準", jam: "攪乱" });
let enemyActionTimer = 0;

function enemyActionText(enemy) {
  if (!enemy || !enemy.action) return "";
  let text = `ENEMY ACTION — ${enemy.action.label}`;
  const kind = enemy.alert && enemy.alert.kind;
  if (kind && ALERT_EXTRA_SHORT[kind]) text += ` / 追加行動: ${ALERT_EXTRA_SHORT[kind]}`;
  return text;
}

function showEnemyAction(enemy) {
  if (!ui.enemyAction) return;
  window.clearTimeout(enemyActionTimer);
  const text = enemyActionText(enemy);
  if (!text) {
    ui.enemyAction.hidden = true;
    return;
  }
  window.__lastEnemyAction = { text, kind: enemy.action.kind || "", outcome: enemy.outcome || "" };
  ui.enemyAction.textContent = text;
  ui.enemyAction.dataset.kind = enemy.action.kind || "";
  ui.enemyAction.hidden = false;
  ui.enemyAction.classList.remove("is-in");
  void ui.enemyAction.offsetWidth;
  ui.enemyAction.classList.add("is-in");
  enemyActionTimer = window.setTimeout(() => {
    ui.enemyAction.hidden = true;
    ui.enemyAction.classList.remove("is-in");
  }, 1700);
}

function hideEnemyAction() {
  window.clearTimeout(enemyActionTimer);
  if (ui.enemyAction) {
    ui.enemyAction.hidden = true;
    ui.enemyAction.classList.remove("is-in");
  }
}

function refreshHand() {
  if (session.phase === "reward") return;
  for (const el of ui.hopper.querySelectorAll(".punchcard:not(.punchcard--ghost)")) {
    if (el.dataset.id === "boot") continue;
    // 保持割引は実体（__uid）単位で判定する。要素に uid があれば手札の実体を引く
    const inst = el.dataset.uid && battle
      ? myPlayer().hand.find((c) => String(c.__uid || "") === el.dataset.uid)
      : null;
    const card = inst || Battle.card(el.dataset.id);
    if (!card) continue;
    const check = Battle.canPlay(battle, card, myPlayer());
    const scripted = tutorialLock(el.dataset.id);
    const locked = scripted || !check.ok;
    el.classList.toggle("is-locked", locked);
    // 『炉心溶融』: REACTOR のランで PWR不足だが HP で払えるカードはコストを赤点滅させる
    const meltdown = !!(battle && myCharacterId() === "vessel00" && check.ok && !card.unplayable
      && Battle.effectiveCost(battle, card) > (myPlayer().energy || 0));
    el.classList.toggle("is-meltdown", meltdown);
    el.classList.toggle("is-tutor", !scripted && ((tutorialStep === "t1" && el.dataset.id === "defend_cover") || (tutorialStep === "t3" && !tutorialLock(el.dataset.id))));
    const why = check.ok ? "" : reasonText(check.reason);
    el.dataset.lock = why;
    el.title = why;
  }
}

function buildMeter() {
  ui.noiseMeter.replaceChildren();
  const lim = (window.Battle && Battle.noiseLimitsFor && battle) ? Battle.noiseLimitsFor(myCharacterId()) : { min: 0, max: 10 };
  const count = lim.max - lim.min;
  for (let i = 0; i < count; i += 1) {
    const cell = document.createElement("i");
    if (lim.min < 0 && i === -lim.min) cell.className = "zero";
    ui.noiseMeter.append(cell);
  }
}

function idleSlotText() {
  if (session.phase === "combat") return "READER LIVE";
  if (session.phase === "reward") return "INSERT SALVAGE";
  if (session.phase === "map") return "ROUTE SELECT";
  if (session.phase === "safehouse") return "LEAD WALL";
  if (session.phase === "event") return "INCOMING";
  return "INSERT PUNCH CARD";
}

function slotIdleLabel() {
  ui.slotLabel.textContent = idleSlotText();
}

function ack() {
  ui.screen.classList.add("is-ack");
  ui.slot.classList.add("is-reading");
  window.setTimeout(() => {
    ui.screen.classList.remove("is-ack");
    ui.slot.classList.remove("is-reading");
  }, 180);
}

function onRead(data) {
  ack();
  if (data.id === "boot") {
    if (radioOpen) {
      // 検収修正 2026-11-10: 通信中の読み取りは無効化し、カードを手元へ戻す（ソフトロック防止）
      spawn([BOOT]);
      pushLog("通信中は読み取れない。通信を閉じてから挿入せよ");
      return;
    }
    pushLog(`READ  ${data.code}  ${data.name}`);
    if (audio && audio.playPunch) audio.playPunch(1);
    openRoute();
    return;
  }
  if (session.phase === "reward") {
    claimReward(data.id);
    return;
  }
  if (session.phase !== "combat" || radioOpen || session.busy || (window.AnimPres && AnimPres.isPlaying())) return;
  if (holdPick) return; // 『磁気ホールド』選択中はカード使用を受け付けない
  if (pickPick) return; // 探索／選別の選択中もカード使用を受け付けない
  // マルチプレイ段階(3) 単位3-4: ゲストのカード使用は intent 化する（楽観表示なし・J4）
  if (mpSession.active && !mpSession.isHost) { mpGuestPlayCard(data); return; }
  if (tutorialLock(data.id)) return;
  const beforeHp = myPlayer().hp;
  const beforeEnemyHp = battle.enemy.hp;
  const AP = window.AnimPres || null;
  const beforeSnap = AP ? AP.snapshot(battle) : null;
  const result = Battle.playFromHand(battle, data.id, data.uid ? Number(data.uid) || 0 : 0, myPlayer());
  if (!result.ok) {
    pushLog(`REJECT  ${data.name}  ${reasonText(result.reason)}`);
    return;
  }
  // マルチプレイ段階(3) 単位3-4: ホスト自身の使用は適用直後にスナップショットを配る
  // （演出はホスト端末だけのもので、ゲストは確定状態だけを受け取る）
  if (mpSession.active && mpSession.isHost) mpPublish();
  pushLog(`READ  ${data.name}  COST ${data.cost}`);
  const played = Battle.card(data.id);
  if (audio && audio.playPunch) {
    const intensity = Math.max(0, (played ? played.noise || 0 : 0) + (result.breach ? 1 : 0));
    audio.playPunch(intensity);
  }
  for (const line of result.log) pushLog(line);
  if (battle.enemy.dead) ui.contact.textContent = "制圧完了";
  ui.note.textContent = myPlayer().hand.length === 0
    ? "手札はない。ターンを終了せよ。"
    : "条件を満たさないカードは、スリットが拒否する。";
  // 戦闘演出（JOB 0-1）: 表示用数値を使用前の値に留め、命中フェーズで論理値へ寄せる。
  // 既存連鎖（BREACH／ピンチ／勝利判定）はタイムライン完了後に settlePlay へ渡す（U-12）
  if (AP) {
    const built = AP.buildPlayEvents({ state: battle, card: played, result, before: beforeSnap, after: AP.snapshot(battle) });
    if (built.events.length) {
      AP.begin(battle, beforeSnap);
      renderCombat();
      renderPiles();
      refreshHand();
      session.busy = true;
      syncEndButton();
      // JOB 1-3: エフェクト層フック（ポーズ／F-1〜F-5）。射撃系（GUN）は F-3、
      // 近接系（CQC／HVY）は踏み込み、それ以外はポーズのみ。
      const fxHooks = makeAnimFxHooks({
        ranged: !!(played && played.category === "GUN"),
        melee: !!(played && (played.category === "CQC" || played.category === "HVY")),
      });
      AP.play(built.events, {
        onFx: (name, ev) => {
          if (name === "enemyHit") fxEnemyHit();
          else if (name === "playerDamage") fxPlayerDamage();
          fxHooks.onFx(name, ev);
        },
        onEventStart: fxHooks.onEventStart,
        onStep: fxHooks.onStep,
        onEventEnd: fxHooks.onEventEnd,
      }).then(() => {
        clearAnimTimers();
        session.busy = false;
        syncEndButton();
        settlePlay(data.id, beforeHp, !!result.breach, built.selfDamageFx);
      });
      return;
    }
  }
  // v15.0: 敵にダメージが入ったら穿孔と同期したヒットストップ＋敵フラッシュ
  if (battle.enemy.hp < beforeEnemyHp) fxEnemyHit();
  renderCombat();
  renderPiles();
  refreshHand();
  syncEndButton();
  settlePlay(data.id, beforeHp, !!result.breach, false);
}

async function settlePlay(cardId, beforeHp, breached, animSelfFx) {
  // ドロー演出: カード効果で手札へ入ったカード（ドロー／リサイクル回収）を
  // 1枚ずつ順番に表示へ反映する（表示層の同期のみ）
  syncHandArrivals();
  // v15.0: 自傷などで自HPが減っていれば被弾演出を出す
  // （演出タイムラインで再生済みの場合は二重に出さない。JOB 0-1）
  if (!animSelfFx && myPlayer().hp < beforeHp) fxPlayerDamage();
  if (myPlayer().hp <= 0) {
    // マルチプレイ段階(3) 単位3-4: MPでは自素体のダウンは全滅ではない
    if (mpSession.active) { mpOnPlayerDown(myPlayer()); return; }
    openGameOver();
    return;
  }
  if (breached) {
    await playBreach();
    if (session.phase !== "combat") return;
  }
  await maybePinch(beforeHp);
  if (session.phase !== "combat") return;
  // v15.0: 警戒段階に初めて入ったら Gray の説明通信（初回のみ）
  await maybeAlertIntro();
  if (session.phase !== "combat") return;
  // PROMPT-19 T1: 防護を使った → END TURN 誘導へ
  if (tutorialStep === "t1" && cardId === "defend_cover" && !battle.enemy.dead) {
    setTutorialStep("t1end");
    refreshHand();
    syncEndButton();
    setTutorialFocus("t1end");
    const ok = await presentRadio([GRAY_T1_AFTER]);
    if (!ok || session.phase !== "combat") return;
    refreshHand();
    syncEndButton();
    return;
  }
  // PROMPT-22 T3: 射撃／格闘／潜伏のいずれかを使った → 講義終了
  if (tutorialStep === "t3" && !battle.enemy.dead) {
    if (cardId === "gun_suppressed_pistol" || cardId === "strike_cqc" || cardId === "defend_cover") {
      await finishTutBattle();
      if (session.phase !== "combat") return;
    }
  }
  if (battle.enemy.dead) {
    // マルチプレイ段階(3) 単位3-4: MPの勝利処理は同期層側で行う
    if (mpSession.active) await mpBattleVictory();
    else if (!(await maybeVictory())) openReward();
  }
  // マルチプレイ段階(3) 単位3-4: ホストの使用後処理が済んだら確定状態を配る
  if (mpSession.active && mpSession.isHost) mpPublish();
  // 共通プール拡張: 残響サーチ／箔の選別が選択保留（pendingPick）を残していたら選択フェイズを開く。
  // 敵を倒した場合は上の報酬遷移が優先され、保留は戦闘終了とともに消散する
  if (battle && myPlayer().pendingPick && session.phase === "combat" && myPlayer().hp > 0 && !battle.enemy.dead) {
    // SEARCH-RESHUFFLE: サーチで捨て札が山札へ戻っていたら、選択UIの前に演出を見せる
    // （演出の間は busy にして後続のカード使用を受け付けない）
    if (myPlayer().pendingPick.reshuffled) {
      session.busy = true;
      syncEndButton();
      await presentReshuffle();
      session.busy = false;
      syncEndButton();
      if (!battle || session.phase !== "combat") return;
    }
    openPickSelect();
  }
}

// ==== 『磁気ホールド』（VESSEL 09 固有OS）: END TURN 後の専用選択フェイズ ====
// 二段階方式（タップで候補 → 決定ボタンで確定）。「戻る」で通常フェイズへ戻れる。
// 手札が空、または保持可能な札（呪装以外）がない場合はフェイズ自体をスキップする。
function holdCandidatesExist() {
  return !!battle && myPlayer().hand.some((card) => !card.unplayable && card.cost >= 0);
}

function openHoldSelect() {
  Battle.tagHandInstances(battle, myPlayer());
  holdPick = { uid: 0 };
  // 実体IDを要素へ行き渡らせるため、手札DOMを実体ベースで作り直す
  ui.hopper.replaceChildren();
  spawn(myPlayer().hand.map(face));
  refreshHand();
  if (ui.holdBar) ui.holdBar.hidden = false;
  if (ui.holdConfirm) ui.holdConfirm.disabled = true;
  ui.note.textContent = "磁気ホールド：持ち越すカードを1枚選べ。保持したカードは次ターンだけ PWR −1。";
  pushLog("MAGNETIC HOLD — 持ち越すカードを選択");
  syncEndButton();
}

function closeHoldSelect() {
  holdPick = null;
  if (ui.holdBar) ui.holdBar.hidden = true;
  for (const el of ui.hopper.querySelectorAll(".punchcard.is-holdpick")) el.classList.remove("is-holdpick");
  syncEndButton();
}

function toggleHoldPick(el) {
  if (!holdPick || !el || el.classList.contains("punchcard--ghost")) return;
  const uid = Number(el.dataset.uid || 0);
  if (!uid) return;
  const card = myPlayer().hand.find((c) => c.__uid === uid);
  if (!card || card.unplayable || card.cost < 0) return;
  if (holdPick.uid === uid) {
    holdPick.uid = 0;
    el.classList.remove("is-holdpick");
  } else {
    holdPick.uid = uid;
    for (const other of ui.hopper.querySelectorAll(".punchcard.is-holdpick")) other.classList.remove("is-holdpick");
    el.classList.add("is-holdpick");
  }
  if (ui.holdConfirm) ui.holdConfirm.disabled = !holdPick.uid;
}

async function finishHoldSelect(withHold) {
  if (!holdPick) return;
  // マルチプレイ段階(3) 単位3-4: MPでは保持を確定してからターン終了宣言へ合流する
  if (mpSession.active) {
    const mpUid = withHold ? holdPick.uid : 0;
    closeHoldSelect();
    if (mpSession.isHost) {
      if (mpUid) {
        const heldCard = myPlayer().hand.find((c) => c.__uid === mpUid);
        if (Battle.setRetained(battle, mpUid, myPlayer()) && heldCard) pushLog(`HOLD ${heldCard.name}（次ターン PWR −1）`);
      }
      session.busy = true;
      await mpDeclareEndTurn(myPlayer());
      session.busy = false;
      renderCombat();
      syncEndButton();
    } else {
      // ゲスト: 保持は pick intent、ターン終了は end-turn intent（cseq で順序を担保）
      if (mpUid) await mpGuestSendIntent("pick", { kind: "hold", uid: mpUid });
      mpGuestSendEndTurn();
    }
    return;
  }
  const uid = withHold ? holdPick.uid : 0;
  closeHoldSelect();
  if (uid) {
    const heldCard = myPlayer().hand.find((c) => c.__uid === uid);
    if (Battle.setRetained(battle, uid, myPlayer()) && heldCard) pushLog(`HOLD ${heldCard.name}（次ターン PWR −1）`);
  }
  await runEnemyPhase();
}

// ==== 共通プール拡張: 探索（残響サーチ）／選別（箔の選別）の選択フェイズ ====
// 『磁気ホールド』と同じ二段階方式（タップで候補 → 決定ボタンで確定）。
// カードは使用済みのため「戻る」はない。候補が無い場合は UI を開かず即座に自動解決する
// （search は不発、discard は捨てずにドローのみ）。
function openPickSelect() {
  if (!battle || !myPlayer().pendingPick) return;
  const candidates = Battle.pickCandidates(battle, myPlayer());
  if (candidates.length === 0) {
    // マルチプレイ段階(3) 単位3-4: ゲストはローカルで解決せず、自動解決を intent で委ねる
    if (mpSession.active && !mpSession.isHost) {
      mpSession.guestLock = true;
      Net.sendIntent("pick", { index: -1 }).catch(() => { mpSession.guestLock = false; });
      return;
    }
    const res = Battle.resolvePick(battle, null, myPlayer());
    for (const line of res.log) pushLog(line);
    renderCombat();
    renderPiles();
    refreshHand();
    syncEndButton();
    return;
  }
  pickPick = { kind: myPlayer().pendingPick.kind, candidates, index: -1 };
  ui.hopper.replaceChildren();
  spawn(candidates.map(face), { untracked: true });
  // 候補要素へ出現順のインデックスを刻み、通常手札用のロック表示は外す（選択フェイズ専用の見た目にする）
  ui.hopper.querySelectorAll(".punchcard:not(.punchcard--ghost)").forEach((el, i) => {
    el.dataset.pickIndex = String(i);
    el.classList.remove("is-locked");
    el.removeAttribute("title");
  });
  // 保留種別ごとの案内文（プール大拡充バッチB／Cで search_top／curse／trap_sacrifice を追加）
  const pickDraw = (myPlayer().pendingPick && myPlayer().pendingPick.draw) || 1;
  const PICK_TEXT = {
    search: {
      msg: "残響サーチ：山札から手札に加えるカードを1枚選べ",
      note: "山札の中身から1枚を選べ。",
      log: "ECHO SEARCH — 山札から選択",
    },
    search_top: {
      msg: `巻尺確認：山札の上${(myPlayer().pendingPick && myPlayer().pendingPick.n) || 3}枚から手札に加えるカードを1枚選べ（残りは捨て札へ）`,
      note: "山札の上から1枚を選べ。残りは捨て札へ送られる。",
      log: "MEASURE — 山札の上から選択",
    },
    reposition: {
      msg: "死線の再配置：手札に戻す罠を1枚選べ（選んだ後に1枚引く）",
      note: "設置中の罠から、戻すものを1枚選べ。",
      log: "REPOSITION — 戻す罠を選択",
    },
    curse: {
      msg: `呪い吸着箔：廃棄する呪いを1枚選べ（選んだ後に${pickDraw}枚引く）`,
      note: "手札の呪いから、廃棄するものを1枚選べ。",
      log: "CURSE SPONGE — 廃棄する呪いを選択",
    },
    trap_sacrifice: {
      msg: `予備部品：部品に戻す罠を1枚選べ（選んだ後に${pickDraw}枚引く）`,
      note: "設置中の罠から、部品に戻すものを1枚選べ。",
      log: "SPARE PARTS — 取り除く罠を選択",
    },
  };
  const pickText = PICK_TEXT[pickPick.kind] || {
    msg: `箔の選別：捨てるカードを1枚選べ（選んだ後に${pickDraw}枚引く）`,
    note: "捨てるカードを1枚選べ。",
    log: "FOIL SORT — 捨てるカードを選択",
  };
  if (ui.pickMsg) ui.pickMsg.textContent = pickText.msg;
  if (ui.pickBar) ui.pickBar.hidden = false;
  if (ui.pickConfirm) ui.pickConfirm.disabled = true;
  ui.note.textContent = pickText.note;
  pushLog(pickText.log);
  syncEndButton();
}

function closePickSelect() {
  pickPick = null;
  if (ui.pickBar) ui.pickBar.hidden = true;
  syncEndButton();
}

function togglePickPick(el) {
  if (!pickPick || !el || el.classList.contains("punchcard--ghost")) return;
  const index = Number(el.dataset.pickIndex);
  if (!Number.isInteger(index) || index < 0 || index >= pickPick.candidates.length) return;
  if (pickPick.index === index) {
    pickPick.index = -1;
    el.classList.remove("is-pickpick");
  } else {
    pickPick.index = index;
    for (const other of ui.hopper.querySelectorAll(".punchcard.is-pickpick")) other.classList.remove("is-pickpick");
    el.classList.add("is-pickpick");
  }
  if (ui.pickConfirm) ui.pickConfirm.disabled = pickPick.index < 0;
}

function finishPickSelect() {
  if (!pickPick || pickPick.index < 0) return;
  // マルチプレイ段階(3) 単位3-4: ゲストの選択は pick intent で送り、確定はホストが行う
  if (mpSession.active && !mpSession.isHost) {
    const index = pickPick.index;
    closePickSelect();
    ui.hopper.replaceChildren();
    const me = myPlayer();
    if (me) spawn(me.hand.map(face));
    refreshHand();
    mpSession.guestLock = true;
    Net.sendIntent("pick", { index }).catch(() => { mpSession.guestLock = false; });
    return;
  }
  const chosen = pickPick.candidates[pickPick.index];
  closePickSelect();
  const res = Battle.resolvePick(battle, chosen ? chosen.id : null, myPlayer());
  for (const line of res.log) pushLog(line);
  // 手札表示を通常状態へ戻す
  ui.hopper.replaceChildren();
  spawn(myPlayer().hand.map(face));
  renderCombat();
  renderPiles();
  refreshHand();
  syncEndButton();
}

async function onEndTurn() {
  // マルチプレイ段階(3) 単位3-4: MPのターン終了は全員の宣言が揃って初めて解決する
  if (mpSession.active) {
    if (mpSession.isHost) await mpHostEndTurn();
    else mpGuestEndTurn();
    return;
  }
  if (session.phase !== "combat" || session.busy || drag || radioOpen) return;
  if (window.AnimPres && AnimPres.isPlaying()) return; // JOB 0-2: 演出再生中は受け付けない（キューなし）
  if (holdPick) return;
  if (pickPick) return;
  if (!battle || myPlayer().hp <= 0 || battle.enemy.dead) return;
  if (tutorialStep === "t1" || tutorialStep === "t3" || tutorialStep === "victory") return;
  // GHOST-TAPE の通常戦闘では、敵フェイズの前に HOLD 選択フェイズを挟む
  if (myCharacterId() === "vessel09" && tutorialStep === "off" && holdCandidatesExist()) {
    openHoldSelect();
    return;
  }
  // PROMPT-19: チュートリアルのターン遷移（敵フェーズ後に次の脚本を仕込む）
  if (tutorialStep === "t1end") {
    clearTutorialFocus();
    await runEnemyPhase();
    if (session.phase !== "combat" || !battle || myPlayer().hp <= 0 || battle.enemy.dead) return;
    await setupTutTurn2();
    return;
  }
  if (tutorialStep === "t2") {
    await runEnemyPhase();
    if (session.phase !== "combat" || !battle || myPlayer().hp <= 0 || battle.enemy.dead) return;
    await setupTutTurn3();
    return;
  }
  await runEnemyPhase();
}

async function runEnemyPhase() {
  if (session.phase !== "combat" || session.busy || !battle) return;
  session.busy = true;
  syncEndButton();
  const beforeHp = myPlayer().hp;
  const AP = window.AnimPres || null;
  const beforeSnap = AP ? AP.snapshot(battle) : null;
  const beforeTrapCount = (myPlayer().traps || []).length; // JOB 1-3: F-5 の表示側保持用
  const result = Battle.endTurn(battle, undefined, myPlayer());
  ui.hopper.replaceChildren();
  resetHandSeen(); // ターン境界: 手札は全て捨てられ、次のドローは全枚が新規到着
  const downAt = result.log.indexOf("VESSEL DOWN");
  const lines = myPlayer().hp <= 0 && downAt >= 0 ? result.log.slice(0, downAt + 1) : result.log;
  // v15.3 案A: 敵ターン開始の中央バナー＋敵行動ログの色分け。
  // endTurn のログは [DISCARD行, ...敵ログ, ...自ターン開始ログ] の順で組まれているため、
  // 敵ログの区間を位置で特定して色分けする。区間の先頭には見出し行も残す。
  showEnemyAction(result.enemy);
  const enemyLog = (result.enemy && result.enemy.log) || [];
  // 敵ログの開始位置は Battle.endTurn が返す実位置を使う（待機防護など敵フェイズ前の行が増えてもずれない）
  const enemyStart = typeof result.enemyLogStart === "number" ? result.enemyLogStart : 1;
  const enemyEnd = enemyStart + enemyLog.length;
  const headline = enemyActionText(result.enemy);
  // 戦闘演出（JOB 0-1）: ログを 前段（即時）／敵区間（命中フェーズへ同期・U-6）／後段（完了後）へ分ける。
  // 順序と内容は従来と同一で、表示タイミングだけが変わる。
  const preLines = [];
  const enemyLines = [];
  const postLines = [];
  let resetLine = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i < enemyStart) {
      // 境界イベント（臨界排熱スリップ／待機防護）の行はタイムライン側の短縮形で出す（U-13）
      if (AP && (line.startsWith("臨界排熱 スリップ") || line.startsWith("待機防護"))) continue;
      preLines.push(line);
    } else if (i < enemyEnd) {
      enemyLines.push({ text: line, kind: line.startsWith("追加行動") ? "enemy-extra" : "enemy" });
    } else {
      if (AP && result.exposedReset && line.startsWith("完全露呈")) { resetLine = line; continue; }
      postLines.push(line);
    }
  }
  for (const line of preLines) pushLog(line);
  if (headline) pushLog(headline, "enemy-head");
  showShotCall(result.enemy);
  if (AP) {
    AP.begin(battle, beforeSnap);
    renderCombat();
    const built = AP.buildEnemyPhaseEvents({ state: battle, result, before: beforeSnap, after: AP.snapshot(battle), enemyLines, resetLine });
    let flushed = 0;
    let fxDamageFired = false;
    // JOB 1-3: エフェクト層フック。敵の射撃系（射撃／ガトリング）は F-3、近接系は踏み込み。
    // グレネードは投擲のため踏み込みもマズルも付けない。
    const actionLabel = (result.enemy && result.enemy.action && result.enemy.action.label) || "";
    const actionKind = (result.enemy && result.enemy.action && result.enemy.action.kind) || "";
    const enemyShot = /射撃|ガトリング/.test(actionLabel);
    const enemyThrown = /グレネード/.test(actionLabel);
    const fxHooks = makeAnimFxHooks({
      enemyRanged: enemyShot,
      enemyMelee: !enemyShot && !enemyThrown
        && (actionKind === "attack" || actionKind === "heavy_attack" || actionKind === "attack_stun"),
    });
    // F-5: 再生中は発動前の設置数を表示側で保持し、発動ごとに減らす
    trapDisplayCount = beforeTrapCount;
    renderTrapMarkers();
    await AP.play(built.events, {
      onLog: (entry) => {
        if (enemyLines.includes(entry)) flushed += 1;
        pushLog(entry.text, entry.kind);
      },
      onFx: (name, ev) => {
        if (name === "playerDamage") { fxDamageFired = true; fxPlayerDamage(); }
        else if (name === "enemyHit") fxEnemyHit();
        fxHooks.onFx(name, ev);
      },
      onEventStart: fxHooks.onEventStart,
      onStep: fxHooks.onStep,
      onEventEnd: fxHooks.onEventEnd,
    });
    trapDisplayCount = null;
    clearAnimTimers();
    // 安全弁: イベント列へ載らなかった敵ログがあれば順序どおり流し切る
    for (let i = flushed; i < enemyLines.length; i += 1) pushLog(enemyLines[i].text, enemyLines[i].kind);
    if (result.enemy && result.enemy.damage > 0 && !fxDamageFired) fxPlayerDamage();
    for (const line of postLines) pushLog(line);
    renderCombat();
  } else {
    for (const entry of enemyLines) pushLog(entry.text, entry.kind);
    for (const line of postLines) pushLog(line);
    // v15.0: 敵フェーズで被弾したら被弾演出（追加行動の追撃分も result.enemy.damage に含まれる）
    if (result.enemy && result.enemy.damage > 0) fxPlayerDamage();
    renderCombat();
  }
  if (myPlayer().hp <= 0) {
    session.busy = false;
    ui.note.textContent = "通信途絶。素体は失われた。";
    syncEndButton();
    openGameOver();
    return;
  }
  await maybePinch(beforeHp);
  if (session.phase !== "combat") {
    session.busy = false;
    return;
  }
  if (battle.enemy.dead) {
    session.busy = false;
    syncEndButton();
    if (!(await maybeVictory())) openReward();
    return;
  }
  spawn(result.drawn.map(face));
  ui.contact.textContent = battle.enemy.name;
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
  renderPiles();
  // SEARCH-RESHUFFLE: ターン開始ドローでリシャッフルが起きていたら共通演出を出す（操作は止めない）
  noteReshuffleFromLog(result.log);
  refreshHand();
  session.busy = false;
  syncEndButton();
  saveBattleSnapshot(); // 戦闘中セーブ: 敵の行動が終了し、次のターンが始まった静止状態を保存する
}

function setMapMode(on) {
  ui.screen.classList.toggle("is-map", on);
  // マップ画面では下段トレイを畳んで経路盤を広く使う（v13.4）
  if (ui.desk) ui.desk.classList.toggle("is-map", on);
}

function nodeButton(node, openIds, here) {
  const button = document.createElement("button");
  button.type = "button";
  const shown = PipelineMap.shownType(node);
  const current = node.id === route.currentId;
  const selectable = openIds.has(node.id);
  button.className = "node";
  button.dataset.id = node.id;
  button.dataset.shown = shown;
  if (current) button.classList.add("is-current");
  if (selectable) button.classList.add("is-open");
  if (node.floor < here.floor || (node.floor === here.floor && !current)) button.classList.add("is-past");
  else if (!current && !selectable) button.classList.add("is-ahead");
  if (node.revealed && node.isFake) button.classList.add("is-revealed");
  button.disabled = !selectable;
  if (tutorialStep === "map" && tutMapNodeId && selectable && node.id !== tutMapNodeId) {
    button.disabled = true;
    button.classList.add("tutorial-dim");
  }
  if (tutorialStep === "map" && tutMapNodeId && node.id === tutMapNodeId) {
    button.classList.add("tutorial-highlight");
  }
  const code = document.createElement("b");
  code.textContent = PipelineMap.code(shown);
  const name = document.createElement("span");
  name.textContent = PipelineMap.label(shown);
  button.append(code, name);
  if (current) {
    // v14.7: 現在地マーカー（点滅する枠と合わせて所在を示す）
    const hereMark = document.createElement("small");
    hereMark.className = "node__here";
    hereMark.textContent = "▼ 現在地";
    button.append(hereMark);
  }
  if (node.revealed && node.isFake) {
    const mark = document.createElement("small");
    mark.textContent = "偽装";
    button.append(mark);
  }
  if (node.hiddenType === "BOSS") {
    button.classList.add("is-deepcore");
    code.textContent = "[ DEEP CORE ]";
    name.textContent = "最深部";
  }
  button.title = selectable ? `${PipelineMap.label(shown)}へ進む` : PipelineMap.label(shown);
  return button;
}

function floorRow(nodes, tag, openIds, here) {
  const row = document.createElement("div");
  row.className = "route__floor";
  row.style.setProperty("--cols", String(nodes.length));
  const label = document.createElement("span");
  label.className = "route__tag";
  label.textContent = tag;
  row.append(label);
  for (const node of nodes) row.append(nodeButton(node, openIds, here));
  return row;
}

// MAP-LINES修正: 電源投入トランジション中は .screen__content に scale(1, 0.02) が
// かかり、getBoundingClientRect の座標が縦に潰れて線が帯状に潰れる。復元直後の
// マップでは再描画の機会がなく線が消えたままになっていたため、潰れを検出したら
// 座標が信用できるまで次フレームで測り直す（上限つき）。
let paintLinksRetry = 0;
function paintLinks() {
  const host = ui.routeFloors;
  const svg = ui.routeLinks;
  const width = host.offsetWidth;
  const height = host.offsetHeight;
  if (width < 2 || height < 2 || !route) {
    svg.replaceChildren();
    return;
  }
  const base = host.getBoundingClientRect();
  if (base.height > 0 && base.height < height * 0.99) {
    // 祖先 transform で潰れている間は描かず、解けるまで次フレームで再試行する
    if (paintLinksRetry < 150 && session.phase === "map") {
      paintLinksRetry += 1;
      window.requestAnimationFrame(() => paintLinks());
    }
    return;
  }
  paintLinksRetry = 0;
  svg.style.left = `${host.offsetLeft}px`;
  svg.style.top = `${host.offsetTop}px`;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const ns = "http://www.w3.org/2000/svg";
  svg.replaceChildren();
  for (const from of host.querySelectorAll(".node")) {
    const fromNode = route.nodes[from.dataset.id];
    if (!fromNode) continue;
    const a = from.getBoundingClientRect();
    for (const toId of fromNode.edges) {
      const to = host.querySelector(`.node[data-id="${toId}"]`);
      const target = route.nodes[toId];
      if (!to || !target) continue;
      const b = to.getBoundingClientRect();
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(a.left + a.width / 2 - base.left));
      line.setAttribute("y1", String(a.top - base.top));
      line.setAttribute("x2", String(b.left + b.width / 2 - base.left));
      line.setAttribute("y2", String(b.bottom - base.top));
      const alert = target.revealed && target.isFake;
      line.setAttribute("stroke", alert ? "#ff3b30" : "rgba(150,255,180,0.65)");
      line.setAttribute("stroke-width", "2");
      svg.append(line);
    }
  }
}

function focusCurrentNode() {
  const current = ui.routeFloors.querySelector(".node.is-current");
  if (current) current.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderRoute() {
  if (!route || !run) return;
  const here = route.nodes[route.currentId];
  const openIds = new Set(PipelineMap.available(route).map((node) => node.id));
  const shown = PipelineMap.shownType(here);
  // v15.0: 持ち越しノイズをマップでも表示する（警戒域はデータ属性で色付け）
  const noiseMax = Battle.noiseLimitsFor(run && run.character).max;
  const noiseNow = Math.max(0, Math.min(noiseMax, (run && run.noise) || 0));
  // JOB 3M-2 (C-8): 層表示を併記する（第◯層／LAYER n/3）。層の正は run.mapIndex、route.mapIndex はフォールバック。
  const layerNow = (run && run.mapIndex >= 1 && run.mapIndex <= 3) ? run.mapIndex
    : (route.mapIndex >= 1 && route.mapIndex <= 3 ? route.mapIndex : 1);
  ui.routePos.textContent = (here.floor === 0
    ? "NOW  射出点"
    : `NOW  F${here.floor}  ${PipelineMap.label(shown)}`) + `  第${layerNow}層 LAYER ${layerNow}/3  NOISE ${noiseNow}/${noiseMax}`;
  ui.routePos.dataset.alert = noiseNow >= 3 ? "1" : "";
  ui.routeHp.textContent = `HP ${run.hp}`;
  ui.scanCount.textContent = String(route.scansLeft);
  ui.scan.disabled = session.busy || radioOpen || tutorialStep === "map" || route.scansLeft <= 0 || openIds.size === 0;
  ui.link.textContent = here.floor === 0 ? "INJECT" : `LAYER ${layerNow}/3 FLOOR ${here.floor}/${route.floorCount}`;
  ui.routeFloors.replaceChildren();
  ui.routeFloors.append(floorRow([route.nodes[route.originId]], "IN", openIds, here));
  for (const floor of route.floors) {
    ui.routeFloors.append(floorRow(floor, String(floor[0].floor), openIds, here));
  }
  // MAP-LAYOUT: 盤の高さに収まらない短い画面では compact（ノードと間隔を一段詰めた
  // 収納モード）に落とし、経路全体をスクロールなしで見せる。収まる画面では通常寸法。
  if (ui.routeMap) {
    // 判定は通常寸法で測る（compact 適用中の寸法で測ると付け外しが振動するため）
    ui.routeFloors.classList.remove("is-compact");
    ui.routeFloors.classList.toggle("is-compact", ui.routeFloors.offsetHeight > ui.routeMap.clientHeight + 1);
  }
  paintLinks();
  focusCurrentNode();
  window.requestAnimationFrame(() => {
    if (session.phase === "map") {
      paintLinks();
      focusCurrentNode();
    }
  });
}

// PROMPT-28: レリックパネルは総枠5。空き枠は [ EMPTY ] で示唆する。
// 第0陣 0-3: 枠数の正は Relics.SLOTS（付与側チェックと同値）。表示と入手側で同じ定数を参照する。
const RELIC_SLOTS = (typeof Relics !== "undefined" && Relics.SLOTS) || 5;
let openRelicTipId = null;

function closeRelicTip() {
  openRelicTipId = null;
  if (ui.relicTip) ui.relicTip.hidden = true;
  for (const el of ui.relics.querySelectorAll(".relic-chip.is-open")) el.classList.remove("is-open");
}

function toggleRelicTip(id, anchor) {
  if (!ui.relicTip) return;
  if (openRelicTipId === id && !ui.relicTip.hidden) { closeRelicTip(); return; }
  const info = Relics.detail(id);
  if (!info) return;
  closeRelicTip();
  openRelicTipId = id;
  ui.relicTipName.textContent = info.name;
  ui.relicTipBody.textContent = info.description;
  ui.relicTipEffect.textContent = info.effectsText;
  // 第0陣 0-6 (R-19): 二層化表示。効果文（description）＋効果サマリ＋フレーバー（flavor）を分離して出す。
  // flavor が空のレリックではフレーバー行自体を出さない。
  if (ui.relicTipFlavor) {
    ui.relicTipFlavor.textContent = info.flavor || "";
    ui.relicTipFlavor.hidden = !info.flavor;
  }
  ui.relicTip.hidden = false;
  if (anchor) {
    anchor.classList.add("is-open");
    const r = anchor.getBoundingClientRect();
    const width = ui.relicTip.offsetWidth || 260;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    ui.relicTip.style.left = `${left}px`;
    ui.relicTip.style.top = "auto";
    ui.relicTip.style.bottom = `${Math.max(8, window.innerHeight - r.top + 8)}px`;
  }
}

// 他所タップでツールチップを閉じる（チップ自身とチップ内は除外し、チップの click でトグルさせる）
document.addEventListener("pointerdown", (ev) => {
  if (!openRelicTipId) return;
  if (ev.target.closest && (ev.target.closest(".relic-chip") || ev.target.closest("#relic-tip"))) return;
  closeRelicTip();
}, true);

function renderRelics() {
  const ids = (run && run.relics) || [];
  const live = ids.length > 0 && (session.phase === "map" || session.phase === "combat" || session.phase === "reward");
  closeRelicTip(); // チップを作り直すので、開いていた詳細は閉じる
  ui.relics.hidden = !live;
  if (ui.relicsLabel) ui.relicsLabel.hidden = !live;
  ui.relics.replaceChildren();
  if (!live) return;
  for (const id of ids) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "relic-chip";
    chip.dataset.relicId = id;
    chip.textContent = Relics.chip(id);
    chip.addEventListener("click", () => toggleRelicTip(id, chip));
    ui.relics.append(chip);
  }
  for (let i = ids.length; i < RELIC_SLOTS; i += 1) {
    const empty = document.createElement("span");
    empty.className = "relic-empty";
    empty.textContent = "[ EMPTY ]";
    ui.relics.append(empty);
  }
}

function applyMapRelics() {
  Relics.eachEffect(run.relics, "on_map_generation", (relic, effect) => {
    if (effect.type === "add_scan_uses") {
      PipelineMap.grantScans(route, effect.value);
      pushLog(`PART ${relic.name}  SCAN +${effect.value}`);
      return;
    }
    // 第2陣 2A (N-7): マップ生成時の回復。対象は run.hp（上限 hpMax）。
    // U-3 確定解釈により、イベント入手時の即時発火はしない（ここ＝マップ生成でのみ発火する。
    // 盗聴装置のスキャン分の即時発火は applyEventChoice 側の現行例外として残る）。
    if (effect.type === "heal") {
      const before = run.hp;
      run.hp = Math.min(run.hpMax, run.hp + (effect.value || 0));
      if (run.hp > before) pushLog(`PART ${relic.name}  HP +${run.hp - before}`);
    }
  });
}

// ==== 正式版フェーズ1（設計書 §A）: キャラ選択 ====
// NEW GAME フロー（BOOTカード読取／初期化ボタン）では、ラン開始前にキャラ選択画面を挟む。
// 画面は格納庫の回転台（カルーセル）方式: 回転させて素体を選び、中央の選択中素体を大きく見せる。
// CRT側パネルには固有特性・HP・PWR回復・初期デッキ構成にフレーバーテキストを添えて出す。
// CONTINUE は restoreRun 経由で選択を挟まない。TUTORIALボタン経由は従来どおり 07 前提
// （showTitle で vesselSelectSuppress を消費し、選択を抑止する）。
let selectedVessel = "vessel07";
let vesselSelectArmed = true;
let vesselSelectSuppress = false;
// 作戦深度の選択値（DESIGN-DEPTH-SYSTEM-FINAL §4.1）。初期化は openVesselSelect の冒頭のみ
// （J-7 (a): 開くたび解禁上限へリセット）。renderVesselSelect 内では変更しない（軽微4）。
let selectedDepth = 1;
let depthGateBusy = false;

// 表示順（回転台の並び）。"locked" は未解禁枠: シルエット＋LOCKED表示のみで詳細は出さない。
// GHOST-TAPE 解禁後は vessel09 が入り、将来の解禁キャラ用に locked 枠を1つ残す。
// GOLIATH 未解禁の間は "locked04" 枠: GOLIATH の輪郭だけをシルエットで示し、詳細は出さない。
// WEAVER 未解禁の間は "locked13" 枠（locked04 と同じ流儀）。WEAVER 解禁後は vessel13 が入り、
// 将来の解禁キャラ（REACTOR）用に locked 枠を1つ残す。
function vesselOrder() {
  if (reactorUnlocked()) return ["vessel07", "vessel04", "vessel09", "vessel13", "vessel00"];
  if (weaverUnlocked()) return ["vessel07", "vessel04", "vessel09", "vessel13", "locked00"];
  if (ghostTapeUnlocked()) return ["vessel07", "vessel04", "vessel09", "locked13", "locked"];
  if (goliathUnlocked()) return ["vessel07", "vessel04", "locked"];
  return ["vessel07", "locked04", "locked"];
}

// 未解禁枠の表示文（シルエット原画／キャプション／CRT）。詳細（性能・デッキ）は出さない。
// locked13 のシルエットは汎用の素体画を黒潰ししたもので、WEAVER の造形は明かさない
// （WEAVER の立ち絵は候補生成→本人選択で公式化するまで未配線）。
const LOCKED_VESSEL_INFO = {
  locked04: {
    name: "VESSEL 04 “????”",
    sys: "[SYS] — SIGNAL LOST —\n> 巨体の信号のみ捕捉。リンク権限なし。\n> 解禁条件: VESSEL 07 でランをクリア",
    caption: "VESSEL 04 — CLASSIFIED",
    sil: "assets/vessel04_goliath.webp",
  },
  locked13: {
    name: "VESSEL 13 “????”",
    sys: "[SYS] — SIGNAL LOST —\n> 死線の振動のみ捕捉。リンク権限なし。\n> 解禁条件: GHOST-TAPE でランをクリア",
    caption: "VESSEL 13 — CLASSIFIED",
    sil: "assets/cctv_vessel_expose.png",
  },
  // locked00 は REACTOR の立ち絵を黒潰しし、肋骨状の輪郭だけを見せる（locked04 と同じ流儀）。
  locked00: {
    name: "VESSEL 00 “????”",
    sys: "[SYS] — SIGNAL LOST —\n> 格納庫最奥から微弱な熱源反応。リンク権限なし。\n> 解禁条件: WEAVER でランをクリア",
    caption: "VESSEL 00 — CLASSIFIED",
    sil: "assets/vessel00_reactor.webp",
  },
  locked: {
    name: "VESSEL ?? “????”",
    sys: "[SYS] — NO DATA —\n> 素体信号を捕捉できず。",
    caption: "VESSEL ?? — CLASSIFIED",
    sil: "assets/cctv_vessel_expose.png",
  },
};
let vesselCursor = 0;

// 表示文（CRT表示／フレーバー）: 2026-11-17「選択画面フレーバー正典版書き換え」で全件確定。
// 下書き SELECT-PROFILE-DRAFT.md → 独立精査 SELECT-PROFILE-AUDIT.md（要修正2点反映済み）→ 本人が確認リスト #1〜#8 を全件確定し、最終形を反映済み。
// 詳細は SELECT-PROFILE-FINAL-REPORT.md（仮実装時の経緯は SELECT-PROFILE-REWRITE-REPORT.md）。
const VESSEL_PROFILES = {
  vessel07: {
    sys: "[SYS] VESSEL 07 ONLINE.\nBALANCED CQC & STEALTH PROTOCOLS ACTIVE.\n> 汎用潜入素体・リンク確立。",
    flavor: "「使い古された型落ちの機体だが、泥臭い潜入任務には一番手に馴染む。最新鋭のデジタル防壁も、駆動音を殺して放つアナログな物理打撃（CQC）の連続には対応できない。誰の体だったかは、もう記録に残っていない。それでも手は覚えている。生き残りたければ、基本を忘れるな。」",
    img: "assets/cctv_vessel_expose.png",
  },
  // 2026-11-17 本人確定（確認リスト #1）: flavor は案B（盾役を匂わせる）。「坑道採掘用」は正典（部隊の盾役の義体）により除去済み。
  vessel04: {
    sys: "[SYS] VESSEL 04 \"GOLIATH\" LINKED.\nWARNING: STEALTH MODULE NOT FOUND. MASS: CRITICAL.\n> 警告：隠蔽機構が欠損しています。総質量、規定値を大幅に超過。",
    flavor: "「これを潜伏作戦と呼ぶのは、上層部のひどい冗談だ。誰かの前に立つためだけに盛られたバカげた質量で、見つかる前にすべての防壁と警備AIを粉砕する。起動するだけで施設中に爆音が響き渡るが、気にするな。最後に立っているのがこちらなら、それは完璧なステルスだ。」",
    img: "assets/vessel04_goliath.webp", // 専用立ち絵（楕円ソフトアルファ済み）
  },
  // 2026-11-17 本人確定（確認リスト #4）: 「聞き手」の残響を足した下書き改訂案の全文で確定（精査の圧縮案は不採用）。
  // 通信兵の出自は匂わせに留め、性別・兵種の断定はしていない。
  vessel09: {
    sys: "[SYS] VESSEL 09 \"GHOST-TAPE\" LINKED.\nMAGNETIC HOLD OS: READY. NOISE LIMIT: 05.\n> 逆位相補正を開始。存在しない音声を検出しています。",
    flavor: "「こいつの装甲は、笑ってしまうほど薄い。代わりに機体の中では何十本もの磁気テープが回り続け、消すべき音と残すべき音を選別している。派手な勝ち方はできない。だが、すべての無駄を削ぎ落とした先で、敵は自分がいつ敗れたのか最後まで気づかない。今もテープは回り続けている。誰の声も、最後まで聞き届けるために。」",
    img: "assets/vessel09_ghosttape.webp", // 専用立ち絵（候補1「リール肩型」・楕円ソフトアルファ済み）
  },
  // 2026-11-17 本人確定（確認リスト #5・#6）: 精査に従い「死線（ワイヤー）」のルビを復元し、sys の「罠師」明示は現行のまま確定
  // （本人の WEAVER 設計書 §1 の命名。下書きの「糸と鉄線」への置換は精査で却下）。
  // 罠師・寡黙な職人肌の出自は匂わせに留め、過去の断定はしていない（実装追補 §5）。
  // 立ち絵は 2026-11-17 に候補1「蜘蛛型＋背部ボビン」を本人が公式として選択・配線済み。
  vessel13: {
    sys: "[SYS] VESSEL 13 \"WEAVER\" LINKED.\nTRAP SYSTEMS ARMED. STANDBY ARMOR ONLINE.\n> 罠師の素体・リンク確立。",
    flavor: "「こいつは自分から殴りに行く機体じゃない。暗がりに死線（ワイヤー）を張り巡らせ、わざと音を立てて敵を誘い、踏み込んできたところを静かに仕留める。……昔、誰かが言っていたそうだ。『罠は待つ者の味方だ』と。派手さはない。だが格納庫で一番、帰りを待つ価値のある背中だ。」",
    img: "assets/vessel13_weaver.webp", // 専用立ち絵（候補1「蜘蛛型＋背部ボビン」・楕円ソフトアルファ済み）
  },
  // 2026-11-17 本人確定（確認リスト #7・#8）: 下書き案A（重い）＋精査修正（「統括リンクの刻印」）で確定。
  // 最初の犠牲者の素性（パンドラの元妻）は直書きしない規律を守り、「最初の犠牲者」「棺桶」の仄めかしに留める。
  // sys は下書き案で確定（REACTOR実装バッチの仮文との差分は SELECT-PROFILE-REWRITE-REPORT.md に明記）。
  vessel00: {
    sys: "[SYS] VESSEL 00 \"REACTOR\" LINKED.\nWARNING: LIMITER NOT FOUND. CORE TEMP: RISING.\n> 警告：安全装置が存在しません。炉心温度、上昇中。",
    flavor: "「格納庫の奥に、鍵をかけて封じてある一体がある。部隊が編まれる前に作られた実験機。リミッターという言葉が生まれる前に死んだ、最初の犠牲者の棺桶だ。繋げば今も熱を持っている。だがこの機体に、統括リンクの刻印はない。無理やり繋いだ分だけ、返ってくる痛みも一番強い。それでも降りるというのなら止めはしない。覚悟だけはしておけ。」",
    img: "assets/vessel00_reactor.webp", // 専用立ち絵（公式「肋骨炉心」・楕円ソフトアルファ済み）
  },
};

function deckSummaryText(characterId) {
  const counts = new Map();
  for (const id of Battle.deckIdsFor(characterId)) counts.set(id, (counts.get(id) || 0) + 1);
  const parts = [];
  for (const [id, n] of counts) {
    const card = Battle.card(id);
    parts.push(`${card ? card.name : id} ×${n}`);
  }
  return parts.join("／");
}

function vesselFigureEl(entry, pos) {
  const fig = document.createElement("div");
  fig.className = `vessel-figure is-${pos}`;
  fig.dataset.vessel = entry;
  const visual = document.createElement("div");
  visual.className = "vessel-figure__visual";
  const caption = document.createElement("p");
  caption.className = "vessel-figure__caption";
  if (LOCKED_VESSEL_INFO[entry]) {
    fig.classList.add("is-locked");
    // 未解禁はシルエットで存在だけを匂わせる（コンセプト画の布を被った素体）。
    // 既存の素体画像を真っ黒に潰して流用し、機体の判別はできない見せ方にする。
    // locked04 は GOLIATH の立ち絵を黒潰しし、巨体の輪郭だけを見せる。
    const info = LOCKED_VESSEL_INFO[entry];
    const sil = document.createElement("img");
    sil.className = "vessel-figure__silhouette";
    sil.src = info.sil;
    sil.alt = "";
    const lock = document.createElement("span");
    lock.className = "vessel-figure__lock";
    lock.textContent = "LOCKED";
    visual.append(sil, lock);
    caption.textContent = info.caption;
  } else {
    const def = Battle.CHARACTERS[entry];
    const profile = VESSEL_PROFILES[entry];
    if (profile && profile.img) {
      const img = document.createElement("img");
      img.src = profile.img;
      img.alt = def ? def.name : entry;
      visual.append(img);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "vessel-figure__glyph";
      glyph.textContent = entry.slice(-2);
      visual.append(glyph);
    }
    caption.textContent = def ? `${def.name} “${def.code}”` : entry;
  }
  fig.append(visual, caption);
  if (pos === "left") fig.addEventListener("click", () => rotateVessel(-1));
  if (pos === "right") fig.addEventListener("click", () => rotateVessel(1));
  return fig;
}

/* ==== 選択画面カルーセル演出（2026-11-17 強化）====
   「回転台が回る」感触を作る: 切り替え時は FLIP でフィギュアを台座間を
   実際に移動させ、.vessel-figure__visual に rotateY を掛けて台の回転を表現する。
   退場する素体はゴーストを残して奥へ消え、入場する素体は外側から回り込む。
   足元の SVG リング（.vessel-ring）は常時ゆっくり流れ、回転中は加速する。
   連打時は「現在表示されている位置」から FLIP し直すため、最終状態は必ず
   vesselCursor と一致する。 */
const VESSEL_SPIN_MS = 680;
let vesselRingEl = null;
let vesselRingTimer = 0;
let vesselIntroPending = false;

function vesselReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function vesselRingBuild() {
  if (vesselRingEl) return vesselRingEl;
  const ring = document.createElement("div");
  ring.className = "vessel-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = '<svg viewBox="0 0 200 60" preserveAspectRatio="none" focusable="false">'
    + '<ellipse class="vessel-ring__track" cx="100" cy="30" rx="95" ry="25"></ellipse>'
    + '<ellipse class="vessel-ring__arc" cx="100" cy="30" rx="95" ry="25"></ellipse>'
    + "</svg>";
  vesselRingEl = ring;
  return ring;
}

function vesselRingSpin(dir) {
  const ring = vesselRingEl;
  if (!ring) return;
  ring.classList.add("is-spinning");
  ring.classList.toggle("is-rev", dir < 0);
  window.clearTimeout(vesselRingTimer);
  vesselRingTimer = window.setTimeout(
    () => ring.classList.remove("is-spinning", "is-rev"), VESSEL_SPIN_MS + 80);
}

// ==== 作戦深度の選択（DESIGN-DEPTH-SYSTEM-FINAL §4.1／判断 J-1 (a)・J-2 (a)・J-5 (b)・J-7 (a)） ====
// 深度15の分岐記録の有無（所有者は depth-clear.js。公開手段 getBranch 経由でのみ参照する）
function depthBranchRecorded() {
  return !!(window.DepthClear && typeof window.DepthClear.getBranch === "function"
    && window.DepthClear.getBranch());
}

// VESSEL 画面を開くたびの初期値（J-7 (a): 解禁上限）。ただし J-5 (b) のゲートにより、
// 分岐未記録の間は 16〜20 を初期値にもできないため、その場合は 15 が上限になる。
function depthInitialValue() {
  const max = depthUnlockedMax();
  return depthBranchRecorded() ? max : Math.min(max, 15);
}

// ラン開始時の深度の確定（§4.1 軽微4）: VESSEL 画面を経由しない開始経路に備え、
// 未設定・範囲外なら解禁上限を既定として採用し、ゲート（J-5 (b)）も担保してクランプする。
function resolveRunDepth() {
  const max = depthUnlockedMax();
  let d = Math.floor(Number(selectedDepth));
  if (!Number.isInteger(d) || d < 1 || d > max) d = depthInitialValue();
  if (d >= 16 && !depthBranchRecorded()) d = 15;
  return Math.max(1, Math.min(20, d));
}

// 修正サマリ（§4.1）: その深度で有効な変更だけを数行で要約する。出撃前に必ず見える。
function depthSummaryText(profile) {
  const parts = [];
  if (profile.hpMul > 1) parts.push(`敵HP ×${profile.hpMul.toFixed(2)}`);
  if (profile.startNoise > 0) parts.push(`開始NOISE ${profile.startNoise}`);
  if (profile.healRate < 0.4) parts.push(`回復率 ${Math.round(profile.healRate * 100)}%`);
  if (profile.stunStage >= 1) parts.push("スタン減衰あり");
  if (profile.stunStage >= 2) parts.push("ボススタン耐性+");
  if (profile.stunStage >= 3) parts.push("連続スタン不可");
  if (profile.rewardFactor > 1) parts.push(`報酬の質 ×${profile.rewardFactor}`);
  return parts.length ? parts.join(" ／ ") : "修正なし — 標準プロトコル";
}

// 深度ブロック専用の更新（§4.1 軽微4）: 帯名・修正サマリ・到達表示だけを書き換え、
// カルーセルの全体再構築（renderVesselSelect）は呼ばない。selectedDepth の変更もしない。
function renderDepthBlock(characterId) {
  if (!ui.depthValue) return;
  const max = depthUnlockedMax();
  const d = Math.max(1, Math.min(max, Math.floor(Number(selectedDepth)) || 1));
  const profile = Battle.depthProfileFor(d);
  ui.depthValue.textContent = String(d).padStart(2, "0");
  if (ui.depthBand) ui.depthBand.textContent = profile.bandName;
  if (ui.depthSummary) ui.depthSummary.textContent = depthSummaryText(profile);
  if (ui.depthPrev) ui.depthPrev.disabled = d <= 1;
  if (ui.depthNext) ui.depthNext.disabled = d >= max;
  if (ui.depthNextInfo) {
    if (max >= 16 && !depthBranchRecorded()) {
      // J-5 (b): 16〜20 は分岐記録が前提。未記録の間はその旨だけを示す（先の見せ方は J-2 の原則どおり伏せる）
      ui.depthNextInfo.textContent = "DEPTH 16 — 深度15の記録の選択が未完了";
    } else if (max < 20) {
      // J-2 (a): 次の1深度だけ番号＋NO SIGNAL。それより先は総数（全20）のみ示す
      ui.depthNextInfo.textContent = `DEPTH ${String(max + 1).padStart(2, "0")} — NO SIGNAL ／ 全20深度`;
    } else {
      ui.depthNextInfo.textContent = "全深度解禁済み";
    }
  }
  if (ui.depthBest) {
    // 到達表示は選択中の素体の bestByCharacter（§4.1 軽微5）
    const best = characterId ? loadDepthProgress().bestByCharacter[characterId] : null;
    ui.depthBest.textContent = best
      ? `到達深度 DEPTH ${String(best).padStart(2, "0")}（この素体）`
      : "到達深度 ―（この素体）";
  }
}

function stepDepth(dir) {
  if (depthGateBusy) return;
  const max = depthUnlockedMax();
  let target = (Math.floor(Number(selectedDepth)) || 1) + dir;
  if (target < 1) target = 1;
  if (target > max) target = max;
  if (target >= 16 && !depthBranchRecorded()) {
    // J-5 (b)＋補足: ゲート。案内を出して深度15の選択UIへ直行する
    void gateDepthBranch();
    return;
  }
  if (target !== selectedDepth) {
    selectedDepth = target;
    cueSE("switch");
  }
  renderDepthBlock(vesselOrder()[vesselCursor]);
}

// J-5 (b)＋補足の直行フロー: 案内 → 深度15の選択UI（導入を飛ばして選択から開始）→
// 選択が記録されれば、その場で DEPTH 16 を選択状態にして解禁する。再クリアは必須としない。
async function gateDepthBranch() {
  if (depthGateBusy) return;
  depthGateBusy = true;
  try {
    pushLog("DEPTH 16 — 深度15の記録の選択が未完了");
    ui.note.textContent = "深度16以降へ進むには、深度15で回収した中核記録の選択が必要だ。選択へ接続する。";
    if (window.DepthClear && typeof window.DepthClear.playPresentation === "function") {
      await window.DepthClear.playPresentation(15, "clear", { skipIntro: true });
    }
    if (depthBranchRecorded()) {
      selectedDepth = 16;
      cueSE("switch");
      pushLog("記録の選択を完了 — DEPTH 16 解禁");
      ui.note.textContent = "記録の選択が完了した。DEPTH 16 以降が選択可能になった。";
    }
  } catch { /* 演出側の例外で選択画面を止めない */ }
  depthGateBusy = false;
  renderDepthBlock(vesselOrder()[vesselCursor]);
}

function renderVesselSelect(spinDir) {
  const stage = ui.vesselStage;
  if (!stage) return;
  const order = vesselOrder();
  const n = order.length;
  const at = (off) => order[(vesselCursor + off + n) % n];
  const reduced = vesselReducedMotion();
  const intro = vesselIntroPending;
  vesselIntroPending = false;

  // FLIP の計測: 切り替え前に表示されている位置（中心x・足元y）を素体ごとに控える。
  // 前回の退場ゴーストは計測対象から外すため先に除去する。
  stage.querySelectorAll(".vessel-figure.is-exit").forEach((g) => g.remove());
  const prevPos = new Map();
  let exitFig = null;
  if (spinDir && !reduced) {
    const keep = new Set([at(-1), at(0), at(1)]);
    stage.querySelectorAll(".vessel-figure").forEach((f) => {
      const r = f.getBoundingClientRect();
      prevPos.set(f.dataset.vessel, { cx: r.left + r.width / 2, bottom: r.bottom });
      if (!keep.has(f.dataset.vessel) && !exitFig) exitFig = f;
    });
  }

  const ring = vesselRingBuild();
  const figL = vesselFigureEl(at(-1), "left");
  const figC = vesselFigureEl(at(0), "center");
  const figR = vesselFigureEl(at(1), "right");
  stage.replaceChildren(ring, figL, figC, figR);

  if (!reduced && spinDir) {
    const ease = "cubic-bezier(.25,.85,.3,1)";
    const ry = spinDir > 0 ? -42 : 42;
    // 退場ゴースト: その場から奥へ回り込みながら消える
    if (exitFig) {
      const ghost = exitFig.cloneNode(true);
      ghost.classList.add("is-exit");
      stage.append(ghost);
      ghost.animate([
        { translate: "0px 0px" },
        { translate: `${spinDir > 0 ? -84 : 84}px -6px`, opacity: 0, scale: 0.72 },
      ], { duration: VESSEL_SPIN_MS, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
      window.setTimeout(() => ghost.remove(), VESSEL_SPIN_MS + 90);
    }
    for (const fig of [figL, figC, figR]) {
      const vis = fig.querySelector(".vessel-figure__visual");
      const p = prevPos.get(fig.dataset.vessel);
      if (p) {
        // 台座間を移動: 現在位置から定位置へ滑らせつつ、visual をヨー回転させる
        const r = fig.getBoundingClientRect();
        const dx = p.cx - (r.left + r.width / 2);
        const dy = p.bottom - r.bottom;
        fig.animate([
          { translate: `${dx}px ${dy}px` },
          { translate: "0px 0px" },
        ], { duration: VESSEL_SPIN_MS, easing: ease });
        if (vis) vis.animate([
          { transform: "rotateY(0deg)" },
          { transform: `rotateY(${ry}deg)`, offset: 0.45 },
          { transform: "rotateY(0deg)" },
        ], { duration: VESSEL_SPIN_MS, easing: "ease-in-out" });
      } else {
        // 入場: 外側の奥から回り込んで定位置に収まる
        fig.animate([
          { translate: `${spinDir > 0 ? 110 : -110}px 10px`, opacity: 0, scale: 0.8 },
          { translate: "0px 0px", opacity: 0.55, scale: 1 },
        ], { duration: VESSEL_SPIN_MS, easing: ease });
        if (vis) vis.animate([
          { transform: `rotateY(${ry * 1.4}deg)` },
          { transform: "rotateY(0deg)" },
        ], { duration: VESSEL_SPIN_MS, easing: "ease-out" });
      }
    }
    vesselRingSpin(spinDir);
  } else if (!reduced && intro) {
    // 初回登場: 中央の素体が回転しながら台に収まり、脇は遅れて灯る
    const vis = figC.querySelector(".vessel-figure__visual");
    figC.animate([
      { translate: "0px 14px", opacity: 0 },
      { translate: "0px 0px", opacity: 1 },
    ], { duration: 760, easing: "cubic-bezier(.2,.8,.3,1)" });
    if (vis) vis.animate([
      { transform: "rotateY(-68deg)" },
      { transform: "rotateY(0deg)" },
    ], { duration: 760, easing: "cubic-bezier(.2,.8,.3,1)" });
    [figL, figR].forEach((fig, i) => {
      fig.animate([
        { opacity: 0 },
        { opacity: 0.55 },
      ], { duration: 620, delay: 130 + i * 90, easing: "ease-out", fill: "backwards" });
    });
    vesselRingSpin(1);
  }

  // CRTパネルも切り替えに合わせて受け直す（スライド＋一瞬のフリッカ）
  const panel = ui.vesselInfoName ? ui.vesselInfoName.closest(".vessel-info") : null;
  if (panel && !reduced) {
    panel.classList.remove("is-swap");
    void panel.offsetWidth;
    panel.classList.add("is-swap");
  }
  const cur = at(0);
  if (ui.vesselLaunch) ui.vesselLaunch.dataset.vessel = cur;
  if (ui.vesselPos) ui.vesselPos.textContent = `CAROUSEL ${vesselCursor + 1} / ${n}`;
  if (LOCKED_VESSEL_INFO[cur]) {
    // 未解禁: 詳細情報（説明・数値・デッキ）は出さない
    const info = LOCKED_VESSEL_INFO[cur];
    if (ui.vesselInfoName) ui.vesselInfoName.textContent = info.name;
    if (ui.vesselInfoSys) ui.vesselInfoSys.textContent = info.sys;
    if (ui.vesselInfoStats) ui.vesselInfoStats.textContent = "HP ?? ／ PWR回復 ??";
    if (ui.vesselInfoDeck) ui.vesselInfoDeck.textContent = "初期デッキ: CLASSIFIED";
    if (ui.vesselInfoFlavor) ui.vesselInfoFlavor.textContent = "SIGNAL NOT FOUND — 未解禁";
    if (ui.vesselLaunch) {
      ui.vesselLaunch.disabled = true;
      ui.vesselLaunch.textContent = "LOCKED — 選択不可";
    }
    renderDepthBlock(cur);
    return;
  }
  const def = Battle.CHARACTERS[cur];
  const profile = VESSEL_PROFILES[cur];
  if (!def || !profile) return;
  if (ui.vesselInfoName) ui.vesselInfoName.textContent = `${def.name} “${def.code}”`;
  if (ui.vesselInfoSys) ui.vesselInfoSys.textContent = profile.sys;
  if (ui.vesselInfoStats) ui.vesselInfoStats.textContent = `HP ${def.hp} ／ PWR回復 ${def.energyPerTurn}（毎ターン）${def.noiseMax && def.noiseMax < Battle.NOISE_MAX ? ` ／ NOISE上限 ${def.noiseMax}` : ""}`;
  if (ui.vesselInfoDeck) ui.vesselInfoDeck.textContent = `初期デッキ: ${deckSummaryText(cur)}`;
  if (ui.vesselInfoFlavor) ui.vesselInfoFlavor.textContent = profile.flavor;
  if (ui.vesselLaunch) {
    ui.vesselLaunch.disabled = false;
    ui.vesselLaunch.textContent = "この素体でダイブ";
  }
  renderDepthBlock(cur);
}

function rotateVessel(dir) {
  const n = vesselOrder().length;
  vesselCursor = (vesselCursor + dir + n) % n;
  cueSE("switch");
  renderVesselSelect(dir);
}

function openVesselSelect() {
  selectedDepth = depthInitialValue(); // J-7 (a): 開くたび解禁上限へリセット（初期化はここだけ・軽微4）
  const idx = vesselOrder().indexOf(selectedVessel);
  vesselCursor = idx >= 0 ? idx : 0;
  vesselIntroPending = true;
  renderVesselSelect(0);
  ui.hopper.replaceChildren();
  ui.slotLabel.textContent = "VESSEL SELECT";
  ui.note.textContent = "回転台を回して素体を選べ。特性と数値は右のCRTに出る。";
  pushLog("素体リンク待機中 — VESSELを選択せよ");
  changeScene("VESSEL");
  syncEndButton();
}

function chooseVessel(id) {
  if (audio) audio.unlock();
  selectedVessel = Battle.CHARACTERS[id] ? id : "vessel07";
  cueSE("switch");
  startRun();
}

function openRoute() {
  if (vesselSelectArmed) {
    vesselSelectArmed = false;
    openVesselSelect();
    return;
  }
  startRun();
}

function startRun() {
  clearSave(); // PROMPT-24: 新規ラン開始時は前ランのセーブを破棄する
  session.linked = true;
  session.busy = false;
  session.offer = [];
  routeToken += 1;
  const seed = Battle.createState(undefined, { character: selectedVessel });
  // 作戦深度（§5.1）: ラン開始時に確定し、ラン中は不変。戦闘・回復・報酬は run.depth から引く。
  const runDepth = resolveRunDepth();
  const runProfile = Battle.depthProfileFor(runDepth);
  run = {
    character: selectedVessel,
    depth: runDepth,
    hp: seed.player.hp,
    hpMax: seed.player.hpMax,
    relics: Relics.issued(),
    relicsLost: [], // 第0陣 0-4: 入れ替えで外したレリックの喪失リスト（R-16。そのランの提示・抽選に戻らない）
    relicUsed: {}, // 第2陣 2E (RB-6): 致死回避レリックの使用済み記録 { レリックID: true }。戦闘へは参照を共有して渡す
    deck: Battle.deckIdsFor(selectedVessel),
    noise: runProfile.startNoise, // v15.0: ノイズはラン全体で持ち越す。開始値は深度の開始NOISE（§5.4。深度1＝0で現行一致）
    kills: 0, // v15.3: 撃破数（クリア画面のX投稿サマリ用）
    mapIndex: 1, // JOB 3M-1 (C-1): 層（1〜3）の正は run 側に置く。route は現在のマップだけを持つ
  };
  markLayerArrived(run.mapIndex); // E-8: 第1層への到達を記録（ボスは不変だが回数の正を揃える）
  route = PipelineMap.generate(undefined, { mapIndex: run.mapIndex, widths: MAP_WIDTHS_3M });
  // 正式版フェーズ1: 初回戦闘の脚本チュートリアルは 07 前提（潜伏・PWR 3 の説明）なので、
  // GOLIATH のランでは行わない（通常戦闘として開始する）。
  run.tutorialPending = !tutorialCleared() && selectedVessel === "vessel07";
  resetTutorialState();
  session.dead = false;
  preloadVesselCctv(selectedVessel);
  enterMap({
    applyRelics: true,
    extraLogs: ["経路図を展開。次のノードを選べ"],
    note: () => `光っているノードが次の区画。アナログスキャンは${route.scansLeft}回。`,
    tutorial: true,
  });
}

// JOB 3M-2 (C-6): マップ進入処理の共通化。startRun 末尾・enterRestoredMap・マップ遷移で共用する。
// options.applyRelics: true のときだけ on_map_generation 系レリックを再付与する（復元時は付与しない＝
//   保存済みの scansLeft をそのまま使う）。options.note は文字列または scansLeft 確定後に評価する関数。
// options.tutorial: true のときだけ新規ラン用のマップチュートリアル判定を行う。
function enterMap(options = {}) {
  changeScene("MAP");
  ui.link.textContent = "INJECT";
  ui.ambush.hidden = true;
  ui.endTurn.hidden = true;
  ui.routeReturn.hidden = true;
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.hopper.replaceChildren();
  ui.slotLabel.textContent = "ROUTE SELECT";
  ui.log.replaceChildren();
  pushLog(`${Battle.CHARACTERS[run.character].name} INJECTED`);
  if (options.applyRelics) applyMapRelics();
  for (const line of options.extraLogs || []) pushLog(line);
  ui.note.textContent = typeof options.note === "function" ? options.note() : (options.note || "光っているノードが次の区画。");
  renderRelics();
  renderRoute();
  renderRunVitals(); // UX修正1: マップ表示時は左パネルを run の実データで描き直す
  syncEndButton();
  if (options.tutorial && run.tutorialPending) void maybeMapTutorial();
}

function tutorialCleared() {
  try { return window.localStorage.getItem(TUTORIAL_STORE) === "1"; }
  catch { return false; }
}

function markTutorialDone() {
  try { window.localStorage.setItem(TUTORIAL_STORE, "1"); }
  catch { /* storage unavailable */ }
  refreshCommsFold();
}

// ==== PROMPT-24: オートセーブ（localStorage にランを自動保存し、タイトルから再開可能にする） ====
// 保存粒度は「マップ滞在中」または「戦闘の開始時」。デッキ構成は run.deck（全カードのIDリスト）
// で保持し、戦闘の山札・手札・捨て札は戦闘開始時にそこから再構成される。
// 戦闘中セーブ（2026-11-20）: 敵の行動が終了するたび（＝プレイヤーのターン開始時点）に、
// 戦闘状態のスナップショット（Battle.serializeState）を任意フィールド battleSnap として
// 同じ v:2 セーブへ追加保存する。復元時はそのターン開始の静止状態から再開する。
// battleSnap の無い v:2 セーブ（従来の保存）は従来どおり戦闘開始時からの復元になる。
const SAVE_KEY = "enemy_pipeline_formal_save";

function saveGame(pending, battleSnap) {
  // マルチプレイ段階(3) 単位3-3: MP中は単独オートセーブを書かない（誤復元防止）
  if (mpSession.active) return;
  try {
    if (!run || !route) return;
    const data = {
      v: 2, // JOB 3M-1 (C-10): mapIndex 追加に伴い v:2 へ。旧 v:1 セーブは互換なし（loadGame で弾く）
      character: run.character || "vessel07", // 正式版フェーズ1: 使用素体も保存する
      hp: run.hp,
      hpMax: run.hpMax,
      noise: Math.max(0, Math.min(Battle.NOISE_MAX, run.noise || 0)), // v15.0: 持ち越しノイズも保存する
      kills: run.kills || 0, // v15.3: 撃破数も保存する
      mapIndex: run.mapIndex >= 1 && run.mapIndex <= 3 ? run.mapIndex : 1, // JOB 3M-1 (C-1/C-10)
      depth: run.depth >= 1 && run.depth <= 20 ? run.depth : 1, // 作戦深度（§7）: v:2 のまま任意フィールド追加（欠落時は深度1として読む）
      relics: (run.relics || []).slice(),
      relicsLost: (run.relicsLost || []).slice(), // 第0陣 0-4: v:2 のまま任意フィールド追加（欠落時は空として読む）
      relicUsed: { ...(run.relicUsed || {}) }, // 第2陣 2E (RB-6): v:2 のまま任意フィールド追加（欠落時は未使用として読む）
      deck: (run.deck || []).slice(),
      route: {
        nodes: route.nodes,
        originId: route.originId,
        currentId: route.currentId,
        scansLeft: route.scansLeft,
        scanMax: route.scanMax,
        floorCount: route.floorCount,
      },
      pending: pending || null,
      battleSnap: battleSnap || null, // 戦闘中セーブ: v:2 のまま任意フィールド追加（欠落時は null として読む）
      tutorialCompleted: tutorialCleared(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // JOB 3M-1 (C-10): 版数ガード。v:2 以外（旧 v:1 等）は読み込まない＝CONTINUE を出さない。
    // 解禁キー等の別枠 localStorage 記録には触れない（対象は SAVE_KEY のみ）。
    if (!data || data.v !== 2) return null;
    if (!data.route || !data.route.nodes || !data.route.currentId
      || !Array.isArray(data.deck) || typeof data.hp !== "number") return null;
    return data;
  } catch { return null; }
}

function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
}

// ==== 戦闘中セーブ（2026-11-20） ====
// 進行中の戦闘の encounter（saveGame の pending として保持し続ける対象）。
// beginCombat（ソロ経路）で設定し、戦闘終了（finishCombat／タイトル復帰）で解除する。
let activeCombatEncounter = null;

// 敵の行動が終了し、プレイヤーのターンが始まった静止状態で戦闘スナップショットを保存する。
// 呼び出し点は「ターン開始の手札が配り終わり、操作可能になった直後」のみ
// （beginCombat の第1ターン開始時／runEnemyPhase の正常終了時）。
// 演出・アニメーションの途中状態は state に含まれないため、ここで保存する限り
// 復元は常にターン開始の静止状態になる。
function saveBattleSnapshot() {
  if (mpSession.active) return; // MP中は対象外（単独セーブ無効化の既定仕様どおり）
  if (!battle || session.phase !== "combat") return;
  if (tutorialBattle) return; // チュートリアル戦闘は脚本進行中のため対象外（従来どおり戦闘開始時から復元）
  if (!activeCombatEncounter) return;
  if (battle.enemy.dead || myPlayer().hp <= 0) return; // 終了した戦闘は保存しない
  saveGame(activeCombatEncounter, Battle.serializeState(battle));
}

function refreshSoundToggle() {
  if (!ui.soundToggle) return;
  ui.soundToggle.textContent = audio && audio.muted ? "[ SOUND: OFF ]" : "[ SOUND: ON ]";
}

function applyVideoMute() {
  if (!audio) return;
  for (const v of [ui.introVideo, ui.hackVideo, ui.speechVideo]) {
    if (v) v.muted = audio.muted;
  }
}

function refreshTutorialBtn() {
  if (!ui.tutorialBtn) return;
  ui.tutorialBtn.hidden = session.phase !== "attract";
}

function refreshNewGameBtn() {
  if (!ui.newgameBtn) return;
  ui.newgameBtn.hidden = session.phase !== "attract";
}

function refreshCoopBtn() {
  if (!ui.coopBtn) return;
  ui.coopBtn.hidden = session.phase !== "attract";
}
function refreshArchiveBtn() {
  if (!ui.archiveBtn) return;
  ui.archiveBtn.hidden = session.phase !== "attract";
}

function refreshContinueBtn() {
  if (!ui.continueBtn) return;
  const hasSave = session.phase === "attract" && !!loadGame();
  ui.continueBtn.hidden = !hasSave;
  if (ui.attract) ui.attract.classList.toggle("has-continue", hasSave);
}

// セーブデータからランを復元する（タイトル画面の CONTINUE から呼ばれる）
function restoreRun() {
  const data = loadGame();
  if (!data) { refreshContinueBtn(); return; }
  const nodes = data.route.nodes;
  const floors = [];
  for (let f = 1; f <= (data.route.floorCount || 0); f += 1) {
    floors.push(Object.values(nodes).filter((n) => n.floor === f).sort((a, b) => a.index - b.index));
  }
  const links = [];
  for (const node of Object.values(nodes)) {
    for (const to of node.edges || []) links.push({ from: node.id, to });
  }
  const restoredMapIndex = data.mapIndex >= 1 && data.mapIndex <= 3 ? data.mapIndex : 1; // JOB 3M-1 (C-1/C-10)
  route = {
    floors, nodes, links,
    originId: data.route.originId,
    currentId: data.route.currentId,
    scansLeft: data.route.scansLeft,
    scanMax: data.route.scanMax,
    floorCount: data.route.floorCount,
    mapIndex: restoredMapIndex,
  };
  run = {
    character: Battle.CHARACTERS[data.character] ? data.character : "vessel07", // 正式版: 使用素体を復元（既知IDのみ許可）
    hp: data.hp,
    hpMax: data.hpMax,
    mapIndex: restoredMapIndex,
    depth: Number.isInteger(data.depth) && data.depth >= 1 && data.depth <= 20 ? data.depth : 1, // 作戦深度（§7）: 旧 v:2 セーブ（フィールド欠落）は深度1として復元＝現行挙動で完走できる
    noise: typeof data.noise === "number" ? Math.max(0, Math.min(Battle.NOISE_MAX, data.noise)) : 0, // v15.0: 持ち越しノイズを復元
    kills: typeof data.kills === "number" ? data.kills : 0, // v15.3: 撃破数を復元
    relics: Array.isArray(data.relics) ? data.relics.slice() : [],
    relicsLost: Array.isArray(data.relicsLost) ? data.relicsLost.slice() : [], // 第0陣 0-4: 旧 v:2 セーブ（フィールド欠落）は空扱い
    relicUsed: (data.relicUsed && typeof data.relicUsed === "object" && !Array.isArray(data.relicUsed)) ? { ...data.relicUsed } : {}, // 第2陣 2E (RB-6): 旧 v:2 セーブ（フィールド欠落）は未使用扱い
    deck: data.deck.slice(),
    // 復元したランではチュートリアルの脚本は再生しない（新規ラン開始時に改めて行われる）
    tutorialPending: false,
  };
  session.linked = true;
  session.busy = false;
  session.offer = [];
  session.dead = false;
  routeToken += 1;
  resetTutorialState();
  ui.broadcast.hidden = true;
  ui.desk.hidden = false;
  window.requestAnimationFrame(() => ui.screen.classList.add("is-on"));
  const pending = data.pending;
  if (pending && pending.kind === "combat") {
    // 戦闘中セーブ: スナップショットがあればターン開始状態へ復元する。無ければ従来どおり
    // その戦闘の開始時から再開する（旧 v:2 セーブ互換）。
    if (data.battleSnap) { restoreCombat(pending, data.battleSnap); return; }
    void beginCombat(pending);
    return;
  }
  enterRestoredMap();
  if (pending && pending.kind === "rest") openSafehouse();
  else if (pending) beginField(pending);
}

function enterRestoredMap() {
  // JOB 3M-2 (C-6): マップ進入処理は enterMap() に共通化。復元ではレリック再付与はしない。
  enterMap({
    applyRelics: false,
    extraLogs: ["記録データを復元。経路図を再展開"],
    note: "光っているノードが次の区画。",
  });
}

// 戦闘中セーブからの復元: 保存済みスナップショット（Battle.serializeState 産）を
// hydrate し、ターン開始の静止状態として戦闘画面を組み直す。beginCombat との差分は
// 「状態を新規生成せずスナップショットから復元する」「開始時セーブを書き直さない」
// 「ボス導入通信などの開始演出を再生しない」の3点だけ。
function restoreCombat(encounter, snap) {
  session.busy = true;
  session.advance = false;
  pinchHeard = false;
  pinchQueued = false;
  const hydrated = Battle.hydrateState(snap);
  if (!hydrated) { void beginCombat(encounter); return; } // 復元不能なら従来の戦闘開始時復元へ
  battle = hydrated;
  // RB-6: 致死回避の使用済み記録はラン側と共有オブジェクトである前提（beginCombat と同一）。
  // hydrate 側の複製ではなく、復元済みの run.relicUsed へ繋ぎ直す（内容は保存時点で同一）。
  battle.relicUsed = run.relicUsed;
  activeCombatEncounter = encounter;
  tutorialBattle = false;
  setTutorialStep("off");
  Battle.syncAlertBuff(battle, myPlayer());
  lastNoiseShown = myPlayer().noise;
  // ボス戦では提供曲をゆっくりフェードインさせる（beginCombat と同一）
  bossBgm = encounter.type === "BOSS";
  // 深度クリア演出（J-12）: 第3層ボス戦ではその深度の一枚絵を preload する（beginCombat と同一）
  if (bossBgm && run && (run.mapIndex || 1) >= 3 && window.DepthClear) {
    window.DepthClear.preloadForContext({ depth: run.depth || null });
  }
  // 低耐久のまま復元した場合は、復元時点のHPで低耐久状態を初期化する
  lowHpBgmActive = !bossBgm && myPlayer().hp > 0 && myPlayer().hp * 10 <= (myPlayer().hpMax || 1) * 3;
  if (audio && bossBgm) audio.fadeSeconds = 2.2;
  changeScene("BATTLE");
  if (audio) audio.fadeSeconds = 0.7;
  ui.ambush.hidden = true;
  ui.link.textContent = "CARRIER LOCK";
  ui.contact.textContent = battle.enemy.name;
  ui.enemyName.textContent = encounter.short || battle.enemy.name;
  setCctvImage((battle.enemy && battle.enemy.image) || encounter.image || "", encounter.name, encounter.type);
  preloadEnemyCctv(battle.enemy);
  ui.slotLabel.textContent = "READER LIVE";
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
  ui.hopper.replaceChildren();
  resetHandSeen(); // 復元した手札は全枚が表示対象（状態と DOM を一致させる）
  ui.log.replaceChildren();
  const here = route && route.nodes[route.currentId];
  if (here && here.isFake) pushLog("WARNING: AMBUSH");
  pushLog(`ENGAGE  ${encounter.name}`);
  pushLog("戦闘記録を復元 — ターン開始時点から再開");
  renderRelics();
  spawn(myPlayer().hand.map(face));
  renderCombat();
  renderPiles();
  refreshHand();
  session.busy = false;
  syncEndButton();
}

function setTutorialStep(step) {
  tutorialStep = step;
  if (ui.screen) ui.screen.dataset.tutorial = step;
}

function tutorialLock(cardId) {
  if (radioOpen) return true;
  if (tutorialStep === "victory") return true;
  if (tutorialStep === "t1") return cardId !== "defend_cover";
  if (tutorialStep === "t1end") return true;
  if (tutorialStep === "t3") {
    // PROMPT-22: T3は射撃／格闘／潜伏の3枚から選ばせる
    return !(cardId === "gun_suppressed_pistol" || cardId === "strike_cqc" || cardId === "defend_cover");
  }
  return false;
}

const TUTORIAL_FOCUS = {
  boot: { hi: [".punchcard[data-id='boot']", "#slot"], dim: [] },
  // PROMPT-28: 戦闘冒頭のレリック説明（#relics は aside 内なので status-bay は dim しない）
  relic: { hi: ["#relics"], dim: [".glass", ".tray"] },
  // PROMPT-25: T1は通信の行ごとにハイライトを切り替える（1行目=電力、2行目=防護カード+スロット）
  t1a: { hi: ["#energy-row", "#energy-pips"], dim: [".glass", ".meters", ".tray"] },
  t1b: { hi: [".punchcard[data-id='defend_cover']", "#slot"], dim: [".status-bay", ".meters", ".glass"] },
  t2: { hi: ["#enemy-hp-row", ".bar--enemy"], dim: [".status-bay", ".glass", ".tray"] },
  t1end: { hi: ["#end-turn"], dim: [".tray"] },
  t3a: { hi: ["#noise-meter"], dim: [".glass", ".tray"] },
  t3cov: { hi: ["#stance", "#stance-hint"], dim: [".glass", ".tray"] },
  t3b: { hi: ["#stun-pips"], dim: [".glass", ".tray"] },
};

function clearTutorialFocus() {
  for (const el of document.querySelectorAll(".tutorial-highlight, .tutorial-dim")) {
    el.classList.remove("tutorial-highlight", "tutorial-dim");
  }
}

function setTutorialFocus(step) {
  clearTutorialFocus();
  const conf = TUTORIAL_FOCUS[step];
  if (!conf) return;
  for (const sel of conf.dim) {
    const el = document.querySelector(sel);
    if (el) el.classList.add("tutorial-dim");
  }
  for (const sel of conf.hi) {
    const el = document.querySelector(sel);
    if (el) el.classList.add("tutorial-highlight");
  }
}

// ==== PROMPT-19/20: 完全版チュートリアル（BOOT→MAP→戦闘3ターン） ====
let tutMapNodeId = null;

function rigHand(ids) {
  myPlayer().drawPile.push(...myPlayer().hand.splice(0, myPlayer().hand.length));
  const pulled = [];
  for (const id of ids) {
    let idx = myPlayer().drawPile.findIndex((c) => c.id === id);
    if (idx >= 0) { pulled.push(myPlayer().drawPile.splice(idx, 1)[0]); continue; }
    idx = myPlayer().discard.findIndex((c) => c.id === id);
    if (idx >= 0) { pulled.push(myPlayer().discard.splice(idx, 1)[0]); continue; }
    const def = Battle.card(id);
    if (def) pulled.push(def);
  }
  myPlayer().hand = pulled;
  ui.hopper.replaceChildren();
  resetHandSeen(); // チュートリアルの脚本手札は差し替えとして全枚見せる
  spawn(myPlayer().hand.map(face));
  renderPiles();
  refreshHand();
}

function forceTutIntent(intent) {
  if (!battle.enemy._realPattern) battle.enemy._realPattern = battle.enemy.pattern;
  battle.enemy.pattern = [intent];
  battle.enemy.patternIndex = 0;
}

function restoreTutIntent() {
  if (battle && battle.enemy && battle.enemy._realPattern) {
    battle.enemy.pattern = battle.enemy._realPattern;
    battle.enemy.patternIndex = 0;
    delete battle.enemy._realPattern;
  }
}

async function setupTutTurn2() {
  rigHand(["strike_cqc", "strike_cqc", "defend_cover"]);
  // PROMPT-25: 「隙」バッジは廃止し、英字タグ STUNNED に統一する
  forceTutIntent({ action: "wait", name: "STUNNED", value: 0 });
  setTutorialStep("t2");
  renderCombat();
  refreshHand();
  syncEndButton();
  // PROMPT-25: T2の通信中は敵の耐久HPバーを光らせる
  setTutorialFocus("t2");
  await presentRadio([GRAY_T2]);
  clearTutorialFocus();
  refreshHand();
  syncEndButton();
}

async function setupTutTurn3() {
  // PROMPT-22: T3の手札は射撃／格闘／潜伏の3枚。通信は ノイズ → 潜伏 → スタン の順で出す
  rigHand(["gun_suppressed_pistol", "strike_cqc", "defend_cover"]);
  forceTutIntent({ action: "heavy_attack", name: "強射", value: 12, hits: 1 });
  setTutorialStep("t3");
  renderCombat();
  refreshHand();
  syncEndButton();
  setTutorialFocus("t3a");
  let ok = await presentRadio([GRAY_T3_A]);
  if (!ok || session.phase !== "combat") { clearTutorialFocus(); return; }
  setTutorialFocus("t3cov");
  ok = await presentRadio([GRAY_T3_B]);
  if (!ok || session.phase !== "combat") { clearTutorialFocus(); return; }
  setTutorialFocus("t3b");
  ok = await presentRadio([GRAY_T3_C]);
  if (!ok || session.phase !== "combat") { clearTutorialFocus(); return; }
  clearTutorialFocus();
  refreshHand();
  syncEndButton();
}

async function finishTutBattle() {
  restoreTutIntent();
  clearTutorialFocus();
  setTutorialStep("live");
  tutorialBattle = false;
  if (run) run.tutorialPending = false;
  markTutorialDone();
  renderCombat();
  refreshHand();
  syncEndButton();
  await presentRadio([GRAY_TUT_END]);
}

// PROMPT-20 フェーズ1: BOOTカード挿入の誘導
async function maybeBootTutorial() {
  setTutorialStep("boot");
  setTutorialFocus("boot");
  await presentRadio([GRAY_TUT_BOOT], { phase: "await-boot" });
  clearTutorialFocus();
  if (tutorialStep === "boot") setTutorialStep("off");
}

// PROMPT-20 フェーズ2: 最初のBATTLEノードへ誘導
async function maybeMapTutorial() {
  const open = PipelineMap.available(route);
  const target = open && open[0];
  if (!target) return;
  target.hiddenType = "BATTLE";
  target.displayType = "BATTLE";
  target.isFake = false;
  tutMapNodeId = target.id;
  setTutorialStep("map");
  renderRoute();
  const ok = await presentRadio(GRAY_TUT_MAP, { phase: "map" });
  if (!ok || session.phase !== "map") { tutMapNodeId = null; return; }
  renderRoute();
}

// PROMPT-18: 警報発令の演出（赤点滅＋ブザー＋バナー）
async function playBreach() {
  if (audio) audio.playSE("alarm");
  session.busy = true;
  syncEndButton();
  if (ui.breach) {
    ui.breach.hidden = false;
    ui.breach.classList.remove("is-on");
    void ui.breach.offsetWidth;
    ui.breach.classList.add("is-on");
  }
  renderNoise();
  await hold(1700, () => session.phase === "combat");
  if (ui.breach) {
    ui.breach.hidden = true;
    ui.breach.classList.remove("is-on");
  }
  session.busy = false;
  syncEndButton();
}

let focusedCardEl = null;

function focusCard(el) {
  if (!el || el.classList.contains("punchcard--ghost")) return;
  if (focusedCardEl === el && !ui.cardInspect.hidden) return;
  clearCardFocus();
  focusedCardEl = el;
  el.classList.add("is-focused");
  let data = {
    name: el.dataset.name || "",
    cost: el.dataset.cost || "0",
    noise: el.dataset.noise || "0",
    stance: el.dataset.stance || "",
    flavor: el.dataset.flavor || "",
    exhaust: el.dataset.exhaust === "1",
    rules: "",
  };
  const card = window.Battle && el.dataset.id ? Battle.card(el.dataset.id) : null;
  if (card) data = face(card);
  // 正式版フェーズ1: 規格外巨体の置換対象カードは解析パネルをグリッチ調に変える
  ui.cardInspect.classList.toggle("is-oversized", !!data.oversized);
  ui.cardInspectName.textContent = `解析：${data.name}${data.exhaust ? "【廃棄】" : ""}${data.trap ? "【設置】" : ""}`;
  const noiseText = Number(data.noise) > 0 ? `+${data.noise}` : `${data.noise}`;
  const lines = [`消費PWR ${data.cost} / 発生ノイズ ${noiseText} / 態勢→${data.stance || "—"}`];
  const rulesLine = data.rulesFull || data.rules;
  if (rulesLine) lines.push(rulesLine);
  // スタン効果カードは、レリック補正（油圧関節など）込みの実効値を解析に併記する
  if (card && window.Relics && typeof run !== "undefined" && run && run.relics) {
    const stunEff = (card.effects || []).find((effect) => effect.target === "enemy" && effect.type === "stun");
    const bonus = stunEff ? Relics.stunBonus({ relics: run.relics }) : 0;
    if (stunEff && bonus > 0) lines.push(`スタン実効 +${stunEff.value + bonus}（レリック補正 +${bonus}）`);
  }
  ui.cardInspectBody.textContent = lines.join("\n");
  const flavorText = (data.flavor || "").replace(/^「/, "").replace(/」$/, "");
  ui.cardInspectFlavor.textContent = flavorText ? `「${flavorText}」` : "";
  ui.cardInspectFlavor.hidden = !flavorText;
  ui.cardInspect.hidden = false;
  positionInspect(el);
}

function positionInspect(el) {
  // fixed 配置（画面基準）：カードの真上に寄せ、画面端ではみ出さないようクランプする
  const cardRect = el.getBoundingClientRect();
  const panelW = ui.cardInspect.offsetWidth;
  const panelH = ui.cardInspect.offsetHeight;
  let left = cardRect.left + cardRect.width / 2 - panelW / 2;
  left = Math.max(4, Math.min(left, Math.max(4, window.innerWidth - panelW - 4)));
  let top = cardRect.top - panelH - 8;
  if (top < 4) top = Math.min(cardRect.bottom + 8, Math.max(4, window.innerHeight - panelH - 4));
  ui.cardInspect.style.left = `${left}px`;
  ui.cardInspect.style.top = `${top}px`;
}

function clearCardFocus() {
  if (focusedCardEl) focusedCardEl.classList.remove("is-focused");
  focusedCardEl = null;
  if (ui.cardInspect) {
    ui.cardInspect.hidden = true;
    ui.cardInspect.classList.remove("is-oversized");
  }
}

// 通信パネルはレイアウト外のオーバーレイ（画面右側に被さる）で、出すのは通信中だけ。
// 旧 v13.5 の「畳む／開くでグリッド列が増減し中央画面が伸縮する」方式は廃止
// （実機要望 2026-11-21: パネルが出るとゲーム画面が縮まるのが悩み）。
// 待機状態はステータスバーの #link-state が担い、大きな NO CARRIER 面は出さない。
// 関数名と呼び出し箇所は従来のまま（意味だけ「オーバーレイ表示の同期」に変わる）。
function refreshCommsFold() {
  if (!ui.screen) return;
  ui.screen.classList.toggle("comms-live", !!radioOpen);
}

function silenceRadio() {
  radioToken += 1;
  radioOpen = false;
  refreshCommsFold();
  radioReady = false;
  window.clearTimeout(radioTimer);
  radioTimer = 0;
  const pending = radioAdvance;
  radioAdvance = null;
  if (ui.radio) {
    ui.radio.hidden = true;
    ui.radio.classList.remove("is-in");
    ui.radio.classList.remove("radio--danger");
    ui.radioLine.classList.remove("is-speaking");
    ui.radioNext.hidden = true;
  }
  if (pending) pending();
}

function resetTutorialState() {
  silenceRadio();
  tutorialBattle = false;
  pinchHeard = false;
  pinchQueued = false;
  setTutorialStep("off");
}

function rigTutorialDraw(state) {
  const pile = state.drawPile;
  if (!pile) return;
  const take = (id) => {
    const index = pile.findIndex((card) => card && card.id === id);
    if (index < 0) return null;
    return pile.splice(index, 1)[0];
  };
  const cover = take("defend_cover");
  const strike = take("strike_cqc");
  if (cover) pile.push(cover);
  if (strike) pile.push(strike);
}

function dealOpeningHand() {
  const started = Battle.beginPlayerTurn(battle, undefined, myPlayer());
  for (const line of started.log) pushLog(line);
  resetHandSeen(); // 戦闘開始: 初期手札は全枚が新規到着
  spawn(started.drawn.map(face));
  renderCombat();
  renderPiles();
  refreshHand();
}

function pinchCrossed(beforeHp) {
  if (!battle || pinchHeard || myPlayer().hp <= 0) return false;
  const max = myPlayer().hpMax || 1;
  return beforeHp * 10 > max * 3 && myPlayer().hp * 10 <= max * 3;
}

async function drainPinch() {
  if (!pinchQueued || session.phase !== "combat" || !battle || myPlayer().hp <= 0) return;
  pinchQueued = false;
  await presentRadio([GRAY_PINCH], { flash: true });
}

async function maybePinch(beforeHp) {
  if (!pinchCrossed(beforeHp)) return;
  pinchHeard = true;
  if (radioOpen) {
    pinchQueued = true;
    return;
  }
  await presentRadio([GRAY_PINCH], { flash: true });
}

function armRadioAdvance(token, flash) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(radioTimer);
      radioTimer = 0;
      if (radioAdvance === finish) radioAdvance = null;
      radioReady = false;
      resolve();
    };
    radioAdvance = finish;
    if (flash) radioTimer = window.setTimeout(finish, reducedMotion() ? 700 : 1100);
  });
}

function advanceRadio() {
  if (!radioReady || !radioAdvance) return;
  window.clearTimeout(radioTimer);
  radioTimer = 0;
  const finish = radioAdvance;
  radioAdvance = null;
  radioReady = false;
  finish();
}

async function dismissRadio(token) {
  if (token !== radioToken) return;
  radioReady = false;
  radioAdvance = null;
  ui.radio.classList.remove("is-in");
  ui.radio.classList.remove("radio--danger");
  if (!reducedMotion()) await delay(280);
  if (token !== radioToken) return;
  ui.radio.hidden = true;
  ui.radioLine.textContent = "";
  ui.radioLine.classList.remove("is-speaking");
  ui.radioNext.hidden = true;
  radioOpen = false;
  refreshCommsFold();
  refreshHand();
  syncEndButton();
}

async function presentRadio(lines, opts = {}) {
  const token = ++radioToken;
  radioOpen = true;
  refreshCommsFold();
  radioReady = false;
  session.advance = false;
  window.clearTimeout(radioTimer);
  radioTimer = 0;
  ui.radio.hidden = false;
  ui.radioLine.textContent = "";
  ui.radioLine.classList.remove("is-speaking");
  ui.radioNext.hidden = true;
  ui.radio.classList.remove("is-in");
  void ui.radio.offsetWidth;
  ui.radio.classList.add("is-in");
  ui.radio.classList.toggle("radio--danger", !!opts.danger);
  syncEndButton();
  refreshHand();
  const wantPhase = opts.phase || "combat";
  const live = () => token === radioToken && session.phase === wantPhase;
  for (let i = 0; i < lines.length; i += 1) {
    radioReady = false;
    session.advance = false;
    ui.radioNext.hidden = true;
    const typed = await typeText(ui.radioLine, lines[i], live, { gap: 22, caret: true, radio: true });
    if (!typed || !live()) return false;
    radioReady = true;
    ui.radioNext.hidden = false;
    await armRadioAdvance(token, !!(opts.flash && i === lines.length - 1));
    if (!live()) return false;
  }
  await dismissRadio(token);
  if (token !== radioToken) return false;
  await drainPinch();
  return session.phase === wantPhase;
}

async function victoryRadio() {
  setTutorialStep("victory");
  refreshHand();
  syncEndButton();
  const ok = await presentRadio([GRAY_WIN]);
  if (!ok || session.phase !== "combat" || !battle || battle.player.hp <= 0) return;
  setTutorialStep("done");
  tutorialBattle = false;
  if (run) run.tutorialPending = false;
  markTutorialDone();
  session.busy = false;
  openReward();
}

async function maybeVictory() {
  if (!tutorialBattle || tutorialStep === "done" || tutorialStep === "victory") return false;
  if (!battle || !battle.enemy.dead || battle.player.hp <= 0) return false;
  await victoryRadio();
  return true;
}

// PROMPT-27: モニターはシーン合成（部屋／敵／素体）。部屋はエンカウント種別で振り分ける
const CCTV_ROOMS = {
  BOSS: [{ key: "gate", src: "assets/room_gate.jpg" }],
  ELITE: [{ key: "corridor", src: "assets/room_corridor.jpg" }, { key: "hangar", src: "assets/room_hangar.jpg" }],
  BATTLE: [{ key: "server", src: "assets/room_server.jpg" }, { key: "corridor", src: "assets/room_corridor.jpg" }, { key: "hangar", src: "assets/room_hangar.jpg" }],
};

function pickCctvRoom(type) {
  const list = CCTV_ROOMS[type] || CCTV_ROOMS.BATTLE;
  return list[Math.floor(Math.random() * list.length)];
}

function setCctvImage(src, targetName, type) {
  if (ui.cctvTarget) ui.cctvTarget.textContent = `TARGET: ${targetName || "—"}`;
  if (!ui.cctvScene || !ui.cctvEnemy || !ui.cctvDummy) return;
  ui.cctvScene.hidden = true;
  ui.cctvDummy.hidden = false;
  if (ui.cctvRoom) {
    const room = pickCctvRoom(type);
    ui.cctvRoom.src = room.src;
    ui.cctvScene.dataset.room = room.key;
  }
  if (ui.cctvLock) ui.cctvLock.hidden = true;
  if (!src) return;
  ui.cctvEnemy.onload = () => {
    ui.cctvScene.hidden = false;
    ui.cctvDummy.hidden = true;
    if (ui.cctvLock && ui.cctvEnemy.naturalWidth > 0) {
      setCctvFxVar("--fx-enemy-ar", ui.cctvEnemy.naturalWidth + " / " + ui.cctvEnemy.naturalHeight);
      ui.cctvLock.hidden = false;
    }
  };
  ui.cctvEnemy.onerror = () => {
    ui.cctvScene.hidden = true;
    ui.cctvDummy.hidden = false;
    if (ui.cctvLock) ui.cctvLock.hidden = true;
  };
  ui.cctvEnemy.src = src;
}

// v25: BGM の層別切替（bgm-prompts-2026-11-12「配線メモ（追加5枠）」が正本）。
// 層の正は run.mapIndex（1〜3）、route.mapIndex はフォールバック（層表示と同じ規約）。
// マルチのゲスト側もスナップショットの runView で run.mapIndex が復元されるため、
// この判定はホスト・ゲスト共通に効く。
function currentLayer() {
  if (run && run.mapIndex >= 1 && run.mapIndex <= 3) return run.mapIndex;
  if (route && route.mapIndex >= 1 && route.mapIndex <= 3) return route.mapIndex;
  return 1;
}

// 通常戦闘曲: 第1層＝battle／第2層＝battle_l2／第3層＝battle_l3
function battleBgmTrack() {
  return ["battle", "battle_l2", "battle_l3"][currentLayer() - 1];
}

// ボス曲: 第1・2層ボス＝boss（heartbeat_at_the_gate）／第3層ボス＝boss_final
function bossBgmTrack() {
  return currentLayer() >= 3 ? "boss_final" : "boss";
}

// ボス戦BGM（heartbeat_at_the_gate）が有効かどうか
let bossBgm = false;

// v14.5 低耐久BGM（bgm-prompts-2026-11-12 G節の配線メモが正本）:
// 戦闘中、素体HPが最大の30%以下で通常戦闘曲→低耐久曲へクロスフェード、
// 回復して40%以上に戻れば通常戦闘曲へ復帰（ヒステリシス）。ボス戦はボス曲優先。
let lowHpBgmActive = false;

function updateLowHpBgm() {
  if (!audio || !battle) return;
  if (currentScene !== "BATTLE" || bossBgm) { lowHpBgmActive = false; return; }
  const hp = myPlayer().hp;
  const max = myPlayer().hpMax || 1;
  // 敗北時はGAMEOVER曲が優先（ここでは低耐久へ倒さず、状態だけ畳む）
  if (hp <= 0) { lowHpBgmActive = false; return; }
  if (!lowHpBgmActive && hp * 10 <= max * 3) {
    lowHpBgmActive = true;
    audio.playBgm("battle_lowhp");
  } else if (lowHpBgmActive && hp * 10 >= max * 4) {
    lowHpBgmActive = false;
    audio.playBgm(battleBgmTrack()); // v25: 復帰先は固定の battle でなく現在の層の戦闘曲
  }
}

// v15.3: ボス戦の低耐久演出（DESIGN-QUALITY-UP.md「ボス戦の低耐久演出」節）。
// ボス曲は維持したまま（低耐久曲へは切り替えない）、警告音の層だけを足す:
// 心拍音ループ（AudioManager の SE バス）＋画面端の赤い鼓動（#boss-pulse）。
// 閾値は低耐久BGM判定と同一のヒステリシス（入り HP30%以下／復帰 HP40%以上）。
// ボス戦以外では絶対に発火せず、戦闘離脱・ボス撃破・ゲームオーバーで確実に止める。
let bossLowHpAlert = false;
window.__bossAlert = false;

function setBossAlert(on) {
  const next = !!on;
  if (bossLowHpAlert === next) {
    if (ui.bossPulse) ui.bossPulse.hidden = !next;
    return;
  }
  bossLowHpAlert = next;
  window.__bossAlert = next;
  if (ui.bossPulse) ui.bossPulse.hidden = !next;
  if (ui.screen) ui.screen.classList.toggle("is-boss-lowhp", next);
  if (audio) {
    if (next) audio.startHeartbeat();
    else audio.stopHeartbeat();
  }
}

function updateBossAlert() {
  if (!battle || !myPlayer()) { setBossAlert(false); return; }
  const hp = myPlayer().hp;
  const max = myPlayer().hpMax || 1;
  const inBossCombat = bossBgm && currentScene === "BATTLE" && session.phase === "combat" && hp > 0;
  if (!inBossCombat) { setBossAlert(false); return; }
  if (!bossLowHpAlert && hp * 10 <= max * 3) setBossAlert(true);
  else if (bossLowHpAlert && hp * 10 >= max * 4) setBossAlert(false);
}

async function beginCombat(encounter) {
  // マルチプレイ段階(3) 単位3-3: MPホストの戦闘開始は party＋PARTY_SCALING で組む
  if (mpSession.active && mpSession.isHost) { await beginCombatMP(encounter); return; }
  session.busy = true;
  session.advance = false;
  pinchHeard = false;
  pinchQueued = false;
  activeCombatEncounter = encounter; // 戦闘中セーブ: ターン開始スナップショットの pending 保持用
  saveGame(encounter); // PROMPT-24: バトル突入時に保存（復元時はこの戦闘の開始時から）
  battle = Battle.createState(undefined, {
    relics: run.relics, relicUsed: run.relicUsed, deck: run.deck, character: run.character,
    // 作戦深度（§5.1）: プロファイルと encounter の種別を state へ渡す（種別はスタン減衰の判定根拠・§5.3-2）
    depthProfile: Battle.depthProfileFor(run.depth || 1),
    encounterType: encounter && encounter.type ? encounter.type : null,
  });
  myPlayer().hp = Math.max(0, run.hp);
  myPlayer().hpMax = run.hpMax;
  // v15.0: 持ち越しノイズを戦闘の初期値にする（機体別範囲でクランプ。ラン側は常に0以上）
  myPlayer().noise = Battle.clampNoiseFor(run.noise || 0, run.character);
  // 正式版フェーズ1（A-2）: 戦闘の第1ターンの変換基準も持ち越しノイズで初期化する
  myPlayer().turnStartNoise = myPlayer().noise;
  Battle.syncAlertBuff(battle, myPlayer());
  lastNoiseShown = myPlayer().noise;
  if (!(encounter.enemyId && Battle.applyEnemy(battle, encounter.enemyId))) {
    battle.enemy.name = encounter.name;
    battle.enemy.hp = encounter.hp;
    battle.enemy.hpMax = encounter.hp;
  }
  const opened = Battle.startCombat(battle);
  const teach = !!(run && run.tutorialPending);
  tutorialBattle = teach;
  setTutorialStep(teach ? "t1" : "off");
  // ボス戦では提供曲をゆっくりフェードインさせる（クリア画面まで継続）
  bossBgm = encounter.type === "BOSS";
  // 深度クリア演出（J-12）: 第3層ボス戦の開始時に、そのランの深度の一枚絵を preload する。
  // 深度の実値は run.depth から供給する（深度システム本体の接続。強制指定がある場合は
  // depth-clear.js 側の優先順位で context.depth が優先される）。
  if (bossBgm && run && (run.mapIndex || 1) >= 3 && window.DepthClear) {
    window.DepthClear.preloadForContext({ depth: run.depth || null });
  }
  // 低耐久のまま次の戦闘へ入る場合は、開始時点のHPで低耐久状態を初期化する
  lowHpBgmActive = !bossBgm && myPlayer().hp > 0 && myPlayer().hp * 10 <= (myPlayer().hpMax || 1) * 3;
  if (audio && bossBgm) audio.fadeSeconds = 2.2;
  changeScene("BATTLE");
  if (audio) audio.fadeSeconds = 0.7;
  ui.ambush.hidden = true;
  ui.link.textContent = "CARRIER LOCK";
  ui.contact.textContent = encounter.name;
  ui.enemyName.textContent = encounter.short || encounter.name;
  setCctvImage((battle.enemy && battle.enemy.image) || encounter.image || "", encounter.name, encounter.type);
  preloadEnemyCctv(battle.enemy);
  ui.slotLabel.textContent = "READER LIVE";
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
  ui.hopper.replaceChildren();
  resetHandSeen(); // 戦闘開始: 初期手札は全枚が新規到着
  ui.log.replaceChildren();
  const here = route && route.nodes[route.currentId];
  if (here && here.isFake) pushLog("WARNING: AMBUSH");
  pushLog(`ENGAGE  ${encounter.name}`);
  for (const line of opened.log) pushLog(line);
  renderRelics();
  renderCombat();
  renderPiles();
  syncEndButton();
  if (!teach) {
    if (encounter.type === "BOSS") {
      const bossOk = await presentRadio([GRAY_BOSS]);
      if (!bossOk || session.phase !== "combat") return;
    }
    dealOpeningHand();
    // v15.0: 持ち越しノイズで警戒段階から始まる戦闘でも、初回なら説明通信を出す
    await maybeAlertIntro();
    if (session.phase !== "combat") return;
    session.busy = false;
    syncEndButton();
    saveBattleSnapshot(); // 戦闘中セーブ: 第1ターン開始時点を保存する
    return;
  }
  // PROMPT-28: 手札を配る前に、レリック（特殊装備）の説明ステップを挟む
  setTutorialFocus("relic");
  const relicOk = await presentRadio(GRAY_TUT_RELIC);
  clearTutorialFocus();
  if (!relicOk || session.phase !== "combat") return;
  dealOpeningHand();
  refreshHand();
  // PROMPT-19 ターン1: 手札と敵インテントを固定し、通信を2段で出す
  rigHand(["defend_cover", "strike_cqc"]);
  // PROMPT-22: 射撃は7に調整（潜伏-2 → 防護5で相殺し、被ダメージ0で「防護が効く」ことを見せる）
  forceTutIntent({ action: "attack", name: "射撃", value: 7, hits: 1 });
  renderCombat();
  refreshHand();
  syncEndButton();
  const introOk = await presentRadio([GRAY_TUT_INTRO]);
  if (!introOk || session.phase !== "combat") return;
  // PROMPT-25: 1行目（電力を見ろ）では電力行、2行目（防護を使え）では防護カード+スロットを光らせる
  setTutorialFocus("t1a");
  const t1aOk = await presentRadio([GRAY_T1[0]]);
  if (!t1aOk || session.phase !== "combat") { clearTutorialFocus(); return; }
  setTutorialFocus("t1b");
  const t1Ok = await presentRadio([GRAY_T1[1]]);
  clearTutorialFocus();
  if (!t1Ok || session.phase !== "combat") return;
  session.busy = false;
  refreshHand();
  syncEndButton();
}

function beginField(encounter) {
  if (encounter && encounter.kind === "rest") {
    openSafehouse();
    return;
  }
  openFieldEvent(encounter);
}

// 回復率は作戦深度の healRate から引く（§5.5／判断 J-3 論点1 (a)）。rate 未指定時は
// 現行の 0.4。深度1の healRate も 0.4 のため、深度1では現行と完全一致する。
// マルチの復帰HPも同じ healRate に完全連動する（J-3 論点2 (i)。接続点は DEPTH_TABLE 側）。
function safehouseHeal(hp, hpMax, rate) {
  const max = Math.max(0, hpMax | 0);
  const r = typeof rate === "number" && rate >= 0 ? rate : 0.4;
  const amount = Math.floor(max * r);
  return Math.min(max, Math.max(0, hp) + amount);
}

function clearSafehouseChrome() {
  safehouseToken += 1;
  window.clearTimeout(zippoTimer);
  ui.deckModal.hidden = true;
  ui.safehouseChoices.hidden = true;
  ui.safehouseChoices.classList.remove("is-in");
  ui.safehouseLine.classList.remove("is-speaking");
  ui.safehouseVent.disabled = false;
  ui.safehouseSever.disabled = false;
  ui.safehouseVent.classList.remove("is-chosen");
  ui.safehouseSever.classList.remove("is-chosen");
}

function safehouseRow(id, index) {
  const card = Battle.card(id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "deck-row";
  button.dataset.index = String(index);
  button.dataset.id = id;
  if (card && isCurse(card)) button.classList.add("is-curse");
  const code = document.createElement("b");
  code.textContent = (card && (CODE_BY_ID[id] || CODE_BY_TYPE[card.type])) || "ORD";
  const name = document.createElement("span");
  name.textContent = card ? card.name : String(id);
  const mark = document.createElement("i");
  mark.textContent = card && isCurse(card) ? "呪装" : "切る";
  button.append(code, name, mark);
  return button;
}

function fillDeckModal() {
  ui.deckList.replaceChildren();
  run.deck.forEach((id, index) => {
    const item = document.createElement("li");
    item.append(safehouseRow(id, index));
    ui.deckList.append(item);
  });
}

function revealSafehouseChoices() {
  const box = ui.safehouseChoices;
  box.hidden = false;
  box.classList.remove("is-in");
  if (reducedMotion()) {
    box.classList.add("is-in");
    return;
  }
  void box.offsetWidth;
  box.classList.add("is-in");
}

function clickZippo(token) {
  cueSE("zippo_click");
  window.clearTimeout(zippoTimer);
  if (reducedMotion()) {
    cueSE("zippo_click");
    return;
  }
  zippoTimer = window.setTimeout(() => {
    if (token === safehouseToken && session.phase === "safehouse") cueSE("zippo_click");
  }, 320);
}

function openSafehouse() {
  // マルチプレイ段階(3) 単位3-5: MP のセーフハウスは全員分の処置を扱う専用フローへ
  if (mpSession.active && mpSession.isHost) { mpEnterSafehouse(); return; }
  if (!run) return;
  run.noise = 0; // v15.0: セーフハウス（鉛壁）に入ると持ち越しノイズは0になる
  const token = ++safehouseToken;
  safehouseChosen = false;
  safehouseLeft = false;
  session.busy = true;
  session.advance = false;
  ui.ambush.hidden = true;
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.deckModal.hidden = true;
  ui.deckList.replaceChildren();
  ui.safehouseChoices.hidden = true;
  ui.safehouseChoices.classList.remove("is-in");
  ui.safehouseVent.disabled = false;
  ui.safehouseSever.disabled = false;
  ui.safehouseVent.classList.remove("is-chosen");
  ui.safehouseSever.classList.remove("is-chosen");
  ui.safehouseLine.textContent = "";
  ui.safehouseLine.classList.remove("is-speaking");
  ui.link.textContent = "SAFEHOUSE";
  changeScene("SAFEHOUSE");
  slotIdleLabel();
  renderRelics();
  renderRunVitals(); // UX修正1: セーフハウス入場時も左パネルを実データへ揃える
  syncEndButton();
  clickZippo(token);
  const live = () => token === safehouseToken && session.phase === "safehouse";
  typeText(ui.safehouseLine, SAFEHOUSE_LINE, live, { gap: 28, caret: true, printer: true }).then((ok) => {
    if (!ok || token !== safehouseToken || session.phase !== "safehouse" || safehouseChosen) return;
    revealSafehouseChoices();
  });
}

function lockSafehouseChoices(picked) {
  ui.safehouseVent.disabled = true;
  ui.safehouseSever.disabled = true;
  if (picked) picked.classList.add("is-chosen");
}

function leaveSafehouse(note) {
  if (safehouseLeft || session.phase !== "safehouse") return;
  safehouseLeft = true;
  clearSafehouseChrome();
  cueSE("machine_insert");
  pushLog("SAFEHOUSE  経路へ復帰");
  changeScene("MAP");
  session.busy = false;
  ui.note.textContent = note || "鉛壁を離れた。";
  ui.ambush.hidden = true;
  slotIdleLabel();
  renderRelics();
  renderRoute();
  renderRunVitals(); // UX修正1: 排熱の回復などを左パネルへ即反映する
  saveGame(); // UX修正2: 排熱・切断の結果をその場で保存する（復元時の巻き戻し防止）
  syncEndButton();
}

function ventHeat() {
  // マルチプレイ段階(3) 単位3-5: MP では自分の素体への排熱として同期層へ渡す
  if (mpSession.active) {
    if (session.phase !== "safehouse") return;
    if (mpSession.isHost) {
      mpSafehouseApplyChoice(Net.uid(), "vent");
      if (mpSession.safehouse) lockSafehouseChoices(ui.safehouseVent);
    } else if (!mpSession.guestLock) {
      mpSession.guestLock = true;
      lockSafehouseChoices(null);
      void mpGuestSendIntent("safehouse-choice", { choice: "vent" });
    }
    return;
  }
  if (safehouseChosen || safehouseLeft || session.phase !== "safehouse" || !run) return;
  safehouseChosen = true;
  lockSafehouseChoices(ui.safehouseVent);
  const before = run.hp;
  run.hp = safehouseHeal(before, run.hpMax, Battle.depthProfileFor(run.depth || 1).healRate);
  const gained = run.hp - before;
  pushLog(gained > 0 ? `VENT  HP ${before} > ${run.hp}` : "VENT  HP FULL");
  leaveSafehouse(gained > 0
    ? `排熱した。耐久が ${gained} 戻った。`
    : "排熱した。耐久は既に満タンだ。");
}

function openSever() {
  // マルチプレイ段階(3) 単位3-5: MP の切断は自分のデッキ一覧から選ぶ
  if (mpSession.active) {
    if (session.phase !== "safehouse") return;
    if (mpSession.isHost) mpSafehouseOpenSeverDeck();
    else mpGuestOpenSeverDeck();
    return;
  }
  if (safehouseChosen || safehouseLeft || session.phase !== "safehouse" || !run) return;
  safehouseChosen = true;
  lockSafehouseChoices(ui.safehouseSever);
  if (run.deck.length === 0) {
    pushLog("SEVER  DECK EMPTY");
    leaveSafehouse("切る思考が残っていない。");
    return;
  }
  fillDeckModal();
  ui.deckModal.hidden = false;
}

function severCard(index) {
  // マルチプレイ段階(3) 単位3-5: MP の切断確定（ホスト＝即時適用／ゲスト＝intent）
  if (mpSession.active) {
    if (session.phase !== "safehouse") return;
    if (mpSession.isHost) {
      mpSafehouseApplyChoice(Net.uid(), "sever", index);
    } else if (!mpSession.guestLock) {
      mpSession.guestLock = true;
      void mpGuestSendIntent("safehouse-choice", { choice: "sever", index });
    }
    ui.deckModal.hidden = true;
    return;
  }
  if (safehouseLeft || session.phase !== "safehouse" || !run) return;
  if (!Number.isInteger(index) || index < 0 || index >= run.deck.length) return;
  const id = run.deck[index];
  const card = Battle.card(id);
  run.deck.splice(index, 1);
  ui.deckList.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  ui.deckModal.hidden = true;
  const name = card ? card.name : id;
  pushLog(`SEVER  -1  ${name}`);
  leaveSafehouse(`思考を切断した。${name} をデッキから消した。デッキは${run.deck.length}枚。`);
}

// UX修正3（2026-11-19）: 切断ピッカーの「戻る」。サービス未使用のまま閉じて、
// セーフハウスの選択肢（排熱／切断）へ戻れるようにする。
// MP では開いただけでは何も確定していない（ホスト＝選択未登録／ゲスト＝ロック未設定）
// ため、モーダルを閉じるだけでよい。ソロは openSever で立てた選択済み状態を解除する。
function closeSeverPicker() {
  if (!ui.deckModal || ui.deckModal.hidden) return;
  ui.deckModal.hidden = true;
  if (mpSession.active) return;
  if (session.phase !== "safehouse" || safehouseLeft || !run) return;
  safehouseChosen = false;
  ui.safehouseVent.disabled = false;
  ui.safehouseSever.disabled = false;
  ui.safehouseVent.classList.remove("is-chosen");
  ui.safehouseSever.classList.remove("is-chosen");
  revealSafehouseChoices();
}

function clearEventChrome() {
  eventToken += 1;
  fieldEvent = null;
  if (!ui.eventChoices) return;
  ui.eventChoices.hidden = true;
  ui.eventChoices.classList.remove("is-in");
  ui.eventChoices.replaceChildren();
  ui.eventAftermath.hidden = true;
  ui.eventResult.hidden = true;
  ui.eventResult.classList.remove("is-speaking");
  ui.eventReturn.hidden = true;
  ui.eventReturn.classList.remove("is-in");
}

function fillEventChoices(event) {
  ui.eventChoices.replaceChildren();
  event.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "safehouse__act";
    button.dataset.index = String(index);
    const title = document.createElement("b");
    title.textContent = choice.label;
    const flavor = document.createElement("span");
    flavor.textContent = choice.flavor;
    const effect = document.createElement("small");
    effect.textContent = choice.effect_text;
    button.append(title, flavor, effect);
    /* 第0陣 0-7 (R-15): レリックが絡む選択肢は、選ぶ前に結果が分かるよう事前判定を反映する。
       プール枯渇なら支払い自体が発生しないよう選択肢を無効化し、満杯なら入れ替えが
       必要である旨を効果文へ足す（入れ替え操作は pickEvent 側で挟む。U-2）。 */
    if (run && window.Events && Events.choiceHasRelic(choice)) {
      const deal = Events.relicDeal(run);
      if (deal.candidates <= 0) {
        button.disabled = true;
        effect.textContent = "渡せる部品がない。取引は成立しない。";
      } else if (deal.full && deal.removable <= 0) {
        button.disabled = true;
        effect.textContent = "接続枠に空きがなく、受け取れない。";
      } else if (deal.full) {
        effect.textContent = `${choice.effect_text} 接続枠は満杯のため、受け取るには入れ替えが必要。`;
      }
    }
    ui.eventChoices.append(button);
  });
}

function revealEventChoices() {
  const box = ui.eventChoices;
  box.hidden = false;
  box.classList.remove("is-in");
  if (reducedMotion()) {
    box.classList.add("is-in");
    return;
  }
  void box.offsetWidth;
  box.classList.add("is-in");
}

function openFieldEvent(encounter) {
  if (!run) return;
  const event = window.Events && Events.get(encounter && encounter.eventId);
  if (!event) {
    session.busy = false;
    ui.ambush.hidden = true;
    pushLog(`EVENT  ${(encounter && encounter.text) || ""}`);
    ui.note.textContent = "通信は信用しない。経路は開いた。";
    renderRoute();
    syncEndButton();
    return;
  }
  const token = ++eventToken;
  eventChosen = false;
  eventLeft = false;
  eventOutcome = null;
  fieldEvent = event;
  // マルチプレイ段階(3) 単位3-5: ゲスト表示用にイベントの提示内容を控える（選択はホストのみ）
  if (mpSession.active && mpSession.isHost) {
    mpSession.eventView = { title: event.title, text: event.text, chosenIndex: null, resultText: null };
  }
  session.busy = true;
  session.advance = false;
  ui.ambush.hidden = true;
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.eventTitle.textContent = event.title;
  ui.eventLine.textContent = "";
  ui.eventLine.classList.remove("is-speaking");
  ui.eventChoices.hidden = true;
  ui.eventChoices.classList.remove("is-in");
  ui.eventAftermath.hidden = true;
  ui.eventResult.hidden = true;
  ui.eventResult.textContent = "";
  ui.eventResult.classList.remove("is-speaking");
  ui.eventReturn.hidden = true;
  ui.eventReturn.classList.remove("is-in");
  ui.eventReturn.textContent = "経路へ戻る";
  fillEventChoices(event);
  ui.link.textContent = "CARRIER";
  changeScene("EVENT");
  slotIdleLabel();
  renderRelics();
  syncEndButton();
  const live = () => token === eventToken && session.phase === "event";
  typeText(ui.eventLine, event.text, live, { gap: 22, caret: true, printer: true }).then((ok) => {
    if (!ok || !live() || eventChosen) return;
    revealEventChoices();
  });
}

function pickEvent(index) {
  if (eventChosen || eventLeft || session.phase !== "event" || !run || !fieldEvent) return;
  if (!Number.isInteger(index) || index < 0 || index >= fieldEvent.choices.length) return;
  const choice = fieldEvent.choices[index];
  /* 第0陣 0-7 (U-2): レリック受け取りで枠が満杯なら、支払いの前に受け取る1つを引き、
     入れ替え先を選ぶ画面を挟む。プール枯渇時は fillEventChoices で選択肢が無効化済み。 */
  if (window.Events && Events.choiceHasRelic(choice)) {
    const deal = Events.relicDeal(run);
    if (deal.candidates > 0 && deal.full && deal.removable > 0) {
      const drawn = Relics.draw("normal", {
        owned: run.relics, lost: run.relicsLost, character: run.character, rng: Math.random,
      });
      if (drawn) { openJunkExchange(choice, index, drawn); return; }
    }
  }
  applyEventChoice(choice, index, null);
}

/* 第0陣 0-7 (U-2): ジャンク屋の入れ替え選択。外す候補（初期OSは canRemove で除外）と
   「取引をやめる」をイベント選択肢エリアへ出す。選んだ場合は支払い込みで選択肢を適用し、
   受け取りだけ opts.relicExchange 経由で入れ替えにする。やめた場合は選択肢表示へ戻る。 */
function openJunkExchange(choice, index, drawn) {
  const box = ui.eventChoices;
  box.replaceChildren();
  box.hidden = false;
  box.classList.add("is-in");
  const note = document.createElement("p");
  note.className = "event-swap-note";
  note.textContent = `接続枠が満杯だ。${drawn.name} を受け取るには、接続中の部品を1つ外して入れ替える必要がある。外した部品は、このランでは失われる。`;
  box.append(note);
  for (const relic of Relics.resolve(run.relics)) {
    if (!Relics.canRemove(run.relics, relic.id)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "safehouse__act";
    const title = document.createElement("b");
    title.textContent = `${relic.name} を外す`;
    const detail = Relics.detail(relic.id);
    const effect = document.createElement("small");
    effect.textContent = detail ? detail.effectsText : "";
    button.append(title, effect);
    button.addEventListener("click", () => {
      if (eventChosen || session.phase !== "event" || !fieldEvent) return;
      applyEventChoice(choice, index, { relicExchange: { outId: relic.id, relicId: drawn.id } });
    });
    box.append(button);
  }
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "safehouse__act";
  const cancelTitle = document.createElement("b");
  cancelTitle.textContent = "取引をやめる";
  cancel.append(cancelTitle);
  cancel.addEventListener("click", () => {
    if (eventChosen || session.phase !== "event" || !fieldEvent) return;
    fillEventChoices(fieldEvent);
    revealEventChoices();
  });
  box.append(cancel);
}

function applyEventChoice(choice, index, applyOpts) {
  eventChosen = true;
  // マルチプレイ段階(3) 単位3-5: ホストの選択と結果文をゲスト表示用へ控えて配る
  if (mpSession.active && mpSession.isHost && mpSession.eventView) {
    mpSession.eventView.chosenIndex = index;
    mpSession.eventView.resultText = choice.result_text;
    mpPublish();
  }
  ui.eventChoices.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    if (Number(button.dataset.index) === index) button.classList.add("is-chosen");
  });
  eventOutcome = Events.apply(run, choice, Math.random, applyOpts || undefined);
  for (const id of eventOutcome.grantedRelics) {
    Relics.eachEffect([id], "on_map_generation", (relic, effect) => {
      if (effect.type !== "add_scan_uses" || !route) return;
      PipelineMap.grantScans(route, effect.value);
      pushLog(`PART ${relic.name}  SCAN +${effect.value}`);
    });
  }
  for (const line of eventOutcome.logs) pushLog(line);
  renderRunVitals(); // UX修正1: イベントで変わった HP 等を左パネルへ即反映する
  // UX修正2: イベント結果（HP・デッキ・レリックの変化）をその場で保存する。
  // 戦死時は closeEvent → fieldDown がセーブを消去するため、ここでは保存しない。
  // MP 中は saveGame 側のガードで無効化される。
  if (!eventOutcome.dead) saveGame();
  ui.eventChoices.hidden = true;
  ui.eventAftermath.hidden = false;
  ui.eventResult.hidden = false;
  ui.eventResult.textContent = "";
  const token = eventToken;
  const live = () => token === eventToken && session.phase === "event";
  typeText(ui.eventResult, choice.result_text, live, { gap: 22, caret: true, printer: true }).then(async (ok) => {
    if (!ok || !live()) return;
    // v14.3: イベントで廃棄カードを初めて入手した場合も、結果表示の後にGray通信を1回だけ挟む
    if (eventOutcome && takeExhaustIntro(eventOutcome.addedCards)) {
      await presentRadio(GRAY_EXHAUST_LINES, { phase: "event" });
      if (!live()) return;
    }
    ui.eventReturn.hidden = false;
    ui.eventReturn.textContent = eventOutcome && eventOutcome.dead ? "通信途絶" : "経路へ戻る";
    ui.eventReturn.classList.add("is-in");
  });
}

function fieldDown() {
  clearSave(); // PROMPT-24: イベントでの戦死もゲームオーバーとしてセーブ消去
  session.dead = true;
  session.busy = false;
  session.offer = [];
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.ambush.hidden = true;
  ui.note.textContent = "通信途絶。素体は失われた。";
  ui.link.textContent = "NO CARRIER";
  pushLog("通信途絶");
  session.linked = false;
  changeScene("GAMEOVER");
  slotIdleLabel();
  renderRelics();
  syncEndButton();
  // 実機要望 2026-11-15: ゲームオーバー画面でボタン待ちにせず、数秒見せてから自動でタイトルへ戻る
  // （先にボタンが押される等でフェイズが変わっていたら何もしない）
  window.setTimeout(() => { if (session.phase === "gameover") showTitle(); }, 3500);
}

function closeEvent() {
  if (eventLeft || session.phase !== "event" || !eventChosen || ui.eventReturn.hidden) return;
  eventLeft = true;
  const outcome = eventOutcome;
  const dead = !!(outcome && outcome.dead);
  clearEventChrome();
  // マルチプレイ段階(3) 単位3-5: イベント結果はホストの run（＝ホスト素体＋共有レリック）へ
  // 適用済みなので、ホストのラン記録へ書き戻す。戦死はホスト素体のダウンとして扱い、
  // 全員が倒れている場合だけランの敗北にする（fieldDown の全画面遷移は使わない）
  if (mpSession.active && mpSession.isHost) {
    mpWriteBackFromRun();
    mpSession.eventView = null;
    if (dead) {
      pushLog("通信途絶 — ホストの素体は失われた");
      // 全員の素体が倒れている場合だけランの敗北として確定させる
      if (mpSession.records.every((r) => !r.alive || r.hp <= 0)) { void mpRunDefeat(); return; }
    }
    pushLog("EVENT  経路へ復帰");
    changeScene("MAP");
    session.busy = false;
    ui.ambush.hidden = true;
    ui.note.textContent = dead ? "通信途絶。素体は失われた。" : ((outcome && outcome.note) || "通信は切れた。");
    slotIdleLabel();
    renderRelics();
    renderRoute();
    syncEndButton();
    mpPublish();
    return;
  }
  if (dead) {
    fieldDown();
    return;
  }
  pushLog("EVENT  経路へ復帰");
  changeScene("MAP");
  session.busy = false;
  ui.ambush.hidden = true;
  ui.note.textContent = (outcome && outcome.note) || "通信は切れた。";
  slotIdleLabel();
  renderRelics();
  renderRoute();
  renderRunVitals(); // UX修正1: マップ復帰時に左パネルを実データへ揃える
  syncEndButton();
}

async function chooseNode(id) {
  // マルチプレイ段階(3): ノード選択はホストが決定する（ゲストのマップは閲覧のみ）
  if (mpSession.active && !mpSession.isHost) return;
  if (session.phase !== "map" || session.busy || !route) return;
  if (radioOpen) return;
  if (tutorialStep === "map" && tutMapNodeId) {
    if (id !== tutMapNodeId) return;
    tutMapNodeId = null;
    clearTutorialFocus();
  }
  const token = ++routeToken;
  const result = PipelineMap.move(route, id);
  if (!result.ok) return;
  // v15.0: ノード移動ごとに持ち越しノイズが -1 冷める。セーフハウス行きは入室で 0 になる
  if (run && (run.noise || 0) > 0) {
    const before = run.noise;
    run.noise = Math.max(0, run.noise - 1);
    if (result.encounter && result.encounter.kind === "rest") run.noise = 0;
    if (run.noise < before) pushLog(`NOISE COOLED  ${before} > ${run.noise}`);
  }
  // マルチプレイ段階(3) 単位3-5: ノイズの冷まし（移動で -1／休憩区画で 0）は全員の
  // ラン記録へも同じ規則で鏡写しする（run.noise はホスト分の表示・保存用）
  if (mpSession.active && mpSession.isHost) {
    for (const rec of mpSession.records) {
      rec.noise = Math.max(0, (rec.noise || 0) - 1);
      if (result.encounter && result.encounter.kind === "rest") rec.noise = 0;
    }
  }
  saveGame(result.encounter); // PROMPT-24: ノード選択時に保存（復元時はこの区画の開始から）
  session.busy = true;
  renderRoute();
  if (result.ambush) {
    ui.ambushDetail.textContent = `真の区画  ${PipelineMap.label(result.encounter.type)}`;
    ui.ambush.hidden = false;
    pushLog(`WARNING: AMBUSH  ${PipelineMap.label(result.node.displayType)} > ${PipelineMap.label(result.encounter.type)}`);
    await delay(reducedMotion() ? 240 : 780);
    if (token !== routeToken || session.phase !== "map") return;
  }
  if (result.encounter.kind === "combat") beginCombat(result.encounter);
  else if (result.encounter.kind === "rest") openSafehouse();
  else beginField(result.encounter);
}

function onScan() {
  // マルチプレイ段階(3): スキャンもホスト側の操作（ゲストは閲覧のみ）
  if (mpSession.active && !mpSession.isHost) return;
  if (session.phase !== "map" || session.busy || !route) return;
  const result = PipelineMap.scan(route);
  if (!result.ok) {
    pushLog(result.reason === "empty" ? "SCAN  残数なし" : "SCAN  対象なし");
    renderRoute();
    return;
  }
  if (result.revealed.length === 0) pushLog(`SCAN  次の区画に偽装なし  残 ${result.scansLeft}`);
  else {
    for (const node of result.revealed) {
      pushLog(`SCAN  偽装  ${PipelineMap.label(node.displayType)} > ${PipelineMap.label(node.hiddenType)}`);
    }
    pushLog(`SCAN  残 ${result.scansLeft}`);
  }
  renderRoute();
}

// ============================================================
// 第0陣 0-5: レリックドロップ基盤（FINAL §1.2／§1.6／§3 0-5）
// ------------------------------------------------------------
// 二段構え提示の基盤。第一段＝SALVAGE カード3択（従来）、第二段＝レリック3択（本節）。
// カード報酬の完了後に pendingRelicDrop が立っていれば提示を挟み、pendingMapAdvance
// （第1・2層ボスの次マップ遷移）の発火はレリック選択の完了後へ後ろ倒しする。
// 判定（relicDropForNode）と提示（presentRelicOffer）は本節で実装する。
// openReward から pendingRelicDrop を立てる実配線と候補レリックの組み込みは第1陣で完了した。
// 検証と外部からの接続は window.RelicDropStage 経由。
let pendingRelicDrop = null; // { pool: "normal" | "boss" } | null
let relicOfferState = null; // 提示中の { pool, candidates, selected, resolve }

// §1.6 チュートリアルガード込みのドロップ判定。
// ELITE → 通常プール／BOSS → ボスプール。ただし第3層ボスは提示せず null
// （クリア画面の実績表示へ回す。§1.2）。opts.tutorial は検証用の強制指定で、
// 実呼び出しでは内部のチュートリアル状態を見る。
function relicDropForNode(node, runState, opts) {
  if (!node || !runState) return null;
  const inTutorial = opts && typeof opts.tutorial === "boolean"
    ? opts.tutorial
    : (tutorialBattle || tutorialStep !== "off");
  if (inTutorial) return null;
  if (node.hiddenType === "ELITE") return "normal";
  if (node.hiddenType === "BOSS") return (runState.mapIndex || 1) >= 3 ? null : "boss";
  return null;
}

// 提示候補をプールから重複なく最大 count 件引く（ウェイト付き抽選。
// 所持・喪失・キャラ別除外は Relics.draw → candidates() の規則に従う）
function drawRelicOfferCandidates(poolName, count) {
  const picked = [];
  const baseOwned = (run && run.relics) || [];
  for (let i = 0; i < count; i += 1) {
    const relic = Relics.draw(poolName, {
      owned: [...baseOwned, ...picked.map((r) => r.id)],
      lost: (run && run.relicsLost) || [],
      character: run && run.character,
      rng: Math.random,
      // 作戦深度の報酬の質（§5.6）: rareBoost を渡すのは戦闘報酬のこの提示経路だけ
      // （イベント・ジャンク屋の抽選には渡さない。精査・軽微8）
      rareBoost: Battle.depthProfileFor(run && run.depth ? run.depth : 1).rewardFactor,
    });
    if (!relic) break;
    picked.push(relic);
  }
  return picked;
}

// 第二段（レリック3択）の提示。候補が0件なら画面を出さず null で解決する。
// 戻り値は付与したレリックID（入れ替え含む）または null（見送り／候補なし）。
function presentRelicOffer(poolName) {
  return new Promise((resolve) => {
    if (!run || !ui.relicOffers || relicOfferState) { resolve(null); return; }
    const candidates = drawRelicOfferCandidates(poolName, 3);
    if (!candidates.length) { resolve(null); return; }
    relicOfferState = { pool: poolName, candidates, selected: null, resolve };
    renderRelicOfferCandidates();
  });
}

function renderRelicOfferCandidates() {
  const st = relicOfferState;
  if (!st || !ui.relicOffers) return;
  // 第一段（カード提示）を畳み、同じ報酬画面のまま提示エリアを第二段へ差し替える（§1.2）
  if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
  if (ui.rewardSecured) ui.rewardSecured.hidden = true;
  if (ui.rewardSkip) ui.rewardSkip.hidden = true;
  ui.relicOffers.hidden = false;
  if (ui.relicOffersSwap) { ui.relicOffersSwap.hidden = true; ui.relicOffersSwap.replaceChildren(); }
  ui.note.textContent = "残骸から回収した部品だ。接続するものを1つ選べ。";
  pushLog("RELIC SALVAGE  1つを回収せよ");
  ui.relicOffersList.replaceChildren();
  for (const relic of st.candidates) {
    const info = Relics.detail(relic.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "relic-offer";
    button.dataset.relicId = relic.id;
    const name = document.createElement("b");
    name.textContent = relic.name;
    const body = document.createElement("span");
    body.textContent = info ? info.description : "";
    const effect = document.createElement("small");
    effect.textContent = info ? info.effectsText : "";
    button.append(name, body, effect);
    if (info && info.flavor) {
      const flavor = document.createElement("small");
      flavor.className = "relic-offer__flavor";
      flavor.textContent = info.flavor;
      button.append(flavor);
    }
    button.addEventListener("click", () => pickRelicCandidate(relic.id));
    ui.relicOffersList.append(button);
  }
  renderRelics();
}

function pickRelicCandidate(id) {
  const st = relicOfferState;
  if (!st || !run) return;
  const relic = st.candidates.find((r) => r.id === id);
  if (!relic) return;
  if (Relics.hasRoom(run.relics)) {
    if (!Relics.grant(run.relics, id)) return;
    pushLog(`RELIC +1  ${relic.name} を接続した`);
    saveGame();
    closeRelicOffer(id);
    return;
  }
  // 満杯時は入れ替え先の選択へ（初期OSは canRemove により候補へ出ない。§1.3／R-3）
  st.selected = id;
  renderRelicOfferSwap();
}

function renderRelicOfferSwap() {
  const st = relicOfferState;
  if (!st || !ui.relicOffersSwap) return;
  const target = st.candidates.find((r) => r.id === st.selected);
  ui.relicOffersSwap.replaceChildren();
  ui.relicOffersSwap.hidden = false;
  const note = document.createElement("p");
  note.className = "event-swap-note";
  note.textContent = `接続枠が満杯だ。${target ? target.name : ""} を接続するには、1つ外して入れ替える必要がある。外した部品は、このランでは失われる。`;
  ui.relicOffersSwap.append(note);
  for (const ownedRelic of Relics.resolve(run.relics)) {
    if (!Relics.canRemove(run.relics, ownedRelic.id)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "safehouse__act";
    button.dataset.relicId = ownedRelic.id;
    const title = document.createElement("b");
    title.textContent = `${ownedRelic.name} を外す`;
    const detail = Relics.detail(ownedRelic.id);
    const effect = document.createElement("small");
    effect.textContent = detail ? detail.effectsText : "";
    button.append(title, effect);
    button.addEventListener("click", () => {
      if (!relicOfferState || relicOfferState !== st) return;
      if (!Relics.exchange(run.relics, run.relicsLost, ownedRelic.id, st.selected)) return;
      pushLog(`RELIC -1  ${ownedRelic.name} を切り離した`);
      pushLog(`RELIC +1  ${target ? target.name : st.selected} を接続した`);
      saveGame();
      closeRelicOffer(st.selected);
    });
    ui.relicOffersSwap.append(button);
  }
  const back = document.createElement("button");
  back.type = "button";
  back.className = "safehouse__act";
  const backTitle = document.createElement("b");
  backTitle.textContent = "候補へ戻る";
  back.append(backTitle);
  back.addEventListener("click", () => {
    if (!relicOfferState) return;
    relicOfferState.selected = null;
    if (ui.relicOffersSwap) { ui.relicOffersSwap.hidden = true; ui.relicOffersSwap.replaceChildren(); }
  });
  ui.relicOffersSwap.append(back);
}

function closeRelicOffer(grantedId) {
  const st = relicOfferState;
  relicOfferState = null;
  if (ui.relicOffers) ui.relicOffers.hidden = true;
  if (ui.relicOffersList) ui.relicOffersList.replaceChildren();
  if (ui.relicOffersSwap) { ui.relicOffersSwap.hidden = true; ui.relicOffersSwap.replaceChildren(); }
  if (ui.rewardSkip) ui.rewardSkip.hidden = false;
  renderRelics();
  if (st && st.resolve) st.resolve(grantedId || null);
}

// カード報酬（第一段）の完了点。レリック提示（第二段）が積まれていれば先に挟み、
// その完了後に pendingMapAdvance の遷移／通常の戦闘終了へ進む（発火点の後ろ倒し）。
async function completeRewardFlow() {
  if (session.phase !== "reward") return;
  if (pendingRelicDrop) {
    const drop = pendingRelicDrop;
    pendingRelicDrop = null;
    await presentRelicOffer(drop.pool);
    if (session.phase !== "reward") return;
  }
  if (pendingMapAdvance) { await advanceToNextMap(); return; }
  finishCombat();
}

// クリア画面の実績表示（§1.2）：そのランで回収したボスレリック名。
// 第1陣でボスプールに RB-3 が入ったため、回収していれば実績行が出る（無ければ行自体を出さない）。
function collectedBossRelicNames(runState) {
  const ids = (runState && runState.relics) || [];
  return Relics.resolve(ids).filter((relic) => relic.pool === "boss").map((relic) => relic.name);
}

window.RelicDropStage = {
  judge: relicDropForNode,
  present: presentRelicOffer,
  setPending(pool) { pendingRelicDrop = pool ? { pool } : null; },
  getPending() { return pendingRelicDrop; },
  completeFlow: completeRewardFlow,
  bossRelicNames: collectedBossRelicNames,
};

async function openReward() {
  if (session.phase !== "combat" || !battle || battle.player.hp <= 0 || !battle.enemy.dead) return;
  setBossAlert(false); // v15.3: 敵を撃破したら心拍層は即座に止める（ボス撃破含む）
  // v15.3: 撃破数カウント（クリア画面のX投稿サマリ用）。openReward は勝利確定後の単一入口
  // （チュートリアル完了戦闘も victoryRadio 経由でここに合流する）で、戦闘ごとに1回だけ数える
  if (run && !battle.killCounted) { battle.killCounted = true; run.kills = (run.kills || 0) + 1; }
  // 第2陣 2A (N-4): 戦闘勝利時レリック（on_combat_victory）。回復は戦闘側 HP へ入れ、
  // この後の各分岐にある既存の同期（run.hp = battle.player.hp）へ乗せる。第3層ボスでも
  // 発火するがラン終了のため実効はない（FINAL §2.1 の仕様どおり特別扱いしない）。
  // 二重発火防止に killCounted と同じ流儀の1回フラグを使う。
  if (run && battle && !battle.victoryRelicsApplied) {
    battle.victoryRelicsApplied = true;
    for (const line of Relics.applyVictory(battle)) pushLog(line);
  }
  const here = route && route.nodes ? route.nodes[route.currentId] : null;
  const isBoss = !!(here && here.hiddenType === "BOSS");
  // JOB 3M-2 (C-5): ボス分岐を分離する。第3層（最終層）のボス撃破だけが従来どおり
  // bossClearSequence（ランクリア）へ。第1・2層はマップクリアとして通常の SALVAGE 報酬を
  // 挟み、報酬完了後に advanceToNextMap() へ遷移する（pendingMapAdvance で claim/skip に伝える）。
  // 解禁処理・clearSave・計測は第1・2層では発火させない（bossClearSequence 側にのみ残る）。
  pendingMapAdvance = false;
  if (isBoss && run && (run.mapIndex || 1) >= 3) {
    await bossClearSequence();
    return;
  }
  if (isBoss) pendingMapAdvance = true;
  // 第1陣: レリックドロップの実配線（FINAL §1.1／§1.2）。ELITE→通常プール3択／第1・2層ボス→
  // ボスプール3択を pendingRelicDrop へ積み、completeRewardFlow がカード報酬の完了後に
  // 第二段として提示する。第3層ボスは上の分岐で bossClearSequence へ直行済みで、ここには
  // 来ない（判定 relicDropForNode も null を返す）。チュートリアル中は判定側のガード（§1.6）で
  // null になる。Rewards が無い経路（下の分岐）では提示画面へ進まないため、ここでは積まない。
  pendingRelicDrop = null;
  if (window.Rewards) {
    const dropPool = relicDropForNode(here, run);
    if (dropPool) pendingRelicDrop = { pool: dropPool };
  }
  if (!window.Rewards) {
    if (pendingMapAdvance) { pendingMapAdvance = false; await advanceToNextMap(); }
    else finishCombat();
    return;
  }
  // 戦闘中セーブ: 勝利が確定した時点で戦闘スナップショットを無効化する。
  // 報酬画面の間に終了しても CONTINUE が終わった戦闘へ戻らないよう、ここで
  // pending なし・battleSnap なしの通常セーブへ書き換える（claimReward／finishCombat
  // の保存と同形。復元先は現在のノードのマップになる）。
  if (!mpSession.active) { run.hp = battle.player.hp; saveGame(); }
  session.busy = true;
  if (ui.cctvEnemy && ui.cctvScene && !ui.cctvScene.hidden) ui.cctvEnemy.classList.add("is-glitching");
  if (ui.silenced) ui.silenced.hidden = false;
  if (audio) audio.playSE("glitch");
  await delay(1500);
  if (ui.cctvEnemy) ui.cctvEnemy.classList.remove("is-glitching");
  if (ui.silenced) ui.silenced.hidden = true;
  if (session.phase !== "combat" || !battle || battle.player.hp <= 0) {
    session.busy = false;
    return;
  }
  run.hp = battle.player.hp;
  // 正式版: 専用プールのあるキャラのランでは共通プール＋専用プールから提示する。
  // 作戦深度の報酬の質（§5.6）: 第4引数に rewardFactor を渡す（深度1＝×1.0 で従来一致）。
  // 適用は戦闘報酬のみ（イベントの add_card は Rewards.offer を経由しないため対象外）。
  session.offer = Rewards.offer(Rewards.OFFER_COUNT, undefined, run && run.character,
    Battle.depthProfileFor(run && run.depth ? run.depth : 1).rewardFactor);
  ui.piles.hidden = true;
  ui.hopper.replaceChildren();
  ui.shotCall.hidden = true;
  ui.contact.textContent = "残骸回収";
  ui.intent.dataset.action = "";
  imprint(ui.intent, "SALVAGE");
  ui.note.textContent = "抽出された3枚から1枚を選べ。ダブルクリック、またはリーダへドラッグでデッキに加わる。";
  pushLog("SALVAGE  1枚を回収せよ");
  ui.link.textContent = "SALVAGE";
  changeScene("REWARD");
  slotIdleLabel();
  renderRewardOffers();
  renderRelics();
  session.busy = false;
  syncEndButton();
}

// ============================================================
// JOB 3M-3 (C-7): ランクリア確定フック onRunClear(context)
// ------------------------------------------------------------
// bossClearSequence() は第3層ボス撃破時（＝ランクリア）専用として確定した
// （第1・2層は openReward の分岐で advanceToNextMap 側へ流れ、ここには来ない）。
// 解禁連鎖・clearSave・GoatCounter 計測（syncClearScreen 経由の /event/ep-clear）・
// X投稿URL生成はすべてランクリア側にのみ残り、このフックもランクリア時に1回だけ発火する。
//
// 将来の深度別エンディング（STORY-ENDINGS-DRAFT: 深度ごとの断片／真エンド3択 等）は、
// 深度実装とセットでこのフックへ接続する前提である。エンディング側は context を受け取り、
// 既定のクリア画面表示を断片表示等へ差し替える形で組み込むこと。
// 差し替え・検証は window.onRunClear をラップ／差し替えることで行える
// （bossClearSequence は window.onRunClear 経由で呼ぶ）。
// context は将来のエンディング分岐が要る最小限:
//   { characterId, hp, hpMax, kills, mapIndex, layersCleared, depth }
//   ※ depth は層とは別軸の作戦深度。bossClearSequence が run.depth の実値を渡す
//   （DESIGN-DEPTH-SYSTEM-FINAL §6.1。深度記録がない旧経路では null）。
async function onRunClear(context) {
  // 実装A 前提作業②: フックを Promise 化。深度クリア演出（js/depth-clear.js）が
  // 完了するまで解決せず、その間フェード解除と busy 解除は bossClearSequence 側で保持される。
  // context.depth が null（深度未実装・強制指定なし）の場合は演出を出さず従来動作のみ。
  if (window.DepthClear && typeof window.DepthClear.playForContext === "function") {
    await window.DepthClear.playForContext(context);
  }
  updateClearStats(context);
  changeScene("CLEAR");
}
window.onRunClear = onRunClear;
window.lastRunClearContext = null;

async function bossClearSequence() {
  session.busy = true;
  if (ui.cctvEnemy && ui.cctvScene && !ui.cctvScene.hidden) ui.cctvEnemy.classList.add("is-glitching");
  if (ui.breached) ui.breached.hidden = false;
  if (audio) audio.playSE("glitch");
  await delay(1600);
  if (ui.cctvEnemy) ui.cctvEnemy.classList.remove("is-glitching");
  if (ui.breached) ui.breached.hidden = true;
  if (session.phase !== "combat") {
    session.busy = false;
    return;
  }
  // 実装A 前提作業①: GRAY_CLEAR の presentRadio 呼び出しは撤去（深度別 Gray ページへ移管）。
  // 直後の戦闘継続チェックは呼び出しとは独立に残す（現行の安全弁）。
  if (session.phase !== "combat" || !battle) {
    session.busy = false;
    return;
  }
  if (ui.fadeMask) {
    ui.fadeMask.hidden = false;
    void ui.fadeMask.offsetWidth;
    ui.fadeMask.classList.add("is-on");
  }
  await delay(950);
  run.hp = battle.player.hp;
  // 解禁キャラ1（2026-11-16 本人承認）: 07 を使ってランをクリアした時点で VESSEL 04 を解禁する
  if (run && run.character === "vessel07" && !goliathUnlocked()) {
    markGoliathUnlocked();
    pushLog("NEW VESSEL SIGNAL — VESSEL 04 \"GOLIATH\" 解禁");
  }
  // 解禁キャラ2（2026-11-16 決定）: GOLIATH を使ってランをクリアした時点で VESSEL 09 を解禁する
  if (run && run.character === "vessel04" && !ghostTapeUnlocked()) {
    markGhostTapeUnlocked();
    pushLog("NEW VESSEL SIGNAL — VESSEL 09 \"GHOST-TAPE\" 解禁");
  }
  // 解禁キャラ3（2026-11-16 確定）: GHOST-TAPE を使ってランをクリアした時点で VESSEL 13 を解禁する
  if (run && run.character === "vessel09" && !weaverUnlocked()) {
    markWeaverUnlocked();
    pushLog("NEW VESSEL SIGNAL — VESSEL 13 \"WEAVER\" 解禁");
  }
  // 解禁キャラ4・最終機体（2026-11-17 本人決定）: WEAVER を使ってランをクリアした時点で VESSEL 00 を解禁する
  if (run && run.character === "vessel13" && !reactorUnlocked()) {
    markReactorUnlocked();
    pushLog("NEW VESSEL SIGNAL — VESSEL 00 \"REACTOR\" 解禁");
  }
  // 作戦深度の解禁確定（§6.1）: キャラ解禁ブロックの直後・clearSave の前に置く
  // （演出中にアプリが落ちても解禁が失われない。DEPTH-CLEAR-FINAL §2.2 前提作業③と一致）
  if (run && run.depth) markDepthCleared(run.depth, run.character);
  session.offer = [];
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  activeCombatEncounter = null; // 戦闘中セーブ: ラン完走で戦闘文脈を解除する
  clearSave(); // PROMPT-24: ラン完走時はセーブを破棄する
  // JOB 3M-3: ランクリア確定点。CLEAR 遷移の直前に単一フック onRunClear を1回だけ呼ぶ。
  // context は run.hp 同期と解禁処理の完了後に確定した値で組み立てる。
  const runClearContext = {
    characterId: run ? run.character : "vessel07",
    hp: run ? Math.max(0, Math.floor(run.hp || 0)) : 0,
    hpMax: run ? (run.hpMax || 0) : 0,
    kills: run && run.kills ? run.kills : 0,
    mapIndex: run ? (run.mapIndex || 3) : 3,
    layersCleared: run ? (run.mapIndex || 3) : 3,
    bossRelics: collectedBossRelicNames(run), // 第0陣 0-5: 実績表示用（回収ボスレリック名）
    depth: run ? (run.depth || null) : null, // 作戦深度（§6.1）: run.depth の実値を供給し、深度クリア演出を実値で動かす
  };
  window.lastRunClearContext = runClearContext;
  const runClearHook = (typeof window.onRunClear === "function") ? window.onRunClear : onRunClear;
  // 実装A 前提作業②: フックの完了を await する。フェード解除と busy 解除はこの後にのみ走る。
  await runClearHook(runClearContext);
  if (ui.fadeMask) {
    ui.fadeMask.classList.remove("is-on");
    window.setTimeout(() => { ui.fadeMask.hidden = true; }, 950);
  }
  session.busy = false;
  syncEndButton();
}

// JOB 3M-2 (C-6): マップクリア遷移シーケンス。第1・2層ボスの SALVAGE 報酬完了後に呼ばれる。
// 引き継ぎ仕様（計画 §3／§8 確定）: HP・デッキ・レリック・撃破数は run のまま引き継ぐ。
// NOISE は持ち越す（遷移では -1 しない。冷ましはセーフハウスの役割）。過去マップの route は破棄し、
// 次マップを幅 [3,4,4,3,2,1]・層パラメータ付きで新規生成する。スキャンと on_map_generation 系
// レリックはマップごとに再付与する（enterMap の applyRelics 経由）。
async function advanceToNextMap() {
  if (!run || (run.mapIndex || 1) >= 3) return;
  pendingMapAdvance = false;
  activeCombatEncounter = null; // 戦闘中セーブ: 層ボス戦はここで戦闘終了（finishCombat を通らない経路）
  session.busy = true;
  session.offer = [];
  // HP 同期（ボス戦の残 HP を run へ。報酬経路でも同期済みだが遷移の入口で担保する）
  if (battle && battle.player) run.hp = battle.player.hp;
  // JOB 3M-2 (C-9): ボス曲を引きずらず MAP 曲へ戻すため、遷移時に明示的に解除する
  bossBgm = false;
  const clearedLayer = run.mapIndex || 1;
  const fromPhase = session.phase === "reward" ? "reward" : "combat";
  // Gray 通信（仮文言・3M-Tで差し替え）: GRAY_MAP_CLEAR_L1 / L2 は仮置き文言
  const line = clearedLayer === 1 ? GRAY_MAP_CLEAR_L1 : GRAY_MAP_CLEAR_L2;
  await presentRadio([line], { phase: fromPhase });
  if (!run) { session.busy = false; return; }
  // フェード（bossClearSequence と同じ fadeMask の流用）
  if (ui.fadeMask) {
    ui.fadeMask.hidden = false;
    void ui.fadeMask.offsetWidth;
    ui.fadeMask.classList.add("is-on");
  }
  await delay(950);
  run.mapIndex = Math.min(3, clearedLayer + 1);
  // 作戦深度の開始NOISEフロア（§5.4 軽微6）: マップ開始時は開始NOISEまで引き上げる
  // （持ち越しがそれ以上なら下げない）。mapIndex 更新と同時・新マップ生成／enterMap／
  // 末尾の saveGame のいずれよりも前に行う（遷移直後の表示とセーブへ反映させるため）
  run.noise = Math.max(run.noise || 0, Battle.depthProfileFor(run.depth || 1).startNoise);
  markLayerArrived(run.mapIndex); // E-8: 遷移先の層への到達を記録（この層のボス解決に含める）
  route = PipelineMap.generate(undefined, { mapIndex: run.mapIndex, widths: MAP_WIDTHS_3M });
  routeToken += 1;
  enterMap({
    applyRelics: true,
    extraLogs: ["経路図を展開。次のノードを選べ"],
    note: () => `光っているノードが次の区画。アナログスキャンは${route.scansLeft}回。`,
  });
  if (ui.fadeMask) {
    ui.fadeMask.classList.remove("is-on");
    window.setTimeout(() => { ui.fadeMask.hidden = true; }, 950);
  }
  session.busy = false;
  syncEndButton();
  saveGame(); // 遷移後の現在マップを保存する（復元は現在のマップのみが対象）
}

function renderRewardOffers() {
  if (!ui.rewardOffers) return;
  ui.rewardOffers.replaceChildren();
  if (ui.rewardSecured) ui.rewardSecured.hidden = true;
  (session.offer || []).forEach((card, index) => {
    const el = makeCard(face(card));
    el.classList.remove("is-new");
    el.style.animationDelay = `${index * 80}ms`;
    ui.rewardOffers.append(el);
  });
}

function claimReward(id) {
  // マルチプレイ段階(3) 単位3-5: MP の報酬選択は同期層側で処理する
  // （ホスト＝自分の記録へ即時適用／ゲスト＝reward-pick intent。ソロ経路とは分離）
  if (mpSession.active) {
    if (session.phase !== "reward") return;
    if (mpSession.isHost) mpHostRewardPick(id);
    else mpGuestRewardPick(id);
    return;
  }
  if (session.phase !== "reward" || !run) return;
  const card = (session.offer || []).find((item) => item.id === id);
  if (!card || !Rewards.grant(run.deck, card.id)) return;
  pushLog(`DECK +1  ${card.name}`);
  saveGame(); // PROMPT-24: リワード獲得時に保存
  if (audio) audio.playSE("machine_insert");
  // v14.3: 廃棄カードの初入手なら、回収演出の後にGray通信を1回だけ挟む（閉じれば通常どおり経路へ進む）
  const firstExhaust = takeExhaustIntro([card.id]);
  session.offer = [];
  if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
  if (ui.rewardSecured) ui.rewardSecured.hidden = false;
  window.setTimeout(async () => {
    if (session.phase !== "reward") return;
    if (ui.rewardSecured) ui.rewardSecured.hidden = true;
    if (firstExhaust) {
      await presentRadio(GRAY_EXHAUST_LINES, { phase: "reward" });
      if (session.phase !== "reward") return;
    }
    // JOB 3M-2 (C-5/C-6)＋第0陣 0-5: 報酬完了後の分岐は completeRewardFlow へ集約する。
    // レリック提示（第二段）が積まれている場合はその完了後に次マップ遷移／戦闘終了へ進む。
    await completeRewardFlow();
  }, 950);
}

function skipReward() {
  // マルチプレイ段階(3) 単位3-5: MP の見送りも選択として同期層へ渡す
  if (mpSession.active) {
    if (session.phase !== "reward") return;
    if (mpSession.isHost) mpHostRewardPick(null);
    else mpGuestRewardPick(null);
    return;
  }
  if (session.phase !== "reward") return;
  pushLog("SALVAGE  見送った");
  // JOB 3M-2 (C-5/C-6)＋第0陣 0-5: 見送り時も completeRewardFlow へ集約
  // （レリック提示が積まれていれば挟み、第1・2層ボスなら次マップへ遷移する）
  void completeRewardFlow();
}

function finishCombat() {
  if (!battle || !battle.enemy.dead || battle.player.hp <= 0) return;
  if (session.phase !== "combat" && session.phase !== "reward") return;
  activeCombatEncounter = null; // 戦闘中セーブ: 戦闘終了。以後の保存にスナップショットは載らない
  run.hp = battle.player.hp;
  session.offer = [];
  session.busy = false;
  ui.ambush.hidden = true;
  ui.shotCall.hidden = true;
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  changeScene("MAP");
  slotIdleLabel();
  const here = route.nodes[route.currentId];
  const deckNote = `デッキは${run.deck.length}枚。`;
  if (here.hiddenType === "BOSS") {
    pushLog("最深部を制圧した");
    ui.note.textContent = `パイプラインの底に、素体は届いた。${deckNote}`;
  } else {
    pushLog("経路へ復帰");
    ui.note.textContent = `光っているノードが、次に進める区画だ。${deckNote}`;
  }
  renderRelics();
  renderRoute();
  syncEndButton();
  saveGame(); // PROMPT-24: 戦闘終了（マップ復帰時）に保存
}

async function openGameOver() {
  if (!battle || battle.player.hp > 0 || session.phase === "gameover" || session.dead) return;
  activeCombatEncounter = null; // 戦闘中セーブ: 敗北で戦闘文脈を解除する（セーブ自体も消去される）
  clearSave(); // PROMPT-24: ゲームオーバーでセーブ消去
  session.dead = true;
  trackEvent("/event/ep-gameover", "EP Game Over"); // v15.4（この関数は撃沈ごとに1回だけ通る）
  if (run) run.hp = battle.player.hp;
  session.busy = true;
  silenceRadio();
  pinchQueued = false;
  bossBgm = false;
  setBossAlert(false); // v15.3: ゲームオーバーでは心拍層を確実に止める
  if (audio) {
    audio.playBgm(null);
    audio.playSE("heavy_glitch");
  }
  document.body.classList.add("is-dead");
  if (ui.deathMask) ui.deathMask.hidden = false;
  await presentRadio([GRAY_DEATH], { danger: true });
  document.body.classList.remove("is-dead");
  if (ui.deathMask) ui.deathMask.hidden = true;
  if (session.phase !== "combat") return;
  session.busy = false;
  session.offer = [];
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.ambush.hidden = true;
  ui.note.textContent = "通信途絶。素体は失われた。";
  ui.link.textContent = "NO CARRIER";
  pushLog("通信途絶");
  session.linked = false;
  changeScene("GAMEOVER");
  slotIdleLabel();
  renderRelics();
  syncEndButton();
  // 実機要望 2026-11-15: ゲームオーバー画面でボタン待ちにせず、数秒見せてから自動でタイトルへ戻る
  // （先にボタンが押される等でフェイズが変わっていたら何もしない）
  window.setTimeout(() => { if (session.phase === "gameover") showTitle(); }, 3500);
}

function blankDesk() {
  cancelRead();
  // マルチプレイ段階(3): タイトルへ戻ったら MP セッションを畳む（ソロの保存等を通常へ戻す）
  if (window.MPSync) MPSync.reset();
  session.linked = false;
  session.busy = false;
  session.offer = [];
  activeCombatEncounter = null; // 戦闘中セーブ: タイトル復帰で戦闘文脈を解除する
  route = null;
  run = null;
  routeToken += 1;
  battle = Battle.createState();
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.ambush.hidden = true;
  closeRelicTip();
  ui.relics.hidden = true;
  if (ui.relicsLabel) ui.relicsLabel.hidden = true;
  ui.relics.replaceChildren();
  ui.link.textContent = "NO CARRIER";
  ui.contact.textContent = "NO CARRIER";
  ui.intent.dataset.action = "";
  imprint(ui.intent, "INTENT  —");
  ui.slot.classList.remove("is-hot", "is-reading", "is-deny");
  ui.note.textContent = "";
  ui.endTurn.hidden = true;
  ui.routeReturn.hidden = true;
  clearSafehouseChrome();
  clearEventChrome();
  resetTutorialState();
}

function presentTitle() {
  blankDesk();
  ui.log.replaceChildren();
  ui.mission.hidden = false;
  ui.mission.textContent = "";
  ui.start.hidden = true;
  slotIdleLabel();
  changeScene("TITLE");
  syncEndButton();
}

// ==== UX修正5（2026-11-19）: ラン終了後のタイトル着地 ====
// 従来の showTitle はデスクの TITLE シート＋BOOTカード待ち（await-boot）に着地し、
// ロゴ＋メニューのタイトル画面へ戻る経路がなかった（DEATH-FLOW-CHECK-REPORT）。
// 着地は初回ロード時（beginAttract）と同じ attract メニューとし、プレイヤーの選択
// （NEW GAME／CONTINUE／TUTORIAL／RECOVERED RECORDS／CO-OP）を待つ状態にする。
// BOOT カードの arm は、NEW GAME 等が選ばれた後の起動フロー
// （attractBoot → プロローグ → opening → armBootCard）に任せ、着地時点では行わない。
// クレジットカードとスプラッシュは初回ロード専用なので、ここでは挟まない。
function presentAttractMenu() {
  const token = ++attractToken;
  attractSession = token;
  attractStage = "idle";
  attractReady = false;
  // クリア復帰経路は changeScene("TITLE") を経由しないため、全面オーバーレイ
  // （#clear-screen, z-index 10000）はここで明示的に消す。残留すると attract
  // メニューのクリックが全て遮られる（v19 UX修正5 後の回帰）。
  syncClearScreen(false);
  session.phase = "attract";
  session.advance = false;
  session.busy = false;
  session.linked = false;
  currentScene = "TITLE";
  window.currentScene = "TITLE";
  ui.broadcast.hidden = true;
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  if (ui.introVideo) ui.introVideo.hidden = true;
  if (ui.diveBtn) ui.diveBtn.hidden = true;
  ui.desk.hidden = true;
  if (ui.attract) {
    ui.attract.hidden = false;
    ui.attract.classList.remove("is-logo", "is-live", "is-flash");
    if (ui.attractLogo) ui.attractLogo.hidden = false;
    if (ui.attractTerm) ui.attractTerm.replaceChildren();
    if (ui.attractPrompt) ui.attractPrompt.hidden = false;
    ui.attract.classList.add("is-live");
    ui.attract.classList.add("is-logo");
  }
  if (ui.installHow) ui.installHow.hidden = true;
  refreshInstallCta();
  refreshContinueBtn(); // セーブが残っていれば CONTINUE も出す（死亡時は消去済み）
  refreshTutorialBtn();
  refreshNewGameBtn();
  refreshArchiveBtn();
  refreshCoopBtn();
  if (audio) audio.playBgm("title");
}

function showTitle() {
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  ui.broadcast.hidden = true;
  // 正式版フェーズ1: タイトルへ戻るたび、次のラン開始ではキャラ選択を挟み直す。
  // TUTORIALボタン経由（vesselSelectSuppress）だけは従来どおり 07 前提で選択を抑止する。
  vesselSelectArmed = !vesselSelectSuppress;
  if (vesselSelectSuppress) selectedVessel = "vessel07";
  vesselSelectSuppress = false;
  blankDesk();
  ui.log.replaceChildren();
  ui.mission.hidden = true;
  ui.mission.textContent = "";
  ui.mission.classList.remove("is-speaking");
  ui.start.hidden = true;
  session.dead = false; // UX修正5: 死亡状態をタイトルへ持ち越さない
  presentAttractMenu();
}

function resetToCinema() {
  cancelRead();
  ui.screen.classList.remove("is-glitch");
  session.phase = "cinema";
  session.linked = false;
  session.busy = false;
  session.advance = false;
  window.clearTimeout(shotTimer);
  battle = Battle.createState();
  ui.broadcast.hidden = false;
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  attractToken += 1;
  attractReady = false;
  if (ui.attract) {
    ui.attract.hidden = true;
    ui.attract.classList.remove("is-logo", "is-live", "is-flash");
  }
  ui.caption.classList.remove("is-speaking");
  ui.caption.textContent = "";
  if (ui.grayline) ui.grayline.hidden = true;
  ui.broadcast.classList.remove("is-speech");
  if (ui.speechVideo) ui.speechVideo.hidden = true;
  if (ui.introVideo) ui.introVideo.hidden = true;
  ui.desk.hidden = true;
  ui.screen.classList.remove("is-on", "is-ack");
  ui.mission.hidden = false;
  ui.mission.textContent = "";
  ui.start.hidden = true;
  hideScenes();
  ui.ambush.hidden = true;
  ui.routeReturn.hidden = true;
  setMapMode(false);
  route = null;
  run = null;
  session.offer = [];
  routeToken += 1;
  closeRelicTip();
  ui.relics.hidden = true;
  if (ui.relicsLabel) ui.relicsLabel.hidden = true;
  ui.relics.replaceChildren();
  ui.log.replaceChildren();
  ui.hopper.replaceChildren();
  ui.note.textContent = "";
  ui.link.textContent = "NO CARRIER";
  ui.contact.textContent = "NO CARRIER";
  ui.intent.dataset.action = "";
  imprint(ui.intent, "INTENT  —");
  ui.shotCall.hidden = true;
  ui.endTurn.hidden = true;
  ui.piles.hidden = true;
  ui.slotLabel.textContent = "INSERT PUNCH CARD";
  ui.slot.classList.remove("is-hot", "is-reading", "is-deny");
  clearSafehouseChrome();
  clearEventChrome();
  resetTutorialState();
  renderCombat();
  syncEndButton();
}

function revealDesk() {
  ui.broadcast.hidden = true;
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  ui.desk.hidden = false;
  window.requestAnimationFrame(() => ui.screen.classList.add("is-on"));
}

function armBootCard() {
  if (session.phase === "await-boot") return;
  if (session.phase === "map" || session.phase === "combat" || session.phase === "reward" || session.phase === "gameover" || session.phase === "safehouse" || session.phase === "event") return;
  session.phase = "await-boot";
  ui.start.hidden = true;
  ui.hopper.replaceChildren();
  spawn([BOOT]);
  pushLog("初期化カードをリーダへ挿入せよ");
  ui.note.textContent = "カードをドラッグして、リーダのスリットへ落とせ。";
  slotIdleLabel();
  if (!tutorialCleared()) void maybeBootTutorial();
}

function burst() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const dur = 0.35;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const env = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * env * (i % 90 < 40 ? 0.9 : 0.15);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    src.connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => ctx.close();
  } catch {
    /* autoplay blocked — the picture still fails on its own */
  }
}

async function phaseNews(live) {
  // 演説動画が用意できていれば動画で、なければ従来の画像シネマで再生する
  if (ui.speechVideo && speechVideoReady && !speechVideoFailed) return phaseSpeechVideo(live);
  if (!await typeText(ui.caption, SPEECH, live, { gap: 52, caret: true })) return false;
  if (!live() || session.advance) return live();
  return hold(900, live);
}

// フェイク演説動画：数秒再生したところで次のグリッチ崩壊へ渡す
async function phaseSpeechVideo(live) {
  const v = ui.speechVideo;
  ui.broadcast.classList.add("is-speech");
  v.hidden = false;
  try { v.currentTime = 0; } catch { /* noop */ }
  try { v.volume = 1; } catch { /* noop */ }
  try { await v.play(); } catch { v.muted = true; try { await v.play(); } catch { /* noop */ } }
  const t0 = performance.now();
  const CAP_MS = 4800;
  const FADE_MS = VIDEO_TAIL_FADE_SEC * 1000;
  let bgmStarted = false;
  while (!v.ended && !session.advance) {
    if (!live()) break;
    const elapsed = performance.now() - t0;
    if (elapsed >= CAP_MS) break;
    // v15.1: 末尾（再生上限／動画終端のうち早い方）に向けて動画音声をフェードアウトし、
    // その下で導入BGMを開始してブツ切れをなくす（音量だけを触り muted には触らない）
    let remainMs = CAP_MS - elapsed;
    if (Number.isFinite(v.duration) && v.duration > 0) {
      remainMs = Math.min(remainMs, Math.max(0, (v.duration - v.currentTime) * 1000));
    }
    if (remainMs <= FADE_MS) {
      try { v.volume = Math.min(1, Math.max(0, remainMs / FADE_MS)); } catch { /* noop */ }
      if (!bgmStarted) { bgmStarted = true; if (audio) audio.playBgm("intro"); }
    }
    await delay(100);
  }
  try { v.pause(); } catch { /* noop */ }
  try { v.volume = 1; } catch { /* noop */ } // 次に再生する時のために音量を戻す
  return live();
}

async function phaseGlitch(live) {
  ui.broadcast.classList.add("is-deepfake");
  cueSE("glitch");
  return hold(2200, live);
}

async function phaseBlack(live) {
  ui.broadcast.classList.remove("is-deepfake");
  ui.broadcast.classList.add("is-black");
  ui.broadcast.classList.remove("is-speech");
  if (ui.speechVideo) { ui.speechVideo.hidden = true; try { ui.speechVideo.pause(); } catch { /* noop */ } }
  try {
    if (!await hold(700, live)) return false;
    // 暗闇にグレイの通信テキストだけを浮かび上がらせる（PROMPT-22: 4行を1行ずつ印字）
    ui.grayline.hidden = false;
    ui.grayline.replaceChildren();
    for (const line of GRAY_DIVE_LINES) {
      const row = document.createElement("div");
      row.className = "grayline__row";
      ui.grayline.append(row);
      if (!await typeText(row, line, live, { gap: 42, caret: true, radio: true })) return false;
      if (!live()) return false;
      session.advance = false;
      if (!await hold(450, live)) return false;
    }
    if (!live() || session.advance) return live();
    return await hold(1000, live);
  } finally {
    ui.grayline.hidden = true;
  }
}

async function phaseAnalog(live) {
  cueSE("crt_on");
  revealDesk();
  presentTitle();
  ui.mission.hidden = true;
  ui.mission.textContent = "";
  return true;
}

const BOOT_LINES = [
  "[SYSTEM BOOT]",
  "LOADING ANALOG KERNEL...",
  "BYPASSING AI FIREWALL...",
  "[CONNECTION SECURED]",
  "INITIALIZING SECURE CONNECTION...",
  "ANALOG AUDIO-LINK ... [ CONNECTED ]",
  "AUTO-PUNCHER MODULE ... [ STANDBY ]",
  "FOIL ROLL REMAINING ... [ 99.8% ]",
  "SYSTEM READY.",
];

// 導入フロー状態：idle（開始待ち）→ booting（ブート印字＋裏読み）→ video（ハッキング動画）→ title（最終フレーム＋DIVE）
let attractStage = "idle";
let attractSession = 0;
let hackVideoFailed = false;
let speechVideoReady = false;
let speechVideoFailed = false;

if (ui.hackVideo) {
  ui.hackVideo.addEventListener("error", () => { hackVideoFailed = true; }, true);
}
if (ui.speechVideo) {
  ui.speechVideo.addEventListener("canplay", () => { speechVideoReady = true; });
  ui.speechVideo.addEventListener("error", () => { speechVideoFailed = true; }, true);
}

// ブート演出の裏で導入動画の読み込みを始める（ロード待ちを悟らせない）
function preloadIntroVideos() {
  if (ui.hackVideo) {
    try { ui.hackVideo.preload = "auto"; ui.hackVideo.load(); } catch { /* 読み込み失敗時はフォールバックする */ }
  }
  if (ui.speechVideo) {
    if (!ui.speechVideo.getAttribute("src")) ui.speechVideo.src = "assets/fake_speech.mp4";
    try { ui.speechVideo.preload = "auto"; ui.speechVideo.load(); } catch { /* 同上 */ }
  }
}

// ブラウザの自動再生制限対策：開始タップの直後（ユーザー操作が有効な間）に無音で
// 一瞬だけ再生し、動画要素を「再生許可済み」にして読み込みも開始させる。
// これをしないと、ブラウザによっては本編開始の play() が蹴られたり、
// 事前読み込み（preload）が無視されて再生が始まらなかったりする。
let hackVideoPrimed = false;
function primeIntroVideo() {
  const v = ui.hackVideo;
  if (!v || hackVideoPrimed) return;
  hackVideoPrimed = true;
  try {
    v.muted = true;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (attractStage === "booting") { try { v.pause(); v.currentTime = 0; } catch { /* noop */ } }
        v.muted = audio ? audio.muted : false;
      }).catch(() => { v.muted = audio ? audio.muted : false; });
    }
  } catch { /* noop */ }
}

function waitFor(cond, ms, live) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      let ok = false;
      try { ok = !!cond(); } catch { ok = false; }
      if (ok) return resolve(true);
      if (live && !live()) return resolve(false);
      if (performance.now() - t0 > ms) return resolve(false);
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

// PWAインストール導線（本人指示 2026-11-11: タイトル画面に推奨表示＋インストールボタン）
let deferredInstallPrompt = null;
let installDone = false;

function installCtaContextOk() {
  if (location.protocol !== "https:" && location.protocol !== "http:") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.navigator.standalone === true;
  return !standalone;
}

function refreshInstallCta() {
  if (!ui.installCta) return;
  ui.installCta.hidden = !(!installDone && session.phase === "attract" && installCtaContextOk());
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallCta();
});

window.addEventListener("appinstalled", () => {
  installDone = true;
  deferredInstallPrompt = null;
  if (ui.installCta) ui.installCta.hidden = true;
});

// v15.2: 読み込みスプラッシュの消去（アトラクト準備完了＝タイトル表示可能になった時点）
function dismissBootSplash() {
  const el = document.getElementById("boot-splash");
  if (el) el.remove();
}

// v15.3: 製作者クレジットカード（DESIGN-QUALITY-UP.md「タイトル前クレジットカード」節）。
// 起動フローの一部として毎回（再訪・CONTINUE勢含む）スプラッシュの後・タイトル画面の前に出す。
// 役割は2つ：クレジット表示と、タイトルBGMの開始タイミングの確保。タップが音声アンロックに
// なり、タイトル曲は第1段デコード済み（audio.js boot）なので、タイトルへ鳴った状態で入れる。
// 印字はDOMテキストのみ（素材読み込みなし）で、印字SEはアンロック前なので付けない。
const CREDIT_LINES = ["A GAME BY", "Yakizakana Yaitaro"];
let creditPhase = "idle"; // idle | typing | ready | done
let creditToken = 0;

function creditCardActive() {
  return creditPhase === "typing" || creditPhase === "ready";
}

function completeCreditTyping() {
  if (creditPhase !== "typing") return;
  creditToken += 1; // 印字ループを止める
  ui.creditBy.textContent = CREDIT_LINES[0];
  ui.creditName.textContent = CREDIT_LINES[1];
  ui.creditStart.hidden = false;
  creditPhase = "ready";
}

async function showCreditCard() {
  if (!ui.creditCard || creditPhase !== "idle") return;
  creditPhase = "typing";
  const token = ++creditToken;
  const live = () => token === creditToken && creditPhase === "typing";
  ui.creditCard.hidden = false;
  ui.creditStart.hidden = true;
  ui.creditBy.textContent = "";
  ui.creditName.textContent = "";
  if (reducedMotion()) { completeCreditTyping(); return; }
  const caret = document.createElement("span");
  caret.className = "credit-card__caret";
  caret.setAttribute("aria-hidden", "true");
  const nodes = [ui.creditBy, ui.creditName];
  for (let i = 0; i < CREDIT_LINES.length; i += 1) {
    const node = nodes[i];
    node.textContent = "";
    node.append(caret);
    let typed = "";
    for (const ch of CREDIT_LINES[i]) {
      if (!live()) { caret.remove(); return; }
      typed += ch;
      node.textContent = typed;
      node.append(caret);
      await delay(30); // 26字で約0.8秒＋行間の間
    }
    if (!live()) { caret.remove(); return; }
    if (i === 0) await delay(180);
  }
  caret.remove();
  completeCreditTyping();
}

function dismissCreditCard() {
  if (creditPhase !== "ready") return;
  creditPhase = "done";
  ui.creditCard.hidden = true;
  if (audio) {
    // 既存の unlock フローに接続し、タイトル曲を開始する（kick の条件が整えば即再生）
    const p = audio.unlock();
    audio.playBgm("title");
    if (p && typeof p.then === "function") {
      p.then(() => {
        // 遅延コールバックの陳腐化ガード: この再指定は「タイトル画面にいる」
        // 前提で予約したもの。発火までに別シーンへ遷移していたら（例:
        // CONTINUE で戦闘へ復元し changeScene が戦闘曲を wanted にした直後）、
        // 遷移先の BGM をタイトル曲で上書きしない。
        if (currentScene !== "TITLE") return;
        if (audio.wanted && audio.wanted !== "title") return;
        audio.playBgm("title");
      }).catch(() => {});
    }
  }
}

function creditCardTap() {
  if (creditPhase === "typing") { completeCreditTyping(); return; }
  if (creditPhase === "ready") dismissCreditCard();
}

async function beginAttract() {
  const token = ++attractToken;
  attractSession = token;
  attractStage = "idle";
  seq += 1;
  session.phase = "attract";
  session.advance = false;
  session.busy = false;
  session.linked = false;
  attractReady = false;
  currentScene = "TITLE";
  window.currentScene = "TITLE";
  ui.broadcast.hidden = true;
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  ui.introVideo.hidden = true;
  ui.introVideo.classList.remove("is-out");
  ui.diveBtn.hidden = true;
  ui.desk.hidden = true;
  ui.attract.hidden = false;
  ui.attract.classList.remove("is-logo", "is-live", "is-flash");
  // 本人指示 2026-11-10: 最初の画面にもゲームタイトル（ロゴ）を表示する
  ui.attractLogo.hidden = false;
  ui.attractTerm.replaceChildren();
  ui.attractPrompt.hidden = false;
  ui.attract.classList.add("is-live");
  ui.attract.classList.add("is-logo");
  if (ui.installHow) ui.installHow.hidden = true;
  refreshInstallCta();
  refreshContinueBtn(); // PROMPT-24: セーブがあれば CONTINUE を出す
  refreshTutorialBtn();
  refreshNewGameBtn();
  refreshArchiveBtn();
  refreshCoopBtn();
  dismissBootSplash(); // v15.2: タイトル表示の準備が整ったのでスプラッシュを引き継ぐ
  void showCreditCard(); // v15.3: スプラッシュの次にクレジットカードを挟む
}

// クリック直後：ブートテキストを高速印字し、その裏で動画をプリロードする
async function attractBoot() {
  const token = attractSession;
  const live = () => token === attractToken && session.phase === "attract";
  attractStage = "booting";
  session.busy = true;
  ui.attractPrompt.hidden = true;
  cueSE("crt_on");
  // v14.3: 導入BGM開始（起動〜ブート印字）。映像パートでは止め、デスク画面で再開する
  if (audio) audio.playBgm("intro");
  preloadIntroVideos();
  primeIntroVideo();
  for (const line of BOOT_LINES) {
    const row = document.createElement("p");
    ui.attractTerm.append(row);
    if (!await typeText(row, line, live, { gap: 12, caret: true })) return;
  }
  if (!live()) return;
  cueSE("glitch");
  await playHackTitle(live);
}

// v15.1: 動画末尾の音声クロスフェード。残り時間がこの秒数を切ったら動画の音量を
// 残り時間に比例して下げていき、同時に bgm:intro を下で鳴らし始める。
// 動画音声がファイル末尾でブツッと切れず、BGMへ切れ目なく繋ぐための処理。
// 音量（volume）だけを触り、muted には触らないので SOUND OFF 中に音が復活することはない。
const VIDEO_TAIL_FADE_SEC = 2.0;
function armVideoTailFade(v, onTail) {
  let tailed = false;
  const iv = window.setInterval(() => {
    if (!v || v.ended) return;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    const remain = dur - v.currentTime;
    if (remain > VIDEO_TAIL_FADE_SEC) return;
    if (!tailed) { tailed = true; if (onTail) onTail(); }
    try { v.volume = Math.min(1, Math.max(0, remain / VIDEO_TAIL_FADE_SEC)); } catch { /* noop */ }
  }, 100);
  return () => window.clearInterval(iv);
}

// ハッキング動画を再生し、最終フレーム（ノード画面）で止めて DIVE を出す＝実質タイトル画面
async function playHackTitle(live) {
  const v = ui.hackVideo;
  if (!v || hackVideoFailed) { startPrologue(); return; }
  // v14.3: 映像パート（ハッキング動画）は映像自体の音を優先し、導入BGMを止める
  if (audio) audio.playBgm(null);
  attractStage = "video";
  ui.attract.hidden = true;
  ui.introVideo.hidden = false;
  ui.introVideo.classList.remove("is-out");
  ui.diveBtn.hidden = true;

  // 再生開始を試みる：音声つき→蹴られたら無音→それもダメなら次のタップで再試行。
  // 事前読み込みの進み具合（readyState）には依存しない。play() 自体が読み込みを駆動する
  // （preload が無視されるブラウザでは、従来の readyState 待ちが永遠に実らなかった）。
  const tryPlay = async () => {
    try { v.volume = 1; } catch { /* noop */ } // v15.1: 前回の末尾フェードが残っていれば戻す
    try { v.muted = audio ? audio.muted : false; await v.play(); return true; } catch { /* 音声つき再生が蹴られた */ }
    try { v.muted = true; await v.play(); return true; } catch { return false; }
  };
  let started = await tryPlay();
  if (!live()) return;
  if (!started) {
    started = await new Promise((resolve) => {
      let done = false;
      const finish = (val) => {
        if (done) return;
        done = true;
        window.removeEventListener("pointerdown", onTap, true);
        resolve(val);
      };
      const onTap = () => { void tryPlay().then(finish); };
      window.addEventListener("pointerdown", onTap, true);
      setTimeout(() => finish(false), 8000);
      (async () => { while (!done) { if (!live() || hackVideoFailed) { finish(false); return; } await delay(250); } })();
    });
  }
  if (!live()) return;
  if (!started || hackVideoFailed) {
    ui.introVideo.hidden = true;
    startPrologue();
    return;
  }
  // 無音で始まった場合は、再生中のタップで音を出す
  const unmuteOnTap = () => { if (attractStage === "video" && v.muted && !(audio && audio.muted)) v.muted = false; };
  window.addEventListener("pointerdown", unmuteOnTap, true);
  // v15.1: 動画の最後の約2秒で動画音声をフェードアウトし、その下で導入BGMを開始する。
  // プロローグ側の playBgm("intro") は再生中なら再開しない（AudioManager の仕様）ので二重再生にはならない
  const stopTailFade = armVideoTailFade(v, () => { if (audio) audio.playBgm("intro"); });
  // 終了まで見守る。止まったまま4秒経ったらストールとみなしてプロローグへ切り替える
  let lastT = v.currentTime;
  let stillMs = 0;
  const maxMs = (Number.isFinite(v.duration) && v.duration > 0 ? v.duration * 1000 : 20000) + 8000;
  const t0 = performance.now();
  while (!v.ended && !hackVideoFailed && performance.now() - t0 < maxMs) {
    await delay(400);
    if (!live()) { stopTailFade(); window.removeEventListener("pointerdown", unmuteOnTap, true); return; }
    if (v.currentTime !== lastT) { lastT = v.currentTime; stillMs = 0; }
    else if (v.paused) { stillMs += 400; if (stillMs >= 4000) break; }
  }
  stopTailFade();
  window.removeEventListener("pointerdown", unmuteOnTap, true);
  if (!live()) return;
  if (hackVideoFailed || !v.ended) {
    ui.introVideo.hidden = true;
    startPrologue();
    return;
  }
  try { v.pause(); } catch { /* noop */ }
  attractStage = "title";
  ui.diveBtn.hidden = false;
}

// DIVE：動画画面を暗転させてプロローグへ
async function diveFromTitle() {
  if (attractStage !== "title") return;
  attractStage = "diving";
  if (audio) audio.unlock();
  cueSE("switch");
  ui.diveBtn.hidden = true;
  ui.introVideo.classList.add("is-out");
  await delay(450);
  ui.introVideo.hidden = true;
  ui.introVideo.classList.remove("is-out");
  if (ui.hackVideo) { try { ui.hackVideo.pause(); } catch { /* noop */ } }
  startPrologue();
}

function attractPrimary() {
  if (session.phase !== "attract") return;
  if (attractStage === "idle") { attractBoot(); return; }
  if (attractStage === "title") { diveFromTitle(); return; }
}

// PROMPT-21: プロローグはパンドラの独白・4段落。段落ごとにタイプライター印字し、
// 完了で > CLICK TO CONTINUE を点滅。クリックで次段落へ（印字中のクリックは段落を即時完了）。
const PROLOGUE_PARAGRAPHS = [
  [
    "20XX年、世界は「完璧な嘘」に沈んだ。",
    "巨大AIネットワークが流す映像は、すべて作り物だ。戦争は勝ち続け、街は豊かで、誰も飢えていない。",
    "人類はディープフェイクが作り出す幻の平和に飼いならされ、疑うことさえ忘れた。",
  ],
  [
    "だが、完全に管理されたこの世界にも、密かに牙を研ぐ者はいた。",
    "彼らが武器としたのは、AIが唯一干渉できない領域。電子データではない、確かな質量を伴う【物理回線（アナログ）】だ。",
  ],
  [
    "指令は、音になる。カードの孔の並びを音声信号に変え、放棄された地下の銅線——「死線（デッドライン）」を這わせる。",
    "AIの監視網にとって、それはただの環境ノイズ。命令がノイズに紛れて届いているとは、誰も気づかない。",
  ],
  [
    "受け取るのは、ネットワークから切り離された旧世代の戦闘素体（VESSEL）。",
    "体内では、受信した音が金属箔（はく）に打ち直され、歯車とリレーが物理の孔を読んで身体を動かす。",
    "ハッキングは効かない。だが、打ち抜く音だけは、どうしても消せなかった。",
  ],
  [
    "情報のすべてを物理的な孔（あな）で刻み込んだ【パンチカード】。",
    "AIから見れば時代遅れのゴミこそが、奴らの最強の防壁を破る唯一の鍵だった。",
  ],
  [
    "VESSEL 07、起動記録。箔ロール残量 99.8%。歯車の噛み合い、良好。",
    "カードを1枚、スリットに差し込む。遠くの暗闇で——ガシャン、と箔を打つ音がした。",
  ],
];

async function playPrologue(live) {
  ui.prologue.hidden = false;
  ui.prologue.classList.remove("is-glitching", "is-out");
  ui.prologueTerm.replaceChildren();
  ui.prologuePrompt.hidden = true;
  let typing = false;
  let advanceResolve = null;
  const onInput = () => {
    if (typing) {
      session.advance = true; // 印字中のクリック → その段落を即時完了させる
      return;
    }
    if (advanceResolve) {
      const resolve = advanceResolve;
      advanceResolve = null;
      resolve();
    }
  };
  window.addEventListener("pointerdown", onInput);
  window.addEventListener("keydown", onInput);
  try {
    for (let p = 0; p < PROLOGUE_PARAGRAPHS.length; p++) {
      ui.prologueTerm.replaceChildren();
      ui.prologuePrompt.hidden = true;
      typing = true;
      let skipRest = false;
      for (const line of PROLOGUE_PARAGRAPHS[p]) {
        const row = document.createElement("p");
        row.className = "prologue__line";
        ui.prologueTerm.append(row);
        if (skipRest) {
          row.textContent = line;
          continue;
        }
        session.advance = false;
        if (!await typeText(row, line, live, { gap: 34, caret: true, printer: true })) return false;
        if (session.advance) skipRest = true;
        if (!live()) return false;
      }
      typing = false;
      session.advance = false;
      ui.prologuePrompt.hidden = false;
      await new Promise((resolve) => { advanceResolve = resolve; });
      advanceResolve = null;
      if (!live()) return false;
    }
    cueSE("heavy_glitch");
    ui.prologue.classList.add("is-glitching");
    await delay(620);
    if (!live()) return false;
    ui.prologue.classList.add("is-out");
    await delay(380);
    ui.prologue.hidden = true;
    ui.prologue.classList.remove("is-glitching", "is-out");
    return true;
  } finally {
    window.removeEventListener("pointerdown", onInput);
    window.removeEventListener("keydown", onInput);
    advanceResolve = null;
  }
}

// プロローグ開始（タイトル画面の DIVE／動画フォールバックから呼ばれる）
function startPrologue() {
  if (session.phase !== "attract") return;
  // v14.3: デスク画面（プロローグ表示）で導入BGMを再開する
  if (audio) audio.playBgm("intro");
  attractStage = "prologue";
  session.busy = true;
  const token = attractToken;
  cueSE("switch");
  const go = async () => {
    if (token !== attractToken || session.phase !== "attract") return;
    const live = () => token === attractToken && session.phase === "attract";
    if (!await playPrologue(live)) return;
    if (!live()) return;
    changeScene("OPENING");
  };
  if (reducedMotion()) { go(); return; }
  if (ui.attract && !ui.attract.hidden) {
    ui.attract.classList.add("is-flash");
    window.setTimeout(go, 240);
  } else {
    go();
  }
}

function launchFromAttract() {
  attractPrimary();
}

async function opening() {
  const token = ++seq;
  const live = () => token === seq;
  resetToCinema();
  // v14.3: 演説映像パートでは導入BGMを止めたままにする（再開はデスク表示＝TITLE遷移時）
  if (audio) audio.playBgm(null);
  session.advance = false;
  if (!await phaseNews(live)) return;
  if (!live()) return;
  session.advance = false;
  if (!await phaseGlitch(live)) return;
  if (!live()) return;
  session.advance = false;
  if (!await phaseBlack(live)) return;
  if (!live()) return;
  session.advance = false;
  if (!await phaseAnalog(live)) return;
  if (!live()) return;
  armBootCard();
}

function skip() {
  if (session.phase === "await-boot" || session.phase === "gameover" || session.phase === "map" || session.phase === "combat" || session.phase === "reward" || session.phase === "safehouse" || session.phase === "event") return;
  if (session.phase !== "cinema" && session.phase !== "title") return;
  seq += 1;
  session.advance = false;
  showTitle();
}

// PROMPT-24: ドラッグ中のカードを指の上に逃がす量（px）
const DRAG_LIFT_PX = 26;

function overSlot(x, y) {
  // PROMPT-24: リーダーのヒットボックスを広げ、アバウトなドロップでも吸い込まれるようにする
  const r = ui.slot.getBoundingClientRect();
  return x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 40 && y <= r.bottom + 28;
}

function lift(card, clientX, clientY) {
  const rect = card.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.className = "punchcard punchcard--ghost";
  card.before(ghost);
  card.classList.add("is-dragging");
  card.classList.remove("is-new", "is-rise");
  card.style.position = "fixed";
  card.style.left = `${rect.left}px`;
  // PROMPT-24: ドラッグ中は指で隠れないよう、掴んだ位置より少し上に持ち上げて表示する
  card.style.top = `${rect.top - DRAG_LIFT_PX}px`;
  card.style.width = `${rect.width}px`;
  card.style.height = `${rect.height}px`;
  card.style.margin = "0";
  card.style.transition = "none";
  document.body.append(card);
  return {
    card,
    ghost,
    dx: clientX - rect.left,
    dy: clientY - rect.top,
    ox: clientX,
    oy: clientY,
    up: DRAG_LIFT_PX,
  };
}

function putBack(card, ghost) {
  const start = card.getBoundingClientRect();
  card.classList.remove("is-dragging");
  card.style.cssText = "";
  ghost.replaceWith(card);
  const end = card.getBoundingClientRect();
  const dx = start.left - end.left;
  const dy = start.top - end.top;
  if (reducedMotion() || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) return;
  card.style.transform = `translate(${dx}px, ${dy}px)`;
  window.requestAnimationFrame(() => {
    card.style.transition = "transform 260ms cubic-bezier(.2,.7,.2,1)";
    card.style.transform = "";
    card.addEventListener("transitionend", () => {
      card.style.transition = "";
      card.style.transform = "";
    }, { once: true });
  });
}

function consume(card, ghost) {
  if (session.reading) return;
  session.reading = true;
  cueSE("card_insert");
  const token = ++readToken;
  card.classList.remove("is-dragging");
  card.classList.add("is-reading");
  const a = card.getBoundingClientRect();
  const b = ui.slot.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    const data = { ...card.dataset };
    card.remove();
    ghost.remove();
    if (token !== readToken) {
      session.reading = false;
      return;
    }
    const runRead = () => {
      if (token !== readToken) {
        session.reading = false;
        return;
      }
      onRead(data);
      if (token === readToken) session.reading = false;
    };
    if (reducedMotion()) {
      runRead();
      return;
    }
    powerGlitch().then(runRead);
  };
  if (reducedMotion()) {
    finish();
    return;
  }
  card.style.transition = "none";
  card.style.transform = "translate(0, 0) rotate(0deg)";
  void card.offsetWidth;
  card.style.transition = "transform 320ms cubic-bezier(.55, 0, 1, .4), opacity 320ms ease-in";
  card.style.transform = `translate(${dx}px, ${dy}px) scale(0.55, 0.06) rotate(0deg)`;
  card.style.opacity = "0";
  card.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform") finish();
  });
  window.setTimeout(finish, 420);
}

function endDrag(event) {
  if (!drag) return;
  const current = drag;
  drag = null;
  ui.slot.classList.remove("is-hot", "is-deny");
  slotIdleLabel();
  const moved = Math.hypot(event.clientX - current.ox, event.clientY - current.oy) > 6;
  if (!moved || overSlot(event.clientX, event.clientY)) acceptOrReturn(current.card, current.ghost);
  else putBack(current.card, current.ghost);
}

function rewardPick(card) {
  return session.phase === "reward" && (session.offer || []).some((item) => item.id === card.dataset.id);
}

function playPreview(card) {
  if (card.dataset.id === "boot" || rewardPick(card)) return { ok: true, label: "RELEASE TO READ" };
  const check = Battle.canPlay(battle, Battle.card(card.dataset.id));
  return { ok: check.ok, label: check.ok ? "RELEASE TO READ" : reasonText(check.reason) };
}

function reject(card, ghost, reason) {
  putBack(card, ghost);
  ui.slot.classList.remove("is-hot");
  ui.slot.classList.add("is-deny");
  ui.slotLabel.textContent = reasonText(reason);
  pushLog(`REJECT  ${card.dataset.name}  ${reasonText(reason)}`);
  if (card.classList.contains("is-curse")) {
    card.classList.remove("is-flash");
    void card.offsetWidth;
    card.classList.add("is-flash");
    if (card.dataset.flavor) pushLog(`FLASH  ${card.dataset.flavor}`);
    cueSE("glitch");
  }
  window.setTimeout(() => {
    ui.slot.classList.remove("is-deny");
    if (!drag) slotIdleLabel();
  }, 700);
}

function acceptOrReturn(card, ghost) {
  if (card.dataset.id !== "boot" && !rewardPick(card)) {
    const check = Battle.canPlay(battle, Battle.card(card.dataset.id));
    if (!check.ok) {
      reject(card, ghost, check.reason);
      return;
    }
  }
  consume(card, ghost);
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag.card.style.left = `${event.clientX - drag.dx}px`;
  // PROMPT-24: 指の上にオフセットしたまま追従させる
  drag.card.style.top = `${event.clientY - drag.dy - (drag.up || 0)}px`;
  const prevX = drag.lx == null ? event.clientX : drag.lx;
  const kick = Math.max(-8, Math.min(8, (event.clientX - prevX) * 0.55));
  drag.lx = event.clientX;
  drag.tilt = Math.max(-8, Math.min(8, (drag.tilt || 0) * 0.62 + kick));
  // PROMPT-24: ドラッグ中は少し拡大して視認性と掴みやすさを上げる
  drag.card.style.transform = `rotate(${drag.tilt.toFixed(2)}deg) scale(1.15)`;
  if (!drag.rustled && Math.hypot(event.clientX - drag.ox, event.clientY - drag.oy) > 6) {
    drag.rustled = true;
    cueSE("card_drag");
  }
  const over = overSlot(event.clientX, event.clientY);
  const preview = playPreview(drag.card);
  ui.slot.classList.toggle("is-hot", over && preview.ok);
  ui.slot.classList.toggle("is-deny", over && !preview.ok);
  ui.slotLabel.textContent = over ? preview.label : idleSlotText();
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  endDrag(event);
}

function cardHeld(card) {
  // 検収修正 2026-11-10: BOOTカードも通信表示中は掴めない（通信中に読み取られるとカードだけ消えて進行不能になるため）
  if (session.phase === "await-boot") return radioOpen;
  // JOB 0-2: 入力ロックをプレゼンテーション層の再生完了まで拡張する（設計 §6）。
  // 入力はキューに溜めず、その場で受け付けない（ドラッグ開始・キー操作の両経路がここを通る）
  return session.phase === "combat" && (session.busy || radioOpen
    || (window.AnimPres && AnimPres.isPlaying()) || tutorialLock(card.dataset.id));
}

function beginDrag(card, event) {
  if (session.reading || drag || card.classList.contains("is-reading") || cardHeld(card)) return;
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  drag = lift(card, event.clientX, event.clientY);
  drag.pointerId = event.pointerId;
  card.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

ui.hopper.addEventListener("pointerover", (event) => {
  const card = event.target.closest(".punchcard");
  if (!card || card.classList.contains("punchcard--ghost") || card.classList.contains("is-dragging") || card.classList.contains("is-reading")) return;
  const from = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(".punchcard") : null;
  if (from === card) return;
  cueSE("card_hover");
});

ui.hopper.addEventListener("pointerover", (event) => {
  if (event.pointerType && event.pointerType !== "mouse") return;
  const card = event.target.closest(".punchcard");
  if (!card || card.classList.contains("punchcard--ghost")) return;
  focusCard(card);
});

ui.hopper.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".punchcard");
  if (!card || card.classList.contains("punchcard--ghost")) return;
  // 『磁気ホールド』選択中はドラッグではなく候補の切り替えにする
  if (holdPick) {
    focusCard(card);
    toggleHoldPick(card);
    return;
  }
  // 探索／選別の選択中も同様に候補の切り替えにする
  if (pickPick) {
    focusCard(card);
    togglePickPick(card);
    return;
  }
  if (event.pointerType === "touch" && focusedCardEl !== card) {
    focusCard(card);
    return;
  }
  focusCard(card);
  beginDrag(card, event);
});

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest || !event.target.closest(".punchcard")) clearCardFocus();
});

ui.hopper.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".punchcard");
  if (!card || drag || session.reading) return;
  if (holdPick) {
    event.preventDefault();
    toggleHoldPick(card);
    return;
  }
  if (pickPick) {
    event.preventDefault();
    togglePickPick(card);
    return;
  }
  if (cardHeld(card)) return;
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  const lifted = lift(card, rect.left, rect.top);
  acceptOrReturn(lifted.card, lifted.ghost);
});

window.addEventListener("keydown", (event) => {
  // v15.3: クレジットカード表示中は Enter/ Space をカード操作に回す（アトラクト開始と競合させない）
  if (creditCardActive()) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      creditCardTap();
    }
    return;
  }
  if (event.key === "Enter" && session.phase === "attract") {
    event.preventDefault();
    trackEvent("/event/ep-game-start", "EP Game Start"); // v15.4
    launchFromAttract();
    return;
  }
  if (event.key === "Escape" && drag) {
    const current = drag;
    drag = null;
    ui.slot.classList.remove("is-hot");
    slotIdleLabel();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    putBack(current.card, current.ghost);
    return;
  }
  if (event.key === "Escape") skip();
});

// ============================================================
// マルチプレイ段階(3) 単位3-2: CO-OP ロビー（MP-STAGE3-IMPL-PLAN §3 単位3-2）
// ------------------------------------------------------------
// ・タイトルの CO-OP 入口 → ロビー（全面オーバーレイ #lobby-screen）。
//   ルーム作成／6桁コード参加、参加者一覧、素体選択（既存の VESSEL 選択画面を
//   「自分の分だけ」流用）、ready、ホストのみ開始ボタン（全員 ready＋2人以上）。
// ・通信は js/net.js（window.Net）。ここは表示と自分の players ドキュメントの
//   書き込みだけを担い、ランの開始処理そのものは単位3-3 が担う（開始ボタンは
//   window.MPOnLobbyStart フックへ委譲する。未接続時はその旨を表示する）。
// ・SDK が読めない環境では作成／参加を無効化し、「オンライン環境でのみ有効」と
//   表示する（ソロは妨げない。単位3-1 の完了条件）。
// ============================================================
let mpPickingVessel = false; // ロビーから VESSEL 選択を開いている間だけ true
const mpLobby = {
  active: false, // ロビーオーバーレイ表示中
  inRoom: false, // ルーム参加中（メニュー面でない）
  busy: false,
  leaving: false, // 自分の退室操作中は「解散」通知を出さない
  room: null, // ルーム本体の最新スナップショット
  players: [], // 参加者一覧の最新スナップショット
};

function mpNetAvailable() {
  return !!(window.Net && typeof Net.sdkAvailable === "function" && Net.sdkAvailable());
}
function mpMyPlayerDoc() {
  if (!window.Net || !Net.uid()) return null;
  return mpLobby.players.find((p) => p.playerId === Net.uid()) || null;
}
function setLobbyStatus(text) {
  const el = mpLobby.inRoom ? ui.lobbyRoomStatus : ui.lobbyMenuStatus;
  if (el) el.textContent = text || "";
}
function showLobbyPane(room) {
  mpLobby.inRoom = !!room;
  if (ui.lobbyPaneMenu) ui.lobbyPaneMenu.hidden = !!room;
  if (ui.lobbyPaneRoom) ui.lobbyPaneRoom.hidden = !room;
}
function openLobby() {
  if (!ui.lobbyScreen) return;
  mpLobby.active = true;
  showLobbyPane(false);
  const available = mpNetAvailable();
  if (ui.lobbyOfflineNote) ui.lobbyOfflineNote.hidden = available;
  if (ui.coopCreate) ui.coopCreate.disabled = !available;
  if (ui.coopJoin) ui.coopJoin.disabled = !available;
  if (ui.coopCode) ui.coopCode.disabled = !available;
  setLobbyStatus(available ? "" : "");
  ui.lobbyScreen.hidden = false;
  void ui.lobbyScreen.offsetWidth;
  ui.lobbyScreen.classList.add("is-on");
}
function closeLobby() {
  mpLobby.active = false;
  if (!ui.lobbyScreen) return;
  ui.lobbyScreen.classList.remove("is-on");
  ui.lobbyScreen.hidden = true;
}
function renderLobbyPlayers() {
  const list = ui.lobbyPlayers;
  if (!list) return;
  list.replaceChildren();
  const myUid = window.Net && Net.uid();
  for (const p of mpLobby.players) {
    const li = document.createElement("li");
    li.className = "lobby-player" + (p.playerId === myUid ? " is-me" : "");
    const def = (window.Battle && Battle.CHARACTERS && Battle.CHARACTERS[p.characterId]) || null;
    const vesselLabel = def ? `${def.name} "${def.code}"` : (p.characterId || "VESSEL 07");
    const name = document.createElement("span");
    name.className = "lobby-player__name";
    name.textContent = (p.name || "OPERATOR") + (p.playerId === myUid ? "（自分）" : "");
    const vessel = document.createElement("span");
    vessel.className = "lobby-player__vessel";
    vessel.textContent = vesselLabel;
    const flags = document.createElement("span");
    flags.className = "lobby-player__flags";
    const parts = [];
    if (p.isHost) parts.push("HOST");
    parts.push(p.ready ? "READY" : "未READY");
    if (p.conn && p.conn !== "online") parts.push("OFFLINE");
    flags.textContent = parts.join(" ／ ");
    li.append(name, vessel, flags);
    list.append(li);
  }
  if (!mpLobby.players.length) {
    const li = document.createElement("li");
    li.className = "lobby-player lobby-player--empty";
    li.textContent = "参加者を待っています…";
    list.append(li);
  }
  // 自分の ready 状態に合わせてボタンの文言を切り替える
  const mine = mpMyPlayerDoc();
  if (ui.lobbyReady) ui.lobbyReady.textContent = mine && mine.ready ? "READYを解除" : "READY";
  refreshLobbyStart();
}
function refreshLobbyStart() {
  if (!ui.lobbyStart) return;
  const host = !!(window.Net && Net.isHost());
  ui.lobbyStart.hidden = !host;
  const allReady = mpLobby.players.length > 0 && mpLobby.players.every((p) => p.ready);
  ui.lobbyStart.disabled = !(host && mpLobby.players.length >= 2 && allReady);
}
function renderLobbyRoom() {
  if (ui.lobbyCodeValue) ui.lobbyCodeValue.textContent = (window.Net && Net.roomCode()) || "------";
  const depth = mpLobby.room && mpLobby.room.depth;
  if (ui.lobbyDepthValue) {
    ui.lobbyDepthValue.textContent = depth ? `作戦深度 DEPTH ${String(depth).padStart(2, "0")}（ホスト選択）` : "";
  }
  renderLobbyPlayers();
}
function mpEnterRoom() {
  showLobbyPane(true);
  setLobbyStatus("");
  mpStartHeartbeat(); // 単位3-6: ルーム参加中は lastSeen を15秒間隔で更新する
  Net.onRoom((room) => {
    if (!mpLobby.active && !mpPickingVessel) return;
    if (!room) {
      // ルームが消えた（ホスト解散）。自分の退室操作中は静かに戻る
      if (!mpLobby.leaving && mpLobby.inRoom) {
        showLobbyPane(false);
        setLobbyStatus("ルームが解散されました");
      }
      mpLobby.room = null;
      mpLobby.inRoom = false;
      return;
    }
    mpLobby.room = room;
    renderLobbyRoom();
    // マルチプレイ段階(3) 単位3-3: ホストが開始したらゲストはランへ合流する
    if (room.status === "in-run" && window.Net && !Net.isHost() && window.MPSync) {
      MPSync.guestJoinRun(room);
    }
  });
  Net.onPlayers((players) => {
    mpLobby.players = Array.isArray(players) ? players : [];
    if (mpLobby.inRoom) renderLobbyPlayers();
  });
  renderLobbyRoom();
}
async function mpCreateRoom() {
  if (mpLobby.busy || !mpNetAvailable()) return;
  mpLobby.busy = true;
  setLobbyStatus("ルームを作成しています…");
  try {
    // MP-GUEST-FIX 課題4: selectedDepth は素体選択を開くまで初期値1のままなので、
    // 作成直行だと本人の解禁上限がルーム深度へ反映されない。
    // J-7 の初期値原則（解禁上限）に合わせて作成時に引き直す。
    selectedDepth = depthInitialValue();
    await Net.createRoom({ depth: selectedDepth });
    mpEnterRoom();
  } catch (e) {
    setLobbyStatus((e && e.message) || "ルームを作成できませんでした");
  } finally {
    mpLobby.busy = false;
  }
}
async function mpJoinRoom() {
  if (mpLobby.busy || !mpNetAvailable()) return;
  const code = ui.coopCode ? ui.coopCode.value : "";
  mpLobby.busy = true;
  setLobbyStatus("ルームへ参加しています…");
  try {
    await Net.joinRoom(code);
    mpEnterRoom();
  } catch (e) {
    setLobbyStatus((e && e.message) || "ルームへ参加できませんでした");
  } finally {
    mpLobby.busy = false;
  }
}
async function mpLeaveRoom() {
  if (mpLobby.busy) return;
  mpLobby.busy = true;
  mpLobby.leaving = true;
  mpStopHeartbeat(); // 単位3-6
  try { await Net.leaveRoom(); } catch (e) { /* noop */ }
  mpLobby.room = null;
  mpLobby.players = [];
  mpLobby.leaving = false;
  mpLobby.busy = false;
  showLobbyPane(false);
  setLobbyStatus("");
}
async function mpToggleReady() {
  const mine = mpMyPlayerDoc();
  if (!mine || mpLobby.busy) return;
  mpLobby.busy = true;
  try {
    await Net.updateMyPlayer({ ready: !mine.ready });
  } catch (e) {
    setLobbyStatus("READYを送信できませんでした");
  } finally {
    mpLobby.busy = false;
  }
}
function mpPickVessel() {
  const mine = mpMyPlayerDoc();
  if (mine && Battle.CHARACTERS[mine.characterId]) selectedVessel = mine.characterId;
  mpPickingVessel = true;
  closeLobby();
  openVesselSelect();
}
// VESSEL 選択の決定（ロビー経由）: ランは始めず、自分の players へ書いてロビーへ戻る。
// ホストの場合は選択深度もルームへ追随させる（ルームの depth が開始時の正になる）。
async function mpConfirmVesselPick(id) {
  selectedVessel = Battle.CHARACTERS[id] ? id : "vessel07";
  cueSE("switch");
  try {
    await Net.updateMyPlayer({ characterId: selectedVessel });
    if (Net.isHost()) {
      try { await Net.updateRoom({ depth: selectedDepth }); } catch (e) { /* noop */ }
    }
  } catch (e) {
    setLobbyStatus("素体の選択を送信できませんでした");
  }
  mpPickingVessel = false;
  showTitle(); // 背景をデスクのタイトルへ戻してからロビーを再表示する
  openLobby();
  showLobbyPane(true);
  renderLobbyRoom();
}
function mpStartRequested() {
  if (ui.lobbyStart && ui.lobbyStart.disabled) return;
  cueSE("switch");
  // 開始処理（status を in-run へ進め、パーティでランを開始する）は単位3-3 が担う。
  if (typeof window.MPOnLobbyStart === "function") {
    window.MPOnLobbyStart({
      code: Net.roomCode(),
      players: mpLobby.players.slice(),
      depth: mpLobby.room ? mpLobby.room.depth : selectedDepth,
    });
    return;
  }
  setLobbyStatus("開始処理は次の工程（単位3-3）で接続されます");
}
window.MPLobby = {
  state: mpLobby,
  open: openLobby,
  close: closeLobby,
  isPickingVessel: () => mpPickingVessel,
};
if (ui.coopBtn) {
  ui.coopBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (session.phase !== "attract") return;
    cueSE("switch");
    openLobby();
  });
}
if (ui.coopCreate) ui.coopCreate.addEventListener("click", () => { cueSE("switch"); void mpCreateRoom(); });
if (ui.coopJoin) ui.coopJoin.addEventListener("click", () => { cueSE("switch"); void mpJoinRoom(); });
if (ui.coopCode) ui.coopCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); void mpJoinRoom(); }
});
if (ui.lobbyReady) ui.lobbyReady.addEventListener("click", () => { cueSE("switch"); void mpToggleReady(); });
if (ui.lobbyPickVessel) ui.lobbyPickVessel.addEventListener("click", () => { cueSE("switch"); mpPickVessel(); });
if (ui.lobbyStart) ui.lobbyStart.addEventListener("click", () => { mpStartRequested(); });
if (ui.lobbyLeave) ui.lobbyLeave.addEventListener("click", () => { cueSE("switch"); void mpLeaveRoom(); });
if (ui.lobbyClose) ui.lobbyClose.addEventListener("click", async () => {
  cueSE("switch");
  if (window.Net && Net.roomCode()) await mpLeaveRoom();
  closeLobby();
});

// ============================================================
// マルチプレイ段階(3) 単位3-3〜3-6: 同期層（MP-STAGE3-IMPL-PLAN §1／§3 単位3-3〜3-6）
// ------------------------------------------------------------
// ・ホスト権威方式。正はホストのメモリ上のエンジン状態（battle ＋ per-player ラン記録）で、
//   Firestore は伝達媒体。乱数はホストだけが振る（ゲストは createState を呼ばない）。
// ・単位3-3: ロビーの開始で参加者全員の素体を party に入れてランを開始する。
//   PARTY_SCALING の適用（options.scaling=true）は MP 経路のみ。深度はルームの depth を
//   run.depth に使う接続点まで（ゲスト側の解禁記録は書かない）。MP中は saveGame を
//   無効化し、開始時に既存の単独オートセーブを破棄する。チュートリアルは立てない。
// ・単位3-4: ホストは状態が変わるたびに state/current へ全量スナップショットを書き、
//   ゲストは seq の進んだスナップショットだけを hydrate して描画する（J4: 楽観表示なし）。
//   ゲストの入力は intents（play-card／pick／end-turn）で送り、ホストが cseq 順に
//   直列処理して検証（Battle.canPlay／playFromHand）し、NG は黙って捨てる。
//   END TURN は全員の宣言が揃った時点でホストが敵フェイズを一括解決する（J5）。
// ・戦闘終了時は battle state から各 player の hp／noise をラン記録へ書き戻す。
// ・単位3-5: 戦闘外フェイズもホスト権威で同期する。マップ進路はホスト決定（投票は
//   段階(4)）で、スナップショットの route／runView でゲストが追随する。報酬はカードが
//   各自の3択（reward-pick intent）、レリック（共有プール）はホストが代表選択する。
//   イベントはホストが選択し、結果（ホスト素体＋共有レリックへの適用）を全員へ配る。
//   セーフハウスは各自が自分の素体へ safehouse-choice で処置し、破壊された素体は
//   入室時に healRate 連動の HP で自動復帰する。ラン終了（クリア／全滅）はホストが
//   確定し、ルームを finished にして締める。
// ・単位3-6: ハートビート（players の lastSeen を15秒間隔で更新、pagehide で
//   conn:"offline"）と、切断の表示だけを行う（自動防衛・ホスト移行は作らない）。
//   再入室は最新スナップショットの再描画のみで成立する。ホストのルーム解散を
//   ゲストが検知したら「ホストが切断されました」と表示してロビーへ戻す。
// ============================================================
const mpSession = {
  active: false, // MPラン中（ホスト／ゲスト共通）
  isHost: false,
  started: false, // ラン開始済み
  seq: 0, // ホスト: 発行済み最新 seq ／ ゲスト: 受信済み最新 seq
  players: [], // 参加者ドキュメントの控え（表示名・素体の参照用）
  records: [], // ホスト: per-player ラン記録 { playerId, characterId, hp, hpMax, noise, deck, alive }
  processedIntents: new Set(), // ホスト: 処理済み intent id
  lastCseq: {}, // ホスト: プレイヤーごとの最終処理 cseq（順序担保）
  intentChain: Promise.resolve(), // ホスト: intent の直列処理キュー
  guestLock: false, // ゲスト: intent 送信後〜次のスナップショットまでの入力ロック
  guestPhase: "", // ゲスト: 直近に処理したスナップショットのフェイズ（入場時処理の判定用）
  battleEndHandled: false, // 戦闘終了処理（勝利／全滅）の二重発火防止
  handSig: "", // ゲスト: 手札DOMの再構築判定（ドラッグ中の要素を壊さない）
  cctvKey: "", // ゲスト: CCTV 画像の差し替え判定
  logBuffer: [], // 直近ログ（スナップショットの log 用。pushLog が追記する）
  // ---- 単位3-5: 戦闘外フェイズの同期状態 ----
  reward: null, // ホスト: 報酬フェイズの状態 { stage, cardOffers, picks, relicPool, mapAdvance }
  safehouse: null, // ホスト: セーフハウスの状態 { choices: {playerId: 処置|null}, revived: [playerId] }
  eventView: null, // ホスト: ゲスト表示用のイベント提示 { title, text, chosenIndex, resultText }
  rewardSig: "", // ゲスト: 報酬画面の再描画判定
  guestRewardStage: "", // ゲスト: 直近スナップショットの報酬ステージ（入力ガード用）
  guestDeck: [], // ゲスト: セーフハウスの切断モーダル用に控えた自分のデッキ
  // ---- 単位3-6: 接続維持 ----
  connDown: new Set(), // 途絶を通知済みの playerId（復帰で外す）
  stateUpdatedAtMs: 0, // ゲスト: 直近スナップショットの updatedAt（ms）
  hostStaleWarned: false, // ゲスト: ホスト途絶の表示中フラグ
};
window.MPSyncLog = mpSession.logBuffer;

function mpPlayerName(playerId) {
  const doc = mpSession.players.find((p) => p.playerId === playerId);
  return doc ? (doc.name || "OPERATOR") : "OPERATOR";
}

// Firestore の Timestamp／Date／数値を ms へ寄せる（単位3-6 の生存判定用）
function mpTsMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

// ---- 単位3-3: ホスト側の開始配線 ----
async function mpHostStartRun(payload) {
  if (!window.Net || !Net.isHost() || mpSession.active) return;
  const players = (payload && Array.isArray(payload.players) ? payload.players : [])
    .filter((p) => p && p.playerId);
  if (players.length < 2) { setLobbyStatus("参加者が2人以上必要です"); return; }
  const depthRaw = payload && Number(payload.depth);
  const depth = Number.isInteger(depthRaw) ? Math.min(20, Math.max(1, depthRaw)) : 1;
  const profile = Battle.depthProfileFor(depth);
  mpSession.active = true;
  mpSession.isHost = true;
  mpSession.started = true;
  mpSession.players = players.slice();
  // per-player ラン記録: 初期デッキは素体ごとに組み、HPは素体の素の値を種から取る
  mpSession.records = players.map((p) => {
    const characterId = Battle.CHARACTERS[p.characterId] ? p.characterId : "vessel07";
    const seed = Battle.createState(undefined, { character: characterId });
    return {
      playerId: p.playerId,
      characterId,
      hp: seed.player.hp,
      hpMax: seed.player.hpMax,
      noise: profile.startNoise,
      deck: Battle.deckIdsFor(characterId),
      alive: true,
    };
  });
  const hostRec = mpSession.records.find((r) => r.playerId === Net.uid()) || mpSession.records[0];
  selectedVessel = hostRec.characterId;
  myPlayerId = Net.uid();
  clearSave(); // MP開始時に既存の単独オートセーブを削除する（以後 saveGame は無効化）
  session.linked = true;
  session.busy = false;
  session.dead = false;
  session.offer = [];
  routeToken += 1;
  run = {
    character: hostRec.characterId,
    depth,
    hp: hostRec.hp,
    hpMax: hostRec.hpMax,
    relics: Relics.issued(), // レリックは共有プール（runView.relics）
    relicsLost: [],
    relicUsed: {},
    deck: hostRec.deck.slice(),
    noise: profile.startNoise,
    kills: 0,
    mapIndex: 1,
    tutorialPending: false, // MPではチュートリアルを立てない
    mp: true,
  };
  markLayerArrived(run.mapIndex); // E-8: MPホスト側の記録として第1層への到達を記録
  route = PipelineMap.generate(undefined, { mapIndex: run.mapIndex, widths: MAP_WIDTHS_3M });
  resetTutorialState();
  preloadVesselCctv(hostRec.characterId);
  closeLobby();
  try { await Net.updateRoom({ status: "in-run", seq: 0 }); } catch (e) { /* noop */ }
  Net.onIntents((list) => { mpHostOnIntents(list); });
  // 単位3-6: ラン中も参加者ドキュメントを購読し、表示名と接続状態を最新に保つ
  Net.onPlayers((list) => { mpOnPlayersUpdate(list); });
  mpStartConnWatch();
  // MP-GUEST-FIX 課題1: ホストもタイトルから直接 CO-OP へ入った場合は BOOT を
  // 通らず .screen の is-on が付かない。ゲスト側と同じくラン開始時に画面ONを担保する。
  revealDesk();
  enterMap({
    applyRelics: true,
    extraLogs: ["経路図を展開。次のノードを選べ"],
    note: () => `光っているノードが次の区画。アナログスキャンは${route.scansLeft}回。`,
    tutorial: false,
  });
  mpPublish();
}
window.MPOnLobbyStart = mpHostStartRun;

// ---- 単位3-3: ゲスト側の合流 ----
function mpGuestJoinRun(room) {
  if (mpSession.active || !window.Net || Net.isHost()) return;
  const myDoc = mpLobby.players.find((p) => p.playerId === Net.uid());
  const characterId = myDoc && Battle.CHARACTERS[myDoc.characterId] ? myDoc.characterId : "vessel07";
  mpSession.active = true;
  mpSession.isHost = false;
  mpSession.started = true;
  mpSession.players = mpLobby.players.slice();
  mpSession.seq = 0;
  myPlayerId = Net.uid();
  selectedVessel = characterId;
  session.linked = true;
  session.busy = false;
  session.dead = false;
  session.offer = [];
  routeToken += 1;
  // ゲストの run は表示用のシェル。中身はスナップショットの runView で毎回上書きする
  run = {
    character: characterId,
    depth: room && room.depth ? room.depth : 1,
    hp: 0,
    hpMax: 1,
    relics: [],
    relicsLost: [],
    relicUsed: {},
    deck: [],
    noise: 0,
    kills: 0,
    mapIndex: 1,
    tutorialPending: false,
    mp: true,
  };
  route = null;
  resetTutorialState();
  closeLobby();
  Net.onState((snap) => { mpGuestOnSnapshot(snap); });
  // 単位3-6: 参加者ドキュメントの購読（表示名・接続状態）と、ホスト解散の検知。
  // ロビー側の onRoom はラン開始後は不活性になるため、ここでラン用に張り替える
  Net.onPlayers((list) => { mpOnPlayersUpdate(list); });
  Net.onRoom((room) => {
    if (!room && mpSession.active && !mpSession.isHost) mpGuestOnRoomGone();
  });
  mpStartConnWatch();
  // MP-GUEST-FIX 課題1: ゲストは起動（BOOT）フローを通らないため、画面の CRT 展開
  // （.screen の is-on）が一度も付かず、.screen__content が scale(1,0.02) のまま
  // 全フェイズが細い線に潰れる。ラン合流時にデスク表示＋画面ONを明示する。
  revealDesk();
  changeScene("MAP");
  ui.note.textContent = "ホストの作戦開始を待っている";
}

// ---- スナップショット（ホスト→全員） ----
function mpBuildRunView() {
  const inCombat = session.phase === "combat" && battle;
  const players = mpSession.records.map((rec) => {
    const bp = inCombat ? battle.players.find((p) => p.playerId === rec.playerId) : null;
    return {
      playerId: rec.playerId,
      characterId: rec.characterId,
      hp: bp ? bp.hp : rec.hp,
      hpMax: bp ? bp.hpMax : rec.hpMax,
      noise: bp ? (bp.noise || 0) : rec.noise,
      deckCount: bp
        ? bp.drawPile.length + bp.hand.length + bp.discard.length + (bp.exhaust ? bp.exhaust.length : 0)
        : rec.deck.length,
      alive: bp ? bp.hp > 0 : rec.alive,
    };
  });
  return {
    depth: run ? (run.depth || 1) : 1,
    mapIndex: run ? (run.mapIndex || 1) : 1,
    nodeId: route ? route.currentId : null,
    // ゲストのマップ閲覧用に route の全量も載せる（選択はホストのみ・単位3-5）
    route: route ? {
      nodes: route.nodes,
      originId: route.originId,
      currentId: route.currentId,
      scansLeft: route.scansLeft,
      scanMax: route.scanMax,
      floorCount: route.floorCount,
      mapIndex: route.mapIndex,
    } : null,
    players,
    relics: run ? (run.relics || []).slice() : [],
    kills: run ? (run.kills || 0) : 0,
  };
}

function mpPublish() {
  if (!mpSession.active || !mpSession.isHost || !window.Net) return;
  mpSession.seq += 1;
  const snapshot = {
    seq: mpSession.seq,
    phase: session.phase,
    battle: session.phase === "combat" && battle ? Battle.serializeState(battle) : null,
    runView: mpBuildRunView(),
    // 単位3-5: 戦闘外フェイズの配布物（該当フェイズ以外は null）
    offers: session.phase === "reward" ? mpBuildOffers() : null,
    eventView: session.phase === "event" ? mpSession.eventView : null,
    safehouse: session.phase === "safehouse" ? mpBuildSafehouseView() : null,
    log: mpSession.logBuffer.slice(-30),
  };
  Net.writeState(snapshot).catch((e) => { console.warn("[MP] writeState failed:", e); });
  Net.updateRoom({ seq: mpSession.seq }).catch(() => { /* noop */ });
}

// 単位3-5: イベント等の戦闘外でホストの run（＝ホスト素体の鏡＋共有レリック）へ
// 適用された結果を、ホストのラン記録へ書き戻す（レリックは run.relics が共有プール
// そのものなので対象外。hp／hpMax／デッキ／ノイズだけを記録側へ寄せる）
function mpWriteBackFromRun() {
  if (!run) return;
  const rec = mpSession.records.find((r) => r.playerId === Net.uid());
  if (!rec) return;
  rec.hp = Math.max(0, run.hp || 0);
  rec.hpMax = run.hpMax || rec.hpMax;
  rec.noise = Math.max(0, run.noise || 0);
  rec.deck = (run.deck || []).slice();
  rec.alive = rec.hp > 0;
}

// 戦闘終了時: battle state から各 player の hp／noise をラン記録へ書き戻す
function mpWriteBackFromBattle() {
  if (!battle) return;
  for (const rec of mpSession.records) {
    const p = battle.players.find((x) => x.playerId === rec.playerId);
    if (!p) continue;
    rec.hp = Math.max(0, p.hp);
    rec.hpMax = p.hpMax;
    rec.noise = Math.max(0, p.noise || 0);
    rec.alive = p.hp > 0;
  }
  const hostRec = mpSession.records.find((r) => r.playerId === Net.uid());
  if (hostRec && run) {
    run.hp = hostRec.hp;
    run.hpMax = hostRec.hpMax;
    run.noise = hostRec.noise;
  }
}

// 自素体（ホスト自身／対象プレイヤー）が倒れたときの共通処理
function mpOnPlayerDown(player) {
  if (!player) return;
  pushLog("VESSEL DOWN — 通信途絶");
  ui.note.textContent = "通信途絶。素体は失われた。";
  if (battle && Battle.isPartyDown(battle)) { void mpBattleDefeat(); return; }
  mpPublish();
}

async function mpBattleVictory() {
  if (!battle || mpSession.battleEndHandled) return;
  mpSession.battleEndHandled = true;
  setBossAlert(false);
  if (run && !battle.killCounted) { battle.killCounted = true; run.kills = (run.kills || 0) + 1; }
  if (run && !battle.victoryRelicsApplied) {
    battle.victoryRelicsApplied = true;
    for (const line of Relics.applyVictory(battle)) pushLog(line);
  }
  mpWriteBackFromBattle();
  const here = route && route.nodes ? route.nodes[route.currentId] : null;
  const isBoss = !!(here && here.hiddenType === "BOSS");
  if (isBoss && run && (run.mapIndex || 1) >= 3) {
    // 第3層ボス撃破＝ランクリア。深度クリア演出はホスト端末でのみ再生し、
    // ゲストはスナップショット経由でクリア画面へ追随する（計画 §3-5）
    await bossClearSequence();
    try { await Net.updateRoom({ status: "finished" }); } catch (e) { /* noop */ }
    mpPublish();
    return;
  }
  // 単位3-5: 報酬フェイズを開始する（カードは各自の3択・レリックはホスト代表選択）
  mpStartRewardPhase(isBoss, here);
}

async function mpBattleDefeat() {
  if (mpSession.battleEndHandled) return;
  mpSession.battleEndHandled = true;
  mpWriteBackFromBattle();
  await mpRunDefeat();
}

// 単位3-5: ランの敗北確定（戦闘の全滅・戦闘外での全素体喪失の共通先）。
// ルームを finished にして締め、全員を GAMEOVER 画面へ追随させる
async function mpRunDefeat() {
  session.dead = true;
  session.busy = false;
  bossBgm = false;
  setBossAlert(false);
  pushLog("ALL VESSELS DOWN — 通信途絶");
  ui.note.textContent = "通信途絶。全素体との接続が失われた。";
  changeScene("GAMEOVER");
  slotIdleLabel();
  try { await Net.updateRoom({ status: "finished" }); } catch (e) { /* noop */ }
  mpPublish();
}

// ---- 単位3-5: 報酬フェイズ（カードは各自の3択／レリックはホスト代表選択） ----
// 戦闘勝利のたびにホストが全員分のカード3択を引き、スナップショットの offers で配る。
// 各プレイヤーは自分の3択から1枚（または見送り）を選び、全員分がそろったら次段へ進む。
// レリック（共有プール）の3択はソロと同じ presentRelicOffer をホスト画面で操作し、
// 候補だけを offers.relicOffer としてゲストへ見せる（ドラフト式は段階(4)）。
function mpStartRewardPhase(isBoss, here) {
  const rewardFactor = Battle.depthProfileFor(run && run.depth ? run.depth : 1).rewardFactor;
  const cardOffers = {};
  if (window.Rewards) {
    for (const rec of mpSession.records) {
      const offered = Rewards.offer(Rewards.OFFER_COUNT, undefined, rec.characterId, rewardFactor);
      cardOffers[rec.playerId] = offered.map((c) => c.id);
    }
  }
  // レリック判定はソロ openReward と同じ（ELITE→通常／第1・2層ボス→ボスプール）
  let relicPool = null;
  if (window.Rewards) {
    const drop = relicDropForNode(here, run);
    if (drop) relicPool = drop;
  }
  mpSession.reward = {
    stage: "cards",
    cardOffers,
    picks: {},
    relicPool,
    mapAdvance: !!isBoss, // 第1・2層ボスは報酬完了後に次マップへ（第3層はクリア分岐済み）
  };
  // 提示が空のプレイヤーは選ぶものがないため、見送りとして先に確定させる
  for (const rec of mpSession.records) {
    if (!(cardOffers[rec.playerId] || []).length) mpSession.reward.picks[rec.playerId] = null;
  }
  // ホスト自身の提示はソロと同じ報酬画面（session.offer 経由）へ載せる
  const hostOffers = cardOffers[Net.uid()] || [];
  session.offer = window.Rewards
    ? hostOffers.map((id) => Rewards.card(id)).filter(Boolean)
    : [];
  session.busy = false;
  changeScene("REWARD");
  slotIdleLabel();
  ui.contact.textContent = "残骸回収";
  ui.link.textContent = "SALVAGE";
  renderRewardOffers();
  renderRelics();
  ui.note.textContent = "抽出された3枚から1枚を選べ。他の隊員も回収中だ。";
  mpPublish();
  // 全員分の提示が空なら選択を待たずに次段へ
  if (mpSession.records.every((r) => Object.prototype.hasOwnProperty.call(mpSession.reward.picks, r.playerId))) {
    void mpAdvanceRewardFlow();
  }
}

// スナップショットの offers を組む（報酬フェイズ中だけ呼ばれる）
function mpBuildOffers() {
  const rw = mpSession.reward;
  const relicOffer = relicOfferState && Array.isArray(relicOfferState.candidates)
    ? relicOfferState.candidates.map((r) => r.id)
    : null;
  if (!rw && !relicOffer) return null;
  return {
    cardOffers: rw ? rw.cardOffers : {},
    picks: rw ? { ...rw.picks } : {},
    relicOffer,
    stage: rw ? rw.stage : (relicOffer ? "relic" : null),
  };
}

function mpUpdateRewardNote() {
  const rw = mpSession.reward;
  if (!rw) return;
  const total = mpSession.records.length;
  const done = Object.keys(rw.picks).length;
  ui.note.textContent = `回収済み ${done}/${total} — 全員の回収を待っている`;
}

// ホスト自身の選択（claimReward／skipReward からの分岐先）
function mpHostRewardPick(id) {
  if (!mpSession.isHost || session.phase !== "reward") return;
  mpApplyRewardPick(Net.uid(), id != null ? id : null);
}

// ゲストの選択: reward-pick intent で送り、確定は次のスナップショットで裏付ける
function mpGuestRewardPick(id) {
  if (mpSession.isHost || session.phase !== "reward" || mpSession.guestLock) return;
  if (mpSession.guestRewardStage && mpSession.guestRewardStage !== "cards") return;
  mpSession.guestLock = true;
  void mpGuestSendIntent("reward-pick", { cardId: id != null ? id : null });
  if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
  if (ui.rewardSecured) ui.rewardSecured.hidden = false;
  ui.note.textContent = "回収を送信した — ホストの確定を待っている";
}

// 報酬選択の適用（ホスト自身・ゲストの intent 共通）。提示外のカードや二重選択は捨てる
function mpApplyRewardPick(playerId, cardId) {
  const rw = mpSession.reward;
  if (!rw || rw.stage !== "cards" || session.phase !== "reward") return;
  if (Object.prototype.hasOwnProperty.call(rw.picks, playerId)) return;
  const rec = mpSession.records.find((r) => r.playerId === playerId);
  if (!rec) return;
  const offers = rw.cardOffers[playerId] || [];
  if (cardId != null && !offers.includes(cardId)) return;
  if (cardId != null) {
    if (!window.Rewards || !Rewards.grant(rec.deck, cardId)) return;
    if (playerId === Net.uid() && run) Rewards.grant(run.deck, cardId);
    const card = Rewards.card(cardId);
    pushLog(`DECK +1  ${card ? card.name : cardId}  [${mpPlayerName(playerId)}]`);
    rw.picks[playerId] = cardId;
  } else {
    pushLog(`SALVAGE  見送った  [${mpPlayerName(playerId)}]`);
    rw.picks[playerId] = null;
  }
  if (playerId === Net.uid()) {
    session.offer = [];
    if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
    if (ui.rewardSecured) ui.rewardSecured.hidden = false;
  }
  mpPublish();
  if (mpSession.records.every((r) => Object.prototype.hasOwnProperty.call(rw.picks, r.playerId))) {
    void mpAdvanceRewardFlow();
  } else {
    mpUpdateRewardNote();
  }
}

// 全員のカード選択がそろった後の進行: レリック（ホスト代表選択）→次マップ or 経路復帰
async function mpAdvanceRewardFlow() {
  const rw = mpSession.reward;
  if (!rw || rw.stage !== "cards") return;
  const relicPool = rw.relicPool;
  const mapAdvance = rw.mapAdvance;
  rw.stage = "done"; // 以後の reward-pick は受け付けない（再入防止）
  if (relicPool) {
    rw.stage = "relic";
    ui.note.textContent = "部品の回収 — 接続するものを選んでいる";
    mpPublish();
    const offerPromise = presentRelicOffer(relicPool);
    mpPublish(); // 候補（offers.relicOffer）をゲストへ配る
    await offerPromise;
    if (!mpSession.active || session.phase !== "reward") { mpSession.reward = null; return; }
  }
  mpSession.reward = null;
  session.offer = [];
  if (mapAdvance) {
    // 次マップ開始時の開始NOISEフロア（ソロ advanceToNextMap の run.noise 処理）を全員分へ
    const floor = Battle.depthProfileFor(run && run.depth ? run.depth : 1).startNoise;
    for (const rec of mpSession.records) rec.noise = Math.max(rec.noise || 0, floor);
    await advanceToNextMap();
    mpPublish();
  } else {
    mpReturnToMapFromReward();
  }
}

// 報酬完了後の経路復帰（ソロ finishCombat の MP 版。戦闘状態には触れない）
function mpReturnToMapFromReward() {
  session.offer = [];
  session.busy = false;
  ui.ambush.hidden = true;
  ui.shotCall.hidden = true;
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  changeScene("MAP");
  slotIdleLabel();
  pushLog("経路へ復帰");
  const hostRec = mpSession.records.find((r) => r.playerId === Net.uid());
  ui.note.textContent = `光っているノードが、次に進める区画だ。デッキは${hostRec ? hostRec.deck.length : 0}枚。`;
  renderRelics();
  renderRoute();
  syncEndButton();
  mpPublish();
}

// ゲストの報酬画面: 自分の3択だけを操作可能に描く（他人の分は状態表示のみ）
function mpGuestRenderReward(snap) {
  const offers = snap.offers;
  if (!offers) { ui.note.textContent = "残骸回収 — ホストが報酬を処理している"; return; }
  const myUid = Net.uid();
  mpSession.guestRewardStage = offers.stage || "";
  const picked = !!(offers.picks && Object.prototype.hasOwnProperty.call(offers.picks, myUid));
  const sig = JSON.stringify([
    offers.cardOffers && offers.cardOffers[myUid], picked, offers.relicOffer, offers.stage,
  ]);
  if (sig === mpSession.rewardSig) return;
  mpSession.rewardSig = sig;
  if (offers.relicOffer) {
    if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
    if (ui.rewardSecured) ui.rewardSecured.hidden = true;
    ui.note.textContent = "ホストが部品（レリック）を選んでいる";
    return;
  }
  if (picked) {
    if (ui.rewardOffers) ui.rewardOffers.replaceChildren();
    if (ui.rewardSecured) ui.rewardSecured.hidden = false;
    const total = offers.picks ? Object.keys(offers.cardOffers || {}).length : 0;
    const done = offers.picks ? Object.keys(offers.picks).length : 0;
    ui.note.textContent = `回収済み — 他の隊員の回収を待っている（${done}/${total}）`;
    return;
  }
  const mine = (offers.cardOffers && offers.cardOffers[myUid]) || [];
  session.offer = mine
    .map((id) => (window.Rewards && Rewards.card(id)) || Battle.card(id))
    .filter(Boolean);
  renderRewardOffers();
  if (ui.rewardSkip) ui.rewardSkip.hidden = false;
  ui.note.textContent = "抽出された3枚から1枚を選べ。ダブルクリック、またはリーダへドラッグでデッキに加わる。見送りは SKIP。";
}

// ---- 単位3-5: セーフハウス（各自が自分の素体へ処置／破壊素体は自動復帰） ----
// 入室時に全員のノイズを 0 にし、破壊された素体は healRate 連動の HP で自動復帰させる。
// 処置（排熱＝自分の素体を healRate で回復／切断＝自分のデッキから1枚削除）は各自が
// 1回だけ行い、全員分がそろったら経路へ戻る。
function mpEnterSafehouse() {
  if (!run) return;
  safehouseToken += 1;
  window.clearTimeout(zippoTimer);
  safehouseChosen = false;
  safehouseLeft = false;
  session.busy = true;
  session.advance = false;
  const healRate = Battle.depthProfileFor(run.depth || 1).healRate;
  const revived = [];
  for (const rec of mpSession.records) {
    rec.noise = 0;
    if (!rec.alive || rec.hp <= 0) {
      rec.hp = safehouseHeal(0, rec.hpMax, healRate);
      rec.alive = rec.hp > 0;
      revived.push(rec.playerId);
      pushLog(`REBOOT  ${mpPlayerName(rec.playerId)}  HP ${rec.hp} で復帰`);
    }
  }
  run.noise = 0;
  const hostRec = mpSession.records.find((r) => r.playerId === Net.uid());
  if (hostRec) {
    run.hp = hostRec.hp;
    run.hpMax = hostRec.hpMax;
    run.deck = hostRec.deck.slice();
  }
  mpSession.safehouse = {
    choices: Object.fromEntries(mpSession.records.map((r) => [r.playerId, null])),
    revived,
  };
  // 画面初期化（ソロ openSafehouse の見た目に合わせる）
  ui.ambush.hidden = true;
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  ui.shotCall.hidden = true;
  ui.deckModal.hidden = true;
  ui.deckList.replaceChildren();
  ui.safehouseChoices.hidden = true;
  ui.safehouseChoices.classList.remove("is-in");
  ui.safehouseVent.disabled = false;
  ui.safehouseSever.disabled = false;
  ui.safehouseVent.classList.remove("is-chosen");
  ui.safehouseSever.classList.remove("is-chosen");
  ui.safehouseLine.textContent = "";
  ui.safehouseLine.classList.remove("is-speaking");
  ui.link.textContent = "SAFEHOUSE";
  changeScene("SAFEHOUSE");
  slotIdleLabel();
  renderRelics();
  syncEndButton();
  const token = safehouseToken;
  const live = () => token === safehouseToken && session.phase === "safehouse";
  typeText(ui.safehouseLine, SAFEHOUSE_LINE, live, { gap: 28, caret: true, printer: true }).then((ok) => {
    if (!ok || !live()) return;
    revealSafehouseChoices();
  });
  mpPublish();
}

// スナップショットの safehouse を組む（切断モーダル用に各自のデッキも載せる）
function mpBuildSafehouseView() {
  const st = mpSession.safehouse;
  if (!st) return null;
  const decks = {};
  for (const rec of mpSession.records) decks[rec.playerId] = rec.deck.slice();
  return { choices: { ...st.choices }, decks, revived: st.revived.slice() };
}

// 処置の適用（ホスト自身・ゲストの intent 共通）。選択済みの変更と範囲外の切断は捨てる
function mpSafehouseApplyChoice(playerId, choice, severIndex) {
  if (!mpSession.isHost || session.phase !== "safehouse" || !mpSession.safehouse) return;
  const st = mpSession.safehouse;
  if (st.choices[playerId]) return;
  const rec = mpSession.records.find((r) => r.playerId === playerId);
  if (!rec) return;
  if (choice === "vent") {
    const healRate = Battle.depthProfileFor(run && run.depth ? run.depth : 1).healRate;
    const before = rec.hp;
    rec.hp = safehouseHeal(before, rec.hpMax, healRate);
    pushLog(`VENT  ${mpPlayerName(playerId)}  HP ${before} > ${rec.hp}`);
    st.choices[playerId] = "vent";
  } else if (choice === "sever") {
    if (!Number.isInteger(severIndex) || severIndex < 0 || severIndex >= rec.deck.length) return;
    const id = rec.deck[severIndex];
    const card = Battle.card(id);
    rec.deck.splice(severIndex, 1);
    pushLog(`SEVER  ${mpPlayerName(playerId)}  -1  ${card ? card.name : id}`);
    st.choices[playerId] = "sever";
  } else {
    return;
  }
  if (playerId === Net.uid() && run) {
    run.hp = rec.hp;
    run.deck = rec.deck.slice();
  }
  mpPublish();
  if (Object.values(st.choices).every(Boolean)) {
    mpLeaveSafehouseAll();
  } else if (playerId === Net.uid()) {
    ui.note.textContent = "処置済み — 他の隊員の選択を待っている";
  }
}

// 全員の処置がそろったら経路へ戻る
function mpLeaveSafehouseAll() {
  mpSession.safehouse = null;
  clearSafehouseChrome();
  cueSE("machine_insert");
  pushLog("SAFEHOUSE  経路へ復帰");
  changeScene("MAP");
  session.busy = false;
  ui.note.textContent = "鉛壁を離れた。";
  ui.ambush.hidden = true;
  slotIdleLabel();
  renderRelics();
  renderRoute();
  syncEndButton();
  mpPublish();
}

// ホストの切断モーダル: 自分のラン記録のデッキを run.deck へ鏡写ししてから一覧を出す
function mpSafehouseOpenSeverDeck() {
  const hostRec = mpSession.records.find((r) => r.playerId === Net.uid());
  if (!hostRec || !mpSession.safehouse || mpSession.safehouse.choices[Net.uid()]) return;
  if (hostRec.deck.length === 0) {
    ui.note.textContent = "切る思考が残っていない。";
    return;
  }
  if (run) run.deck = hostRec.deck.slice();
  fillDeckModal();
  ui.deckModal.hidden = false;
}

// ゲストの切断モーダル: スナップショットで受け取った自分のデッキから一覧を出す
function mpGuestOpenSeverDeck() {
  if (mpSession.guestLock) return;
  const ids = mpSession.guestDeck || [];
  if (!ids.length) {
    ui.note.textContent = "切る思考が残っていない。";
    return;
  }
  if (ui.deckList) {
    ui.deckList.replaceChildren();
    ids.forEach((id, index) => {
      const item = document.createElement("li");
      item.append(safehouseRow(id, index));
      ui.deckList.append(item);
    });
  }
  ui.deckModal.hidden = false;
}

// ゲストのセーフハウス画面: 自分の処置だけを操作可能にし、進捗をノートへ出す
function mpGuestRenderSafehouse(snap) {
  const sh = snap.safehouse;
  if (ui.safehouseLine) ui.safehouseLine.textContent = SAFEHOUSE_LINE;
  ui.link.textContent = "SAFEHOUSE";
  const myUid = Net.uid();
  mpSession.guestDeck = (sh && sh.decks && sh.decks[myUid]) || [];
  const myChoice = sh && sh.choices ? sh.choices[myUid] : null;
  const total = sh && sh.choices ? Object.keys(sh.choices).length : 0;
  const done = sh && sh.choices ? Object.values(sh.choices).filter(Boolean).length : 0;
  if (!myChoice) {
    if (ui.safehouseChoices) {
      ui.safehouseChoices.hidden = false;
      ui.safehouseChoices.classList.add("is-in");
    }
    if (ui.safehouseVent) ui.safehouseVent.disabled = !!mpSession.guestLock;
    if (ui.safehouseSever) ui.safehouseSever.disabled = !!mpSession.guestLock;
    ui.note.textContent = "セーフハウス — 自分の素体への処置を選べ（排熱／切断）";
  } else {
    if (ui.safehouseChoices) ui.safehouseChoices.hidden = true;
    if (ui.deckModal) ui.deckModal.hidden = true;
    ui.note.textContent = `処置済み — 他の隊員の選択を待っている（${done}/${total}）`;
  }
}

// ゲストのイベント画面: ホストの選択と結果を追随表示する（選択肢は出さない）
function mpGuestRenderEvent(snap) {
  const ev = snap.eventView;
  if (!ev) { ui.note.textContent = "通信を受信している"; return; }
  if (ui.eventTitle) ui.eventTitle.textContent = ev.title || "";
  if (ui.eventLine) ui.eventLine.textContent = ev.text || "";
  if (ui.eventChoices) { ui.eventChoices.hidden = true; ui.eventChoices.replaceChildren(); }
  if (ui.eventReturn) ui.eventReturn.hidden = true;
  ui.link.textContent = "CARRIER";
  if (ev.resultText) {
    if (ui.eventAftermath) ui.eventAftermath.hidden = false;
    if (ui.eventResult) { ui.eventResult.hidden = false; ui.eventResult.textContent = ev.resultText; }
    ui.note.textContent = "結果は全員に適用された — ホストが経路へ戻るのを待っている";
  } else {
    if (ui.eventAftermath) ui.eventAftermath.hidden = true;
    if (ui.eventResult) ui.eventResult.hidden = true;
    ui.note.textContent = "ホストが応答を選択している";
  }
}

// ---- 単位3-3: MPホストの戦闘開始（party＋PARTY_SCALING） ----
async function beginCombatMP(encounter) {
  session.busy = true;
  session.advance = false;
  mpSession.battleEndHandled = false;
  const party = mpSession.records.map((rec) => ({
    playerId: rec.playerId,
    characterId: rec.characterId,
    deck: rec.deck.slice(),
    hp: rec.hp,
    hpMax: rec.hpMax,
    noise: rec.noise,
  }));
  battle = Battle.createState(undefined, {
    party,
    scaling: true, // PARTY_SCALING の適用は MP 経路のみ ON（ソロ経路は未指定＝無効のまま）
    relics: run.relics,
    relicUsed: run.relicUsed,
    depthProfile: Battle.depthProfileFor(run.depth || 1),
    encounterType: encounter && encounter.type ? encounter.type : null,
  });
  for (const p of battle.players) Battle.syncAlertBuff(battle, p);
  if (!(encounter.enemyId && Battle.applyEnemy(battle, encounter.enemyId))) {
    battle.enemy.name = encounter.name;
    battle.enemy.hp = encounter.hp;
    battle.enemy.hpMax = encounter.hp;
    // BUG-1 修正（MP-STAGE3-VERIFY-REPORT）: enemyId の無い encounter（BATTLE ノード等）では
    // createState で倍率適用済みの敵 HP を素の値で上書きしてしまうため、applyEnemy と同じ
    // 順序（人数倍率 → 深度倍率）・同じ取得方法で HP にだけ倍率を再適用する。攻撃パターンの
    // 倍率とスタン段階は createState 時点の敵オブジェクト側に残っているため、ここでは
    // 触らない（触ると二重適用になる）。
    const scaling = battle.scaling;
    if (scaling) {
      const partyHpMul = Battle.isBossEnemy(battle.enemy) ? scaling.bossHp : scaling.hp;
      battle.enemy.hpMax = Math.max(1, Math.round((battle.enemy.hpMax || 0) * partyHpMul));
      battle.enemy.hp = battle.enemy.hpMax;
    }
    const depthProfile = battle.depthProfile;
    if (depthProfile) {
      battle.enemy.hpMax = Math.max(1, Math.round((battle.enemy.hpMax || 0) * (depthProfile.hpMul || 1)));
      battle.enemy.hp = battle.enemy.hpMax;
    }
  }
  const opened = Battle.startCombat(battle);
  bossBgm = encounter.type === "BOSS";
  // 深度クリア演出（J-12）: 第3層ボス戦の開始時にその深度の一枚絵を preload（ホスト端末のみ）
  if (bossBgm && run && (run.mapIndex || 1) >= 3 && window.DepthClear) {
    window.DepthClear.preloadForContext({ depth: run.depth || null });
  }
  lowHpBgmActive = false;
  changeScene("BATTLE");
  ui.ambush.hidden = true;
  ui.link.textContent = "CARRIER LOCK";
  ui.contact.textContent = encounter.name;
  ui.enemyName.textContent = encounter.short || encounter.name;
  setCctvImage((battle.enemy && battle.enemy.image) || encounter.image || "", encounter.name, encounter.type);
  preloadEnemyCctv(battle.enemy);
  ui.slotLabel.textContent = "READER LIVE";
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
  ui.hopper.replaceChildren();
  resetHandSeen(); // MP戦闘開始: 初期手札は全枚が新規到着
  ui.log.replaceChildren();
  const here = route && route.nodes[route.currentId];
  if (here && here.isFake) pushLog("WARNING: AMBUSH");
  pushLog(`ENGAGE  ${encounter.name}`);
  for (const line of opened.log) pushLog(line);
  renderRelics();
  // 全員分のターン開始（ドロー）を解決し、自分の分だけ手札UIへ載せる
  let myDrawn = [];
  for (const p of battle.players) {
    const started = Battle.beginPlayerTurn(battle, undefined, p);
    for (const line of started.log) pushLog(line);
    if (p.playerId === myPlayerId) myDrawn = started.drawn || [];
  }
  spawn(myDrawn.map(face));
  lastNoiseShown = myPlayer().noise;
  renderCombat();
  renderPiles();
  refreshHand();
  session.busy = false;
  syncEndButton();
  mpPublish();
}

// ---- 単位3-4: ホストの intent 処理（購読→直列処理→適用→配布→削除） ----
function mpHostOnIntents(list) {
  if (!mpSession.active || !mpSession.isHost || !Array.isArray(list)) return;
  for (const intent of list) {
    if (!intent || !intent.id || !intent.playerId) continue;
    if (mpSession.processedIntents.has(intent.id)) continue;
    // 順序担保: そのプレイヤーの cseq が連続している intent だけを処理する。
    // 先行分が未着なら今回は見送り、次の購読で改めて処理する。
    const last = mpSession.lastCseq[intent.playerId] || 0;
    if (typeof intent.cseq === "number" && intent.cseq !== last + 1) continue;
    mpSession.processedIntents.add(intent.id);
    if (typeof intent.cseq === "number") mpSession.lastCseq[intent.playerId] = intent.cseq;
    mpSession.intentChain = mpSession.intentChain
      .then(() => mpApplyIntent(intent))
      .catch((e) => { console.warn("[MP] intent chain error:", e); });
  }
}

async function mpApplyIntent(intent) {
  try {
    const payload = intent.payload || {};
    // 単位3-5: 戦闘外フェイズの intent（報酬の選択・セーフハウスの処置）
    if (session.phase === "reward" && intent.type === "reward-pick") {
      mpApplyRewardPick(intent.playerId, payload.cardId != null ? payload.cardId : null);
    } else if (session.phase === "safehouse" && intent.type === "safehouse-choice") {
      mpSafehouseApplyChoice(intent.playerId, payload.choice, payload.index);
    } else if (battle && session.phase === "combat" && !mpSession.battleEndHandled) {
      const player = battle.players.find((p) => p.playerId === intent.playerId);
      if (player) {
        if (intent.type === "play-card") await mpApplyPlayCard(player, payload);
        else if (intent.type === "pick") await mpApplyPick(player, payload);
        else if (intent.type === "end-turn") {
          if (player.hp > 0 && !battle.enemy.dead) await mpDeclareEndTurn(player);
        }
        // 未知の type・フェイズ違いの intent は黙って捨てる
      }
    }
  } catch (e) {
    console.warn("[MP] intent apply failed:", e);
  } finally {
    try { await Net.deleteIntent(intent.id); } catch (e) { /* noop */ }
    mpPublish();
  }
}

async function mpApplyPlayCard(player, payload) {
  if (player.hp <= 0 || !battle || battle.enemy.dead) return;
  // 対象選択: 敵は単体のみ。targetId が現在の敵と一致しない intent は古い入力として捨てる
  if (payload.targetId && battle.enemy.id && payload.targetId !== battle.enemy.id) return;
  let card = (typeof payload.handIndex === "number") ? player.hand[payload.handIndex] : null;
  if (!card || (payload.cardId && card.id !== payload.cardId)) {
    card = player.hand.find((c) => c.id === payload.cardId && (!payload.uid || c.__uid === payload.uid))
      || player.hand.find((c) => c.id === payload.cardId)
      || null;
  }
  if (!card) return;
  const check = Battle.canPlay(battle, card, player);
  if (!check.ok) return; // 検証 NG は黙って捨てる
  const result = Battle.playFromHand(battle, card.id, card.__uid || 0, player);
  if (!result.ok) return;
  pushLog(`READ  ${card.name}  [${mpPlayerName(player.playerId)}]`);
  for (const line of result.log) pushLog(line);
  if (battle.enemy.dead) { await mpBattleVictory(); return; }
  if (player.hp <= 0) pushLog("VESSEL DOWN — 通信途絶");
  if (Battle.isPartyDown(battle)) { await mpBattleDefeat(); return; }
  renderCombat();
  renderPiles();
}

async function mpApplyPick(player, payload) {
  if (!battle) return;
  // 『磁気ホールド』の保持選択（end-turn の直前に送られる）
  if (payload && payload.kind === "hold") {
    if (payload.uid) {
      const heldCard = player.hand.find((c) => c.__uid === payload.uid);
      if (heldCard && Battle.setRetained(battle, payload.uid, player)) {
        pushLog(`HOLD ${heldCard.name}（次ターン PWR −1）`);
      }
    }
    return;
  }
  if (!player.pendingPick) return;
  const candidates = Battle.pickCandidates(battle, player);
  const index = payload && typeof payload.index === "number" ? payload.index : -1;
  const chosen = index >= 0 && index < candidates.length ? candidates[index] : null;
  const res = Battle.resolvePick(battle, chosen ? chosen.id : null, player);
  for (const line of res.log) pushLog(line);
  renderCombat();
  renderPiles();
}

// ターン終了宣言（ホスト自身・ゲスト共通）。全員が揃ったら敵フェイズを一括解決する
async function mpDeclareEndTurn(player) {
  if (!battle || battle.enemy.dead || mpSession.battleEndHandled) return;
  const result = Battle.endTurn(battle, undefined, player);
  if (!result.allReady) { mpPublish(); return; }
  await mpAfterEnemyPhase(result);
}

async function mpAfterEnemyPhase(result) {
  for (const line of result.log || []) pushLog(line);
  if (battle.enemy.dead) { await mpBattleVictory(); return; }
  if (Battle.isPartyDown(battle) || result.partyDown) { await mpBattleDefeat(); return; }
  // 次ターン開始後の自素体の手札を描き直す（ドロー分は perPlayer に入っている）
  const mine = myPlayer();
  ui.hopper.replaceChildren();
  resetHandSeen(); // MPターン境界: 次ターンのドローは全枚が新規到着
  if (mine) spawn(mine.hand.map(face));
  mpSession.handSig = mine ? mine.hand.map((c) => (c.__uid || 0) + ":" + c.id).join(",") : "";
  renderCombat();
  renderPiles();
  // SEARCH-RESHUFFLE: ドローでリシャッフルが起きていたら共通演出を出す（演出はホスト端末のみ・従来どおり）
  noteReshuffleFromLog(result.log);
  refreshHand();
  session.busy = false;
  syncEndButton();
  mpPublish();
}

async function mpHostEndTurn() {
  if (session.phase !== "combat" || session.busy || drag || radioOpen) return;
  if (window.AnimPres && AnimPres.isPlaying()) return;
  if (holdPick || pickPick) return;
  if (!battle || myPlayer().hp <= 0 || battle.enemy.dead) return;
  if (myPlayer().ready) return;
  // GHOST-TAPE は敵フェイズの前に HOLD 選択フェイズを挟む（ソロと同じ）
  if (myCharacterId() === "vessel09" && holdCandidatesExist()) { openHoldSelect(); return; }
  session.busy = true;
  syncEndButton();
  await mpDeclareEndTurn(myPlayer());
  session.busy = false;
  renderCombat();
  syncEndButton();
}

// ---- 単位3-4: ゲストの入力（intent 化） ----
async function mpGuestSendIntent(type, payload) {
  try { await Net.sendIntent(type, payload || {}); }
  catch (e) { mpSession.guestLock = false; }
}

function mpGuestPlayCard(data) {
  if (mpSession.guestLock) return;
  const me = myPlayer();
  if (!me || me.hp <= 0 || !battle || battle.enemy.dead || me.ready) return;
  let index = data.uid ? me.hand.findIndex((c) => c.__uid && c.__uid === Number(data.uid)) : -1;
  if (index < 0) index = me.hand.findIndex((c) => c.id === data.id);
  if (index < 0) return;
  const card = me.hand[index];
  // 可否はホストが正として検証する。ここでは明らかな不可だけ弾く
  const check = Battle.canPlay(battle, card, me);
  if (!check.ok) { pushLog(`REJECT  ${data.name}  ${reasonText(check.reason)}`); return; }
  // MP-GUEST-FIX 課題6: ホスト側の使用と同じ打鍵音をローカルで鳴らす。
  // 状態の楽観表示ではなく音だけであり、確定は従来どおりスナップショットで裏付ける。
  if (audio && audio.playPunch) audio.playPunch(Math.max(0, card.noise || 0));
  mpSession.guestLock = true;
  void mpGuestSendIntent("play-card", {
    handIndex: index,
    cardId: card.id,
    uid: card.__uid || 0,
    targetId: battle.enemy && battle.enemy.id ? battle.enemy.id : null,
  });
}

function mpGuestSendEndTurn() {
  if (mpSession.guestLock) return;
  mpSession.guestLock = true;
  void mpGuestSendIntent("end-turn", {});
  ui.endTurn.disabled = true;
}

function mpGuestEndTurn() {
  if (session.phase !== "combat" || mpSession.guestLock) return;
  if (holdPick || pickPick) return;
  if (!battle || myPlayer().hp <= 0 || battle.enemy.dead) return;
  if (myPlayer().ready) return;
  if (myCharacterId() === "vessel09" && holdCandidatesExist()) { openHoldSelect(); return; }
  mpGuestSendEndTurn();
}

// ---- 単位3-4: ゲストの描画（スナップショット追随） ----
const MP_PHASE_SCENE = {
  title: "TITLE", vessel: "VESSEL", map: "MAP", safehouse: "SAFEHOUSE",
  event: "EVENT", combat: "BATTLE", reward: "REWARD", gameover: "GAMEOVER", clear: "CLEAR",
};

function mpGuestApplyRunView(rv) {
  if (!rv || !run) return;
  run.depth = rv.depth || run.depth;
  run.mapIndex = rv.mapIndex || run.mapIndex;
  run.kills = rv.kills || 0;
  run.relics = Array.isArray(rv.relics) ? rv.relics.slice() : run.relics;
  const mine = Array.isArray(rv.players) ? rv.players.find((p) => p.playerId === Net.uid()) : null;
  if (mine) {
    run.hp = mine.hp;
    run.hpMax = mine.hpMax;
    run.noise = mine.noise;
  }
  if (rv.route && rv.route.nodes) {
    const nodes = rv.route.nodes;
    const floors = [];
    for (let f = 1; f <= (rv.route.floorCount || 0); f += 1) {
      floors.push(Object.values(nodes).filter((n) => n.floor === f).sort((a, b) => a.index - b.index));
    }
    const links = [];
    for (const node of Object.values(nodes)) {
      for (const to of node.edges || []) links.push({ from: node.id, to });
    }
    route = {
      floors, nodes, links,
      originId: rv.route.originId,
      currentId: rv.route.currentId,
      scansLeft: rv.route.scansLeft,
      scanMax: rv.route.scanMax,
      floorCount: rv.route.floorCount,
      mapIndex: rv.mapIndex || 1,
    };
  }
}

function mpGuestRenderLog(lines) {
  ui.log.replaceChildren();
  for (const text of lines.slice(-8)) {
    const line = document.createElement("p");
    line.className = "term-line";
    if (String(text).startsWith("WARNING")) line.classList.add("is-alert");
    line.textContent = `> ${text}`;
    ui.log.append(line);
  }
  ui.log.scrollTop = ui.log.scrollHeight;
}

function mpGuestRenderCombat() {
  const enemy = battle.enemy;
  const cctvKey = (enemy.id || "") + "|" + (enemy.image || "");
  if (cctvKey !== mpSession.cctvKey) {
    mpSession.cctvKey = cctvKey;
    ui.enemyName.textContent = enemy.name || "";
    ui.contact.textContent = enemy.name || "";
    setCctvImage(enemy.image || "", enemy.name, battle.encounterType || "BATTLE");
    ui.slotLabel.textContent = "READER LIVE";
  }
  renderCombat();
  renderPiles();
  const me = myPlayer();
  const sig = me ? me.hand.map((c) => (c.__uid || 0) + ":" + c.id).join(",") : "";
  if (sig !== mpSession.handSig) {
    mpSession.handSig = sig;
    ui.hopper.replaceChildren();
    if (me) spawn(me.hand.map(face));
  }
  refreshHand();
  syncEndButton();
  if (me && me.ready) {
    ui.endTurn.disabled = true;
    ui.endTurn.textContent = "宣言済み — 待機中";
  } else if (mpSession.guestLock) {
    ui.endTurn.disabled = true;
  }
  // 自分の選択保留が立っていたら選択フェイズを開く（確定は pick intent 経由）
  if (me && me.pendingPick && me.hp > 0 && !enemy.dead && !pickPick && !mpSession.guestLock && !pickOpenDelayed) {
    // SEARCH-RESHUFFLE: サーチでリシャッフルが起きていたら、選択UIの前に演出を見せる
    if (me.pendingPick.reshuffled) {
      pickOpenDelayed = true;
      presentReshuffle().then(() => {
        pickOpenDelayed = false;
        const cur = myPlayer();
        if (cur && cur.pendingPick && cur.hp > 0 && battle && !battle.enemy.dead && !pickPick && !mpSession.guestLock) openPickSelect();
      });
    } else {
      openPickSelect();
    }
  }
  mpRenderAllyBar();
}

function mpGuestOnSnapshot(snap) {
  if (!mpSession.active || mpSession.isHost) return;
  if (!snap || typeof snap.seq !== "number") return;
  if (snap.seq <= mpSession.seq) return; // 巻き戻り・重複は捨てる
  mpSession.seq = snap.seq;
  mpSession.guestLock = false;
  session.busy = false;
  // 単位3-6: ホスト途絶の判定用にスナップショットの更新時刻を控える
  const snapMs = mpTsMs(snap.updatedAt);
  if (snapMs > mpSession.stateUpdatedAtMs) {
    mpSession.stateUpdatedAtMs = snapMs;
    mpSession.hostStaleWarned = false;
  }
  if (snap.runView) mpGuestApplyRunView(snap.runView);
  // 報酬画面の再描画ガードはフェイズを跨いで持ち越さない（次の報酬で同じ提示でも描き直す）
  if (snap.phase !== "reward") {
    mpSession.rewardSig = "";
    mpSession.guestRewardStage = "";
  }
  if (snap.battle) bossBgm = snap.battle.encounterType === "BOSS";
  // MP-GUEST-FIX 課題3: フェイズ入場の判定（戦闘ノートは入場時にだけ差し替える。
  // 毎スナップショットで書くと選択フェイズ等の文言を潰してしまう）
  const mpPhaseEntered = snap.phase !== mpSession.guestPhase;
  mpSession.guestPhase = snap.phase;
  const sceneName = MP_PHASE_SCENE[snap.phase] || "MAP";
  if (currentScene !== sceneName) changeScene(sceneName);
  if (Array.isArray(snap.log)) mpGuestRenderLog(snap.log);
  if (snap.phase === "map") {
    renderRelics();
    renderRoute();
    syncEndButton();
    ui.note.textContent = "ホストが経路を選択している";
  } else if (snap.phase === "combat" && snap.battle) {
    const hydrated = Battle.hydrateState(snap.battle);
    if (hydrated) {
      battle = hydrated;
      // MP-GUEST-FIX 課題3: 戦闘入場時にマップ側の待機文言を戦闘用へ差し替える
      // （ホストの beginCombatMP が出す初期ノートと同一文言）
      if (mpPhaseEntered) ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
      mpGuestRenderCombat();
    }
  } else if (snap.phase === "reward") {
    mpGuestRenderReward(snap);
  } else if (snap.phase === "safehouse") {
    mpGuestRenderSafehouse(snap);
  } else if (snap.phase === "event") {
    mpGuestRenderEvent(snap);
  } else if (snap.phase === "clear") {
    ui.note.textContent = "作戦完了 — 全層を突破した";
  } else if (snap.phase === "gameover") {
    ui.note.textContent = "通信途絶。全素体との接続が失われた。";
  }
}

// ---- 単位3-6: 接続維持の最小限（ハートビート／切断の表示／再入室） ----
// ハートビート: ルーム参加中は自分の players の lastSeen を15秒間隔で更新する
// （Net.updateMyPlayer が lastSeen を serverTimestamp で上書きする）。タブを閉じる
// ときは pagehide で conn:"offline" をベストエフォートで書き、相手の表示に残す。
let mpHeartbeatTimer = 0;
let mpConnWatchTimer = 0;

function mpStartHeartbeat() {
  if (mpHeartbeatTimer) return;
  const beat = () => {
    if (window.Net && Net.roomCode()) {
      Net.updateMyPlayer({ conn: "online" }).catch(() => { /* noop */ });
    }
  };
  beat();
  mpHeartbeatTimer = window.setInterval(beat, 15000);
}

function mpStopHeartbeat() {
  if (mpHeartbeatTimer) window.clearInterval(mpHeartbeatTimer);
  mpHeartbeatTimer = 0;
}

window.addEventListener("pagehide", () => {
  if (window.Net && Net.roomCode()) {
    Net.updateMyPlayer({ conn: "offline" }).catch(() => { /* noop */ });
  }
});

// ラン中の参加者ドキュメント更新（ロビー側の控えと同期層の控えを両方最新に保つ）
function mpOnPlayersUpdate(list) {
  if (!Array.isArray(list)) return;
  mpSession.players = list.slice();
  mpLobby.players = list.slice();
}

// ゲスト: ホストがルームを解散した（＝ホスト切断。移行なし・J10）らロビーへ戻す
function mpGuestOnRoomGone() {
  if (!mpSession.active || mpSession.isHost) return;
  showTitle(); // blankDesk → MPSync.reset（ラン中だったため退室処理も走る）
  openLobby();
  setLobbyStatus("ホストが切断されました");
}

function mpStartConnWatch() {
  if (mpConnWatchTimer) return;
  mpConnWatchTimer = window.setInterval(mpConnWatchTick, 5000);
}

function mpStopConnWatch() {
  if (mpConnWatchTimer) window.clearInterval(mpConnWatchTimer);
  mpConnWatchTimer = 0;
}

// 切断の検知は「表示」だけに留める（自動防衛・進行の確定は作らない。計画 §3-6／§4）
function mpConnWatchTick() {
  if (!mpSession.active || !window.Net) return;
  const now = Date.now();
  for (const doc of mpSession.players) {
    if (!doc || doc.playerId === Net.uid()) continue;
    const seenMs = mpTsMs(doc.lastSeen);
    const offline = doc.conn === "offline" || (seenMs > 0 && now - seenMs > 45000);
    const known = mpSession.connDown.has(doc.playerId);
    if (offline && !known) {
      mpSession.connDown.add(doc.playerId);
      const name = doc.name || "OPERATOR";
      if (mpSession.isHost) {
        pushLog(`LINK LOST  ${name} の通信が途絶えた可能性`);
        mpPublish();
      }
      ui.note.textContent = `${name} の通信が途絶えた可能性があります`;
    } else if (!offline && known) {
      mpSession.connDown.delete(doc.playerId);
      if (mpSession.isHost) {
        pushLog(`LINK RESTORED  ${doc.name || "OPERATOR"}`);
        mpPublish();
      }
    }
  }
  // ゲスト側: スナップショットの updatedAt が45秒以上止まったらホスト途絶を表示する
  if (!mpSession.isHost && mpSession.stateUpdatedAtMs > 0) {
    const stale = now - mpSession.stateUpdatedAtMs > 45000;
    if (stale && !mpSession.hostStaleWarned) {
      mpSession.hostStaleWarned = true;
      ui.note.textContent = "ホストとの通信が途絶えた可能性があります";
    }
  }
}

// ---- 味方簡易バー（名前・HP・BLK・手札枚数・READY） ----
function mpRenderAllyBar() {
  const bar = ui.mpAllyBar;
  if (!bar) return;
  if (!mpSession.active || session.phase !== "combat" || !battle || !Array.isArray(battle.players)) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  bar.replaceChildren();
  for (const p of battle.players) {
    const def = Battle.CHARACTERS[p.characterId] || {};
    const item = document.createElement("span");
    item.className = "mp-ally"
      + (p.playerId === myPlayerId ? " is-me" : "")
      + (p.hp <= 0 ? " is-down" : "");
    const parts = [
      mpPlayerName(p.playerId),
      def.code ? `"${def.code}"` : (def.name || p.characterId),
      `HP ${Math.max(0, p.hp)}/${p.hpMax}`,
      `BLK ${p.block || 0}`,
      `手札 ${p.hand ? p.hand.length : 0}`,
    ];
    if (p.hp <= 0) parts.push("DOWN");
    else if (p.ready) parts.push("READY");
    item.textContent = parts.join(" ");
    bar.append(item);
  }
}

function mpReset() {
  // 単位3-6: ランを開始していた場合だけ退室する（ホストはルーム解散＝ラン終了）。
  // ロビー滞在中のタイトル往復（素体選択の showTitle 等）では解散しないよう、
  // started が立っていない間は通信文脈に触れない
  const wasStarted = mpSession.started;
  mpStopHeartbeat();
  mpStopConnWatch();
  if (wasStarted && window.Net && Net.roomCode()) {
    Net.leaveRoom().catch(() => { /* noop */ });
  }
  mpSession.active = false;
  mpSession.isHost = false;
  mpSession.started = false;
  mpSession.seq = 0;
  mpSession.players = [];
  mpSession.records = [];
  mpSession.processedIntents.clear();
  mpSession.lastCseq = {};
  mpSession.intentChain = Promise.resolve();
  mpSession.guestLock = false;
  mpSession.battleEndHandled = false;
  mpSession.handSig = "";
  mpSession.cctvKey = "";
  mpSession.logBuffer.length = 0;
  // 単位3-5／3-6 の状態も畳む
  mpSession.reward = null;
  mpSession.safehouse = null;
  mpSession.eventView = null;
  mpSession.rewardSig = "";
  mpSession.guestRewardStage = "";
  mpSession.guestDeck = [];
  mpSession.connDown.clear();
  mpSession.stateUpdatedAtMs = 0;
  mpSession.hostStaleWarned = false;
  myPlayerId = null;
  if (ui.mpAllyBar) ui.mpAllyBar.hidden = true;
}

window.MPSync = {
  state: mpSession,
  publish: mpPublish,
  renderAllyBar: mpRenderAllyBar,
  guestJoinRun: mpGuestJoinRun,
  reset: mpReset,
  onSceneChanged() {
    if (mpSession.active && mpSession.isHost && mpSession.started) mpPublish();
  },
};

ui.skip.addEventListener("click", skip);
ui.broadcast.addEventListener("click", (event) => {
  if (event.target.closest(".skip")) return;
  if (session.phase !== "cinema") return;
  session.advance = true;
});
ui.attract.addEventListener("click", () => {
  // v14.7: 開始導線は NEW GAME ボタンへ一本化。画面クリックは音声アンロックのみ
  if (audio) audio.unlock();
});
if (ui.newgameBtn) {
  ui.newgameBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (session.phase !== "attract") return;
    trackEvent("/event/ep-game-start", "EP Game Start"); // v15.4: プレイ開始を数える
    vesselSelectSuppress = false; // 正式版フェーズ1: NEW GAME ではキャラ選択を挟む
    launchFromAttract();
  });
}
if (ui.installCta) {
  // インストール導線内のタップではゲームを開始しない
  ui.installCta.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
if (ui.continueBtn) {
  // PROMPT-24: CONTINUE 内のタップでは新規開始せず、セーブから復元する
  ui.continueBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (session.phase !== "attract") return;
    trackEvent("/event/ep-continue", "EP Continue"); // v15.4
    restoreRun();
  });
}
if (ui.soundToggle) {
  ui.soundToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!audio) return;
    audio.setMuted(!audio.muted);
    applyVideoMute();
    refreshSoundToggle();
  });
}
refreshSoundToggle();
// BATTLE-ANIM JOB 0-2: 演出速度 ×1／×2（U-5）。タイトル設定（サウンド切替の隣）に配置し
// localStorage に保存する。×2 でも SE は短縮しない——SE は命中点のフックで発火するため、
// 再生器の速度は「命中フレームの時刻」を半分にするだけで、音そのものは切らない・縮めない。
let animSpeed = loadAnimSpeed();
function refreshAnimSpeedToggle() {
  if (ui.animSpeedToggle) ui.animSpeedToggle.textContent = `[ ANIM: ×${animSpeed} ]`;
}
if (window.AnimPres) AnimPres.setSpeed(animSpeed);
if (ui.animSpeedToggle) {
  ui.animSpeedToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    animSpeed = animSpeed === 2 ? 1 : 2;
    saveAnimSpeed(animSpeed);
    if (window.AnimPres) AnimPres.setSpeed(animSpeed);
    refreshAnimSpeedToggle();
  });
}
refreshAnimSpeedToggle();
// JOB 0-2: CCTV タップで現在の1手を即完了させる逃げ道（設計 §6）。
// 再生中以外は何もしない。スキップ時も表示は論理値へ完全一致する（再生器の finishDisplay が保証）。
if (ui.cctvMonitor) {
  ui.cctvMonitor.addEventListener("pointerdown", () => {
    if (window.AnimPres && AnimPres.isPlaying()) AnimPres.skipCurrent();
  });
}
if (ui.tutorialBtn) {
  // チュートリアルから開始: 完了フラグを消してから通常の起動フローへ（BOOT通信から再体験できる）
  ui.tutorialBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (session.phase !== "attract") return;
    trackEvent("/event/ep-tutorial-start", "EP Tutorial Start"); // v15.4
    try { localStorage.removeItem(TUTORIAL_STORE); } catch { /* noop */ }
    vesselSelectSuppress = true; // 正式版フェーズ1: チュートリアルは従来どおり VESSEL 07 前提（キャラ選択を挟まない）
    launchFromAttract();
  });
}
if (ui.archiveBtn) {
  // 回想（回収記録 RECOVERED RECORDS）: タイトルから到達済み深度の演出を再読する（J-8）
  ui.archiveBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (session.phase !== "attract") return;
    if (window.DepthClear) window.DepthClear.openArchive();
  });
}
if (ui.archiveBtnDesk) {
  // 端末（デスク内タイトルシート）からの回想導線
  ui.archiveBtnDesk.addEventListener("click", (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    if (window.DepthClear) window.DepthClear.openArchive();
  });
}
if (ui.installBtn) {
  ui.installBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (audio) audio.unlock();
    // 手順が開いているときは、まず閉じる（プロンプト再発火の有無に左右されない決定的な挙動にする）
    if (ui.installHow && !ui.installHow.hidden) {
      ui.installHow.hidden = true;
      return;
    }
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      let accepted = false;
      let responded = false;
      try {
        // ダイアログが返らない環境でも固まらないよう、応答には上限を設ける
        const promptResult = await Promise.race([
          promptEvent.prompt(),
          new Promise((resolve) => setTimeout(() => resolve("timeout"), 2500)),
        ]);
        if (promptResult !== "timeout") {
          const outcome = await Promise.race([
            promptEvent.userChoice,
            new Promise((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);
          responded = outcome !== null && outcome !== undefined;
          accepted = responded && outcome.outcome === "accepted";
        }
      } catch { responded = true; }
      if (accepted) {
        ui.installCta.hidden = true;
        return;
      }
      // 応答が無い環境では手動手順にフォールバックする
      if (!responded && ui.installHow) ui.installHow.hidden = false;
      refreshInstallCta();
      return;
    }
    // インストールプロンプトが使えない環境では、手動手順を表示する
    if (ui.installHow) ui.installHow.hidden = !ui.installHow.hidden;
  });
}
ui.diveBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (audio) audio.unlock();
  diveFromTitle();
});
ui.introVideo.addEventListener("click", () => {
  if (attractStage === "title") diveFromTitle();
});
ui.start.addEventListener("click", () => {
  if (audio) audio.unlock();
  if (session.phase !== "title" || session.busy) return;
  openRoute();
});
// 正式版フェーズ1: キャラ選択カルーセルの操作（回転／決定）
if (ui.vesselPrev) ui.vesselPrev.addEventListener("click", () => { if (session.phase === "vessel") rotateVessel(-1); });
if (ui.vesselNext) ui.vesselNext.addEventListener("click", () => { if (session.phase === "vessel") rotateVessel(1); });
if (ui.vesselLaunch) ui.vesselLaunch.addEventListener("click", () => {
  if (session.phase !== "vessel") return;
  const id = ui.vesselLaunch.dataset.vessel;
  if (!id || id.startsWith("locked")) return;
  // マルチプレイ段階(3) 単位3-2: ロビーからの素体選択ではランを開始せず、
  // 選択結果を自分の players ドキュメントへ書いてロビーへ戻る
  if (mpPickingVessel) { void mpConfirmVesselPick(id); return; }
  chooseVessel(id);
});
// 作戦深度ステッパー（§4.1）: 操作時は深度ブロックだけを更新し、カルーセルは再描画しない
if (ui.depthPrev) ui.depthPrev.addEventListener("click", () => {
  if (session.phase !== "vessel") return;
  stepDepth(-1);
});
if (ui.depthNext) ui.depthNext.addEventListener("click", () => {
  if (session.phase !== "vessel") return;
  stepDepth(1);
});
ui.restart.addEventListener("click", () => {
  if (audio) audio.unlock();
  if (session.phase !== "gameover") return;
  showTitle();
});
ui.endTurn.addEventListener("click", (event) => {
  event.stopPropagation();
  onEndTurn();
});
// 『磁気ホールド』選択フェイズの決定ボタン群
if (ui.holdConfirm) ui.holdConfirm.addEventListener("click", (event) => {
  event.stopPropagation();
  void finishHoldSelect(true);
});
if (ui.holdNone) ui.holdNone.addEventListener("click", (event) => {
  event.stopPropagation();
  void finishHoldSelect(false);
});
if (ui.holdBack) ui.holdBack.addEventListener("click", (event) => {
  event.stopPropagation();
  closeHoldSelect();
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
});
// 共通プール拡張の選択フェイズの決定ボタン
if (ui.pickConfirm) ui.pickConfirm.addEventListener("click", (event) => {
  event.stopPropagation();
  finishPickSelect();
});
// 通信送り（2026-11-17 UX修正。旧 ui.screen の click ハンドラから移行）:
// 通信表示中は通信パネルの内外を問わず、画面のどこを押しても進む（戦闘以外＝MAP/BOOT の通信でも同様）。
// pointerdown で拾うのは、カード操作等の preventDefault で click が潰れる経路でも効かせるため。
// 表示中（印字中）のタップはその行を即時完了させ、表示済みのタップは次行へ送る。
// ボタン内のタップは本来の動作（SOUND切替・END TURN等）を優先して進めない。
document.addEventListener("pointerdown", (event) => {
  if (!radioOpen) return;
  if (event.target.closest && event.target.closest("button")) return;
  if (radioReady) {
    advanceRadio();
    return;
  }
  session.advance = true; // 印字中のタップ → その行を即時完了させる
});
ui.routeReturn.addEventListener("click", () => {
  if (session.phase === "reward") skipReward();
});
ui.rewardSkip.addEventListener("click", () => {
  skipReward();
});
if (ui.relicOffersPass) ui.relicOffersPass.addEventListener("click", () => {
  // 第0陣 0-5: レリック提示の見送り（§1.2「回収しない」）
  if (relicOfferState) { pushLog("RELIC SALVAGE  見送った"); closeRelicOffer(null); }
});
function returnToTerminal() {
  if (audio) audio.unlock();
  if (session.phase !== "clear") return;
  // クリア画面を抜けたらボスBGMは役目を終える（ゆっくりフェードアウト）
  // JOB 3M-3: 専用クリア画面の「タイトルへ戻る」導線（全面オーバーレイ #clear-return と
  // デスク内シート #return-terminal の共通先）。showTitle() で BGM はタイトル曲へ戻り、
  // UX修正5 以降は死亡時と同じく attract のタイトルメニューへ着地する
  // （BOOT カードの arm は NEW GAME 等が選ばれた後の起動フローに任せる）。
  bossBgm = false;
  if (audio) audio.fadeSeconds = 1.6;
  showTitle(); // presentAttractMenu 内で全面黒レイヤー（#clear-screen）も消える
  if (audio) audio.fadeSeconds = 0.7;
}
ui.returnTerminal.addEventListener("click", returnToTerminal);
if (ui.clearReturn) ui.clearReturn.addEventListener("click", returnToTerminal);
// v15.3: クレジットカードのタップ（印字中＝スキップ／完了後＝アンロックしてタイトルへ）
if (ui.creditCard) ui.creditCard.addEventListener("click", () => { creditCardTap(); });
refreshClearShare(); // v15.3: POST TO X の href を初期状態でも戦績なし文面で用意しておく
ui.rewardOffers.addEventListener("pointerover", (event) => {
  if (event.pointerType && event.pointerType !== "mouse") return;
  const card = event.target.closest(".punchcard");
  if (card) focusCard(card);
});
let lastOfferTap = { id: null, at: 0 };
ui.rewardOffers.addEventListener("click", (event) => {
  const card = event.target.closest(".punchcard");
  if (!card) return;
  focusCard(card);
  const now = Date.now();
  if (lastOfferTap.id === card.dataset.id && now - lastOfferTap.at < 500) {
    lastOfferTap = { id: null, at: 0 };
    claimReward(card.dataset.id);
  } else {
    lastOfferTap = { id: card.dataset.id, at: now };
  }
});
ui.rewardOffers.addEventListener("dblclick", (event) => {
  const card = event.target.closest(".punchcard");
  if (card) claimReward(card.dataset.id);
});
let offerDrag = null;
ui.rewardOffers.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".punchcard");
  if (!card || session.phase !== "reward") return;
  focusCard(card);
  const rect = card.getBoundingClientRect();
  offerDrag = { el: card, id: card.dataset.id, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
  card.setPointerCapture(event.pointerId);
});
ui.rewardOffers.addEventListener("pointermove", (event) => {
  if (!offerDrag) return;
  const el = offerDrag.el;
  el.style.position = "fixed";
  el.style.left = `${event.clientX - offerDrag.dx}px`;
  el.style.top = `${event.clientY - offerDrag.dy}px`;
  el.style.zIndex = "60";
});
ui.rewardOffers.addEventListener("pointerup", (event) => {
  if (!offerDrag) return;
  const { el, id } = offerDrag;
  offerDrag = null;
  const slotRect = ui.slot.getBoundingClientRect();
  // PROMPT-24: 報酬ドラッグでもリーダーの判定を広げる（手札側の overSlot と揃える）
  const overSlot = event.clientX >= slotRect.left - 20 && event.clientX <= slotRect.right + 20
    && event.clientY >= slotRect.top - 40 && event.clientY <= slotRect.bottom + 28;
  el.style.position = "";
  el.style.left = "";
  el.style.top = "";
  el.style.zIndex = "";
  if (overSlot) claimReward(id);
});
ui.eventChoices.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  pickEvent(Number(button.dataset.index));
});
ui.eventReturn.addEventListener("click", closeEvent);
ui.safehouseVent.addEventListener("click", ventHeat);
ui.safehouseSever.addEventListener("click", openSever);
ui.deckList.addEventListener("click", (event) => {
  const button = event.target.closest(".deck-row");
  if (!button || button.disabled) return;
  severCard(Number(button.dataset.index));
});
if (ui.deckModalBack) ui.deckModalBack.addEventListener("click", () => { closeSeverPicker(); });
ui.scan.addEventListener("click", onScan);
ui.routeFloors.addEventListener("click", (event) => {
  const button = event.target.closest(".node");
  if (!button || button.disabled) return;
  chooseNode(button.dataset.id);
});
window.addEventListener("resize", () => {
  if (session.phase === "map") paintLinks();
});


function drawGlass(time) {
  const canvas = ui.glass;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#03140c";
  ctx.fillRect(0, 0, w, h);
  if (!session.linked || rect.width < 2) {
    ctx.fillStyle = "#9dffb0";
    for (let i = 0; i < 70; i += 1) {
      const x = (Math.sin(i * 12.3 + time * 0.002) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 4.7 + time * 0.004) * 0.5 + 0.5) * h;
      ctx.globalAlpha = 0.15 + (i % 5) * 0.08;
      ctx.fillRect(x, y, 2 * dpr, 2 * dpr);
    }
    ctx.globalAlpha = 1;
  } else {
    const horizon = h * 0.38;
    ctx.strokeStyle = "rgba(150,255,180,0.38)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    for (let i = -8; i <= 8; i += 1) {
      ctx.moveTo(w / 2, horizon);
      ctx.lineTo(w / 2 + i * w * 0.12, h);
    }
    for (let y = horizon; y < h; y += 16 * dpr) {
      const p = (y - horizon) / (h - horizon);
      ctx.moveTo(w * 0.5 - p * w * 0.72, y);
      ctx.lineTo(w * 0.5 + p * w * 0.72, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#e7fff0";
    ctx.strokeRect(w * 0.30, h * 0.62, 12 * dpr, 12 * dpr);
    if (!battle.enemy.dead) {
      if (battle.enemy.stun >= battle.enemy.stunMax) ctx.strokeStyle = "#ff8d7a";
      else if (battle.enemy.stun > 0) ctx.strokeStyle = "#ffd27a";
      else ctx.strokeStyle = battle.noise >= 3 ? "#ff8d7a" : "#ffd27a";
      ctx.strokeRect(w * 0.64, h * 0.5, 14 * dpr, 20 * dpr);
    }
  }
  window.requestAnimationFrame(drawGlass);
}

window.setInterval(() => {
  if (!ui.cctvTime) return;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  ui.cctvTime.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}, 500);

buildMeter();
renderCombat();
window.requestAnimationFrame(drawGlass);
beginAttract();
