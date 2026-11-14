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
  // v14.3 配線メモ（bgm-prompts-2026-11-12）: EVENT はマップ曲を流用、SAFEHOUSE はマップ曲＋換気扇環境音
  SAFEHOUSE: "map",
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
async function maybeAlertIntro() {
  if (alertIntroSeen() || !battle || session.phase !== "combat") return;
  if (battle.player.hp <= 0 || battle.enemy.dead) return;
  if ((battle.noise || 0) < 3) return;
  markAlertIntroSeen();
  await presentRadio([GRAY_ALERT_LINE]);
}
const GRAY_PINCH = "パンドラ、応答しろ！ ……おい、死ぬんじゃないぞ。作戦よりお前の命が最優先だ！";
const GRAY_WIN = "見事だ。……昔のようには動かんと言ったが、杞憂だったな。先へ進もう。";
const GRAY_BOSS = "気をつけろパンドラ。パイプラインの最深部……防壁AIの直属防衛ユニットだ。これまでの雑魚とは火力が違うぞ。";
const GRAY_CLEAR = "……やったか。見事だパンドラ。第一防壁の突破を確認した。これで本丸に近づける。……ひとまずは帰還しろ、酒を奢ってやる。";
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
};

function isCurse(card) {
  return !!(card && (card.unplayable || card.type === "curse" || card.cost < 0
    || (card.effects || []).some((effect) => effect.type === "unplayable")));
}

