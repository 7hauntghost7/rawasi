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
    const [appMod, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js")]);
    const app = appMod.initializeApp(cfg);
    const db = fs.getFirestore(app);
    // وحدة تسجيل الدخول للمشرف فقط، تُحمَّل عند الحاجة
    let authP = null;
    const getAuth = () => authP || (authP = import(FB + "firebase-auth.js").then((au) => ({ au, auth: au.getAuth(app) })));
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
      login: async (email, pass) => { const { au, auth } = await getAuth(); return au.signInWithEmailAndPassword(auth, email, pass); },
      logout: async () => { const { au, auth } = await getAuth(); return au.signOut(auth); },
      onAuth(cb) {
        let un = null, dead = false;
        getAuth().then(({ au, auth }) => { if (!dead) un = au.onAuthStateChanged(auth, (u) => cb(!!u)); });
        return () => { dead = true; if (un) un(); };
      },
      async start(o) {
        const id = "d" + Date.now().toString(36);
        await setDoc(deb(id), { a: 0, b: 0, claps: 0 });
        await setDoc(cur, {
          id, motion: o.motion, sideA: o.sideA, sideB: o.sideB, img: o.img || "",
          kind: o.kind || "", membersA: o.membersA || [], membersB: o.membersB || [],
          when: o.when || "", place: o.place || "", link: /^https:\/\//.test(o.link || "") ? o.link : "",
          status: o.status === "soon" ? "soon" : "live", started: serverTimestamp(),
        });
      },
      setStatus: (status) => updateDoc(cur, { status }),
      setImage: (img) => updateDoc(cur, { img: img || "" }),
      clear: () => deleteDoc(cur),
      hide: (id, cid, hidden) => updateDoc(doc(db, "debates", id, "comments", cid), { hidden }),
      // تعليقات على شخصية العدد
      watchThread: (tid, cb) => onSnapshot(
        query(collection(db, "threads", tid, "comments"), orderBy("ts", "desc"), limit(100)),
        (s) => cb(s.docs.map((d) => { const x = d.data(); return { id: d.id, ...x, ts: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now() }; }).reverse()),
        warn),
      addToThread: (tid, c) => addDoc(collection(db, "threads", tid, "comments"), { name: c.name, text: c.text, device, ts: serverTimestamp(), hidden: false }),
      hideInThread: (tid, cid, hidden) => updateDoc(doc(db, "threads", tid, "comments", cid), { hidden }),
      // سؤال الدفعة: صوت واحد لكل جهاز يمكن تغييره
      watchPoll: (pid, n, cb) => onSnapshot(doc(db, "polls", pid), (s) => {
        const d = s.exists() ? s.data() : {};
        cb([...Array(n)].map((_, i) => Math.max(0, d["o" + i] || 0)));
      }, warn),
      async myPollVote(pid) { const s = await getDoc(doc(db, "polls", pid, "votes", device)); return s.exists() ? s.data().opt : null; },
      async pollVote(pid, opt) {
        await runTransaction(db, async (tx) => {
          const vref = doc(db, "polls", pid, "votes", device), pref = doc(db, "polls", pid);
          const v = await tx.get(vref), p = await tx.get(pref);
          const old = v.exists() ? v.data().opt : null;
          if (old === opt) return;
          if (!p.exists()) tx.set(pref, { ["o" + opt]: 1 });
          else {
            const u = { ["o" + opt]: increment(1) };
            if (old != null) u["o" + old] = increment(-1);
            tx.update(pref, u);
          }
          tx.set(vref, { opt, ts: serverTimestamp() });
        });
      },
      // لوحة شرف الكلمات المتقاطعة
      watchBoard: (bid, cb) => onSnapshot(query(collection(db, "boards", bid, "scores"), orderBy("score"), limit(10)),
        (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), warn),
      submitScore: (bid, r) => setDoc(doc(db, "boards", bid, "scores", device), {
        name: r.name, ms: Math.round(r.ms), hints: r.hints, score: r.hints * 600000 + Math.round(r.ms), ts: serverTimestamp(),
      }),
    };
  }

  /* ---------- serve.py على الشبكة المحلية ---------- */
  function watchThread() { /* يحمل آخر دالة سحب للتحديث الفوري بعد الإرسال */ }
  function watchPoll() { /* كذلك */ }
  function watchBoard() { /* كذلك */ }
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
      setImage: (img) => admin("image", { img: img || "" }),
      clear: () => admin("clear"),
      hide: (id, cid, hidden) => admin("hide", { cid, hidden }),
      watchThread(tid, cb) {
        const pull = async () => { try { cb((await (await fetch(`/api/thread?tid=${encodeURIComponent(tid)}&t=${Date.now()}`)).json()).comments || []); } catch { /* */ } };
        pull();
        const t = setInterval(pull, 4000);
        watchThread.pull = pull;
        return () => clearInterval(t);
      },
      async addToThread(tid, c) { await post("/api/thread/comment", { tid, device, ...c }); if (watchThread.pull) watchThread.pull(); },
      hideInThread: (tid, cid, hidden) => post("/api/thread/hide", { pass, tid, cid, hidden }),
      watchPoll(pid, n, cb) {
        const pull = async () => { try { cb((await (await fetch(`/api/poll?pid=${pid}&t=${Date.now()}`)).json()).counts.slice(0, n)); } catch { /* */ } };
        pull(); watchPoll.pull = pull;
        const t = setInterval(pull, 5000);
        return () => clearInterval(t);
      },
      async myPollVote(pid) { try { return (await (await fetch(`/api/poll?pid=${pid}&device=${device}`)).json()).mine ?? null; } catch { return null; } },
      async pollVote(pid, opt) { await post("/api/poll/vote", { pid, device, opt }); if (watchPoll.pull) watchPoll.pull(); },
      watchBoard(bid, cb) {
        const pull = async () => { try { cb((await (await fetch(`/api/board?bid=${bid}&t=${Date.now()}`)).json()).scores); } catch { /* */ } };
        pull(); watchBoard.pull = pull;
        const t = setInterval(pull, 10000);
        return () => clearInterval(t);
      },
      async submitScore(bid, r) { await post("/api/board/score", { bid, device, name: r.name, ms: Math.round(r.ms), hints: r.hints }); if (watchBoard.pull) watchBoard.pull(); },
    };
  }

  /* ---------- قراءة سريعة عبر REST قبل تحميل مكتبة Firebase ---------- */
  function restReader(cfg) {
    const base = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/`;
    const key = "key=" + encodeURIComponent(cfg.apiKey || "");
    const val = (v) => {
      if (!v || typeof v !== "object") return null;
      if ("stringValue" in v) return v.stringValue;
      if ("integerValue" in v) return Number(v.integerValue);
      if ("doubleValue" in v) return Number(v.doubleValue);
      if ("booleanValue" in v) return v.booleanValue;
      if ("timestampValue" in v) return v.timestampValue;
      if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
      if ("mapValue" in v) return obj(v.mapValue.fields);
      return null;
    };
    const obj = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, val(v)]));
    const get = async (path, fields) => {
      const mask = fields ? fields.map((f) => "&mask.fieldPaths=" + f).join("") : "";
      const r = await fetch(base + path + "?" + key + mask);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("rest " + r.status);
      return obj((await r.json()).fields);
    };
    const comments = async (id) => {
      const r = await fetch(base + "debates/" + encodeURIComponent(id) + ":runQuery?" + key, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "comments" }], orderBy: [{ field: { fieldPath: "ts" }, direction: "DESCENDING" }], limit: 80 } }),
      });
      if (!r.ok) throw new Error("rest " + r.status);
      return (await r.json()).filter((x) => x.document).map((x) => {
        const d = obj(x.document.fields);
        return { id: x.document.name.split("/").pop(), ...d, ts: Date.parse(d.ts) || Date.now() };
      }).reverse();
    };
    return { get, comments };
  }

  // واجهة جاهزة فورًا: تعرض بيانات REST أولًا، ثم يتولى الاتصال المباشر عند اكتمال تحميله
  function fastFirebase(cfg) {
    const realP = firebaseBackend(cfg);
    realP.catch((e) => console.warn("[live] Firebase:", e));
    const rest = restReader(cfg);
    // النص أولًا (بلا الملصق، حجمه صغير جدًا) ثم الوثيقة كاملة بالملصق
    const TEXT = ["id", "motion", "sideA", "sideB", "membersA", "membersB", "kind", "when", "place", "link", "status"];
    const textP = rest.get("live/current", TEXT), fullP = rest.get("live/current");
    textP.catch(() => {}); fullP.catch(() => {});
    const early = {
      watchDebate: (args, emit) => {
        let full = false;
        textP.then((d) => { if (!full) emit(d ? { ...d, img: "" } : null); }).catch(() => {});
        return fullP.then((d) => { full = true; return d; });
      },
      watchTally: ([id]) => rest.get("debates/" + encodeURIComponent(id)).then((d) => d || { a: 0, b: 0, claps: 0 }),
      watchComments: ([id]) => rest.comments(id),
    };
    const watcher = (prop) => (...args) => {
      const cb = args[args.length - 1];
      let live = false, dead = false, un = null;
      const fwd = [...args.slice(0, -1), (x) => { live = true; if (!dead) cb(x); }];
      const emit = (x) => { if (!live && !dead) cb(x); };
      if (early[prop]) early[prop](args, emit).then(emit).catch(() => {});
      realP.then((b) => { if (!dead) un = b[prop](...fwd); }).catch(() => {});
      return () => { dead = true; if (un) un(); };
    };
    const fixed = { mode: "firebase", device, needsEmail: true };
    return new Proxy({}, {
      get(_, prop) {
        if (typeof prop !== "string" || prop === "then") return undefined;
        if (prop in fixed) return fixed[prop];
        if (prop === "onAuth" || prop === "login") import(FB + "firebase-auth.js").catch(() => {}); // تحميل مبكر للمشرف
        if (prop.startsWith("watch") || prop === "onAuth") return watcher(prop);
        return (...a) => realP.then((b) => b[prop](...a));
      },
    });
  }

  /* ---------- الاختيار التلقائي ---------- */
  async function pick() {
    const cfg = window.RAWASI_FIREBASE;
    if (cfg && cfg.projectId && typeof Proxy !== "undefined") return fastFirebase(cfg);
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
