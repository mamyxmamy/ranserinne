/* Route tree and deepfake nodes.
   Floors run bottom to top: index 0 is floor 1, the last floor is the boss.
   The player stands on an origin below floor 1. UI text uses displayType
   until a node is revealed; entering a fake still resolves hiddenType. */

(function (root) {
  const TYPES = Object.freeze(["BATTLE", "ELITE", "SAFEHOUSE", "EVENT", "BOSS"]);
  const FAKE_CHANCE = 0.2;
  const SCAN_USES = 3;
  const DEFAULT_WIDTHS = Object.freeze([2, 3, 3, 2, 1]);
  const REST_HEAL = 18;

  const LABEL = Object.freeze({
    BATTLE: "戦闘",
    ELITE: "強敵",
    SAFEHOUSE: "休憩",
    EVENT: "通信",
    BOSS: "ボス",
    ORIGIN: "射出",
  });

  const CODE = Object.freeze({
    BATTLE: "BTL",
    ELITE: "ELT",
    SAFEHOUSE: "SAFE",
    EVENT: "EVNT",
    BOSS: "BOSS",
    ORIGIN: "IN",
  });

  const EVENT_LINES = Object.freeze([
    "救援を名乗る音声を破棄した",
    "パンチ残骸のみ。解読不能",
    "偽の座標を受信。経路は維持",
  ]);

  function randomOf(rng) {
    return typeof rng === "function" ? rng : Math.random;
  }

  function pick(list, rng) {
    const index = Math.min(list.length - 1, Math.floor(rng() * list.length));
    return list[index];
  }

  function fieldType(rng) {
    const n = rng();
    if (n < 0.45) return "BATTLE";
    if (n < 0.65) return "ELITE";
    if (n < 0.85) return "SAFEHOUSE";
    return "EVENT";
  }

  function disguise(hiddenType, rng) {
    const pool = TYPES.filter((type) => type !== hiddenType);
    return pick(pool, rng);
  }

  function makeNode(floor, index, hiddenType, rng, fakeChance) {
    const isFake = rng() < fakeChance;
    return {
      id: `f${floor}n${index}`,
      floor,
      index,
      hiddenType,
      displayType: isFake ? disguise(hiddenType, rng) : hiddenType,
      isFake,
      revealed: false,
      edges: [],
    };
  }

  function connect(from, to, links) {
    if (from.edges.includes(to.id)) return;
    from.edges.push(to.id);
    links.push({ from: from.id, to: to.id });
  }

  function linkAdjacent(lower, upper, rng, links) {
    for (let i = 0; i < upper.length; i += 1) {
      const parent = Math.min(lower.length - 1, Math.floor((i * lower.length) / upper.length));
      connect(lower[parent], upper[i], links);
    }
    for (let i = 0; i < lower.length; i += 1) {
      if (lower[i].edges.length > 0) continue;
      const child = Math.min(upper.length - 1, Math.floor((i * upper.length) / lower.length));
      connect(lower[i], upper[child], links);
    }
    for (let i = 0; i < lower.length; i += 1) {
      if (rng() >= 0.5) continue;
      const base = Math.min(upper.length - 1, Math.floor((i * upper.length) / lower.length));
      const delta = rng() < 0.5 ? -1 : 1;
      const child = Math.max(0, Math.min(upper.length - 1, base + delta));
      connect(lower[i], upper[child], links);
    }
  }

  function eliteIdFor(node) {
    const ids = root.Enemies && root.Enemies.ELITE_IDS;
    if (!ids || ids.length === 0) return null;
    const key = node && node.id ? node.id : "";
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
    return ids[hash % ids.length];
  }

  function encounterFor(node) {
    const type = node.hiddenType;
    if (type === "BATTLE") {
      return { kind: "combat", type, name: "サイボーグ哨戒兵", short: "哨戒兵", hp: 30 };
    }
    if (type === "ELITE") {
      const id = eliteIdFor(node);
      const profile = id && root.Enemies.get(id);
      if (!profile) return { kind: "combat", type, name: "強化哨戒兵", short: "強敵", hp: 48 };
      return {
        kind: "combat",
        type,
        enemyId: profile.id,
        name: profile.name,
        short: root.Enemies.short(profile.id),
        hp: profile.max_hp,
      };
    }
    if (type === "BOSS") {
      return { kind: "combat", type, enemyId: "enemy_gatekeeper", name: "重装甲サイボーグ『GATEKEEPER』", short: "GATEKEEPER", hp: 120, image: "assets/enemy_boss.svg" };
    }
    if (type === "SAFEHOUSE") return { kind: "rest", type, heal: REST_HEAL };
    const event = root.Events && root.Events.forNode(node);
    if (event) {
      return { kind: "event", type: "EVENT", eventId: event.id, title: event.title, text: event.text };
    }
    return {
      kind: "event",
      type: type || "EVENT",
      text: EVENT_LINES[node.index % EVENT_LINES.length],
    };
  }

  function generate(rng, options) {
    const random = randomOf(rng);
    const opts = options || {};
    const widths = Array.isArray(opts.widths) && opts.widths.length > 0
      ? opts.widths.map((n) => Math.max(1, n | 0))
      : DEFAULT_WIDTHS.slice();
    const fakeChance = opts.fakeChance == null ? FAKE_CHANCE : Math.min(1, Math.max(0, opts.fakeChance));
    const scans = opts.scansLeft == null ? SCAN_USES : Math.max(0, opts.scansLeft | 0);
    const floors = [];
    const nodes = {};
    const links = [];

    for (let f = 0; f < widths.length; f += 1) {
      const floorNum = f + 1;
      const isBoss = f === widths.length - 1;
      const row = [];
      for (let i = 0; i < widths[f]; i += 1) {
        let hidden = isBoss ? "BOSS" : fieldType(random);
      /* 検収修正 (2026-11-10): 1階にELITE（最大HP150級）を置くと、素の初期デッキでは
         初戦から詰みかけるため、1階のELITEは通常戦闘に置き換える。 */
      if (!isBoss && f === 0 && hidden === "ELITE") hidden = "BATTLE";
        const node = makeNode(floorNum, i, hidden, random, fakeChance);
        row.push(node);
        nodes[node.id] = node;
      }
      floors.push(row);
    }

    const origin = {
      id: "origin",
      floor: 0,
      index: 0,
      hiddenType: "ORIGIN",
      displayType: "ORIGIN",
      isFake: false,
      revealed: false,
      edges: [],
    };
    nodes[origin.id] = origin;
    for (const node of floors[0]) connect(origin, node, links);
    for (let f = 0; f < floors.length - 1; f += 1) linkAdjacent(floors[f], floors[f + 1], random, links);

    return {
      floors,
      nodes,
      links,
      originId: origin.id,
      currentId: origin.id,
      scansLeft: scans,
      scanMax: scans,
      floorCount: floors.length,
    };
  }

  function getNode(map, id) {
    return map.nodes[id] || null;
  }

  function available(map) {
    const here = getNode(map, map.currentId);
    if (!here) return [];
    return here.edges.map((id) => map.nodes[id]).filter(Boolean);
  }

  function shownType(node) {
    if (!node) return null;
    if (node.revealed) return node.hiddenType;
    return node.displayType;
  }

  function label(type) {
    return LABEL[type] || String(type || "");
  }

  function code(type) {
    return CODE[type] || "???";
  }

  /* Later parts can call this when a wiretap adds scan charges. */
  function grantScans(map, amount) {
    const extra = Math.max(0, amount | 0);
    map.scansLeft += extra;
    map.scanMax += extra;
    return map.scansLeft;
  }

  function scan(map) {
    if (map.scansLeft <= 0) {
      return { ok: false, reason: "empty", revealed: [], scansLeft: map.scansLeft };
    }
    const next = available(map);
    if (next.length === 0) {
      return { ok: false, reason: "none", revealed: [], scansLeft: map.scansLeft };
    }
    map.scansLeft -= 1;
    const revealed = [];
    for (const candidate of next) {
      if (candidate.isFake && !candidate.revealed) {
        candidate.revealed = true;
        revealed.push(candidate);
      }
    }
    return { ok: true, revealed, scansLeft: map.scansLeft, checked: next.length };
  }

  function move(map, nodeId) {
    const target = available(map).find((item) => item.id === nodeId);
    if (!target) return { ok: false, reason: "unreachable" };
    map.currentId = target.id;
    if (target.isFake) target.revealed = true;
    return {
      ok: true,
      node: target,
      ambush: target.isFake === true,
      encounter: encounterFor(target),
    };
  }

  root.PipelineMap = {
    TYPES,
    FAKE_CHANCE,
    SCAN_USES,
    DEFAULT_WIDTHS,
    REST_HEAL,
    generate,
    available,
    shownType,
    label,
    code,
    scan,
    move,
    grantScans,
    encounterFor,
  };
})(typeof window !== "undefined" ? window : globalThis);
