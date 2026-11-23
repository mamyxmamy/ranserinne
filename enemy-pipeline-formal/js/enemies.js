/* Elite profiles. The catalog JSON is the loaded enemy list.
   Short labels and the sentry sit beside it so the file stays verbatim.
   make() copies a pattern. The catalog itself is never mutated. */

(function (root) {
  const CATALOG = Object.freeze([
    { "id": "enemy_cyborg_elite", "name": "重装サイボーグ兵", "image": "assets/cctv_enemy_elite.png", "max_hp": 80, "max_stun": 3, "immune_to_stun": false, "intent_pattern": [ { "action": "buff", "name": "警戒態勢", "value": 10 }, { "action": "attack", "name": "制圧射撃", "value": 8 }, { "action": "heavy_attack", "name": "グレネード", "value": 15 } ] },
    { "id": "enemy_defense_mech", "name": "防衛メック『センチネル』", "image": "assets/cctv_enemy_mech.png", "max_hp": 150, "max_stun": 99, "immune_to_stun": true, "intent_pattern": [ { "action": "debuff", "name": "サーマルスキャン", "value": 0 }, { "action": "attack", "name": "ガトリング", "value": 4, "hits": 3 }, { "action": "wait", "name": "排熱処理", "value": 0 } ] },
    { "id": "enemy_rival_vessel", "name": "鹵獲素体『ゴースト』", "image": "assets/cctv_enemy_ghost.png", "max_hp": 60, "max_stun": 3, "immune_to_stun": false, "intent_pattern": [ { "action": "stealth", "name": "潜伏", "value": 5 }, { "action": "attack_stun", "name": "CQC打撃", "value": 5 }, { "action": "hack", "name": "ジャミング", "value": 0 } ] },
  ].map((enemy) => Object.freeze({
    ...enemy,
    intent_pattern: Object.freeze(enemy.intent_pattern.map((step) => Object.freeze({ ...step }))),
  })));

  const SENTRY = Object.freeze({
    id: "enemy_sentry",
    name: "サイボーグ哨戒兵",
    image: "assets/cctv_enemy_sentry.png",
    max_hp: 30,
    max_stun: 3,
    immune_to_stun: false,
    intent_pattern: Object.freeze([
      Object.freeze({ action: "attack", name: "射撃", value: 8 }),
    ]),
  });

  const GATEKEEPER = Object.freeze({
    id: "enemy_gatekeeper",
    name: "重装甲サイボーグ『GATEKEEPER』",
    image: "assets/cctv_enemy_gatekeeper.png",
    max_hp: 120,
    max_stun: 5,
    immune_to_stun: false,
    intent_pattern: Object.freeze([
      Object.freeze({ action: "buff", name: "警戒態勢", value: 12 }),
      Object.freeze({ action: "attack", name: "制圧射撃", value: 10 }),
      Object.freeze({ action: "heavy_attack", name: "グレネード", value: 16 }),
      Object.freeze({ action: "attack", name: "ガトリング", value: 5, hits: 2 }),
    ]),
  });

  /* 層ボス本プロファイル（DESIGN-ENEMIES-DRAFT §3.3／DECISIONS E-3・E-8）。
     旧仮プロファイル（GATEKEEPER の複製）は本実装で差し替え済み。
     どちらも P-N5（phase）持ち: HP が最大の 50% 以下になった時点で phases の
     次配列へ切り替わる（遷移仕様は同ドラフト §1.2 S-4。実装は battle.js 側）。
     開示管理（E-8）: ゲーム内表示は不透明化を維持する。行動名は「記録」「検閲」の
     範囲に留め、「組み替え」「素材」の語は出さない。エコーの技名にも「（記録）」は
     付けない（精査推奨 (a)）。 */
  const ARCHIVIST = Object.freeze({
    id: "enemy_archivist",
    name: "記録改竄防衛『アーキビスト』",
    image: "assets/cctv_enemy_archivist.png",
    max_hp: 175,
    max_stun: 5,
    immune_to_stun: false,
    // ノイズ反応: 照準寄り（P-N6 alertBias。作用範囲は battle.js の alertExtraKind 参照）
    alert_bias: "aim",
    phase_names: Object.freeze(["索引", "焼却"]),
    phases: Object.freeze([
      Object.freeze([
        Object.freeze({ action: "debuff", name: "索引走査", value: 0 }),
        Object.freeze({ action: "attack", name: "検閲射撃", value: 10 }),
        Object.freeze({ action: "hack", name: "改竄", value: 0 }),
      ]),
      Object.freeze([
        Object.freeze({ action: "enrage", name: "書庫防衛", value: 2 }),
        Object.freeze({ action: "heavy_attack", name: "焼却", value: 15 }),
        Object.freeze({ action: "attack", name: "連射検閲", value: 8, hits: 2 }),
      ]),
    ]),
  });

  const ECHO = Object.freeze({
    id: "enemy_echo",
    name: "深層番人『エコー』",
    image: "assets/cctv_enemy_echo.png",
    max_hp: 215,
    max_stun: 6,
    immune_to_stun: false,
    // ノイズ反応: 追撃寄り（P-N6 alertBias）
    alert_bias: "pursuit",
    phase_names: Object.freeze(["残響", "反響"]),
    phases: Object.freeze([
      Object.freeze([
        Object.freeze({ action: "stealth", name: "潜伏", value: 10 }),
        Object.freeze({ action: "attack_stun", name: "CQC打撃", value: 8 }),
        Object.freeze({ action: "attack", name: "射撃", value: 11 }),
      ]),
      Object.freeze([
        Object.freeze({ action: "charge", name: "照準", value: 6 }),
        Object.freeze({ action: "heavy_attack", name: "重打撃", value: 17 }),
        Object.freeze({ action: "attack", name: "連射", value: 6, hits: 3 }),
      ]),
    ]),
  });

  const SHORT = Object.freeze({
    enemy_cyborg_elite: "重装兵",
    enemy_defense_mech: "センチネル",
    enemy_rival_vessel: "ゴースト",
    enemy_sentry: "哨戒兵",
    enemy_gatekeeper: "GATEKEEPER",
    enemy_archivist: "アーキビスト",
    enemy_echo: "エコー",
  });

  // 戦闘演出強化 段階1（JOB 1-2／1-5）: ポーズ画（攻撃／被弾）。カタログ本体とは分離して持ち、
  // make() が image_attack／image_hit として配る。未登録の敵は
  // make() 側で待機画（image）へフォールバックする。
  const POSES = Object.freeze({
    enemy_sentry: Object.freeze({ attack: "assets/cctv_enemy_sentry_attack.webp", hit: "assets/cctv_enemy_sentry_hit.webp" }),
    enemy_cyborg_elite: Object.freeze({ attack: "assets/cctv_enemy_elite_attack.webp", hit: "assets/cctv_enemy_elite_hit.webp" }),
    enemy_defense_mech: Object.freeze({ attack: "assets/cctv_enemy_mech_attack.webp", hit: "assets/cctv_enemy_mech_hit.webp" }),
    enemy_rival_vessel: Object.freeze({ attack: "assets/cctv_enemy_ghost_attack.webp", hit: "assets/cctv_enemy_ghost_hit.webp" }),
    enemy_gatekeeper: Object.freeze({ attack: "assets/cctv_enemy_gatekeeper_attack.webp", hit: "assets/cctv_enemy_gatekeeper_hit.webp" }),
    // 層ボス2種（アーキビスト／エコー）はポーズ画が未用意のため未登録。
    // make() 側で待機画へフォールバックする（既存動作）。
  });

  const ELITE_IDS = Object.freeze(CATALOG.map((enemy) => enemy.id));
  const byId = new Map([SENTRY, GATEKEEPER, ARCHIVIST, ECHO, ...CATALOG].map((enemy) => [enemy.id, enemy]));

  function get(id) {
    return byId.get(id) || null;
  }

  function label(intent) {
    if (!intent) return "無力";
    const hits = intent.hits || 1;
    if (intent.action === "attack" || intent.action === "heavy_attack" || intent.action === "attack_stun") {
      return hits > 1 ? `${intent.name} ${intent.value}×${hits}` : `${intent.name} ${intent.value}dmg`;
    }
    if (intent.action === "buff" || intent.action === "stealth") return `${intent.name} +${intent.value}`;
    // P-N3 enrage: 自分の攻撃への累積バフ。P-N4 charge: 次の攻撃への上乗せ予約。
    if (intent.action === "enrage") return `${intent.name} 攻撃+${intent.value}`;
    if (intent.action === "charge") return `${intent.name} 次の攻撃+${intent.value}`;
    return intent.name;
  }

  function copyStep(step) {
    return {
      action: step.action,
      name: step.name,
      value: step.value,
      hits: step.hits || 1,
    };
  }

  function make(id) {
    const src = get(id);
    if (!src) return null;
    const poses = POSES[src.id] || {};
    // P-N5（phase）: phases を持つ敵は pattern を phases[0] と同一配列にし、
    // 遷移時は battle.js が pattern を phases[phaseIndex] へ差し替える。
    const phases = Array.isArray(src.phases)
      ? src.phases.map((pattern) => pattern.map(copyStep))
      : null;
    return {
      id: src.id,
      name: src.name,
      image: src.image || "",
      image_attack: poses.attack || src.image || "",
      image_hit: poses.hit || src.image || "",
      short: SHORT[src.id] || src.name,
      hp: src.max_hp,
      hpMax: src.max_hp,
      stun: 0,
      stunMax: src.max_stun,
      immuneToStun: src.immune_to_stun === true,
      vulnerable: 0,
      cancelNextIntent: 0,
      scrapCharges: 0,
      dead: false,
      block: 0,
      patternIndex: 0,
      pattern: phases ? phases[0] : src.intent_pattern.map(copyStep),
      phases,
      phaseIndex: 0,
      phaseNames: Array.isArray(src.phase_names) ? src.phase_names.slice() : null,
      // P-N3（enrage）の累積バフと P-N4（charge）の予約。どちらも敵個体のステート。
      atkBuff: 0,
      chargeBonus: 0,
      alertBias: src.alert_bias || null,
    };
  }

  root.Enemies = {
    CATALOG,
    POSES,
    ELITE_IDS,
    get,
    make,
    label,
    short: (id) => SHORT[id] || "",
  };
})(typeof window !== "undefined" ? window : globalThis);
