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
    // カードプール大拡充バッチB: 共通プール +30種（DESIGN-POOL-EXPANSION2-DRAFT.md §1）。26種 → 56種。
    // レアリティは設計書の推奨（C/U/R）を下の rarity 判定リストへ反映した。
    root.Cards.get("tape_measure"),
    root.Cards.get("patch_cable"),
    root.Cards.get("manual_crank"),
    root.Cards.get("grease_shot"),
    root.Cards.get("sandbag_wall"),
    root.Cards.get("smoke_foil"),
    root.Cards.get("aim_high"),
    root.Cards.get("hip_shot"),
    root.Cards.get("ricochet"),
    root.Cards.get("burst_three"),
    root.Cards.get("bayonet_rush"),
    root.Cards.get("elbow_smash"),
    root.Cards.get("trip_wire_kick"),
    root.Cards.get("false_order"),
    root.Cards.get("signal_mirror"),
    root.Cards.get("overload_tap"),
    root.Cards.get("echo_battery"),
    root.Cards.get("spare_gear"),
    root.Cards.get("salvage_arm"),
    root.Cards.get("deep_sort"),
    root.Cards.get("foil_toss"),
    root.Cards.get("last_foil"),
    root.Cards.get("field_repair"),
    root.Cards.get("coolant_rain"),
    root.Cards.get("brace_impact"),
    root.Cards.get("decoy_voice"),
    root.Cards.get("adrenal_valve"),
    root.Cards.get("curse_sponge"),
    root.Cards.get("iron_stance"),
    root.Cards.get("grand_punch"),
    { "id": "gun_combat_shotgun", "name": "散弾銃 (SHOTGUN)", "cost": 2, "category": "GUN", "type": "attack", "noise": 2, "requirements": [], "stance_change": "EXPOSE", "effects": [ { "target": "enemy", "type": "damage", "value": 16 } ] },
    { "id": "hack_overload", "name": "神経系オーバーロード (HACK)", "cost": 0, "category": "DIGITAL", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "enemy", "type": "stun", "value": 2 }, { "target": "player", "type": "add_card_to_discard", "card_id": "curse_flashback", "value": 1 } ] },
    { "id": "tactic_adrenaline", "name": "アドレナリン注射 (INJECT)", "cost": 0, "category": "TACTIC", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "player", "type": "add_energy", "value": 2 }, { "target": "player", "type": "damage", "value": 3 } ] },
  ].map((card) => Object.freeze({
    ...card,
    rarity: ["gun_combat_shotgun", "hack_overload", "full_burst", "acoustic_flare", "forced_cooling", "jamming_flare",
      // バッチB追加分のレア（DESIGN-POOL-EXPANSION2-DRAFT.md §1 の推奨 R）
      "burst_three", "false_order", "echo_battery", "spare_gear", "grand_punch"].includes(card.id) ? "rare"
      : (["tactic_adrenaline", "wired_jack", "illegal_overclock", "pile_bunker", "serial_punch", "decoy_foil",
        // バッチB追加分のアンコモン（同書の推奨 U）
        "manual_crank", "smoke_foil", "aim_high", "ricochet", "trip_wire_kick", "salvage_arm", "deep_sort",
        "last_foil", "field_repair", "curse_sponge", "iron_stance"].includes(card.id) ? "uncommon" : "common"),
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
    // カードプール大拡充バッチB: GOLIATH 専用 +12種（DESIGN-POOL-EXPANSION2-DRAFT.md §3）。6種 → 18種。
    root.Cards.get("goliath_rush_hour"),
    root.Cards.get("goliath_earthquake"),
    root.Cards.get("goliath_bulkhead"),
    root.Cards.get("goliath_scrap_wall"),
    root.Cards.get("goliath_heavy_breath"),
    root.Cards.get("goliath_ram"),
    root.Cards.get("goliath_aftershock"),
    root.Cards.get("goliath_pressure_cooker"),
    root.Cards.get("goliath_demolition"),
    root.Cards.get("goliath_overload_smash"),
    root.Cards.get("goliath_anchor"),
    root.Cards.get("goliath_final_purge"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["goliath_steel_press", "goliath_purge_punish",
      // バッチB追加分のレア（同書 §3 の推奨 R）
      "goliath_earthquake", "goliath_pressure_cooker", "goliath_final_purge"].includes(card.id) ? "rare"
      : (["goliath_overdrive", "goliath_blowback",
        // バッチB追加分のアンコモン（同書 §3 の推奨 U）
        "goliath_scrap_wall", "goliath_demolition", "goliath_overload_smash", "goliath_anchor"].includes(card.id) ? "uncommon" : "common"),
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
    // カードプール大拡充バッチC: GHOST-TAPE 専用 +12種（DESIGN-POOL-EXPANSION2-DRAFT.md §4）。6種 → 18種。
    root.Cards.get("ghost_hold_echo"),
    root.Cards.get("ghost_deep_reverse"),
    root.Cards.get("ghost_negative_wave"),
    root.Cards.get("ghost_static_burst"),
    root.Cards.get("ghost_loop_play"),
    root.Cards.get("ghost_whisper_net"),
    root.Cards.get("ghost_tape_armor"),
    root.Cards.get("ghost_silence_field"),
    root.Cards.get("ghost_rewind_strike"),
    root.Cards.get("ghost_phantom_choir"),
    root.Cards.get("ghost_erase_head"),
    root.Cards.get("ghost_zero_point"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["ghost_phase_invert", "ghost_silence_end",
      // バッチC追加分のレア（同書 §4 の推奨 R）
      "ghost_silence_field", "ghost_zero_point"].includes(card.id) ? "rare"
      : (["ghost_scrap_noise", "ghost_reel_recycle", "ghost_phantom_tape",
        // バッチC追加分のアンコモン（同書 §4 の推奨 U）
        "ghost_hold_echo", "ghost_negative_wave", "ghost_static_burst",
        "ghost_loop_play", "ghost_whisper_net", "ghost_phantom_choir"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // VESSEL 13 "WEAVER" 専用プール（実装追補 DESIGN-WEAVER-IMPL-ADDENDUM.md §4 の叩き台6種、2026-11-16 本人一括GO）。
  // 戦闘報酬でのみ共通プールへ混ぜる（イベント報酬は共通のみ）。レアリティはあやね叩き台。
  const WEAVER_POOL = Object.freeze([
    root.Cards.get("weaver_double_wire"),
    root.Cards.get("weaver_echo_mine"),
    root.Cards.get("weaver_glue_wire"),
    root.Cards.get("weaver_leg_lock"),
    root.Cards.get("weaver_reposition"),
    root.Cards.get("weaver_full_detonation"),
    // カードプール大拡充バッチC: WEAVER 専用 +12種（DESIGN-POOL-EXPANSION2-DRAFT.md §5）。6種 → 18種。
    root.Cards.get("weaver_trip_alarm"),
    root.Cards.get("weaver_spark_trap"),
    root.Cards.get("weaver_heavy_echo_mine"),
    root.Cards.get("weaver_decoy_mine"),
    root.Cards.get("weaver_silent_wire"),
    root.Cards.get("weaver_net_launcher"),
    root.Cards.get("weaver_spare_parts"),
    root.Cards.get("weaver_bunker_mode"),
    root.Cards.get("weaver_leg_brace"),
    root.Cards.get("weaver_overwatch"),
    root.Cards.get("weaver_final_web"),
    root.Cards.get("weaver_patient_hunter"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["weaver_full_detonation",
      // バッチC追加分のレア（同書 §5 の推奨 R）
      "weaver_bunker_mode", "weaver_final_web"].includes(card.id) ? "rare"
      : (["weaver_double_wire", "weaver_echo_mine",
        // バッチC追加分のアンコモン（同書 §5 の推奨 U）
        "weaver_heavy_echo_mine", "weaver_decoy_mine", "weaver_spare_parts",
        "weaver_leg_brace", "weaver_overwatch"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // VESSEL 07 専用プール（カードプール大拡充バッチCで新設、DESIGN-POOL-EXPANSION2-DRAFT.md §2）。
  // 07 のランでのみ共通プールへ混ぜる（戦闘報酬の offer 経由。イベント報酬は events.js が
  // Rewards.POOL を直接参照する従来仕様のまま＝共通のみで、ここには影響しない）。
  const VESSEL07_POOL = Object.freeze([
    root.Cards.get("v07_form_strike"),
    root.Cards.get("v07_form_guard"),
    root.Cards.get("v07_breath_control"),
    root.Cards.get("v07_chain_kick"),
    root.Cards.get("v07_feint"),
    root.Cards.get("v07_pursuit"),
    root.Cards.get("v07_execution"),
    root.Cards.get("v07_counter_stance"),
    root.Cards.get("v07_shadow_step"),
    root.Cards.get("v07_field_manual"),
    root.Cards.get("v07_silent_kill"),
    root.Cards.get("v07_mastery"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["v07_execution", "v07_mastery"].includes(card.id) ? "rare"
      : (["v07_chain_kick", "v07_feint", "v07_pursuit", "v07_counter_stance",
        "v07_field_manual", "v07_silent_kill"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // VESSEL 00 "REACTOR" 専用プール（DESIGN-POOL-EXPANSION2-DRAFT.md §6 の18種、機体実装と同時に配線）。
  // 戦闘報酬でのみ共通プールへ混ぜる（イベント報酬は共通のみ）。レアリティは同書 §6 の推奨どおり。
  const REACTOR_POOL = Object.freeze([
    root.Cards.get("reactor_heat_claw"),
    root.Cards.get("reactor_slag_armor"),
    root.Cards.get("reactor_vent_blast"),
    root.Cards.get("reactor_coolant_flush"),
    root.Cards.get("reactor_chain_reaction"),
    root.Cards.get("reactor_meltdown_rush"),
    root.Cards.get("reactor_ember_regen"),
    root.Cards.get("reactor_pressure_valve"),
    root.Cards.get("reactor_overheat_strike"),
    root.Cards.get("reactor_core_surge"),
    root.Cards.get("reactor_radiant_nova"),
    root.Cards.get("reactor_ash_guard"),
    root.Cards.get("reactor_heat_sink"),
    root.Cards.get("reactor_burn_out"),
    root.Cards.get("reactor_quick_melt"),
    root.Cards.get("reactor_second_heart"),
    root.Cards.get("reactor_grave_heat"),
    root.Cards.get("reactor_last_light"),
  ].filter(Boolean).map((card) => Object.freeze({
    ...card,
    rarity: ["reactor_radiant_nova", "reactor_heat_sink", "reactor_burn_out", "reactor_second_heart"].includes(card.id) ? "rare"
      : (["reactor_vent_blast", "reactor_coolant_flush", "reactor_ember_regen",
        "reactor_core_surge", "reactor_grave_heat", "reactor_last_light"].includes(card.id) ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const byId = new Map();
  for (const card of POOL) byId.set(card.id, card);
  for (const card of GOLIATH_POOL) byId.set(card.id, card);
  for (const card of GHOST_TAPE_POOL) byId.set(card.id, card);
  for (const card of WEAVER_POOL) byId.set(card.id, card);
  for (const card of VESSEL07_POOL) byId.set(card.id, card);
  for (const card of REACTOR_POOL) byId.set(card.id, card);

  function card(id) {
    return byId.get(id) || null;
  }

  // 第3引数はキャラID（"vessel07" / "vessel04" / "vessel09" / "vessel13" / "vessel00"）。
  // 旧来の真偽値（true = GOLIATH）も互換で受ける。
  function offer(count, rng, character) {
    const random = typeof rng === "function" ? rng : Math.random;
    const n = count == null ? OFFER_COUNT : Math.max(0, count | 0);
    const characterId = character === true ? "vessel04" : character;
    let copy = POOL.slice();
    if (characterId === "vessel07") copy = copy.concat(VESSEL07_POOL);
    if (characterId === "vessel04") copy = copy.concat(GOLIATH_POOL);
    if (characterId === "vessel09") copy = copy.concat(GHOST_TAPE_POOL);
    if (characterId === "vessel13") copy = copy.concat(WEAVER_POOL);
    if (characterId === "vessel00") copy = copy.concat(REACTOR_POOL);
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
    WEAVER_POOL,
    VESSEL07_POOL,
    REACTOR_POOL,
    OFFER_COUNT,
    card,
    offer,
    grant,
  };
})(typeof window !== "undefined" ? window : globalThis);
