/* =========================================================
   صحيفة الرواسي — ركن الألعاب
   البيانات في js/data.js (GUESS_WHO, WORDS5, QUL, VERSES, QUIZ)
   ========================================================= */
(() => {
  const { $, $$, esc, store, shuffle, toast, confetti, club } = window.R;
  const menu = $("#game-menu"), stage = $("#stage");
  if (!menu || !stage) return;
  let keyHandler = null; // لوحة المفاتيح الحقيقية (للعبة الكلمة فقط)
  document.addEventListener("keydown", (e) => keyHandler && keyHandler(e));

  /* ---------- مشغّل عام لأسئلة الاختيار من متعدد ---------- */
  function mcq(cfg) {
    keyHandler = null;
    const items = cfg.prepare ? cfg.prepare() : shuffle(cfg.items);
    let i = 0, score = 0;

    function step() {
      if (i >= items.length) return end();
      const it = items[i], opts = cfg.options(it), ans = cfg.answer(it);
      stage.innerHTML = `
        <div class="hud"><span>${cfg.title}</span><span>السؤال <b>${i + 1}</b> من ${items.length}</span><span>النقاط: <b>${score}</b></span></div>
        ${cfg.view(it)}
        <div class="choices">${opts.map((o, j) => `<button class="choice" data-j="${j}">${esc(o)}</button>`).join("")}</div>
        <div class="hint" id="exp" aria-live="polite"></div>`;
      $$(".choice", stage).forEach((b) => b.addEventListener("click", () => {
        const ok = +b.dataset.j === ans;
        $$(".choice", stage).forEach((x) => { x.disabled = true; if (+x.dataset.j === ans) x.classList.add("right"); });
        if (ok) score++; else b.classList.add("wrong");
        if (cfg.onAnswer) cfg.onAnswer(it, ok);
        $("#exp", stage).innerHTML = `${ok ? "أحسنت!" : "ليست هذه"} ${cfg.explain ? cfg.explain(it) : ""}
          <div style="margin-top:14px"><button class="btn" id="next">${i + 1 < items.length ? "التالي ←" : "النتيجة"}</button></div>`;
        $("#next").addEventListener("click", () => { i++; step(); });
        $("#next").focus();
      }));
    }

    function end() {
      const best = store.get("best:" + cfg.id, 0);
      const isBest = score > best;
      if (isBest) store.set("best:" + cfg.id, score);
      const ratio = score / items.length;
      if (ratio >= 0.7) confetti();
      const msg = ratio === 1 ? "علامة كاملة! أنت من الرواسي حقًا" : ratio >= 0.7 ? "ممتاز!" : ratio >= 0.4 ? "جيد، وتقدر أحسن" : "لا بأس، جرّب مرة أخرى";
      stage.innerHTML = `<div class="big-score">
        <h2>${cfg.title}</h2>
        <div class="n">${score} / ${items.length}</div>
        <p>${msg}</p>
        <p class="best">${isBest ? "رقم قياسي جديد على جهازك!" : `أفضل نتيجة لك: ${best} / ${items.length}`}</p>
        <button class="btn gold" id="again">العب مرة أخرى</button>
      </div>`;
      $("#again").addEventListener("click", () => mcq(cfg));
    }
    step();
  }

  /* ---------- خمّن من؟ ---------- */
  const who = () => mcq({
    id: "who", title: "خمّن منو؟", items: GUESS_WHO,
    view: (g) => `<div class="kid-photo"><span class="tape"></span>
        ${g.img ? `<img src="${g.img}" alt="صورة طفولة" style="filter:blur(10px) sepia(.4)">` : `${window.R.KID_SVG}`}
      </div><div class="hint">${esc(g.hint)}</div>`,
    options: (g) => g.options,
    answer: (g) => g.answer,
    onAnswer: () => { const im = $(".kid-photo img", stage); if (im) im.style.filter = "none"; },
    explain: (g) => `— إنه/إنها <b>${esc(g.options[g.answer])}</b>!`,
  });

  /* ---------- قل ولا تقل ---------- */
  const qul = () => mcq({
    id: "qul", title: "قل ولا تقل",
    prepare: () => shuffle(QUL).map((q) => { const o = shuffle([q.right, q.wrong]); return { ...q, o, ans: o.indexOf(q.right) }; }),
    view: () => `<h2 style="text-align:center">أيّ العبارتين أصحّ؟</h2>`,
    options: (q) => q.o,
    answer: (q) => q.ans,
    explain: (q) => (q.note ? `<br><small>${esc(q.note)}</small>` : ""),
  });

  /* ---------- أكمل البيت ---------- */
  const verse = () => mcq({
    id: "verse", title: "أكمل البيت", items: VERSES,
    view: (v) => `<div class="verse">${esc(v.a)}<br>${esc(v.b).replace("___", '<span class="gap" id="gap">؟</span>')}</div>`,
    options: (v) => v.options,
    answer: (v) => v.answer,
    onAnswer: (v) => { const g = $("#gap", stage); if (g) g.textContent = v.options[v.answer]; },
    explain: (v) => `— ${esc(v.poet)}`,
  });

  /* ---------- اختبار الأمانة الثقافية ---------- */
  const quiz = () => mcq({
    id: "quiz", title: "اختبار الأمانة", items: QUIZ,
    view: (q) => { const c = club(q.club); return `<span class="badge" style="background:${c.color};color:#fff">${c.name}</span><h2 style="margin-top:12px">${esc(q.q)}</h2>`; },
    options: (q) => q.options,
    answer: (q) => q.answer,
  });

  /* ---------- كلمة الرواسي (كلمة من 5 أحرف كل يوم) ---------- */
  function word() {
    const start = new Date(2026, 0, 1);
    const day = Math.floor((new Date().setHours(12, 0, 0, 0) - start) / 864e5);
    const target = [...WORDS5[((day % WORDS5.length) + WORDS5.length) % WORDS5.length]];
    const key = "word:" + day;
    const st = store.get(key, { rows: [], done: false, won: false });
    let cur = [];
    const ROWS = 6;
    const KB = [
      ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
      ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
      ["⏎", "ذ", "ء", "ر", "ى", "ة", "و", "ز", "ظ", "د", "⌫"],
    ];
    const ALL = new Set(KB.flat());
    const norm = (ch) => ({ "أ": "ا", "إ": "ا", "آ": "ا" }[ch] || ch);

    function grade(g) {
      const res = Array(5).fill("x"), pool = {};
      target.forEach((ch, i) => { if (g[i] === ch) res[i] = "g"; else pool[ch] = (pool[ch] || 0) + 1; });
      g.forEach((ch, i) => { if (res[i] !== "g" && pool[ch] > 0) { res[i] = "y"; pool[ch]--; } });
      return res;
    }

    function draw() {
      const keyState = {};
      const rank = { x: 1, y: 2, g: 3 };
      st.rows.forEach((r) => grade(r).forEach((s, i) => { if ((rank[s] || 0) > (rank[keyState[r[i]]] || 0)) keyState[r[i]] = s; }));
      const rows = [];
      for (let r = 0; r < ROWS; r++) {
        const g = st.rows[r], res = g ? grade(g) : null, live = !g && r === st.rows.length && !st.done;
        rows.push(`<div class="wrow">${[0, 1, 2, 3, 4].map((c) => {
          const ch = g ? g[c] : live ? cur[c] || "" : "";
          return `<div class="wcell ${res ? res[c] : ch ? "filled" : ""}">${ch}</div>`;
        }).join("")}</div>`);
      }
      stage.innerHTML = `
        <div class="hud"><span>كلمة الرواسي</span><span>كلمة اليوم رقم <b>${day + 1}</b></span><span>المحاولة <b>${Math.min(st.rows.length + (st.done ? 0 : 1), ROWS)}</b> من ${ROWS}</span></div>
        <p class="meta" style="text-align:center;margin:0">خمّن كلمة من خمسة أحرف. 🟩 الحرف في مكانه · 🟨 الحرف موجود في مكان آخر · ⬛ غير موجود</p>
        <div class="wgrid">${rows.join("")}</div>
        ${st.done ? `<div class="big-score" style="padding:6px 0 16px">
            <h2>${st.won ? "أحسنت!" : "انتهت المحاولات"}</h2>
            <p>الكلمة: <b style="font-size:24px;color:var(--rust)">${target.join("")}</b> — كلمة جديدة غدًا!</p>
            <button class="btn gold" id="wshare">انسخ نتيجتك</button></div>` : ""}
        <div class="kb">${KB.map((r) => `<div class="r">${r.map((k) => `<button class="key ${k === "⏎" || k === "⌫" ? "wide" : ""} ${keyState[k] || ""}" data-k="${k}">${k === "⏎" ? "إدخال" : k}</button>`).join("")}</div>`).join("")}</div>`;
      $$(".key", stage).forEach((b) => b.addEventListener("click", () => press(b.dataset.k)));
      const sh = $("#wshare");
      if (sh) sh.addEventListener("click", async () => {
        const map = { g: "🟩", y: "🟨", x: "⬛" };
        const txt = `كلمة الرواسي ${day + 1} — ${st.won ? st.rows.length : "X"}/${ROWS}\n` + st.rows.map((r) => grade(r).map((s) => map[s]).join("")).join("\n");
        try { await navigator.clipboard.writeText(txt); toast("تم نسخ النتيجة ✔"); } catch { toast("تعذّر النسخ"); }
      });
    }

    function press(k) {
      if (st.done) return;
      if (k === "⌫") { cur.pop(); return draw(); }
      if (k === "⏎") {
        if (cur.length < 5) { toast("الكلمة يجب أن تكون خمسة أحرف"); return; }
        st.rows.push(cur);
        const won = cur.join("") === target.join("");
        cur = [];
        if (won || st.rows.length >= ROWS) { st.done = true; st.won = won; if (won) confetti(); }
        store.set(key, st);
        return draw();
      }
      if (cur.length < 5 && ALL.has(k)) { cur.push(k); draw(); }
    }

    keyHandler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") { e.preventDefault(); press("⏎"); }
      else if (e.key === "Backspace") { e.preventDefault(); press("⌫"); }
      else if (e.key.length === 1) press(norm(e.key));
    };
    draw();
  }

  /* ---------- القائمة ---------- */
  const GAMES = [
    { id: "who", e: "؟", name: "خمّن منو؟", d: "زملاؤك وهم صغار", run: who },
    { id: "word", e: "ك", name: "كلمة الرواسي", d: "كلمة جديدة كل يوم", run: word },
    { id: "qul", e: "قل", name: "قل ولا تقل", d: "أيّ العبارتين أصح؟", run: qul },
    { id: "verse", e: "بيت", name: "أكمل البيت", d: "من عيون الشعر العربي", run: verse },
    { id: "quiz", e: "10", name: "اختبار الأمانة", d: "أسئلة من كل النوادي", run: quiz },
  ];
  menu.innerHTML = GAMES.map((g) => `<button class="game-pick" data-g="${g.id}"><span class="e">${g.e}</span><b>${g.name}</b><small>${g.d}</small></button>`).join("");
  function pick(id, scroll) {
    const g = GAMES.find((x) => x.id === id) || GAMES[0];
    $$(".game-pick", menu).forEach((b) => b.classList.toggle("on", b.dataset.g === g.id));
    history.replaceState(null, "", "#" + g.id);
    g.run();
    if (scroll) stage.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  menu.addEventListener("click", (e) => { const b = e.target.closest(".game-pick"); if (b) pick(b.dataset.g, true); });
  pick(location.hash.slice(1));
})();
