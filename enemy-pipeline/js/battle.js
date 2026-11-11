/* Card play, piles, and enemy turns.
   PROMPT-23 (2026-11-11): COVER is a stealth buff, not damage immunity.
   Incoming damage order: base value -> COVER -2 -> player block soaks -> HP.
   Playing a noisy card in COVER (noise > 0) breaks COVER back to EXPOSE,
   with the noise itself suppressed by 1 while covered. Block expires at the
   start of the player's turn (after it has soaked the enemy phase).
   Energy gains (cards and relics) are capped at energyMax.
   Elites step through the pattern in js/enemies.js.
   Enemy block soaks the vessel's strikes. Stun immunity ignores stun cards. */

(function (root) {
  const ENERGY_PER_TURN = 3;
  const STUN_MAX = 3;
  const PLAYER_HP = 60;
  const ENEMY_HP = 30;
  const HAND_SIZE = 5;
  const NOISE_MAX = 5;
  const SHOT = Object.freeze({ name: "射撃", damage: 8, label: "射撃 8dmg" });

  const FINISHERS = Object.freeze([
    { id: "cqc_disable_01", name: "関節破壊 (DISABLE)", cost: 1, category: "CQC", type: "skill", noise: 1, requirements: ["target_stun_ge_1"], stance_change: "EXPOSE", effects: [{ target: "enemy", type: "cancel_next_intent", value: 1 }, { target: "enemy", type: "vulnerable", value: 1 }] },
    { id: "cqc_holdup_01", name: "完全制圧 (HOLD UP)", cost: 2, category: "CQC", type: "finish", noise: 1, requirements: ["target_stun_max"], stance_change: null, effects: [{ target: "enemy", type: "instant_kill", value: 1 }] },
  ].map((card) => Object.freeze({
    ...card,
    requirements: Object.freeze(card.requirements.slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const strike = root.Cards.get("strike_cqc");
  const cover = root.Cards.get("defend_cover");
  const DECK = Object.freeze([
    strike, strike, strike, strike,
    cover, cover, cover, cover,
    ...FINISHERS,
  ]);

  const byId = new Map(root.Cards.all.map((card) => [card.id, card]));
  for (const card of FINISHERS) byId.set(card.id, card);

  function lookup(id) {
    return byId.get(id)
      || (root.Rewards && root.Rewards.card(id))
      || (root.Relics && root.Relics.card(id))
      || null;
  }

  function resolveDeck(list) {
    if (!Array.isArray(list) || list.length === 0) return DECK.slice();
    const cards = [];
    for (const item of list) {
      const id = typeof item === "string" ? item : item && item.id;
      const card = lookup(id);
      if (card) cards.push(card);
    }
    return cards.length ? cards : DECK.slice();
  }

  function relicStunBonus(state) {
    return root.Relics ? root.Relics.stunBonus(state) : 0;
  }

  function applyRelics(state, trigger) {
    if (!root.Relics) return [];
    return root.Relics.applyBattle(state, trigger);
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    const random = rng || Math.random;
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function fallbackSentry() {
    return {
      id: "enemy_sentry",
      name: "サイボーグ哨戒兵",
      short: "哨戒兵",
      hp: ENEMY_HP,
      hpMax: ENEMY_HP,
      stun: 0,
      stunMax: STUN_MAX,
      immuneToStun: false,
      vulnerable: 0,
      cancelNextIntent: 0,
      dead: false,
      block: 0,
      patternIndex: 0,
      pattern: [{ action: "attack", name: "射撃", value: 8, hits: 1 }],
    };
  }

  function createState(rng, options) {
    const relics = options && Array.isArray(options.relics) ? options.relics.slice() : [];
    const enemy = root.Enemies ? root.Enemies.make("enemy_sentry") : fallbackSentry();
    const deck = resolveDeck(options && options.deck);
    return {
      relics,
      player: {
        hp: PLAYER_HP,
        hpMax: PLAYER_HP,
        energy: ENERGY_PER_TURN,
        energyMax: ENERGY_PER_TURN,
        stance: "EXPOSE",
        block: 0,
        stagger: 0,
      },
      enemy,
      noise: 0,
      alertBuff: 0,
      turn: 1,
      drawPile: shuffle(deck, rng),
      hand: [],
      discard: [],
    };
  }

  function applyEnemy(state, id) {
    if (!root.Enemies) return false;
    const enemy = root.Enemies.make(id);
    if (!enemy) return false;
    state.enemy = enemy;
    return true;
  }

  function requirementMet(state, requirement) {
    if (requirement === "target_stun_ge_1") return state.enemy.stun >= 1;
    if (requirement === "target_stun_max") return state.enemy.stun >= state.enemy.stunMax;
    return false;
  }

  function canPlay(state, card) {
    if (!card) return { ok: false, reason: "unknown" };
    if (state.player.hp <= 0) return { ok: false, reason: "down" };
    if (state.enemy.dead) return { ok: false, reason: "dead" };
    if (card.unplayable || card.cost < 0 || (card.effects || []).some((effect) => effect.type === "unplayable")) {
      return { ok: false, reason: "curse" };
    }
    for (const requirement of card.requirements) {
      if (!requirementMet(state, requirement)) return { ok: false, reason: requirement };
    }
    if (state.player.energy < card.cost) return { ok: false, reason: "energy" };
    return { ok: true, reason: "" };
  }

  // 検収修正 2026-11-10 (PROMPT-19): スタン加算の共通処理（CQC打撃でも使う）
  function addStun(state, amount, log, withBonus) {
    if (state.enemy.immuneToStun) { log.push("STUN IMMUNE"); return 0; }
    const before = state.enemy.stun;
    const bonus = withBonus ? relicStunBonus(state) : 0;
    const room = Math.max(0, state.enemy.stunMax - before);
    const gained = Math.min(room, amount + bonus);
    state.enemy.stun = before + gained;
    if (gained > 0) log.push(`STUN ${state.enemy.stun}/${state.enemy.stunMax}`);
    const extra = Math.max(0, gained - amount);
    if (extra > 0) log.push(`STUN BOOST +${extra}`);
    return gained;
  }

  function applyEffect(state, effect, log) {
    if (effect.type === "unplayable") return;
    const amount = effect.value;
    if (effect.target === "enemy" && effect.type === "damage") {
      const block = state.enemy.block || 0;
      const soaked = Math.min(block, amount);
      const dealt = amount - soaked;
      if (soaked > 0) {
        state.enemy.block = block - soaked;
        log.push(`BLOCKED ${soaked}`);
      }
      state.enemy.hp = Math.max(0, state.enemy.hp - dealt);
      if (state.enemy.hp === 0) state.enemy.dead = true;
      log.push(`DMG ${dealt}  HP ${state.enemy.hp}`);
      return;
    }
    if (effect.target === "enemy" && effect.type === "stun") {
      addStun(state, amount, log, true);
      return;
    }
    if (effect.target === "player" && effect.type === "block") {
      state.player.block += amount;
      log.push(`BLOCK ${state.player.block}`);
      return;
    }
    if (effect.target === "player" && effect.type === "add_energy") {
      // PROMPT-23: 電力の増加は最大値を超えない
      state.player.energy = Math.min(state.player.energyMax, state.player.energy + amount);
      log.push(`PWR +${amount}  TOTAL ${state.player.energy}`);
      return;
    }
    if (effect.target === "player" && effect.type === "damage") {
      state.player.hp = Math.max(0, state.player.hp - amount);
      log.push(`SELF ${amount}`);
      log.push(`HP ${state.player.hp}`);
      if (state.player.hp === 0) log.push("VESSEL DOWN");
      return;
    }
    if (effect.target === "player" && effect.type === "add_card_to_discard") {
      const cursed = lookup(effect.card_id);
      const count = amount || 1;
      if (!cursed) return;
      for (let i = 0; i < count; i += 1) state.discard.push(cursed);
      log.push(`CURSE ${cursed.name}`);
      return;
    }
    if (effect.target === "enemy" && effect.type === "cancel_next_intent") {
      state.enemy.cancelNextIntent += amount;
      log.push("NEXT INTENT CANCEL");
      return;
    }
    if (effect.target === "enemy" && effect.type === "vulnerable") {
      state.enemy.vulnerable += amount;
      log.push(`VULN ${state.enemy.vulnerable}`);
      return;
    }
    if (effect.target === "enemy" && effect.type === "instant_kill") {
      state.enemy.hp = 0;
      state.enemy.dead = true;
      log.push("NEUTRALIZED");
    }
  }

  function playCard(state, card) {
    const check = canPlay(state, card);
    if (!check.ok) return { ok: false, reason: check.reason, log: [] };
    state.player.energy -= Math.max(0, card.cost);
    // PROMPT-23: 潜伏中はノイズ-1（下限0）。ノイズの出るカードは潜伏を解くが、
    // COVER を付与するカード自身（CQC打撃など）は解除の例外とする
    const inCover = state.player.stance === "COVER";
    const rawNoise = card.noise || 0;
    const effNoise = inCover ? Math.max(0, rawNoise - 1) : rawNoise;
    state.noise += effNoise;
    const log = [];
    if (inCover && (rawNoise > 0 || card.breaksCover === true) && card.stance_change !== "COVER") {
      state.player.stance = "EXPOSE";
      log.push("COVER BROKEN");
    }
    if (card.stance_change) state.player.stance = card.stance_change;
    log.unshift(`PWR ${state.player.energy}  STANCE ${state.player.stance}`);
    for (const effect of card.effects) applyEffect(state, effect, log);
    // 検収修正 2026-11-10 (PROMPT-19): CQCカテゴリのカードはスタン+1（設計欠落の補完）
    if (card.category === "CQC" && !state.enemy.dead) addStun(state, 1, log, false);
    log.push(`NOISE +${effNoise}${effNoise !== rawNoise ? ` (COVER -${rawNoise - effNoise})` : ""}  TOTAL ${state.noise}`);
    // PROMPT-18: ノイズ限界で警報発令（敵バフ＋リセット）
    let breach = false;
    if (state.noise >= NOISE_MAX) {
      breach = true;
      state.noise = 0;
      state.alertBuff = (state.alertBuff || 0) + 3;
      log.push("!! SECURITY BREACH - ENEMY ALERTED !!");
      log.push(`敵攻撃力 +3 (現在 +${state.alertBuff})`);
    }
    return { ok: true, reason: "", log, breach };
  }

  function playFromHand(state, cardId) {
    const index = state.hand.findIndex((card) => card.id === cardId);
    if (index < 0) return { ok: false, reason: "missing", log: [] };
    const card = state.hand[index];
    const result = playCard(state, card);
    if (!result.ok) return result;
    state.hand.splice(index, 1);
    state.discard.push(card);
    return result;
  }

  function beginTurn(state) {
    state.player.energy = state.player.energyMax;
  }

  function drawCards(state, count, rng) {
    const drawn = [];
    const log = [];
    for (let i = 0; i < count; i += 1) {
      if (state.drawPile.length === 0) {
        if (state.discard.length === 0) break;
        state.drawPile = shuffle(state.discard, rng);
        state.discard = [];
        log.push(`RESHUFFLE ${state.drawPile.length}`);
      }
      const card = state.drawPile.pop();
      state.hand.push(card);
      drawn.push(card);
    }
    log.push(`DRAW ${drawn.length}`);
    return { drawn, log };
  }

  function discardHand(state) {
    const moved = state.hand.splice(0, state.hand.length);
    state.discard.push(...moved);
    return moved;
  }

  function startCombat(state) {
    return { log: applyRelics(state, "start_of_combat") };
  }

  function beginPlayerTurn(state, rng) {
    beginTurn(state);
    // PROMPT-23: 防護は自ターン開始時に消滅する（敵フェーズで受け止めた残りは持ち越さない）。
    // レリックのターン開始時効果より前に消すので、レリックで付いた防護はそのターン中有効。
    const expiredBlock = state.player.block || 0;
    state.player.block = 0;
    const notes = applyRelics(state, "start_of_turn");
    if (expiredBlock > 0) notes.unshift(`BLOCK EXPIRED ${expiredBlock}`);
    const stagger = state.player.stagger || 0;
    if (stagger > 0) {
      const lost = Math.min(state.player.energy, stagger);
      state.player.energy -= lost;
      state.player.stagger = 0;
      notes.push(`STAGGER -${lost}`);
    }
    const drawn = drawCards(state, HAND_SIZE, rng);
    return { drawn: drawn.drawn, log: [`PWR ${state.player.energy}`, ...notes, ...drawn.log] };
  }

  function currentIntent(enemy) {
    const pattern = enemy.pattern;
    if (!pattern || pattern.length === 0) {
      return { action: "attack", name: SHOT.name, value: SHOT.damage, hits: 1 };
    }
    return pattern[enemy.patternIndex % pattern.length];
  }

  function advancePattern(enemy) {
    const pattern = enemy.pattern;
    if (!pattern || pattern.length === 0) return;
    enemy.patternIndex = (enemy.patternIndex + 1) % pattern.length;
  }

  function intentText(intent) {
    if (root.Enemies) return root.Enemies.label(intent);
    const hits = intent.hits || 1;
    if (intent.action === "attack" || intent.action === "heavy_attack" || intent.action === "attack_stun") {
      return hits > 1 ? `${intent.name} ${intent.value}×${hits}` : `${intent.name} ${intent.value}dmg`;
    }
    if (intent.action === "buff" || intent.action === "stealth") return `${intent.name} +${intent.value}`;
    return intent.name;
  }

  function strikeVolley(state, intent, log) {
    // PROMPT-23: 被ダメージ計算順序 = 基本値（+警報バフ）→ 潜伏-2 → 防護で相殺 → HP
    const hits = intent.hits || 1;
    const value = (intent.value || 0) + (state.alertBuff || 0);
    let dealt = 0;
    let soakedTotal = 0;
    let evaded = false;
    for (let i = 0; i < hits; i += 1) {
      if (state.player.hp <= 0) break;
      let dmg = value;
      if (state.player.stance === "COVER") {
        dmg = Math.max(0, dmg - 2);
        if (dmg === 0) evaded = true;
      }
      const soaked = Math.min(state.player.block || 0, dmg);
      if (soaked > 0) {
        state.player.block -= soaked;
        dmg -= soaked;
        soakedTotal += soaked;
      }
      if (dmg > 0) log.push(`HIT ${dmg}`);
      const hit = Math.min(state.player.hp, dmg);
      state.player.hp -= hit;
      dealt += hit;
    }
    if (soakedTotal > 0) log.push(`BLOCKED ${soakedTotal}  BLK ${state.player.block}`);
    log.push(`HP ${state.player.hp}`);
    if (state.player.hp === 0) log.push("VESSEL DOWN");
    if (intent.action === "attack_stun" && dealt > 0) {
      state.player.stagger = (state.player.stagger || 0) + 1;
      log.push("STAGGER 1");
    }
    if (dealt > 0) return { log, outcome: "hit", damage: dealt, call: `${dealt} DMG` };
    if (soakedTotal > 0) return { log, outcome: "blocked", damage: 0, call: "BLOCKED" };
    if (evaded) return { log, outcome: "blocked", damage: 0, call: "EVADED" };
    return { log, outcome: "blocked", damage: 0, call: "NO DAMAGE" };
  }

  function resolveIntent(state, intent, log) {
    const action = intent.action;
    const value = intent.value || 0;
    if (action === "buff" || action === "stealth") {
      state.enemy.block = (state.enemy.block || 0) + value;
      const tag = action === "buff" ? "GUARD" : "STEALTH";
      log.push(`${tag} +${value}  BLK ${state.enemy.block}`);
      return { log, outcome: action, damage: 0, call: `+${value} BLK` };
    }
    if (action === "debuff") {
      state.player.stance = "EXPOSE";
      state.player.block = 0;
      log.push("SCAN");
      log.push("EXPOSE");
      return { log, outcome: "debuff", damage: 0, call: "EXPOSE" };
    }
    if (action === "wait") {
      state.enemy.block = 0;
      log.push("VENT");
      return { log, outcome: "wait", damage: 0, call: "VENT" };
    }
    if (action === "hack") {
      const curse = root.Relics && (root.Relics.card("curse_flashback") || root.Relics.card("curse_noise"));
      if (curse) {
        state.discard.push(curse);
        log.push(`JAM  ${curse.name}`);
      } else log.push("JAM");
      return { log, outcome: "hack", damage: 0, call: "JAMMED" };
    }
    return strikeVolley(state, intent, log);
  }

  function enemyTurn(state) {
    const log = [];
    if (state.enemy.dead) {
      log.push("TARGET DOWN");
      return { log, outcome: "down", damage: 0, call: "" };
    }
    if (state.enemy.cancelNextIntent > 0) {
      state.enemy.cancelNextIntent -= 1;
      advancePattern(state.enemy);
      log.push("INTENT CANCELLED");
      return { log, outcome: "cancelled", damage: 0, call: "CANCELLED" };
    }
    // 検収修正 2026-11-10 (PROMPT-19): スタン最大で敵の行動をショート（設計欠落の補完）
    if (!state.enemy.immuneToStun && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) {
      state.enemy.stun = 0;
      advancePattern(state.enemy);
      log.push("STUNNED - 行動ショート");
      return { log, outcome: "stunned", damage: 0, call: "STUNNED" };
    }
    const result = resolveIntent(state, currentIntent(state.enemy), log);
    advancePattern(state.enemy);
    return result;
  }

  function intentView(state) {
    if (state.enemy.dead) return { label: "無力", action: "" };
    const intent = currentIntent(state.enemy);
    if (!state.enemy.immuneToStun && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) {
      // PROMPT-25: スタン（行動不能）のインテント表記は英字タグ STUNNED に統一する
      return { label: "STUNNED", action: "stunned" };
    }
    const buff = state.alertBuff || 0;
    const shown = buff > 0 && (intent.action === "attack" || intent.action === "heavy_attack" || intent.action === "attack_stun")
      ? { ...intent, value: (intent.value || 0) + buff }
      : intent;
    const label = intentText(shown);
    // PROMPT-25: ラベルが STUNNED のインテント（チュートリアルの強制インテント等）も同じタグ表示にする
    return { label, action: label === "STUNNED" ? "stunned" : (intent.action || "") };
  }

  function intentLabel(state) {
    return intentView(state).label;
  }

  function endTurn(state, rng) {
    const log = [];
    const discarded = discardHand(state);
    log.push(`DISCARD ${discarded.length}`);
    const enemy = enemyTurn(state);
    log.push(...enemy.log);
    state.turn += 1;
    const started = beginPlayerTurn(state, rng);
    log.push(...started.log);
    return { log, discarded, drawn: started.drawn, enemy };
  }

  function pileCount(state) {
    return state.drawPile.length + state.hand.length + state.discard.length;
  }

  root.Battle = {
    DECK,
    ENERGY_PER_TURN,
    STUN_MAX,
    HAND_SIZE,
    NOISE_MAX,
    SHOT,
    card: (id) => lookup(id),
    startCombat,
    shuffle,
    createState,
    applyEnemy,
    requirementMet,
    canPlay,
    playCard,
    playFromHand,
    beginTurn,
    beginPlayerTurn,
    drawCards,
    discardHand,
    enemyTurn,
    endTurn,
    intentLabel,
    intentView,
    pileCount,
  };
})(typeof window !== "undefined" ? window : globalThis);
