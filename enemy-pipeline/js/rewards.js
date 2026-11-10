/* Salvage cards. The pool JSON is the reward list.
   A victory offers three distinct cards. The chosen id is appended
   to the run deck and can be offered again on a later win. */

(function (root) {
  const OFFER_COUNT = 3;

  const POOL = Object.freeze([
    root.Cards.get("gun_suppressed_pistol"),
    { "id": "gun_combat_shotgun", "name": "散弾銃 (SHOTGUN)", "cost": 2, "category": "GUN", "type": "attack", "noise": 2, "requirements": [], "stance_change": "EXPOSE", "effects": [ { "target": "enemy", "type": "damage", "value": 16 } ] },
    { "id": "hack_overload", "name": "神経系オーバーロード (HACK)", "cost": 0, "category": "DIGITAL", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "enemy", "type": "stun", "value": 2 }, { "target": "player", "type": "add_card_to_discard", "card_id": "curse_flashback", "value": 1 } ] },
    { "id": "tactic_adrenaline", "name": "アドレナリン注射 (INJECT)", "cost": 0, "category": "TACTIC", "type": "skill", "noise": 0, "requirements": [], "stance_change": null, "effects": [ { "target": "player", "type": "add_energy", "value": 2 }, { "target": "player", "type": "damage", "value": 3 } ] },
  ].map((card) => Object.freeze({
    ...card,
    rarity: card.id === "gun_combat_shotgun" || card.id === "hack_overload" ? "rare"
      : (card.id === "tactic_adrenaline" ? "uncommon" : "common"),
    requirements: Object.freeze((card.requirements || []).slice()),
    effects: Object.freeze(card.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  const byId = new Map(POOL.map((card) => [card.id, card]));

  function card(id) {
    return byId.get(id) || null;
  }

  function offer(count, rng) {
    const random = typeof rng === "function" ? rng : Math.random;
    const n = count == null ? OFFER_COUNT : Math.max(0, count | 0);
    const copy = POOL.slice();
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
    OFFER_COUNT,
    card,
    offer,
    grant,
  };
})(typeof window !== "undefined" ? window : globalThis);
