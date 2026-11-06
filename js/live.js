/* =========================================================
   صحيفة الرواسي — طبقة الاتصال للمناظرة المباشرة
   تعمل مع Firebase (إن وُجدت إعداداته في firebase-config.js)
   أو مع serve.py على الشبكة المحلية. واجهة واحدة للاثنين:
     LIVE.ready  → Promise<backend | null>
   ========================================================= */
(() => {
  const ls = {
    get(k) { try { return localStorage.getItem("rawasi:" + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("rawasi:" + k, v); } catch { /* تخزين غير متاح */ } },
  };
  let device = ls.get("device");
  if (!device) { device = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); ls.set("device", device); }

  const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

  /* ---------- Firebase ---------- */
  async function firebaseBackend(cfg) {
    const [appMod, fs, au] = await Promise.all([
      import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js"), import(FB + "firebase-auth.js"),
    ]);
    const app = appMod.initializeApp(cfg);
    const db = fs.getFirestore(app);
    const auth = au.getAuth(app);
    const { doc, collection, onSnapshot, query, orderBy, limit, runTransaction, increment, serverTimestamp, addDoc, updateDoc, setDoc, getDoc, deleteDoc } = fs;
    const cur = doc(db, "live", "current");
    const deb = (id) => doc(db, "debates", id);
    const warn = (e) => console.warn("[live]", e && e.message);

    return {
      mode: "firebase",
      device,
      watchDebate: (cb) => onSnapshot(cur, (s) => cb(s.exists() ? s.data() : null), warn),
      watchTally: (id, cb) => onSnapshot(deb(id), (s) => cb(s.exists() ? s.data() : { a: 0, b: 0, claps: 0 }), warn),
      watchComments: (id, cb) => onSnapshot(
        query(collection(db, "debates", id, "comments"), orderBy("ts", "desc"), limit(80)),
        (s) => cb(s.docs.map((d) => { const x = d.data(); return { id: d.id, ...x, ts: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now() }; }).reverse()),
        warn),
      async myVote(id) { const s = await getDoc(doc(db, "debates", id, "votes", device)); return s.exists() ? s.data().side : null; },
      async vote(id, side) {
        await runTransaction(db, async (tx) => {
          const vref = doc(db, "debates", id, "votes", device);
          const v = await tx.get(vref);
          const old = v.exists() ? v.data().side : null;
          if (old === side) return;
          const upd = { [side]: increment(1) };
          if (old) upd[old] = increment(-1);
          tx.set(vref, { side, ts: serverTimestamp() });
          tx.update(deb(id), upd);
        });
      },
      clap: (id) => updateDoc(deb(id), { claps: increment(1) }),
      addComment: (id, c) => addDoc(collection(db, "debates", id, "comments"), {
        name: c.name, text: c.text, side: c.side || null, device, ts: serverTimestamp(), hidden: false,
      }),
      // للمشرف
      needsEmail: true,
      login: (email, pass) => au.signInWithEmailAndPassword(auth, email, pass),
      logout: () => au.signOut(auth),
      onAuth: (cb) => au.onAuthStateChanged(auth, (u) => cb(!!u)),
      async start({ motion, sideA, sideB }) {
        const id = "d" + Date.now().toString(36);
        await setDoc(deb(id), { a: 0, b: 0, claps: 0 });
        await setDoc(cur, { id, motion, sideA, sideB, status: "live", started: serverTimestamp() });
      },
      setStatus: (status) => updateDoc(cur, { status }),
      clear: () => deleteDoc(cur),
      hide: (id, cid, hidden) => updateDoc(doc(db, "debates", id, "comments", cid), { hidden }),
    };
  }

  /* ---------- serve.py على الشبكة المحلية ---------- */
  function localBackend() {
    const subs = { d: new Set(), t: new Set(), c: new Set() };
    let timer = null, pass = ls.get("modpass") || "";
    async function poll() {
      try {
        const j = await (await fetch("/api/live/state?t=" + Date.now())).json();
        subs.d.forEach((f) => f(j.current));
        subs.t.forEach((f) => f(j.tally));
        subs.c.forEach((f) => f(j.comments));
      } catch { /* الخادم غير متاح مؤقتًا */ }
    }
    const watch = (set, cb) => {
      set.add(cb);
      if (!timer) { timer = setInterval(poll, 2000); }
      poll();
      return () => set.delete(cb);
    };
    async function post(path, body) {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      let j = {};
      try { j = await r.json(); } catch { /* */ }
      if (!r.ok) throw new Error(j.error || "تعذّر الاتصال");
      poll();
      return j;
    }
    const admin = (action, extra) => post("/api/live/admin", { pass, action, ...extra });
    return {
      mode: "local",
      device,
      watchDebate: (cb) => watch(subs.d, cb),
      watchTally: (id, cb) => watch(subs.t, cb),
      watchComments: (id, cb) => watch(subs.c, cb),
      async myVote(id) { try { return (await (await fetch(`/api/live/myvote?id=${encodeURIComponent(id)}&device=${device}`)).json()).side; } catch { return null; } },
      vote: (id, side) => post("/api/live/vote", { id, device, side }),
      clap: (id) => post("/api/live/clap", { id, device }),
      addComment: (id, c) => post("/api/live/comment", { id, device, ...c }),
      needsEmail: false,
      async login(_email, p) { pass = p; await admin("ping"); ls.set("modpass", p); },
      logout() { pass = ""; ls.set("modpass", ""); },
      onAuth(cb) { if (!pass) return cb(false); admin("ping").then(() => cb(true), () => cb(false)); },
      start: (o) => admin("start", o),
      setStatus: (status) => admin("status", { status }),
      clear: () => admin("clear"),
      hide: (id, cid, hidden) => admin("hide", { cid, hidden }),
    };
  }

  /* ---------- الاختيار التلقائي ---------- */
  async function pick() {
    const cfg = window.RAWASI_FIREBASE;
    if (cfg && cfg.projectId) {
      try { return await firebaseBackend(cfg); } catch (e) { console.warn("[live] Firebase:", e); }
    }
    if (location.protocol.startsWith("http")) {
      try {
        const r = await fetch("/api/live/state?t=" + Date.now());
        if (r.ok && (r.headers.get("content-type") || "").includes("json")) return localBackend();
      } catch { /* لا يوجد خادم */ }
    }
    return null;
  }
  window.LIVE = { ready: pick(), device };
})();
