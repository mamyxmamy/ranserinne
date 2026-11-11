/* Illegal parts. A relic on the run fires its trigger for the whole run.
   The catalog is the loaded parts list. Ownership is a list of ids. */

(function (root) {
  const CATALOG = Object.freeze([
    // PROMPT-28: 初期装備はこの1つのみ（VESSEL 07 基礎OS）。残りは道中で拾って空き枠を埋める。
    { id: "relic_vessel07_os", name: "VESSEL 07 基礎OS", description: "時代遅れの素体に組み込まれた標準OS。戦闘開始時、自動的に防護（BLK）を 2 得る。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 2 }] },
    { id: "relic_optical_camo", name: "旧世代の光学迷彩", description: "旧世代の光学迷彩クローク。戦闘開始時、防護（BLK）を 8 得る。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 8 }] },
    { id: "relic_overdose_injector", name: "オーバードーズ・インジェクター", description: "興奮剤の自動注入器。ターン開始時に電力 +1。ただし副作用でフラッシュバック（呪装）が捨て札に混ざる。", trigger: "start_of_turn", effects: [{ type: "add_energy", value: 1 }, { type: "add_card_to_discard", card_id: "curse_flashback", value: 1 }] },
    { id: "relic_hydraulic_actuator", name: "油圧式関節アクチュエータ", description: "関節部の油圧アクチュエータ。スタンを与える効果が +1 される。", trigger: "on_apply_stun", effects: [{ type: "increase_stun", value: 1 }] },
    { id: "relic_analog_wiretap", name: "アナログ盗聴装置", description: "アナログ盗聴装置。マップ生成時、スキャン回数が +1 される。", trigger: "on_map_generation", effects: [{ type: "add_scan_uses", value: 1 }] },
  ].map((relic) => Object.freeze({
    ...relic,
    effects: Object.freeze(relic.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const CURSE_NOISE = root.Cards.get("curse_flashback");

  const byId = new Map(CATALOG.map((relic) => [relic.id, relic]));
  const CHIP = Object.freeze({
    relic_vessel07_os: "基礎OS",
    relic_optical_camo: "光学迷彩",
    relic_overdose_injector: "注入器",
    relic_hydraulic_actuator: "油圧関節",
    relic_analog_wiretap: "盗聴",
  });

  function resolve(ids) {
    const list = [];
    for (const id of ids || []) {
      const relic = byId.get(id);
      if (relic) list.push(relic);
    }
    return list;
  }

  function issued() {
    // PROMPT-28: 初期所持は基礎OSのみ（かつての全件配布＝デバッグ用複数所持は廃止）
    return ["relic_vessel07_os"];
  }

  function grant(ids, id) {
    if (!byId.has(id) || ids.includes(id)) return false;
    ids.push(id);
    return true;
  }

  function card(id) {
    if (id === "curse_flashback" || id === "curse_noise" || id === CURSE_NOISE.id) return CURSE_NOISE;
    return null;
  }

  function chip(id) {
    return CHIP[id] || id;
  }

  function effectText(effect) {
    if (effect.type === "add_block") return `防護 +${effect.value}`;
    if (effect.type === "add_energy") return `電力 +${effect.value}`;
    if (effect.type === "add_card_to_discard") return `捨て札に呪装 ×${effect.value}`;
    if (effect.type === "increase_stun") return `スタン +${effect.value}`;
    if (effect.type === "add_scan_uses") return `スキャン +${effect.value}`;
    return effect.type;
  }

  function summary(id) {
    const relic = byId.get(id);
    if (!relic) return "";
    return `${relic.name} / ${relic.effects.map(effectText).join("、")}`;
  }

  // PROMPT-28: ツールチップ表示用の詳細（名称・説明文・効果サマリ）
  function detail(id) {
    const relic = byId.get(id);
    if (!relic) return null;
    return {
      id: relic.id,
      name: relic.name,
      description: relic.description || "",
      effectsText: relic.effects.map(effectText).join("、"),
    };
  }

  function eachEffect(ids, trigger, visit) {
    for (const relic of resolve(ids)) {
      if (relic.trigger !== trigger) continue;
      for (const effect of relic.effects) visit(relic, effect);
    }
  }

  function stunBonus(state) {
    let extra = 0;
    eachEffect(state && state.relics, "on_apply_stun", (relic, effect) => {
      if (effect.type === "increase_stun") extra += effect.value;
    });
    return extra;
  }

  function applyBattle(state, trigger) {
    const log = [];
    eachEffect(state.relics, trigger, (relic, effect) => {
      if (effect.type === "add_block") {
        state.player.block += effect.value;
        log.push(`PART ${relic.name}  BLOCK +${effect.value}`);
        return;
      }
      if (effect.type === "add_energy") {
        // PROMPT-23: 電力の増加は最大値を超えない
        state.player.energy = Math.min(state.player.energyMax, state.player.energy + effect.value);
        log.push(`PART ${relic.name}  PWR +${effect.value}`);
        return;
      }
      if (effect.type === "add_card_to_discard") {
        const cursed = card(effect.card_id);
        const count = effect.value || 1;
        if (!cursed) return;
        /* 検収修正 (2026-11-10): 毎ターンの呪装追加が無制限だと、長期戦（HP150級）で
           デッキが呪装に埋まって戦闘が終わらなくなる。戦闘内の呪装が上限に達したら追加を止める
           （電力+1の利点は維持）。 */
        const CURSE_CAP = 5;
        const inBattle = [...(state.drawPile || []), ...(state.hand || []), ...(state.discard || [])]
          .filter((c) => c && (c.id === "curse_flashback" || c.id === "curse_noise")).length;
        const room = Math.max(0, CURSE_CAP - inBattle);
        const add = Math.min(count, room);
        for (let i = 0; i < add; i += 1) state.discard.push(cursed);
        if (add > 0) log.push(`PART ${relic.name}  CURSE ${cursed.name}`);
      }
    });
    return log;
  }

  root.Relics = {
    CATALOG,
    CURSE_NOISE,
    issued,
    grant,
    resolve,
    card,
    chip,
    summary,
    detail,
    eachEffect,
    stunBonus,
    applyBattle,
  };
})(typeof window !== "undefined" ? window : globalThis);
