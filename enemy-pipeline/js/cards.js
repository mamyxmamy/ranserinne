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
      "id": "wired_jack", "name": "有線ジャック", "cost": 1, "category": "HAK", "type": "attack", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「敵機の装甲に極太の銅線を直接ねじ込み、微弱な電力を強引に吸い上げる。過負荷で素体のリレー回路が焼け焦げるため、一度きりの荒業だ。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 8 }, { "target": "player", "type": "heal", "value": 5 } ]
    },
    {
      "id": "illegal_overclock", "name": "違法オーバークロック", "cost": 0, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「冷却機構の安全ピンを物理的に引き抜き、体内の歯車を限界突破で強制駆動させる。文字通り、素体の寿命を削り出して得る電力。」",
      "effects": [ { "target": "player", "type": "damage", "value": 3 }, { "target": "player", "type": "add_energy", "value": 3, "overcharge": true } ]
    },
    {
      "id": "full_burst", "name": "フル・バースト", "cost": 3, "category": "CQC", "type": "attack", "noise": 4, "stance_change": null, "isExhaust": true,
      "flavor": "「全電力を油圧ピストンへ一極集中。体内の金属箔（フォイル）ロールを1本丸ごと使い潰すほどの乱れ打ちと引き換えに、致命的な駆動音を撒き散らす。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 30 } ]
    },
    {
      "id": "forced_cooling", "name": "強制冷却", "cost": 1, "category": "DEF", "type": "skill", "noise": 0, "stance_change": "COVER", "isExhaust": true,
      "flavor": "「非常用バルブを解放し、冷却液を全身にぶちまけて熱と駆動音を強制シャットダウンする。液を使い果たすため、作戦中に二度は使えない死に体の隠密。」",
      "effects": [ { "target": "player", "type": "block", "value": 12 }, { "target": "player", "type": "drain_energy", "value": 0 } ]
    },
    {
      "id": "acoustic_flare", "name": "音響フレア", "cost": 2, "category": "TEC", "type": "attack", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「素体に蓄積した爆音の駆動ノイズを、アナログ指向性スピーカーから衝撃波として撃ち出す。スピーカーの振動板が物理的に吹き飛ぶため再使用は不可能。」",
      "effects": [ { "target": "enemy", "type": "damage_per_noise", "value": 6 }, { "target": "player", "type": "reset_noise", "value": 0 } ]
    },
    {
      "id": "pile_bunker", "name": "パイルバンカー", "cost": 2, "category": "CQC", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「時代遅れの火薬カートリッジ式杭打ち機。敵のハッキング防壁ごと装甲を物理的に粉砕するが、発射音は隠密行動の致命傷となる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 12, "pierce": true } ]
    },
    {
      "id": "close_combat", "name": "クロース・コンバット", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「軋む油圧ピストンに任せた、泥臭くも確実な金属ナックルの連続打撃。AIには予測不能な物理の暴力。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 4, "hits": 3 } ]
    },
    {
      "id": "jamming_flare", "name": "ジャミング・フレア", "cost": 2, "category": "HAK", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「溜まり切った排熱と歯車の駆動音を、妨害用の極低周波（ジャミング）として一気に放射。敵のデジタルセンサーを物理的なノイズで盲目にさせる。」",
      "effects": [ { "target": "player", "type": "block_per_noise", "value": 4 }, { "target": "player", "type": "reset_noise", "value": 0 } ]
    },
    {
      "id": "noise_canceller", "name": "ノイズ・キャンセラー", "cost": 0, "category": "TEC", "type": "skill", "noise": -2, "stance_change": null,
      "flavor": "「パンドラの端末から逆位相のアナログ音響を送信し、ガタついた素体の駆動音を無理やり打ち消す。通信帯域を圧迫するが、静寂を取り戻す。」",
      "effects": [ { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "decoy_foil", "name": "デコイ箔射出", "cost": 1, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「穿孔済みの不要な金属箔（ゴミ）を排出口から勢いよく撒き散らし、敵の光学照準を物理的に乱すローテクな防壁。」",
      "effects": [ { "target": "player", "type": "block", "value": 6 }, { "target": "player", "type": "halve_next", "value": 1 } ]
    },
    {
      "id": "serial_punch", "name": "連続穿孔", "cost": 1, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「体内の自動穿孔機（オートパンチャー）を安全域を超えた速度で回し、次々と物理カードを生成する。甲高い金属音が鳴り響く。」",
      "effects": [ { "target": "player", "type": "draw", "value": 3 } ]
    },
    {
      "id": "tactical_wait", "name": "戦術的待機", "cost": 0, "category": "DEF", "type": "skill", "noise": 0, "stance_change": "COVER",
      "flavor": "「すべての油圧駆動を最小限に落とし、暗がりに身を潜める。息を殺すような沈黙が、古い素体にわずかな防護をもたらす。」",
      "effects": [ { "target": "player", "type": "block", "value": 4 } ]
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
      isExhaust: !!raw.isExhaust,
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
