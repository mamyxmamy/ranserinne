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
      "id": "jamming_flare", "name": "ジャミング・フレア", "cost": 2, "category": "HAK", "type": "skill", "noise": 0, "stance_change": null, "isExhaust": true,
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
    /* ==== 正式版フェーズ1: VESSEL 04 "GOLIATH" 専用カード（設計書 DESIGN-MULTIPLAYER-FORMAL.md §A） ====
       効果タイプ damage_plus_noise / block_plus_noise / damage_plus_played は「参照系」
       （NOISEを消費せず、騒音力学の倍率が乗る）。damage_per_noise / block_per_noise は
       「変換系」（ターン開始時NOISEで計算し、倍率は乗らない）。解決は js/battle.js。 */
    {
      "id": "goliath_iron_strike", "name": "鉄塊打撃 (IRON CLUMP STRIKE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「スマートな格闘プログラムなど実装されていない。ただ数トンの採掘アームを力任せに振り下ろすだけだ。油圧シリンダーが悲鳴を上げるが、常に敵の装甲が先に砕け散る。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 6 } ]
    },
    {
      "id": "goliath_heavy_plating", "name": "重装甲 (HEAVY PLATING)", "cost": 1, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「回避行動は不要、あるいは不可能。分厚く重なった赤錆だらけの耐圧鋼板が、敵の凶弾を火花ごと呑み込んで押し潰す。コソコソ隠れるくらいなら、正面から耐え凌げ。」",
      "effects": [ { "target": "player", "type": "block", "value": 5 } ]
    },
    {
      "id": "goliath_exhaust_roar", "name": "排気咆哮 (EXHAUST ROAR)", "cost": 0, "category": "TEC", "type": "skill", "noise": 3, "stance_change": null, "isExhaust": true,
      "flavor": "「滞留した排ガスを強制排気し、旧式エンジンを限界まで空ぶかしする。鼓膜を破るほどの爆音が鳴り響くが、その熱狂的な回転数が次の暴力的な動作を無理やり引きずり出す。」",
      "effects": [ { "target": "player", "type": "draw", "value": 2 } ]
    },
    {
      "id": "goliath_sledgehammer", "name": "スレッジハンマー (SLEDGEHAMMER)", "cost": 2, "category": "HVY", "type": "attack", "noise": 0, "stance_change": null,
      "flavor": "「騒音がレッドゾーンを振り切り、安全装置（リミッター）が物理的に焼き切れた時のみ許される主砲。全油圧を右腕に集中させ、標的ごとフロアをスクラップに変える極大の一撃。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 8, "per": 2 } ]
    },
    {
      "id": "goliath_overdrive", "name": "限界駆動 (OVERDRIVE)", "cost": 0, "category": "TEC", "type": "skill", "noise": 4, "stance_change": null,
      "flavor": "「冷却系を意図的にバイパスし、潤滑油の代わりに己の身を削って出力を引き上げる。赤熱したシリンダーが上げる悲鳴は、もはや兵器のそれではない。」",
      "effects": [ { "target": "player", "type": "damage", "value": 5 }, { "target": "player", "type": "add_energy", "value": 2 } ]
    },
    {
      "id": "goliath_steel_press", "name": "鋼圧プレス (STEEL PRESS)", "cost": 2, "category": "DEF", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「分厚い耐圧装甲を油圧で強引に展開し、即席のトーチカと化す。展開時の軋み音は施設中に響き渡るが、この要塞を物理的に貫通できる弾丸は存在しない。」",
      "effects": [ { "target": "player", "type": "block_plus_noise", "value": 10, "per": 2 }, { "target": "player", "type": "draw_penalty_next", "value": 1 } ]
    },
    {
      "id": "goliath_rock_pile", "name": "削岩パイル (ROCK-CRUSHING PILE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「強固な岩盤を打ち砕くための掘削機構。ハッキングなどの小細工は不要。ただ力任せに、何度でも、目標が粉々になるまで連続で打ち付けろ。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_played", "value": 4, "per": 3 } ]
    },
    {
      "id": "goliath_blowback", "name": "暴発シリンダー (BLOWBACK CYLINDER)", "cost": 3, "category": "HVY", "type": "attack", "noise": 3, "stance_change": null,
      "flavor": "「限界まで溜め込んだ排熱と圧力を、敵陣のど真ん中で一気に解放する。周囲のすべてを吹き飛ばすその爆発は、隠密任務のセオリーに対する最も下品な冒涜だ。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 5, "per": 2 } ]
    },
    {
      "id": "goliath_heavy_tread", "name": "重圧歩行 (HEAVY TREAD)", "cost": 1, "category": "DEF", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「一歩踏み出すごとに床が鳴り、施設全体が震える。その圧倒的な質量と威圧感の前に、小口径の銃弾など小石を投げるに等しい。」",
      "effects": [ { "target": "player", "type": "tread", "value": 0 } ]
    },
    {
      "id": "goliath_purge_punish", "name": "パージ＆パニッシュ (PURGE & PUNISH)", "cost": 1, "category": "HVY", "type": "attack", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「臨界点に達した騒音と熱量を、装甲の一部ごとパージして標的に叩きつける。静寂が戻った後には、ひしゃげた鉄クズしか残らない。」",
      "effects": [ { "target": "enemy", "type": "damage_per_noise", "value": 6 }, { "target": "player", "type": "reset_noise", "value": 0 } ]
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
