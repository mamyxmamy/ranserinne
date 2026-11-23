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
    // vessel07 の cctv（戦闘演出強化 段階1／JOB 1-2）: キャラ別 CCTV 画のパス定義のみ。
    // expose／cover は待機画（未指定キャラは従来の汎用画へフォールバック）、
    // attack／hitExpose はポーズ画。プリロードは main.js の startRun が行う。
    vessel07: Object.freeze({ id: "vessel07", name: "VESSEL 07", code: "PANDORA", hp: PLAYER_HP, energyPerTurn: ENERGY_PER_TURN, canCover: true, noiseMin: 0, noiseMax: NOISE_MAX, canHold: false, cctv: Object.freeze({ expose: "assets/cctv_vessel07_expose.webp", cover: "assets/cctv_vessel07_cover.webp", attack: "assets/cctv_vessel07_attack.webp", hitExpose: "assets/cctv_vessel07_hit_expose.webp" }) }),
    vessel04: Object.freeze({ id: "vessel04", name: "VESSEL 04", code: "GOLIATH", hp: 120, energyPerTurn: 2, canCover: false, noiseMin: 0, noiseMax: NOISE_MAX, canHold: false }),
    vessel09: Object.freeze({ id: "vessel09", name: "VESSEL 09", code: "GHOST-TAPE", hp: 30, energyPerTurn: 3, canCover: true, noiseMin: -3, noiseMax: 5, canHold: true }),
    // vessel13 "WEAVER"（設計書 DESIGN-WEAVER-DRAFT.md＋実装追補、2026-11-16 本人一括GO）:
    // HP50／PWR回復3／NOISE上限5／固有OS『アナログ・トラップ機構』（state.traps）と
    // 『余剰電力装甲』（standbyArmor: 残PWR×4 をターン終了時に BLK へ変換）。
    vessel13: Object.freeze({ id: "vessel13", name: "VESSEL 13", code: "WEAVER", hp: 50, energyPerTurn: 3, canCover: true, noiseMin: 0, noiseMax: 5, canHold: false, standbyArmor: 4 }),
    // vessel00 "REACTOR"（設計書 DESIGN-REACTOR-DRAFT.md＋実装追補 DESIGN-REACTOR-IMPL-ADDENDUM.md、2026-11-17 本人決定）:
    // HP80／PWR回復4（全機体トップ）／NOISE 0〜5。固有OS『炉心溶融』＝PWR不足分を HP 5/PWR の
    // コストで払って使用可（コストは BLK・軽減の対象外、HP 0 以下で敗北＝自滅あり）。
    // 固有OS『臨界排熱』＝purgeActive／purgeCount（戦闘内のみ。始動は炉心臨界、廃棄カードで +1）。
    vessel00: Object.freeze({ id: "vessel00", name: "VESSEL 00", code: "REACTOR", hp: 80, energyPerTurn: 4, canCover: true, noiseMin: 0, noiseMax: 5, canHold: false }),
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

  // 第2陣 2D (RB-5 帯域緩衝スプリング): 帯域「判定」に使う NOISE は実値から band_shift 分
  // だけ低いものとして扱う（下限 0）。実値そのもの・表示・変換系の計算基準・騒音力学の
  // 倍率は一切変えない。適用する消費者は FINAL §2.2 の消費者表どおり次の2系統だけ:
  //   #1 syncAlertBuff（敵攻撃への上乗せ atk の算出）
  //   #2 追加行動の回数（extras）の決定（enemyTurn／intentView の帯域参照）
  // 適用しない: #4 警報の予告判定（alertExtraKind は生値 ≥3 を直接見る。変更しない）、
  // #5 完全露呈リセット（生値の上限機構。変更しない）、#3 排除優先度（priorityPlayer。
  // ソロでは対象外・段階(4) で再判断のため変更しない）。
  function relicBandShift(state) {
    return root.Relics && root.Relics.bandShift ? root.Relics.bandShift(state) : 0;
  }

  function judgedBand(state, rawNoise) {
    const shift = relicBandShift(state);
    if (!(shift > 0)) return noiseBand(rawNoise);
    return noiseBand(Math.max(0, (rawNoise || 0) - shift));
  }

  // 警報バフは「現在の帯域」から導出する（旧仕様の BREACH ごとの累積 +3 は廃止）
  // 単位2-2（J2）: alert 系は PlayerState 側へ移設した。syncAlertBuff は対象プレイヤー
  // （第2引数／スコープ／既定 players[0]）の noise からその素体の alertBuff を算出する。
  // players を持たない旧形 state では従来どおり state 自身へ書く。
  // 第2陣 2D: 算出には判定帯域（judgedBand）を使う（消費者 #1）。
  function syncAlertBuff(state, ref) {
    const player = resolvePlayer(state, ref);
    if (player) {
      player.alertBuff = judgedBand(state, player.noise).atk;
      return player.alertBuff;
    }
    state.alertBuff = judgedBand(state, state.noise).atk;
    return state.alertBuff;
  }

  /* 第2陣 2E (RB-6 予備心臓ポンプ／R-12＋R-17): 致死時の判定介入。
     対象プレイヤーの HP が 0 以下で、致死回避レリックが未使用なら消費して HP を 1 に
     戻し、true を返す。使用済みの記録は state.relicUsed（ラン側の任意フィールドと
     共有されるオブジェクト）へ残るため、戦闘をまたいでもラン中 1 回限りになる。
     介入箇所は致死経路4系統: strikeVolley（敵攻撃）／playCard の炉心溶融の支払い／
     applyPlayerEndProcessing の臨界排熱スリップ／applyEffect のカード自傷。 */
  function trySparePump(view, log) {
    if (!view || !view.player || (view.player.hp || 0) > 0) return false;
    if (!root.Relics || !root.Relics.consumeLethalGuard) return false;
    const relic = root.Relics.consumeLethalGuard(view);
    if (!relic) return false;
    view.player.hp = 1;
    if (log) log.push(`PART ${relic.name}  HP 1 で耐えた`);
    return true;
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
    { id: "cqc_disable_01", name: "関節破壊 (DISABLE)", flavor: "「動きの鈍った敵機の関節へ、正確な一撃を叩き込む。開いた継ぎ目は次の行動を封じ、次の打撃を深く通す弱点になる。『聖歌隊』の時代から変わらぬ、制圧の基本だ。」", cost: 1, category: "CQC", type: "skill", noise: 1, requirements: ["target_stun_ge_1"], stance_change: "EXPOSE", effects: [{ target: "enemy", type: "cancel_next_intent", value: 1 }, { target: "enemy", type: "vulnerable", value: 1 }] },
    { id: "cqc_holdup_01", name: "完全制圧 (HOLD UP)", flavor: "「沈黙した敵機の前に立ち、最後の孔を打ち込む。抵抗のない装甲に、穿孔機の音だけが響く。完全な制圧とは、敵の駆動音が二度と戻らないことだ。」", cost: 2, category: "CQC", type: "finish", noise: 1, requirements: ["target_stun_max"], stance_change: null, effects: [{ target: "enemy", type: "instant_kill", value: 1 }] },
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

  // 正式版: VESSEL 13 "WEAVER" 初期デッキ10枚（敷設アーム打撃×3／装甲折りたたみ×3／迎撃鉄線×2／集音地雷×1／囮の空回り×1）
  const WEAVER_DECK = Object.freeze([
    root.Cards.get("weaver_laying_arm"),
    root.Cards.get("weaver_laying_arm"),
    root.Cards.get("weaver_laying_arm"),
    root.Cards.get("weaver_armor_fold"),
    root.Cards.get("weaver_armor_fold"),
    root.Cards.get("weaver_armor_fold"),
    root.Cards.get("weaver_barbed_wire"),
    root.Cards.get("weaver_barbed_wire"),
    root.Cards.get("weaver_audio_mine"),
    root.Cards.get("weaver_decoy_spin"),
  ].filter(Boolean));

  // 正式版: VESSEL 00 "REACTOR" 初期デッキ10枚（溶断打撃×4／強制冷却×4／炉心臨界×1／放射熱撃×1）
  const REACTOR_DECK = Object.freeze([
    root.Cards.get("reactor_melt_strike"),
    root.Cards.get("reactor_melt_strike"),
    root.Cards.get("reactor_melt_strike"),
    root.Cards.get("reactor_melt_strike"),
    root.Cards.get("reactor_coolant"),
    root.Cards.get("reactor_coolant"),
    root.Cards.get("reactor_coolant"),
    root.Cards.get("reactor_coolant"),
    root.Cards.get("reactor_core_critical"),
    root.Cards.get("reactor_radiant_strike"),
  ].filter(Boolean));

  const DECKS_BY_CHARACTER = { vessel04: GOLIATH_DECK, vessel09: GHOST_TAPE_DECK, vessel13: WEAVER_DECK, vessel00: REACTOR_DECK };

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

  // 第2陣 2C (RB-2): レリックの常時補正（ダメージ基礎値 +n）。relicStunBonus と同じ引き方。
  function relicDamageBaseBonus(state) {
    return root.Relics && root.Relics.damageBaseBonus ? root.Relics.damageBaseBonus(state) : 0;
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

  // ==== 段階(2) 単位2-1: PlayerState 化（MULTIPLAYER-IMPL-PLAN.md §2.2／§2.3） ====
  // state.players[] が正本。各 PlayerState は「旧 state.player の中身（hp〜tread）＋
  // 旧 state 直下のプレイヤー所有分」を丸ごとフラットに持つ（playerId／characterId 付き）。
  // state 直下の旧フィールドは attachPlayerCompat が players[0] へ委譲する互換アクセサとして残し、
  // players.length === 1 では従来と完全一致する（main.js・relics.js・battle.js 内部処理は
  // 無変更で従来どおり state.player／state.hand 等を触り、それが players[0] に届く）。
  // alert 系（alertBuff／alertAim／alertTelegraphed）は本単位では共有のまま据え置く（2-2 で移設）。
  const PLAYER_CORE_FIELDS = Object.freeze(["hp", "hpMax", "energy", "energyMax", "stance", "block", "stagger", "halveNext", "tread"]);
  // 単位2-2: alertBuff／alertAim／alertTelegraphed も PlayerState 側へ移設したため、
  // 互換アクセサの委譲対象に含める（state.alertBuff 等は players[0] の値を返す）。
  const PLAYER_OWNED_FIELDS = Object.freeze([
    "characterId", "turnStartNoise", "cardsPlayedThisTurn", "drawPenaltyNext", "drawBonusNext",
    "retained", "holdDiscountUid", "powers", "exhaustedCount", "nextAttackBonus", "pendingPick",
    "traps", "purgeActive", "purgeCount", "noise", "hand", "drawPile", "discard", "exhaust",
    "alertBuff", "alertAim", "alertTelegraphed",
  ]);

  function makePlayerState(entry, rng, index) {
    const def = characterDef(entry && (entry.characterId || entry.character));
    const deck = resolveDeck(entry && entry.deck, def.id);
    const hpMax = entry && typeof entry.hpMax === "number" ? entry.hpMax
      : (entry && typeof entry.hp === "number" ? entry.hp : def.hp);
    const hp = entry && typeof entry.hp === "number" ? entry.hp : hpMax;
    const noise = clampNoiseFor(entry && typeof entry.noise === "number" ? entry.noise : 0, def.id);
    return {
      playerId: (entry && entry.playerId) || `player${(index || 0) + 1}`,
      characterId: def.id,
      hp,
      hpMax,
      energy: def.energyPerTurn,
      energyMax: def.energyPerTurn,
      stance: "EXPOSE",
      block: 0,
      stagger: 0,
      halveNext: 0,
      tread: 0,
      // A-2 変換ルール: 変換系効果は「ターン開始時点のNOISEスナップショット」で計算する
      turnStartNoise: noise,
      cardsPlayedThisTurn: 0,
      drawPenaltyNext: 0,
      drawBonusNext: 0,
      // 『磁気ホールド』（GHOST-TAPE固有OS）: 敵フェイズ中の保持実体と、保持割引の対象実体ID
      retained: null,
      holdDiscountUid: 0,
      // 共通プール拡張: powers = 持続効果の汎用基盤。{ source, kind, value } の配列で、戦闘中ずっと残る
      // （種別の詳細は従来の createState 内コメントどおり。発動は beginPlayerTurn／endTurn）
      powers: [],
      // この戦闘で廃棄（exhaust）されたカードの累計枚数。圧縮穿孔（damage_per_exhausted）が参照する
      exhaustedCount: 0,
      // プール大拡充バッチB（プリミティブ #4 next_attack_bonus）: 次に解決する敵ダメージ効果へ
      // 一度だけ加算される保留ボーナス。消費は applyEffect のダメージ適用部
      nextAttackBonus: 0,
      // プレイヤー選択待ちの保留効果。効果解決時に登録され、main.js の選択フェイズが resolvePick で確定させる
      pendingPick: null,
      // 『アナログ・トラップ機構』（WEAVER固有OS）: 設置済み罠のスタック。戦闘ごとに空で始まる
      traps: [],
      // 『臨界排熱』（REACTOR固有OS）: purgeActive = 炉心臨界で始動したか、purgeCount = 蓄積値（戦闘内のみ）
      purgeActive: false,
      purgeCount: 0,
      // 単位2-2（J2）: 帯域は素体ごと。alertBuff は自 noise の帯域から syncAlertBuff が算出、
      // alertAim は追加行動「照準」で自素体に付き次に自素体が受ける攻撃で消費、
      // alertTelegraphed は自素体に向けられた追加行動の予告。ready は終了宣言（endTurn）。
      alertBuff: 0,
      alertAim: 0,
      alertTelegraphed: null,
      ready: false,
      noise,
      drawPile: shuffle(deck, rng),
      hand: [],
      discard: [],
      exhaust: [],
    };
  }

  // state 直下の旧フィールド群を players[0] へ委譲する互換アクセサを付ける。
  // state.player は players[0] そのものを返す（hp／energy／stance 等の直接読み書きが従来どおり届く）。
  // state.player への丸ごと代入は、核フィールド（hp〜tread）のマージとして受ける（実運用では発生しない）。
  function attachPlayerCompat(state) {
    if (!state || !Array.isArray(state.players) || state.players.length === 0) return state;
    const defs = {};
    for (const field of PLAYER_OWNED_FIELDS) {
      defs[field] = {
        enumerable: true,
        configurable: true,
        get() { return this.players[0][field]; },
        set(value) { this.players[0][field] = value; },
      };
    }
    defs.player = {
      enumerable: true,
      configurable: true,
      get() { return this.players[0]; },
      set(value) {
        if (!value || typeof value !== "object" || value === this.players[0]) return;
        const core = value.player && typeof value.player === "object" ? value.player : value;
        const target = this.players[0];
        for (const field of PLAYER_CORE_FIELDS) {
          if (typeof core[field] !== "undefined") target[field] = core[field];
        }
      },
    };
    Object.defineProperties(state, defs);
    return state;
  }

  // ==== 段階(2) 単位2-2: 戦闘解決の複数化ヘルパー ====
  // 方針: 内部ロジック（applyEffect／strikeVolley 等）は従来どおり「state.player／state.hand／
  // state.noise 等が行動プレイヤーを指す state」を受け取る形を維持し、行動プレイヤーが
  // players[0] 以外のときは scopeFor がそのプレイヤーへ委譲するビューを渡す。
  // players[0] が対象のとき（ソロ含む）は state そのものを返すため、挙動・数値は従来と一致する。
  function rootOf(state) {
    return (state && state.__rootState) || state;
  }

  // プレイヤー指定の解決。ref は playerId 文字列／players の index／PlayerState 自身／
  // { playerId } ／ { player } のいずれでもよい。未指定時はスコープ中のプレイヤー、
  // それも無ければ players[0]。players を持たない state では null。
  function resolvePlayer(state, ref) {
    if (state && state.__scopedPlayer) {
      if (typeof ref === "undefined" || ref === null) return state.__scopedPlayer;
      const found = resolvePlayer(state.__rootState, ref);
      return found || state.__scopedPlayer;
    }
    const root = rootOf(state);
    if (!root || !Array.isArray(root.players) || root.players.length === 0) return null;
    if (typeof ref === "undefined" || ref === null) return root.players[0];
    if (typeof ref === "number") return root.players[ref] || null;
    if (typeof ref === "string") return root.players.find((p) => p.playerId === ref) || null;
    if (typeof ref === "object") {
      if (root.players.includes(ref)) return ref;
      if (ref.player && typeof ref.player === "object") {
        const found = resolvePlayer(root, ref.player);
        if (found) return found;
      }
      if (ref.playerId) return root.players.find((p) => p.playerId === ref.playerId) || null;
      if (typeof ref.index === "number") return root.players[ref.index] || null;
    }
    return null;
  }

  function alivePlayers(state) {
    const root = rootOf(state);
    if (!root || !Array.isArray(root.players)) return [];
    return root.players.filter((p) => p && (p.hp || 0) > 0);
  }

  function isPartyDown(state) {
    const root = rootOf(state);
    return !!(root && Array.isArray(root.players) && root.players.length > 0
      && root.players.every((p) => (p.hp || 0) <= 0));
  }

  function isAllReady(state) {
    const alive = alivePlayers(state);
    return alive.length > 0 && alive.every((p) => p.ready);
  }

  const BAND_TIER = Object.freeze({ calm: 0, alert: 1, breach: 2, pursuit: 3, lockdown: 4, exposed: 5 });

  // 排除優先度（J2／計画 §2.2）: 帯域に入っている生存素体のうち、最も帯域が高い素体。
  // 同帯域では noise の大きい方を優先し、それも同じなら並び順（players の index）が早い方。
  // includeTelegraphed=true のときは、予告（alertTelegraphed）を持つ素体も候補に含める
  // （ノイズが下がって帯域を抜けた場合の「追加行動 取消」を検出するため。enemyTurn 用）。
  function priorityPlayer(state, includeTelegraphed) {
    let best = null;
    for (const p of alivePlayers(state)) {
      const band = noiseBand(p.noise);
      if (band.extras <= 0 && !(includeTelegraphed && p.alertTelegraphed)) continue;
      if (!best) { best = p; continue; }
      const bestBand = noiseBand(best.noise);
      if (BAND_TIER[band.id] > BAND_TIER[bestBand.id]) best = p;
      else if (BAND_TIER[band.id] === BAND_TIER[bestBand.id] && (p.noise || 0) > (best.noise || 0)) best = p;
    }
    return best;
  }

  // 敵の主行動の対象: 予告済み（state.targetPlayerId）で生存していればそれを引き継ぎ、
  // 無ければ生存素体からランダムに選んで targetPlayerId に保持する（予告の安定化）。
  // 候補が1体だけのときは乱数を消費しない（ソロの乱数列を従来と一致させるため）。
  function selectTargetPlayer(state, rng) {
    const root = rootOf(state);
    const alive = alivePlayers(root);
    if (alive.length === 0) return null;
    if (root.targetPlayerId) {
      const stored = alive.find((p) => p.playerId === root.targetPlayerId);
      if (stored) return stored;
    }
    let picked = alive[0];
    if (alive.length > 1) {
      const roll = typeof rng === "function" ? rng() : Math.random();
      picked = alive[Math.min(alive.length - 1, Math.floor(roll * alive.length))];
    }
    root.targetPlayerId = picked.playerId;
    return picked;
  }

  function alertInfoFor(state, ref) {
    const player = resolvePlayer(state, ref);
    if (!player) return null;
    return {
      playerId: player.playerId,
      noise: player.noise || 0,
      band: noiseBand(player.noise),
      alertBuff: player.alertBuff || 0,
      alertAim: player.alertAim || 0,
      alertTelegraphed: player.alertTelegraphed || null,
    };
  }

  // 行動プレイヤーへ委譲するビュー。共有分（players／enemy／relics／turn／targetPlayerId）は
  // root へ、プレイヤー所有分と state.player は対象プレイヤーへ委譲する。
  // 対象が players[0] のときは root そのものを返す（従来経路と完全同一）。
  function scopeFor(state, player) {
    const root = rootOf(state);
    if (!root || !Array.isArray(root.players) || root.players.length === 0) return state;
    const target = player || root.players[0];
    if (state && state.__scopedPlayer === target) return state;
    if (target === root.players[0]) return root;
    const view = { __scopedPlayer: target, __rootState: root };
    const defs = {};
    for (const key of ["players", "enemy", "relics", "relicUsed", "turn", "targetPlayerId", "partySize", "scaling", "depthProfile", "encounterType"]) {
      defs[key] = {
        enumerable: true, configurable: true,
        get() { return root[key]; },
        set(value) { root[key] = value; },
      };
    }
    for (const field of PLAYER_OWNED_FIELDS) {
      defs[field] = {
        enumerable: true, configurable: true,
        get() { return target[field]; },
        set(value) { target[field] = value; },
      };
    }
    defs.player = {
      enumerable: true, configurable: true,
      get() { return target; },
      set(value) {
        if (!value || typeof value !== "object" || value === target) return;
        const core = value.player && typeof value.player === "object" ? value.player : value;
        for (const field of PLAYER_CORE_FIELDS) {
          if (typeof core[field] !== "undefined") target[field] = core[field];
        }
      },
    };
    Object.defineProperties(view, defs);
    return view;
  }

  // ==== 単位2-4: 人数スケーリングの下地（設計書§4／MULTIPLAYER-IMPL-PLAN §2.3 単位2-4） ====
  // 倍率表は設計書§4 の確定値（2人 HP×1.8／3人 ×2.6・攻撃+1／4人 ×3.4・攻撃+2）。
  // bossHp は「ボスは別途専用倍率」（設計書§4 備考）の置き場で、段階(4) 4-1 で実測調整する
  // 前提のため当面は通常倍率と同値を置く。攻撃の上乗せはインテントのパターン値
  // （attack／heavy_attack／attack_stun の value）にのみ適用する（帯域の追加行動は対象外）。
  // 適用は createState の options.scaling === true のときだけ（既定は無効＝従来挙動と完全一致。
  // 段階(4) 4-1 でラン開始の配線時に ON にする）。
  const PARTY_SCALING = Object.freeze({
    1: Object.freeze({ hp: 1.0, attack: 0, bossHp: 1.0 }),
    2: Object.freeze({ hp: 1.8, attack: 0, bossHp: 1.8 }),
    3: Object.freeze({ hp: 2.6, attack: 1, bossHp: 2.6 }),
    4: Object.freeze({ hp: 3.4, attack: 2, bossHp: 3.4 }),
  });
  // 層ボスは enemies.js 側にボス印が無いため ID で判定する（map.js の LAYER_BOSS_IDS と一致させること）
  const BOSS_ENEMY_IDS = Object.freeze(["enemy_gatekeeper", "enemy_archivist", "enemy_echo"]);

  function partyScalingFor(partySize) {
    const size = Math.max(1, Math.min(4, Math.floor(partySize) || 1));
    return PARTY_SCALING[size];
  }

  // ==== 作戦深度（DEPTH）パラメータ（DESIGN-DEPTH-SYSTEM-FINAL §3） ====
  // 帯区分は難易度ドラフト §2（静穏 1〜4／警戒 5〜8／BREACH 9〜12／追跡 13〜16／LOCKDOWN 17〜20）。
  // 深度1は現行ビルドと完全一致（hpMul ×1.00／開始NOISE 0／healRate 0.4／stunStage 0／rewardFactor ×1.0）。
  // healRate の帯逓減は判断 J-3 論点1 (a) の確定値（40／40／30／20／10%）。マルチ復帰HPも
  // この healRate に完全連動する（J-3 論点2 (i)。復帰処理そのものはマルチ段階(3)/(4)）。
  // §3.3 の叩き台継続パラメータ（attackBonus 等）は判断 J-4 (a) により値だけ持ち、
  // 初回実装ではどこからも参照しない（無効値＝現行値で固定）。
  const DEPTH_BANDS = Object.freeze([
    Object.freeze({ name: "静穏帯", startNoise: 0, stunStage: 0, healRate: 0.4, rewardFactor: 1.0 }),
    Object.freeze({ name: "警戒帯", startNoise: 0, stunStage: 0, healRate: 0.4, rewardFactor: 1.25 }),
    Object.freeze({ name: "BREACH帯", startNoise: 1, stunStage: 1, healRate: 0.3, rewardFactor: 1.5 }),
    Object.freeze({ name: "追跡帯", startNoise: 2, stunStage: 2, healRate: 0.2, rewardFactor: 1.75 }),
    Object.freeze({ name: "LOCKDOWN帯", startNoise: 3, stunStage: 3, healRate: 0.1, rewardFactor: 2.0 }),
  ]);
  const DEPTH_TABLE = Object.freeze({ bands: DEPTH_BANDS, max: 20 });

  // 深度（1〜20）から解決済みプロファイルを返す。呼び出しごとに新しいオブジェクトを返す
  // （state が保持し serialize で複製されるため、共有オブジェクトは返さない）。
  function depthProfileFor(depth) {
    const d = Math.max(1, Math.min(20, Math.floor(Number(depth)) || 1));
    const band = Math.min(4, Math.floor((d - 1) / 4));
    const row = DEPTH_BANDS[band];
    return {
      depth: d,
      band,
      bandName: row.name,
      hpMul: 1 + 0.10 * (d - 1), // D-3: 全深度共通式（深度1＝×1.00〜深度20＝×2.90）
      startNoise: row.startNoise,
      stunStage: row.stunStage,
      healRate: row.healRate,
      rewardFactor: row.rewardFactor,
      // §3.3（J-4 (a): 無効値で保持のみ。有効化時は値を差し替えて参照を繋ぐ）
      attackBonus: 0,
      moveCooling: 1,
      ceilingFall: 5,
      extraBoost: 0,
      elitePlus: 0,
    };
  }

  // 生成直後の敵1体へ深度補正を適用する（§5.2／§5.3-1）。適用順は人数倍率 → 深度倍率で、
  // 結果として単純乗算になる（D-7）。__depthApplied の印で二重適用を防ぐ
  // （印は serialize の敵ディープコピーにも残るため、復元後の再適用も起きない）。
  function applyDepthToEnemy(state, enemy) {
    const profile = state && state.depthProfile;
    if (!profile || !enemy || enemy.__depthApplied) return enemy;
    enemy.hpMax = Math.max(1, Math.round((enemy.hpMax || 0) * (profile.hpMul || 1)));
    enemy.hp = enemy.hpMax;
    // スタン段階2〜: ボスのみ必要蓄積量 +50%（スタン免疫の敵には触らない）
    if ((profile.stunStage || 0) >= 2 && isBossEnemy(enemy) && !enemy.immuneToStun) {
      enemy.stunMax = Math.ceil((enemy.stunMax || STUN_MAX) * 1.5);
    }
    enemy.__depthApplied = true;
    return enemy;
  }

  function isBossEnemy(enemy) {
    return !!enemy && BOSS_ENEMY_IDS.includes(enemy.id);
  }

  // 生成直後の敵1体へスケーリングを適用する。__scaled の印で二重適用を防ぐ
  // （印は serialize の敵ディープコピーにも残るため、復元後の再適用も起きない）。
  function applyScalingToEnemy(state, enemy) {
    const scaling = state && state.scaling;
    if (!scaling || !enemy || enemy.__scaled) return enemy;
    const hpMul = isBossEnemy(enemy) ? scaling.bossHp : scaling.hp;
    enemy.hpMax = Math.max(1, Math.round((enemy.hpMax || 0) * hpMul));
    enemy.hp = enemy.hpMax;
    if (scaling.attack) {
      // P-N5: フェイズ持ちの敵は全フェイズのパターンへ適用する（pattern は phases[0] と
      // 同一配列のため、phases 側を回せば二重適用にならない）。
      const patterns = Array.isArray(enemy.phases) && enemy.phases.length > 0
        ? enemy.phases
        : [enemy.pattern || []];
      for (const pattern of patterns) {
        for (const step of pattern || []) {
          if (step && (step.action === "attack" || step.action === "heavy_attack" || step.action === "attack_stun")) {
            step.value = (step.value || 0) + scaling.attack;
          }
        }
      }
    }
    enemy.__scaled = true;
    return enemy;
  }

  function createState(rng, options) {
    const relics = options && Array.isArray(options.relics) ? options.relics.slice() : [];
    const enemy = root.Enemies ? root.Enemies.make("enemy_sentry") : fallbackSentry();
    // 単位2-1: options.party = [{ playerId, characterId, deck, hp, hpMax, noise }] を追加。
    // 未指定時は現行の単一指定（character／deck 等）から party 1人を合成し、既存の呼び出し
    // （タイトル試行・startRun・チュートリアル）は無変更で動く。
    let partyEntries;
    if (options && Array.isArray(options.party) && options.party.length > 0) {
      partyEntries = options.party;
    } else {
      const charDef = characterDef(options && options.character);
      partyEntries = [{
        playerId: options && options.playerId,
        characterId: charDef.id,
        deck: options && options.deck,
        hp: options && options.hp,
        hpMax: options && options.hpMax,
        noise: options && options.noise,
      }];
    }
    const players = partyEntries.map((entry, index) => makePlayerState(entry, rng, index));
    // 単位2-4: 人数とスケーリングの下地を state に保持する。partySize は options.partySize
    // 優先（無ければ実人数、1〜4 にクランプ）。scaling は options.scaling === true のときだけ
    // 倍率表の行を複製して保持し、生成直後の敵へ適用する。既定（未指定）は scaling=null で、
    // 敵の数値・乱数消費は従来と完全一致する。
    const partySize = Math.max(1, Math.min(4, Math.floor((options && options.partySize) || players.length) || 1));
    const scalingRow = partyScalingFor(partySize);
    const scaling = options && options.scaling === true
      ? { hp: scalingRow.hp, attack: scalingRow.attack, bossHp: scalingRow.bossHp }
      : null;
    const state = {
      relics,
      // 第2陣 2E (RB-6): 致死回避の使用済み記録 { レリックID: true }。ラン側（main.js の
      // run.relicUsed）が渡したオブジェクトは参照を共有し、戦闘中の消費がそのままランへ
      // 残る。未指定なら戦闘ローカルの空オブジェクト（欠落＝未使用として読む）。
      relicUsed: options && options.relicUsed && typeof options.relicUsed === "object" ? options.relicUsed : {},
      players,
      enemy,
      // 単位2-2: alert 系は PlayerState 側へ移設済み（state.alertBuff 等は互換アクセサが
      // players[0] へ委譲する）。state 直下に残るのは敵インテントの予告対象のみ。
      targetPlayerId: null,
      turn: 1,
      partySize,
      scaling,
      // 作戦深度（DESIGN-DEPTH-SYSTEM-FINAL §3.1）: options.depthProfile を複製して保持し、
      // 生成直後の敵へ適用する。未指定なら null＝深度補正なし（従来挙動と完全一致）。
      // options.encounterType は戦闘の種別（"ELITE" 等。§5.3-2 のスタン減衰判定の根拠）。
      depthProfile: options && options.depthProfile ? plainClone(options.depthProfile) : null,
      encounterType: options && options.encounterType ? String(options.encounterType) : null,
    };
    if (scaling) applyScalingToEnemy(state, state.enemy);
    if (state.depthProfile) applyDepthToEnemy(state, state.enemy);
    return attachPlayerCompat(state);
  }

  // ==== 単位2-1: 状態のシリアライズ／復元（スナップショット用） ====
  // serializeState は plain object（JSON 化可能）だけを返す。カードは定義オブジェクトへの
  // 参照ではなく { id, __uid?, __heldNow? } の参照形にし、hydrateState が定義へ引き直す。
  function plainClone(value) {
    if (value === null || typeof value === "undefined") return value;
    return JSON.parse(JSON.stringify(value));
  }

  function serializeCard(card) {
    if (!card) return null;
    const ref = { id: card.id };
    if (card.__uid) ref.__uid = card.__uid;
    if (card.__heldNow) ref.__heldNow = true;
    return ref;
  }

  function serializePlayer(player) {
    return {
      playerId: player.playerId,
      characterId: player.characterId,
      hp: player.hp,
      hpMax: player.hpMax,
      energy: player.energy,
      energyMax: player.energyMax,
      stance: player.stance,
      block: player.block,
      stagger: player.stagger,
      halveNext: player.halveNext,
      tread: player.tread,
      noise: player.noise,
      turnStartNoise: player.turnStartNoise,
      cardsPlayedThisTurn: player.cardsPlayedThisTurn,
      drawPenaltyNext: player.drawPenaltyNext,
      drawBonusNext: player.drawBonusNext,
      retained: serializeCard(player.retained),
      holdDiscountUid: player.holdDiscountUid,
      traps: plainClone(player.traps || []),
      powers: plainClone(player.powers || []),
      pendingPick: plainClone(player.pendingPick || null),
      exhaustedCount: player.exhaustedCount,
      nextAttackBonus: player.nextAttackBonus,
      purgeActive: !!player.purgeActive,
      purgeCount: player.purgeCount || 0,
      alertBuff: player.alertBuff || 0,
      alertAim: player.alertAim || 0,
      alertTelegraphed: player.alertTelegraphed || null,
      ready: !!player.ready,
      hand: (player.hand || []).map(serializeCard),
      drawPile: (player.drawPile || []).map(serializeCard),
      discard: (player.discard || []).map(serializeCard),
      exhaust: (player.exhaust || []).map(serializeCard),
    };
  }

  function playersOf(state) {
    if (state && Array.isArray(state.players) && state.players.length > 0) return state.players;
    // 互換: players を持たない旧形 state（player＋直下フィールド）からも 1人分を合成する
    const core = (state && state.player) || {};
    return [{
      playerId: "player1",
      characterId: state && state.characterId,
      hp: core.hp, hpMax: core.hpMax, energy: core.energy, energyMax: core.energyMax,
      stance: core.stance, block: core.block, stagger: core.stagger, halveNext: core.halveNext, tread: core.tread,
      noise: state && state.noise, turnStartNoise: state && state.turnStartNoise,
      cardsPlayedThisTurn: state && state.cardsPlayedThisTurn,
      drawPenaltyNext: state && state.drawPenaltyNext, drawBonusNext: state && state.drawBonusNext,
      retained: state && state.retained, holdDiscountUid: state && state.holdDiscountUid,
      traps: state && state.traps, powers: state && state.powers, pendingPick: state && state.pendingPick,
      exhaustedCount: state && state.exhaustedCount, nextAttackBonus: state && state.nextAttackBonus,
      purgeActive: state && state.purgeActive, purgeCount: state && state.purgeCount,
      alertBuff: state && state.alertBuff, alertAim: state && state.alertAim,
      alertTelegraphed: state && state.alertTelegraphed, ready: false,
      hand: (state && state.hand) || [], drawPile: (state && state.drawPile) || [],
      discard: (state && state.discard) || [], exhaust: (state && state.exhaust) || [],
    }];
  }

  function serializeState(state) {
    if (!state) return null;
    return {
      version: 1,
      kind: "enemy-pipeline-battle-state",
      relics: (state.relics || []).slice(),
      relicUsed: plainClone(state.relicUsed || {}),
      turn: state.turn || 1,
      alertBuff: state.alertBuff || 0,
      alertAim: state.alertAim || 0,
      alertTelegraphed: plainClone(state.alertTelegraphed || null),
      targetPlayerId: state.targetPlayerId || null,
      partySize: state.partySize || playersOf(state).length,
      scaling: state.scaling ? { hp: state.scaling.hp, attack: state.scaling.attack, bossHp: state.scaling.bossHp } : null,
      // 作戦深度（§3.1）: 欠落した旧スナップショットでは null＝深度補正なし（深度1相当）。
      // 敵は適用済みの値を持つため、復元時に再生成・再適用はしない。
      depthProfile: state.depthProfile ? plainClone(state.depthProfile) : null,
      encounterType: state.encounterType || null,
      enemy: plainClone(state.enemy || null),
      players: playersOf(state).map(serializePlayer),
    };
  }

  function hydrateCard(ref) {
    if (!ref) return null;
    const id = typeof ref === "string" ? ref : ref.id;
    const def = lookup(id);
    if (!def) return null;
    if (ref && typeof ref === "object" && ref.__uid) {
      const copy = { ...def, __uid: ref.__uid };
      if (ref.__heldNow) copy.__heldNow = true;
      if (copy.__uid > cardUidSeq) cardUidSeq = copy.__uid;
      return copy;
    }
    return def;
  }

  function hydratePlayer(data, index) {
    const src = data && typeof data === "object" ? data : {};
    const core = src.player && typeof src.player === "object" ? src.player : src;
    const def = characterDef(src.characterId || src.character || core.characterId);
    const hpMax = typeof core.hpMax === "number" ? core.hpMax : def.hp;
    const num = (value, fallback) => (typeof value === "number" ? value : fallback);
    return {
      playerId: src.playerId || `player${index + 1}`,
      characterId: def.id,
      hp: num(core.hp, hpMax),
      hpMax,
      energy: num(core.energy, def.energyPerTurn),
      energyMax: num(core.energyMax, def.energyPerTurn),
      stance: core.stance || "EXPOSE",
      block: num(core.block, 0),
      stagger: num(core.stagger, 0),
      halveNext: num(core.halveNext, 0),
      tread: num(core.tread, 0),
      noise: clampNoiseFor(num(src.noise, 0), def.id),
      turnStartNoise: num(src.turnStartNoise, 0),
      cardsPlayedThisTurn: num(src.cardsPlayedThisTurn, 0),
      drawPenaltyNext: num(src.drawPenaltyNext, 0),
      drawBonusNext: num(src.drawBonusNext, 0),
      retained: hydrateCard(src.retained),
      holdDiscountUid: num(src.holdDiscountUid, 0),
      traps: plainClone(src.traps || []),
      powers: plainClone(src.powers || []),
      pendingPick: plainClone(src.pendingPick || null),
      exhaustedCount: num(src.exhaustedCount, 0),
      nextAttackBonus: num(src.nextAttackBonus, 0),
      purgeActive: !!src.purgeActive,
      purgeCount: num(src.purgeCount, 0),
      alertBuff: num(src.alertBuff, 0),
      alertAim: num(src.alertAim, 0),
      alertTelegraphed: src.alertTelegraphed || null,
      ready: !!src.ready,
      hand: (src.hand || []).map(hydrateCard).filter(Boolean),
      drawPile: (src.drawPile || []).map(hydrateCard).filter(Boolean),
      discard: (src.discard || []).map(hydrateCard).filter(Boolean),
      exhaust: (src.exhaust || []).map(hydrateCard).filter(Boolean),
    };
  }

  function hydrateState(data) {
    if (!data || typeof data !== "object") return null;
    let playerDataList;
    if (Array.isArray(data.players) && data.players.length > 0) {
      playerDataList = data.players;
    } else if (data.player || data.hand || data.characterId) {
      // 旧形スナップショット（players なし）も 1人分として復元できるようにする
      playerDataList = [{
        playerId: data.playerId, characterId: data.characterId, player: data.player,
        noise: data.noise, turnStartNoise: data.turnStartNoise,
        cardsPlayedThisTurn: data.cardsPlayedThisTurn, drawPenaltyNext: data.drawPenaltyNext,
        drawBonusNext: data.drawBonusNext, retained: data.retained, holdDiscountUid: data.holdDiscountUid,
        traps: data.traps, powers: data.powers, pendingPick: data.pendingPick,
        exhaustedCount: data.exhaustedCount, nextAttackBonus: data.nextAttackBonus,
        purgeActive: data.purgeActive, purgeCount: data.purgeCount,
        hand: data.hand, drawPile: data.drawPile, discard: data.discard, exhaust: data.exhaust,
      }];
    } else {
      playerDataList = [{}];
    }
    const players = playerDataList.map((entry, index) => hydratePlayer(entry, index));
    const state = {
      relics: Array.isArray(data.relics) ? data.relics.slice() : [],
      // 第2陣 2E (RB-6): 使用済み記録も往復で保持する。欠落（旧スナップショット）は未使用。
      relicUsed: data.relicUsed && typeof data.relicUsed === "object" ? plainClone(data.relicUsed) : {},
      players,
      enemy: data.enemy ? plainClone(data.enemy) : fallbackSentry(),
      targetPlayerId: data.targetPlayerId || null,
      turn: data.turn || 1,
      // 単位2-4: 人数とスケーリングも往復で保持する。敵はスナップショットの値（適用済み）を
      // そのまま復元するため、ここでは再適用しない（__scaled の印もコピーに残っている）。
      partySize: typeof data.partySize === "number" ? data.partySize : players.length,
      scaling: data.scaling ? plainClone(data.scaling) : null,
      // 作戦深度（§3.1）: プロファイルと戦闘種別も往復で保持する（再適用はしない）
      depthProfile: data.depthProfile ? plainClone(data.depthProfile) : null,
      encounterType: data.encounterType || null,
    };
    attachPlayerCompat(state);
    // 旧形スナップショット（alert が state 直下にのみある 2-1 形式）互換:
    // players[0] 側に alert フィールドが無い場合だけ、直下の値を引き継ぐ
    const firstEntry = playerDataList[0] || {};
    if (typeof data.alertBuff === "number" && !("alertBuff" in firstEntry)) state.alertBuff = data.alertBuff;
    if (typeof data.alertAim === "number" && !("alertAim" in firstEntry)) state.alertAim = data.alertAim;
    if ("alertTelegraphed" in data && !("alertTelegraphed" in firstEntry)) {
      state.alertTelegraphed = data.alertTelegraphed ? plainClone(data.alertTelegraphed) : null;
    }
    return state;
  }

  function applyEnemy(state, id) {
    if (!root.Enemies) return false;
    const enemy = root.Enemies.make(id);
    if (!enemy) return false;
    state.enemy = enemy;
    // 単位2-4: スケーリング有効（state.scaling あり）のときだけ生成した敵へ倍率を適用する。
    // 無効時は従来と完全一致。
    if (state && state.scaling) applyScalingToEnemy(state, enemy);
    // 作戦深度: 人数倍率の後に深度倍率を適用する（単純乗算・D-7）。depthProfile が
    // 無い state では従来と完全一致。
    if (state && state.depthProfile) applyDepthToEnemy(state, enemy);
    return true;
  }

  function requirementMet(state, requirement) {
    if (requirement === "target_stun_ge_1") return state.enemy.stun >= 1;
    if (requirement === "target_stun_max") return state.enemy.stun >= state.enemy.stunMax;
    // プール大拡充バッチB（DESIGN-POOL-EXPANSION2-DRAFT.md プリミティブ #15）:
    // 使用開始時点の自分のNOISEが0以下でなければ使用不可（GHOST-TAPE T-12 用の基盤）
    if (requirement === "self_noise_le_0") return (state.noise || 0) <= 0;
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
  function tagHandInstances(state, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    if (!state || !Array.isArray(state.hand)) return;
    state.hand = state.hand.map((card) => {
      if (card.__uid) return card;
      cardUidSeq += 1;
      return { ...card, __uid: cardUidSeq };
    });
  }

  // ターン終了時、手札の1実体を保持枠へ移す。呪装／使用不能カードは保持できない。
  function setRetained(state, uid, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    if (!state || !characterDef(state.characterId).canHold) return false;
    const index = state.hand.findIndex((card) => card.__uid && card.__uid === uid);
    if (index < 0) return false;
    const card = state.hand[index];
    if (card.unplayable || card.cost < 0) return false;
    state.hand.splice(index, 1);
    state.retained = card;
    return true;
  }

  // ==== 『アナログ・トラップ機構』（WEAVER固有OS） ====
  // 罠カードは effect type "trap" を持ち、使用すると即時効果ではなく state.traps へ設置される。
  // 設置上限は種類混合で合計 TRAP_LIMIT（実装追補 §2.1、2026-11-16 確定）。
  const TRAP_LIMIT = 3;
  // 発動判定の固定順（実装追補 §2.2＋専用プール分）: 地雷（行動キャンセル系）→ 残響 → 囮地雷 → 粘着 → 警報線 → 鉄線系。
  // プール大拡充バッチB（プリミティブ #21）: 新kind 3種（decoy_mine／alarm_wire／spark_trap）を追加。
  const TRAP_FIRE_ORDER = Object.freeze(["audio_mine", "echo_mine", "decoy_mine", "glue_wire", "alarm_wire", "barbed_wire", "double_wire", "spark_trap"]);
  const TRAP_LABEL = Object.freeze({
    audio_mine: "AUDIO MINE",
    echo_mine: "ECHO MINE",
    glue_wire: "GLUE WIRE",
    barbed_wire: "BARBED WIRE",
    double_wire: "DOUBLE WIRE",
    decoy_mine: "DECOY MINE",
    alarm_wire: "TRIP ALARM",
    spark_trap: "SPARK TRAP",
  });

  function trapEffectOf(card) {
    if (!card) return null;
    return (card.effects || []).find((effect) => effect.type === "trap") || null;
  }

  function isTrapCard(card) {
    return !!trapEffectOf(card);
  }

  function canPlay(state, card, ref) {
    const actor = resolvePlayer(state, ref);
    state = scopeFor(state, actor);
    if (!card) return { ok: false, reason: "unknown" };
    // 単位2-2: マルチで終了宣言済み（ready）のプレイヤーは行動できない（ソロでは ready は常に false）
    if (actor && actor.ready && Array.isArray(state.players) && state.players.length > 1) {
      return { ok: false, reason: "ready" };
    }
    if (state.player.hp <= 0) return { ok: false, reason: "down" };
    if (state.enemy.dead) return { ok: false, reason: "dead" };
    if (card.unplayable || card.cost < 0 || (card.effects || []).some((effect) => effect.type === "unplayable")) {
      return { ok: false, reason: "curse" };
    }
    for (const requirement of card.requirements) {
      if (!requirementMet(state, requirement)) return { ok: false, reason: requirement };
    }
    // 罠カードは設置上限（合計3）に達していたら使用不可
    if (isTrapCard(card) && (state.traps || []).length >= TRAP_LIMIT) {
      return { ok: false, reason: "trap_limit" };
    }
    // 死線の再配置は、設置中の罠が1つ以上あるときだけ使用可
    if ((card.effects || []).some((effect) => effect.type === "reposition")
      && !(state.traps && state.traps.length > 0)) {
      return { ok: false, reason: "no_traps" };
    }
    // 罠の資源化（プリミティブ #14 trap_sacrifice_draw、WEAVER W-07 用の基盤）も同じ前提
    if ((card.effects || []).some((effect) => effect.type === "trap_sacrifice_draw")
      && !(state.traps && state.traps.length > 0)) {
      return { ok: false, reason: "no_traps" };
    }
    // 『炉心溶融』（REACTOR固有OS）: PWR不足でも使用可。不足分は playCard が HP 5/PWR の
    // コストとして徴収する（HPが不足分を下回っても使用でき、0以下になれば敗北＝自滅あり）
    if (state.player.energy < effectiveCost(state, card) && state.characterId !== "vessel00") {
      return { ok: false, reason: "energy" };
    }
    return { ok: true, reason: "" };
  }

  // 検収修正 2026-11-10 (PROMPT-19): スタン加算の共通処理（CQC打撃でも使う）
  function addStun(state, amount, log, withBonus) {
    if (state.enemy.immuneToStun) { log.push("STUN IMMUNE"); return 0; }
    // 作戦深度 段階3（§5.3-3）: ボスがスタンを消費した直後の1ターンは蓄積を受け付けない。
    // 印（stunLockTurns）は enemyTurn のスタン消費点で立ち、次の enemyTurn 冒頭で解除される。
    if ((state.enemy.stunLockTurns || 0) > 0) { log.push("STUN LOCKED - 蓄積無効"); return 0; }
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

  // 呪いカードの判定（呪い吸着箔の候補抽出で使う）。定義側の unplayable／種別／負コストのいずれか
  // ==== P-N5（phase）: ボスのフェイズ遷移（DESIGN-ENEMIES-DRAFT §1.2 S-4） ====
  // 遷移タイミングは HP が最大の 50% 以下へ跨いだ瞬間（プレイヤーターン中の攻撃解決時、
  // および罠ダメージの適用時）。遷移は「状態の差し替え」であり行動ではないため、
  // スタン／罠キャンセルの対象にならない。蓄積系ステート（スタン・BLK・vulnerable・
  // scrap／weaken・atkBuff・charge）は全て引き継ぎ、patternIndex だけ 0 へ戻す。
  // 表示中のインテントは currentIntent が phases[phaseIndex] を引くため即時に
  // フェイズ2の先頭行動へ差し替わり、ログで遷移を明示する（黙って変わる形にしない）。
  const ENRAGE_CAP = 6; // P-N3（enrage）の累積上限（同ドラフト §1.2 S-6）

  function maybeShiftPhase(state, log) {
    const enemy = state && state.enemy;
    if (!enemy || enemy.dead || !Array.isArray(enemy.phases)) return false;
    const idx = enemy.phaseIndex || 0;
    if (idx >= enemy.phases.length - 1) return false;
    if (enemy.hp * 2 > (enemy.hpMax || 0)) return false;
    enemy.phaseIndex = idx + 1;
    enemy.pattern = enemy.phases[enemy.phaseIndex];
    enemy.patternIndex = 0;
    if (log) {
      const names = Array.isArray(enemy.phaseNames) ? enemy.phaseNames : [];
      const phaseName = names[enemy.phaseIndex] || "";
      log.push("PHASE SHIFT");
      log.push(phaseName
        ? `${enemy.short || enemy.name}: 形態が変わった — フェイズ${enemy.phaseIndex + 1}「${phaseName}」へ移行し、行動パターンが切り替わった`
        : `${enemy.short || enemy.name}: 形態が変わった — フェイズ${enemy.phaseIndex + 1}へ移行し、行動パターンが切り替わった`);
    }
    return true;
  }

  function isCurseCard(card) {
    return !!card && (card.unplayable || card.type === "curse" || (card.cost || 0) < 0);
  }

  function applyEffect(state, effect, log, ctx, ref) {
    // 単位2-2: 行動プレイヤーは第5引数か ctx.player／ctx.playerId で指定できる（既定は従来どおり）
    const actorRef = typeof ref !== "undefined" ? ref
      : (ctx && (typeof ctx.player !== "undefined" ? ctx.player : ctx.playerId));
    state = scopeFor(state, resolvePlayer(state, actorRef));
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
    } else if (effect.type === "damage_stun_bonus") {
      // 跳弾（プリミティブ #2、参照系）: 基礎値＋敵の現在スタン蓄積×per（上限 cap）。倍率は通常どおり乗る
      const bonus = Math.min(typeof effect.cap === "number" ? effect.cap : Number.POSITIVE_INFINITY,
        (state.enemy.stun || 0) * (effect.per || 0));
      effect = { ...effect, type: "damage", value: (effect.value || 0) + bonus };
    } else if (effect.type === "damage_if_hand_le") {
      // 最後の一枚（プリミティブ #3、参照系）: 使用時点の手札枚数（このカードを除く）が maxHand 以下なら +per。
      // 解決時点では使用カード自身がまだ手札にあるため、ctx.cardId の一致を見て1枚差し引く
      const inHand = ctx && ctx.cardId ? state.hand.some((card) => card.id === ctx.cardId) : false;
      const others = state.hand.length - (inHand ? 1 : 0);
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (others <= (effect.maxHand || 0) ? (effect.per || 0) : 0) };
    } else if (effect.type === "damage_hold_bonus") {
      // 保持残響（プリミティブ #5、参照系。GHOST-TAPE T-01 用の基盤）: 保持中なら +per。
      // 「保持中」は敵フェイズ中の保持実体（state.retained）と、保持割引が有効な自ターン
      // （state.holdDiscountUid）の両方を含む
      const holding = !!state.retained || (state.holdDiscountUid || 0) > 0;
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (holding ? (effect.per || 0) : 0) };
    } else if (effect.type === "damage_per_negative_noise") {
      // 負の波形（プリミティブ #6、変換系＝固定レート）: 基礎値＋逆位相の深さ×per。
      // 変換系の既存ルールに合わせ、深さはターン開始時NOISEのスナップショットから取る
      // （max(0, −turnStartNoise)。機体クランプで深さは最大3に収まる）
      const depth = Math.max(0, -(state.turnStartNoise || 0));
      effect = { ...effect, type: "damage", value: (effect.value || 0) + depth * (effect.per || 0) };
      noScale = true;
    } else if (effect.type === "block_per_trap") {
      // 脚部補強／待つ者の構え（プリミティブ #7。WEAVER W-09／W-12 用の基盤）:
      // 基礎値＋設置中の罠の数×per（上限 cap）
      const bonus = Math.min(typeof effect.cap === "number" ? effect.cap : Number.POSITIVE_INFINITY,
        (state.traps || []).length * (effect.per || 0));
      effect = { ...effect, type: "block", value: (effect.value || 0) + bonus };
    } else if (effect.type === "next_attack_bonus") {
      // 迎撃の構え（プリミティブ #4。07専用 P-08 用の基盤）: 次に解決する敵ダメージ効果へ
      // 一度だけ加算される保留を積む。消費は下部のダメージ適用部（初撃のみ）
      state.nextAttackBonus = (state.nextAttackBonus || 0) + (effect.value || 0);
      log.push(`NEXT ATK BONUS +${effect.value || 0} (保留 ${state.nextAttackBonus})`);
      return;
    } else if (effect.type === "search_top") {
      // 巻尺確認（プリミティブ #1）: 山札の上 value 枚から1枚選んで手札へ、残りは捨て札へ。
      // 選択は UI に委ね、ここでは保留だけ登録する（実移動は resolvePick）。
      // 山札が value 枚未満なら、ドローと同じく捨て札をリシャッフルして補充してから保留する
      const n = effect.value || 3;
      const reshuffled = topUpDeckForSearch(state, n, log);
      state.pendingPick = { kind: "search_top", n, reshuffled };
      log.push(`MEASURE 山札の上${n}枚から1枚選択`);
      return;
    } else if (effect.type === "exhaust_curse_in_hand") {
      // 呪い吸着箔（プリミティブ #13）: 手札の呪い1枚を選ばせて廃棄し、value 枚ドロー。
      // 対象（呪い）が手札に無ければ不発（保留を登録せず、ドローもしない）
      const hasCurse = state.hand.some((card) => isCurseCard(card));
      if (!hasCurse) {
        log.push("CURSE SPONGE 不発 (手札に呪いなし)");
        return;
      }
      state.pendingPick = { kind: "curse", draw: effect.value || 0 };
      log.push("CURSE SPONGE 廃棄する呪いを1枚選択");
      return;
    } else if (effect.type === "trap_sacrifice_draw") {
      // 予備部品（プリミティブ #14。WEAVER W-07 用の基盤）: 設置中の罠1つを取り除く選択を
      // UI に委ね、保留だけ登録する（確定は resolvePick。罠の有無は canPlay が保証する）
      state.pendingPick = { kind: "trap_sacrifice", draw: effect.value || 0 };
      log.push("SPARE PARTS 取り除く罠を1つ選択");
      return;
    } else if (effect.type === "search") {
      // 残響サーチ: 山札から1枚選んで手札へ。選択は UI（main.js の選択フェイズ）に委ね、
      // ここでは保留だけ登録する。実際の移動は resolvePick が行う。
      // 山札が空なら、ドローと同じく捨て札をリシャッフルしてから保留する（捨て札も無ければ不発）
      const reshuffled = topUpDeckForSearch(state, 1, log);
      state.pendingPick = { kind: "search", reshuffled };
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
    } else if (effect.type === "trap") {
      // 罠の設置: 即時効果はなく、state.traps へ記録だけ積む。コストとNOISEは playCard が
      // 通常どおり適用済み。カード実体の移動（手札→設置）は playFromHand 側で行う。
      // 発動は敵ターンの resolveTrapsBeforeAction が条件を見て行う。
      state.traps = state.traps || [];
      state.traps.push({
        cardId: (ctx && ctx.cardId) || "",
        kind: effect.kind || "",
        trigger: effect.trigger || "attack",
        minNoise: effect.minNoise || 0,
        damage: effect.damage || 0,
        cut: effect.cut || 0,
        stun: effect.stun || 0,
        cancel: !!effect.cancel,
        // プリミティブ #21（罠フィールド拡張）: 発動時に自分へ BLK を付ける／ドローする任意フィールド
        selfBlock: effect.selfBlock || 0,
        drawOnTrigger: effect.drawOnTrigger || 0,
      });
      log.push(`TRAP SET ${TRAP_LABEL[effect.kind] || effect.kind || "trap"} (設置 ${state.traps.length}/${TRAP_LIMIT})`);
      return;
    } else if (effect.type === "reposition") {
      // 死線の再配置: 設置中の罠1つを手札へ戻す選択を UI に委ね、保留だけ登録する。
      // 候補提示は pickCandidates（kind "reposition"）、確定は resolvePick が行う
      state.pendingPick = { kind: "reposition", draw: effect.value || 1 };
      log.push("REPOSITION 戻す罠を1つ選択");
      return;
    } else if (effect.type === "detonate_all") {
      // 総起爆: 設置中の罠をすべて条件無視で即時発動させる（詳細は detonateAllTraps）
      detonateAllTraps(state, log);
      return;
    } else if (effect.type === "purge_start") {
      // 炉心臨界: 臨界排熱を始動する。以後の蓄積（廃棄で +1）とターン終了時スリップが有効になる。
      // 既に始動している場合は二重始動しない（蓄積はこのカード自身の廃棄分が playFromHand で数えられる）
      if (state.characterId === "vessel00" && !state.purgeActive) {
        state.purgeActive = true;
        log.push("臨界排熱 始動 (CRITICAL PURGE)");
      } else if (state.purgeActive) {
        log.push("臨界排熱 は始動中");
      }
      return;
    } else if (effect.type === "purge_reduce") {
      // 圧力弁／冷却液フラッシュ／残り火の再生（プリミティブ purge_reduce）:
      // 臨界カウンタを下げる。与ダメ蓄積とスリップは同じカウンタを参照するため連動して下がる
      const before = state.purgeCount || 0;
      state.purgeCount = Math.max(0, before - (effect.value || 0));
      if (state.purgeCount !== before) log.push(`臨界排熱 蓄積 ${before} → ${state.purgeCount}`);
      return;
    } else if (effect.type === "damage_per_hp_lost") {
      // 熱爪／放射新星／放射熱撃（プリミティブ damage_per_hp_lost、参照系）:
      // 基礎値＋floor（減少HP ÷ perHp）。perHp は除数（既存の per＝乗数とは意味が逆。取り違え防止に別名）
      const lost = Math.max(0, (state.player.hpMax || 0) - (state.player.hp || 0));
      effect = { ...effect, type: "damage", value: (effect.value || 0) + Math.floor(lost / (effect.perHp || 1)) };
    } else if (effect.type === "damage_per_slip") {
      // 排熱ブラスト／過熱撃（プリミティブ damage_per_slip、参照系）:
      // 基礎値＋現在の臨界カウンタ×per。未始動ならカウンタは 0 のため基礎値のみ
      effect = { ...effect, type: "damage", value: (effect.value || 0) + (state.purgeCount || 0) * (effect.per || 0) };
    } else if (effect.type === "damage_equal_hp_fraction") {
      // 燃え尽き（プリミティブ damage_equal_hp_fraction）: 現在HP ÷ denom（切り捨て）を
      // 自傷として受け（コスト扱い。BLK・軽減の対象外）、同値を敵ダメージへ加算する
      const frac = Math.floor((state.player.hp || 0) / (effect.denom || 2));
      if (frac > 0) {
        state.player.hp = Math.max(0, state.player.hp - frac);
        // 第2陣 2E (RB-6／R-17): 現在HP割合の自傷も致死回避の対象。
        trySparePump(state, log);
        log.push(`燃え尽き 自傷 ${frac}`);
        log.push(`HP ${state.player.hp}`);
        if (state.player.hp === 0) log.push("VESSEL DOWN");
      }
      effect = { ...effect, type: "damage", value: (effect.value || 0) + frac };
    } else if (effect.type === "draw_if_hp_le") {
      // 最後の灯（プリミティブ draw_if_hp_le）: HP割合が threshold 以下なら bonus 枚、通常は value 枚
      const ratio = (state.player.hpMax || 0) > 0 ? (state.player.hp || 0) / state.player.hpMax : 1;
      const count = ratio <= (typeof effect.threshold === "number" ? effect.threshold : 0.25)
        ? (effect.bonus || effect.value || 0) : (effect.value || 0);
      const res = drawCards(state, count);
      for (const line of res.log) log.push(line);
      return;
    }
    let amount = effect.value;
    // 第2陣 2C (RB-2 大口径穿孔ヘッド): ダメージ基礎値の常時補正は、倍率（騒音力学）より
    // 前に基礎値へ加算する（倍率は +1 の後に乗る。R-10）。変換系（noScale＝固定レート）は
    // 対象外。自傷（player 対象）にも乗せない。罠ダメージへの適用は trapFireDamage 側。
    if (!noScale && effect.target === "enemy" && effect.type === "damage") {
      amount += relicDamageBaseBonus(state);
    }
    // 騒音力学の倍率（GOLIATHのみ）: 敵へのダメージと自BLK獲得に適用。自傷・回復等には適用しない
    if (!noScale && state.characterId === "vessel04"
      && ((effect.target === "enemy" && effect.type === "damage")
        || (effect.target === "player" && effect.type === "block"))) {
      amount = Math.round(amount * noiseScale(state, ctx));
    }
    // 『臨界排熱』（REACTOR固有OS）: 始動中は敵への基本ダメージ全てに purgeCount を加算する。
    // 上の変換（damage_per_slip 等）を経た通常ダメージにも乗る。自傷（player対象）には乗せない
    if (state.characterId === "vessel00" && state.purgeActive
      && effect.target === "enemy" && effect.type === "damage") {
      amount += state.purgeCount || 0;
    }
    if (effect.target === "enemy" && effect.type === "damage") {
      // next_attack_bonus（プリミティブ #4）: 保留ボーナスはこのダメージ効果の初撃にだけ加算して消費する。
      // 罠ダメージ（applyTrapDamage）とターン開始時パワー（turn_start_noise_damage）は別経路のため消費しない
      let pendingBonus = 0;
      if ((state.nextAttackBonus || 0) > 0) {
        pendingBonus = state.nextAttackBonus;
        state.nextAttackBonus = 0;
        log.push(`ATK BONUS +${pendingBonus}`);
      }
      const hits = effect.hits || 1;
      for (let h = 0; h < hits; h += 1) {
        if (state.enemy.hp <= 0) break;
        const hitAmount = amount + (h === 0 ? pendingBonus : 0);
        const block = effect.pierce ? 0 : (state.enemy.block || 0);
        const soaked = Math.min(block, hitAmount);
        const dealt = hitAmount - soaked;
        if (soaked > 0) {
          state.enemy.block = block - soaked;
          log.push(`BLOCKED ${soaked}`);
        }
        state.enemy.hp = Math.max(0, state.enemy.hp - dealt);
        if (state.enemy.hp === 0) state.enemy.dead = true;
        log.push(`DMG ${dealt}${effect.pierce ? " PIERCE" : ""}  HP ${state.enemy.hp}`);
      }
      // P-N5: 攻撃解決で HP 閾値を跨いだら、その場でフェイズ遷移を確定する（S-4）
      maybeShiftPhase(state, log);
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
      // 第2陣 2E (RB-6／R-17): カードの自傷効果も致死回避の対象。
      trySparePump(state, log);
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

  function playCard(state, card, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    // 音響穿孔サウンド（ピーーッガガガ…＋ガシャシャン！）は UI 側（main.js の onRead）が
    // AudioManager.playPunch(intensity) で鳴らす。intensity はカードのノイズ値＋警報時+1。
    const check = canPlay(state, card);
    if (!check.ok) return { ok: false, reason: check.reason, log: [] };
    // 保持割引は実効コストで支払う（canPlay と同じ基準）
    state.player.energy -= effectiveCost(state, card);
    // 『炉心溶融』（REACTOR固有OS）: PWRが不足した分は HP 5/PWR のコストで支払う。
    // コストは BLK・被ダメ軽減の対象外（直接HPから引く）。効果解決より前に支払うため、
    // 放射熱撃などの「減少HP」参照にも燃やした分が数えられる。HP 0 以下なら敗北（自滅）
    let meltdownHp = 0;
    let meltdownDeficit = 0;
    if (state.characterId === "vessel00" && state.player.energy < 0) {
      meltdownDeficit = -state.player.energy;
      state.player.energy = 0;
      meltdownHp = meltdownDeficit * 5;
      state.player.hp = Math.max(0, state.player.hp - meltdownHp);
    }
    const isGoliath = state.characterId === "vessel04";
    // 効果解決の基準値: このカード自身のNOISE加算前のNOISEと、使用前までに切った枚数、
    // 使用開始時点のスタンス（物陰の一撃の stance_bonus 判定用）、使用カードID（power の出所記録用）
    const ctx = { noiseBefore: state.noise || 0, playedBefore: state.cardsPlayedThisTurn || 0, stanceBefore: state.player.stance, cardId: card.id, player: resolvePlayer(state) };
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
    // 第2陣 2E (RB-6／R-12): 炉心溶融の支払いによる自滅でも予備心臓ポンプは発動する。
    if (meltdownHp > 0) trySparePump(state, log);
    if (meltdownHp > 0) {
      log.push(`炉心溶融: PWR不足 ${meltdownDeficit} を HP ${meltdownHp} で支払い`);
      log.push(`HP ${state.player.hp}`);
      if (state.player.hp === 0) log.push("VESSEL DOWN (炉心溶融)");
    }
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
      // 第2陣 2D (RB-5): 同じ行に並ぶ敵攻撃の上乗せ（alertBuff）は判定帯域の値のため、
      // 帯域名も判定帯域で揃える（RB-5 未所持時は従来と同一）。
      log.push(`警報帯域: ${judgedBand(state, state.noise).name} (敵攻撃 +${state.alertBuff})`);
    }
    return { ok: true, reason: "", log, breach, oversized };
  }

  function playFromHand(state, cardId, uid, ref) {
    // 単位2-2: 第4引数で行動プレイヤーを指定できる。第3引数（uid は常に数値）に
    // 数値でない値が来た場合は、それをプレイヤー指定とみなす
    if (typeof ref === "undefined" && typeof uid !== "undefined" && typeof uid !== "number") {
      ref = uid;
      uid = 0;
    }
    state = scopeFor(state, resolvePlayer(state, ref));
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
    if (isTrapCard(card)) {
      // 罠カードは捨て札・廃棄へ行かず、設置（state.traps）へ移る。
      // 設置レコード自体は playCard → applyEffect（type "trap"）が積んでいる
      result.trapSet = true;
    } else if (card.isExhaust) {
      state.exhaust.push(card);
      // 圧縮穿孔（damage_per_exhausted）の参照カウンタ。この戦闘の累計
      state.exhaustedCount = (state.exhaustedCount || 0) + 1;
      result.log.push(`EXHAUST ${card.name}`);
      // 『臨界排熱』（REACTOR固有OS）: 始動後に廃棄カードを使うたび purgeCount +1。
      // 炉心臨界自身も廃棄カードであり、その使用で始動した直後に +1 される（始動時点から数える）
      if (state.characterId === "vessel00" && state.purgeActive) {
        state.purgeCount = (state.purgeCount || 0) + 1;
        result.log.push(`臨界排熱 蓄積 ${state.purgeCount} (与ダメ +${state.purgeCount} / 終了時スリップ ${state.purgeCount})`);
      }
    } else {
      state.discard.push(card);
    }
    return result;
  }

  function beginTurn(state, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    state.player.energy = state.player.energyMax;
  }

  // サーチ系（search_top／search）の山札不足時のリシャッフル（ドローの RESHUFFLE と統一）。
  // 山札が minNeeded 未満で捨て札がある場合、捨て札をシャッフルして山札の「下」へ戻す
  // （残っている山札の順序＝次に引く順は維持する。ドローで山札が尽きた場合の再編と同じ流儀）。
  // 戻した枚数を返し、呼び出し側が pendingPick.reshuffled へ積んで UI 側の演出発火に使う。
  // ログはドロー時と同じ `RESHUFFLE n`（n = 再編後の山札枚数）。
  function topUpDeckForSearch(state, minNeeded, log) {
    if (state.drawPile.length >= minNeeded || state.discard.length === 0) return 0;
    const returned = state.discard.length;
    state.drawPile = shuffle(state.discard).concat(state.drawPile);
    state.discard = [];
    log.push(`RESHUFFLE ${state.drawPile.length}`);
    return returned;
  }

  function drawCards(state, count, rng, ref) {
    if (typeof ref === "undefined" && rng && typeof rng !== "function") { ref = rng; rng = undefined; }
    state = scopeFor(state, resolvePlayer(state, ref));
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
  function pickCandidates(state, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    if (!state || !state.pendingPick) return [];
    if (state.pendingPick.kind === "search") return state.drawPile.slice();
    // search_top（プリミティブ #1）: 山札の「上」は drawPile の末尾側（drawCards が pop で引く）。
    // 上 n 枚だけが候補になる
    if (state.pendingPick.kind === "search_top") {
      const n = state.pendingPick.n || 3;
      return state.drawPile.slice(Math.max(0, state.drawPile.length - n));
    }
    if (state.pendingPick.kind === "discard") return state.hand.slice();
    // curse（プリミティブ #13）: 候補は手札の呪いだけ
    if (state.pendingPick.kind === "curse") return state.hand.filter((card) => isCurseCard(card));
    // reposition／trap_sacrifice: 候補は設置中の罠そのもの。UI にはカード面で出すため定義オブジェクトへ写す
    // （同種の罠は性能が同一なので、確定は cardId 一致の先頭レコードで等価に処理できる）
    if (state.pendingPick.kind === "reposition" || state.pendingPick.kind === "trap_sacrifice") {
      return (state.traps || []).map((trap) => lookup(trap.cardId)).filter(Boolean);
    }
    return [];
  }

  // cardId が null の場合は「候補なし」の自動解決（search は不発、discard はドローのみ実施）。
  function resolvePick(state, cardId, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
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
    if (pick.kind === "reposition") {
      // 設置中の罠1つを設置から外して手札へ戻し、さらに pick.draw 枚ドローする。
      // 対象が取れなければ不発（ドローもしない）
      const traps = state.traps || [];
      const index = cardId ? traps.findIndex((trap) => trap.cardId === cardId) : -1;
      if (index < 0) {
        log.push("REPOSITION 不発 (対象なし)");
        return { ok: false, log };
      }
      const removed = traps.splice(index, 1)[0];
      const def = lookup(removed.cardId);
      if (def) {
        state.hand.push(def);
        log.push(`REPOSITION ${def.name} を手札へ回収`);
      }
      const res = drawCards(state, pick.draw || 1);
      for (const line of res.log) log.push(line);
      return { ok: true, log };
    }
    if (pick.kind === "search_top") {
      // 山札の上 n 枚を取り出し、選ばれた1枚を手札へ、残りを捨て札へ送る。
      // 対象が取れなければ山札へ戻して不発（残りも捨てない）
      const n = pick.n || 3;
      const pile = state.drawPile;
      const topCount = Math.min(n, pile.length);
      if (topCount === 0) {
        log.push("MEASURE 不発 (山札が空)");
        return { ok: false, log };
      }
      const top = pile.splice(pile.length - topCount, topCount);
      const index = cardId ? top.findIndex((card) => card.id === cardId) : -1;
      if (index < 0) {
        pile.push(...top);
        log.push("MEASURE 不発 (対象なし)");
        return { ok: false, log };
      }
      const picked = top.splice(index, 1)[0];
      state.hand.push(picked);
      log.push(`MEASURE ${picked.name} を手札へ`);
      for (const rest of top) {
        state.discard.push(rest);
        log.push(`MEASURE ${rest.name} を捨て札へ`);
      }
      return { ok: true, log };
    }
    if (pick.kind === "curse") {
      // 手札の呪い1枚を廃棄（exhaust）へ送り、pick.draw 枚ドローする。
      // 対象が取れなければ不発（ドローもしない）。廃棄は exhaustedCount に数える
      const index = cardId ? state.hand.findIndex((card) => card.id === cardId && isCurseCard(card)) : -1;
      if (index < 0) {
        log.push("CURSE SPONGE 不発 (対象なし)");
        return { ok: false, log };
      }
      const removed = state.hand.splice(index, 1)[0];
      state.exhaust.push(removed);
      state.exhaustedCount = (state.exhaustedCount || 0) + 1;
      log.push(`CURSE EXHAUST ${removed.name}`);
      const res = drawCards(state, pick.draw || 0);
      for (const line of res.log) log.push(line);
      return { ok: true, log };
    }
    if (pick.kind === "trap_sacrifice") {
      // 設置中の罠1つを「取り除き」、pick.draw 枚ドローする。部品へ戻す扱いのため
      // 廃棄（exhaust）へは送らず、exhaustedCount にも数えない（再配置＝手札回収との対）
      const traps = state.traps || [];
      const index = cardId ? traps.findIndex((trap) => trap.cardId === cardId) : -1;
      if (index < 0) {
        log.push("SPARE PARTS 不発 (対象なし)");
        return { ok: false, log };
      }
      const removed = traps.splice(index, 1)[0];
      const def = lookup(removed.cardId);
      log.push(`SPARE PARTS ${def ? def.name : removed.cardId} を部品へ分解`);
      const res = drawCards(state, pick.draw || 0);
      for (const line of res.log) log.push(line);
      return { ok: true, log };
    }
    return { ok: false, log };
  }

  // ==== 『アナログ・トラップ機構』: 罠の発動エンジン ====
  // プール大拡充バッチC（WEAVER W-10「監視の目」）: 持続パワー trap_damage_up の加算分。
  // 罠カードの発動ダメージにだけ乗せる。applyTrapDamage は圧力鍋（turn_start_noise_damage）も
  // 流用するため、加算はここではなく罠の発動箇所（resolveTrapsBeforeAction／detonateAllTraps）で行う
  function trapDamageBonus(state) {
    return (state.powers || [])
      .filter((power) => power.kind === "trap_damage_up")
      .reduce((sum, power) => sum + (power.value || 0), 0);
  }

  function trapFireDamage(state, trap) {
    // 第2陣 2C (RB-2／R-10): 罠ダメージにも基礎値補正を適用する。圧力鍋
    // （turn_start_noise_damage）は変換系のため、ここを通らない経路のまま対象外にする
    // （applyTrapDamage へ直接渡される。上の trapDamageBonus と同じ置き場の原則）。
    return (trap.damage || 0) + trapDamageBonus(state) + relicDamageBaseBonus(state);
  }

  // 罠ダメージは通常攻撃と同じ経路（敵BLKで相殺、貫通なし、騒音力学の倍率なし）で適用する
  function applyTrapDamage(state, amount, log) {
    if (!amount || amount <= 0 || state.enemy.dead) return 0;
    const block = state.enemy.block || 0;
    const soaked = Math.min(block, amount);
    if (soaked > 0) {
      state.enemy.block = block - soaked;
      log.push(`BLOCKED ${soaked}`);
    }
    const dealt = amount - soaked;
    state.enemy.hp = Math.max(0, state.enemy.hp - dealt);
    if (state.enemy.hp === 0) state.enemy.dead = true;
    log.push(`DMG ${dealt}  HP ${state.enemy.hp}`);
    // P-N5: 罠ダメージで閾値を跨いだ場合も遷移を確定する（遷移自体は行動ではない）
    maybeShiftPhase(state, log);
    return dealt;
  }

  // 発動（または起爆）した罠を設置から外し、廃棄（exhaust）へ送る。
  // 圧縮穿孔の参照カウンタ（この戦闘で廃棄された枚数）にも数える
  function consumeTrap(state, record) {
    const traps = state.traps || [];
    const index = traps.indexOf(record);
    if (index >= 0) traps.splice(index, 1);
    const def = record.cardId ? lookup(record.cardId) : null;
    if (def) {
      state.exhaust.push(def);
      state.exhaustedCount = (state.exhaustedCount || 0) + 1;
    }
  }

  // プリミティブ #21: 罠の発動時セルフ効果（selfBlock = 自分のBLK +n／drawOnTrigger = n ドロー）。
  // 既存kind では両フィールドとも 0 のため無動作。新kind（警報線／火花罠／囮地雷）が使う
  function fireTrapSideEffects(state, trap, log) {
    if ((trap.selfBlock || 0) > 0) {
      state.player.block = (state.player.block || 0) + trap.selfBlock;
      log.push(`TRAP SELF BLOCK +${trap.selfBlock}  BLK ${state.player.block}`);
    }
    if ((trap.drawOnTrigger || 0) > 0) {
      const res = drawCards(state, trap.drawOnTrigger);
      for (const line of res.log) log.push(line);
    }
  }

  // 総起爆（FULL DETONATION）: 設置中の罠をすべて条件無視で即時発動する。
  // 鉄線系はダメージのみ（攻撃軽減なし）、地雷系もダメージのみ（残響はスタン+1も）、
  // 粘着はスタン+2。集音地雷を含む場合は「次の行動キャンセル」を予約する
  function detonateAllTraps(state, log) {
    const traps = (state.traps || []).slice();
    if (traps.length === 0) {
      log.push("総起爆 — 設置中の罠なし");
      return;
    }
    let includesAudioMine = false;
    for (const trap of traps) {
      consumeTrap(state, trap);
      if (trap.kind === "audio_mine") includesAudioMine = true;
      const label = TRAP_LABEL[trap.kind] || trap.kind;
      const fireDamage = trapFireDamage(state, trap);
      const bits = [];
      if (fireDamage > 0) bits.push(`${fireDamage}dmg`);
      if (trap.stun > 0) bits.push(`スタン +${trap.stun}`);
      if (trap.selfBlock > 0) bits.push(`自BLK +${trap.selfBlock}`);
      if (trap.drawOnTrigger > 0) bits.push(`${trap.drawOnTrigger}ドロー`);
      log.push(`TRAP: ${label} 起爆 (総起爆)${bits.length ? ` ${bits.join(" / ")}` : ""}`);
      if (fireDamage > 0) applyTrapDamage(state, fireDamage, log);
      if (trap.stun > 0) addStun(state, trap.stun, log, false);
      fireTrapSideEffects(state, trap, log);
      if (state.enemy.dead) break;
    }
    if (includesAudioMine && !state.enemy.dead) {
      state.enemy.cancelNextIntent = (state.enemy.cancelNextIntent || 0) + 1;
      log.push("次の行動キャンセル予約 (集音地雷)");
    }
  }

  // 敵ターンの新フェイズ: 行動解決の直前に割り込み、設置中の罠の発動を判定する。
  // enemyTurn から「敵が行動しない確定ケース（dead／cancelNextIntent／スタン最大ショート）」の
  // 後でのみ呼ばれる。NOISE条件は敵フェイズ開始時点の state.noise で判定する。
  // 戻り値: { cancelled, attackCut, dead }。
  // - 集音地雷: NOISE≥minNoise で発動し、その行動自体をキャンセルする（1回の行動で1つまで。
  //   キャンセルが決まったら以降の罠は発動しない）
  // - 残響地雷: NOISE≥minNoise で発動（ダメージ＋スタン蓄積）。キャンセルはしない
  // - 粘着ワイヤー: 本行動が非攻撃のとき発動（スタン蓄積）。行動自体は実行される
  // - 迎撃鉄線／二重鉄線: 本行動が攻撃のときのみ発動し、重ねがけする（ダメージ＋攻撃値の減算）。
  //   警報の追加行動には発動しない（enemyTurn の本行動解決前にのみ呼ばれるため自然にそうなる）
  function resolveTrapsBeforeAction(state, intent, log) {
    const out = { cancelled: false, attackCut: 0, dead: false };
    const traps = state.traps || [];
    if (traps.length === 0 || state.enemy.dead) return out;
    const noiseNow = state.noise || 0;
    const attack = isAttackIntent(intent);
    const ofKind = (kind) => traps.filter((trap) => trap.kind === kind);
    for (const kind of TRAP_FIRE_ORDER) {
      if (state.enemy.dead) { out.dead = true; return out; }
      if (kind === "audio_mine") {
        const mine = ofKind(kind)[0];
        if (mine && noiseNow >= (mine.minNoise || 3)) {
          consumeTrap(state, mine);
          const dmg = trapFireDamage(state, mine);
          log.push(`TRAP: AUDIO MINE 起爆 ${dmg}dmg / 行動キャンセル`);
          applyTrapDamage(state, dmg, log);
          if (state.enemy.dead) { out.dead = true; return out; }
          out.cancelled = true;
          return out;
        }
        continue;
      }
      if (kind === "echo_mine") {
        // バッチC: minNoise は地雷ごとに判定する（残響地雷 minNoise 2 と重残響地雷 minNoise 4 の
        // 混在対応。従来は先頭の1つの minNoise で同種全部を一括判定していた）
        const ready = ofKind(kind).filter((mine) => noiseNow >= (mine.minNoise || 2));
        if (ready.length === 0) continue;
        for (const mine of ready) {
          consumeTrap(state, mine);
          const dmg = trapFireDamage(state, mine);
          log.push(`TRAP: ECHO MINE 起爆 ${dmg}dmg / スタン +${mine.stun}`);
          applyTrapDamage(state, dmg, log);
          if (mine.stun > 0) addStun(state, mine.stun, log, false);
          if (state.enemy.dead) { out.dead = true; return out; }
        }
        continue;
      }
      if (kind === "decoy_mine") {
        // 囮地雷（プリミティブ #21）: 敵の行動時に発動し、ダメージではなくドロー（＋任意のセルフ効果）を生む
        for (const mine of ofKind(kind)) {
          consumeTrap(state, mine);
          log.push("TRAP: DECOY MINE 起爆 (注意を逸らす)");
          fireTrapSideEffects(state, mine, log);
        }
        continue;
      }
      if (kind === "glue_wire") {
        if (attack) continue;
        for (const wire of ofKind(kind)) {
          consumeTrap(state, wire);
          log.push(`TRAP: GLUE WIRE 起爆 スタン +${wire.stun}`);
          if (wire.stun > 0) addStun(state, wire.stun, log, false);
          fireTrapSideEffects(state, wire, log);
        }
        continue;
      }
      if (kind === "alarm_wire") {
        // 警報線（プリミティブ #21）: 敵の行動時に発動（攻撃・非攻撃どちらでも）。スタン＋自BLK
        for (const wire of ofKind(kind)) {
          consumeTrap(state, wire);
          log.push(`TRAP: TRIP ALARM 起爆 スタン +${wire.stun} / 自BLK +${wire.selfBlock || 0}`);
          if (wire.stun > 0) addStun(state, wire.stun, log, false);
          fireTrapSideEffects(state, wire, log);
        }
        continue;
      }
      // barbed_wire / double_wire / spark_trap（火花罠は selfBlock 付きの鉄線系変種）
      if (!attack) continue;
      for (const wire of ofKind(kind)) {
        consumeTrap(state, wire);
        out.attackCut += wire.cut || 0;
        const dmg = trapFireDamage(state, wire);
        log.push(`TRAP: ${TRAP_LABEL[kind]} 起爆 ${dmg}dmg / 攻撃 -${wire.cut}`);
        applyTrapDamage(state, dmg, log);
        fireTrapSideEffects(state, wire, log);
        if (state.enemy.dead) { out.dead = true; return out; }
      }
    }
    return out;
  }

  function discardHand(state, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    const moved = state.hand.splice(0, state.hand.length);
    // 保持割引の表示フラグはターン終了で失効する（実体＝複製オブジェクトにだけ触る）
    for (const card of moved) if (card.__uid) card.__heldNow = false;
    state.discard.push(...moved);
    return moved;
  }

  function startCombat(state) {
    return { log: applyRelics(state, "start_of_combat") };
  }

  function beginPlayerTurn(state, rng, ref) {
    if (typeof ref === "undefined" && rng && typeof rng !== "function") { ref = rng; rng = undefined; }
    const actor = resolvePlayer(state, ref);
    state = scopeFor(state, actor);
    // 単位2-2: 自ターン開始で終了宣言（ready）は解除される
    if (actor) actor.ready = false;
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
    // 例外（RELIC-TURNSTART-INVESTIGATION §5 案A）: 戦闘の最初のプレイヤーターン（turn 1）では
    // 失効しない。beginCombat／beginCombatMP は startCombat（戦闘開始時レリックの BLK 付与。
    // 基礎OS +2／光学迷彩 +8／装甲箔ロール +12／二重箔送り装甲 +16）→ 初回 beginPlayerTurn の
    // 順で呼ぶため、ここで失効させると戦闘開始 BLK が敵の初撃を受ける前に消えてしまう。
    // turn は resolveFullTurn で加算される戦闘単位の番号で、スナップショットにも往復する。
    // 復元（restoreCombat）は beginPlayerTurn を呼ばず静止状態から再開するため、ターン1の
    // スナップショット復元で二重付与・再失効は起きない。第2ターン以降は従来どおり失効する。
    const isFirstPlayerTurn = (state.turn || 1) <= 1;
    const expiredBlock = isFirstPlayerTurn ? 0 : (state.player.block || 0);
    if (!isFirstPlayerTurn) state.player.block = 0;
    // 第2陣 2D (N-5／精査 J-9): レリック発火で NOISE が下がった場合は帯域（alertBuff）を
    // 必ず再同期する。カードを使わずにターンを終えても、敵フェイズの攻撃上乗せが
    // 旧帯域のまま残らないようにするため（スナップショット turnStartNoise は冒頭で
    // 確定済みのため、再同期しても変換系の計算基準は動かない）。
    const noiseBeforeRelics = state.noise || 0;
    const notes = applyRelics(state, "start_of_turn");
    if ((state.noise || 0) !== noiseBeforeRelics) syncAlertBuff(state);
    // 第2陣 2B (RB-1): レリック経路のターン開始時ドロー。実処理は drawCards() 側にしか
    // ないため、ここでモジュール境界を越えて接続する。発火は本ドロー（この後の drawCards）
    // より前であり、通常ドローと合わせて手札が 1 枚多くなる（FINAL §2.2 RB-1）。
    if (root.Relics && root.Relics.startOfTurnDraws) {
      for (const draw of root.Relics.startOfTurnDraws(state)) {
        if (!(draw.value > 0)) continue;
        const res = drawCards(state, draw.value);
        notes.push(`PART ${draw.name} DRAW +${draw.value}`);
        for (const line of res.log) notes.push(line);
      }
    }
    if (expiredBlock > 0) notes.unshift(`BLOCK EXPIRED ${expiredBlock}`);
    // プール大拡充バッチB: 持続パワーの追加種別（ターン開始時。プリミティブ #16〜#18）。
    // vent_per_turn（予備ギア／静寂領域）: NOISE −value（機体別クランプ適用）。
    // block_per_turn（残響バッテリー）: BLK +value。防護の失効（上の block = 0）より後に加算する。
    // turn_start_noise_damage（圧力鍋）: 敵へ「開始時NOISE×value」ダメージ（変換系・固定レート）。
    // 開始時NOISEは冒頭で確定した turnStartNoise スナップショット（vent 適用前）を使う。
    let vented = false;
    for (const power of state.powers || []) {
      if (power.kind === "vent_per_turn" && power.value) {
        const before = state.noise || 0;
        state.noise = clampNoise(state, before - power.value);
        vented = true;
        if (state.noise !== before) powerNotes.push(`POWER ${power.source} NOISE ${before} → ${state.noise}`);
      } else if (power.kind === "block_per_turn" && power.value) {
        state.player.block += power.value;
        powerNotes.push(`POWER ${power.source} BLOCK +${power.value}`);
      } else if (power.kind === "turn_start_noise_damage" && power.value) {
        const dmg = Math.max(0, state.turnStartNoise || 0) * power.value;
        if (dmg > 0 && !state.enemy.dead) {
          powerNotes.push(`POWER ${power.source} 開始時ノイズ ${state.turnStartNoise} ×${power.value}`);
          applyTrapDamage(state, dmg, powerNotes);
        }
      }
    }
    if (vented) syncAlertBuff(state);
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
    // P-N6（alertBias）: 決定論の優先順位の上書き（乱数は入れない）。上書き対象は
    // 攪乱が発動しない場面（非COVER時）での追撃／照準の優先順位に限る（S-5）。
    // 照準は「次の本体インテントが heavy_attack の時」にしか選ばれないため、
    // "aim" 寄りはその場面で照準を維持する指定として働き、"pursuit" 寄りは
    // その場面でも追撃を優先させる。
    const bias = state.enemy.alertBias || null;
    if (bias === "pursuit") return "pursuit";
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
    // P-N3（enrage）: 敵側の累積バフを同枠で加算する。警報の追撃（本関数を共有）にも
    // 同じく反映される（S-6）。半減系はこの後段で従来どおり最後に適用される。
    if (state.enemy && (state.enemy.atkBuff || 0) > 0) value += state.enemy.atkBuff;
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
    // 第2陣 2C (RB-4／R-14): 固定軽減列（COVER／重圧歩行／騒音力学／RB-4）の合算上限。
    // 1ヒットごとの固定軽減の合計は SYSTEM_CAPS.fixedReductionTotal を上限とし、各軽減は
    // 残り予算の範囲で引く。乗算系（下の半減）より後に引く従来順序と、軽減後が 0 未満に
    // ならない下限は維持する。コスト系 HP（自傷・スリップ等）は strikeVolley を通らない
    // ため、この上限・軽減の対象にもならない。
    const reductionCap = root.Relics && root.Relics.SYSTEM_CAPS
      && typeof root.Relics.SYSTEM_CAPS.fixedReductionTotal === "number"
      ? root.Relics.SYSTEM_CAPS.fixedReductionTotal : Number.POSITIVE_INFINITY;
    const relicReduction = root.Relics && root.Relics.fixedReduction ? root.Relics.fixedReduction(state) : 0;
    let dealt = 0;
    let soakedTotal = 0;
    let evaded = false;
    // 第2陣 2E (RB-6): この行動（ボレー）の途中で予備心臓ポンプが発動したら、その行動の
    // 残りヒットも全て HP 1 で受け切る（FINAL §2.2 RB-6 の発動範囲表 (1)）。
    let volleyPumpGuard = false;
    for (let i = 0; i < hits; i += 1) {
      if (state.player.hp <= 0) break;
      let dmg = value;
      if (i === 0 && (state.player.halveNext || 0) > 0) {
        state.player.halveNext -= 1;
        dmg = Math.floor(dmg / 2);
        log.push(`DECOY HALVED ${dmg}`);
      }
      let reductionBudget = reductionCap;
      if (state.player.stance === "COVER") {
        const cut = Math.min(dmg, 2, reductionBudget);
        dmg -= cut;
        reductionBudget -= cut;
        if (dmg === 0) evaded = true;
      }
      // 正式版フェーズ1: 重圧歩行（GOLIATH）の固定値軽減。COVER軽減の後・防護相殺の前に1ヒットごとに適用
      if ((state.player.tread || 0) > 0 && dmg > 0) {
        const cut = Math.min(dmg, state.player.tread, reductionBudget);
        dmg -= cut;
        reductionBudget -= cut;
        if (cut > 0) log.push(`TREAD -${cut}`);
      }
      // 正式版 修正第2弾: 騒音力学の拡張（GOLIATHのみ）。被攻撃ダメージを現在NOISE連動で軽減する。
      // 重圧歩行の後・防護相殺の前に1ヒットごとに適用し、重圧歩行とは重ねがけされる。
      if (state.characterId === "vessel04" && dmg > 0) {
        const armor = noiseArmor(state);
        if (armor > 0) {
          const cut = Math.min(dmg, armor, reductionBudget);
          dmg -= cut;
          reductionBudget -= cut;
          if (cut > 0) log.push(`騒音力学: 装甲が衝撃を呑む -${cut}`);
        }
      }
      // 第2陣 2C (RB-4 耐熱セラミック隔壁): 固定軽減列の最後尾に 1ヒットごと軽減する。
      if (relicReduction > 0 && dmg > 0) {
        const cut = Math.min(dmg, relicReduction, reductionBudget);
        dmg -= cut;
        reductionBudget -= cut;
        if (cut > 0) log.push(`CERAMIC -${cut}`);
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
      // 第2陣 2E (RB-6): 致死なら介入する。発動した行動の間は残りヒットでも HP 1 未満に
      // ならない（受け切った分は実損が無いため dealt から差し引く）。
      if (state.player.hp <= 0) {
        if (trySparePump(state, log)) volleyPumpGuard = true;
        else if (volleyPumpGuard) {
          state.player.hp = 1;
          dealt -= hit;
        }
      }
    }
    if (soakedTotal > 0) log.push(`BLOCKED ${soakedTotal}  BLK ${state.player.block}`);
    log.push(`HP ${state.player.hp}`);
    if (state.player.hp === 0) log.push("VESSEL DOWN");
    if (intent.action === "attack_stun" && dealt > 0) {
      state.player.stagger = (state.player.stagger || 0) + 1;
      log.push("STAGGER 1");
      log.push("体勢が崩れた (次ターンの電力 -1)");
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
      // 敵行動の説明（読ませる設計）: 記号行の直後に、何が変わったかを日本語で1行足す
      const nm = intent.name || tag;
      log.push(action === "buff"
        ? `${nm}: 敵が守りを固めた (防護 +${value} → ${state.enemy.block})`
        : `${nm}: 気配を消し、守りを固めた (防護 +${value} → ${state.enemy.block})`);
      return { log, outcome: action, damage: 0, call: `+${value} BLK` };
    }
    if (action === "debuff") {
      const beforeBlock = state.player.block || 0;
      state.player.stance = "EXPOSE";
      state.player.block = 0;
      log.push("SCAN");
      log.push("EXPOSE");
      log.push(beforeBlock > 0
        ? `${intent.name || "サーマルスキャン"}: こちらの防護が剥がされ (防護 ${beforeBlock} → 0)、態勢が EXPOSE になった`
        : `${intent.name || "サーマルスキャン"}: 防護は既に無く、態勢が EXPOSE になった`);
      return { log, outcome: "debuff", damage: 0, call: "EXPOSE" };
    }
    if (action === "wait") {
      const beforeBlock = state.enemy.block || 0;
      state.enemy.block = 0;
      log.push("VENT");
      log.push(beforeBlock > 0
        ? `${intent.name || "排熱処理"}: 敵が防護を捨てて熱を逃がした (敵の防護 ${beforeBlock} → 0)`
        : `${intent.name || "排熱処理"}: 敵が熱を逃がした (敵の防護は 0 のまま)`);
      return { log, outcome: "wait", damage: 0, call: "VENT" };
    }
    if (action === "hack") {
      const curse = root.Relics && (root.Relics.card("curse_flashback") || root.Relics.card("curse_noise"));
      if (curse) {
        state.discard.push(curse);
        log.push(`JAM  ${curse.name}`);
        log.push(`${intent.name || "ジャミング"}: 呪装「${curse.name}」が捨て札に 1 枚紛れ込んだ`);
      } else {
        log.push("JAM");
        log.push(`${intent.name || "ジャミング"}: 信号が攪乱された`);
      }
      return { log, outcome: "hack", damage: 0, call: "JAMMED" };
    }
    // P-N3（enrage）: 敵自身の攻撃への恒常バフ。累積上限 +6（S-6）。加算は
    // strikeVolley 側で基礎値＋警報バフ＋照準と同枠に行い、半減は従来どおり最後。
    if (action === "enrage") {
      const before = state.enemy.atkBuff || 0;
      const after = Math.min(ENRAGE_CAP, before + value);
      state.enemy.atkBuff = after;
      log.push(`ENRAGE  ATK +${after}`);
      log.push(after > before
        ? `${intent.name || "書庫防衛"}: 防衛機構が攻撃へ回り、敵の攻撃が累積で +${after} になった (上限 +${ENRAGE_CAP})`
        : `${intent.name || "書庫防衛"}: 攻撃の上乗せは既に上限 (+${ENRAGE_CAP}) に達している`);
      return { log, outcome: "enrage", damage: 0, call: `ATK +${after}` };
    }
    // P-N4（charge）: 次の「本行動の攻撃」への上乗せを予約する。警報の照準と同じ
    // 仕組みの敵側版として累積し、消費は resolveIntent の攻撃解決でのみ行う
    // （警報の追撃など strikeVolley を共有する経路では消費しない。m-6）。
    if (action === "charge") {
      state.enemy.chargeBonus = (state.enemy.chargeBonus || 0) + value;
      log.push(`CHARGE  NEXT ATK +${state.enemy.chargeBonus}`);
      log.push(`${intent.name || "照準"}: 敵が照準を絞った。次の攻撃が +${state.enemy.chargeBonus} 強化される`);
      return { log, outcome: "charge", damage: 0, call: `CHARGE +${value}` };
    }
    // P-N4 の消費: 本行動の攻撃でのみ、基礎値へ加算して消費する（半減は strikeVolley 側で最後）
    if (isAttackIntent(intent) && state.enemy && (state.enemy.chargeBonus || 0) > 0) {
      const bonus = state.enemy.chargeBonus;
      state.enemy.chargeBonus = 0;
      intent = { ...intent, value: (intent.value || 0) + bonus };
      log.push(`CHARGE +${bonus}`);
    }
    return strikeVolley(state, intent, log);
  }

  // ==== 単位2-2: 敵フェイズの複数化（設計書 §3／J2） ====
  // 主行動の対象は生存素体からランダムに選び、intentView が state.targetPlayerId に
  // 予告・保持したものを引き継ぐ（未予告ならここで抽選）。複数ヒットは対象1体に集中する
  // （strikeVolley が対象素体のスコープで解決するため自然にそうなる）。
  // 帯域の攻撃上乗せ（alertBuff／alertAim）は対象素体自身の値をその素体への攻撃にだけ適用し、
  // 追加行動は帯域が最も高い素体（排除優先度）へ向ける。罠は主対象の素体の設置分だけが
  // 主行動の前に発動する（解釈の根拠は MP-2-2-MEMO.md）。
  function enemyTurn(state, rng) {
    const root = rootOf(state);
    const log = [];
    // 作戦深度 段階3（§5.3-3）: 連続スタン不可の印は、この enemyTurn の冒頭
    // （スタン判定より前）で解除する。印が効くのは直前の自ターン中の addStun のみ。
    if (root && root.enemy && (root.enemy.stunLockTurns || 0) > 0) root.enemy.stunLockTurns = 0;
    const hasPlayers = !!(root && Array.isArray(root.players) && root.players.length > 0);
    // 追加行動の予告（alertTelegraphed）は排除優先度の素体が保持する。全員分を読んでから消す
    const pri = hasPlayers ? priorityPlayer(root, true) : null;
    const telegraphed = hasPlayers
      ? (pri ? (pri.alertTelegraphed || null) : null)
      : (root ? (root.alertTelegraphed || null) : null);
    if (hasPlayers) { for (const p of root.players) p.alertTelegraphed = null; }
    else if (root) root.alertTelegraphed = null;
    const alertBase = {
      telegraphed, kind: null, cancelled: false,
      targetPlayerId: hasPlayers && root.targetPlayerId ? root.targetPlayerId : null,
      priorityPlayerId: pri ? pri.playerId : null,
      extraTargetPlayerId: null,
    };
    if (root.enemy.dead) {
      log.push("TARGET DOWN");
      return { log, outcome: "down", damage: 0, call: "", action: null, targetPlayerId: alertBase.targetPlayerId, alert: { ...alertBase } };
    }
    if (root.enemy.cancelNextIntent > 0) {
      root.enemy.cancelNextIntent -= 1;
      advancePattern(root.enemy);
      if (hasPlayers) root.targetPlayerId = null;
      log.push("INTENT CANCELLED");
      log.push("敵の行動が打ち消された");
      return { log, outcome: "cancelled", damage: 0, call: "CANCELLED", action: { label: "CANCELLED", kind: "cancelled" }, targetPlayerId: alertBase.targetPlayerId, alert: { ...alertBase, cancelled: !!telegraphed } };
    }
    // 検収修正 2026-11-10 (PROMPT-19): スタン最大で敵の行動をショート（設計欠落の補完）
    if (!root.enemy.immuneToStun && (root.enemy.stun || 0) >= (root.enemy.stunMax || 3)) {
      root.enemy.stun = 0;
      // 作戦深度 段階3（§5.3-3）: ボスはスタン消費直後の1ターン蓄積免疫の印を立てる
      if (isBossEnemy(root.enemy) && root.depthProfile && (root.depthProfile.stunStage || 0) >= 3) {
        root.enemy.stunLockTurns = 1;
      }
      advancePattern(root.enemy);
      if (hasPlayers) root.targetPlayerId = null;
      log.push("STUNNED - 行動ショート");
      log.push("敵はスタンで動けない");
      return { log, outcome: "stunned", damage: 0, call: "STUNNED", action: { label: "STUNNED", kind: "stunned" }, targetPlayerId: alertBase.targetPlayerId, alert: { ...alertBase, cancelled: !!telegraphed } };
    }
    // 主行動の対象（生存素体から。予告済みならそれを引き継ぐ）
    const main = hasPlayers ? selectTargetPlayer(root, rng) : null;
    if (hasPlayers && !main) {
      log.push("ALL VESSELS DOWN");
      return { log, outcome: "party_down", damage: 0, call: "", action: null, targetPlayerId: null, alert: { ...alertBase, targetPlayerId: null } };
    }
    const mView = hasPlayers ? scopeFor(root, main) : root;
    // P-N5: 罠ダメージでフェイズ遷移が起きた場合、遷移側で patternIndex は 0 に
    // 戻っている。このターンの予告済み行動はそのまま実行し（予告＝実施）、進行は
    // 新フェイズの先頭を飛ばさないよう、パターンが差し替わっていたら進めない。
    const patternAtTurnStart = root.enemy.pattern;
    const advanceAfterAction = () => {
      if (root.enemy.pattern !== patternAtTurnStart) root.enemy.patternIndex = 0;
      else advancePattern(root.enemy);
    };
    // 『アナログ・トラップ機構』: 主対象の素体の罠だけが主行動の前に発動する
    let mainIntent = currentIntent(root.enemy);
    if ((mView.traps || []).length > 0) {
      const trapRes = resolveTrapsBeforeAction(mView, mainIntent, log);
      if (trapRes.dead || root.enemy.dead) {
        log.push("TARGET DOWN");
        if (hasPlayers) root.targetPlayerId = null;
        return { log, outcome: "down", damage: 0, call: "", action: null, targetPlayerId: main ? main.playerId : null, alert: { ...alertBase, targetPlayerId: main ? main.playerId : null } };
      }
      if (trapRes.cancelled) {
        advanceAfterAction();
        if (hasPlayers) root.targetPlayerId = null;
        log.push("INTENT CANCELLED (TRAP)");
        log.push("罠が敵の行動を打ち消した");
        return { log, outcome: "cancelled", damage: 0, call: "CANCELLED", action: { label: "CANCELLED", kind: "cancelled" }, targetPlayerId: main ? main.playerId : null, alert: { ...alertBase, targetPlayerId: main ? main.playerId : null, cancelled: !!telegraphed } };
      }
      // 迎撃鉄線系の攻撃軽減は、解決に渡すインテントの複製へ先に適用する（表示用 shownIntent にも反映される）
      if (trapRes.attackCut > 0 && isAttackIntent(mainIntent)) {
        mainIntent = { ...mainIntent, value: Math.max(0, (mainIntent.value || 0) - trapRes.attackCut) };
        log.push(`鉄線が攻撃を鈍らせる (攻撃値 -${trapRes.attackCut})`);
      }
    }
    // 正式版フェーズ1（A-2）: 敵フェイズ開始時点の対象素体の帯域で警報バフを確定させる
    syncAlertBuff(mView);
    // v15.3 案A: 中央バナー用の「実行された行動」ラベル。表示中のインテント予告
    // （intentView）と同じく対象素体の警報バフ＋照準を合算した実効値で組む。
    // P-N3／P-N4: 敵側の累積バフと照準予約も同枠で含める（resolveIntent の消費前）。
    const effBuff = ((main ? main.alertBuff : root.alertBuff) || 0) + ((main ? main.alertAim : root.alertAim) || 0)
      + ((root.enemy.atkBuff || 0) + (root.enemy.chargeBonus || 0));
    // スクラップ・ノイズのチャージがある場合は半減後の実効値でバナーを組む（表示専用・消費しない）
    let shownIntent = mainIntent;
    if (isAttackIntent(mainIntent)) {
      const rawValue = (mainIntent.value || 0) + effBuff;
      const shownValue = scrapHalvedValue(mView, mainIntent, rawValue);
      if (shownValue !== (mainIntent.value || 0)) shownIntent = { ...mainIntent, value: shownValue };
    }
    const actionInfo = { label: intentText(shownIntent), kind: mainIntent.action || "" };
    const mainHpBefore = main ? main.hp : 0;
    const result = resolveIntent(mView, mainIntent, log);
    result.action = actionInfo;
    result.targetPlayerId = main ? main.playerId : null;
    advanceAfterAction();
    // 正式版フェーズ1（A-2）＋単位2-2（J2）: 帯域の追加行動は排除優先度の素体へ向ける。
    // 回数はその素体の帯域で決まり、攻撃上乗せ・照準の消費もその素体自身の値を使う。
    // ノイズが3未満へ下がっていれば取消（予告を持っていた素体について判定する）。
    // 第2陣 2D (RB-5): 回数の決定には判定帯域（judgedBand）を使う（消費者 #2）。
    // 対象の選択（priorityPlayer＝消費者 #3）と予告の有無（alertExtraKind＝消費者 #4）は生値のまま。
    const band = pri ? judgedBand(root, pri.noise) : noiseBand(0);
    const alert = {
      telegraphed, kind: null, cancelled: false, count: 0, band: band.id,
      targetPlayerId: main ? main.playerId : null,
      priorityPlayerId: pri ? pri.playerId : null,
      extraTargetPlayerId: null,
    };
    const damageByPlayer = {};
    if (main) damageByPlayer[main.playerId] = Math.max(0, mainHpBefore - main.hp);
    if (pri && pri.hp > 0 && !root.enemy.dead) {
      if (band.extras > 0) {
        const pView = scopeFor(root, pri);
        syncAlertBuff(pView);
        alert.extraTargetPlayerId = pri.playerId;
        const priHpBefore = pri.hp;
        for (let i = 0; i < band.extras; i += 1) {
          const kind = (i === 0 && telegraphed) ? telegraphed : (alertExtraKind(pView) || "pursuit");
          alert.kind = kind;
          alert.count += 1;
          executeAlertExtra(pView, kind, mainIntent, log, result);
          if (pri.hp <= 0 || root.enemy.dead) break;
        }
        damageByPlayer[pri.playerId] = (damageByPlayer[pri.playerId] || 0) + Math.max(0, priHpBefore - pri.hp);
      } else if (telegraphed) {
        alert.cancelled = true;
        log.push("追加行動 取消 (ノイズ低下)");
      }
    }
    result.damageByPlayer = damageByPlayer;
    result.alert = alert;
    if (hasPlayers) root.targetPlayerId = null;
    return result;
  }


  // 単位2-2: インテント予告は対象プレイヤーを含めて返す（targetPlayerId＝主行動の対象、
  // priorityPlayerId／extraTargetPlayerId＝追加行動の対象＝排除優先度の素体）。
  // 対象は一度選んだら state.targetPlayerId に保持し、敵フェイズで消費されるまで変わらない。
  // 追加行動の予告（extra）は排除優先度の素体の帯域から組み、その素体に alertTelegraphed を記録する。
  function intentView(state, ref) {
    const root = rootOf(state);
    const hasPlayers = !!(root && Array.isArray(root.players) && root.players.length > 0);
    const clearTele = () => {
      if (hasPlayers) { for (const p of root.players) p.alertTelegraphed = null; }
      else if (root) root.alertTelegraphed = null;
    };
    if (root.enemy.dead) {
      clearTele();
      return { label: "無力", action: "", extra: null, targetPlayerId: null, priorityPlayerId: null, extraTargetPlayerId: null };
    }
    if ((root.enemy.cancelNextIntent || 0) > 0) {
      // 行動キャンセル予約中は予告自体を潰れたものとして出す（enemyTurn の消費順＝キャンセル→スタンに合わせ、スタン分岐より前で判定）
      clearTele();
      return { label: "CANCELLED", action: "cancelled", extra: null, targetPlayerId: root.targetPlayerId || null, priorityPlayerId: null, extraTargetPlayerId: null };
    }
    const intent = currentIntent(root.enemy);
    if (!root.enemy.immuneToStun && (root.enemy.stun || 0) >= (root.enemy.stunMax || 3)) {
      // PROMPT-25: スタン（行動不能）のインテント表記は英字タグ STUNNED に統一する
      clearTele();
      return { label: "STUNNED", action: "stunned", extra: null, targetPlayerId: root.targetPlayerId || null, priorityPlayerId: null, extraTargetPlayerId: null };
    }
    // 主行動の対象（明示指定があればその素体、無ければ予告済み／ランダムで選んで保持する）
    const main = hasPlayers
      ? ((typeof ref !== "undefined" && ref !== null) ? resolvePlayer(root, ref) : selectTargetPlayer(root))
      : null;
    if (hasPlayers && main) root.targetPlayerId = main.playerId;
    const mView = hasPlayers && main ? scopeFor(root, main) : root;
    // v15.0: 表示値は対象素体の警報バフ＋照準を合算。警戒中は追加行動も予告する
    // 正式版フェーズ1（A-2）: 警報バフは対象素体の現在の帯域から導出する
    syncAlertBuff(mView);
    // P-N3／P-N4: 敵側の累積バフ（enrage）と照準予約（charge）も実効値へ同枠で含める
    // （予告＝実施の一致。S-6）。攻撃系インテントのときだけ下の shown へ反映される。
    const buff = ((main ? main.alertBuff : root.alertBuff) || 0) + ((main ? main.alertAim : root.alertAim) || 0)
      + ((root.enemy.atkBuff || 0) + (root.enemy.chargeBonus || 0));
    // スクラップ・ノイズのチャージがある間は、予告も半減後の実効値で出す（表示専用・消費しない）
    let shown = intent;
    if (isAttackIntent(intent)) {
      const rawValue = (intent.value || 0) + buff;
      const shownValue = scrapHalvedValue(mView, intent, rawValue);
      if (shownValue !== (intent.value || 0)) shown = { ...intent, value: shownValue };
    }
    const label = intentText(shown);
    // 追加行動の予告は排除優先度（帯域が最も高い素体）について組み、その素体へ記録する
    const pri = hasPlayers ? priorityPlayer(root, false) : null;
    const pView = pri ? scopeFor(root, pri) : null;
    if (pView) syncAlertBuff(pView);
    const kind = pView ? alertExtraKind(pView) : (hasPlayers ? null : alertExtraKind(root));
    clearTele();
    if (pri) pri.alertTelegraphed = kind;
    else if (!hasPlayers) root.alertTelegraphed = kind;
    // 第2陣 2D (RB-5): 予告の回数は判定帯域（judgedBand）で数える（消費者 #2）。
    // 予告そのものの有無（kind＝消費者 #4）は生値のままなので、判定で回数が 0 になる
    // 場合は予告表示を出さず、記録した alertTelegraphed が敵フェイズで「取消」として
    // 解決される（RB-5 未所持時は kind があれば必ず extras ≥ 1 で、従来と完全一致）。
    const band = pri ? judgedBand(root, pri.noise) : judgedBand(root, hasPlayers ? 0 : (root.noise || 0));
    const extra = kind && band.extras > 0
      ? { kind, count: band.extras, label: band.extras > 1 ? `${ALERT_EXTRA_LABEL[kind]} ×${band.extras}` : ALERT_EXTRA_LABEL[kind], targetPlayerId: pri ? pri.playerId : null }
      : null;
    // PROMPT-25: ラベルが STUNNED のインテント（チュートリアルの強制インテント等）も同じタグ表示にする
    return {
      label,
      action: label === "STUNNED" ? "stunned" : (intent.action || ""),
      extra,
      targetPlayerId: main ? main.playerId : null,
      priorityPlayerId: pri ? pri.playerId : null,
      extraTargetPlayerId: pri ? pri.playerId : null,
    };
  }

  function intentLabel(state, ref) {
    return intentView(state, ref).label;
  }


  // ==== 単位2-2: endTurn の「全員 ready で敵フェイズ」構造 ====
  // マルチ（players.length > 1）では、endTurn(state, rng, playerRef) はそのプレイヤーの
  // 終了宣言（ready）を記録するだけでは敵フェイズに入らず、全ての生存プレイヤーが
  // ready になった時点で初めて、ターン終了時処理（プレイヤーごと）→敵フェイズ1回→
  // 次ターン開始（生存プレイヤーごと）を一括解決する。未 ready の間は
  // { allReady:false, readyCount, aliveCount, enemy:null } を返す。
  // players.length === 1（ソロ）では宣言と同時に全員 ready となり、従来と同一の
  // 順序・ログ・戻り値で即時解決する（不変条件）。
  // 各プレイヤーのターン終了時処理（従来 endTurn の冒頭部。対象プレイヤーのスコープで実行）
  function applyPlayerEndProcessing(view, log) {
    // 選択保留（search／discard／reposition）はターン終了で消散する
    view.pendingPick = null;
    // 『臨界排熱』（REACTOR固有OS）: 始動中はターン終了時に purgeCount 分のスリップダメージを
    // 受ける（コスト扱い＝BLK・軽減の対象外。0以下で敗北＝自滅あり）。
    // ヒートシンク（power kind "slip_halve"）がある場合は半減（切り上げ）
    if (view.characterId === "vessel00" && view.purgeActive && (view.purgeCount || 0) > 0 && view.player.hp > 0) {
      let slip = view.purgeCount || 0;
      const halved = (view.powers || []).some((power) => power.kind === "slip_halve");
      if (halved) slip = Math.ceil(slip / 2);
      view.player.hp = Math.max(0, view.player.hp - slip);
      // 第2陣 2E (RB-6／R-17): スリップによる自滅でも予備心臓ポンプは発動する。
      trySparePump(view, log);
      log.push(`臨界排熱 スリップ ${slip}  HP ${view.player.hp}`);
      if (view.player.hp === 0) log.push("VESSEL DOWN (焼死)");
    }
    // 『余剰電力装甲』（WEAVER固有OS）: ターン終了時点で残っているPWR × standbyArmor を
    // BLK に加算してから敵フェイズに入る（加算分はそのまま敵フェイズの攻撃を受ける。
    // 残ったBLKの失効は従来どおり次の自ターン開始時）
    const endCharDef = characterDef(view.characterId);
    if (endCharDef.standbyArmor && (view.player.energy || 0) > 0) {
      // プリミティブ #19 standby_armor_up（WEAVER W-08「塹壕モード」用の基盤）:
      // 変換率は機体固有値＋持続パワーの加算分
      const armorUp = (view.powers || [])
        .filter((power) => power.kind === "standby_armor_up")
        .reduce((sum, power) => sum + (power.value || 0), 0);
      const armorGain = view.player.energy * (endCharDef.standbyArmor + armorUp);
      view.player.block = (view.player.block || 0) + armorGain;
      log.push(`待機防護 +${armorGain}`);
    }
    // 第2陣 2F (RB-7): レリックのターン終了時効果（end_of_turn）を、余剰電力装甲と
    // 同じ処理内で解決する。WEAVER のランではキャラ別除外により RB-7 自体が
    // 提示されないため、固有OS との共存・順序の問題は発生しない（FINAL §2.2 RB-7）。
    for (const line of applyRelics(view, "end_of_turn")) log.push(line);
    // 保持割引は「保持した次のターン」限り。使われなかった分の割引はここで失効する
    view.holdDiscountUid = 0;
    const discarded = discardHand(view);
    log.push(`DISCARD ${discarded.length}`);
    return discarded;
  }

  // 全員 ready 後の 一括解決。ソロ（players.length === 1）では従来 endTurn と同一の
  // 処理順・ログ順になる（終了処理→敵フェイズ→完全露呈リセット→turn+1→自ターン開始）。
  // マルチでは死亡した素体の終了処理・次ターン開始は行わない（戦闘中復帰なし）。
  function resolveFullTurn(root, rng) {
    const log = [];
    const single = root.players.length === 1;
    const perPlayer = {};
    const discardedAll = [];
    const drawnAll = [];
    for (const p of root.players) {
      perPlayer[p.playerId] = { discarded: [], drawn: [] };
      if (!single && (p.hp || 0) <= 0) { p.ready = false; continue; }
      const discarded = applyPlayerEndProcessing(scopeFor(root, p), log);
      discardedAll.push(...discarded);
      perPlayer[p.playerId].discarded = discarded;
    }
    // UI（main.js runEnemyPhase）が敵ログの区間を特定するための開始位置
    const enemyLogStart = log.length;
    const enemy = enemyTurn(root, rng);
    log.push(...enemy.log);
    // 作戦深度 段階1〜（§5.3-2）: エリート戦の敵とボスは、敵フェイズ解決後に蓄積が
    // 1減衰する（下限0）。挿入位置は完全露呈リセットより前（精査・軽微7）。
    // 対象判定は encounter の種別（state.encounterType）とボス印のみで行い、
    // 敵種カタログには依存しない。スタン成立中の解除条件は変えない（蓄積の自然減のみ）。
    {
      const profile = root.depthProfile;
      const foe = root.enemy;
      if (profile && (profile.stunStage || 0) >= 1 && foe && !foe.dead && !foe.immuneToStun
        && (foe.stun || 0) > 0 && (isBossEnemy(foe) || root.encounterType === "ELITE")) {
        foe.stun = Math.max(0, foe.stun - 1);
        log.push(`STUN DECAY ${foe.stun + 1} > ${foe.stun}`);
      }
    }
    // 正式版フェーズ1（A-2）: 完全露呈の天井リセット。ノイズ10の敵フェイズは LOCKDOWN 相当で
    // 解決し（noiseBand／enemyTurn 側）、フェイズ終了時にその素体の NOISE を 5 へ落とす
    let exposedReset = false;
    for (const p of root.players) {
      if ((p.noise || 0) >= NOISE_MAX) {
        // 第2陣 2D: リセット自体は生値の上限機構（消費者 #5。判定しない）。
        // リセット後の alertBuff 再算出だけは syncAlertBuff と同じ判定帯域で行う。
        p.noise = 5;
        p.alertBuff = judgedBand(root, p.noise).atk;
        exposedReset = true;
        log.push(single
          ? "完全露呈 - 警報リセット  NOISE 5 (熱が残っている)"
          : `完全露呈 - 警報リセット  NOISE 5 (熱が残っている) [${p.playerId}]`);
      }
    }
    root.turn += 1;
    for (const p of root.players) {
      if (!single && (p.hp || 0) <= 0) { p.ready = false; continue; }
      const started = beginPlayerTurn(root, rng, p);
      log.push(...started.log);
      drawnAll.push(...started.drawn);
      perPlayer[p.playerId].drawn = started.drawn;
    }
    const partyDown = isPartyDown(root);
    return { log, discarded: discardedAll, drawn: drawnAll, enemy, exposedReset, enemyLogStart, allReady: true, perPlayer, defeat: partyDown, partyDown };
  }

  function endTurn(state, rng, ref) {
    const root = rootOf(state);
    if (!root || !Array.isArray(root.players) || root.players.length === 0) {
      return { ok: false, allReady: false, log: [], discarded: [], drawn: [], enemy: null, exposedReset: false, enemyLogStart: 0 };
    }
    if (root.players.length === 1) {
      root.players[0].ready = true;
      return resolveFullTurn(root, rng);
    }
    const declarer = resolvePlayer(state, ref) || root.players[0];
    if ((declarer.hp || 0) > 0) {
      // 宣言したプレイヤーの選択保留はその時点で消散する（従来の endTurn 冒頭処理に相当）
      declarer.pendingPick = null;
      declarer.ready = true;
    }
    const alive = alivePlayers(root);
    if (alive.length === 0) {
      return {
        ok: true, allReady: true, defeat: true, partyDown: true,
        log: ["ALL VESSELS DOWN"], discarded: [], drawn: [],
        enemy: { log: [], outcome: "party_down", damage: 0, call: "", action: null, targetPlayerId: null, alert: { telegraphed: null, kind: null, cancelled: false, count: 0, band: "calm", targetPlayerId: null, priorityPlayerId: null, extraTargetPlayerId: null } },
        exposedReset: false, enemyLogStart: 0, perPlayer: {},
      };
    }
    if (!alive.every((p) => p.ready)) {
      return {
        ok: true, ready: true, allReady: false, playerId: declarer.playerId,
        readyCount: alive.filter((p) => p.ready).length, aliveCount: alive.length,
        log: [], discarded: [], drawn: [], enemy: null, exposedReset: false, enemyLogStart: 0,
      };
    }
    return resolveFullTurn(root, rng);
  }


  function pileCount(state, ref) {
    state = scopeFor(state, resolvePlayer(state, ref));
    return state.drawPile.length + state.hand.length + state.discard.length + (state.exhaust ? state.exhaust.length : 0) + (state.retained ? 1 : 0) + (state.traps ? state.traps.length : 0);
  }

  root.Battle = {
    DECK,
    GOLIATH_DECK,
    GHOST_TAPE_DECK,
    WEAVER_DECK,
    REACTOR_DECK,
    TRAP_LIMIT,
    isTrapCard,
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
    serializeState,
    hydrateState,
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
    // 単位2-2: マルチプレイ用 API（対象プレイヤーの解決／生存・ready・帯域の参照）
    resolvePlayer,
    alivePlayers,
    isPartyDown,
    isAllReady,
    priorityPlayer,
    alertInfoFor,
    selectTargetPlayer,
    declareEndTurn: endTurn,
    // 単位2-4: 人数スケーリングの下地（倍率表と参照ヘルパー。適用の ON は段階(4)）
    PARTY_SCALING,
    partyScalingFor,
    isBossEnemy,
    // 作戦深度（DESIGN-DEPTH-SYSTEM-FINAL §3）: パラメータ表とプロファイル解決
    DEPTH_TABLE,
    depthProfileFor,
    applyDepthToEnemy,
  };
})(typeof window !== "undefined" ? window : globalThis);
