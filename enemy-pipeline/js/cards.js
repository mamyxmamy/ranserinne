/* Pandora's card catalog. The array is the loaded JSON.
   A curse with cost below zero, or an unplayable effect, cannot be read. */

(function (root) {
  const RAW = [
    {
      "id": "strike_cqc", "name": "CQC打撃 (STRIKE)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": "COVER",
      "flavor": "「デジタルは平気で嘘を吐くが、顎を砕く物理法則（質量）は決して裏切らない。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 6 } ]
    },
    {
      "id": "defend_cover", "name": "潜伏 (COVER)", "cost": 1, "category": "TACTIC", "type": "skill", "noise": 0, "stance_change": "COVER",
      "flavor": "「『聖歌隊』は互いの死角を完璧に補い合った。だが今は、この冷たいコンクリートの壁だけが相棒だ。」",
      "effects": [ { "target": "player", "type": "block", "value": 5 } ]
    },
    {
      "id": "gun_suppressed_pistol", "name": "サプレッサー拳銃", "cost": 1, "category": "GUN", "type": "attack", "noise": 2, "stance_change": "EXPOSE",
      "flavor": "「奴らのAI演算速度がなんだ。処理落ちするまで鉛玉をブチ込んでやる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 8 } ]
    },
    {
      "id": "curse_flashback", "name": "【ノイズ】フラッシュバック", "cost": -1, "category": "CURSE", "type": "curse", "noise": 0, "stance_change": null,
      "flavor": "「……タイチョウ、ニゲ……テ……」",
      "effects": [ { "target": "player", "type": "unplayable" } ]
    },
  ];

  function normalize(raw) {
    const effects = (raw.effects || []).map((effect) => Object.freeze({ ...effect }));
    const unplayable = raw.type === "curse"
      || raw.cost < 0
      || effects.some((effect) => effect.type === "unplayable");
    return Object.freeze({
      id: raw.id,
      name: raw.name,
      cost: raw.cost,
      category: raw.category,
      type: raw.type,
      noise: raw.noise,
      stance_change: raw.stance_change,
      flavor: raw.flavor || "",
      requirements: Object.freeze([]),
      effects: Object.freeze(effects),
      unplayable,
    });
  }

  const all = Object.freeze(RAW.map(normalize));
  const byId = new Map(all.map((card) => [card.id, card]));

  root.Cards = {
    all,
    get: (id) => byId.get(id) || null,
  };
})(typeof window !== "undefined" ? window : globalThis);
