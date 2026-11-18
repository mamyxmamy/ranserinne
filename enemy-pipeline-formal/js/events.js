/* Field transmissions. A choice applies its effects, then the epilogue
   stays on screen until the carrier is closed. */

(function (root) {
  const RAW = [
    {
      id: "event_dead_vessel",
      title: "廃棄された同業者",
      text: "暗号化された通信を傍受した。座標に向かうと、完全に沈黙した他陣営の素体（Vessel）が転がっていた。首のコネクタからはまだ微かに青いオイルが漏れている。…まだ使えそうな部品が残っているようだ。",
      choices: [
        {
          label: "バッテリーを奪う",
          flavor: "「同情は命を短くする。こいつの残機は俺が貰う」",
          effect_text: "HPを 15 回復する。",
          effects: [{ type: "heal", value: 15 }],
          result_text: "錆びついたラッチを引きちぎり、バッテリーを引き抜く。漏れ出した青いオイルが素体の装甲を焦がしたが、動力は確かに息を吹き返した。",
        },
        {
          label: "メモリーチップを引き抜く",
          flavor: "「死人に知る権利はない。情報は俺が有効活用してやる」",
          effect_text: "強力なカードを1枚得る。10 ダメージを受ける。",
          effects: [{ type: "take_damage", value: 10 }, { type: "add_card", rarity: "rare", value: 1 }],
          result_text: "チップを引き抜いた瞬間、防壁AIの罠（自己崩壊プロトコル）が作動した！強烈な電磁パルスが素体の網膜を焼き、アナログ回線を通じてパンドラ自身の脳を激しく揺さぶる。だが、引き換えに貴重な戦術データを手に入れた。",
        },
        {
          label: "立ち去る",
          flavor: "「出来すぎた話だ。防壁AIの罠の匂いがする」",
          effect_text: "何もせず立ち去る。",
          effects: [{ type: "none" }],
          result_text: "罠の匂いしかしない。パンドラは無造作に踵を返し、そのガラクタを永遠の沈黙の中に置き去りにした。",
        },
      ],
    },
    {
      id: "event_junk_dealer",
      title: "闇のジャンク屋『ラットホール』",
      text: "違法なアナログ回線を通じて、ノイズまみれの音声が響く。『良い\u201d部品（レリック）\u201dが入ったぜ、ハンドラー。代金は…お前の素体の寿命でどうだ？』",
      choices: [
        {
          label: "寿命で支払う",
          flavor: "「安い取引だ。どうせ長く生かすつもりはない」",
          effect_text: "最大HPが 8 減少する。ランダムなレリックを獲得する。",
          effects: [{ type: "lose_max_hp", value: 8 }, { type: "add_relic", value: 1 }],
          result_text: "『毎度あり…』ノイズまみれの笑い声と共に、素体のシステム領域の一部が強制的に削り取られた。代償として、パイプラインから違法な強化パーツのデータが転送されてくる。",
        },
        {
          label: "通信を切る",
          flavor: "「あいにく、今日は持ち合わせがない」",
          effect_text: "何もせず立ち去る。",
          effects: [{ type: "none" }],
          result_text: "パンドラは無言でアナログ回線を物理的に切断した。ジャンク屋の舌打ちは、ノイズの海に消えていった。",
        },
      ],
    },
  ];

  function freezeChoice(choice) {
    return Object.freeze({
      ...choice,
      effects: Object.freeze((choice.effects || []).map((effect) => Object.freeze({ ...effect }))),
    });
  }

  const CATALOG = Object.freeze(RAW.map((event) => Object.freeze({
    ...event,
    choices: Object.freeze(event.choices.map(freezeChoice)),
  })));

  const byId = new Map(CATALOG.map((event) => [event.id, event]));

  function get(id) {
    return byId.get(id) || null;
  }

  function forNode(node) {
    if (!CATALOG.length) return null;
    const index = node && Number.isFinite(Number(node.index)) ? Math.abs(node.index | 0) : 0;
    return CATALOG[index % CATALOG.length];
  }

  /* 第0陣 0-7 (R-15): ジャンク屋（add_relic を含む選択肢）の事前判定。
     支払いが発生する前に「渡せる部品があるか／枠が満杯か／入れ替え可能か」が分かるようにする。
     判定は Relics.candidates("normal")（通常プールのみ・R-6）に一本化する。 */
  function relicDeal(run) {
    const owned = run && Array.isArray(run.relics) ? run.relics : [];
    if (!run || !root.Relics) return { candidates: 0, full: false, removable: 0 };
    const cands = root.Relics.candidates("normal", {
      owned, lost: run.relicsLost, character: run.character,
    });
    return {
      candidates: cands.length,
      full: !root.Relics.hasRoom(owned),
      removable: owned.filter((id) => root.Relics.canRemove(owned, id)).length,
    };
  }

  function choiceHasRelic(choice) {
    return !!choice && (choice.effects || []).some((effect) => effect.type === "add_relic");
  }

  function cardPool(rarity) {
    const pool = (root.Rewards && root.Rewards.POOL) || [];
    if (!rarity) return pool.slice();
    const matched = pool.filter((card) => card.rarity === rarity);
    return matched.length ? matched.slice() : pool.slice();
  }

  function apply(run, choice, rng, opts) {
    const random = typeof rng === "function" ? rng : Math.random;
    const logs = [];
    const notes = [];
    const grantedRelics = [];
    const addedCards = [];
    if (!run || !choice) {
      return { logs, notes, note: "", grantedRelics, addedCards, dead: false };
    }
    /* 第0陣 0-7 (R-15): 事前判定の最終ガード。add_relic を含む選択肢で候補が枯渇している場合は、
       効果を一切適用せず（最大HPの支払いも発生させず）取引不成立として返す。
       UI 側でも選択肢を無効化するが、ここでも保証して二重に防ぐ。 */
    if (choiceHasRelic(choice) && relicDeal(run).candidates <= 0) {
      logs.push("RELIC  空きなし");
      notes.push("渡せる部品はもう残っていない。取引は成立しなかった。");
      return { logs, notes, note: notes.join(""), grantedRelics, addedCards, dead: false, blocked: "relic_pool_empty" };
    }
    for (const effect of choice.effects || []) {
      if (effect.type === "heal") {
        const before = run.hp;
        const amount = effect.value | 0;
        run.hp = Math.min(run.hpMax, Math.max(0, before) + amount);
        const gained = run.hp - before;
        logs.push(gained > 0 ? `HEAL  HP ${before} > ${run.hp}` : "HEAL  HP FULL");
        notes.push(gained > 0 ? `耐久が ${gained} 戻った。` : "耐久は既に満タンだ。");
      } else if (effect.type === "take_damage") {
        const before = run.hp;
        const amount = effect.value | 0;
        run.hp = Math.max(0, before - amount);
        const dealt = before - run.hp;
        logs.push(`DMG ${dealt}  HP ${run.hp}`);
        notes.push(`耐久が ${dealt} 削れた。`);
      } else if (effect.type === "add_card") {
        const count = Math.max(1, effect.value | 0);
        const pool = cardPool(effect.rarity);
        if (!Array.isArray(run.deck)) run.deck = [];
        for (let i = 0; i < count; i += 1) {
          if (!pool.length || !root.Rewards) break;
          const card = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
          if (!root.Rewards.grant(run.deck, card.id)) continue;
          addedCards.push(card.id);
          logs.push(`DECK +1  ${card.name}`);
          notes.push(`${card.name} をデッキに加えた。`);
        }
      } else if (effect.type === "lose_max_hp") {
        const beforeMax = run.hpMax;
        const beforeHp = run.hp;
        run.hpMax = Math.max(1, beforeMax - (effect.value | 0));
        if (run.hp > run.hpMax) run.hp = run.hpMax;
        const lost = beforeMax - run.hpMax;
        logs.push(`MAXHP -${lost}  HP ${run.hp}/${run.hpMax}`);
        notes.push(lost > 0 ? `最大耐久が ${lost} 削れた。` : "最大耐久はこれ以上削れない。");
        if (beforeHp !== run.hp) notes.push(`耐久は ${run.hp} まで落ちた。`);
      } else if (effect.type === "add_relic") {
        const count = Math.max(1, effect.value | 0);
        if (!Array.isArray(run.relics)) run.relics = [];
        if (!Array.isArray(run.relicsLost)) run.relicsLost = [];
        /* 第0陣 0-7 (U-2): 枠満杯時は UI 側で先に引いた1つを、指定された所持レリックと
           入れ替えて受け取る（opts.relicExchange = { outId, relicId }）。支払い（この選択肢の
           lose_max_hp）は効果順どおり先に適用済みで、入れ替えは受け取りの段でのみ行う。 */
        if (opts && opts.relicExchange && root.Relics) {
          const swap = opts.relicExchange;
          const inRelic = root.Relics.resolve([swap.relicId])[0];
          const outRelic = root.Relics.resolve([swap.outId])[0];
          if (inRelic && outRelic && root.Relics.exchange(run.relics, run.relicsLost, swap.outId, swap.relicId)) {
            grantedRelics.push(inRelic.id);
            logs.push(`RELIC -1  ${outRelic.name} を切り離した`);
            logs.push(`RELIC +1  ${inRelic.name} を接続した`);
            notes.push(`${outRelic.name} を外し、${inRelic.name} を接続した。`);
          } else {
            logs.push("RELIC  空きなし");
            notes.push("接続枠に空きがなく、部品を受け取れなかった。");
          }
          continue;
        }
        for (let i = 0; i < count; i += 1) {
          // 第0陣 0-1: 抽選は Relics.draw("normal", ...) 経由に統一。ジャンク屋は通常プールのみ（R-6）、
          // 所持済み・喪失リスト・キャラ別除外（U-1 等）は candidates() 側で一括して外れる。
          const relic = root.Relics
            ? root.Relics.draw("normal", { owned: run.relics, lost: run.relicsLost, character: run.character, rng: random })
            : null;
          if (!relic) {
            logs.push("RELIC  空きなし");
            notes.push("渡された部品は、すでに素体へ繋がっている。");
            break;
          }
          if (!root.Relics.grant(run.relics, relic.id)) {
            // 第0陣 0-3: draw() が所持・喪失・除外を外した後で grant が失敗するのは枠満杯のみ。
            // 従来の continue は同じ候補集合で再抽選し続けて無限ループになるため、打ち切って結果を出す。
            logs.push("RELIC  空きなし");
            notes.push("接続枠に空きがなく、部品を受け取れなかった。");
            break;
          }
          grantedRelics.push(relic.id);
          // 第1陣: 接続ログは FINAL §1.5 の形式（RELIC +1  ○○ を接続した）へ統一する。
          // 第0陣の新規経路（0-5 提示・0-7 入れ替え）は同形式で先行実装済みで、本経路が最後の混在箇所。
          logs.push(`RELIC +1  ${relic.name} を接続した`);
          notes.push(`${relic.name} を接続した。`);
        }
      }
    }
    return {
      logs,
      notes,
      note: notes.join("") || choice.effect_text || "通信は切れた。",
      grantedRelics,
      addedCards,
      dead: run.hp <= 0,
    };
  }

  root.Events = { CATALOG, get, forNode, apply, relicDeal, choiceHasRelic };
})(typeof window !== "undefined" ? window : globalThis);
