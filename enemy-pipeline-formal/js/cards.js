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
