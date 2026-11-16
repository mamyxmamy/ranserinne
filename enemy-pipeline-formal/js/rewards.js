/* Salvage cards. The pool JSON is the reward list.
   A victory offers three distinct cards. The chosen id is appended
   to the run deck and can be offered again on a later win. */

(function (root) {
  const OFFER_COUNT = 3;

  const POOL = Object.freeze([
    root.Cards.get("gun_suppressed_pistol"),
    root.Cards.get("wired_jack"),
    root.Cards.get("illegal_overclock"),
    root.Cards.get("full_burst"),
    root.Cards.get("forced_cooling"),
    root.Cards.get("acoustic_flare"),
    root.Cards.get("pile_bunker"),
    root.Cards.get("close_combat"),
    root.Cards.get("jamming_flare"),
    root.Cards.get("noise_canceller"),
    root.Cards.get("decoy_foil"),
    root.Cards.get("serial_punch"),
    root.Cards.get("tactical_wait"),
    // 共通プール拡張10種（DESIGN-COMMON-POOL-EXPANSION-DRAFT.md）。全機体共通。
    // 出現率は当面は既存カードと同率（レアリティは既定の common のまま、重み付けなし）。
    root.Cards.get("echo_search"),
    root.Cards.get("foil_sort"),
    root.Cards.get("dense_punch"),
    root.Cards.get("staged_vent"),
    root.Cards.get("aim_jam"),
    root.Cards.get("shadow_strike"),
    root.Cards.get("iron_door"),
    root.Cards.get("reserve_cell"),
    root.Cards.get("double_tap"),
    root.Cards.get("silent_service"),
    { "id": "gun_combat_shotgun", "name": "散弾銃 (SHOTGUN)", "cost": 2, "category": "GUN", "type": "attack", "noise": 2, "requirements": [], "stance_change": "EXPOSE", "effects": [ { "target": "enemy", "type": "damage", "value": 16 } ] },
    { "id": "hack_overload", "name": "神経系オーバーロード (HACK)", "cost": 0, "category": "DIGITAL", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "enemy", "type": "stun", "value": 2 }, { "target": "player", "type": "add_card_to_discard", "card_id": "curse_flashback", "value": 1 } ] },
    { "id": "tactic_adrenaline", "name": "アドレナリン注射 (INJECT)", "cost": 0, "category": "TACTIC", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "player", "type": "add_energy", "value": 2 }, { "target": "player", "type": "damage", "value": 3 } ] },
  ].map((card) => Object.freeze({
    ...card,
    rarity: ["gun_combat_shotgun", "hack_overload", "full_burst", "acoustic_flare", "forced_cooling", "jamming_flare"].includes(card.id) ? "rare"
      : (["tactic_adrenaline", "wired_jack", "illegal_overclock", "pile_bunker", "serial_punch", "decoy_foil"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // 正式版フェーズ1: VESSEL 04 "GOLIATH" 専用プール（設計書 §A）。
  // GOLIATH のランでは共通プール＋専用プールから提示し、07 のランは従来プールのみ。
  const GOLIATH_POOL = Object.freeze([
    root.Cards.get("goliath_overdrive"),
    root.Cards.get("goliath_steel_press"),
    root.Cards.get("goliath_rock_pile"),
    root.Cards.get("goliath_blowback"),
    root.Cards.get("goliath_heavy_tread"),
    root.Cards.get("goliath_purge_punish"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["goliath_steel_press", "goliath_purge_punish"].includes(card.id) ? "rare"
      : (["goliath_overdrive", "goliath_blowback"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // VESSEL 09 "GHOST-TAPE" 専用プール（設計書 DESIGN-GHOST-TAPE-DRAFT.md §3、2026-11-16 全決定）。
  // 戦闘報酬でのみ共通プールへ混ぜる（イベント報酬は共通のみ）。レアリティは同書の叩き台どおり。
  const GHOST_TAPE_POOL = Object.freeze([
    root.Cards.get("ghost_phase_invert"),
    root.Cards.get("ghost_scrap_noise"),
    root.Cards.get("ghost_fade_out"),
    root.Cards.get("ghost_reel_recycle"),
    root.Cards.get("ghost_phantom_tape"),
    root.Cards.get("ghost_silence_end"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["ghost_phase_invert", "ghost_silence_end"].includes(card.id) ? "rare"
      : (["ghost_scrap_noise", "ghost_reel_recycle", "ghost_phantom_tape"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const byId = new Map();
  for (const card of POOL) byId.set(card.id, card);
  for (const card of GOLIATH_POOL) byId.set(card.id, card);
  for (const card of GHOST_TAPE_POOL) byId.set(card.id, card);

  function card(id) {
    return byId.get(id) || null;
  }

  // 第3引数はキャラID（"vessel04" / "vessel09"）。旧来の真偽値（true = GOLIATH）も互換で受ける。
  function offer(count, rng, character) {
    const random = typeof rng === "function" ? rng : Math.random;
    const n = count == null ? OFFER_COUNT : Math.max(0, count | 0);
    const characterId = character === true ? "vessel04" : character;
    let copy = POOL.slice();
    if (characterId === "vessel04") copy = copy.concat(GOLIATH_POOL);
    if (characterId === "vessel09") copy = copy.concat(GHOST_TAPE_POOL);
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  function grant(deck, id) {
    if (!byId.has(id) || !Array.isArray(deck)) return false;
    deck.push(id);
    return true;
  }

  root.Rewards = {
    POOL,
    GOLIATH_POOL,
    GHOST_TAPE_POOL,
    OFFER_COUNT,
    card,
    offer,
    grant,
  };
})(typeof window !== "undefined" ? window : globalThis);
