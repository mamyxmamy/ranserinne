/* Illegal parts. A relic on the run fires its trigger for the whole run.
   The catalog is the loaded parts list. Ownership is a list of ids. */

(function (root) {
  const CATALOG = Object.freeze([
    // PROMPT-28: 初期装備はこの1つのみ（VESSEL 07 基礎OS）。残りは道中で拾って空き枠を埋める。
    // 第0陣 0-1: 各レリックは pool（"normal" / "boss"）／weight（抽選ウェイト、既定 1・希少は 0.5）／
    // excludeFor（そのキャラのランでは提示・抽選から外すキャラID配列、既定は空）を持つ。
    // 提示・抽選は必ず candidates() / draw() を経由し、プールが混ざらない構造にする（FINAL §2.0／§3 0-1）。
    // 第0陣 0-6 (R-19): 表示二層化。description＝効果文、flavor＝フレーバーに分離した。
    // 文面は RELICS-TEXT-DRAFT.md（下書き）＋ RELICS-TEXT-AUDIT.md（精査）の確定形。
    { id: "relic_vessel07_os", name: "VESSEL 07 基礎OS", description: "戦闘開始時、自動的に防護（BLK）を 2 得る。", flavor: "遠隔からの音響信号を受信し、体内の自動穿孔機で物理カードとして複製・実行するアナログ式OS。ハッキングを完全に無効化する。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 2 }], pool: "normal", weight: 1, excludeFor: [], pinned: true },
    { id: "relic_optical_camo", name: "旧世代の光学迷彩", description: "戦闘開始時、防護（BLK）を 8 得る。", flavor: "旧世代の光学迷彩クローク。最新式のセンサーには通用しない。それでも、目を逸らさせるには十分だった。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 8 }], pool: "normal", weight: 1, excludeFor: [] },
    { id: "relic_overdose_injector", name: "オーバードーズ・インジェクター", description: "ターン開始時、電力を +1 する（上限を超えて加算される）。その際、捨て札にフラッシュバック（呪装）が 1 枚混ざる。", flavor: "興奮剤の自動注入器。切れ味と引き換えに、古い記憶が蘇る。", trigger: "start_of_turn", effects: [{ type: "add_energy", value: 1 }, { type: "add_card_to_discard", card_id: "curse_flashback", value: 1 }], pool: "normal", weight: 1, excludeFor: [] },
    // U-1 決定 (c): スタン系は 07／04 では実質無効のため、両機体のランでは抽選から外す（excludeFor で処理）。
    { id: "relic_hydraulic_actuator", name: "油圧式関節アクチュエータ", description: "カードの効果でスタンを与えるとき、その値が +1 される。CQC の自動スタンや、罠のスタンには適用されない。", flavor: "関節部の油圧アクチュエータ。止めるための圧は、砕くための圧と紙一重だ。", trigger: "on_apply_stun", effects: [{ type: "increase_stun", value: 1 }], pool: "normal", weight: 1, excludeFor: ["vessel07", "vessel04"] },
    { id: "relic_analog_wiretap", name: "アナログ盗聴装置", description: "マップ生成時、スキャン回数が +1 される。", flavor: "アナログ盗聴装置。デジタルの耳には聞こえない周波数で、壁の向こうを聞く。", trigger: "on_map_generation", effects: [{ type: "add_scan_uses", value: 1 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第1陣（FINAL §2.1）: N-1 装甲箔ロール。戦闘開始時 BLK +12 と引き換えに捨て札へ呪装×1（既存プリミティブの複合）。
    { id: "relic_armor_foil_roll", name: "装甲箔ロール", description: "戦闘開始時、防護（BLK）を 12 得る。その際、捨て札にフラッシュバック（呪装）が 1 枚混ざる。", flavor: "命令を刻むための金属箔を、身を守る板に転用した。箔が減るたび、届くはずだった指令も減っていく。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 12 }, { type: "add_card_to_discard", card_id: "curse_flashback", value: 1 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第1陣（FINAL §2.1）: N-2 広域受信アンテナ。希少枠（R-7: weight 0.5）。盗聴装置と合算される。
    { id: "relic_wideband_antenna", name: "広域受信アンテナ", description: "マップ生成時、スキャン回数が +2 される。", flavor: "銅線を編んだ即席のアンテナ。死線のノイズの底から、かすかな信号を掬い上げる。", trigger: "on_map_generation", effects: [{ type: "add_scan_uses", value: 2 }], pool: "normal", weight: 0.5, excludeFor: [] },
    // 第1陣（FINAL §2.1）: N-3 逆止弁リレー。ターン開始時 BLK +3（防護失効より後に発火する既存の順序に乗る）。
    { id: "relic_check_valve_relay", name: "逆止弁リレー", description: "ターン開始時、防護（BLK）を 3 得る。", flavor: "逆流を止める小さな弁が、回路の節目で音を立てる。その音は、守りが届いた合図だった。", trigger: "start_of_turn", effects: [{ type: "add_block", value: 3 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第1陣（FINAL §2.1）: N-6 増圧シリンダー。希少枠（R-7）。スタン +2 はカードのスタン効果のみに乗る
    // （stunBonus の合算経路。CQC 自動スタン・罠には乗らない）。U-1 決定 (c) で 07／04 は抽選除外。
    { id: "relic_pressure_cylinder", name: "増圧シリンダー", description: "カードの効果でスタンを与えるとき、その値が +2 される。CQC の自動スタンや、罠のスタンには適用されない。", flavor: "圧を上げれば、止める力も上がる。物理は単純だ。単純なものは、決して裏切らない。", trigger: "on_apply_stun", effects: [{ type: "increase_stun", value: 2 }], pool: "normal", weight: 0.5, excludeFor: ["vessel07", "vessel04"] },
    // 第1陣（FINAL §2.1）: N-8 死線の中継コイル。希少枠（R-7）。前提の上限超え加算は第0陣 0-8 で完了済み。
    { id: "relic_deadline_relay_coil", name: "死線の中継コイル", description: "ターン開始時、電力を +1 する（上限を超えて加算される）。", flavor: "死線の途中に噛ませた中継コイル。遠くからの信号が、衰える前に力を取り戻す。", trigger: "start_of_turn", effects: [{ type: "add_energy", value: 1 }], pool: "normal", weight: 0.5, excludeFor: [] },
    // 第1陣（FINAL §2.2）: RB-3 二重箔送り装甲。ボスプール初の候補。戦闘開始時 BLK +16（無条件の基礎枠）。
    { id: "relic_double_foil_armor", name: "二重箔送り装甲", description: "戦闘開始時、防護（BLK）を 16 得る。", flavor: "箔は二重に送られる。一枚は命令に、一枚は盾に。", trigger: "start_of_combat", effects: [{ type: "add_block", value: 16 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2A（FINAL §2.1）: N-4 回収キャリパー。新規トリガー on_combat_victory＋レリック経路の heal。
    // 回復は戦闘側 HP へ入れて既存の同期（run.hp = battle.player.hp）に乗せる（applyVictory を参照）。
    { id: "relic_salvage_caliper", name: "回収キャリパー", description: "戦闘に勝利した時、HP を 5 回復する。", flavor: "倒した敵の残骸から、使える部品を測り取る。戦場は最も正直な資材置き場だ。", trigger: "on_combat_victory", effects: [{ type: "heal", value: 5 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第2陣 2A（FINAL §2.1）: N-7 携帯溶接トーチ。on_map_generation の heal（applyMapRelics へ配線）。
    // U-3 確定解釈: イベント入手時は即時発火せず、次のマップ生成から適用する（盗聴スキャンの即時発火は現行例外として別経路）。
    { id: "relic_welding_torch", name: "携帯溶接トーチ", description: "マップ生成時、HP を 3 回復する。", flavor: "層を移る合間に、溶接の火花が散る。完璧な修理ではない。だが次の一歩には足りる。", trigger: "on_map_generation", effects: [{ type: "heal", value: 3 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第2陣 2B（FINAL §2.2）: RB-1 指揮者のメトロノーム。ターン開始時 1 ドロー。
    // 実ドローは battle.js の drawCards() でしか行えないため、applyBattle では処理せず、
    // beginPlayerTurn 側の接続（startOfTurnDraws）が本ドローより前に解決する。
    { id: "relic_conductor_metronome", name: "指揮者のメトロノーム", description: "ターン開始時、カードを 1 枚引く。", flavor: "メトロノームの針は迷わない。迷うのは、いつも人間の方だ。", trigger: "start_of_turn", effects: [{ type: "draw_cards", value: 1 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2C（FINAL §2.2／R-10）: RB-2 大口径穿孔ヘッド。常時補正（trigger "always"）。
    // ダメージ基礎値 +1（1ヒットごと）。変換系（noScale）には乗らず、倍率は +1 の後に乗る。
    // 罠ダメージにも適用する。適用箇所は battle.js（applyEffect／trapFireDamage）。
    { id: "relic_large_bore_punch_head", name: "大口径穿孔ヘッド", description: "与えるダメージの基礎値が +1 される（多段ヒットは 1 ヒットごと）。罠のダメージにも適用される。変換系のダメージには適用されず、倍率による補正はこの +1 の後に計算される。", flavor: "大きな孔は、大きな命令だ。箔を貫く音も、それだけ重く響く。", trigger: "always", effects: [{ type: "damage_base", value: 1 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2C（FINAL §2.2／R-14）: RB-4 耐熱セラミック隔壁。常時補正（trigger "always"）。
    // 敵ダメージを1ヒットごとに 1 軽減する。実装は strikeVolley() の固定軽減列で、合算は
    // SYSTEM_CAPS.fixedReductionTotal の上限を受ける。コスト系 HP（自傷・スリップ等）は
    // strikeVolley を通らないため自然に対象外になる。
    { id: "relic_ceramic_bulkhead", name: "耐熱セラミック隔壁", description: "敵から受けるダメージが 1 減る（1 ヒットごと）。半減などの倍率補正の後に引かれ、0 未満にはならない。自分で支払うコストによる HP の減少は軽減されない。", flavor: "炉の熱にも砲火の熱にも、陶は黙って耐える。割れる時は、一度だけ大きく鳴る。", trigger: "always", effects: [{ type: "fixed_reduction", value: 1 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2D（FINAL §2.1／R-9）: N-5 残響ダンパー。NOISE の段階低下（0化ではない）。
    // 発火は「現在値が 1 以上のときだけ −1」の専用ガード（applyBattle の reduce_noise）。
    // スナップショット順序（そのターンの変換系は下げる前の NOISE で計算）と帯域再同期は
    // battle.js beginPlayerTurn 側の処理順で担保する（FINAL の J-9 固定事項）。
    { id: "relic_echo_damper", name: "残響ダンパー", description: "ターン開始時、NOISE が 1 以上なら 1 下がる（0 以下にはならない）。この低下が変換系カードの計算に反映されるのは、翌ターンから。", flavor: "穿孔機の駆動音を、綿と鉛の壁が飲み込む。静けさは買えない。だが、少しだけなら借りられる。", trigger: "start_of_turn", effects: [{ type: "reduce_noise", value: 1 }], pool: "normal", weight: 1, excludeFor: [] },
    // 第2陣 2D（FINAL §2.2／精査 J-4）: RB-5 帯域緩衝スプリング。常時補正（trigger "always"）。
    // 帯域「判定」に使う NOISE だけを −2 する（実値・表示・変換系の基準は不変）。
    // 適用する消費者は syncAlertBuff（攻撃上乗せ）と追加行動の回数だけ。警報の予告判定と
    // 完全露呈リセットは生値のまま（battle.js の judgedBand を参照）。
    { id: "relic_band_buffer_spring", name: "帯域緩衝スプリング", description: "帯域の判定に限り、NOISE が実際より 2 低いものとして扱われる（0 未満にはならない）。NOISE そのものは変わらず、警報の予告と完全露呈の判定は実際の NOISE で行われる。", flavor: "穿孔の衝撃を、バネが半拍だけ遅らせる。その半拍が、命の長さになることがある。", trigger: "always", effects: [{ type: "band_shift", value: 2 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2E（FINAL §2.2／R-12＋R-17）: RB-6 予備心臓ポンプ。常時（致死時の判定介入）。
    // ラン中 1 回だけ、全経路の致死を HP 1 で耐える。使用済みはラン側の任意フィールド
    // （battle state の relicUsed）に記録し、消費は consumeLethalGuard が行う。
    // 介入箇所は battle.js の trySparePump（敵攻撃／炉心溶融／スリップ／カード自傷）。
    { id: "relic_spare_heart_pump", name: "予備心臓ポンプ", description: "ラン中に 1 回だけ、HP が 0 になるダメージを受けた時、HP 1 で耐える。敵の攻撃のほか、自分のコストやスリップなど発生源を問わない。多段攻撃の途中で発動した場合、その攻撃の残りのヒットも HP 1 で受け切る。", flavor: "止まった心臓の代わりに回る、小さなポンプ。一度きりの鼓動が、まだ終わっていないと告げる。", trigger: "always", effects: [{ type: "lethal_guard", value: 1 }], pool: "boss", weight: 1, excludeFor: [] },
    // 第2陣 2F（FINAL §2.2／R-11）: RB-7 余熱回収フィン。新規トリガー end_of_turn。
    // ターン終了時、残電力 ×2 を BLK へ変換する（固定レート。倍率は乗らない）。
    // WEAVER の固有OS『余剰電力装甲』と重なるため、13 のランではキャラ別除外する。
    { id: "relic_heat_recovery_fin", name: "余熱回収フィン", description: "ターン終了時、残っている電力 1 につき、防護（BLK）を 2 得る。", flavor: "捨てられるはずの熱を、鰭が拾い直す。無駄の少ない機械は、長く戦える。", trigger: "end_of_turn", effects: [{ type: "energy_to_block", value: 2 }], pool: "boss", weight: 1, excludeFor: ["vessel13"] },
  ].map((relic) => Object.freeze({
    ...relic,
    pool: relic.pool || "normal",
    weight: typeof relic.weight === "number" ? relic.weight : 1,
    excludeFor: Object.freeze([...(relic.excludeFor || [])]),
    // 第0陣 0-2／0-6 の下地: 表示二層化（R-19）のデータ側受け口。flavor は全エントリに必ず存在させる
    // （未設定は空文字）。文面そのものは §6 の文章フローで作り、0-6 でツールチップ表示へ配線する。
    flavor: relic.flavor || "",
    // 第0陣 0-4: pinned は入れ替えで外せない根幹パーツ（初期OS。FINAL §1.3）の印。
    pinned: !!relic.pinned,
    effects: Object.freeze(relic.effects.map((effect) => Object.freeze({ ...effect }))),
  })));

  // 第0陣 0-3: レリック枠は通常／ボス共用の 5 枠（R-1）。正はこちらに置き、main.js の RELIC_SLOTS はこれを参照する。
  const SLOTS = 5;

  /* 第2陣（FINAL §2.0／R-18）: 系統ごとの合算天井の置き場。
     - fixedReductionTotal: 固定軽減（COVER／重圧歩行／騒音力学／RB-4）の1ヒットあたり合算上限（R-14）。
       **確定値 10**（2026-11-18、U-4 決定。本人がバランス再計測の提案を承認）。根拠は
       RELICS-STAGE2A-REPORT.md と BALANCE-RELICS-REMEASURE-REPORT.md を参照。
     - energyPerTurn: レリック経路の start_of_turn PWR 加算（add_energy）の1ターンあたり合計上限。
       **確定値 2**（第2陣後半で有効化、2026-11-18、U-4 決定）。現行の到達最大は注入器（+1）と
       中継コイル N-8（+1）の合算 +2 であり、その値をそのまま天井としたため現行挙動は変わらない。
       将来 PWR 系が増えたときにだけ頭打ちが効く。カード側の持続パワー（energy_per_turn）は
       含めない（レリック経路のみを対象とする FINAL §2.0 の定義どおり。U-4 でもこの線引きを維持）。
       根拠の詳細は RELICS-STAGE2B-REPORT.md と BALANCE-RELICS-REMEASURE-REPORT.md を参照。
     - scanPerLayer: **null（無効）のまま据え置きが確定**（2026-11-18、U-4 決定）。
       null の間は天井を効かせない。 */
  const SYSTEM_CAPS = Object.freeze({
    scanPerLayer: null,
    energyPerTurn: 2,
    fixedReductionTotal: 10,
  });

  const CURSE_NOISE = root.Cards.get("curse_flashback");

  const byId = new Map(CATALOG.map((relic) => [relic.id, relic]));
  const CHIP = Object.freeze({
    relic_vessel07_os: "基礎OS",
    relic_optical_camo: "光学迷彩",
    relic_overdose_injector: "注入器",
    relic_hydraulic_actuator: "油圧関節",
    relic_analog_wiretap: "盗聴",
    relic_armor_foil_roll: "装甲箔",
    relic_wideband_antenna: "広域受信",
    relic_check_valve_relay: "逆止弁",
    relic_pressure_cylinder: "増圧",
    relic_deadline_relay_coil: "中継コイル",
    relic_double_foil_armor: "二重箔",
    relic_salvage_caliper: "回収",
    relic_welding_torch: "溶接",
    relic_conductor_metronome: "メトロノーム",
    relic_large_bore_punch_head: "大口径",
    relic_ceramic_bulkhead: "耐熱隔壁",
    relic_echo_damper: "残響",
    relic_band_buffer_spring: "帯域緩衝",
    relic_spare_heart_pump: "予備心臓",
    relic_heat_recovery_fin: "余熱",
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

  // 第0陣 0-3: 付与には共用5枠（SLOTS）のチェックを実効化する（従来は表示だけの上限だった）。
  // 満杯・重複・未知IDはいずれも false を返し、付与しない。呼び出し側は戻り値で結果を受け取る。
  function hasRoom(ids) {
    return (ids || []).length < SLOTS;
  }

  function grant(ids, id) {
    if (!byId.has(id) || ids.includes(id)) return false;
    if (!hasRoom(ids)) return false;
    ids.push(id);
    return true;
  }

  // 第0陣 0-1: プール別の候補集合。提示・抽選の全経路はここを通す。
  // opts: { owned: 所持ID配列, lost: そのランの喪失ID配列（R-16）, character: 現キャラID }
  // 候補 = 指定プール かつ 未所持 かつ 喪失リストに無い かつ 現キャラの除外対象でないもの。
  function candidates(poolName, opts) {
    const o = opts || {};
    const owned = new Set(o.owned || []);
    const lost = new Set(o.lost || []);
    const character = o.character || null;
    return CATALOG.filter((relic) => {
      if (relic.pool !== poolName) return false;
      if (owned.has(relic.id) || lost.has(relic.id)) return false;
      if (character && relic.excludeFor.includes(character)) return false;
      return true;
    });
  }

  // 第0陣 0-1: プール別・ウェイト付き抽選（R-7 の希少ウェイトは weight で効く）。
  // opts は candidates() と同じ。opts.rng は [0,1) を返す関数（省略時は Math.random）。
  // 候補が無ければ null を返す。
  function draw(poolName, opts) {
    const o = opts || {};
    const pool = candidates(poolName, o);
    if (!pool.length) return null;
    const rng = typeof o.rng === "function" ? o.rng : Math.random;
    // 作戦深度の報酬の質（DESIGN-DEPTH-SYSTEM-FINAL §5.6）: opts.rareBoost は希少枠
    // （weight 0.5）の実効ウェイトにのみ掛ける。未指定・1 の場合は従来と完全一致。
    // 渡すのは戦闘報酬の提示経路（main.js の drawRelicOfferCandidates）だけとし、
    // イベント・ジャンク屋の抽選には渡さない（§5.6 精査・軽微8）。
    const boost = typeof o.rareBoost === "number" && o.rareBoost > 0 ? o.rareBoost : 1;
    const weightOf = (relic) => Math.max(0, relic.weight) * (relic.weight === 0.5 ? boost : 1);
    const total = pool.reduce((sum, relic) => sum + weightOf(relic), 0);
    if (!(total > 0)) return pool[0];
    let roll = rng() * total;
    for (const relic of pool) {
      roll -= weightOf(relic);
      if (roll < 0) return relic;
    }
    return pool[pool.length - 1];
  }

  /* 第0陣 0-4: 入れ替え基盤（R-2／R-3／R-16、FINAL §1.3／§3 0-4）。
     - 「外す」= 所持から除去し、そのランの喪失リストへ記録する。喪失したレリックは
       candidates() の lost 除外により、そのランの提示・抽選へ二度と戻らない。
     - 初期OS（pinned）は外す候補に含まれない。外す操作自体を存在させない。
     - inId は candidates() で提示された候補から渡す前提（プール／除外の判定は提示側の責務）。 */
  function isPinned(id) {
    const relic = byId.get(id);
    return !!(relic && relic.pinned);
  }

  function canRemove(ids, id) {
    return Array.isArray(ids) && ids.includes(id) && !isPinned(id);
  }

  function remove(ids, id) {
    if (!canRemove(ids, id)) return false;
    ids.splice(ids.indexOf(id), 1);
    return true;
  }

  // 外して入れ替える一連の操作。検証を全て通過した場合だけ状態を変える。
  // lostIds は喪失リスト（配列）。省略時は喪失を記録しない呼び出しとして扱うが、
  // ラン内では必ず run.relicsLost を渡すこと。
  function exchange(ids, lostIds, outId, inId) {
    if (!canRemove(ids, outId)) return false;
    if (!byId.has(inId) || ids.includes(inId)) return false;
    if (Array.isArray(lostIds) && lostIds.includes(inId)) return false;
    remove(ids, outId);
    if (Array.isArray(lostIds) && !lostIds.includes(outId)) lostIds.push(outId);
    return grant(ids, inId);
  }

  function card(id) {
    if (id === "curse_flashback" || id === "curse_noise" || id === CURSE_NOISE.id) return CURSE_NOISE;
    return null;
  }

  function chip(id) {
    return CHIP[id] || id;
  }

  /* 第0陣 0-2: effectText 対応規約（FINAL §3 0-2）。
     新しい効果タイプを CATALOG に追加するときは、必ずここへ表示文の対応を足すこと。
     未対応のタイプは effect.type の英字名がそのまま UI（ツールチップ／サマリ）へ漏れる。
     summary() / detail() は全効果を effectText 経由で表示するため、対応漏れは表示漏れと同義。 */
  function effectText(effect) {
    if (effect.type === "add_block") return `防護 +${effect.value}`;
    if (effect.type === "add_energy") return `電力 +${effect.value}`;
    if (effect.type === "add_card_to_discard") return `捨て札に呪装 ×${effect.value}`;
    if (effect.type === "increase_stun") return `スタン +${effect.value}`;
    if (effect.type === "add_scan_uses") return `スキャン +${effect.value}`;
    if (effect.type === "heal") return `HP回復 +${effect.value}`;
    if (effect.type === "draw_cards") return `ドロー +${effect.value}`;
    if (effect.type === "damage_base") return `ダメージ基礎値 +${effect.value}`;
    if (effect.type === "fixed_reduction") return `ダメージ軽減 ${effect.value}`;
    if (effect.type === "reduce_noise") return `NOISE -${effect.value}`;
    if (effect.type === "band_shift") return `帯域判定 -${effect.value}`;
    if (effect.type === "lethal_guard") return `致死回避 ${effect.value}回`;
    if (effect.type === "energy_to_block") return `残電力→防護 ×${effect.value}`;
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
      // 第0陣 0-2: 二層化の受け口として flavor も返す（現行ツールチップは未使用。表示配線は 0-6）
      flavor: relic.flavor || "",
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

  // 第2陣 2C (RB-2): 常時補正のダメージ基礎値ボーナス合計（battle.js の applyEffect／
  // trapFireDamage が引く）。変換系への適用可否は呼び出し側の noScale 判定に委ねる。
  function damageBaseBonus(state) {
    let bonus = 0;
    eachEffect(state && state.relics, "always", (relic, effect) => {
      if (effect.type === "damage_base") bonus += effect.value;
    });
    return bonus;
  }

  // 第2陣 2C (RB-4): 常時補正の固定軽減合計（battle.js の strikeVolley が引く）。
  // 合算上限（SYSTEM_CAPS.fixedReductionTotal）の適用は strikeVolley 側で行う。
  function fixedReduction(state) {
    let total = 0;
    eachEffect(state && state.relics, "always", (relic, effect) => {
      if (effect.type === "fixed_reduction") total += effect.value;
    });
    return total;
  }

  // 第2陣 2D (RB-5): 帯域「判定」に使う NOISE の下方シフト合計（battle.js の judgedBand が引く）。
  // 実値には一切触れない。適用する消費者の切り分けは battle.js 側（FINAL §2.2 の消費者表）。
  function bandShift(state) {
    let shift = 0;
    eachEffect(state && state.relics, "always", (relic, effect) => {
      if (effect.type === "band_shift") shift += effect.value;
    });
    return shift;
  }

  /* 第2陣 2E (RB-6): 致死回避（lethal_guard）の消費。
     所持していて未使用なら使用済みにして該当レリックを返し、そうでなければ null を返す。
     使用済みは battle state の relicUsed（{ レリックID: true }）に記録する。ラン側では
     main.js が run.relicUsed をそのまま戦闘へ渡し、ランセーブ（v:2 の任意フィールド）へ
     書き戻す。フィールド欠落（旧セーブ・旧スナップショット）は「未使用」として読む。 */
  function consumeLethalGuard(state) {
    if (!state) return null;
    let found = null;
    eachEffect(state.relics, "always", (relic, effect) => {
      if (!found && effect.type === "lethal_guard") found = relic;
    });
    if (!found) return null;
    if (!state.relicUsed || typeof state.relicUsed !== "object") state.relicUsed = {};
    if (state.relicUsed[found.id]) return null;
    state.relicUsed[found.id] = true;
    return found;
  }

  function applyBattle(state, trigger) {
    const log = [];
    // 第2陣後半: レリック経路の PWR 加算の1ターンあたり合計上限（SYSTEM_CAPS.energyPerTurn）。
    // applyBattle はトリガー単位で呼ばれるため、この呼び出し内の add_energy 合計を数える
    // ＝ start_of_turn の1回分と一致する。カード側 energy_per_turn は対象外（U-4）。
    let energyGranted = 0;
    eachEffect(state.relics, trigger, (relic, effect) => {
      if (effect.type === "draw_cards") {
        // 第2陣 2B (RB-1): 実ドローは battle.js の drawCards() でしか行えないため、ここでは
        // 処理しない。beginPlayerTurn が startOfTurnDraws() を使って本ドローより前に解決する。
        return;
      }
      if (effect.type === "add_block") {
        state.player.block += effect.value;
        log.push(`PART ${relic.name}  BLOCK +${effect.value}`);
        return;
      }
      if (effect.type === "add_energy") {
        // 第0陣 0-8 (R-8): 電力は上限を超えて加算する。カード側 energy_per_turn（予備電源）が
        // beginPlayerTurn で「energyMax へ戻った直後に上限を超えて加算する」前例に統一した。
        // 従来の Math.min 頭打ちでは、ターン開始時に上限まで戻った直後に発火するこの効果が
        // 実質増えず、ログ表示（PWR +1）と実効が食い違っていた（インジェクターの不一致を解消）。
        // 第2陣後半: 合算は SYSTEM_CAPS.energyPerTurn の天井を受ける（現行の到達最大 +2 では不発）。
        let amount = effect.value;
        const cap = SYSTEM_CAPS.energyPerTurn;
        if (typeof cap === "number") {
          amount = Math.max(0, Math.min(amount, cap - energyGranted));
          energyGranted += amount;
        }
        state.player.energy = state.player.energy + amount;
        log.push(`PART ${relic.name}  PWR +${amount}`);
        return;
      }
      if (effect.type === "reduce_noise") {
        // 第2陣 2D (N-5／R-9／精査 J-9): NOISE の段階低下。専用ガードとして
        // 「現在値が 1 以上のときだけ下げる」を実装する。カード側 vent_per_turn の
        // clampNoise 流用は GHOST-TAPE で 0 未満（負数域）へも下げる既存挙動のため流用禁止。
        // 0 以下には触れず、負数域にも入らない。スナップショット（turnStartNoise）は
        // beginPlayerTurn が本処理より前に確定済みのため、変換系への反映は翌ターンから。
        const before = state.noise || 0;
        if (before >= 1) {
          state.noise = Math.max(0, before - (effect.value || 0));
          if (state.noise !== before) log.push(`PART ${relic.name}  NOISE ${before} → ${state.noise}`);
        }
        return;
      }
      if (effect.type === "energy_to_block") {
        // 第2陣 2F (RB-7): ターン終了時、残電力を固定レートで BLK へ変換する。
        // レリック効果は原則固定値であり、倍率（騒音力学等）は一切乗らない。
        const gain = Math.max(0, state.player.energy || 0) * (effect.value || 0);
        if (gain > 0) {
          state.player.block = (state.player.block || 0) + gain;
          log.push(`PART ${relic.name}  BLOCK +${gain}`);
        }
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

  /* 第2陣 2A (N-4): 戦闘勝利時トリガー（on_combat_victory）の処理。
     回復は戦闘側 HP（state.player.hp）へ入れ、上限（hpMax）で頭打ちにする。呼び出し側
     （main.js openReward）がその後に既存の同期（run.hp = battle.player.hp）を行うため、
     ここでは戦闘状態だけを触る。実際に回復した分だけログへ出す（満タン時は無音）。 */
  function applyVictory(state) {
    const log = [];
    if (!state || !state.player) return log;
    eachEffect(state.relics, "on_combat_victory", (relic, effect) => {
      if (effect.type !== "heal") return;
      const before = state.player.hp || 0;
      const cap = typeof state.player.hpMax === "number" ? state.player.hpMax : before;
      state.player.hp = Math.min(cap, before + (effect.value || 0));
      const healed = state.player.hp - before;
      if (healed > 0) log.push(`PART ${relic.name}  HP +${healed}`);
    });
    return log;
  }

  /* 第2陣 2B (RB-1): ターン開始時ドローの内訳を返す（battle.js 側の接続用）。
     実ドローは drawCards() を持つ battle.js が行う。戻り値は [{ id, name, value }]。 */
  function startOfTurnDraws(state) {
    const draws = [];
    eachEffect(state && state.relics, "start_of_turn", (relic, effect) => {
      if (effect.type === "draw_cards") draws.push({ id: relic.id, name: relic.name, value: effect.value || 0 });
    });
    return draws;
  }

  root.Relics = {
    CATALOG,
    CURSE_NOISE,
    SLOTS,
    SYSTEM_CAPS,
    issued,
    hasRoom,
    grant,
    candidates,
    draw,
    isPinned,
    canRemove,
    remove,
    exchange,
    resolve,
    card,
    chip,
    effectText,
    summary,
    detail,
    eachEffect,
    stunBonus,
    damageBaseBonus,
    fixedReduction,
    bandShift,
    consumeLethalGuard,
    applyBattle,
    applyVictory,
    startOfTurnDraws,
  };
})(typeof window !== "undefined" ? window : globalThis);
