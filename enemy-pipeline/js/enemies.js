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
    max_stun: 3,
    immune_to_stun: false,
    intent_pattern: Object.freeze([
      Object.freeze({ action: "buff", name: "警戒態勢", value: 12 }),
      Object.freeze({ action: "attack", name: "制圧射撃", value: 10 }),
      Object.freeze({ action: "heavy_attack", name: "グレネード", value: 16 }),
      Object.freeze({ action: "attack", name: "ガトリング", value: 5, hits: 2 }),
    ]),
  });

  const SHORT = Object.freeze({
    enemy_cyborg_elite: "重装兵",
    enemy_defense_mech: "センチネル",
    enemy_rival_vessel: "ゴースト",
    enemy_sentry: "哨戒兵",
    enemy_gatekeeper: "GATEKEEPER",
  });

  const ELITE_IDS = Object.freeze(CATALOG.map((enemy) => enemy.id));
  const byId = new Map([SENTRY, GATEKEEPER, ...CATALOG].map((enemy) => [enemy.id, enemy]));

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
    return intent.name;
  }

  function make(id) {
    const src = get(id);
    if (!src) return null;
    return {
      id: src.id,
      name: src.name,
      image: src.image || "",
      short: SHORT[src.id] || src.name,
      hp: src.max_hp,
      hpMax: src.max_hp,
      stun: 0,
      stunMax: src.max_stun,
      immuneToStun: src.immune_to_stun === true,
      vulnerable: 0,
      cancelNextIntent: 0,
      dead: false,
      block: 0,
      patternIndex: 0,
      pattern: src.intent_pattern.map((step) => ({
        action: step.action,
        name: step.name,
        value: step.value,
        hits: step.hits || 1,
      })),
    };
  }

  root.Enemies = {
    CATALOG,
    ELITE_IDS,
    get,
    make,
    label,
    short: (id) => SHORT[id] || "",
  };
})(typeof window !== "undefined" ? window : globalThis);
