/* Illegal parts. A relic on the run fires its trigger for the whole run.
   The catalog is the loaded parts list. Ownership is a list of ids. */

(function (root) {
  const CATALOG = Object.freeze([
    { id: "relic_optical_camo", name: "旧世代の光学迷彩", trigger: "start_of_combat", effects: [{ type: "add_block", value: 8 }] },
    { id: "relic_overdose_injector", name: "オーバードーズ・インジェクター", trigger: "start_of_turn", effects: [{ type: "add_energy", value: 1 }, { type: "add_card_to_discard", card_id: "curse_flashback", value: 1 }] },
    { id: "relic_hydraulic_actuator", name: "油圧式関節アクチュエータ", trigger: "on_apply_stun", effects: [{ type: "increase_stun", value: 1 }] },
    { id: "relic_analog_wiretap", name: "アナログ盗聴装置", trigger: "on_map_generation", effects: [{ type: "add_scan_uses", value: 1 }] },
  ].map((relic) => Object.freeze({
    ...relic,
    effects: Object.freeze(relic.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const CURSE_NOISE = root.Cards.get("curse_flashback");

  const byId = new Map(CATALOG.map((relic) => [relic.id, relic]));
  const CHIP = Object.freeze({
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
    return CATALOG.map((relic) => relic.id);
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
        state.player.energy += effect.value;
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
    eachEffect,
    stunBonus,
    applyBattle,
  };
})(typeof window !== "undefined" ? window : globalThis);