function blurb(card) {
  const parts = [];
  if (isCurse(card)) return "呪装。リーダは受け付けない";
  if (card.requirements.includes("target_stun_ge_1")) parts.push("要スタン");
  if (card.requirements.includes("target_stun_max")) parts.push("要スタン最大");
  for (const effect of card.effects) {
    if (effect.type === "damage" && effect.target === "player") parts.push(`自傷 ${effect.value}`);
    else if (effect.type === "damage" && effect.pierce) parts.push(`ダメージ ${effect.value}（貫通）`);
    else if (effect.type === "damage" && effect.hits && effect.hits > 1) parts.push(`ダメージ ${effect.value} ×${effect.hits}回`);
    else if (effect.type === "damage") parts.push(`ダメージ ${effect.value}`);
    if (effect.type === "stun") parts.push(`スタン +${effect.value}`);
    if (effect.type === "block") parts.push(`防護 +${effect.value}`);
    if (effect.type === "cancel_next_intent") parts.push("次の行動を潰す");
    if (effect.type === "vulnerable") parts.push("脆弱 +1");
    if (effect.type === "instant_kill") parts.push("その場で制圧");
    if (effect.type === "add_energy") parts.push(effect.overcharge ? `電力 +${effect.value}（上限突破）` : `電力 +${effect.value}`);
    if (effect.type === "add_card_to_discard") parts.push("捨て札に呪装");
    if (effect.type === "heal") parts.push(`HP回復 +${effect.value}`);
    if (effect.type === "drain_energy") parts.push("残りPWR全喪失");
    if (effect.type === "damage_per_noise") parts.push(`ダメージ ターン開始時ノイズ×${effect.value}`);
    if (effect.type === "block_per_noise") parts.push(`防護 +ターン開始時ノイズ×${effect.value}`);
    if (effect.type === "damage_plus_noise") parts.push(`ダメージ ${effect.value}＋ノイズ×${effect.per}`);
    if (effect.type === "block_plus_noise") parts.push(`防護 +${effect.value}＋ノイズ×${effect.per}`);
    if (effect.type === "damage_plus_played") parts.push(`ダメージ ${effect.value}＋このターンの使用枚数×${effect.per}`);
    if (effect.type === "tread") parts.push("このターン、被ダメージをノイズ分だけ固定軽減");
    if (effect.type === "draw_penalty_next") parts.push(`次のターンのドロー -${effect.value}`);
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
  return {
    id: card.id,
    code: CODE_BY_ID[card.id] || CODE_BY_TYPE[card.type] || "ORD",
    name: card.name,
    cost: card.cost,
    noise: card.noise,
    stance: card.stance_change || "",
    ink: INK_BY_CATEGORY[card.category] || "cqc",
    exhaust: !!card.isExhaust,
    curse,
    oversized,
    flavor: card.flavor || "",
    rules: oversized ? `[ERROR: OVERSIZED VESSEL] COVER不発 → BLK +5 / NOISE +1 に変換（${rules}）` : rules,
    text: card.flavor || blurb(card),
  };
}

function reasonText(reason) {
  if (reason === "energy") return "電力不足";
  if (reason === "target_stun_ge_1") return "スタン不足";
  if (reason === "target_stun_max") return "スタン未最大";
  if (reason === "dead") return "すでに無力";
  if (reason === "down") return "通信途絶";
  if (reason === "curse") return "呪装は拒否";
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
  power: $("power"),
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
  hpBar: $("hp-bar"),
  hpGhost: $("hp-bar-ghost"),
  dmgVin: $("dmg-vignette"),
  energy: $("energy-value"),
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
  breach: $("breach"),
  contact: $("contact-name"),
  intent: $("intent"),
  shotCall: $("shot-call"),
  enemyAction: $("enemy-action"),
  intentBanner: $("intent-banner"),
  bossPulse: $("boss-pulse"),
  endTurn: $("end-turn"),
  routeReturn: $("route-return"),
  piles: $("piles"),
  glass: $("glass-canvas"),
  cctvScene: $("cctv-scene"),
  cctvRoom: $("cctv-room"),
  cctvEnemy: $("cctv-enemy"),
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
  relicTip: $("relic-tip"),
  relicTipName: $("relic-tip-name"),
  relicTipBody: $("relic-tip-body"),
  relicTipEffect: $("relic-tip-effect"),
  start: $("start-run"),
  restart: $("restart-run"),
  safehouseLine: $("safehouse-line"),
  safehouseChoices: $("safehouse-choices"),
  safehouseVent: $("safehouse-vent"),
  safehouseSever: $("safehouse-sever"),
  deckModal: $("deck-modal"),
  deckList: $("deck-modal-list"),
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
  clearScreen: $("clear-screen"),
  clearReturn: $("clear-return"),
  clearShare: $("clear-share"),
  creditCard: $("credit-card"),
  creditBy: $("credit-by"),
  creditName: $("credit-name"),
  creditStart: $("credit-start"),
  soundToggle: $("sound-toggle"),
  prologue: $("prologue"),
  prologueTerm: $("prologue-term"),
  prologuePrompt: $("prologue-prompt"),
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
const GAME_PAGE_URL = "https://mamyxmamy.github.io/ranserinne/enemy-pipeline/";
function buildShareUrl() {
  const hp = run ? Math.max(0, Math.floor(run.hp || 0)) : 0;
  const hpMax = run ? (run.hpMax || 0) : 0;
  const kills = run && run.kills ? run.kills : 0;
  const text = `『Enemy Pipeline: Analog Espionage』正式版をクリア！ 第一防壁を突破した。残りHP ${hp}/${hpMax}・撃破${kills}体。\n#EnemyPipeline #個人ゲーム開発`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(GAME_PAGE_URL)}`;
}

function refreshClearShare() {
  if (!ui.clearShare) return;
  ui.clearShare.href = buildShareUrl();
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
  if (audio) {
    // ボス戦BGM: ボス戦とクリア画面では提供曲を流し続ける（同じ曲名なので再開始しない）
    let track = bossBgm && (name === "BATTLE" || name === "CLEAR") ? "boss" : (SCENE_BGM[name] || null);
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

let battle = Battle.createState();
let route = null;
let run = null;
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
  card.dataset.code = spec.code;
  card.dataset.name = spec.name;
  card.dataset.cost = String(spec.cost);
  card.dataset.noise = String(spec.noise);
  card.dataset.stance = spec.stance || "";
  card.dataset.ink = spec.ink;
  if (spec.exhaust) { card.classList.add("is-exhaust"); card.dataset.exhaust = "1"; }
  if (spec.curse) card.classList.add("is-curse");
  if (spec.flavor) card.dataset.flavor = spec.flavor;
  card.setAttribute("aria-label", spec.curse
    ? `パンチカード ${spec.name}。呪装。リーダは受け付けない`
    : `パンチカード ${spec.name}。電力${spec.cost}、騒音${spec.noise}`);

  const head = document.createElement("span");
  head.className = "punchcard__head";
  const code = document.createElement("span");
  code.textContent = spec.code;
  const cost = document.createElement("span");
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
  name.textContent = spec.name;

  const exhaustTag = document.createElement("span");
  exhaustTag.className = "punchcard__exhaust";
  exhaustTag.textContent = "[ 廃棄 ]";
  exhaustTag.hidden = !spec.exhaust;

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

  card.append(head, stripe, holes, name, exhaustTag, rules, text, foot);
  card.addEventListener("animationend", () => {
    card.classList.remove("is-new", "is-rise");
  }, { once: true });
  return card;
}

function spawn(list) {
  list.forEach((spec, index) => {
    const card = makeCard(spec);
    card.style.animationDelay = `${index * 80}ms`;
    if (spec.id === "boot") {
      card.classList.remove("is-new");
      card.classList.add("is-rise");
    }
    ui.hopper.append(card);
  });
}

function renderStance() {
  const stance = battle.player.stance;
  ui.stance.textContent = stance;
  ui.stance.dataset.mode = stance;
  // PROMPT-23: 態勢バフを左パネルに明示する
  ui.stanceHint.textContent = stance === "EXPOSE"
    ? "露呈中：バフなし"
    : "潜伏中：被ダメ-2／ノイズ-1";
  // PROMPT-27: 素体レイヤーを態勢に連動させる（COVER=物陰に潜伏／EXPOSE=踏み出し）
  if (ui.cctvVessel) {
    const cover = stance === "COVER";
    if (ui.cctvVessel.dataset.stance !== stance) {
      ui.cctvVessel.dataset.stance = stance;
      ui.cctvVessel.src = cover ? "assets/cctv_vessel_cover.png" : "assets/cctv_vessel_expose.png";
    }
    ui.cctvVessel.classList.toggle("is-cover", cover);
    ui.cctvVessel.classList.toggle("is-expose", !cover);
  }
}

let lastNoiseShown = 0;
function renderNoise() {
  const max = (window.Battle && Battle.NOISE_MAX) || 10;
  // v15.0: ノイズはラン全体の状態。戦闘中の値を run へ同期する（持ち越し・セーブ対象）
  if (run && session.phase === "combat") run.noise = battle.noise;
  ui.noiseValue.textContent = `${battle.noise}/${max}`;
  // 正式版フェーズ1（A-2）: 現在の警報帯域名をノイズ表示の近くに出す
  if (ui.noiseBand && window.Battle && Battle.noiseBand) {
    ui.noiseBand.textContent = Battle.noiseBand(battle.noise).name;
  }
  const cells = ui.noiseMeter.children;
  const rose = battle.noise > lastNoiseShown;
  for (let i = 0; i < cells.length; i += 1) {
    cells[i].className = "";
    if (i < battle.noise) {
      cells[i].classList.add("on");
      if (i >= max - 1) cells[i].classList.add("hot");
      else if (i >= 2) cells[i].classList.add("warn");
      if (rose && i >= lastNoiseShown) cells[i].classList.add("pulse");
    }
  }
  lastNoiseShown = battle.noise;
}

// v15.0 被弾・攻撃演出（juice）: CSSクラス駆動の軽量実装。SOUND OFF でも映像演出は出る。
// 被弾 = フレーム小揺れ＋赤ビネットのパルス＋CCTVノイズバースト。攻撃命中 = ヒットストップ＋敵フラッシュ。
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
    hitstopTimer = window.setTimeout(() => ui.screen.classList.remove("is-hitstop"), 85);
  }
  if (ui.cctvScene) {
    ui.cctvScene.classList.remove("is-enemyhit");
    void ui.cctvScene.offsetWidth;
    ui.cctvScene.classList.add("is-enemyhit");
    window.clearTimeout(enemyHitTimer);
    enemyHitTimer = window.setTimeout(() => ui.cctvScene.classList.remove("is-enemyhit"), 240);
  }
}

let lastHpShown = null;
function renderCombat() {
  const player = battle.player;
  const enemy = battle.enemy;
  // 正式版フェーズ1: 左パネルの素体名を使用キャラに合わせる
  if (ui.vesselName) ui.vesselName.textContent = battle.characterId === "vessel04" ? "VESSEL 04" : "VESSEL 07";
  ui.hp.textContent = String(player.hp);
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
    [...ui.stunPips.children].forEach((pip, index) => {
      pip.classList.toggle("is-off", index >= enemy.stun);
    });
  }
  renderStance();
  renderNoise();
  renderEnemyIntent();
  updateLowHpBgm();
  updateBossAlert();
}

function renderEnemyIntent() {
  if (session.phase !== "combat" || !battle) {
    ui.intent.dataset.action = "";
    ui.intent.dataset.alert = "";
    imprint(ui.intent, "INTENT  —");
    if (ui.intentBanner) {
      ui.intentBanner.hidden = true;
      ui.intentBanner.dataset.action = "";
      ui.intentBanner.dataset.alert = "";
      ui.intentBanner.textContent = "INTENT  —";
    }
    return;
  }
  const view = Battle.intentView(battle);
  ui.intent.dataset.action = view.action || "";
  // v15.0: 警戒段階では追加行動の予告をインテントに明示する
  ui.intent.dataset.alert = view.extra ? view.extra.kind : "";
  const label = view.label
    + ((battle.alertBuff || 0) > 0 ? ` 〈警報+${battle.alertBuff}〉` : "")
    + (view.extra ? ` 〈${view.extra.label}〉` : "");
  imprint(ui.intent, label);
  // v15.3 案A: インテント予告は CCTV 中央下にも常時大きめに表示する
  // （上部バッジと同じ内容を、即時反映で大きく出す）
  if (ui.intentBanner) {
    ui.intentBanner.hidden = false;
    ui.intentBanner.dataset.action = view.action || "";
    ui.intentBanner.dataset.alert = view.extra ? view.extra.kind : "";
    ui.intentBanner.textContent = `INTENT  ${label}`;
  }
}

function renderPiles() {
  if (session.phase !== "combat") {
    ui.piles.hidden = true;
    return;
  }
  ui.piles.hidden = false;
  ui.piles.innerHTML = `<span>山札 ${battle.drawPile.length}</span><span>手札 ${battle.hand.length}</span><span>捨て札 ${battle.discard.length}</span><span>廃棄 ${battle.exhaust ? battle.exhaust.length : 0}</span>`;
}

function syncEndButton() {
  const combat = session.phase === "combat";
  const reward = session.phase === "reward";
  ui.endTurn.hidden = !combat;
  if (combat && battle.enemy.dead) ui.endTurn.textContent = "制圧完了";
  else if (combat && battle.player.hp <= 0) ui.endTurn.textContent = "通信途絶";
  else ui.endTurn.textContent = "ターン終了 (END TURN)";
  const scripted = tutorialStep === "t1" || tutorialStep === "t3" || tutorialStep === "victory";
  ui.endTurn.disabled = !combat || session.busy || radioOpen || scripted || !battle || battle.player.hp <= 0 || battle.enemy.dead;
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
    const card = Battle.card(el.dataset.id);
    if (!card) continue;
    const check = Battle.canPlay(battle, card);
    const scripted = tutorialLock(el.dataset.id);
    const locked = scripted || !check.ok;
    el.classList.toggle("is-locked", locked);
    el.classList.toggle("is-tutor", !scripted && ((tutorialStep === "t1" && el.dataset.id === "defend_cover") || (tutorialStep === "t3" && !tutorialLock(el.dataset.id))));
    const why = check.ok ? "" : reasonText(check.reason);
    el.dataset.lock = why;
    el.title = why;
  }
}

function buildMeter() {
  ui.noiseMeter.replaceChildren();
  const max = (window.Battle && Battle.NOISE_MAX) || 10;
  for (let i = 0; i < max; i += 1) ui.noiseMeter.append(document.createElement("i"));
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
  if (session.phase !== "combat" || radioOpen || session.busy) return;
  if (tutorialLock(data.id)) return;
  const beforeHp = battle.player.hp;
  const beforeEnemyHp = battle.enemy.hp;
  const result = Battle.playFromHand(battle, data.id);
  if (!result.ok) {
    pushLog(`REJECT  ${data.name}  ${reasonText(result.reason)}`);
    return;
  }
  // v15.0: 敵にダメージが入ったら穿孔と同期したヒットストップ＋敵フラッシュ
  if (battle.enemy.hp < beforeEnemyHp) fxEnemyHit();
  pushLog(`READ  ${data.name}  COST ${data.cost}`);
  if (audio && audio.playPunch) {
    const played = Battle.card(data.id);
    const intensity = Math.max(0, (played ? played.noise || 0 : 0) + (result.breach ? 1 : 0));
    audio.playPunch(intensity);
  }
  for (const line of result.log) pushLog(line);
  if (battle.enemy.dead) ui.contact.textContent = "制圧完了";
  ui.note.textContent = battle.hand.length === 0
    ? "手札はない。ターンを終了せよ。"
    : "条件を満たさないカードは、スリットが拒否する。";
  renderCombat();
  renderPiles();
  refreshHand();
  syncEndButton();
  settlePlay(data.id, beforeHp, !!result.breach);
}

async function settlePlay(cardId, beforeHp, breached) {
  // v15.0: 自傷などで自HPが減っていれば被弾演出を出す
  if (battle.player.hp < beforeHp) fxPlayerDamage();
  if (battle.player.hp <= 0) {
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
    if (!(await maybeVictory())) openReward();
  }
}

async function onEndTurn() {
  if (session.phase !== "combat" || session.busy || drag || radioOpen) return;
  if (!battle || battle.player.hp <= 0 || battle.enemy.dead) return;
  if (tutorialStep === "t1" || tutorialStep === "t3" || tutorialStep === "victory") return;
  // PROMPT-19: チュートリアルのターン遷移（敵フェーズ後に次の脚本を仕込む）
  if (tutorialStep === "t1end") {
    clearTutorialFocus();
    await runEnemyPhase();
    if (session.phase !== "combat" || !battle || battle.player.hp <= 0 || battle.enemy.dead) return;
    await setupTutTurn2();
    return;
  }
  if (tutorialStep === "t2") {
    await runEnemyPhase();
    if (session.phase !== "combat" || !battle || battle.player.hp <= 0 || battle.enemy.dead) return;
    await setupTutTurn3();
    return;
  }
  await runEnemyPhase();
}

async function runEnemyPhase() {
  if (session.phase !== "combat" || session.busy || !battle) return;
  session.busy = true;
  syncEndButton();
  const beforeHp = battle.player.hp;
  const result = Battle.endTurn(battle);
  ui.hopper.replaceChildren();
  const downAt = result.log.indexOf("VESSEL DOWN");
  const lines = battle.player.hp <= 0 && downAt >= 0 ? result.log.slice(0, downAt + 1) : result.log;
  // v15.3 案A: 敵ターン開始の中央バナー＋敵行動ログの色分け。
  // endTurn のログは [DISCARD行, ...敵ログ, ...自ターン開始ログ] の順で組まれているため、
  // 敵ログの区間を位置で特定して色分けする。区間の先頭には見出し行も残す。
  showEnemyAction(result.enemy);
  const enemyLog = (result.enemy && result.enemy.log) || [];
  const enemyStart = 1;
  const enemyEnd = enemyStart + enemyLog.length;
  const headline = enemyActionText(result.enemy);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i === enemyStart && headline) pushLog(headline, "enemy-head");
    const isEnemyLine = i >= enemyStart && i < enemyEnd;
    const kind = !isEnemyLine ? undefined
      : (line.startsWith("追加行動") ? "enemy-extra" : "enemy");
    pushLog(line, kind);
  }
  showShotCall(result.enemy);
  // v15.0: 敵フェーズで被弾したら被弾演出（追加行動の追撃分も result.enemy.damage に含まれる）
  if (result.enemy && result.enemy.damage > 0) fxPlayerDamage();
  renderCombat();
  if (battle.player.hp <= 0) {
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
  refreshHand();
  session.busy = false;
  syncEndButton();
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
      line.setAttribute("stroke", alert ? "#ff3b30" : "rgba(150,255,180,0.5)");
      line.setAttribute("stroke-width", "1.5");
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
  const noiseNow = Math.max(0, Math.min(Battle.NOISE_MAX, (run && run.noise) || 0));
  ui.routePos.textContent = (here.floor === 0
    ? "NOW  射出点"
    : `NOW  F${here.floor}  ${PipelineMap.label(shown)}`) + `  NOISE ${noiseNow}/${Battle.NOISE_MAX}`;
  ui.routePos.dataset.alert = noiseNow >= 3 ? "1" : "";
  ui.routeHp.textContent = `HP ${run.hp}`;
  ui.scanCount.textContent = String(route.scansLeft);
  ui.scan.disabled = session.busy || radioOpen || tutorialStep === "map" || route.scansLeft <= 0 || openIds.size === 0;
  ui.link.textContent = here.floor === 0 ? "INJECT" : `FLOOR ${here.floor}/${route.floorCount}`;
  ui.routeFloors.replaceChildren();
  ui.routeFloors.append(floorRow([route.nodes[route.originId]], "IN", openIds, here));
  for (const floor of route.floors) {
    ui.routeFloors.append(floorRow(floor, String(floor[0].floor), openIds, here));
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

// PROMPT-28: レリックパネルは総枠5（カタログ総数と一致）。空き枠は [ EMPTY ] で示唆する。
const RELIC_SLOTS = 5;
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
    if (effect.type !== "add_scan_uses") return;
    PipelineMap.grantScans(route, effect.value);
    pushLog(`PART ${relic.name}  SCAN +${effect.value}`);
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

// 表示順（回転台の並び）。"locked" は未解禁枠: シルエット＋LOCKED表示のみで詳細は出さない。
// 将来の解禁キャラはここへ id を差し込むだけで枠が増える。
const VESSEL_ORDER = ["vessel07", "vessel04", "locked"];
let vesselCursor = 0;

// 表示文（CRT表示／フレーバー）は本人の原文ママ（2026-11-14、設計書 §A に記録済み）。
const VESSEL_PROFILES = {
  vessel07: {
    sys: "[SYS] VESSEL 07 ONLINE.\nBALANCED CQC & STEALTH PROTOCOLS ACTIVE.\n> 汎用潜入素体・リンク確立。",
    flavor: "「使い古された型落ちの量産機だが、泥臭い潜入任務には一番手に馴染む。最新鋭のデジタル防壁も、駆動音を殺して放つアナログな物理打撃（CQC）の連続には対応できない。生き残りたければ、基本を忘れるな。」",
    img: "assets/cctv_vessel_expose.png",
  },
  vessel04: {
    sys: "[SYS] VESSEL 04 \"GOLIATH\" LINKED.\nWARNING: STEALTH MODULE NOT FOUND. MASS: CRITICAL.\n> 警告：隠蔽機構が欠損しています。総質量、規定値を大幅に超過。",
    flavor: "「これを潜伏作戦と呼ぶのは、上層部のひどい冗談だ。坑道採掘用のバカげた質量で、見つかる前にすべての防壁と警備AIを粉砕する。起動するだけで施設中に爆音が響き渡るが、気にするな。最後に立っているのがこちらなら、それは完璧なステルスだ。」",
    img: "assets/vessel04_goliath.webp", // 専用立ち絵（楕円ソフトアルファ済み）
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
  if (entry === "locked") {
    fig.classList.add("is-locked");
    // 未解禁はシルエットで存在だけを匂わせる（コンセプト画の布を被った素体）。
    // 既存の素体画像を真っ黒に潰して流用し、機体の判別はできない見せ方にする。
    const sil = document.createElement("img");
    sil.className = "vessel-figure__silhouette";
    sil.src = "assets/cctv_vessel_expose.png";
    sil.alt = "";
    const lock = document.createElement("span");
    lock.className = "vessel-figure__lock";
    lock.textContent = "LOCKED";
    visual.append(sil, lock);
    caption.textContent = "VESSEL ?? — CLASSIFIED";
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
      glyph.textContent = entry === "vessel04" ? "04" : "07";
      visual.append(glyph);
    }
    caption.textContent = def ? `${def.name} “${def.code}”` : entry;
  }
  fig.append(visual, caption);
  if (pos === "left") fig.addEventListener("click", () => rotateVessel(-1));
  if (pos === "right") fig.addEventListener("click", () => rotateVessel(1));
  return fig;
}

function renderVesselSelect(spinDir) {
  const stage = ui.vesselStage;
  if (!stage) return;
  const n = VESSEL_ORDER.length;
  const at = (off) => VESSEL_ORDER[(vesselCursor + off + n) % n];
  stage.replaceChildren(
    vesselFigureEl(at(-1), "left"),
    vesselFigureEl(at(0), "center"),
    vesselFigureEl(at(1), "right"),
  );
  // 回転を示す動き: 回転方向へフィギュアが滑り込むアニメーションを付ける
  stage.classList.remove("spin-l", "spin-r");
  if (spinDir) {
    void stage.offsetWidth;
    stage.classList.add(spinDir < 0 ? "spin-l" : "spin-r");
  }
  const cur = at(0);
  if (ui.vesselLaunch) ui.vesselLaunch.dataset.vessel = cur;
  if (ui.vesselPos) ui.vesselPos.textContent = `CAROUSEL ${vesselCursor + 1} / ${n}`;
  if (cur === "locked") {
    // 未解禁: 詳細情報（説明・数値・デッキ）は出さない
    if (ui.vesselInfoName) ui.vesselInfoName.textContent = "VESSEL ?? “????”";
    if (ui.vesselInfoSys) ui.vesselInfoSys.textContent = "[SYS] — NO DATA —\n> 素体信号を捕捉できず。";
    if (ui.vesselInfoStats) ui.vesselInfoStats.textContent = "HP ?? ／ PWR回復 ??";
    if (ui.vesselInfoDeck) ui.vesselInfoDeck.textContent = "初期デッキ: CLASSIFIED";
    if (ui.vesselInfoFlavor) ui.vesselInfoFlavor.textContent = "SIGNAL NOT FOUND — 未解禁";
    if (ui.vesselLaunch) {
      ui.vesselLaunch.disabled = true;
      ui.vesselLaunch.textContent = "LOCKED — 選択不可";
    }
    return;
  }
  const def = Battle.CHARACTERS[cur];
  const profile = VESSEL_PROFILES[cur];
  if (!def || !profile) return;
  if (ui.vesselInfoName) ui.vesselInfoName.textContent = `${def.name} “${def.code}”`;
  if (ui.vesselInfoSys) ui.vesselInfoSys.textContent = profile.sys;
  if (ui.vesselInfoStats) ui.vesselInfoStats.textContent = `HP ${def.hp} ／ PWR回復 ${def.energyPerTurn}（毎ターン）`;
  if (ui.vesselInfoDeck) ui.vesselInfoDeck.textContent = `初期デッキ: ${deckSummaryText(cur)}`;
  if (ui.vesselInfoFlavor) ui.vesselInfoFlavor.textContent = profile.flavor;
  if (ui.vesselLaunch) {
    ui.vesselLaunch.disabled = false;
    ui.vesselLaunch.textContent = "この素体でダイブ";
  }
}

function rotateVessel(dir) {
  const n = VESSEL_ORDER.length;
  vesselCursor = (vesselCursor + dir + n) % n;
  cueSE("switch");
  renderVesselSelect(dir);
}

function openVesselSelect() {
  const idx = VESSEL_ORDER.indexOf(selectedVessel);
  vesselCursor = idx >= 0 ? idx : 0;
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
  run = {
    character: selectedVessel,
    hp: seed.player.hp,
    hpMax: seed.player.hpMax,
    relics: Relics.issued(),
    deck: Battle.deckIdsFor(selectedVessel),
    noise: 0, // v15.0: ノイズはラン全体で持ち越す（開始時は0）
    kills: 0, // v15.3: 撃破数（クリア画面のX投稿サマリ用）
  };
  route = PipelineMap.generate();
  // 正式版フェーズ1: 初回戦闘の脚本チュートリアルは 07 前提（潜伏・PWR 3 の説明）なので、
  // GOLIATH のランでは行わない（通常戦闘として開始する）。
  run.tutorialPending = !tutorialCleared() && selectedVessel === "vessel07";
  resetTutorialState();
  session.dead = false;
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
  pushLog(`${Battle.CHARACTERS[selectedVessel].name} INJECTED`);
  applyMapRelics();
  pushLog("経路図を展開。次のノードを選べ");
  ui.note.textContent = `光っているノードが次の区画。アナログスキャンは${route.scansLeft}回。`;
  renderRelics();
  renderRoute();
  syncEndButton();
  if (run.tutorialPending) void maybeMapTutorial();
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
// 保存粒度は「マップ滞在中」または「戦闘の開始時」。戦闘の途中経過は保存せず、
// 復元時はその戦闘の開始時から再開する。デッキ構成は run.deck（全カードのIDリスト）で保持し、
// 戦闘の山札・手札・捨て札は戦闘開始時にそこから再構成される。
const SAVE_KEY = "enemy_pipeline_formal_save";

function saveGame(pending) {
  try {
    if (!run || !route) return;
    const data = {
      v: 1,
      character: run.character || "vessel07", // 正式版フェーズ1: 使用素体も保存する
      hp: run.hp,
      hpMax: run.hpMax,
      noise: Math.max(0, Math.min(Battle.NOISE_MAX, run.noise || 0)), // v15.0: 持ち越しノイズも保存する
      kills: run.kills || 0, // v15.3: 撃破数も保存する
      relics: (run.relics || []).slice(),
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
    if (!data || !data.route || !data.route.nodes || !data.route.currentId
      || !Array.isArray(data.deck) || typeof data.hp !== "number") return null;
    return data;
  } catch { return null; }
}

function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
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
  route = {
    floors, nodes, links,
    originId: data.route.originId,
    currentId: data.route.currentId,
    scansLeft: data.route.scansLeft,
    scanMax: data.route.scanMax,
    floorCount: data.route.floorCount,
  };
  run = {
    character: data.character === "vessel04" ? "vessel04" : "vessel07", // 正式版フェーズ1: 使用素体を復元
    hp: data.hp,
    hpMax: data.hpMax,
    noise: typeof data.noise === "number" ? Math.max(0, Math.min(Battle.NOISE_MAX, data.noise)) : 0, // v15.0: 持ち越しノイズを復元
    kills: typeof data.kills === "number" ? data.kills : 0, // v15.3: 撃破数を復元
    relics: Array.isArray(data.relics) ? data.relics.slice() : [],
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
    void beginCombat(pending);
    return;
  }
  enterRestoredMap();
  if (pending && pending.kind === "rest") openSafehouse();
  else if (pending) beginField(pending);
}

function enterRestoredMap() {
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
  pushLog("記録データを復元。経路図を再展開");
  ui.note.textContent = "光っているノードが次の区画。";
  renderRelics();
  renderRoute();
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
  battle.drawPile.push(...battle.hand.splice(0, battle.hand.length));
  const pulled = [];
  for (const id of ids) {
    let idx = battle.drawPile.findIndex((c) => c.id === id);
    if (idx >= 0) { pulled.push(battle.drawPile.splice(idx, 1)[0]); continue; }
    idx = battle.discard.findIndex((c) => c.id === id);
    if (idx >= 0) { pulled.push(battle.discard.splice(idx, 1)[0]); continue; }
    const def = Battle.card(id);
    if (def) pulled.push(def);
  }
  battle.hand = pulled;
  ui.hopper.replaceChildren();
  spawn(battle.hand.map(face));
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
  ui.cardInspectName.textContent = `解析：${data.name}${data.exhaust ? "【廃棄】" : ""}`;
  const noiseText = Number(data.noise) > 0 ? `+${data.noise}` : `${data.noise}`;
  const lines = [`消費PWR ${data.cost} / 発生ノイズ ${noiseText} / 態勢→${data.stance || "—"}`];
  if (data.rules) lines.push(data.rules);
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

// v13.5: チュートリアル後は通信パネルを畳み、通信（ラジオ）が来たときだけ出す
const COMMS_FOLD_SCENES = ["MAP", "BATTLE", "EVENT", "SAFEHOUSE", "REWARD"];
function refreshCommsFold() {
  if (!ui.screen) return;
  const fold = tutorialCleared() && !radioOpen && COMMS_FOLD_SCENES.includes(currentScene);
  ui.screen.classList.toggle("comms-folded", fold);
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
  const started = Battle.beginPlayerTurn(battle);
  for (const line of started.log) pushLog(line);
  spawn(started.drawn.map(face));
  renderCombat();
  renderPiles();
  refreshHand();
}

function pinchCrossed(beforeHp) {
  if (!battle || pinchHeard || battle.player.hp <= 0) return false;
  const max = battle.player.hpMax || 1;
  return beforeHp * 10 > max * 3 && battle.player.hp * 10 <= max * 3;
}

async function drainPinch() {
  if (!pinchQueued || session.phase !== "combat" || !battle || battle.player.hp <= 0) return;
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
  if (!src) return;
  ui.cctvEnemy.onload = () => {
    ui.cctvScene.hidden = false;
    ui.cctvDummy.hidden = true;
  };
  ui.cctvEnemy.onerror = () => {
    ui.cctvScene.hidden = true;
    ui.cctvDummy.hidden = false;
  };
  ui.cctvEnemy.src = src;
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
  const hp = battle.player.hp;
  const max = battle.player.hpMax || 1;
  // 敗北時はGAMEOVER曲が優先（ここでは低耐久へ倒さず、状態だけ畳む）
  if (hp <= 0) { lowHpBgmActive = false; return; }
  if (!lowHpBgmActive && hp * 10 <= max * 3) {
    lowHpBgmActive = true;
    audio.playBgm("battle_lowhp");
  } else if (lowHpBgmActive && hp * 10 >= max * 4) {
    lowHpBgmActive = false;
    audio.playBgm("battle");
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
  if (!battle || !battle.player) { setBossAlert(false); return; }
  const hp = battle.player.hp;
  const max = battle.player.hpMax || 1;
  const inBossCombat = bossBgm && currentScene === "BATTLE" && session.phase === "combat" && hp > 0;
  if (!inBossCombat) { setBossAlert(false); return; }
  if (!bossLowHpAlert && hp * 10 <= max * 3) setBossAlert(true);
  else if (bossLowHpAlert && hp * 10 >= max * 4) setBossAlert(false);
}

async function beginCombat(encounter) {
  session.busy = true;
  session.advance = false;
  pinchHeard = false;
  pinchQueued = false;
  saveGame(encounter); // PROMPT-24: バトル突入時に保存（復元時はこの戦闘の開始時から）
  battle = Battle.createState(undefined, { relics: run.relics, deck: run.deck, character: run.character });
  battle.player.hp = Math.max(0, run.hp);
  battle.player.hpMax = run.hpMax;
  // v15.0: 持ち越しノイズを戦闘の初期値にする
  battle.noise = Math.max(0, Math.min(Battle.NOISE_MAX, run.noise || 0));
  // 正式版フェーズ1（A-2）: 戦闘の第1ターンの変換基準も持ち越しノイズで初期化する
  battle.turnStartNoise = battle.noise;
  Battle.syncAlertBuff(battle);
  lastNoiseShown = battle.noise;
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
  // 低耐久のまま次の戦闘へ入る場合は、開始時点のHPで低耐久状態を初期化する
  lowHpBgmActive = !bossBgm && battle.player.hp > 0 && battle.player.hp * 10 <= (battle.player.hpMax || 1) * 3;
  if (audio && bossBgm) audio.fadeSeconds = 2.2;
  changeScene("BATTLE");
  if (audio) audio.fadeSeconds = 0.7;
  ui.ambush.hidden = true;
  ui.link.textContent = "CARRIER LOCK";
  ui.contact.textContent = encounter.name;
  ui.enemyName.textContent = encounter.short || encounter.name;
  setCctvImage((battle.enemy && battle.enemy.image) || encounter.image || "", encounter.name, encounter.type);
  ui.slotLabel.textContent = "READER LIVE";
  ui.note.textContent = "条件を満たさないカードは、スリットが拒否する。";
  ui.hopper.replaceChildren();
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

function safehouseHeal(hp, hpMax) {
  const max = Math.max(0, hpMax | 0);
  const amount = Math.floor(max * 0.3);
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
  syncEndButton();
}

function ventHeat() {
  if (safehouseChosen || safehouseLeft || session.phase !== "safehouse" || !run) return;
  safehouseChosen = true;
  lockSafehouseChoices(ui.safehouseVent);
  const before = run.hp;
  run.hp = safehouseHeal(before, run.hpMax);
  const gained = run.hp - before;
  pushLog(gained > 0 ? `VENT  HP ${before} > ${run.hp}` : "VENT  HP FULL");
  leaveSafehouse(gained > 0
    ? `排熱した。耐久が ${gained} 戻った。`
    : "排熱した。耐久は既に満タンだ。");
}

function openSever() {
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
  eventChosen = true;
  ui.eventChoices.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    if (Number(button.dataset.index) === index) button.classList.add("is-chosen");
  });
  eventOutcome = Events.apply(run, choice, Math.random);
  for (const id of eventOutcome.grantedRelics) {
    Relics.eachEffect([id], "on_map_generation", (relic, effect) => {
      if (effect.type !== "add_scan_uses" || !route) return;
      PipelineMap.grantScans(route, effect.value);
      pushLog(`PART ${relic.name}  SCAN +${effect.value}`);
    });
  }
  for (const line of eventOutcome.logs) pushLog(line);
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
}

function closeEvent() {
  if (eventLeft || session.phase !== "event" || !eventChosen || ui.eventReturn.hidden) return;
  eventLeft = true;
  const outcome = eventOutcome;
  const dead = !!(outcome && outcome.dead);
  clearEventChrome();
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
  syncEndButton();
}

async function chooseNode(id) {
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

async function openReward() {
  if (session.phase !== "combat" || !battle || battle.player.hp <= 0 || !battle.enemy.dead) return;
  setBossAlert(false); // v15.3: 敵を撃破したら心拍層は即座に止める（ボス撃破含む）
  // v15.3: 撃破数カウント（クリア画面のX投稿サマリ用）。openReward は勝利確定後の単一入口
  // （チュートリアル完了戦闘も victoryRadio 経由でここに合流する）で、戦闘ごとに1回だけ数える
  if (run && !battle.killCounted) { battle.killCounted = true; run.kills = (run.kills || 0) + 1; }
  if (!window.Rewards) {
    finishCombat();
    return;
  }
  const here = route && route.nodes ? route.nodes[route.currentId] : null;
  if (here && here.hiddenType === "BOSS") {
    await bossClearSequence();
    return;
  }
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
  // 正式版フェーズ1: GOLIATH のランでは共通プール＋専用プールから提示する
  session.offer = Rewards.offer(Rewards.OFFER_COUNT, undefined, !!(run && run.character === "vessel04"));
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
  await presentRadio([GRAY_CLEAR]);
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
  session.offer = [];
  ui.hopper.replaceChildren();
  ui.piles.hidden = true;
  clearSave(); // PROMPT-24: ラン完走時はセーブを破棄する
  changeScene("CLEAR");
  if (ui.fadeMask) {
    ui.fadeMask.classList.remove("is-on");
    window.setTimeout(() => { ui.fadeMask.hidden = true; }, 950);
  }
  session.busy = false;
  syncEndButton();
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
    finishCombat();
  }, 950);
}

function skipReward() {
  if (session.phase !== "reward") return;
  pushLog("SALVAGE  見送った");
  finishCombat();
}

function finishCombat() {
  if (!battle || !battle.enemy.dead || battle.player.hp <= 0) return;
  if (session.phase !== "combat" && session.phase !== "reward") return;
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
}

function blankDesk() {
  cancelRead();
  session.linked = false;
  session.busy = false;
  session.offer = [];
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

function showTitle() {
  ui.broadcast.classList.remove("is-deepfake", "is-black", "is-speech");
  ui.broadcast.hidden = true;
  ui.desk.hidden = false;
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
  slotIdleLabel();
  changeScene("TITLE");
  syncEndButton();
  window.requestAnimationFrame(() => ui.screen.classList.add("is-on"));
  armBootCard();
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
    if (p && typeof p.then === "function") p.then(() => audio.playBgm("title")).catch(() => {});
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
  return session.phase === "combat" && (session.busy || radioOpen || tutorialLock(card.dataset.id));
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
  if (!card || drag || session.reading || cardHeld(card)) return;
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
ui.power.addEventListener("click", () => { opening(); });
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
  if (id && id !== "locked") chooseVessel(id);
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
ui.screen.addEventListener("click", () => {
  // 検収修正 2026-11-10 (PROMPT-20): 通信送りは戦闘以外（MAP/BOOT）の通信でも効かせる
  if (!radioReady || !radioOpen) return;
  advanceRadio();
});
ui.routeReturn.addEventListener("click", () => {
  if (session.phase === "reward") skipReward();
});
ui.rewardSkip.addEventListener("click", () => {
  skipReward();
});
function returnToTerminal() {
  if (audio) audio.unlock();
  if (session.phase !== "clear") return;
  // クリア画面を抜けたらボスBGMは役目を終える（ゆっくりフェードアウト）
  bossBgm = false;
  if (audio) audio.fadeSeconds = 1.6;
  showTitle(); // changeScene("TITLE") 経由で全面黒レイヤーも消える
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
