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
    id: "who", title: "خمّن مَن؟", items: GUESS_WHO,
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

  /* ---------- كلمات العدد: كلمات متقاطعة إجاباتها في مقالات العدد ---------- */
  let cwTimer = null, cwUnsub = null;
  function crossword() {
    keyHandler = null;
    clearInterval(cwTimer);
    const list = typeof CROSSWORD !== "undefined" ? CROSSWORD : [];
    const P = window.CW ? CW.build(list) : { words: [] };
    if (!P.words.length) { stage.innerHTML = `<p class="meta" style="text-align:center;padding:40px 0">لا توجد كلمات لهذا العدد بعد.</p>`; return; }
    const sig = P.words.map((w) => w.sol.join("")).join("|");
    const skey = "cw:" + SITE.issue + ":" + [...sig].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    let st = store.get(skey, null) || { v: {}, hints: 0, t0: 0, done: 0 };
    const K = (r, c) => r + "," + c;
    const cellsOf = (w) => w.sol.map((_, k) => K(w.r + (w.dir === "d" ? k : 0), w.c + (w.dir === "a" ? k : 0)));
    const owners = {};
    P.words.forEach((w, i) => cellsOf(w).forEach((kk) => (owners[kk] = owners[kk] || []).push(i)));
    const firstOpen = P.words.findIndex((w) => cellsOf(w).some((kk) => !st.v[kk]));
    let cur = { w: Math.max(0, firstOpen), k: 0 }, bad = new Set();
    const save = () => store.set(skey, st);
    const solved = (w) => cellsOf(w).every((kk) => st.v[kk] === P.cells[kk]);
    const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    const label = (w) => `${w.num} ${w.dir === "a" ? "أفقي" : "عمودي"}`;
    const art = (w) => (typeof ARTICLES !== "undefined" ? ARTICLES.find((a) => a.id === w.article) : null);

    const cellsHtml = Object.keys(P.cells).map((kk) => {
      const [r, c] = kk.split(",").map(Number);
      const n = P.words.find((w) => w.r === r && w.c === c);
      return `<button type="button" class="cw-c" data-k="${kk}" style="grid-row:${r + 1};grid-column:${c + 1}" aria-label="خانة">${n ? `<i>${n.num}</i>` : ""}<span></span></button>`;
    }).join("");
    const listHtml = (dir) => P.words.map((w, i) => (w.dir === dir ? `<button type="button" class="cw-li" data-w="${i}"><b>${w.num}</b><span>${esc(w.clue)}</span></button>` : "")).join("");

    stage.innerHTML = `
      <div class="hud"><span>كلمات العدد ${SITE.issue}</span><span>الوقت: <b id="cw-time">0:00</b></span><span>تلميحات: <b id="cw-h">0</b></span></div>
      <p class="meta cw-intro">كل الإجابات موجودة في مقالات هذا العدد. اضغط على أي خانة واكتب بلوحة مفاتيحك العربية.</p>
      <div id="cw-win"></div>
      <div class="cw-dock">
        <div class="cw-clue" id="cw-clue"></div>
        <input class="cw-in" id="cw-in" type="text" dir="rtl" lang="ar" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" aria-label="اكتب الحرف">
      </div>
      <div class="cw-grid" style="--n:${Math.max(P.cols, P.rows)};grid-template-columns:repeat(${P.cols},1fr)">${cellsHtml}</div>
      <div class="cw-actions">
        <button type="button" data-a="check">تحقّق</button>
        <button type="button" data-a="hint">اكشف حرف</button>
        <button type="button" data-a="reset">من جديد</button>
      </div>
      <div class="cw-lists">
        <div><h3>أفقي</h3>${listHtml("a")}</div>
        <div><h3>عمودي</h3>${listHtml("d")}</div>
      </div>
      <div class="cw-board" id="cw-board" hidden><h3>لوحة الشرف</h3><ol id="cw-top"></ol></div>`;

    function paint() {
      const w = P.words[cur.w], on = new Set(cellsOf(w)), curK = cellsOf(w)[cur.k];
      const okCells = new Set(P.words.filter(solved).flatMap(cellsOf));
      stage.querySelectorAll(".cw-c").forEach((el) => {
        const kk = el.dataset.k;
        el.querySelector("span").textContent = st.v[kk] || "";
        el.classList.toggle("on", on.has(kk));
        el.classList.toggle("cur", kk === curK && !st.done);
        el.classList.toggle("ok", okCells.has(kk));
        el.classList.toggle("bad", bad.has(kk));
      });
      stage.querySelectorAll(".cw-li").forEach((el) => {
        const i = +el.dataset.w;
        el.classList.toggle("on", i === cur.w);
        el.classList.toggle("done", solved(P.words[i]));
      });
      const a = art(w);
      $("#cw-clue").innerHTML = `<div><b>${label(w)}</b>${esc(w.clue)}</div>${a ? `<button type="button" class="btn small" data-read="${esc(a.id)}">اقرأ المقال</button>` : ""}`;
      $("#cw-h").textContent = st.hints;
      tick();
    }
    function tick() {
      const t = $("#cw-time");
      if (!t) { clearInterval(cwTimer); return; }
      t.textContent = mmss(st.t0 ? (st.done || Date.now()) - st.t0 : 0);
    }
    function finish() {
      st.done = Date.now();
      save();
      confetti();
      const time = mmss(st.done - st.t0);
      const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "games.html#cw";
      const txt = `حلّيت «كلمات العدد ${SITE.issue}» في ${SITE.name} خلال ${time}${st.hints ? ` بـ ${st.hints} تلميح` : " بلا تلميحات"}. جرّب إنت:\n${url}`;
      setTimeout(offerSubmit, 0);
      $("#cw-win").innerHTML = `<div class="cw-win"><h2>حلّيتها!</h2><p>الوقت ${time}، ${st.hints ? `بـ ${st.hints} تلميح` : "بلا تلميحات"}.</p>
        <a class="btn gold" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">ورّي الدفعة في واتساب</a></div>`;
      paint();
    }
    function input(ch) {
      if (st.done) return;
      if (!st.t0) st.t0 = Date.now();
      const cells = cellsOf(P.words[cur.w]), kk = cells[cur.k];
      st.v[kk] = ch;
      bad.delete(kk);
      if (cur.k < cells.length - 1) cur.k++;
      save();
      if (P.words.every(solved)) return finish();
      paint();
    }
    function back() {
      if (st.done) return;
      const cells = cellsOf(P.words[cur.w]);
      if (st.v[cells[cur.k]]) delete st.v[cells[cur.k]];
      else if (cur.k > 0) { cur.k--; delete st.v[cells[cur.k]]; }
      save();
      paint();
    }
    function selectCell(kk) {
      const ws = owners[kk] || [];
      const curCells = cellsOf(P.words[cur.w]);
      let wi;
      if (ws.length > 1 && curCells[cur.k] === kk) wi = ws.find((i) => i !== cur.w);
      else wi = ws.includes(cur.w) ? cur.w : (ws.find((i) => P.words[i].dir === P.words[cur.w].dir) ?? ws[0]);
      cur = { w: wi, k: cellsOf(P.words[wi]).indexOf(kk) };
      paint();
    }

    // حقل خفي يفتح لوحة مفاتيح الجوال. نترك فيه حرفًا غير مرئي حتى نلتقط زر المسح
    const ZW = "\u200B", box = $("#cw-in");
    let warned = false;
    const arm = () => { box.value = ZW; try { box.setSelectionRange(1, 1); } catch { /* */ } };
    const typeText = (txt) => {
      for (const ch of txt.replace(/\u200B/g, "")) {
        if (/[\u0621-\u064A]/.test(ch)) input(CW.norm(ch) || ch);
        else if (/[a-z]/i.test(ch) && !warned) { warned = true; toast("حوّل لوحة المفاتيح للعربي"); }
      }
    };
    const focusBox = () => { arm(); box.focus({ preventScroll: true }); };
    box.addEventListener("input", (e) => {
      if (e.isComposing) return;
      if (!box.value.includes(ZW) && box.value === "") back();
      else typeText(box.value);
      arm();
    });
    box.addEventListener("compositionend", () => { typeText(box.value); arm(); });
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); nextWord(); } });
    function nextWord() {
      const n = P.words.findIndex((w, i) => i > cur.w && !solved(w));
      const i = n >= 0 ? n : P.words.findIndex((w) => !solved(w));
      if (i < 0) return;
      cur = { w: i, k: Math.max(0, cellsOf(P.words[i]).findIndex((kk) => !st.v[kk])) };
      paint();
    }

    stage.addEventListener("click", (e) => {
      const c = e.target.closest(".cw-c");
      if (c) { selectCell(c.dataset.k); return focusBox(); }
      if (e.target.closest(".cw-clue") && !e.target.closest("[data-read]")) return focusBox();
      const li = e.target.closest(".cw-li");
      if (li) {
        const w = P.words[+li.dataset.w], cells = cellsOf(w);
        cur = { w: +li.dataset.w, k: Math.max(0, cells.findIndex((kk) => !st.v[kk])) };
        paint();
        stage.querySelector(".cw-grid").scrollIntoView({ behavior: "smooth", block: "center" });
        return focusBox();
      }
      const a = e.target.closest("[data-a]");
      if (!a) return;
      if (a.dataset.a === "check") {
        bad = new Set(Object.keys(st.v).filter((kk) => st.v[kk] !== P.cells[kk]));
        toast(bad.size ? `في ${bad.size} ${bad.size > 2 && bad.size < 11 ? "حروف غلط" : "حرف غلط"}` : "كل الحروف المكتوبة صاح");
        paint();
      } else if (a.dataset.a === "hint") {
        if (st.done) return;
        const kk = cellsOf(P.words[cur.w])[cur.k];
        if (st.v[kk] === P.cells[kk]) return toast("الحرف ده صاح أصلًا");
        st.hints++;
        input(P.cells[kk]);
      } else if (a.dataset.a === "reset" && confirm("تبدأ من جديد؟ حيتمسح كل اللي كتبته.")) {
        st = { v: {}, hints: 0, t0: 0, done: 0 };
        bad = new Set();
        cur = { w: 0, k: 0 };
        save();
        $("#cw-win").innerHTML = "";
        paint();
      }
    });
    keyHandler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target === box) return;
      if (e.key === "Backspace") { e.preventDefault(); back(); }
      else if (e.key === "Enter") { e.preventDefault(); nextWord(); }
      else if (e.key.length === 1 && /[ء-ي]/.test(e.key)) { e.preventDefault(); input(CW.norm(e.key) || e.key); }
    };
    // لوحة الشرف (مشتركة عبر قاعدة البيانات)
    const bid = "cw-" + SITE.issue + "-" + skey.split(":").pop();
    let lb = null;
    const paintBoard = (rows) => {
      const box = $("#cw-board");
      if (!box) return;
      box.hidden = false;
      $("#cw-top").innerHTML = rows.length ? rows.map((r, i) => `<li class="${r.id === window.LIVE.device ? "me" : ""}"><span class="rk">${i + 1}</span><b>${esc(r.name)}</b><small>${mmss(r.ms)}${r.hints ? ` · ${r.hints} تلميح` : ""}</small></li>`).join("") : `<li class="none">لم يسجّل أحد بعد — كن الأول</li>`;
    };
    function offerSubmit() {
      const win = $("#cw-win .cw-win");
      if (!lb || !st.done || !win || $("#cw-sub")) return;
      if (store.get(skey + ":sent", false)) { win.insertAdjacentHTML("beforeend", `<p class="cw-sent">نتيجتك في لوحة الشرف ✔</p>`); return; }
      win.insertAdjacentHTML("beforeend", `<form class="cw-sub" id="cw-sub"><input id="cw-nick" maxlength="20" placeholder="اسمك في لوحة الشرف" value="${esc(store.get("cname", ""))}"><button class="btn">سجّل</button></form>`);
      $("#cw-sub").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = $("#cw-nick").value.trim();
        if (!name) return $("#cw-nick").focus();
        try {
          await lb.submitScore(bid, { name, ms: st.done - st.t0, hints: st.hints });
          store.set(skey + ":sent", true);
          store.set("cname", name);
          $("#cw-sub").outerHTML = `<p class="cw-sent">سُجّلت نتيجتك ✔</p>`;
        } catch (err) { toast(/better|أفضل|permission/i.test(err.message || "") ? "نتيجتك المسجّلة سابقًا أفضل" : "تعذّر التسجيل، حاول لاحقًا"); }
      });
    }
    if (cwUnsub) { cwUnsub(); cwUnsub = null; }
    if (window.LIVE) LIVE.ready.then((be) => {
      if (!be || !be.watchBoard) return;
      lb = be;
      cwUnsub = be.watchBoard(bid, paintBoard);
      offerSubmit();
    });
    cwTimer = setInterval(tick, 1000);
    paint();
    if (st.done) finish();
  }

  /* ---------- القائمة ---------- */
  const GAMES = [
    { id: "cw", e: "✦", name: "كلمات العدد", d: "إجاباتها في مقالات العدد", run: crossword },
    { id: "who", e: "؟", name: "خمّن مَن؟", d: "زملاؤك وهم صغار", run: who },
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
