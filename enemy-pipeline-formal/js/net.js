// ============================================================
// マルチプレイ段階(3) 単位3-1: 通信層（Firebase compat SDK の薄いラッパ）
// ------------------------------------------------------------
// ・同期方式は MP-STAGE3-IMPL-PLAN.md §1 のホスト権威方式。正はホストのメモリ上の
//   エンジン状態であり、Firestore は伝達媒体。スナップショットは rooms/{code}/state/current
//   の全量書き換え（ホストのみ書込）、ゲストの入力は intents 経由（J4: 楽観表示なし）。
// ・このファイルは「輸送」だけを担う。ルームの進行・intent の解釈・描画は main.js 側
//   （単位3-2 のロビー、3-4 以降の同期層）が行う。
// ・SDK（gstatic CDN）が読めない環境では sdkAvailable() が false になり、init() は
//   null を返す。CO-OP 入口は「オンライン環境でのみ有効」と表示し、ソロは妨げない。
// ・playerId は匿名認証の uid（J1）。ルームコードは数字6桁（J9）。今夜の定員は3人。
// ============================================================
(function () {
  "use strict";

  const MAX_PLAYERS = 3; // 今夜ビルドの定員（4人は段階(4) で解禁。MP-STAGE3-IMPL-PLAN §0）

  const SDK_AVAILABLE =
    typeof window !== "undefined" &&
    !!window.EP_FIREBASE_CONFIG &&
    typeof window.firebase !== "undefined" &&
    typeof window.firebase.initializeApp === "function" &&
    typeof window.firebase.auth === "function" &&
    typeof window.firebase.firestore === "function";

  let db = null;
  let uid = null;
  let initPromise = null;

  // 現在のルーム文脈（createRoom / joinRoom で確定し、leaveRoom で破棄する）
  let roomCode = null;
  let hostFlag = false;
  let intentSeq = 0; // intent の送信者連番（cseq）
  const unsubs = { room: null, players: null, state: null, intents: null };

  function netError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }
  function serverTs() {
    return window.firebase.firestore.FieldValue.serverTimestamp();
  }
  function roomRef() {
    return db.collection("rooms").doc(roomCode);
  }
  function playersRef() {
    return roomRef().collection("players");
  }

  function sdkAvailable() {
    return SDK_AVAILABLE;
  }
  function currentUid() {
    return uid;
  }
  function currentRoomCode() {
    return roomCode;
  }
  function isHost() {
    return hostFlag;
  }

  // Firebase 初期化＋匿名サインイン。uid が確定したら解決し、失敗時は null
  // （通信不可でもゲーム本体は止めない）。同一セッション内の再呼び出しは同じ uid を返す
  // （匿名ユーザーが既にサインインしていれば、そのユーザーが返る＝再入室の前提）。
  function init() {
    if (!SDK_AVAILABLE) return Promise.resolve(null);
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        window.firebase.initializeApp(window.EP_FIREBASE_CONFIG);
        const auth = window.firebase.auth();
        db = window.firebase.firestore();
        const cred = await auth.signInAnonymously();
        uid = (cred && cred.user && cred.user.uid) ||
          (auth.currentUser && auth.currentUser.uid) || null;
        return uid;
      } catch (e) {
        console.warn("[Net] init failed:", e);
        return null;
      }
    })();
    return initPromise;
  }

  async function requireOnline() {
    const me = await init();
    if (!me || !db) {
      throw netError("offline", "オンライン環境でのみ有効です（通信を確立できませんでした）");
    }
    return me;
  }

  function genRoomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // MP-GUEST-FIX 課題2: 表示名は参加時にランダムなコールサインを付与する。
  // 正典上パンドラは操者ひとりだけなので、参加者名に PANDORA は使わない。
  // コールサイン = 無線風の単語 + 2桁数字（例: MORSE-42）。同室の既存名と
  // 重複しないよう、taken（既存名の一覧）を見て引き直す。
  const CALLSIGN_WORDS = [
    "NEEDLE", "COPPER", "RELAY", "STATIC", "EMBER", "COIL", "ANVIL", "SPOOL",
    "SIGNAL", "MORSE", "CARBON", "BRASS", "FLINT", "DIAL", "CRANK", "WICK",
    "FILAMENT", "LEVER", "TAPER", "IRON",
  ];
  function genCallsign(taken) {
    const used = new Set(taken || []);
    for (let i = 0; i < 24; i += 1) {
      const word = CALLSIGN_WORDS[Math.floor(Math.random() * CALLSIGN_WORDS.length)];
      const num = 10 + Math.floor(Math.random() * 90);
      const name = word + "-" + num;
      if (!used.has(name)) return name;
    }
    let k = 2;
    let name = "RELAY-" + k;
    while (used.has(name)) { k += 1; name = "RELAY-" + k; }
    return name;
  }

  function playerDoc(me, asHost, takenNames) {
    return {
      name: genCallsign(takenNames), // 表示名は自動付与（入力 UI は作らない）
      characterId: "vessel07",
      isHost: !!asHost,
      ready: false,
      conn: "online",
      lastSeen: serverTs(),
      joinedAt: serverTs(),
    };
  }

  function setRoomContext(code, asHost) {
    roomCode = code;
    hostFlag = !!asHost;
    intentSeq = 0;
  }
  function clearSubscriptions() {
    for (const key of Object.keys(unsubs)) {
      if (unsubs[key]) {
        try { unsubs[key](); } catch (e) { /* noop */ }
        unsubs[key] = null;
      }
    }
  }

  // ルーム作成：6桁コードを引き、衝突したら引き直す。ルーム本体と自分の players を作る。
  // opts.depth はホストの現在選択深度（接続点のみ。J-6 (a)）。
  async function createRoom(opts) {
    const me = await requireOnline();
    const depthRaw = opts && Number(opts.depth);
    const depth = Number.isInteger(depthRaw) ? Math.min(20, Math.max(1, depthRaw)) : 1;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = genRoomCode();
      const ref = db.collection("rooms").doc(code);
      try {
        // get→set の競合を避けるため、本体の作成はトランザクションで行う
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) throw netError("collision", "code collision");
          tx.set(ref, {
            hostId: me,
            status: "lobby",
            seq: 0,
            depth,
            createdAt: serverTs(),
            updatedAt: serverTs(),
          });
        });
      } catch (e) {
        if (e && e.code === "collision") continue;
        throw e;
      }
      await ref.collection("players").doc(me).set(playerDoc(me, true, []));
      setRoomContext(code, true);
      return { code, depth };
    }
    throw netError("collision", "ルームコードを確保できませんでした。もう一度お試しください");
  }

  // ルーム参加：status=="lobby" かつ定員未満のときだけ自分の players を作る。
  // 同じ uid で既に参加している場合は再入室としてそのまま復帰する（3-6 の前提）。
  async function joinRoom(codeInput) {
    const me = await requireOnline();
    const code = String(codeInput == null ? "" : codeInput).trim();
    if (!/^\d{6}$/.test(code)) {
      throw netError("bad-code", "ルームコードは6桁の数字で入力してください");
    }
    const ref = db.collection("rooms").doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      throw netError("not-found", "ルームが見つかりません。コードを確認してください");
    }
    const room = snap.data() || {};
    const mine = await ref.collection("players").doc(me).get();
    if (mine.exists) {
      setRoomContext(code, room.hostId === me);
      try { await updateMyPlayer({ conn: "online" }); } catch (e) { /* noop */ }
      return { code, room, rejoined: true };
    }
    if (room.status !== "lobby") {
      throw netError("in-run", "そのルームは作戦進行中のため参加できません");
    }
    const all = await ref.collection("players").get();
    if (all.size >= MAX_PLAYERS) {
      throw netError("full", "そのルームは定員（" + MAX_PLAYERS + "人）に達しています");
    }
    const takenNames = [];
    all.forEach((d) => { const n = d.data() && d.data().name; if (n) takenNames.push(n); });
    await ref.collection("players").doc(me).set(playerDoc(me, false, takenNames));
    setRoomContext(code, false);
    return { code, room, rejoined: false };
  }

  // 退室：購読を全て解除し、自分の players を消す。ホストの退室はルーム解散として
  // サブコレクションと本体も消す（ルール上、消せるのはホストのみ）。
  async function leaveRoom() {
    const code = roomCode;
    const me = uid;
    const wasHost = hostFlag;
    clearSubscriptions();
    roomCode = null;
    hostFlag = false;
    if (!db || !code || !me) return;
    try {
      const ref = db.collection("rooms").doc(code);
      if (wasHost) {
        const [players, intents] = await Promise.all([
          ref.collection("players").get(),
          ref.collection("intents").get(),
        ]);
        const batch = db.batch();
        players.forEach((d) => batch.delete(d.ref));
        intents.forEach((d) => batch.delete(d.ref));
        batch.delete(ref.collection("state").doc("current"));
        batch.delete(ref);
        await batch.commit();
      } else {
        await ref.collection("players").doc(me).delete();
      }
    } catch (e) {
      console.warn("[Net] leaveRoom cleanup failed:", e);
    }
  }

  // 自分の players ドキュメントへの部分更新（キャラ選択・ready・conn 等。ルール上は本人のみ可）
  async function updateMyPlayer(patch) {
    if (!db || !roomCode || !uid) throw netError("no-room", "ルームに参加していません");
    await playersRef().doc(uid).update(Object.assign({}, patch, { lastSeen: serverTs() }));
  }

  // ルーム本体への部分更新（ホストのみ。深度の追随や status 遷移に使う）
  async function updateRoom(patch) {
    if (!db || !roomCode) throw netError("no-room", "ルームに参加していません");
    await roomRef().update(Object.assign({}, patch, { updatedAt: serverTs() }));
  }

  // スナップショットの全量書き込み（ホストのみ書ける。単位3-4 の同期層が使う）
  async function writeState(snapshot) {
    if (!db || !roomCode) throw netError("no-room", "ルームに参加していません");
    await roomRef().collection("state").doc("current")
      .set(Object.assign({}, snapshot, { updatedAt: serverTs() }));
  }

  // ゲスト→ホストの intent 作成（ルール上、playerId == 自分の uid のものだけ作れる）
  async function sendIntent(type, payload) {
    if (!db || !roomCode || !uid) throw netError("no-room", "ルームに参加していません");
    intentSeq += 1;
    await roomRef().collection("intents").add({
      playerId: uid,
      cseq: intentSeq,
      type: String(type),
      payload: payload || {},
      at: serverTs(),
    });
  }

  // 処理済み intent の削除（ホストのみ可）
  async function deleteIntent(intentId) {
    if (!db || !roomCode || !intentId) return;
    try { await roomRef().collection("intents").doc(intentId).delete(); }
    catch (e) { console.warn("[Net] deleteIntent failed:", e); }
  }

  // 購読の共通処理：チャンネルごとに1本だけ生かし、張り替え時は前を解除する。
  function subscribe(channel, factory) {
    if (unsubs[channel]) {
      try { unsubs[channel](); } catch (e) { /* noop */ }
      unsubs[channel] = null;
    }
    if (!db || !roomCode) return function () {};
    const off = factory();
    unsubs[channel] = off;
    return function unsubscribe() {
      if (unsubs[channel] === off) {
        try { off(); } catch (e) { /* noop */ }
        unsubs[channel] = null;
      }
    };
  }

  // ルーム本体の購読：cb(room | null)。解散（削除）されたら null が来る。
  function onRoom(cb) {
    return subscribe("room", () =>
      roomRef().onSnapshot(
        (snap) => cb(snap.exists ? Object.assign({ code: roomCode }, snap.data()) : null),
        (err) => { console.warn("[Net] onRoom error:", err); cb(null); }
      ));
  }

  // 参加者一覧の購読：cb([{ playerId, name, characterId, isHost, ready, conn, ... }])
  function onPlayers(cb) {
    return subscribe("players", () =>
      playersRef().orderBy("joinedAt", "asc").onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((d) => list.push(Object.assign({ playerId: d.id }, d.data())));
          cb(list);
        },
        (err) => { console.warn("[Net] onPlayers error:", err); cb([]); }
      ));
  }

  // スナップショットの購読：cb(snapshot | null)
  function onState(cb) {
    return subscribe("state", () =>
      roomRef().collection("state").doc("current").onSnapshot(
        (snap) => cb(snap.exists ? snap.data() : null),
        (err) => { console.warn("[Net] onState error:", err); cb(null); }
      ));
  }

  // intent の購読（ホスト用。ルール上、読めるのはホストのみ）：
  // cb([{ id, playerId, cseq, type, payload, at }]) を到着順で渡す。
  function onIntents(cb) {
    return subscribe("intents", () =>
      roomRef().collection("intents").orderBy("at", "asc").onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((d) => list.push(Object.assign({ id: d.id }, d.data())));
          cb(list);
        },
        (err) => { console.warn("[Net] onIntents error:", err); cb([]); }
      ));
  }

  window.Net = {
    MAX_PLAYERS,
    genCallsign, // 課題2の検証用に公開（コールサイン生成）
    sdkAvailable,
    init,
    uid: currentUid,
    roomCode: currentRoomCode,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    updateMyPlayer,
    updateRoom,
    writeState,
    sendIntent,
    deleteIntent,
    onRoom,
    onPlayers,
    onState,
    onIntents,
  };
})();
