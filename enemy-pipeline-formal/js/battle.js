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
  // 正式版フェーズ1（設計書 A-2）: ノイズ上限は 5 → 10。帯域で警報が段階化する（noiseBand 参照）
  const NOISE_MAX = 10;
  const SHOT = Object.freeze({ name: "射撃", damage: 8, label: "射撃 8dmg" });

  // 正式版フェーズ1（設計書 §A）: キャラ別パラメータ。
  // vessel07 = 従来通り（HP60／PWR回復3／COVER可）。vessel04 "GOLIATH" = HP120／PWR回復2／常時EXPOSE。
  // vessel09 "GHOST-TAPE"（設計書 DESIGN-GHOST-TAPE-DRAFT.md、2026-11-16 全決定）:
  // HP30／PWR回復3／COVER可／NOISE範囲 −3〜5（逆位相残量）／固有OS『磁気ホールド』（canHold）。
  const CHARACTERS = Object.freeze({
    vessel07: Object.freeze({ id: "vessel07", name: "VESSEL 07", code: "PANDORA", hp: PLAYER_HP, energyPerTurn: ENERGY_PER_TURN, canCover: true, noiseMin: 0, noiseMax: NOISE_MAX, canHold: false }),
    vessel04: Object.freeze({ id: "vessel04", name: "VESSEL 04", code: "GOLIATH", hp: 120, energyPerTurn: 2, canCover: false, noiseMin: 0, noiseMax: NOISE_MAX, canHold: false }),
    vessel09: Object.freeze({ id: "vessel09", name: "VESSEL 09", code: "GHOST-TAPE", hp: 30, energyPerTurn: 3, canCover: true, noiseMin: -3, noiseMax: 5, canHold: true }),
  });

  function characterDef(id) {
    return CHARACTERS[id] || CHARACTERS.vessel07;
  }

  // 機体別NOISEクランプ。GHOST-TAPE の負数（逆位相残量）は帯域効果を持たず、
  // 正の加算を相殺する緩衝材としてのみ働く（noiseBand は負数を静穏として扱う）。
  function noiseLimitsFor(characterId) {
    const def = characterDef(characterId);
    return { min: def.noiseMin || 0, max: typeof def.noiseMax === "number" ? def.noiseMax : NOISE_MAX };
  }

  function clampNoiseFor(value, characterId) {
    const lim = noiseLimitsFor(characterId);
    return Math.max(lim.min, Math.min(lim.max, value || 0));
  }

  function clampNoise(state, value) {
    return clampNoiseFor(value, state && state.characterId);
  }

  // A-2 帯域表（敵フェイズ判定）: atk = 敵の攻撃への上乗せ、extras = 追加行動の回数。
  function noiseBand(noise) {
    const n = Math.max(0, Math.min(NOISE_MAX, (noise || 0) | 0));
    if (n >= 10) return { id: "exposed", name: "完全露呈", atk: 6, extras: 2 };
    if (n >= 9) return { id: "lockdown", name: "LOCKDOWN", atk: 6, extras: 2 };
    if (n >= 7) return { id: "pursuit", name: "追跡強化", atk: 3, extras: 2 };
    if (n >= 5) return { id: "breach", name: "BREACH", atk: 3, extras: 1 };
    if (n >= 3) return { id: "alert", name: "警戒", atk: 0, extras: 1 };
    return { id: "calm", name: "静穏", atk: 0, extras: 0 };
  }

  // 警報バフは「現在の帯域」から導出する（旧仕様の BREACH ごとの累積 +3 は廃止）
  function syncAlertBuff(state) {
    state.alertBuff = noiseBand(state.noise).atk;
  }

  // 騒音力学（GOLIATH専用パッシブ）: 与ダメージと獲得BLKへの倍率。
  // 基準NOISEは「そのカード自身のNOISE加算前」の値（ctx.noiseBefore）。変換系には適用しない。
  function noiseScale(state, ctx) {
    if (!state || state.characterId !== "vessel04") return 1;
    const base = ctx && typeof ctx.noiseBefore === "number" ? ctx.noiseBefore : (state.noise || 0);
    return 1 + 0.10 * Math.max(0, base);
  }

  // 騒音力学の拡張（GOLIATH専用パッシブ）: 被攻撃ダメージの軽減量。
  // ヒット時点の現在NOISE（ライブ値。ターン開始時スナップショットではない）から
  // floor(NOISE × 0.5)、上限5。VESSEL 07 には適用しない。
  function noiseArmor(state) {
    if (!state || state.characterId !== "vessel04") return 0;
    return Math.min(5, Math.floor(Math.max(0, state.noise || 0) * 0.5));
  }

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

  // 正式版フェーズ1（設計書 §A）: GOLIATH 初期デッキ10枚（鉄塊打撃×4／重装甲×4／排気咆哮×1／スレッジハンマー×1）
  const GOLIATH_DECK = Object.freeze([
    root.Cards.get("goliath_iron_strike"),
    root.Cards.get("goliath_iron_strike"),
    root.Cards.get("goliath_iron_strike"),
    root.Cards.get("goliath_iron_strike"),
    root.Cards.get("goliath_heavy_plating"),
    root.Cards.get("goliath_heavy_plating"),
    root.Cards.get("goliath_heavy_plating"),
    root.Cards.get("goliath_heavy_plating"),
    root.Cards.get("goliath_exhaust_roar"),
    root.Cards.get("goliath_sledgehammer"),
  ].filter(Boolean));

  // 正式版: VESSEL 09 "GHOST-TAPE" 初期デッキ10枚（残響ニードル×4／消音テープ×4／テープ継ぎ×1／無音断章×1）
  const GHOST_TAPE_DECK = Object.freeze([
    root.Cards.get("ghost_echo_needle"),
    root.Cards.get("ghost_echo_needle"),
    root.Cards.get("ghost_echo_needle"),
    root.Cards.get("ghost_echo_needle"),
    root.Cards.get("ghost_mute_tape"),
    root.Cards.get("ghost_mute_tape"),
    root.Cards.get("ghost_mute_tape"),
    root.Cards.get("ghost_mute_tape"),
    root.Cards.get("ghost_tape_splice"),
    root.Cards.get("ghost_silent_cut"),
  ].filter(Boolean));

  const DECKS_BY_CHARACTER = { vessel04: GOLIATH_DECK, vessel09: GHOST_TAPE_DECK };

  function deckIdsFor(characterId) {
    return (DECKS_BY_CHARACTER[characterId] || DECK).map((card) => card.id);
  }

  function defaultDeckFor(characterId) {
    return (DECKS_BY_CHARACTER[characterId] || DECK).slice();
  }

  const byId = new Map(root.Cards.all.map((card) => [card.id, card]));
  for (const card of FINISHERS) byId.set(card.id, card);

  function lookup(id) {
    return byId.get(id)
      || (root.Rewards && root.Rewards.card(id))
      || (root.Relics && root.Relics.card(id))
      || null;
  }

  function resolveDeck(list, characterId) {
    if (!Array.isArray(list) || list.length === 0) return defaultDeckFor(characterId);
    const cards = [];
    for (const item of list) {
      const id = typeof item === "string" ? item : item && item.id;
      const card = lookup(id);
      if (card) cards.push(card);
    }
    return cards.length ? cards : defaultDeckFor(characterId);
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
      scrapCharges: 0,
      dead: false,
      block: 0,
      patternIndex: 0,
      pattern: [{ action: "attack", name: "射撃", value: 8, hits: 1 }],
    };
  }

  function createState(rng, options) {
    const relics = options && Array.isArray(options.relics) ? options.relics.slice() : [];
    const enemy = root.Enemies ? root.Enemies.make("enemy_sentry") : fallbackSentry();
    const charDef = characterDef(options && options.character);
    const deck = resolveDeck(options && options.deck, charDef.id);
    return {
      relics,
      characterId: charDef.id,
      // A-2 変換ルール: 変換系効果は「ターン開始時点のNOISEスナップショット」で計算する
      turnStartNoise: 0,
      cardsPlayedThisTurn: 0,
      drawPenaltyNext: 0,
      drawBonusNext: 0,
      // 『磁気ホールド』（GHOST-TAPE固有OS）: 敵フェイズ中の保持実体と、保持割引の対象実体ID
      retained: null,
      holdDiscountUid: 0,
      // 共通プール拡張（DESIGN-COMMON-POOL-EXPANSION-DRAFT.md）:
      // powers = 持続効果の汎用基盤。{ source, kind, value } の配列で、戦闘中ずっと残る。
      //   kind "energy_per_turn" = ターン開始時に PWR +value（予備電源）。
      //   将来の WEAVER（罠スタック）・REACTOR（臨界排熱）もこの配列へ種別を足して共有する想定。
      powers: [],
      // この戦闘で廃棄（exhaust）されたカードの累計枚数。圧縮穿孔（damage_per_exhausted）が参照する
      exhaustedCount: 0,
      // プレイヤー選択待ちの保留効果。{ kind: "search" } | { kind: "discard", draw }。
      // 効果解決時に登録され、main.js の選択フェイズが resolvePick で確定させる
      pendingPick: null,
      player: {
        hp: charDef.hp,
        hpMax: charDef.hp,
        energy: charDef.energyPerTurn,
        energyMax: charDef.energyPerTurn,
        stance: "EXPOSE",
        block: 0,
        stagger: 0,
        halveNext: 0,
        tread: 0,
      },
      enemy,
      noise: 0,
      alertBuff: 0,
      alertAim: 0,
      alertTelegraphed: null,
      turn: 1,
      drawPile: shuffle(deck, rng),
      hand: [],
      discard: [],
      exhaust: [],
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

  // 『磁気ホールド』の保持割引: 保持された実体だけが、次のターン中のみ実効PWR −1（下限0）。
  // 実体は __uid を持つ複製オブジェクトで識別する（定義オブジェクトは共有・凍結されているため）。
  let cardUidSeq = 0;

  function effectiveCost(state, card) {
    if (!card) return 0;
    if (card.__uid && state && card.__uid === state.holdDiscountUid) {
      return Math.max(0, (card.cost || 0) - 1);
    }
    return Math.max(0, card.cost || 0);
  }

  // 手札の各実体へ一意なIDを持つ複製を割り当てる（保持選択の開始時に UI から呼ぶ）。
  function tagHandInstances(state) {
    if (!state || !Array.isArray(state.hand)) return;
    state.hand = state.hand.map((card) => {
      if (card.__uid) return card;
      cardUidSeq += 1;
      return { ...card, __uid: cardUidSeq };
    });
  }

  // ターン終了時、手札の1実体を保持枠へ移す。呪装／使用不能カードは保持できない。
  function setRetained(state, uid) {
    if (!state || !characterDef(state.characterId).canHold) return false;
    const index = state.hand.findIndex((card) => card.__uid && card.__uid === uid);
    if (index < 0) return false;
    const card = state.hand[index];
    if (card.unplayable || card.cost < 0) return false;
    state.hand.splice(index, 1);
    state.retained = card;
    return true;
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
    if (state.player.energy < effectiveCost(state, card)) return { ok: false, reason: "energy" };
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

  function applyEffect(state, effect, log, ctx) {
    if (effect.type === "unplayable") return;
    // 正式版フェーズ1（設計書 A-2）: 効果の解決規則。
    // - 変換系（damage_per_noise / block_per_noise = 音響フレア／ジャミング・フレア／パージ＆パニッシュ）:
    //   ターン開始時点のNOISEスナップショットで計算し、騒音力学の倍率は乗せない（noScale）。
    // - 参照系（damage_plus_noise / block_plus_noise / damage_plus_played = スレッジハンマー等）:
    //   そのカード自身のNOISE加算前のNOISE（ctx.noiseBefore）を参照し、倍率が乗る。
    let noScale = false;
    if (effect.type === "damage_per_noise") {
      // GHOST-TAPE の負数（逆位相残量）は変換量へ数えない: 参照値は max(0, ターン開始時NOISE)
      effect = { ...effect, type: "damage", value: Math.max(0, state.turnStartNoise || 0) * (effect.value || 0) };
      noScale = true;
    } else if (effect.type === "block_per_noise") {
      effect = { ...effect, type: "block", value: Math.max(0, state.turnStartNoise || 0) * (effect.value || 0) };
      noScale = true;
    } else if (effect.type === "damage_silence_bonus") {
      // 静寂参照系（残響ニードル／無音断章／サイレンス・エンド）: 使用開始時点のNOISEが0以下なら per を加算
      const base = ctx ? ctx.noiseBefore : (state.noise || 0);
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (base <= 0 ? (effect.per || 0) : 0) };
    } else if (effect.type === "stun_if_silence") {
      // 逆位相ノイズ: カード自身のNOISE適用後の現在NOISEが0以下ならスタン（playCard が効果解決前にNOISEを反映する）
      if ((state.noise || 0) <= 0) addStun(state, effect.value || 1, log, true);
      else log.push("逆位相不成立 (ノイズ過多)");
      return;
    } else if (effect.type === "stun_draw_if_max") {
      // 幻聴テープ: スタンがこの効果で上限へ達したら1ドロー
      const beforeStun = state.enemy.stun || 0;
      addStun(state, effect.value || 1, log, true);
      if (!state.enemy.immuneToStun && beforeStun < (state.enemy.stunMax || 3) && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) {
        const res = drawCards(state, 1);
        for (const line of res.log) log.push(line);
      }
      return;
    } else if (effect.type === "scrap_noise") {
      // スクラップ・ノイズ: 敵の「次の攻撃行動1回分（全ヒット）」を半減するチャージを付与
      state.enemy.scrapCharges = (state.enemy.scrapCharges || 0) + (effect.value || 1);
      log.push(`SCRAP NOISE SET ×${state.enemy.scrapCharges} (次の攻撃 半減)`);
      return;
    } else if (effect.type === "draw_bonus_next") {
      // フェードアウト: 次ターン開始時ドロー +1（同ターンに複数回使っても最大 +1）
      state.drawBonusNext = Math.min(1, (state.drawBonusNext || 0) + (effect.value || 0));
      log.push("次ターン ドロー +1 (予約)");
      return;
    } else if (effect.type === "recycle_discard") {
      // リール・リサイクル: 捨て札から使用可能な1枚をランダムに手札へ。対象がなければ1ドロー。
      // このカード自身は解決時点ではまだ手札にあるため対象にならない。
      const candidates = state.discard.filter((card) => card && !card.unplayable && card.cost >= 0);
      if (candidates.length === 0) {
        const res = drawCards(state, 1);
        for (const line of res.log) log.push(line);
      } else {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        state.discard.splice(state.discard.indexOf(picked), 1);
        state.hand.push(picked);
        log.push(`RECYCLE ${picked.name}`);
      }
      return;
    } else if (effect.type === "damage_plus_noise") {
      const base = ctx ? ctx.noiseBefore : (state.noise || 0);
      effect = { ...effect, type: "damage", value: (effect.value || 0) + base * (effect.per || 0) };
    } else if (effect.type === "block_plus_noise") {
      const base = ctx ? ctx.noiseBefore : (state.noise || 0);
      effect = { ...effect, type: "block", value: (effect.value || 0) + base * (effect.per || 0) };
    } else if (effect.type === "damage_plus_played") {
      const played = ctx ? ctx.playedBefore : (state.cardsPlayedThisTurn || 0);
      effect = { ...effect, type: "damage", value: (effect.value || 0) + played * (effect.per || 0) };
    } else if (effect.type === "damage_per_exhausted") {
      // 圧縮穿孔（参照系）: 基礎値＋この戦闘で廃棄した枚数×per。このカード自身は廃棄されないため、
      // 解決時点の exhaustedCount（過去の使用分のみ）を参照する。騒音力学の倍率は通常どおり乗る
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (state.exhaustedCount || 0) * (effect.per || 0) };
    } else if (effect.type === "damage_stance_bonus") {
      // 物陰の一撃（参照系）: 使用開始時点のスタンス（ctx.stanceBefore）が指定スタンスなら per を加算。
      // ノイズで COVER が解ける前のスタンスで判定するため、ctx のスナップショットを使う。
      // GOLIATH は常時EXPOSEなので COVER 指定では永遠に発動しない（設計書どおり意図的な非対称）
      const stanceAtPlay = ctx ? ctx.stanceBefore : state.player.stance;
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (stanceAtPlay === (effect.stance || "COVER") ? (effect.per || 0) : 0) };
    } else if (effect.type === "search") {
      // 残響サーチ: 山札から1枚選んで手札へ。選択は UI（main.js の選択フェイズ）に委ね、
      // ここでは保留だけ登録する。実際の移動は resolvePick が行う
      state.pendingPick = { kind: "search" };
      log.push("ECHO SEARCH 山札から1枚選択");
      return;
    } else if (effect.type === "discard_then_draw") {
      // 箔の選別: 手札1枚を捨てて value 枚ドロー。捨てる札の選択を UI に委ね、保留だけ登録する。
      // このカード自身は playFromHand の後処理で手札から離れるため、選択肢には含まれない
      state.pendingPick = { kind: "discard", draw: effect.value || 1 };
      log.push("FOIL SORT 捨てるカードを1枚選択");
      return;
    } else if (effect.type === "weaken_next") {
      // 照準攪乱: 敵の「次の攻撃行動1回分（全ヒット）」を半減するチャージを付与（スクラップ・ノイズと同系・重ねがけ可）
      state.enemy.weakenNext = (state.enemy.weakenNext || 0) + (effect.value || 1);
      log.push(`AIM JAM SET ×${state.enemy.weakenNext} (次の攻撃 半減)`);
      return;
    } else if (effect.type === "power") {
      // 持続パワー（予備電源）: state.powers へ登録し、戦闘の間ずっと残る。
      // 発動タイミングは種別ごと（energy_per_turn は beginPlayerTurn）。同じカードを複数回使えば積み重なる
      state.powers = state.powers || [];
      state.powers.push({ source: (ctx && ctx.cardId) || effect.powerId || "power", kind: effect.kind || "", value: effect.value || 0 });
      log.push(`POWER SET ${effect.powerId || effect.kind || "power"} (戦闘中 持続)`);
      return;
    } else if (effect.type === "tread") {
      // 重圧歩行: このターンの敵フェイズ中、被攻撃ダメージを「カード使用前のNOISE」分だけ固定軽減
      state.player.tread = ctx ? ctx.noiseBefore : (state.noise || 0);
      log.push(`TREAD -${state.player.tread} (このターン)`);
      return;
    } else if (effect.type === "draw_penalty_next") {
      state.drawPenaltyNext = (state.drawPenaltyNext || 0) + (effect.value || 0);
      log.push(`次ターン ドロー -${effect.value}`);
      return;
    }
    let amount = effect.value;
    // 騒音力学の倍率（GOLIATHのみ）: 敵へのダメージと自BLK獲得に適用。自傷・回復等には適用しない
    if (!noScale && state.characterId === "vessel04"
      && ((effect.target === "enemy" && effect.type === "damage")
        || (effect.target === "player" && effect.type === "block"))) {
      amount = Math.round(amount * noiseScale(state, ctx));
    }
    if (effect.target === "enemy" && effect.type === "damage") {
      const hits = effect.hits || 1;
      for (let h = 0; h < hits; h += 1) {
        if (state.enemy.hp <= 0) break;
        const block = effect.pierce ? 0 : (state.enemy.block || 0);
        const soaked = Math.min(block, amount);
        const dealt = amount - soaked;
        if (soaked > 0) {
          state.enemy.block = block - soaked;
          log.push(`BLOCKED ${soaked}`);
        }
        state.enemy.hp = Math.max(0, state.enemy.hp - dealt);
        if (state.enemy.hp === 0) state.enemy.dead = true;
        log.push(`DMG ${dealt}${effect.pierce ? " PIERCE" : ""}  HP ${state.enemy.hp}`);
      }
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
      // PROMPT-23: 電力の増加は最大値を超えない。ただし overcharge 指定（違法オーバークロック）は上限を突破する
      const cap = effect.overcharge ? Number.POSITIVE_INFINITY : state.player.energyMax;
      state.player.energy = Math.min(cap, state.player.energy + amount);
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
    if (effect.target === "player" && effect.type === "heal") {
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.hpMax, state.player.hp + amount);
      log.push(`HEAL +${state.player.hp - before}  HP ${state.player.hp}`);
      return;
    }
    if (effect.target === "player" && effect.type === "drain_energy") {
      state.player.energy = 0;
      log.push("PWR DRAINED  TOTAL 0");
      return;
    }
    if (effect.target === "player" && effect.type === "reset_noise") {
      state.noise = 0;
      log.push("NOISE RESET  TOTAL 0");
      return;
    }
    if (effect.target === "player" && effect.type === "draw") {
      const res = drawCards(state, amount);
      for (const line of res.log) log.push(line);
      return;
    }
    if (effect.target === "player" && effect.type === "halve_next") {
      state.player.halveNext = (state.player.halveNext || 0) + amount;
      log.push("DECOY SET - NEXT DAMAGE HALVED");
      return;
    }
    if (effect.target === "enemy" && effect.type === "instant_kill") {
      state.enemy.hp = 0;
      state.enemy.dead = true;
      log.push("NEUTRALIZED");
    }
  }

  function playCard(state, card) {
    // 音響穿孔サウンド（ピーーッガガガ…＋ガシャシャン！）は UI 側（main.js の onRead）が
    // AudioManager.playPunch(intensity) で鳴らす。intensity はカードのノイズ値＋警報時+1。
    const check = canPlay(state, card);
    if (!check.ok) return { ok: false, reason: check.reason, log: [] };
    // 保持割引は実効コストで支払う（canPlay と同じ基準）
    state.player.energy -= effectiveCost(state, card);
    const isGoliath = state.characterId === "vessel04";
    // 効果解決の基準値: このカード自身のNOISE加算前のNOISEと、使用前までに切った枚数、
    // 使用開始時点のスタンス（物陰の一撃の stance_bonus 判定用）、使用カードID（power の出所記録用）
    const ctx = { noiseBefore: state.noise || 0, playedBefore: state.cardsPlayedThisTurn || 0, stanceBefore: state.player.stance, cardId: card.id };
    // PROMPT-23: 潜伏中はノイズ-1（下限0）。ノイズの出るカードは潜伏を解くが、
    // COVER を付与するカード自身（CQC打撃など）は解除の例外とする
    // 正式版フェーズ1: GOLIATH は常時EXPOSEで潜伏の抑制・解除は一切発生しない
    const inCover = !isGoliath && state.player.stance === "COVER";
    const rawNoise = card.noise || 0;
    // 負ノイズ（ノイズ・キャンセラー等）は潜伏の抑制対象外。そのまま増減する
    const effNoise = rawNoise < 0 ? rawNoise : (inCover ? Math.max(0, rawNoise - 1) : rawNoise);
    // A-2: 機体別範囲で頭打ち（07／GOLIATH は 0〜10、GHOST-TAPE は −3〜5＝逆位相残量）
    state.noise = clampNoise(state, state.noise + effNoise);
    const log = [];
    if (inCover && (rawNoise > 0 || card.breaksCover === true) && card.stance_change !== "COVER") {
      state.player.stance = "EXPOSE";
      log.push("COVER BROKEN");
    }
    // 正式版フェーズ1（設計書 §A）: GOLIATH の態勢処理と「規格外巨体」COVER置換
    let oversized = false;
    if (isGoliath) {
      state.player.stance = "EXPOSE";
      if (card.stance_change === "COVER" && card.type !== "attack") {
        // 共通プールのCOVER系スキル／防御カード: COVER態勢変化は不発（エラー）になり、
        // 代わりに BLK +5（固定・倍率なし）と強制 NOISE +1 に自動変換される。
        // カード自体の効果（防護など）は通常どおり解決する。
        oversized = true;
        state.player.block += 5;
        state.noise = clampNoise(state, state.noise + 1);
        log.push("[ERROR: OVERSIZED VESSEL]");
        log.push("COVER不発 → 代替処理: BLK +5 / NOISE +1");
      }
      // 攻撃カードの stance_change は単に無効（態勢はEXPOSE固定）
    } else if (card.stance_change) {
      state.player.stance = card.stance_change;
    }
    log.unshift(`PWR ${state.player.energy}  STANCE ${state.player.stance}`);
    for (const effect of card.effects) applyEffect(state, effect, log, ctx);
    // 検収修正 2026-11-10 (PROMPT-19): CQCカテゴリのカードはスタン+1（設計欠落の補完）
    if (card.category === "CQC" && !state.enemy.dead) addStun(state, 1, log, false);
    state.cardsPlayedThisTurn = ctx.playedBefore + 1;
    log.push(`NOISE ${effNoise >= 0 ? "+" : ""}${effNoise}${effNoise !== rawNoise && rawNoise >= 0 ? ` (COVER -${rawNoise - effNoise})` : ""}  TOTAL ${state.noise}`);
    // 正式版フェーズ1（A-2）: 旧「上限到達でBREACH＋2へリセット」は廃止。
    // 警報バフは現在の帯域から導出し直し、BREACH帯域（5+）へ新たに踏み込んだ時だけ
    // UI側の警報演出（main.js の playBreach）用に breach フラグを立てる。
    syncAlertBuff(state);
    let breach = false;
    if (ctx.noiseBefore < 5 && state.noise >= 5) {
      breach = true;
      log.push("!! SECURITY BREACH - ENEMY ALERTED !!");
      log.push(`警報帯域: ${noiseBand(state.noise).name} (敵攻撃 +${state.alertBuff})`);
    }
    return { ok: true, reason: "", log, breach, oversized };
  }

  function playFromHand(state, cardId, uid) {
    // uid が渡された場合はその実体を優先する（保持割引の対象実体を取り違えないため）
    let index = uid ? state.hand.findIndex((card) => card.__uid && card.__uid === uid) : -1;
    if (index < 0) index = state.hand.findIndex((card) => card.id === cardId);
    if (index < 0) return { ok: false, reason: "missing", log: [] };
    const card = state.hand[index];
    const result = playCard(state, card);
    if (!result.ok) return result;
    state.hand.splice(index, 1);
    if (card.__uid && card.__uid === state.holdDiscountUid) {
      state.holdDiscountUid = 0;
      card.__heldNow = false;
      result.log.push("HOLD割引 適用 (PWR −1)");
    }
    if (card.isExhaust) {
      state.exhaust.push(card);
      // 圧縮穿孔（damage_per_exhausted）の参照カウンタ。この戦闘の累計
      state.exhaustedCount = (state.exhaustedCount || 0) + 1;
      result.log.push(`EXHAUST ${card.name}`);
    } else {
      state.discard.push(card);
    }
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

  // ==== 共通プール拡張: プレイヤー選択（pendingPick）の候補提示と確定 ====
  // search = 山札（drawPile）の中身が候補。discard = 現在の手札が候補（使用した箔の選別自身は
  // playFromHand の後処理で既に手札を離れているため含まれない）。
  function pickCandidates(state) {
    if (!state || !state.pendingPick) return [];
    if (state.pendingPick.kind === "search") return state.drawPile.slice();
    if (state.pendingPick.kind === "discard") return state.hand.slice();
    return [];
  }

  // cardId が null の場合は「候補なし」の自動解決（search は不発、discard はドローのみ実施）。
  function resolvePick(state, cardId) {
    const pick = state ? state.pendingPick : null;
    if (!pick) return { ok: false, log: [] };
    state.pendingPick = null;
    const log = [];
    if (pick.kind === "search") {
      const index = cardId ? state.drawPile.findIndex((card) => card.id === cardId) : -1;
      if (index < 0) {
        log.push("ECHO SEARCH 不発 (山札に対象なし)");
        return { ok: false, log };
      }
      const picked = state.drawPile.splice(index, 1)[0];
      state.hand.push(picked);
      log.push(`SEARCH ${picked.name} を手札へ`);
      return { ok: true, log };
    }
    if (pick.kind === "discard") {
      if (cardId) {
        const index = state.hand.findIndex((card) => card.id === cardId);
        if (index < 0) {
          log.push("FOIL SORT 不発 (対象なし)");
          return { ok: false, log };
        }
        const dropped = state.hand.splice(index, 1)[0];
        state.discard.push(dropped);
        log.push(`DISCARD ${dropped.name}`);
      }
      const res = drawCards(state, pick.draw || 1);
      for (const line of res.log) log.push(line);
      return { ok: true, log };
    }
    return { ok: false, log };
  }

  function discardHand(state) {
    const moved = state.hand.splice(0, state.hand.length);
    // 保持割引の表示フラグはターン終了で失効する（実体＝複製オブジェクトにだけ触る）
    for (const card of moved) if (card.__uid) card.__heldNow = false;
    state.discard.push(...moved);
    return moved;
  }

  function startCombat(state) {
    return { log: applyRelics(state, "start_of_combat") };
  }

  function beginPlayerTurn(state, rng) {
    beginTurn(state);
    // 共通プール拡張: 持続パワー（state.powers）のターン開始時発動。
    // energy_per_turn（予備電源）は beginTurn で energyMax へ戻った直後に上限を超えて加算する
    // （上限で止めると意味がない。違法オーバークロックの overcharge と同じ扱い）。
    // 将来の種別（WEAVER の罠・REACTOR の臨界排熱など）もここへ発動を足す。
    const powerNotes = [];
    for (const power of state.powers || []) {
      if (power.kind === "energy_per_turn" && power.value) {
        state.player.energy += power.value;
        powerNotes.push(`POWER ${power.source} PWR +${power.value}`);
      }
    }
    // 正式版フェーズ1（A-2）: ターン開始時点のNOISEをスナップショットする（変換系の計算基準）。
    // あわせてターン内カウンタと重圧歩行の軽減をリセットする。
    state.turnStartNoise = state.noise || 0;
    state.cardsPlayedThisTurn = 0;
    state.player.tread = 0;
    syncAlertBuff(state);
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
    // 正式版フェーズ1: 鋼圧プレスの「次のターンの開始時ドロー −1」をここで消費する
    const penalty = state.drawPenaltyNext || 0;
    state.drawPenaltyNext = 0;
    if (penalty > 0) notes.push(`DRAW -${penalty} (鋼圧プレス)`);
    // フェードアウトの「次ターン ドロー +1」予約（最大 +1）をここで消費する
    const bonus = state.drawBonusNext || 0;
    state.drawBonusNext = 0;
    if (bonus > 0) notes.push(`DRAW +${bonus} (フェードアウト)`);
    const drawn = drawCards(state, Math.max(0, HAND_SIZE - penalty + bonus), rng);
    // 『磁気ホールド』: 保持実体を手札の左端へ戻し、このターンだけ保持割引を有効化する。
    // 保持札は通常ドローの枚数に数えない（保持1枚＋通常ドロー）。
    if (state.retained) {
      const heldCard = state.retained;
      state.retained = null;
      heldCard.__heldNow = true;
      state.holdDiscountUid = heldCard.__uid || 0;
      state.hand.unshift(heldCard);
      drawn.drawn.unshift(heldCard);
      notes.push(`HOLD ${heldCard.name} (このターン PWR −1)`);
    }
    return { drawn: drawn.drawn, log: [`PWR ${state.player.energy}`, ...powerNotes, ...notes, ...drawn.log] };
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

  // v15.0 警戒段階（ノイズ3〜4）: 敵は追加行動を1つ予告し、敵ターンに通常行動の後で実施する。
  // 選択は状況依存の純関数（表示と実施で同じ結果になる）。敵ターン開始時にノイズが3未満なら取消。
  const ALERT_NOISE = 3;
  const ALERT_EXTRA_LABEL = Object.freeze({
    pursuit: "追加行動: 追撃",
    aim: "追加行動: 照準",
    jam: "追加行動: 攪乱",
  });

  function alertExtraKind(state) {
    if (!state || !state.enemy || state.enemy.dead) return null;
    if ((state.noise || 0) < ALERT_NOISE) return null;
    if (!state.enemy.immuneToStun && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) return null;
    if ((state.enemy.cancelNextIntent || 0) > 0) return null;
    if (state.player.stance === "COVER") return "jam";
    const intent = currentIntent(state.enemy);
    if (intent && intent.action === "heavy_attack") return "aim";
    return "pursuit";
  }

  function executeAlertExtra(state, kind, mainIntent, log, result) {
    if (kind === "jam") {
      if (state.player.stance === "COVER") {
        state.player.stance = "EXPOSE";
        log.push("追加行動: 攪乱  COVER解除");
      } else {
        log.push("追加行動: 攪乱  (潜伏なし)");
      }
      return;
    }
    if (kind === "aim") {
      state.alertAim = (state.alertAim || 0) + 2;
      log.push("追加行動: 照準  次の攻撃+2");
      return;
    }
    // pursuit: 通常攻撃の半分程度の追加攻撃
    const base = mainIntent && typeof mainIntent.value === "number" ? mainIntent.value : SHOT.damage;
    const value = Math.max(1, Math.ceil(base / 2));
    log.push(`追加行動: 追撃 ${value}dmg`);
    const sub = strikeVolley(state, { action: "attack", name: "追撃", value, hits: 1 }, log);
    if (sub.damage > 0) {
      result.damage = (result.damage || 0) + sub.damage;
      result.outcome = "hit";
      if (!result.call || result.damage === sub.damage) result.call = `${result.damage} DMG`;
    }
  }

  // スクラップ・ノイズ（敵デバフ）: 攻撃系行動1回分について、全ヒットの基礎値を半減する。
  // 計算順序は「基礎値＋警報バフ＋照準 → 半減（切り捨て）→ COVER −2 → 固定軽減 → BLK相殺」。
  // 非攻撃行動・スタン・キャンセルでは消費しない（strikeVolley を通らないため自然に残る）。
  function isAttackIntent(intent) {
    return !!intent && (intent.action === "attack" || intent.action === "heavy_attack" || intent.action === "attack_stun");
  }

  function scrapHalvedValue(state, intent, value) {
    if (!isAttackIntent(intent)) return value;
    if (!state.enemy) return value;
    // 表示専用の実効値: スクラップ・ノイズ → 照準攪乱（weaken）の順に半減する（実解決の strikeVolley と同じ順序）
    let shown = value;
    if ((state.enemy.scrapCharges || 0) > 0) shown = Math.floor(shown / 2);
    if ((state.enemy.weakenNext || 0) > 0) shown = Math.floor(shown / 2);
    return shown;
  }

  function strikeVolley(state, intent, log) {
    // PROMPT-23: 被ダメージ計算順序 = 基本値（+警報バフ）→ 潜伏-2 → 防護で相殺 → HP
    const hits = intent.hits || 1;
    let value = (intent.value || 0) + (state.alertBuff || 0);
    // v15.0: 照準（追加行動）の +2 は次の攻撃で消費される
    if ((state.alertAim || 0) > 0) {
      value += state.alertAim;
      log.push(`照準 +${state.alertAim}`);
      state.alertAim = 0;
    }
    // スクラップ・ノイズ: この攻撃行動で1チャージだけ消費し、全ヒットを半減する
    if (isAttackIntent(intent) && (state.enemy.scrapCharges || 0) > 0) {
      state.enemy.scrapCharges -= 1;
      value = Math.floor(value / 2);
      log.push(`SCRAP NOISE: 攻撃半減 → ${value}dmg`);
    }
    // 照準攪乱（weaken）: スクラップと同系の半減チャージ。両方あれば順に半減する
    if (isAttackIntent(intent) && (state.enemy.weakenNext || 0) > 0) {
      state.enemy.weakenNext -= 1;
      value = Math.floor(value / 2);
      log.push(`AIM JAM: 攻撃半減 → ${value}dmg`);
    }
    let dealt = 0;
    let soakedTotal = 0;
    let evaded = false;
    for (let i = 0; i < hits; i += 1) {
      if (state.player.hp <= 0) break;
      let dmg = value;
      if (i === 0 && (state.player.halveNext || 0) > 0) {
        state.player.halveNext -= 1;
        dmg = Math.floor(dmg / 2);
        log.push(`DECOY HALVED ${dmg}`);
      }
      if (state.player.stance === "COVER") {
        dmg = Math.max(0, dmg - 2);
        if (dmg === 0) evaded = true;
      }
      // 正式版フェーズ1: 重圧歩行（GOLIATH）の固定値軽減。COVER軽減の後・防護相殺の前に1ヒットごとに適用
      if ((state.player.tread || 0) > 0 && dmg > 0) {
        const cut = Math.min(dmg, state.player.tread);
        dmg -= cut;
        if (cut > 0) log.push(`TREAD -${cut}`);
      }
      // 正式版 修正第2弾: 騒音力学の拡張（GOLIATHのみ）。被攻撃ダメージを現在NOISE連動で軽減する。
      // 重圧歩行の後・防護相殺の前に1ヒットごとに適用し、重圧歩行とは重ねがけされる。
      if (state.characterId === "vessel04" && dmg > 0) {
        const armor = noiseArmor(state);
        if (armor > 0) {
          const cut = Math.min(dmg, armor);
          dmg -= cut;
          if (cut > 0) log.push(`騒音力学: 装甲が衝撃を呑む -${cut}`);
        }
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
    // v15.0: 警戒の予告（インテント表示時に記録された追加行動の種類）を引き継ぐ
    const telegraphed = state.alertTelegraphed || null;
    state.alertTelegraphed = null;
    if (state.enemy.dead) {
      log.push("TARGET DOWN");
      return { log, outcome: "down", damage: 0, call: "", action: null, alert: { telegraphed, kind: null, cancelled: false } };
    }
    if (state.enemy.cancelNextIntent > 0) {
      state.enemy.cancelNextIntent -= 1;
      advancePattern(state.enemy);
      log.push("INTENT CANCELLED");
      return { log, outcome: "cancelled", damage: 0, call: "CANCELLED", action: { label: "CANCELLED", kind: "cancelled" }, alert: { telegraphed, kind: null, cancelled: !!telegraphed } };
    }
    // 検収修正 2026-11-10 (PROMPT-19): スタン最大で敵の行動をショート（設計欠落の補完）
    if (!state.enemy.immuneToStun && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) {
      state.enemy.stun = 0;
      advancePattern(state.enemy);
      log.push("STUNNED - 行動ショート");
      return { log, outcome: "stunned", damage: 0, call: "STUNNED", action: { label: "STUNNED", kind: "stunned" }, alert: { telegraphed, kind: null, cancelled: !!telegraphed } };
    }
    // 正式版フェーズ1（A-2）: 敵フェイズ開始時点の帯域で警報バフを確定させる
    syncAlertBuff(state);
    const mainIntent = currentIntent(state.enemy);
    // v15.3 案A: 中央バナー用の「実行された行動」ラベル。表示中のインテント予告
    // （intentView）と同じく警報バフ＋照準を合算した実効値で組む。
    const effBuff = (state.alertBuff || 0) + (state.alertAim || 0);
    // スクラップ・ノイズのチャージがある場合は半減後の実効値でバナーを組む（表示専用・消費しない）
    let shownIntent = mainIntent;
    if (isAttackIntent(mainIntent)) {
      const rawValue = (mainIntent.value || 0) + effBuff;
      const shownValue = scrapHalvedValue(state, mainIntent, rawValue);
      if (shownValue !== (mainIntent.value || 0)) shownIntent = { ...mainIntent, value: shownValue };
    }
    const actionInfo = { label: intentText(shownIntent), kind: mainIntent.action || "" };
    const result = resolveIntent(state, mainIntent, log);
    result.action = actionInfo;
    advancePattern(state.enemy);
    // 正式版フェーズ1（A-2）: 帯域の追加行動（通常行動の後に実施）。
    // 警戒/BREACH帯域=1回、追跡強化/LOCKDOWN/完全露呈=2回。ノイズが3未満へ下がっていれば取消。
    const band = noiseBand(state.noise);
    const alert = { telegraphed, kind: null, cancelled: false, count: 0, band: band.id };
    if (state.player.hp > 0 && !state.enemy.dead) {
      if (band.extras > 0) {
        for (let i = 0; i < band.extras; i += 1) {
          const kind = (i === 0 && telegraphed) ? telegraphed : (alertExtraKind(state) || "pursuit");
          alert.kind = kind;
          alert.count += 1;
          executeAlertExtra(state, kind, mainIntent, log, result);
          if (state.player.hp <= 0 || state.enemy.dead) break;
        }
      } else if (telegraphed) {
        alert.cancelled = true;
        log.push("追加行動 取消 (ノイズ低下)");
      }
    }
    result.alert = alert;
    return result;
  }

  function intentView(state) {
    if (state.enemy.dead) {
      state.alertTelegraphed = null;
      return { label: "無力", action: "", extra: null };
    }
    const intent = currentIntent(state.enemy);
    if (!state.enemy.immuneToStun && (state.enemy.stun || 0) >= (state.enemy.stunMax || 3)) {
      // PROMPT-25: スタン（行動不能）のインテント表記は英字タグ STUNNED に統一する
      state.alertTelegraphed = null;
      return { label: "STUNNED", action: "stunned", extra: null };
    }
    // v15.0: 表示値は警報バフ＋照準を合算。警戒中は追加行動も予告する（予告は state に記録し、敵ターンが引き継ぐ）
    // 正式版フェーズ1（A-2）: 警報バフは現在の帯域から導出し、追加行動は帯域の回数（1 or 2）で予告する
    syncAlertBuff(state);
    const buff = (state.alertBuff || 0) + (state.alertAim || 0);
    // スクラップ・ノイズのチャージがある間は、予告も半減後の実効値で出す（表示専用・消費しない）
    let shown = intent;
    if (isAttackIntent(intent)) {
      const rawValue = (intent.value || 0) + buff;
      const shownValue = scrapHalvedValue(state, intent, rawValue);
      if (shownValue !== (intent.value || 0)) shown = { ...intent, value: shownValue };
    }
    const label = intentText(shown);
    const kind = alertExtraKind(state);
    state.alertTelegraphed = kind;
    const band = noiseBand(state.noise);
    const extra = kind
      ? { kind, count: band.extras, label: band.extras > 1 ? `${ALERT_EXTRA_LABEL[kind]} ×${band.extras}` : ALERT_EXTRA_LABEL[kind] }
      : null;
    // PROMPT-25: ラベルが STUNNED のインテント（チュートリアルの強制インテント等）も同じタグ表示にする
    return { label, action: label === "STUNNED" ? "stunned" : (intent.action || ""), extra };
  }

  function intentLabel(state) {
    return intentView(state).label;
  }

  function endTurn(state, rng) {
    const log = [];
    // 選択保留（search／discard）はターン終了で消散する（UI側でも選択中はターン終了をブロックする）
    state.pendingPick = null;
    // 保持割引は「保持した次のターン」限り。使われなかった分の割引はここで失効する
    // （同じ実体がこの後の保持選択で選び直された場合だけ、翌ターンに新しい割引が付く）。
    state.holdDiscountUid = 0;
    const discarded = discardHand(state);
    log.push(`DISCARD ${discarded.length}`);
    const enemy = enemyTurn(state);
    log.push(...enemy.log);
    // 正式版フェーズ1（A-2）: 完全露呈の天井リセット。ノイズ10の敵フェイズは LOCKDOWN 相当で
    // 解決し（noiseBand／enemyTurn 側）、フェイズ終了時に NOISE を 5 へ落とす（熱は深く残る）。
    let exposedReset = false;
    if ((state.noise || 0) >= NOISE_MAX) {
      state.noise = 5;
      syncAlertBuff(state);
      exposedReset = true;
      log.push("完全露呈 - 警報リセット  NOISE 5 (熱が残っている)");
    }
    state.turn += 1;
    const started = beginPlayerTurn(state, rng);
    log.push(...started.log);
    return { log, discarded, drawn: started.drawn, enemy, exposedReset };
  }

  function pileCount(state) {
    return state.drawPile.length + state.hand.length + state.discard.length + (state.exhaust ? state.exhaust.length : 0) + (state.retained ? 1 : 0);
  }

  root.Battle = {
    DECK,
    GOLIATH_DECK,
    GHOST_TAPE_DECK,
    CHARACTERS,
    characterDef,
    noiseLimitsFor,
    clampNoiseFor,
    effectiveCost,
    tagHandInstances,
    setRetained,
    pickCandidates,
    resolvePick,
    deckIdsFor,
    ENERGY_PER_TURN,
    STUN_MAX,
    HAND_SIZE,
    NOISE_MAX,
    ALERT_NOISE,
    noiseBand,
    syncAlertBuff,
    alertExtraKind,
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
