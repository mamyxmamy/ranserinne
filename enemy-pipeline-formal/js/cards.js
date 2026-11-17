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
    /* ==== 共通プール拡張10種（設計書 DESIGN-COMMON-POOL-EXPANSION-DRAFT.md、2026-11-16 本人決定で10種一括） ====
       全機体共通の報酬プールへ追加される。新規効果タイプ:
       search = 山札から1枚選んで手札へ（選択は battle.js の pendingPick → main.js の選択フェイズ）。
       discard_then_draw = 手札1枚を捨てて value 枚ドロー（同じく pendingPick 経由）。
       damage_per_exhausted = 基礎値＋この戦闘の廃棄枚数×per（参照系。騒音力学の倍率が乗る）。
       weaken_next = 敵の次の攻撃行動を半減（敵側チャージ）。
       damage_stance_bonus = 使用開始時点のスタンスが stance と一致すれば per を加算（参照系）。
       power = 持続効果を state.powers へ登録（kind: energy_per_turn = ターン開始時 PWR +value）。解決は js/battle.js。 */
    {
      "id": "echo_search", "name": "残響サーチ (ECHO SEARCH)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「穿孔済みの箔の束を指でなぞれば、欲しい一枚の手触りは分かる。目ではなく、勘で探せ。」",
      "effects": [ { "target": "player", "type": "search", "value": 1 } ]
    },
    {
      "id": "foil_sort", "name": "箔の選別 (FOIL SORT)", "cost": 0, "category": "TEC", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「使えない箔は、迷わず炉に放れ。未練はノイズより始末が悪い。」",
      "effects": [ { "target": "player", "type": "discard_then_draw", "value": 1 } ]
    },
    {
      "id": "dense_punch", "name": "圧縮穿孔 (DENSE PUNCH)", "cost": 2, "category": "TEC", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「捨てたはずの箔が、圧縮機の中でまだ息をしていた。全部まとめて、最後の一撃に変える。」",
      "effects": [ { "target": "enemy", "type": "damage_per_exhausted", "value": 3, "per": 2 } ]
    },
    {
      "id": "staged_vent", "name": "段階排熱 (STAGED VENT)", "cost": 1, "category": "DEF", "type": "skill", "noise": -3, "stance_change": null,
      "flavor": "「一気に冷ますな、段階を踏め。熱も音も、急に消せば痕跡が残る。」",
      "effects": [ { "target": "player", "type": "block", "value": 4 } ]
    },
    {
      "id": "aim_jam", "name": "照準攪乱 (AIM JAM)", "cost": 1, "category": "HAK", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「照準は目じゃない、演算だ。その演算に、砂粒ひとつ放り込んでやれ。」",
      "effects": [ { "target": "enemy", "type": "weaken_next", "value": 1 } ]
    },
    {
      "id": "shadow_strike", "name": "物陰の一撃 (SHADOW STRIKE)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「物陰は隠れる場所じゃない。踏み込むための、助走だ。」",
      "effects": [ { "target": "enemy", "type": "damage_stance_bonus", "value": 5, "per": 5, "stance": "COVER" } ]
    },
    {
      "id": "iron_door", "name": "鉄扉バリケード (IRON DOOR)", "cost": 2, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「扉は開けるためだけにあるんじゃない。背に負って、盾にもなる。」",
      "effects": [ { "target": "player", "type": "block", "value": 14 } ]
    },
    {
      "id": "reserve_cell", "name": "予備電源 (RESERVE CELL)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「予備は飾りじゃない。長丁場ってのは、こういう一手で勝敗が決まる。」",
      "effects": [ { "target": "player", "type": "power", "kind": "energy_per_turn", "value": 1, "powerId": "reserve_cell" } ]
    },
    {
      "id": "double_tap", "name": "二度打ち (DOUBLE TAP)", "cost": 2, "category": "GUN", "type": "attack", "noise": 3, "stance_change": "EXPOSE",
      "flavor": "「一発で倒せると思うな。二発目は確認じゃない、念押しだ。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 7, "hits": 2 } ]
    },
    {
      "id": "silent_service", "name": "静音整備 (SILENT SERVICE)", "cost": 0, "category": "TEC", "type": "skill", "noise": -1, "stance_change": null, "isExhaust": true,
      "flavor": "「整備ってのはな、静かな場所でやるもんだ。……今が、その静かな場所だ。」",
      "effects": [ { "target": "player", "type": "heal", "value": 4 } ]
    },
    /* ==== カードプール大拡充バッチB: 共通プール +30種（設計書 DESIGN-POOL-EXPANSION2-DRAFT.md §1、26→56種） ====
       新規効果タイプ（解決は js/battle.js）:
       search_top = 山札の上 value 枚を pendingPick（kind "search_top"）で提示し1枚を手札へ、残りを捨て札へ。
       damage_stun_bonus = 基礎値＋敵の現在スタン蓄積×per（上限 cap）。参照系（倍率対象）。
       damage_if_hand_le = 使用時点の手札枚数（このカードを除く）が maxHand 以下なら +per。参照系。
       exhaust_curse_in_hand = 手札の呪い1枚を pendingPick（kind "curse"）で選ばせ廃棄し、value 枚ドロー。対象なしは不発。
       power の新種別: block_per_turn = ターン開始時に BLK +value／vent_per_turn = ターン開始時に NOISE −value。 */
    {
      "id": "tape_measure", "name": "巻尺確認 (MEASURE)", "cost": 0, "category": "TEC", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「穿孔機にかける前の金属箔を、三枚だけ指でなぞって確かめる。AIの予測演算は平気で嘘を吐くが、箔の厚みと孔の位置は、触れた指先にだけ正直だ。」",
      "effects": [ { "target": "player", "type": "search_top", "value": 3 } ]
    },
    {
      "id": "patch_cable", "name": "応急ケーブル (PATCH CABLE)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「焼けかけのリレー盤へ銅線を直接ねじ込み、次に穿孔機へ回るはずの電力を前倒しで引き抜く荒業。借りた電力は次のサイクルで必ず取り戻される。ツケは未来の自分持ちだ。」",
      "effects": [ { "target": "player", "type": "add_energy", "value": 2 }, { "target": "player", "type": "draw_penalty_next", "value": 1 } ]
    },
    {
      "id": "manual_crank", "name": "手回し発電 (HAND CRANK)", "cost": 0, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「死線の電力が細れば、最後に頼れるのは自分の腕だ。発電機のクランクを、歯車の悲鳴ごと回し切る。AIには真似のできない、最も原始的で最も確実な給電。」",
      "effects": [ { "target": "player", "type": "add_energy", "value": 2, "overcharge": true } ]
    },
    {
      "id": "grease_shot", "name": "グリス注入 (GREASE)", "cost": 1, "category": "DEF", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「関節の隙間へ高粘度のグリスを圧入し、歯車の噛み合いを滑らかにする。軋み音が沈むだけでなく、敵の打撃まで油膜の上で滑って逸れていく。」",
      "effects": [ { "target": "player", "type": "block", "value": 6 } ]
    },
    {
      "id": "sandbag_wall", "name": "土嚢バリケード (SANDBAG)", "cost": 2, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「崩れた壁材と土砂を素体の前に積み上げ、即席の防壁を拵える。弾丸は土の中で止まる。だが数百キロの土を運ぶ作業は、次の動き出しを確実に遅くした。」",
      "effects": [ { "target": "player", "type": "block", "value": 10 }, { "target": "player", "type": "draw_penalty_next", "value": 1 } ]
    },
    {
      "id": "smoke_foil", "name": "煙幕箔 (SMOKE FOIL)", "cost": 0, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「穿孔で出た箔の切れ端を焼き切り、視界を塞ぐ煙幕を張る。装甲で受けるのではない。敵の照準そのものを曇らせ、撃たせても威力を半分に削ぐのだ。」",
      "effects": [ { "target": "player", "type": "block", "value": 2 }, { "target": "player", "type": "halve_next", "value": 1 } ]
    },
    {
      "id": "aim_high", "name": "高所狙撃 (HIGH GROUND)", "cost": 2, "category": "GUN", "type": "attack", "noise": 2, "stance_change": "EXPOSE",
      "flavor": "「物陰を捨て、配管の上へ身を晒して狙撃する。隠れる場所がない代わりに、遮蔽に阻まれることもない。晒した姿勢のまま、照準だけが冴え渡る。」",
      "effects": [ { "target": "enemy", "type": "damage_stance_bonus", "value": 6, "per": 6, "stance": "EXPOSE" } ]
    },
    {
      "id": "hip_shot", "name": "腰撃ち (HIP SHOT)", "cost": 1, "category": "GUN", "type": "attack", "noise": 2, "stance_change": "EXPOSE",
      "flavor": "「照準器を覗く暇もなく、腰だめの姿勢から二発を畳み掛ける。精度よりも速さで押し切る、接近戦の古い作法だ。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 4, "hits": 2 } ]
    },
    {
      "id": "ricochet", "name": "跳弾 (RICOCHET)", "cost": 2, "category": "GUN", "type": "attack", "noise": 3, "stance_change": null,
      "flavor": "「壁と床で跳ね返した弾丸は、死角から敵の装甲を抉る。体勢の崩れた敵ほど跳弾の角度を読み切れず、怯みが深いほど深く突き刺さる。」",
      "effects": [ { "target": "enemy", "type": "damage_stun_bonus", "value": 9, "per": 2, "cap": 6 } ]
    },
    {
      "id": "burst_three", "name": "三点バースト (3R BURST)", "cost": 3, "category": "GUN", "type": "attack", "noise": 4, "stance_change": "EXPOSE",
      "flavor": "「リレーの連動を三連射に組み替え、全弾を一息に叩き込む。反動で姿勢は大きく崩れるが、装甲を穿つ衝撃は三倍になって返ってくる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 6, "hits": 3 } ]
    },
    {
      "id": "bayonet_rush", "name": "銃剣突撃 (BAYONET)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「銃身の先に刃を固定し、素体の全質量を乗せて突っ込む。弾薬の代わりに体重で穿つ一撃は、敵の姿勢を根こそぎ崩して怯ませる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 7 } ]
    },
    {
      "id": "elbow_smash", "name": "肘打ち (ELBOW)", "cost": 0, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「大掛かりな穿孔はいらない。孔は最小限、電力はゼロ。油圧の残圧だけで肘鉄を叩き込む、最も原始的な一撃。小さいが、至近距離の衝撃は敵の駆動系を確実に震わせる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 3 } ]
    },
    {
      "id": "trip_wire_kick", "name": "足払い (LEG SWEEP)", "cost": 1, "category": "CQC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「敵の足元へ脚を滑り込ませ、支えを払って体勢を崩す。倒しはしない。だが姿勢の崩れた装甲は継ぎ目を晒し、次の打撃を深く通すようになる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 3 }, { "target": "enemy", "type": "vulnerable", "value": 1 } ]
    },
    {
      "id": "false_order", "name": "偽装指令 (FALSE ORDER)", "cost": 2, "category": "HAK", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「死線のノイズに紛らせ、指揮系統の声色で偽の撤収命令を流し込む。デジタルな照合を経ない音の命令には、受ける側に疑う仕組みがない。命令は、命令として処理される。」",
      "effects": [ { "target": "enemy", "type": "cancel_next_intent", "value": 1 } ]
    },
    {
      "id": "signal_mirror", "name": "信号ミラー (MIRROR)", "cost": 1, "category": "HAK", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「研ぎ上げた金属箔の反射で敵の光学センサーを眩ませる。音もなく照準だけを狂わせる妨害は、次に来る一撃の角度を逸らし、威力を半分に削いでいく。」",
      "effects": [ { "target": "enemy", "type": "weaken_next", "value": 1 } ]
    },
    {
      "id": "overload_tap", "name": "過負荷タップ (OVERTAP)", "cost": 2, "category": "HAK", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「敵の動力線へ端子を打ち込み、過負荷の電流を逆流させて回路を焼く。だが接続したこちらの指先も同じ電流に晒され、装甲の内側で焦げていく。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 10 }, { "target": "player", "type": "damage", "value": 3 } ]
    },
    {
      "id": "echo_battery", "name": "残響バッテリー (ECHO CELL)", "cost": 3, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「穿孔の駆動音は、装甲の内側で反響し続ける。その残響を圧力として蓄える仕組みが、戦闘の間ずっと薄い防護を張り直し続けてくれる。音が、守りに変わる。」",
      "effects": [ { "target": "player", "type": "power", "kind": "block_per_turn", "value": 3, "powerId": "echo_battery" } ]
    },
    {
      "id": "spare_gear", "name": "予備ギア (SPARE GEAR)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「主歯車の隣に組み込んだ予備の伝達系が、毎周期の軋みを少しずつ肩代わりする。大本の駆動音は消えないが、漏れ出す騒音は確実に細っていく。」",
      "effects": [ { "target": "player", "type": "power", "kind": "vent_per_turn", "value": 1, "powerId": "spare_gear" } ]
    },
    {
      "id": "salvage_arm", "name": "回収アーム (SALVAGE ARM)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「排出シュートへ回収アームを伸ばし、捨てたはずの穿孔箔を一枚だけ拾い戻す。伸ばしたアームそのものが盾にもなる、戦場の倹約術だ。」",
      "effects": [ { "target": "player", "type": "recycle_discard", "value": 1 }, { "target": "player", "type": "block", "value": 3 } ]
    },
    {
      "id": "deep_sort", "name": "深層選別 (DEEP SORT)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「在庫の箔を深く掻き分け、不要な一枚を捨てて使える二枚を引き当てる。選別の手間はかかるが、山の底ほど良い箔が眠っているものだ。」",
      "effects": [ { "target": "player", "type": "discard_then_draw", "value": 2 } ]
    },
    {
      "id": "foil_toss", "name": "箔投げ (FOIL TOSS)", "cost": 0, "category": "TEC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「穿孔で切り落とされた箔の屑を掴み、刃物として投げつける。捨てたカードの数だけ屑は溜まっている。戦いが長引くほど、この屑山は重くなる。」",
      "effects": [ { "target": "enemy", "type": "damage_per_exhausted", "value": 0, "per": 1 } ]
    },
    {
      "id": "last_foil", "name": "最後の一枚 (LAST FOIL)", "cost": 2, "category": "TEC", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「箔ロールの最後の一枚を穿孔機へ送り込む。後がないからこそ迷いが消え、孔の並びに全身全霊の駆動が乗る。空になったロールの軽さと引き換えに、この一枚だけが重い。」",
      "effects": [ { "target": "enemy", "type": "damage_if_hand_le", "value": 6, "per": 8, "maxHand": 0 } ]
    },
    {
      "id": "field_repair", "name": "応急修理 (FIELD REPAIR)", "cost": 2, "category": "TEC", "type": "skill", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「破損した油圧ホースを締め直し、装甲の裂け目に予備板を打ち付ける。本格的な整備ではない。だが止血さえできれば、素体はもう一度立てる。」",
      "effects": [ { "target": "player", "type": "heal", "value": 8 } ]
    },
    {
      "id": "coolant_rain", "name": "冷却液シャワー (COOLANT)", "cost": 1, "category": "DEF", "type": "skill", "noise": -2, "stance_change": null,
      "flavor": "「冷却液を頭から浴びせ、熱を持った駆動部を一気に冷ます。駆動音が静まるだけでなく、液膜が装甲を覆って衝撃を受け流す二重の守りになる。」",
      "effects": [ { "target": "player", "type": "block", "value": 5 } ]
    },
    {
      "id": "brace_impact", "name": "衝撃姿勢 (BRACE)", "cost": 0, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「脚を踏ん張り重心を落とし、衝撃を受け止める姿勢を取るだけ。機構は何も動かないが、構えた素体と構えていない素体では耐え方がまるで違う。」",
      "effects": [ { "target": "player", "type": "block", "value": 3 } ]
    },
    {
      "id": "decoy_voice", "name": "囮ボイス (DECOY VOICE)", "cost": 1, "category": "TACTIC", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「録音した声を離れたスピーカーから流し、敵の照準を虚空へ逸らす。騒音は増えるが、敵が囮を睨んでいる間に次の穿孔の準備が整っていく。」",
      "effects": [ { "target": "enemy", "type": "weaken_next", "value": 1 }, { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "adrenal_valve", "name": "副腎バルブ (ADRENAL VALVE)", "cost": 0, "category": "TACTIC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「側腹の小さなバルブを捻り、圧搾された作動油を一度だけ循環系へ流し込む。わずかな出力の上乗せと、熱を持った駆動部への応急の手当て。使い切りの小さな賭けだ。」",
      "effects": [ { "target": "player", "type": "add_energy", "value": 1 }, { "target": "player", "type": "heal", "value": 2 } ]
    },
    {
      "id": "curse_sponge", "name": "呪い吸着箔 (CURSE SPONGE)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「呪いの信号を吸着用の捨て箔へ写し取り、箔ごと焼却シュートへ放り込む。汚染された指令が消えた分だけ、回線は澄んで次の孔が見えてくる。」",
      "effects": [ { "target": "player", "type": "exhaust_curse_in_hand", "value": 2 } ]
    },
    {
      "id": "iron_stance", "name": "鉄壁の構え (IRON STANCE)", "cost": 3, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「全関節の油圧を固定し、素体そのものを鉄の壁に変える。弾丸は質量の前で止まる。だが固めた関節を解く作業が、次の動き出しを重くした。」",
      "effects": [ { "target": "player", "type": "block", "value": 20 }, { "target": "player", "type": "draw_penalty_next", "value": 1 } ]
    },
    {
      "id": "grand_punch", "name": "総穿孔 (GRAND PUNCH)", "cost": 3, "category": "TEC", "type": "attack", "noise": 3, "stance_change": null, "isExhaust": true,
      "flavor": "「この戦いで打ち捨ててきた全ての箔。その孔の履歴を読み返し、蓄積した駆動の全てを一発の総穿孔へ畳み込む。捨てた分だけ、この一撃は重い。」",
      "effects": [ { "target": "enemy", "type": "damage_per_exhausted", "value": 8, "per": 3 } ]
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
      "id": "goliath_sledgehammer", "name": "スレッジハンマー (SLEDGE)", "cost": 2, "category": "HVY", "type": "attack", "noise": 0, "stance_change": null,
      "flavor": "「騒音がレッドゾーンを振り切り、安全装置（リミッター）が物理的に焼き切れた時のみ許される主砲。全油圧を右腕に集中させ、標的ごとフロアをスクラップに変える極大の一撃。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 8, "per": 2 } ]
    },
    {
      "id": "goliath_overdrive", "name": "限界駆動 (OVERDRIVE)", "cost": 0, "category": "TEC", "type": "skill", "noise": 3, "stance_change": null,
      "flavor": "「冷却系を意図的にバイパスし、潤滑油の代わりに己の身を削って出力を引き上げる。赤熱したシリンダーが上げる悲鳴は、もはや兵器のそれではない。」",
      "effects": [ { "target": "player", "type": "damage", "value": 5 }, { "target": "player", "type": "add_energy", "value": 2, "overcharge": true } ]
    },
    {
      "id": "goliath_steel_press", "name": "鋼圧プレス (STEEL PRESS)", "cost": 2, "category": "DEF", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「分厚い耐圧装甲を油圧で強引に展開し、即席のトーチカと化す。展開時の軋み音は施設中に響き渡るが、この要塞を物理的に貫通できる弾丸は存在しない。」",
      "effects": [ { "target": "player", "type": "block_plus_noise", "value": 10, "per": 2 }, { "target": "player", "type": "draw_penalty_next", "value": 1 } ]
    },
    {
      "id": "goliath_rock_pile", "name": "削岩パイル (ROCK PILE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「強固な岩盤を打ち砕くための掘削機構。ハッキングなどの小細工は不要。ただ力任せに、何度でも、目標が粉々になるまで連続で打ち付けろ。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_played", "value": 4, "per": 3 } ]
    },
    {
      "id": "goliath_blowback", "name": "暴発シリンダー (BLOWBACK)", "cost": 3, "category": "HVY", "type": "attack", "noise": 3, "stance_change": null,
      "flavor": "「限界まで溜め込んだ排熱と圧力を、敵陣のど真ん中で一気に解放する。周囲のすべてを吹き飛ばすその爆発は、隠密任務のセオリーに対する最も下品な冒涜だ。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 5, "per": 2 } ]
    },
    {
      "id": "goliath_heavy_tread", "name": "重圧歩行 (HEAVY TREAD)", "cost": 1, "category": "DEF", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「一歩踏み出すごとに床が鳴り、施設全体が震える。その圧倒的な質量と威圧感の前に、小口径の銃弾など小石を投げるに等しい。」",
      "effects": [ { "target": "player", "type": "tread", "value": 0 } ]
    },
    {
      "id": "goliath_purge_punish", "name": "パージ＆パニッシュ (PURGE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「臨界点に達した騒音と熱量を、装甲の一部ごとパージして標的に叩きつける。静寂が戻った後には、ひしゃげた鉄クズしか残らない。」",
      "effects": [ { "target": "enemy", "type": "damage_per_noise", "value": 6 }, { "target": "player", "type": "reset_noise", "value": 0 } ]
    },
    /* ==== カードプール大拡充バッチB: GOLIATH 専用プール +12種（設計書 DESIGN-POOL-EXPANSION2-DRAFT.md §3、6→18種） ====
       参照系（damage_plus_noise／block_plus_noise／damage_plus_played）は倍率対象、
       変換系（damage_per_noise／block_per_noise）は固定レートという既存ルールを維持する。
       power の新種別 turn_start_noise_damage = ターン開始時に敵へ「開始時NOISE×value」ダメージ（変換系）。 */
    {
      "id": "goliath_rush_hour", "name": "ラッシュアワー (RUSH HOUR)", "cost": 2, "category": "HVY", "type": "attack", "noise": 3, "stance_change": null,
      "flavor": "「全駆動を前進に振り向け、爆音と共に突っ込む。撒き散らす駆動音の分だけ駆動系の回転は上がり、騒がしさそのものが突撃の勢いに換わっていく。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 7, "per": 2 } ]
    },
    {
      "id": "goliath_earthquake", "name": "地震撃 (EARTHQUAKE)", "cost": 3, "category": "HVY", "type": "attack", "noise": 4, "stance_change": null,
      "flavor": "「脚部の杭を床へ打ち込み、施設の床ごと震わせる。蓄積した駆動音の振動が地盤に重なり、うるさい戦場であるほど地震の規模は大きくなる。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_noise", "value": 10, "per": 3 } ]
    },
    {
      "id": "goliath_bulkhead", "name": "隔壁 (BULKHEAD)", "cost": 1, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「内蔵の隔壁板を油圧で押し出し、即席の防壁を何重にも重ねる。駆動音の振動が板同士を噛み合わせ、騒がしい時ほど壁は分厚く固くなっていく。」",
      "effects": [ { "target": "player", "type": "block_plus_noise", "value": 6, "per": 1 } ]
    },
    {
      "id": "goliath_scrap_wall", "name": "廃材の壁 (SCRAP WALL)", "cost": 0, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「溜まった駆動音の残響を装甲を締める圧力へ変換し、壁として立て直す。音そのものは消費されない。溜まっていた騒音の分だけ、壁は厚い。」",
      "effects": [ { "target": "player", "type": "block_per_noise", "value": 2 } ]
    },
    {
      "id": "goliath_heavy_breath", "name": "重呼吸 (HEAVY BREATH)", "cost": 1, "category": "TEC", "type": "skill", "noise": -2, "stance_change": null,
      "flavor": "「巨体を止め、エンジンの呼吸を一度深く整える。排気が静まる短い休息の間に、回線の向こうでは次の指令の孔が静かに用意されていく。」",
      "effects": [ { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "goliath_ram", "name": "体当たり (RAMMING)", "cost": 1, "category": "HVY", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「技術も型もない。数トンの質量をただ加速し、敵へぶつけるだけ。だが反動は装甲を伝って自分のフレームにも返り、衝突の代償は双方で払う。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 8 }, { "target": "player", "type": "damage", "value": 2 } ]
    },
    {
      "id": "goliath_aftershock", "name": "余震 (AFTERSHOCK)", "cost": 0, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「先に叩き込んだ打撃の振動は、まだ床と装甲の中に残っている。その余震を拾って追撃に変える。繋いだ打撃の数が多いほど、震えは大きくなる。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_played", "value": 2, "per": 3 } ]
    },
    {
      "id": "goliath_pressure_cooker", "name": "圧力鍋 (PRESSURE COOKER)", "cost": 3, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「規格外の質量が撒き散らす駆動音は、密閉された施設の中で逃げ場を失い、圧力となって壁と敵を内側から押し潰す。うるさいことは、ゴリアテにとって罪ではない。武器だ。」",
      "effects": [ { "target": "player", "type": "power", "kind": "turn_start_noise_damage", "value": 1, "powerId": "goliath_pressure_cooker" } ]
    },
    {
      "id": "goliath_demolition", "name": "解体作業 (DEMOLITION)", "cost": 2, "category": "HVY", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「装甲の継ぎ目と支持材を、解体の手順どおり順番に折っていく。貫通した穴は塞がらず、剥がれた構造は後の全ての打撃を通しやすくする。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 10, "pierce": true }, { "target": "enemy", "type": "vulnerable", "value": 1 } ]
    },
    {
      "id": "goliath_overload_smash", "name": "過負荷スマッシュ (OVERLOAD SMASH)", "cost": 3, "category": "HVY", "type": "attack", "noise": 3, "stance_change": null,
      "flavor": "「油圧を限界の先まで絞り上げ、腕部全体を一つの槌として振り下ろす。規格外の一撃だが、過負荷に耐えきれないシリンダーは内側から焼けていく。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 16 }, { "target": "player", "type": "damage", "value": 5 } ]
    },
    {
      "id": "goliath_anchor", "name": "碇 (ANCHOR)", "cost": 2, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「両脚を床へ打ち付け、巨体を碇のように固定する。分厚い装甲に加え、駆動音が増すほど脚部の固定は強まり、受ける衝撃をその場で殺していく。」",
      "effects": [ { "target": "player", "type": "block", "value": 12 }, { "target": "player", "type": "tread", "value": 0 } ]
    },
    {
      "id": "goliath_final_purge", "name": "最終排熱 (FINAL PURGE)", "cost": 2, "category": "HVY", "type": "attack", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「限界まで溜め込んだ熱と駆動音を、全ての排熱口から一度に噴き出す。蓄積の全量が衝撃に変わった後には、焼けた静寂だけが戦場に残る。」",
      "effects": [ { "target": "enemy", "type": "damage_per_noise", "value": 8 }, { "target": "player", "type": "reset_noise", "value": 0 } ]
    },
    /* ==== 正式版: VESSEL 09 "GHOST-TAPE" 専用カード（設計書 DESIGN-GHOST-TAPE-DRAFT.md、2026-11-16 全決定） ====
       カテゴリは ACOUSTIC（CQC の自動スタン+1 を避ける）。新規効果タイプ:
       damage_silence_bonus = 使用開始時NOISEが0以下なら per を加算（参照系）。
       stun_if_silence = 自身のNOISE適用後のNOISEが0以下ならスタン（逆位相ノイズ）。
       scrap_noise = 敵に「次の攻撃行動を半減」チャージを付与。draw_bonus_next = 次ターンのドロー+1（上限+1）。
       recycle_discard = 捨て札からランダム1枚を手札へ（対象なしなら1ドロー）。
       stun_draw_if_max = スタンがこの効果で上限へ達したら1ドロー。解決は js/battle.js。 */
    {
      "id": "ghost_echo_needle", "name": "残響ニードル (ECHO NEEDLE)", "cost": 1, "category": "ACOUSTIC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「磁気ヘッドに残った前ターンの残響を、細い針のように射出する。雑音の中ではただの掠り傷でも、静寂の中で放てば、その音は牙になる。」",
      "effects": [ { "target": "enemy", "type": "damage_silence_bonus", "value": 4, "per": 3 } ]
    },
    {
      "id": "ghost_mute_tape", "name": "消音テープ (MUTE TAPE)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": -1, "stance_change": "COVER",
      "flavor": "「関節と穿孔口に粘着テープを何重にも巻き付け、駆動音を物理的に封じ込める。見た目は修理跡だらけでも、音だけは新品以上に静かだ。」",
      "effects": [ { "target": "player", "type": "block", "value": 5 } ]
    },
    {
      "id": "ghost_tape_splice", "name": "テープ継ぎ (TAPE SPLICE)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「切断された記録同士を、指先ほどのテープで無理やり繋ぎ直す。継ぎ目からは余計な音が漏れるが、失われたはずの選択肢が一瞬だけ戻ってくる。」",
      "effects": [ { "target": "player", "type": "draw", "value": 2 } ]
    },
    {
      "id": "ghost_silent_cut", "name": "無音断章 (SILENT CUT)", "cost": 2, "category": "ACOUSTIC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「記録の無音部分だけを切り取り、刃として再構成する。敵が異常に気づいた時には、すでに再生ヘッドごと両断されている。」",
      "effects": [ { "target": "enemy", "type": "damage_silence_bonus", "value": 8, "per": 4 } ]
    },
    {
      "id": "ghost_phase_invert", "name": "逆位相ノイズ (PHASE-INVERT)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": -3, "stance_change": null,
      "flavor": "「アナログ波で空間の音を食い殺し、敵のセンサーに致命的なエラーを吐かせる。」",
      "effects": [ { "target": "enemy", "type": "stun_if_silence", "value": 1 } ]
    },
    {
      "id": "ghost_scrap_noise", "name": "スクラップ・ノイズ (SCRAP NOISE)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「再生不良のスクラップ音源を敵の照準系へ紛れ込ませる。敵は正確に狙っているつもりで、半拍遅れた幻聴へ向けて引き金を引く。」",
      "effects": [ { "target": "enemy", "type": "scrap_noise", "value": 1 } ]
    },
    {
      "id": "ghost_fade_out", "name": "フェードアウト (FADE OUT)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": -2, "stance_change": null,
      "flavor": "「自機の駆動音を徐々に絞り、最後の一音を次のターンの先行入力として予約する。消え際の静けさが、未来の選択肢を一枚だけ増やす。」",
      "effects": [ { "target": "player", "type": "block", "value": 7 }, { "target": "player", "type": "draw_bonus_next", "value": 1 } ]
    },
    {
      "id": "ghost_reel_recycle", "name": "リール・リサイクル (REEL RECYCLE)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「捨てられたテープを逆回転で巻き戻し、まだ使える一節だけを拾い上げる。過去の判断を拾い直す代わりに、余計な再生音が一つ増える。」",
      "effects": [ { "target": "player", "type": "recycle_discard", "value": 1 } ]
    },
    {
      "id": "ghost_phantom_tape", "name": "幻聴テープ (PHANTOM TAPE)", "cost": 2, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「存在しない足音、存在しない銃声、存在しない味方の悲鳴。三重の幻聴を流し込まれた敵は、実在するこちらの姿だけを見失う。」",
      "effects": [ { "target": "enemy", "type": "stun_draw_if_max", "value": 1 } ]
    },
    {
      "id": "ghost_silence_end", "name": "サイレンス・エンド (SILENCE END)", "cost": 3, "category": "ACOUSTIC", "type": "attack", "noise": -2, "stance_change": null, "isExhaust": true,
      "flavor": "「すべてのテープを止め、すべての幻聴を消し、最後に残った無音そのものを叩きつける。再び音が戻る頃には、敵の再生装置は二度と回らない。」",
      "effects": [ { "target": "enemy", "type": "damage_silence_bonus", "value": 9, "per": 6 } ]
    },
    /* ==== カードプール大拡充バッチC: GHOST-TAPE 専用プール +12種（設計書 DESIGN-POOL-EXPANSION2-DRAFT.md §4、6→18種） ====
       基盤プリミティブはバッチBで先行実装済み:
       damage_hold_bonus = 保持中（保持実体あり／保持割引ターン）なら +per（参照系）。
       damage_per_negative_noise = 基礎値＋逆位相の深さ（max(0, −開始時NOISE)）×per（変換系・固定レート）。
       power kind "vent_per_turn" = ターン開始時に NOISE −value。requirement "self_noise_le_0" = 使用時NOISE 0以下。 */
    {
      "id": "ghost_hold_echo", "name": "保持残響 (HELD ECHO)", "cost": 1, "category": "ACOUSTIC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「磁気ホールドに残した一節を、再生ヘッドへかけたまま撃ち出す。留めたはずの音が穿孔の衝撃に重なり、一撃が二重に響いて装甲を穿つ。」",
      "effects": [ { "target": "enemy", "type": "damage_hold_bonus", "value": 5, "per": 6 } ]
    },
    {
      "id": "ghost_deep_reverse", "name": "深逆位相 (DEEP REVERSE)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": -3, "stance_change": null,
      "flavor": "「駆動音と正反対の波形を重ね、音を音で食い殺して静寂を深く掘る。消えた音の分だけ敵の耳は遠のき、薄い防壁より確実に身を守る。」",
      "effects": [ { "target": "player", "type": "block", "value": 4 } ]
    },
    {
      "id": "ghost_negative_wave", "name": "負の波形 (NEGATIVE WAVE)", "cost": 2, "category": "ACOUSTIC", "type": "attack", "noise": -1, "stance_change": null,
      "flavor": "「溜め込んだ逆位相の残量を反転増幅し、負の波形のまま撃ち出す。静けさは空白ではない。押し潰す力を持った、音の影だ。」",
      "effects": [ { "target": "enemy", "type": "damage_per_negative_noise", "value": 4, "per": 4 } ]
    },
    {
      "id": "ghost_static_burst", "name": "静電バースト (STATIC BURST)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「テープに溜まった静電気を放ち、敵の照準系へ雑音を紛れ込ませる。パチ、パチ。乱れた照準は、敵の次の二撃を半分に鈍らせる。」",
      "effects": [ { "target": "enemy", "type": "scrap_noise", "value": 2 } ]
    },
    {
      "id": "ghost_loop_play", "name": "ループ再生 (LOOP PLAY)", "cost": 2, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「同じ一節を繰り返し再生し、聞き逃した声を拾い直す。何度でも聞き直すのが聞き手の仕事だ。耳が回線に慣れるほど、次の声は早く届く。」",
      "effects": [ { "target": "player", "type": "recycle_discard", "value": 1 }, { "target": "player", "type": "draw_bonus_next", "value": 1 } ]
    },
    {
      "id": "ghost_whisper_net", "name": "囁きの網 (WHISPER NET)", "cost": 2, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「囁くほどの微かな音を二重の層にして敵の聴覚センサーへ流し込む。一層目は照準を逸らし、二層目はセンサーに絡みつく。次の二撃は、どちらも鈍る。」",
      "effects": [ { "target": "enemy", "type": "weaken_next", "value": 1 }, { "target": "enemy", "type": "scrap_noise", "value": 1 } ]
    },
    {
      "id": "ghost_tape_armor", "name": "テープ装甲 (TAPE ARMOR)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「磁気テープを装甲板へ幾重にも巻き重ね、柔らかな積層で衝撃をいなす。剥がせば何層にもなる、間に合わせだが本物の鎧だ。」",
      "effects": [ { "target": "player", "type": "block", "value": 8 } ]
    },
    {
      "id": "ghost_silence_field", "name": "静寂領域 (SILENCE FIELD)", "cost": 3, "category": "ACOUSTIC", "type": "skill", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「逆位相の波を途切れなく流し続け、自機の周囲にだけ静寂の領域を保つ。駆動音は生まれた瞬間に打ち消され、戦いが続く限り静けさが途切れない。」",
      "effects": [ { "target": "player", "type": "power", "kind": "vent_per_turn", "value": 1, "powerId": "ghost_silence_field" } ]
    },
    {
      "id": "ghost_rewind_strike", "name": "巻き戻し撃 (REWIND HIT)", "cost": 1, "category": "ACOUSTIC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「リールを逆回転させ、終わったはずの一節を巻き戻しながら撃つ。使い終えた指示が手元へ戻る。過去は、聞き直せばまだ使える。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 6 }, { "target": "player", "type": "recycle_discard", "value": 1 } ]
    },
    {
      "id": "ghost_phantom_choir", "name": "幻聴合唱 (PHANTOM CHOIR)", "cost": 2, "category": "ACOUSTIC", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「幾重にも重ねた幻聴を、合唱のように敵の聴覚へ流し込む。重なり合う偽の音に演算は混乱して動きを止め、照準まで半拍ずれて鈍っていく。」",
      "effects": [ { "target": "enemy", "type": "stun_draw_if_max", "value": 1 }, { "target": "enemy", "type": "scrap_noise", "value": 1 } ]
    },
    {
      "id": "ghost_erase_head", "name": "消去ヘッド (ERASE HEAD)", "cost": 1, "category": "ACOUSTIC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「記録を消す消去ヘッドを、敵の装甲へ直接押し当てる。強磁場に焼かれて制御記録が乱れれば、装甲の締結は緩み、打撃は深く通るようになる。」",
      "effects": [ { "target": "enemy", "type": "vulnerable", "value": 2 } ]
    },
    {
      "id": "ghost_zero_point", "name": "ゼロポイント (ZERO POINT)", "cost": 3, "category": "ACOUSTIC", "type": "attack", "noise": -3, "stance_change": null, "isExhaust": true,
      "requirements": ["self_noise_le_0"],
      "flavor": "「逆位相の残量を極限まで溜め込み、施設のあらゆる駆動音が消え去った一瞬に、たった一発の穿孔音だけを響かせる。静寂の中で打たれた孔は、どんな防壁よりも深く突き刺さる。」",
      "effects": [ { "target": "enemy", "type": "damage_silence_bonus", "value": 12, "per": 8 } ]
    },
    /* ==== 正式版: VESSEL 13 "WEAVER" 専用カード（設計書 DESIGN-WEAVER-DRAFT.md §3 本人設計＋
       実装追補 DESIGN-WEAVER-IMPL-ADDENDUM.md §4 専用プール叩き台、2026-11-16 本人一括GO） ====
       カテゴリは TRAP／HVY／DEF／TEC（CQC の自動スタン+1 を避ける。GHOST-TAPE の ACOUSTIC と同じ理由）。
       新規効果タイプ:
       trap = 即時効果ではなく state.traps へ設置し、敵ターンの resolveTrapsBeforeAction で条件発動する。
         { kind, trigger: "attack"|"any"|"nonattack", minNoise, damage, cut, stun, cancel } を保持する。
       reposition = 設置中の罠1つを pendingPick（kind "reposition"）経由で手札へ戻し、value 枚ドロー。
       detonate_all = 設置中の罠をすべて条件無視で即時発動（総起爆）。解決は js/battle.js。 */
    {
      "id": "weaver_laying_arm", "name": "敷設アーム打撃 (LAYING ARM STRIKE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「格闘用の拳はない。ケーブル敷設用の重いボビンアームを、敵の装甲に直接叩きつける。打撃と同時にワイヤーを絡めとるため、嫌な金属音が響く。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 5 } ]
    },
    {
      "id": "weaver_armor_fold", "name": "装甲折りたたみ (ARMOR FOLD)", "cost": 0, "category": "DEF", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「蜘蛛のように多脚を折りたたみ、身をすくめる。得られる防護は僅かだが、電力を一切消費しないため、余剰電力装甲（パッシブ）を最大限に活かすことができる。」",
      "effects": [ { "target": "player", "type": "block", "value": 2 } ]
    },
    {
      "id": "weaver_barbed_wire", "name": "罠：迎撃鉄線 (TRAP: BARBED WIRE)", "cost": 1, "category": "TRAP", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「死線（ワイヤー）は張られた。こちらの動きに反応して無機質に突っ込んでくる警備AIなど、もはや鉄線に飛び込む虫と変わらない。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "barbed_wire", "trigger": "attack", "damage": 6, "cut": 3 } ]
    },
    {
      "id": "weaver_audio_mine", "name": "罠：集音地雷 (TRAP: AUDIO MINE)", "cost": 2, "category": "TRAP", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「特定の駆動音にのみ連動して起爆する、極めて悪趣味なアナログ地雷。爆音に釣られて踏み込んできた敵を、まとめて鉄クズに変える。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "audio_mine", "trigger": "any", "minNoise": 3, "damage": 10, "cancel": true } ]
    },
    {
      "id": "weaver_decoy_spin", "name": "囮の空回り (DECOY SPIN)", "cost": 0, "category": "TEC", "type": "skill", "noise": 3, "stance_change": null,
      "flavor": "「巨大なボビンを空転させ、意図的に耳障りな金属音を発生させる。無能なAIの視線をこちらに向けさせ、罠のど真ん中へ誘導するための死の囮（デコイ）。」",
      "effects": [ { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "weaver_double_wire", "name": "罠：二重鉄線 (DOUBLE WIRE)", "cost": 2, "category": "TRAP", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「一本目の死線は囮だ。跳ねて避けた先に、二本目が喉元で待っている。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "double_wire", "trigger": "attack", "damage": 10, "cut": 4 } ]
    },
    {
      "id": "weaver_echo_mine", "name": "罠：残響地雷 (ECHO MINE)", "cost": 1, "category": "TRAP", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「小さな音に小さく応える、控えめな地雷。だが積み重なった残響は、やがて敵の演算を止める。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "echo_mine", "trigger": "any", "minNoise": 2, "damage": 6, "stun": 1 } ]
    },
    {
      "id": "weaver_glue_wire", "name": "罠：粘着ワイヤー (GLUE WIRE)", "cost": 1, "category": "TRAP", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「撃たない敵にも、罠はある。油と接着剤を塗り込んだワイヤーは、動かない関節ほどよく絡む。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "glue_wire", "trigger": "nonattack", "stun": 2 } ]
    },
    {
      "id": "weaver_leg_lock", "name": "脚部ロック (LEG LOCK)", "cost": 1, "category": "DEF", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「多脚の関節をすべて固定し、機体そのものを要塞の杭に変える。動けない代わりに、倒れもしない。」",
      "effects": [ { "target": "player", "type": "block", "value": 10 } ]
    },
    {
      "id": "weaver_reposition", "name": "死線の再配置 (REPOSITION)", "cost": 0, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「張り直しを恥と思うな。罠師の仕事は、当てることではなく、外さないことだ。」",
      "effects": [ { "target": "player", "type": "reposition", "value": 1 } ]
    },
    {
      "id": "weaver_full_detonation", "name": "総起爆 (FULL DETONATION)", "cost": 2, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「待つことに飽きたのではない。全部まとめて、今ここで終わらせるだけだ。」",
      "effects": [ { "target": "field", "type": "detonate_all" } ]
    },
    /* ==== カードプール大拡充バッチC: WEAVER 専用プール +12種（設計書 DESIGN-POOL-EXPANSION2-DRAFT.md §5、6→18種） ====
       罠の新kind（alarm_wire／spark_trap／decoy_mine）と selfBlock／drawOnTrigger フィールド、
       trap_sacrifice_draw／block_per_trap／power kind "standby_armor_up" の基盤はバッチBで先行実装済み。
       power kind "trap_damage_up"（監視の目）だけは本バッチで battle.js へ最小のフックを追加した
       （罠の発動ダメージ適用箇所でのみ加算。圧力鍋等の applyTrapDamage 流用には乗らない）。 */
    {
      "id": "weaver_trip_alarm", "name": "罠：警報線 (TRAP: TRIP ALARM)", "cost": 0, "category": "TRAP", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「通路へ細い線を一本張る。触れた振動で敵は足を取られて止まり、こちらは即座に身を伏せて浅く受ける。殺さない線が、いちばん仕事をする。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "alarm_wire", "trigger": "any", "stun": 1, "selfBlock": 3 } ]
    },
    {
      "id": "weaver_spark_trap", "name": "罠：火花罠 (TRAP: SPARK TRAP)", "cost": 1, "category": "TRAP", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「敵の刃が届く寸前、接点が火花を散らして敵の装甲を焼き、目を眩ませる。威力の削れた一撃は、火花の幕越しに装甲で受ける。二重の備えが職人の流儀だ。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "spark_trap", "trigger": "attack", "damage": 4, "cut": 2, "selfBlock": 4 } ]
    },
    {
      "id": "weaver_heavy_echo_mine", "name": "罠：重残響地雷 (HEAVY ECHO MINE)", "cost": 2, "category": "TRAP", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「起爆装置の耳は、わざと鈍く作る。大きな駆動音にしか目覚めない地雷は、静かな戦いでは眠り続け、騒音の極みでだけ敵に合わせて起きる。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "echo_mine", "trigger": "any", "minNoise": 4, "damage": 9, "stun": 1 } ]
    },
    {
      "id": "weaver_decoy_mine", "name": "罠：囮地雷 (DECOY MINE)", "cost": 1, "category": "TRAP", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「中身のない偽の地雷を、あえて目立つ場所へ置く。踏んだ敵が爆発を警戒して足を止める、その隙に回線の向こうから次の指示を受け取る。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "decoy_mine", "trigger": "any", "drawOnTrigger": 1 } ]
    },
    {
      "id": "weaver_silent_wire", "name": "罠：無音鉄線 (SILENT WIRE)", "cost": 1, "category": "TRAP", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「音を立てぬよう極細の線を張り、気づかれないまま敵の突進を受け止める。細い線は深く食い込み、攻撃の勢いを大きく削いでから静かに千切れる。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "barbed_wire", "trigger": "attack", "damage": 4, "cut": 4 } ]
    },
    {
      "id": "weaver_net_launcher", "name": "網の展開 (NET CAST)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「仕掛ける暇がないなら、手ずから網を投げる。網は敵に絡んで動きを止め、余った端は自機の前の盾になる。職人は手段を選ばない。」",
      "effects": [ { "target": "enemy", "type": "stun", "value": 1 }, { "target": "player", "type": "block", "value": 3 } ]
    },
    {
      "id": "weaver_spare_parts", "name": "予備部品 (SPARE PARTS)", "cost": 0, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「張り終えた罠を静かに解体し、歯車も線も部品へ戻す。戻した材料と空いた手で、回線の向こうから次の指示を二つ続けて受け取る。」",
      "effects": [ { "target": "player", "type": "trap_sacrifice_draw", "value": 2 } ]
    },
    {
      "id": "weaver_bunker_mode", "name": "塹壕モード (BUNKER MODE)", "cost": 3, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「余剰電力を脚の固定と装甲の増圧へ回す回路を組み替える。動かない構えのまま、余った電力のすべてが防壁に変わる。塹壕は、掘らずに建てる。」",
      "effects": [ { "target": "player", "type": "power", "kind": "standby_armor_up", "value": 2, "powerId": "weaver_bunker_mode" } ]
    },
    {
      "id": "weaver_leg_brace", "name": "脚部補強 (LEG BRACE)", "cost": 1, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「設置した罠の固定杭と多脚をワイヤーで連結し、仕掛け全体で自機を支える。罠が並ぶほど脚は太く根を張り、簡単には倒れなくなる。」",
      "effects": [ { "target": "player", "type": "block_per_trap", "value": 6, "per": 2, "cap": 6 } ]
    },
    {
      "id": "weaver_overwatch", "name": "監視の目 (OVERWATCH)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「張った罠の張力を絶えず見張り、緩みをその場で締め直し続ける。職人の目が届いている仕掛けは、発動の瞬間にわずかだが確実に深く噛む。」",
      "effects": [ { "target": "player", "type": "power", "kind": "trap_damage_up", "value": 1, "powerId": "weaver_overwatch" } ]
    },
    {
      "id": "weaver_final_web", "name": "罠：最後の網 (FINAL WEB)", "cost": 3, "category": "TRAP", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「持ち得る限りの死線を束ね、幾重にも編み上げた生涯最大の鉄線。敵の全力の一撃を受け止めてなお千切れず、食い込んだ線が装甲を深く切り裂く。」",
      "effects": [ { "target": "field", "type": "trap", "kind": "barbed_wire", "trigger": "attack", "damage": 14, "cut": 6 } ]
    },
    {
      "id": "weaver_patient_hunter", "name": "待つ者の構え (PATIENT)", "cost": 0, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「多脚を折って身を低くし、罠の影へ溶け込むように伏せる。仕掛けが多いほど影は増える。待つ者に、無駄な音はひとつもない。」",
      "effects": [ { "target": "player", "type": "block_per_trap", "value": 2, "per": 2, "cap": 6 } ]
    },
    /* ==== カードプール大拡充バッチC: VESSEL 07 専用プール 新設12種（設計書 DESIGN-POOL-EXPANSION2-DRAFT.md §2） ====
       専用軸は「型」: CQCの連鎖（damage_plus_played）／スタン蓄積から制圧への段取り
       （requirement target_stun_ge_1）／スタンス両読み（damage_stance_bonus）／基本技の完成度。
       CQC カテゴリは使用時に敵スタン+1が自動で乗る（battle.js 仕様。設計書の遵守ルール6で織り込み済み）。
       next_attack_bonus（迎撃の構え）の基盤はバッチBで先行実装済み。 */
    {
      "id": "v07_form_strike", "name": "型・一の太刀 (FORM ONE)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「一の太刀は全ての型の起点に置かれた、最も単純な斬撃。だが先に動いた歯車の勢いは消えず、この一撃へ順に乗り移っていく。繋いだ分だけ重くなる。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_played", "value": 5, "per": 2 } ]
    },
    {
      "id": "v07_form_guard", "name": "型・二の構え (FORM TWO)", "cost": 1, "category": "TACTIC", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「二の構えは盾となる腕を前に置き、重心を低く沈めるだけの防御。派手な機構は何もない。だが量産機の基本動作は、実戦で磨かれて隙が少ない。」",
      "effects": [ { "target": "player", "type": "block", "value": 7 } ]
    },
    {
      "id": "v07_breath_control", "name": "呼吸法 (BREATH)", "cost": 0, "category": "TEC", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「穿孔のリズムを呼吸に合わせ、歯車の回転を半拍だけ落とす。駆動音が静まる間に身を守り、次の孔の並びを落ち着いて見極める。戦いの半分は呼吸だ。」",
      "effects": [ { "target": "player", "type": "block", "value": 2 }, { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "v07_chain_kick", "name": "連撃脚 (CHAIN KICK)", "cost": 2, "category": "CQC", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「左右の脚を交互に叩き込み、敵の重心を揺さぶり続ける連撃。最後の一撃で姿勢が崩れた敵は装甲の継ぎ目を晒し、次の打撃を通しやすくなる。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 4, "hits": 2 }, { "target": "enemy", "type": "vulnerable", "value": 1 } ]
    },
    {
      "id": "v07_feint", "name": "捨て身のフェイント (FEINT)", "cost": 1, "category": "CQC", "type": "skill", "noise": 1, "stance_change": "EXPOSE",
      "flavor": "「わざと装甲を開き、敵の攻撃を誘い込む捨て身の見せかけ。読みやすい一撃は受け流しやすく、敵が振りかぶる隙に次の穿孔の準備まで整ってしまう。」",
      "effects": [ { "target": "enemy", "type": "weaken_next", "value": 1 }, { "target": "player", "type": "draw", "value": 1 } ]
    },
    {
      "id": "v07_pursuit", "name": "追撃の型 (PURSUIT)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "requirements": ["target_stun_ge_1"],
      "flavor": "「怯んだ敵は装甲の合わせ目を開く。追撃の型はその一瞬のために磨かれた手順で、崩れた姿勢の隙間へ迷いなく刃を滑り込ませていく。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 9 } ]
    },
    {
      "id": "v07_execution", "name": "止めの一閃 (EXECUTION)", "cost": 2, "category": "CQC", "type": "attack", "noise": 2, "stance_change": null,
      "requirements": ["target_stun_ge_1"],
      "flavor": "「駆動系の全出力を一閃に絞り、怯んだ敵の中枢へ叩き込む止めの型。動けない相手にだけ許される、量産機の持つ最大の斬撃が静かに走る。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 18 } ]
    },
    {
      "id": "v07_counter_stance", "name": "迎撃の構え (COUNTER)", "cost": 1, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「受けるための構えは、同時に殴るための溜めでもある。衝撃を油圧アキュムレータに蓄え、次の攻撃へそのまま上乗せする。型とは無駄のない仕組みだ。」",
      "effects": [ { "target": "player", "type": "block", "value": 6 }, { "target": "player", "type": "next_attack_bonus", "value": 4 } ]
    },
    {
      "id": "v07_shadow_step", "name": "影縫い (SHADOW STEP)", "cost": 1, "category": "CQC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「光の下に晒された素体の影は長く伸びる。その影を縫うように死角へ滑り込み、センサーが本体を追う間に懐へ刃を届かせる古い歩法。」",
      "effects": [ { "target": "enemy", "type": "damage_stance_bonus", "value": 4, "per": 4, "stance": "EXPOSE" } ]
    },
    {
      "id": "v07_field_manual", "name": "戦場の教本 (FIELD MANUAL)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「使い古された教本には、現場で使える孔の並びだけが残されている。その手順書を繰る手が速くなるほど、次の指令も早く箔へ打ち込めるようになる。」",
      "effects": [ { "target": "player", "type": "draw", "value": 2 }, { "target": "player", "type": "draw_bonus_next", "value": 1 } ]
    },
    {
      "id": "v07_silent_kill", "name": "静寂の仕留め (SILENT KILL)", "cost": 2, "category": "CQC", "type": "attack", "noise": 0, "stance_change": null,
      "flavor": "「駆動音を殺し、蓄圧だけを解放して刃を押し込む最も古い仕留め方。装甲の表面で止まらず、静寂のまま内部の機構まで刃が届いていく。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 8, "pierce": true } ]
    },
    {
      "id": "v07_mastery", "name": "最後の型・皆伝 (MASTERY)", "cost": 3, "category": "CQC", "type": "attack", "noise": 3, "stance_change": null, "isExhaust": true,
      "flavor": "「皆伝とは、学んだ全ての型を順に繋ぎ、最後の一撃へ畳み込む免許だ。この一巡で繋いだ型の一つ一つが、この斬撃の重さに名を連ねている。」",
      "effects": [ { "target": "enemy", "type": "damage_plus_played", "value": 6, "per": 4 } ]
    },
    /* ==== 正式版: VESSEL 00 "REACTOR" 初期デッキ4種＋専用プール18種（設計書 DESIGN-REACTOR-DRAFT.md §3 本人設計＋
       DESIGN-POOL-EXPANSION2-DRAFT.md §6、実装追補 DESIGN-REACTOR-IMPL-ADDENDUM.md、2026-11-17 本人決定） ====
       カテゴリは HVY／DEF／TEC（CQC の自動スタン+1 を避ける。GHOST-TAPE／WEAVER と同じ理由）。
       新規効果タイプ（解決は js/battle.js）:
       purge_start = 臨界排熱を始動する（炉心臨界専用。以後、廃棄カードを使うたび purgeCount +1）。
       damage_per_hp_lost = 基礎値＋floor（減少HP ÷ perHp）。perHp は除数（既存 per＝乗数と意味が逆。取り違え防止に別名）。
       damage_per_slip = 基礎値＋現在の臨界カウンタ×per。
       damage_equal_hp_fraction = 基礎値＋floor（現在HP ÷ denom）を敵へ、同値を自傷として受ける。
       purge_reduce = 臨界カウンタを value 下げる（下限0。与ダメ蓄積とスリップが連動して下がる）。
       draw_if_hp_le = HP割合が threshold 以下なら bonus 枚、そうでなければ value 枚ドロー。
       power kind "slip_halve" = ターン終了時のスリップダメージを半減（切り上げ）。 */
    {
      "id": "reactor_melt_strike", "name": "溶断打撃 (MELT-CUT)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「通常のマニピュレーターではない。むき出しになった超高熱のジェネレーター・コアを、直接敵の装甲に押し付ける。切るでも殴るでもない、純粋な『溶断』。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 5 } ]
    },
    {
      "id": "reactor_coolant", "name": "強制冷却 (COOLANT)", "cost": 1, "category": "DEF", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「機体の隙間から有毒な冷却液を撒き散らし、一時的な熱の壁と静寂を作る。しかし、根本的な炉心の暴走はすでに誰にも止められない。」",
      "effects": [ { "target": "player", "type": "block", "value": 4 } ]
    },
    {
      "id": "reactor_core_critical", "name": "炉心臨界 (CORE CRITICAL)", "cost": 0, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「安全弁を物理的に破壊し、致死量の熱量と電力を強制的に引き出す。焼け焦げた神経接続から伝わる激痛は、この機体がまだ生きているという唯一の証明だ。」",
      "effects": [ { "target": "player", "type": "damage", "value": 10 }, { "target": "player", "type": "add_energy", "value": 3, "overcharge": true }, { "target": "player", "type": "purge_start", "value": 1 } ]
    },
    {
      "id": "reactor_radiant_strike", "name": "放射熱撃 (RADIANT)", "cost": 2, "category": "HVY", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「失われた装甲の隙間から漏れ出す超高熱を、そのまま光線のように放つ。機体が死に近づき、ボロボロに砕け散るほど、その熱量は美しく凶悪に輝く。」",
      "effects": [ { "target": "enemy", "type": "damage_per_hp_lost", "value": 4, "perHp": 2 } ]
    },
    {
      "id": "reactor_heat_claw", "name": "熱爪 (HEAT CLAW)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「炉心の熱で赤く膨らんだ爪は、掴むのではなく触れた先から溶かし切る。機体が傷つき熱の回りが狂うほど、爪の溶断は深く、速くなる。」",
      "effects": [ { "target": "enemy", "type": "damage_per_hp_lost", "value": 5, "perHp": 4 } ]
    },
    {
      "id": "reactor_slag_armor", "name": "スラグ装甲 (SLAG ARMOR)", "cost": 1, "category": "DEF", "type": "skill", "noise": 0, "stance_change": null,
      "flavor": "「熱で溶けた装甲をあえて流し、冷えて固まったスラグを新たな鎧とする。溶融と凝固を繰り返した層は硬い。ただし固まるまでの熱は、内側も焼く。」",
      "effects": [ { "target": "player", "type": "block", "value": 5 }, { "target": "player", "type": "damage", "value": 2 } ]
    },
    {
      "id": "reactor_vent_blast", "name": "排熱ブラスト (VENT BLAST)", "cost": 2, "category": "TEC", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「行き場を失った排熱を安全弁から一方向へ噴き出させ、炎の圧力ごと敵へ叩きつける。溜め込んだ代償が深いほど、噴き出す熱は重くなる。」",
      "effects": [ { "target": "enemy", "type": "damage_per_slip", "value": 4, "per": 3 } ]
    },
    {
      "id": "reactor_coolant_flush", "name": "冷却液フラッシュ (COOLANT FLUSH)", "cost": 1, "category": "TEC", "type": "skill", "noise": -1, "stance_change": null, "isExhaust": true,
      "flavor": "「冷却液を一気に循環させ、暴走する炉心を無理やり冷ます。熱を捨てれば命は延びる。だが力は熱そのものだ。捨てた分だけ、確実に弱くなる。」",
      "effects": [ { "target": "player", "type": "purge_reduce", "value": 2 }, { "target": "player", "type": "block", "value": 4 } ]
    },
    {
      "id": "reactor_chain_reaction", "name": "連鎖反応 (CHAIN REACTION)", "cost": 0, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null,
      "flavor": "「炉心の反応は、一度始まれば次の反応を呼び続ける。回線の向こうからの指示も、上がり続ける熱も、焼けていく自機の傷も、誰にも止められない。」",
      "effects": [ { "target": "player", "type": "draw", "value": 2 }, { "target": "player", "type": "damage", "value": 4 } ]
    },
    {
      "id": "reactor_meltdown_rush", "name": "溶融突撃 (MELTDOWN RUSH)", "cost": 2, "category": "HVY", "type": "attack", "noise": 2, "stance_change": null,
      "flavor": "「装甲の継ぎ目が溶け始めた体で、そのまま全質量を敵へ叩き込む。突撃の熱と衝撃で自機も焼ける。だが止まれる頃には、敵の方が先に溶けている。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 12 }, { "target": "player", "type": "damage", "value": 3 } ]
    },
    {
      "id": "reactor_ember_regen", "name": "残り火の再生 (EMBER REGEN)", "cost": 2, "category": "TEC", "type": "skill", "noise": 0, "stance_change": null, "isExhaust": true,
      "flavor": "「消えかけの残り火を掻き集め、熱を落として機体の修復へ回す。完全に冷えればただの鉄屑だ。まだ熱いうちにしか、再生の余地は残っていない。」",
      "effects": [ { "target": "player", "type": "heal", "value": 6 }, { "target": "player", "type": "purge_reduce", "value": 1 } ]
    },
    {
      "id": "reactor_pressure_valve", "name": "圧力弁 (PRESSURE VALVE)", "cost": 0, "category": "DEF", "type": "skill", "noise": -1, "stance_change": null,
      "flavor": "「小さな圧力弁を細かく開閉し、炉心の圧力を少しずつ逃がして身を守る。弁ひとつの加減が、爆発と延命の境目を決める地味で確かな仕事だ。」",
      "effects": [ { "target": "player", "type": "block", "value": 3 }, { "target": "player", "type": "purge_reduce", "value": 1 } ]
    },
    {
      "id": "reactor_overheat_strike", "name": "過熱撃 (OVERHEAT STRIKE)", "cost": 1, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「熱で膨張した関節は、設計を超えた速度と力で軋みながら動く。溜まった熱が深いほど一撃は重い。だが関節の寿命も、同じだけ削れている。」",
      "effects": [ { "target": "enemy", "type": "damage_per_slip", "value": 3, "per": 2 } ]
    },
    {
      "id": "reactor_core_surge", "name": "炉心サージ (CORE SURGE)", "cost": 0, "category": "TEC", "type": "skill", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「炉心の出力弁を直接開き、定格を超えた電力を回路へ流し込む。炉心臨界ほど大げさな真似ではない。だが内側が焼ける痛みは、寸分も変わらない。」",
      "effects": [ { "target": "player", "type": "add_energy", "value": 3, "overcharge": true }, { "target": "player", "type": "damage", "value": 6 } ]
    },
    {
      "id": "reactor_radiant_nova", "name": "放射新星 (RADIANT NOVA)", "cost": 3, "category": "HVY", "type": "attack", "noise": 3, "stance_change": null, "isExhaust": true,
      "flavor": "「失われた装甲の隙間から漏れる熱を、一度に全開放する。欠けた分だけ熱は激しく噴き上がり、死に際の星のように、敵もろとも戦場を焼く。」",
      "effects": [ { "target": "enemy", "type": "damage_per_hp_lost", "value": 6, "perHp": 1 } ]
    },
    {
      "id": "reactor_ash_guard", "name": "灰の防壁 (ASH GUARD)", "cost": 2, "category": "DEF", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「燃え尽きた灰の層は、熱を通さない確かな断熱材になる。自機の焼け跡を掻き集めて厚く塗り、敵の火力も自らの熱も遮る。自分が灰になる、その前に。」",
      "effects": [ { "target": "player", "type": "block", "value": 13 } ]
    },
    {
      "id": "reactor_heat_sink", "name": "ヒートシンク (HEAT SINK)", "cost": 2, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「装甲の内側に放熱板を展開し、溜まった熱の逃げ道を無理やり作る。熱を捨て切ることはできない。だが焼け死ぬまでの時間だけは、確実に買える。」",
      "effects": [ { "target": "player", "type": "power", "kind": "slip_halve", "value": 1, "powerId": "reactor_heat_sink" } ]
    },
    {
      "id": "reactor_burn_out", "name": "燃え尽き (BURN OUT)", "cost": 2, "category": "HVY", "type": "attack", "noise": 2, "stance_change": null, "isExhaust": true,
      "flavor": "「残りの命そのものを燃料へ変え、炉心の全出力を一度に解き放つ。満ちているほど大きく燃え、敵の装甲も自機の未来も、区別なく焼き尽くす。」",
      "effects": [ { "target": "enemy", "type": "damage_equal_hp_fraction", "value": 10, "denom": 2 } ]
    },
    {
      "id": "reactor_quick_melt", "name": "急速溶断 (QUICK MELT)", "cost": 0, "category": "HVY", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「炉心の熱を細く絞り、小さく速い溶断を立て続けに走らせる。一撃の浅さは回数で補う。溶断とは本来、時間をかけて深くしていく仕事だ。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 4 } ]
    },
    {
      "id": "reactor_second_heart", "name": "第二の心臓 (SECOND HEART)", "cost": 3, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null, "isExhaust": true,
      "flavor": "「補助炉を常時駆動させ、本来の炉心とは別に電力を生み続ける。第二の心臓は止まることを知らない。代わりに、熱が冷めることも二度とない。」",
      "effects": [ { "target": "player", "type": "power", "kind": "energy_per_turn", "value": 1, "powerId": "reactor_second_heart" } ]
    },
    {
      "id": "reactor_grave_heat", "name": "墓標の熱 (GRAVE HEAT)", "cost": 2, "category": "TEC", "type": "attack", "noise": 1, "stance_change": null,
      "flavor": "「熱で膨張し変形した関節の一撃は、敵の駆動系まで歪ませて動きを止める。二度と元に戻らない変形は、この機体の歩いた道の墓標として残る。」",
      "effects": [ { "target": "enemy", "type": "damage", "value": 6 }, { "target": "enemy", "type": "stun", "value": 1 } ]
    },
    {
      "id": "reactor_last_light", "name": "最後の灯 (LAST LIGHT)", "cost": 1, "category": "TEC", "type": "skill", "noise": 1, "stance_change": null,
      "flavor": "「消えかけた炉心は、最後に一度だけ大きく燃え上がる。熱に浮かされた回線の感度が跳ね上がり、向こうからの指示が矢継ぎ早に届くようになる。」",
      "effects": [ { "target": "player", "type": "draw_if_hp_le", "value": 1, "bonus": 3, "threshold": 0.25 } ]
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
      // プール大拡充バッチB（2026-11-17）: RAW の requirements を保持する（従来は常に [] に潰していた。
      // target_stun_ge_1 等の既存 requirement と self_noise_le_0 をカード定義側から使えるようにする）
      requirements: Object.freeze((raw.requirements || []).slice()),
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
