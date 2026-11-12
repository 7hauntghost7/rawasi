/* =========================================================
   صحيفة الرواسي — بناء الصفحات
   كل صفحة HTML تحدد نوعها في <body data-page="...">
   والمحتوى كله يُقرأ من js/data.js
   ========================================================= */
(() => {
  const PAGE = document.body.dataset.page || "home";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("rawasi:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("rawasi:" + k, JSON.stringify(v)); } catch { /* تخزين غير متاح */ } },
  };
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const VARIETY = {
    name: "منوعات", short: "منوعات", icon: "📰", color: "#2d2d2d", page: "variety.html",
    motto: "نبض الدفعة",
    about: "أخبار الأمانات الرياضية والأكاديمية والاجتماعية، وأعياد الميلاد، ولوحة الإهداءات.",
  };
  const club = (k) => CLUBS[k] || VARIETY;
  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("ar-SD-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
  const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  const pens = sorted.filter((a) => a.pen);

  /* ---------- أدوات عامة ---------- */
  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }
  function confetti(n = 70) {
    const colors = ["#e9ab11", "#ffcc5e", "#b54a2a", "#7e331c", "#e4cc85", "#2d6a6a"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }
  // رموز قص الورق (بدل الإيموجي)
  const GLYPHS = {
    adabi: '<path fill-rule="evenodd" d="M24 3l11 19-6 16H19l-6-16zM24 19a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1.3 0h2.6V7h-2.6z"/><rect x="17" y="40" width="14" height="5" rx="1.5"/>',
    ilmi: '<path fill-rule="evenodd" d="M18 3h12v4h-2v11l11 19a5 5 0 0 1-4.3 8H13.3A5 5 0 0 1 9 37l11-19V7h-2zM23 7v12.3L17.7 28h12.6L25 19.3V7z"/><circle cx="21" cy="36" r="2.5"/><circle cx="29" cy="38" r="1.8"/>',
    dini: '<path d="M29 5a19.5 19.5 0 1 0 14 31A16 16 0 1 1 29 5z"/><path d="M35 11l2.3 6.7L44 20l-6.7 2.3L35 29l-2.3-6.7L26 20l6.7-2.3z"/>',
    munazarat: '<path d="M6 6h24a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H17l-8 7v-7H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"/><path d="M37 15h5a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-2v7l-8-7H21a3 3 0 0 1-3-3v-2h13a6 6 0 0 0 6-6z"/>',
    fanni: '<path fill-rule="evenodd" d="M24 4C12 4 3 13 3 24s9 20 20 20c4.5 0 6-3 4-6.5-2.3-4 .5-7.5 5-7.5h6c5 0 8-3.5 8-8C46 12 36 4 24 4zM15 15.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9-5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm10 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 27a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
    turathi: '<path d="M25 2h4v4h-1l1 9c7 3 12 10 12 17 0 6-3 10-7 13H20c-4-3-7-7-7-13 0-7 5-14 12-17l1-9h-1z"/><path d="M14 33C8 29 5 22 3 13l5-1c1 7 3 11 7 14z"/><rect x="18" y="44" width="18" height="2.5" rx="1"/>',
    variety: '<path fill-rule="evenodd" d="M5 6h30v32a4 4 0 0 0 4 4H10a5 5 0 0 1-5-5zm6 7v7h9v-7zm13 0v3h7v-3zm0 5v3h7v-3zM11 25v2.5h20V25zm0 6v2.5h20V31z"/><path d="M38 14h5v24a3 3 0 0 1-5 2z"/>',
    games: '<path fill-rule="evenodd" d="M11 5h26a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H11a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6zm4 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm18 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm18 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
  };
  const glyph = (k) => `<svg class="gl" viewBox="0 0 48 48" aria-hidden="true">${GLYPHS[k] || GLYPHS.variety}</svg>`;
  // لون النص المناسب فوق لون النادي
  const onColor = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
    return .2126 * r + .7152 * g + .0722 * b > .24 ? "#2e1109" : "#ffffff";
  };
  const tone = (c) => `--c:${c.color};--on:${onColor(c.color)}`;
  const ridge = (color) => `<svg class="ridge" style="color:${color}" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" opacity=".35" d="M0 70V34L90 14L190 40L300 8L430 42L560 18L690 44L830 10L960 40L1080 16L1200 36V70Z"/><path fill="currentColor" d="M0 70V52L120 30L230 56L380 22L520 54L660 34L820 58L980 26L1100 52L1200 40V70Z"/></svg>`;
  const KID_SVG = `<svg viewBox="0 0 400 400" aria-hidden="true"><rect width="400" height="400" fill="#c98a4b"/><circle cx="330" cy="70" r="90" fill="#f1cf8c"/><path d="M0 400V300q90-70 200-60t200 60v100z" fill="#7e331c"/><circle cx="200" cy="165" r="82" fill="#6b3a22"/><path d="M118 150q10-85 90-82t76 78q-30-40-80-38t-86 42z" fill="#231009"/><path d="M100 400q8-120 100-120t100 120z" fill="#f7eedd"/></svg>`;
  window.R = { $, $$, esc, store, shuffle, toast, confetti, club, fmt, glyph, tone, KID_SVG };

  /* ---------- قطع مشتركة ---------- */
  const secHead = (title, more) =>
    `<div class="sec-head"><h2>${title}</h2>${more ? `<a class="more" href="${more.href}">${more.label} ←</a>` : ""}</div>`;

  // تاريخ نسبي قصير: اليوم، أمس، قبل 3 أيام…
  function ago(d) {
    const t = new Date(); t.setHours(12, 0, 0, 0);
    const n = Math.round((t - new Date(d + "T12:00:00")) / 864e5);
    if (n < 0) return fmt(d);
    if (n === 0) return "اليوم";
    if (n === 1) return "أمس";
    if (n === 2) return "قبل يومين";
    if (n <= 10) return `قبل ${n} أيام`;
    if (n < 30) return `قبل ${n} يومًا`;
    return new Date(d + "T12:00:00").toLocaleDateString("ar-SD-u-nu-latn", { day: "numeric", month: "long" });
  }

  function card(a) {
    const c = club(a.club);
    return `<article class="card reveal" data-read="${a.id}" tabindex="0" style="${tone(c)}">
      <div class="thumb">${a.img ? `<img src="${a.img}" alt="" loading="lazy">` : glyph(a.club)}</div>
      <div class="body">
        <span class="kick"><b>${a.club === "variety" ? esc(a.type) : c.name}</b><span>${ago(a.date)}</span></span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}</p>
      </div>
    </article>`;
  }

  const penCard = (a) => `<article class="pen-card reveal" data-read="${a.id}" tabindex="0">
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.excerpt)}</p>
      <div class="by">بقلم ${esc(a.author)}</div>
    </article>`;

  function hero(c, key) {
    const ic = c.logo ? `<img src="${c.logo}" alt="">` : glyph(key);
    return `<section class="club-hero" style="${tone(c)}">
      <div class="wrap">
        <div class="ic">${ic}</div>
        <div>
          <h1>${esc(c.name)}</h1>
          <div class="motto">${esc(c.motto)}</div>
          <p>${esc(c.about)}</p>
        </div>
      </div>
      ${ridge("var(--paper)")}
    </section>`;
  }

  /* ---------- الهيكل: ترويسة وقائمة وشريط وتذييل ---------- */
  function shell(main) {
    const act = (p) => (PAGE === p ? "active" : "");
    const clubLinks = Object.entries(CLUBS)
      .map(([k, c]) => `<a href="${c.page}" class="${act(k)}">${glyph(k)}${c.name}</a>`).join("");
    const tick = TICKER.map((t) => `<span>${esc(t)}</span>`).join("");
    const ext = (u) => (u && u !== "#" ? `href="${u}" target="_blank" rel="noopener"` : `href="#" data-soon`);

    const ico = {
      home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
      clubs: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14.5q4 3.5 8 0"/><path d="M9 9.5v.01M15 9.5v.01"/>',
      pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      games: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".6"/><circle cx="18" cy="13.5" r=".6"/>',
      news: '<path d="M4 5h12v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M16 9h4v10a2 2 0 0 1-4 0"/><path d="M8 9h4M8 13h4M8 17h3"/>',
    };
    const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ico[k]}</svg>`;
    const isClub = !!CLUBS[PAGE];

    document.body.insertAdjacentHTML("afterbegin", `
      <nav class="nav" id="nav"><div class="wrap">
        <a href="index.html" class="brand" aria-label="${esc(SITE.name)}"><img class="mini-logo" src="assets/img/brand/logo-ar-gold.png" alt="${esc(SITE.name)}"></a>
        <ul class="main">
          <li><a href="index.html" class="${act("home")}">الرئيسية</a></li>
          <li class="dd"><button type="button">النوادي ▾</button><div class="dd-menu">${clubLinks}</div></li>
          <li><a href="rawasiyat.html" class="${act("rawasiyat")}">رواسيات</a></li>
          <li><a href="adabi.html#pens">بأقلام الرواسي</a></li>
          <li><a href="variety.html" class="${act("variety")}">منوعات</a></li>
          <li><a href="games.html" class="${act("games")}">الألعاب</a></li>
        </ul>
        <a class="cta" ${ext(SITE.submitUrl)}>شارك</a>
      </div></nav>
      ${PAGE === "home" ? `<h1 class="sr">${esc(SITE.name)}</h1><div class="ticker" aria-label="أخبار عاجلة"><div class="label">عاجل</div><div class="track">${tick}${tick}</div></div>` : ""}
      <main id="main">${main}</main>
      <nav class="tabbar" aria-label="التنقل">
        <a href="index.html" class="${act("home")}">${svg("home")}الرئيسية</a>
        <button type="button" data-sheet class="${isClub ? "active" : ""}">${svg("clubs")}النوادي</button>
        <a href="rawasiyat.html" class="${act("rawasiyat")}">${svg("smile")}رواسيات</a>
        <a href="games.html" class="${act("games")}">${svg("games")}الألعاب</a>
        <a href="variety.html" class="${act("variety")}">${svg("news")}منوعات</a>
      </nav>
      <div class="clubs-sheet" id="clubs-sheet"><div class="in">
        <h3>النوادي</h3>
        <div class="list">${Object.entries(CLUBS).map(([k, c]) => `<a href="${c.page}" style="${tone(c)}">${glyph(k)}${c.short}</a>`).join("")}</div>
      </div></div>
      <footer>${ridge("var(--brown)")}<div class="wrap">
        <div class="cols">
          <div>
            <img src="assets/img/brand/logo-ar-gold.png" alt="" style="height:44px;width:auto;margin-bottom:10px">
            <p style="margin:0">صحيفة الأمانة الثقافية، الدفعة 101، كلية الطب، جامعة الخرطوم.</p>
            <div class="social"><a ${ext(SITE.submitUrl)}>أرسل مشاركة</a><a ${ext(SITE.instagram)}>إنستغرام</a><a ${ext(SITE.whatsapp)}>واتساب</a></div>
          </div>
          <div><h4>النوادي</h4>${Object.values(CLUBS).map((c) => `<a href="${c.page}">${c.name}</a>`).join("")}</div>
          <div><h4>روابط</h4>
            <a href="rawasiyat.html">رواسيات</a>
            <a href="adabi.html#pens">بأقلام الرواسي</a>
            <a href="games.html">ركن الألعاب</a>
            <a href="variety.html">منوعات</a>
          </div>
        </div>
        <div class="copy">© ${new Date().getFullYear()} ${esc(SITE.name)}</div>
      </div></footer>
      <div class="modal" id="reader" role="dialog" aria-modal="true" aria-label="قراءة">
        <div class="sheet"></div>
      </div>`);
    document.body.appendChild(toastEl);
  }

  /* ---------- نافذة القراءة ---------- */
  const isOpen = () => $("#reader").classList.contains("open");
  function openModal(html, light) {
    const m = $("#reader");
    m.classList.toggle("lightbox", light === true);
    m.classList.toggle("embedm", light === "embed");
    $(".sheet", m).innerHTML = html;
    m.classList.add("open");
    m.scrollTop = 0;
    document.body.style.overflow = "hidden";
    m.tabIndex = -1;
    m.focus({ preventScroll: true });
  }
  function closeModal(fromPop) {
    if (!isOpen()) return;
    $("#reader").classList.remove("open");
    if (window.RAWASI_COMMENTS_STOP) window.RAWASI_COMMENTS_STOP();
    $("#reader .sheet").innerHTML = ""; // يوقف الفيديو وأي محتوى يعمل في الخلفية
    document.body.style.overflow = "";
    if (fromPop) return;
    if (history.state && (history.state.read || history.state.lb)) history.back();
    else if (location.hash.startsWith("#read-")) history.replaceState(null, "", location.pathname + location.search);
  }
  // زر الرجوع في الجوال يغلق المقال بدل مغادرة الموقع
  addEventListener("popstate", (e) => {
    const id = e.state && e.state.read;
    if (id) openArticle(id, true);
    else closeModal(true);
  });

  /* ---------- صفحة المقال ---------- */
  const ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
  const FONT_SIZES = [20, 23, 26];
  const num = (n) => Number(n).toLocaleString("ar-SD-u-nu-latn");

  function readMins(a) {
    const words = [a.excerpt, ...(a.body || []), ...(a.poem || []).flat()].join(" ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  }

  // تنسيق ذكي للفقرة: قل ولا تقل، الآيات، الروابط، الملاحظات
  function para(p, c) {
    const raw = String(p).trim();
    const qul = raw.match(/^قل:\s*(«[^»]+»|[^،.]+?)\s*ولا تقل:\s*(«[^»]+»|[^،.]+?)\s*[.،]?\s*(.*)$/);
    if (qul) {
      const clean = (s) => esc(s.replace(/[«»]/g, ""));
      return `<div class="split"><div class="ok"><b>قل</b><span>${clean(qul[1])}</span></div><div class="no"><b>ولا تقل</b><span>${clean(qul[2])}</span></div>${qul[3] ? `<small>${esc(qul[3])}</small>` : ""}</div>`;
    }
    if (/^\(.*\)$/.test(raw)) return `<p class="rd-note">${esc(raw.slice(1, -1))}</p>`;
    let h = esc(raw)
      .replace(/﴿([^﴾]+)﴾/g, '<span class="rd-ayah">﴿$1﴾</span>')
      .replace(/صفحة الألعاب/g, '<a href="games.html">صفحة الألعاب</a>')
      .replace(/صفحة (النادي[^\s،.!؟]*(?: [^\s،.!؟]+)?)/g, (m) => `<a href="${c.page}">${m}</a>`);
    return `<p>${h}</p>`;
  }

  const poemBlock = (poem) => `<div class="rd-poem" role="group" aria-label="أبيات">
      ${poem.map(([s, e]) => `<div class="bayt"><span class="s">${esc(s)}</span><span class="e">${esc(e)}</span></div>`).join("")}
    </div>`;

  function related(a) {
    const others = sorted.filter((x) => x.id !== a.id);
    const same = others.filter((x) => x.club === a.club && !!x.pen === !!a.pen);
    const rest = others.filter((x) => !same.includes(x) && x.club !== "variety");
    return [...same, ...rest].slice(0, 3);
  }

  // تعليقات المقال تبقى مفتوحة أيامًا محددة بعد نشره (SITE.commentDays، الافتراضي يومان)
  // ينتظر حتى تُحمَّل كل السكربتات (ومنها اتصال قاعدة البيانات)
  const afterScripts = (fn) => (document.readyState === "loading" ? addEventListener("DOMContentLoaded", fn, { once: true }) : fn());
  const commentDays = () => (SITE.commentDays != null && SITE.commentDays !== "" ? Math.max(0, +SITE.commentDays) : 2);
  const commentEnd = (a) => new Date(a.date + "T23:59:59").getTime() + commentDays() * 864e5;
  const commentsOpen = (a) => Date.now() <= commentEnd(a);
  const commentNote = (a) => commentsOpen(a)
    ? `التعليقات مفتوحة حتى ${new Date(commentEnd(a)).toLocaleDateString("ar-SD-u-nu-latn", { weekday: "long", day: "numeric", month: "long" })}`
    : "تُغلق التعليقات بعد نشر المقال بأيام قليلة.";
  function openArticle(id, fromPop) {
    const a = ARTICLES.find((x) => x.id === id);
    if (!a) return;
    const c = club(a.club);
    const fs = store.get("fs", 1);
    const initial = [...String(a.author || "؟").replace(/^(ال)/, "")][0] || "؟";
    const rel = related(a);
    const url = location.origin + location.pathname + "#read-" + a.id;
    const wa = "https://wa.me/?text=" + encodeURIComponent(`${a.title}\n${SITE.name}\n${url}`);
    const body = a.body || [];

    const mins = readMins(a);
    const html = `<div class="rd-wrap" style="${a.pen ? "--c:#e3cf8b;--on:#2e1109" : tone(c)}">
      <div class="rd-bar">
        <button class="rd-btn close" aria-label="رجوع">→</button>
        <a class="rd-club" href="${c.page}">${c.name}</a>
        <button class="rd-btn" data-font aria-label="حجم الخط"><span style="font-size:12px">أ</span><span style="font-size:19px">أ</span></button>
        <button class="rd-btn" data-share="${a.id}" aria-label="مشاركة">${ICON_SHARE}</button>
        <div class="rd-progress"><i id="rd-prog"></i></div>
      </div>
      <article class="rd ${a.pen ? "is-pen" : ""}" style="--rd-fs:${FONT_SIZES[fs] || 23}px">
        <header class="rd-cover">
          ${a.pen ? "" : `<span class="bg">${glyph(a.club)}</span>`}
          <div class="rd-in">
            <div class="rd-kicker">
              <span>${a.pen ? "بأقلام الرواسي" : esc(a.type)}</span>
              ${a.pen ? "" : `<i>✦</i><a href="${c.page}">${c.name}</a>`}
            </div>
            <h1>${esc(a.title)}</h1>
            <div class="rd-by">
              <span class="av">${esc(initial)}</span>
              <div><b>${a.pen ? "بقلم " : ""}${esc(a.author)}</b><small>${fmt(a.date)} ✦ ${num(mins)} ${mins <= 2 ? "دقيقة" : "دقائق"} قراءة</small></div>
            </div>
          </div>
          ${ridge("var(--paper)")}
        </header>
        ${a.img ? `<figure class="rd-hero"><img src="${a.img}" alt=""></figure>` : ""}
        <div class="rd-body">
          ${a.excerpt ? `<p class="rd-dek">${esc(a.excerpt)}</p>` : ""}
          ${a.poem ? poemBlock(a.poem) : ""}
          ${body.map((p) => para(p, c)).join("")}
          <div class="rd-end" aria-hidden="true">✦</div>
          ${typeof CROSSWORD !== "undefined" && CROSSWORD.some((w) => w.article === a.id) ? `<a class="rd-cw" href="games.html#cw"><b>في المقال ده إجابة من «كلمات العدد»</b><span>جاوب ←</span></a>` : ""}
        </div>
        <div class="rd-share">
          <b>شاركها مع الدفعة</b>
          <div>
            <a class="btn rd-wa" href="${wa}" target="_blank" rel="noopener">واتساب</a>
            <button class="btn ghost" data-copy="${a.id}">نسخ الرابط</button>
          </div>
        </div>
        <section class="rd-com"${window.RAWASI_COMMENTS ? "" : " hidden"}>
          <div class="chat-head"><b>التعليقات</b><span class="meta th-n"></span></div>
          <p class="meta rd-com-note">${esc(commentNote(a))}</p>
          <div class="chat-list th-list"><div class="chat-empty">…</div></div>
          <div class="th-form-wrap"></div>
        </section>
        ${a.pen ? `<div class="rd-cta"><b>عندك نص؟</b><span>منبر «بأقلام الرواسي» مفتوح لكل الدفعة.</span>
          <a class="btn" ${SITE.submitUrl !== "#" ? `href="${SITE.submitUrl}" target="_blank" rel="noopener"` : `href="#" data-soon`}>أرسل نصّك</a></div>` : ""}
        ${rel.length ? `<section class="rd-more"><h3>اقرأ كمان</h3>${rel.map((r) => {
          const rc = club(r.club);
          return `<a class="rd-rel" data-read="${r.id}" href="#read-${r.id}">
            <span class="th" style="${tone(rc)}">${r.img ? `<img src="${r.img}" alt="" loading="lazy">` : glyph(r.club)}</span>
            <span class="tx"><b>${esc(r.title)}</b><small>${rc.name}</small></span></a>`;
        }).join("")}</section>` : ""}
      </article></div>`;

    if (!fromPop) {
      if (isOpen() && history.state && history.state.read) history.replaceState({ read: id }, "", "#read-" + id);
      else history.pushState({ read: id }, "", "#read-" + id);
    }
    openModal(html);
    const cbox = $("#reader .rd-com");
    if (cbox && window.RAWASI_COMMENTS) window.RAWASI_COMMENTS(cbox, "art-" + a.id, { open: commentsOpen(a), placeholder: "اكتب تعليقك على المقال…", closedText: "أُغلقت التعليقات على هذا المقال." });
  }

  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } finally { ta.remove(); }
    return Promise.resolve();
  }
  async function share(id) {
    const a = ARTICLES.find((x) => x.id === id);
    const url = location.origin + location.pathname + "#read-" + id;
    try {
      if (navigator.share) { await navigator.share({ title: a.title, text: a.excerpt, url }); return; }
      await copyText(url);
      toast("تم نسخ الرابط ✔");
    } catch { /* أُلغيت المشاركة */ }
  }

  // شريط التقدم في القراءة
  document.addEventListener("scroll", (e) => {
    if (e.target.id !== "reader") return;
    const m = e.target, bar = $("#rd-prog");
    if (bar) bar.style.width = Math.min(100, (m.scrollTop / Math.max(1, m.scrollHeight - m.clientHeight)) * 100) + "%";
  }, true);

  const weeklyGuess = () => (GUESS_WHO.length ? GUESS_WHO[Math.floor(Date.now() / (7 * 864e5)) % GUESS_WHO.length] : null);

  /* ---------- الصفحة الرئيسية ---------- */
  function homePage() {
    const feat = sorted.filter((a) => a.featured);
    // صور أولًا ثم البقية، حتى 5 شرائح
    const slides = [...feat.filter((a) => a.img), ...feat.filter((a) => !a.img)].slice(0, 5);
    if (!slides.length && sorted[0]) slides.push(sorted[0]);
    if (!slides.length) return `<section class="section wrap"><p class="meta">لا توجد مقالات بعد.</p></section>`;
    const shown = new Set(slides);
    const pool = sorted.filter((a) => !a.pen && a.club !== "variety" && !shown.has(a));
    const latest = pool.slice(0, pool.length >= 6 ? 6 : 3);
    const variety = sorted.filter((a) => a.club === "variety").slice(0, 3);
    const g = weeklyGuess();

    return `
    <section class="top-blk" aria-roledescription="carousel" aria-label="أبرز القصص"><div class="wrap">
      <div class="car-track" id="car">
        ${slides.map((a, i) => {
          const c = club(a.club);
          return `<article class="slide" data-read="${a.id}" tabindex="0" style="${tone(c)}" aria-label="${i + 1} من ${slides.length}">
            <div class="slide-img">${a.img ? `<img src="${a.img}" alt="" ${i ? 'loading="lazy"' : ""}>` : `${glyph(a.club)}<span class="tag">${esc(a.type)}</span>`}</div>
            <div class="slide-tx">
              <span class="kick"><b>${c.name}</b><span>${ago(a.date)}</span></span>
              <h2>${esc(a.title)}</h2>
              <p>${esc(a.excerpt)}</p>
              <span class="hero-go">اقرأ ←</span>
            </div>
          </article>`;
        }).join("")}
      </div>
      ${slides.length > 1 ? `<div class="car-nav">
        <button class="car-arr" data-car="-1" aria-label="السابق">→</button>
        <div class="dots">${slides.map((a, i) => `<button data-dot="${i}" class="${i ? "" : "on"}" aria-label="الشريحة ${i + 1}"></button>`).join("")}</div>
        <button class="car-arr" data-car="1" aria-label="التالي">←</button>
      </div>` : ""}
    </div>${ridge("var(--mustard)")}</section>

    ${g ? `<section class="tz"><a class="tz-in wrap" href="rawasiyat.html">
      <div class="tz-ph">${g.img ? `<img src="${esc(g.img)}" alt="">` : KID_SVG}</div>
      <div><small>رواسيات</small><h2>خمّن مَن؟</h2><p>${esc(g.hint)}</p></div>
    </a></section>` : ""}

    <section class="section wrap">
      ${secHead("النوادي")}
      <div class="clubs-strip">
        ${Object.entries(CLUBS).map(([k, c]) => `<a class="club-tile" href="${c.page}" style="${tone(c)}">
          ${glyph(k)}<b>${c.short}</b><small>${esc(c.motto)}</small></a>`).join("")}
      </div>
    </section>

    <section class="section wrap" style="padding-top:0">
      ${secHead("جديد الصحيفة")}
      <div class="grid g3">${latest.map(card).join("")}</div>
    </section>

    <div class="blk-sand"><section class="section wrap">
      ${secHead("بأقلام الرواسي", { href: "adabi.html#pens", label: "الكل" })}
      <div class="grid g3">${pens.slice(0, 3).map(penCard).join("")}</div>
    </section></div>

    <section class="games-blk"><a class="in wrap" href="games.html#cw">
      <div><small>العدد ${SITE.issue}</small><h2>كلمات العدد</h2><p>كل الإجابات في مقالات العدد. قريتها؟</p></div>
      ${glyph("games")}
    </a></section>

    <section class="section wrap">
      ${secHead("منوعات", { href: "variety.html", label: "المزيد" })}
      <div class="grid g3">${variety.map(card).join("")}</div>
    </section>`;
  }

  /* ---------- قائمة مقالات مع تبويبات ---------- */
  function articleList(list, id) {
    if (!list.length) return `<p class="meta">لا توجد مواد منشورة بعد — كن أول من يشارك!</p>`;
    const types = [...new Set(list.map((a) => a.type))];
    const tabs = types.length > 1
      ? `<div class="tabs" data-tabs="${id}"><button class="on" data-t="">الكل</button>${types.map((t) => `<button data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>`
      : "";
    return `${tabs}<div class="grid g3" id="${id}">${list.map(card).join("")}</div>`;
  }
  function bindTabs(id, list) {
    const bar = $(`[data-tabs="${id}"]`);
    if (!bar) return;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", bar).forEach((x) => x.classList.toggle("on", x === b));
      const t = b.dataset.t;
      $("#" + id).innerHTML = list.filter((a) => !t || a.type === t).map(card).join("");
      observe();
    });
  }

  /* ---------- فوائد، تفسير، معاني الكلمات ---------- */
  const has = (n) => typeof window[n] !== "undefined" || (() => { try { return typeof eval(n) !== "undefined"; } catch { return false; } })();
  const ytId = (u) => ((String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1]);
  function fawaidSec(k, title) {
    if (!has("FAWAID")) return "";
    const list = FAWAID.map((f, i) => ({ f, i })).filter(({ f }) => f.club === k);
    if (!list.length) return "";
    return `<section class="section wrap">
      ${secHead(title)}
      <div class="fw-grid">${list.map(({ f, i }, n) => `<button type="button" class="fw t${n % 4} reveal" data-fw="${i}">
        <span class="fw-k">${f.video ? "فيديو" : f.link ? "لقاء" : "فائدة"}</span>
        <b>${esc(f.title)}</b>
        <span class="fw-go">${f.video ? "شاهد ←" : "اقرأ ←"}</span>
      </button>`).join("")}</div>
    </section>`;
  }
  const fwUrl = (i) => location.origin + location.pathname + "#fw-" + i;
  async function shareFawaid(i) {
    const f = FAWAID[i];
    if (!f) return;
    try {
      if (navigator.share) { await navigator.share({ title: f.title, text: f.title, url: fwUrl(i) }); return; }
      await copyText(fwUrl(i));
      toast("تم نسخ الرابط ✔");
    } catch { /* أُلغيت */ }
  }
  function openFawaid(i) {
    const f = FAWAID[i];
    if (!f) return;
    const c = club(f.club), vid = ytId(f.video);
    const linkLabel = /t\.me\//.test(f.link || "") ? "افتح اللقاء في تيليجرام" : "افتح الرابط";
    if (!isOpen()) history.pushState({ lb: 1 }, "", location.href);
    openModal(`<div class="rd-wrap" style="${tone(c)}">
      <div class="rd-bar"><button class="rd-btn close" aria-label="رجوع">→</button><span class="rd-club">${c.name}</span></div>
      <article class="rd">
        <header class="rd-cover"><span class="bg">${glyph(f.club)}</span><div class="rd-in">
          <div class="rd-kicker"><span>${f.club === "dini" ? "فوائد متفرقات" : "بين القرآن والعلم"}</span></div>
          <h1>${esc(f.title)}</h1>
        </div>${ridge("var(--paper)")}</header>
        ${vid ? `<div class="fw-video"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${esc(f.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}
        <div class="rd-body">
          ${(f.text || []).map((p) => para(p, c)).join("")}
          ${f.link ? `<p><a class="btn" href="${esc(f.link)}" target="_blank" rel="noopener">${linkLabel}</a></p>` : ""}
          <div class="rd-end" aria-hidden="true">✦</div>
        </div>
        <div class="rd-share">
          <b>شاركها مع الدفعة</b>
          <div>
            <a class="btn rd-wa" href="https://wa.me/?text=${encodeURIComponent(`${f.title}
${SITE.name}
${fwUrl(i)}`)}" target="_blank" rel="noopener">واتساب</a>
            <button type="button" class="btn ghost" data-fwshare="${i}">مشاركة</button>
          </div>
        </div>
      </article></div>`);
  }
  /* ---------- رسالة إليك: أوراق مبعثرة، ترفع واحدة وتقرأها ---------- */
  const RCATS = { faith: "الإيمان والروح", healing: "النفس والتعافي", relationships: "العلاقات", life: "الحياة", ambition: "النجاح والطموح", study: "الدراسة والتعلم", failure: "الفشل والخسارة", reflection: "التأمل والفكر" };
  let rlOpenById = null;
  function resalaSec() {
    if (!has("RESALA") || !RESALA.length) return "";
    const cats = [...new Set(RESALA.map((m) => m.cat))];
    return `<section class="rl" id="resala"><div class="wrap rl-in">
      <p class="rl-eye">مساحة صغيرة، ورسائل كثيرة</p>
      <h2 class="rl-title">رسالة إليك</h2>
      <p class="rl-sub">في مكان ما بين هذه الأوراق، هناك رسالة كُتبت لك.</p>
      <div class="rl-tools">
        <div class="rl-cats" id="rl-cats"><button type="button" class="on" data-rc="">الكل</button>${cats.map((c) => `<button type="button" data-rc="${esc(c)}">${esc(RCATS[c] || c)}</button>`).join("")}</div>
        <div class="rl-btns"><button type="button" class="rl-rand" data-rrand>ربما هذه رسالتك ✦</button><button type="button" class="rl-rand" data-rmore>أوراق أخرى ↻</button></div>
      </div>
      <div class="rl-pool" id="rl-pool" aria-label="رسائل مبعثرة"></div>
      <p class="rl-hint">حرّك الأوراق، والمس واحدة لترفعها وتقرأها</p>
    </div></section>`;
  }
  function bindResala() {
    const pool = $("#rl-pool");
    if (!pool) return;
    const readS = new Set(store.get("rl-read", []));
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cat = "", z = 10, drag = null, cur = null, typing = null;

    function scatter() {
      pool.innerHTML = "";
      const list = shuffle(RESALA.filter((m) => !cat || m.cat === cat)).slice(0, 10);
      const W = pool.clientWidth, H = pool.clientHeight;
      const cols = Math.max(2, Math.round(Math.sqrt(list.length * W / H))), rows = Math.ceil(list.length / cols);
      const order = list.map((m, n) => n).sort(() => Math.random() - .5);
      list.forEach((m, n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "rl-p" + (readS.has(m.id) ? " read" : "");
        b.dataset.id = m.id;
        b.innerHTML = `<small>${esc(RCATS[m.cat] || "")}</small><b>${esc(m.title)}</b><i>${readS.has(m.id) ? "قُرئت" : "✧"}</i>`;
        pool.appendChild(b);
        const pw = b.offsetWidth, ph = b.offsetHeight, slot = order[n];
        const cw = (W - pw) / Math.max(1, cols - 1), ch = (H - ph) / Math.max(1, rows - 1);
        const x = (slot % cols) * cw + (Math.random() - .5) * cw * 1.1, y = Math.floor(slot / cols) * ch + (Math.random() - .5) * ch * 1.2;
        b.style.left = Math.min(W - pw, Math.max(0, x)) + "px";
        b.style.top = Math.min(H - ph, Math.max(0, y)) + "px";
        b.style.setProperty("--r", (Math.random() * 18 - 9).toFixed(1) + "deg");
        b.style.zIndex = ++z;
      });
    }

    // سحب الأوراق (على الجوال: السحب الجانبي يحرّك الورقة، والتمرير العمودي للصفحة)
    pool.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".rl-p");
      if (!el || (e.button !== undefined && e.button !== 0)) return;
      drag = { el, x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, moved: false };
      el.style.zIndex = ++z;
      try { el.setPointerCapture(e.pointerId); } catch { /* */ }
    });
    pool.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 7) { drag.moved = true; drag.el.classList.add("drag"); }
      if (!drag.moved) return;
      drag.el.style.left = Math.max(-20, Math.min(pool.clientWidth - drag.el.offsetWidth + 20, drag.l + dx)) + "px";
      drag.el.style.top = Math.max(-20, Math.min(pool.clientHeight - drag.el.offsetHeight + 20, drag.t + dy)) + "px";
    });
    const endDrag = (open) => {
      if (!drag) return;
      const { el, moved } = drag;
      el.classList.remove("drag");
      drag = null;
      if (open && !moved) pick(el);
    };
    pool.addEventListener("pointerup", () => endDrag(true));
    pool.addEventListener("pointercancel", () => endDrag(false));
    pool.addEventListener("click", (e) => { const el = e.target.closest(".rl-p"); if (el && e.detail === 0) pick(el); }); // لوحة المفاتيح

    // ترفع الورقة ثم تكبر لتصبح الرسالة
    function pick(el) {
      el.style.zIndex = ++z;
      el.classList.add("lift");
      setTimeout(() => openLetter(el.dataset.id, el), calm ? 0 : 230);
    }
    function reader() {
      let ov = $("#rl-reader");
      if (ov) return ov;
      document.body.insertAdjacentHTML("beforeend", `<div class="rl-reader" id="rl-reader" role="dialog" aria-modal="true" aria-labelledby="rl-h">
        <div class="rl-back"></div>
        <article class="rl-letter">
          <button type="button" class="rl-x" aria-label="إغلاق">×</button>
          <div class="rl-stamp">✧</div><p class="rl-cat" id="rl-cat"></p><h3 id="rl-h"></h3>
          <div class="rl-body" id="rl-body"></div>
          <div class="rl-acts"><button type="button" data-rshare>مشاركة ↗</button><button type="button" data-rrand>رسالة أخرى ✦</button></div>
          <p class="rl-sign">إليك، أينما كنت.</p>
        </article></div>`);
      ov = $("#rl-reader");
      ov.addEventListener("click", (e) => {
        if (e.target.closest(".rl-x") || e.target.classList.contains("rl-back")) closeLetter();
        else if (e.target.closest("[data-rshare]")) shareLetter();
      });
      return ov;
    }
    function openLetter(id, el) {
      const m = RESALA.find((x) => x.id === id);
      if (!m) return;
      const ov = reader(), L = $(".rl-letter", ov);
      if (!cur) history.pushState({ lb: 1 }, "", location.href);
      cur = { m, el };
      readS.add(id);
      store.set("rl-read", [...readS]);
      $("#rl-cat").textContent = RCATS[m.cat] || "";
      $("#rl-h").textContent = m.title;
      const body = $("#rl-body");
      ov.classList.add("open");
      document.body.style.overflow = "hidden";
      L.scrollTop = 0;
      clearInterval(typing);
      if (calm) body.textContent = m.body;
      else {
        let i = 0;
        body.textContent = "";
        typing = setInterval(() => { i += 3; body.textContent = m.body.slice(0, i); if (i >= m.body.length) clearInterval(typing); }, 18);
      }
      if (el && !calm && L.animate) {
        const p = el.getBoundingClientRect(), r = L.getBoundingClientRect();
        const rot = getComputedStyle(el).getPropertyValue("--r").trim() || "0deg";
        L.animate([
          { transform: `translate(${p.left + p.width / 2 - (r.left + r.width / 2)}px, ${p.top + p.height / 2 - (r.top + r.height / 2)}px) scale(${p.width / r.width}, ${p.height / r.height}) rotate(${rot})`, opacity: .7 },
          { transform: "none", opacity: 1 },
        ], { duration: 460, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    }
    function closeLetter(fromPop) {
      if (!cur) return;
      const { el } = cur;
      cur = null;
      clearInterval(typing);
      $("#rl-reader").classList.remove("open");
      document.body.style.overflow = "";
      if (el) {
        el.classList.remove("lift");
        el.classList.add("read");
        const mark = el.querySelector("i");
        if (mark) mark.textContent = "قُرئت";
      }
      if (!fromPop) history.back();
    }
    async function shareLetter() {
      if (!cur) return;
      const url = location.origin + location.pathname + "#resala-" + cur.m.id;
      try {
        if (navigator.share) await navigator.share({ title: cur.m.title, text: cur.m.body.slice(0, 120), url });
        else { await copyText(url); toast("تم نسخ رابط الرسالة"); }
      } catch { /* أُلغيت */ }
    }
    function randomLetter() {
      const els = $$(".rl-p", pool);
      if (!els.length) return;
      const el = els[Math.floor(Math.random() * els.length)];
      if (cur) { closeLetter(true); history.replaceState({ lb: 1 }, "", location.href); cur = null; openLetter(el.dataset.id, null); return; }
      pick(el);
    }
    addEventListener("popstate", () => { if (cur) closeLetter(true); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && cur) closeLetter(); });
    document.addEventListener("click", (e) => { if (e.target.closest("[data-rrand]")) randomLetter(); });
    $("[data-rmore]").addEventListener("click", scatter);
    $("#rl-cats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-rc]");
      if (!b) return;
      cat = b.dataset.rc;
      $$("#rl-cats button").forEach((x) => x.classList.toggle("on", x === b));
      scatter();
    });
    let rw = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; scatter(); } });
    rlOpenById = (id) => openLetter(id, null);
    scatter();
  }

  function newsSec() {
    if (!has("NEWS_SCI") || !NEWS_SCI.length) return "";
    return `<section class="section wrap">
      ${secHead("ماذا يحدث في العالم؟")}
      <p class="meta" style="margin-top:-8px">أبحاث جديدة، كل خبر بمصدره ونوع دراسته.</p>
      <div class="nw-grid">${NEWS_SCI.map((n) => `<article class="nw reveal">
        <span class="nw-tag">${esc(n.tag)}</span>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.summary)}</p>
        ${n.kind ? `<p class="nw-kind">${esc(n.kind)}</p>` : ""}
        <div class="nw-src"><span>${esc(n.source)}</span>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">المصدر ↗</a>` : ""}</div>
      </article>`).join("")}</div>
    </section>`;
  }
  function tafsirSec() {
    if (!has("TAFSIR") || !TAFSIR.length) return "";
    const hl = (t) => (t.focus && t.ayah.includes(t.focus) ? esc(t.ayah).replace(esc(t.focus), `<mark>${esc(t.focus)}</mark>`) : esc(t.ayah));
    return `<section class="section wrap">
      ${secHead("آية وتفسير")}
      <p class="meta" style="margin-top:-8px">اضغط على الآية لتقرأ تفسيرها.</p>
      <div class="tf-list">${TAFSIR.map((t) => `<details class="tf2 reveal">
        <summary><p class="ay">﴿${hl(t)}﴾</p><small>${esc(t.ref)}</small></summary>
        <div class="tf-body">
          <small>${esc(t.source || "التفسير")}${t.covers ? ` — ${esc(t.covers)}` : ""}</small>
          <p>${esc(t.meaning)}</p>
          ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">المصدر ↗</a>` : ""}
        </div>
      </details>`).join("")}</div>
      <p class="meta tf-src">التفسير منقول بنصّه من «التفسير الميسر» الصادر عن مجمع الملك فهد لطباعة المصحف الشريف، عبر موسوعة القرآن الكريم (QuranEnc.com).</p>
    </section>`;
  }
  const wordsSec = () => (has("AYAH_WORDS") && AYAH_WORDS.length ? `<section class="section wrap">
      ${secHead("اختبر معاني الكلمات")}
      <div class="aw" id="aw"></div>
    </section>` : "");
  function bindWords() {
    const box = $("#aw");
    if (!box) return;
    let i = 0, score = 0;
    const step = () => {
      if (i >= AYAH_WORDS.length) {
        box.innerHTML = `<div class="big-score"><div class="n">${score} / ${AYAH_WORDS.length}</div><p>${score === AYAH_WORDS.length ? "ما شاء الله، علامة كاملة!" : "أحسنت، وزد علمك بالرجوع للتفسير."}</p><button class="btn gold" data-aw="again">العب مرة أخرى</button></div>`;
        return;
      }
      const q = AYAH_WORDS[i];
      const ay = esc(q.ayah).replace(esc(q.word), `<mark>${esc(q.word)}</mark>`);
      box.innerHTML = `<div class="hud"><span>${esc(q.ref)}</span><span>${i + 1} من ${AYAH_WORDS.length}</span><span>النقاط: <b>${score}</b></span></div>
        <p class="aw-ayah">﴿${ay}﴾</p>
        <p class="aw-q">ما معنى «${esc(q.word)}»؟</p>
        <div class="choices">${q.options.map((o, j) => `<button type="button" class="choice" data-aw="${j}">${esc(o)}</button>`).join("")}</div>
        <div class="hint" id="aw-next"></div>`;
    };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-aw]");
      if (!b) return;
      const v = b.dataset.aw;
      if (v === "again") { i = 0; score = 0; return step(); }
      if (v === "next") { i++; return step(); }
      const q = AYAH_WORDS[i], ok = +v === q.answer;
      $$(".choice", box).forEach((x) => { x.disabled = true; if (+x.dataset.aw === q.answer) x.classList.add("right"); });
      if (ok) score++; else b.classList.add("wrong");
      $("#aw-next").innerHTML = `${ok ? "أحسنت!" : "الإجابة الصحيحة باللون الأخضر."}
        ${q.explain ? `<p class="aw-exp"><small>${esc(q.source || "التفسير")}${q.url ? ` · <a href="${esc(q.url)}" target="_blank" rel="noopener">المصدر ↗</a>` : ""}</small>«${esc(q.explain)}»</p>` : ""}
        <div style="margin-top:12px"><button class="btn" data-aw="next">${i + 1 < AYAH_WORDS.length ? "التالي ←" : "النتيجة"}</button></div>`;
    });
    step();
  }

  /* ---------- إضافات خاصة بكل نادٍ ---------- */
  const EXTRAS = {
    adabi: () => `
      <section class="section wrap" id="pens">
        ${secHead("بأقلام الرواسي")}
        <div class="grid g3">${pens.map(penCard).join("")}</div>
      </section>
      <div class="rd-cta"><b>عندك نص؟ قصيدة؟ خاطرة؟</b><span>منبر «بأقلام الرواسي» مفتوح لكل الدفعة.</span>
        <a class="btn" ${SITE.submitUrl !== "#" ? `href="${SITE.submitUrl}" target="_blank" rel="noopener"` : `href="#" data-soon`}>أرسل مشاركتك</a></div>
      <section class="section wrap">
        ${secHead("قل ولا تقل", { href: "games.html#qul", label: "اختبر نفسك" })}
        <div class="qul-grid">${QUL.map((q) => `<div class="split reveal">
          <div class="ok"><b>قل</b><span>${esc(q.right)}</span></div>
          <div class="no"><b>ولا تقل</b><span>${esc(q.wrong)}</span></div>
          ${q.note ? `<small>${esc(q.note)}</small>` : ""}
        </div>`).join("")}</div>
      </section>`,

    ilmi: () => `
      ${newsSec()}
      ${fawaidSec("ilmi", "بين القرآن والعلم")}
      <section class="section wrap">
        ${secHead("حقيقة أم خرافة؟")}
        <p class="meta" style="margin-top:-8px">اضغط على البطاقة لتكشف الإجابة.</p>
        <div class="grid g4">${FACTS.map((f) => `<div class="flip reveal" tabindex="0">
          <div class="in">
            <div class="f"><small>حقيقة أم خرافة؟</small><h4>${esc(f.q)}</h4></div>
            <div class="b"><b>${f.a ? "حقيقة" : "خرافة"}</b><span>${esc(f.why)}</span></div>
          </div>
        </div>`).join("")}</div>
      </section>`,

    dini: () => {
      const dhikr = ["سبحان الله", "الحمد لله", "الله أكبر", "لا إله إلا الله"];
      return `
      <section class="section wrap">
        <div class="grid g2">
          <div class="quote-box ayah-blk reveal">
            <div class="ayah">﴿${esc(AYAH.text)}﴾</div>
            <div class="by">${esc(AYAH.ref)}</div>
          </div>
          <div class="tasbeeh reveal">
            <h3>السبحة الإلكترونية</h3>
            <div class="tabs" id="dhikr" style="justify-content:center">${dhikr.map((d, i) => `<button class="${i ? "" : "on"}" data-d="${d}">${d}</button>`).join("")}</div>
            <button class="bead" id="bead" aria-label="سبّح">0</button>
            <div class="meta" id="dhikr-total"></div>
            <button class="btn ghost" id="bead-reset" style="margin-top:10px">تصفير</button>
          </div>
        </div>
      </section>
      ${resalaSec()}
      ${fawaidSec("dini", "فوائد متفرقات")}
      ${tafsirSec()}
      ${wordsSec()}`;
    },

    munazarat: () => `
      <section class="section wrap" id="live-sec" hidden></section>
      <section class="section wrap">
        <div class="grid g2">
          <div class="poll reveal" id="poll">
            <span class="badge">قضية الأسبوع</span>
            <h3 style="margin-top:12px">${esc(POLL.question)}</h3>
            <div id="poll-opts"></div>
            <div class="meta" id="poll-note"></div>
          </div>
          <div class="reveal">
            ${secHead("مناظرات قادمة")}
            ${DEBATES_UPCOMING.map((d) => {
              const dt = new Date(d.date + "T12:00:00");
              return `<div class="panel event">
                <div class="day"><b>${dt.toLocaleDateString("ar-SD-u-nu-latn", { day: "numeric" })}</b><small>${dt.toLocaleDateString("ar-SD-u-nu-latn", { month: "long" })}</small></div>
                <div><h4 style="margin:0">«${esc(d.motion)}»</h4><span class="meta">${esc(d.place)}</span></div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </section>`,

    fanni: () => {
      const kinds = [...new Set(GALLERY.map((g) => g.kind))];
      return `
      <section class="section wrap" id="gallery-sec">
        ${secHead("المعرض")}
        <div class="tabs" id="gal-tabs"><button class="on" data-k="">الكل</button>${kinds.map((k) => `<button data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div>
        <div class="gallery" id="gallery"></div>
      </section>`;
    },

    turathi: () => `
      <section class="section wrap reveal" style="padding-top:0">
        ${secHead("رحلتي إلى…")}
        <div class="panel"><div class="trips">${TRIPS.map((t, i) => `<div class="trip ${t.done ? "done" : ""}" ${t.done && t.article ? `data-read="${t.article}" tabindex="0"` : ""}>
          <div class="pin">${i + 1}</div><b>${esc(t.city)}</b><small>${esc(t.state)}</small>
        </div>`).join("")}</div></div>
      </section>
      <section class="section wrap">
        ${secHead("من أمثالنا")}
        <div class="grid g3">${PROVERBS.map((p) => `<div class="panel proverb reveal"><div class="p">«${esc(p.p)}»</div><p>${esc(p.m)}</p></div>`).join("")}</div>
      </section>
      <section class="section wrap">
        ${secHead("مفردات من لهجتنا")}
        <div class="grid g4">${WORDS_SD.map((w) => `<div class="panel word reveal"><b>${esc(w.w)}</b><span>${esc(w.m)}</span></div>`).join("")}</div>
      </section>`,
  };

  /* ---------- صفحة نادٍ ---------- */
  function clubPage(k) {
    const c = club(k);
    const list = sorted.filter((a) => a.club === k && !a.pen);
    return `${hero(c, k)}
      <section class="section wrap">
        ${secHead("المنشورات")}
        ${articleList(list, "list")}
      </section>
      ${EXTRAS[k] ? EXTRAS[k]() : ""}`;
  }

  function varietyPage() {
    const list = sorted.filter((a) => a.club === "variety");
    const today = new Date().getDate();
    return `${hero(VARIETY, "variety")}
      <section class="section wrap">${secHead("أخبار الأمانات")}${articleList(list, "list")}</section>
      <section class="section wrap">
        <div class="grid g2">
          <div class="reveal">
            ${secHead("أعياد ميلاد الشهر")}
            <div class="panel">${BIRTHDAYS.map((b) => `<div class="bday ${b.day === today ? "today" : ""}">
              <span>${esc(b.name)}</span><span class="meta">${b.day === today ? "اليوم!" : "يوم " + b.day}</span></div>`).join("")}</div>
          </div>
          <div class="reveal">
            ${secHead("الإهداءات")}
            <div class="notes">${SHOUTOUTS.map((s) => `<div class="note"><small>من: ${esc(s.from)}</small><p>${esc(s.msg)}</p><small>إلى: ${esc(s.to)}</small></div>`).join("")}</div>
          </div>
        </div>
      </section>`;
  }

  /* ---------- شخصية العدد ---------- */
  function personaSec() {
    if (!has("PERSONA") || !PERSONA || !PERSONA.name) return "";
    const p = PERSONA;
    const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "rawasiyat.html#persona";
    const wa = "https://wa.me/?text=" + encodeURIComponent(`شخصية العدد ${p.issue} في ${SITE.name}: ${p.name}
اكتب له كلمة:
${url}`);
    return `<section class="rw ps" id="persona"><div class="rw-in">
      <p class="rw-eye">شخصية العدد ${esc(p.issue)} ✦ تقدير من الدفعة</p>
      <div class="ps-top">
        <div class="ps-av">${p.img ? `<img src="${esc(p.img)}" alt="">` : esc([...String(p.name)][0])}</div>
        <div><h2>${esc(p.name)}</h2>${p.info ? `<p class="ps-info">${esc(p.info)}</p>` : ""}</div>
      </div>
      <div class="ps-text">${(p.text || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      ${(p.facts || []).length ? `<div class="ps-clues">${p.facts.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
      <div class="ps-share">
        <a class="btn rd-wa" href="${wa}" target="_blank" rel="noopener">شارك في واتساب</a>
        <button type="button" class="btn ghost" data-psshare>مشاركة</button>
      </div>
      <div class="ps-com" id="ps-com" data-tid="persona-${esc(p.issue)}">
        <div class="chat-head"><b>اكتب له كلمة</b><span class="meta th-n"></span></div>
        <div class="chat-list th-list"><div class="chat-empty">…</div></div>
        <div class="th-form-wrap"></div>
      </div>
    </div></section>`;
  }

  /* ---------- يحدث قريبًا ---------- */
  function upcomingSec() {
    if (!has("UPCOMING")) return "";
    const day0 = new Date(); day0.setHours(12, 0, 0, 0);
    const list = UPCOMING.map((e) => ({ e, n: Math.round((new Date(e.date + "T12:00:00") - day0) / 864e5) }))
      .filter(({ n }) => n >= 0).sort((x, y) => x.n - y.n);
    const when = (n) => (n === 0 ? "اليوم" : n === 1 ? "غدًا" : n === 2 ? "بعد يومين" : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يومًا`);
    return `<section class="rw up"><div class="rw-in">
      <p class="rw-eye">لا يفوتك</p>
      <h2>يحدث قريبًا</h2>
      ${list.length ? `<div class="up-list">${list.map(({ e, n }) => {
        const dt = new Date(e.date + "T12:00:00");
        return `<div class="up-i">
          <div class="up-d"><b>${dt.toLocaleDateString("ar-SD-u-nu-latn", { day: "numeric" })}</b><small>${dt.toLocaleDateString("ar-SD-u-nu-latn", { month: "long" })}</small></div>
          <div class="up-t"><b>${esc(e.title)}</b><small>${[e.time, e.place].filter(Boolean).map(esc).join(" ✦ ")}</small></div>
          <span class="up-c ${n === 0 ? "now" : ""}">${when(n)}</span>
        </div>`;
      }).join("")}</div>` : `<p class="up-empty">لا توجد فعاليات معلنة حاليًا، تابعونا.</p>`}
    </div></section>`;
  }

  /* ---------- ذكريات الدفعة ---------- */
  function memoriesSec() {
    if (!has("MEMORIES") || !MEMORIES.length) return "";
    const issues = [...new Set(MEMORIES.map((m) => +m.issue || 0))].sort((x, y) => y - x);
    return `<section class="rw mm"><div class="rw-in">
      <p class="rw-eye">الأرشيف</p>
      <h2>ذكريات الدفعة</h2>
      ${issues.map((iss) => `<h3 class="mm-issue">العدد ${iss}</h3>
        ${MEMORIES.map((m, i) => ({ m, i })).filter(({ m }) => (+m.issue || 0) === iss).sort((x, y) => String(y.m.date).localeCompare(String(x.m.date))).map(({ m, i }) => {
          const c = club(m.club), ph = [m.img1, m.img2, m.img3].filter(Boolean);
          return `<article class="mm-card reveal">
            <div class="mm-ph ${ph.length > 1 ? "" : "one"}" style="${tone(c)}">${ph.length
              ? ph.map((src, k) => `<button type="button" data-mem="${i}" data-k="${k}" aria-label="افتح الصورة"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("")
              : `<div class="mm-none">${glyph(m.club)}</div>`}</div>
            <div class="mm-b"><h3>${esc(m.title)}</h3><small>${c.name} ✦ ${fmt(m.date)}</small>${m.text ? `<p>${esc(m.text)}</p>` : ""}</div>
          </article>`;
        }).join("")}`).join("")}
    </div></section>`;
  }
  function openMemoryPhoto(i, k) {
    const m = MEMORIES[i], src = m && [m.img1, m.img2, m.img3].filter(Boolean)[k];
    if (!src) return;
    if (!isOpen()) history.pushState({ lb: 1 }, "", location.href);
    openModal(`<div class="rd-bar"><button class="rd-btn close" aria-label="إغلاق">→</button><span class="rd-club">${esc(m.title)}</span></div><img class="canvas" src="${esc(src)}" alt=""><div class="content"><h2>${esc(m.title)}</h2><div class="meta" style="color:var(--sand)">${fmt(m.date)}</div></div>`, true);
  }

  function rawasiyatPage() {
    const g = weeklyGuess();
    const tones = ["a", "b", "c"];
    return `
      ${g ? `<section class="rw rw-guess"><div class="rw-in" id="rw-guess" data-answer="${g.answer}">
        <h1>خمّن مَن؟</h1>
        <div class="rw-photo" id="rw-photo">${g.img ? `<img src="${esc(g.img)}" alt="صورة طفولة">` : KID_SVG}</div>
        <p class="rw-hint">${esc(g.hint)}</p>
        <div class="rw-names">${g.options.map((o, i) => `<button type="button" data-i="${i}">${esc(o)}</button>`).join("")}</div>
        <p class="rw-result" id="rw-result" aria-live="polite"></p>
        <a class="rw-more" href="games.html#who">العب بقية الصور ←</a>
      </div></section>` : ""}

      ${SAID.length ? `<section class="rw rw-said">
        <div class="rw-in"><h2>سمعناها في المحاضرات</h2></div>
        <div class="rw-swipe">${SAID.map((s, i) => `<div class="rw-q ${tones[i % 3]}"><p>«${esc(s.q)}»</p><small>${esc(s.by)}</small></div>`).join("")}</div>
      </section>` : ""}

      ${personaSec()}
      ${upcomingSec()}

      <section class="rw rw-ask"><div class="rw-in" id="rw-ask">
        <p class="rw-eye">سؤال الدفعة</p>
        <h2>${esc(ASK.question)}</h2>
        ${ASK.options.map((o, i) => `<button type="button" class="rw-opt" data-i="${i}"><i></i><span>${esc(o)}</span><b></b></button>`).join("")}
        <p class="meta rw-ask-n" id="rw-ask-n"></p>
      </div></section>

      ${memoriesSec()}

      <section class="rw rw-person"><div class="rw-in">
        <p class="rw-eye">وجه الأسبوع</p>
        <div class="rw-who">
          <div class="rw-av">${PERSON.img ? `<img src="${esc(PERSON.img)}" alt="">` : esc([...String(PERSON.name || "؟")][0])}</div>
          <div><h2>${esc(PERSON.name)}</h2><p>${esc(PERSON.info)}</p></div>
        </div>
        ${(PERSON.qa || []).map(([q, r]) => `<div class="rw-qa"><small>${esc(q)}</small><p>${esc(r)}</p></div>`).join("")}
      </div></section>`;
  }

  function bindRawasiyat() {
    const gb = $("#rw-guess");
    if (gb) gb.addEventListener("click", (e) => {
      const b = e.target.closest(".rw-names button");
      if (!b || gb.dataset.done) return;
      gb.dataset.done = 1;
      const ans = +gb.dataset.answer, btns = $$(".rw-names button", gb);
      btns.forEach((x, i) => x.classList.add(i === ans ? "yes" : "no"));
      $("#rw-photo").classList.add("open");
      const name = btns[ans] ? btns[ans].textContent : "";
      $("#rw-result").textContent = +b.dataset.i === ans ? `أحسنت! الإجابة: ${name}` : `ليست هذه، الإجابة: ${name}`;
    });
    const ab = $("#rw-ask");
    if (ab) {
      const key = "ask:" + ASK.question;
      const pid = "ask-" + [...ASK.question].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);
      let mine = store.get(key, null), counts = null, be = null;
      const paint = () => {
        const total = counts ? counts.reduce((x, n) => x + n, 0) : 0, show = mine != null && counts && total;
        $$(".rw-opt", ab).forEach((o, i) => {
          o.classList.toggle("mine", i === mine);
          const pct = show ? Math.round((counts[i] / total) * 100) : 0;
          o.querySelector("i").style.width = show ? pct + "%" : "0";
          o.querySelector("b").textContent = show ? pct + "%" : "";
        });
        $("#rw-ask-n").textContent = show ? `شارك ${total} ${total > 10 ? "من الدفعة" : "من الدفعة"} — يمكنك تغيير إجابتك` : mine != null ? "إجابتك محفوظة" : "اختر إجابتك لترى رأي الدفعة";
      };
      ab.addEventListener("click", (e) => {
        const b = e.target.closest(".rw-opt");
        if (!b) return;
        mine = +b.dataset.i;
        store.set(key, mine);
        if (be) be.pollVote(pid, mine).catch(() => toast("تعذّر حفظ إجابتك، حاول مرة أخرى"));
        paint();
      });
      paint();
      afterScripts(() => {
        if (!window.LIVE) return;
        LIVE.ready.then(async (b) => {
          if (!b || !b.watchPoll) return;
          be = b;
          try {
            const v = await b.myPollVote(pid);
            if (v != null) { mine = v; store.set(key, v); } else if (mine != null) await b.pollVote(pid, mine);
          } catch { /* */ }
          b.watchPoll(pid, ASK.options.length, (c) => { counts = c; paint(); });
        });
      });
    }
  }

  function gamesPage() {
    return `${hero({ name: "ركن الألعاب", color: "#1f5a5a", motto: "العب، وتعلّم، ونافس زملاءك", about: "ألعاب خفيفة من وحي النوادي: من الشعر إلى التشريح إلى تراث السودان. نتائجك تُحفظ على جهازك." }, "games")}
      <section class="section wrap">
        <div class="game-menu" id="game-menu"></div>
        <div class="stage" id="stage"></div>
      </section>`;
  }

  /* ---------- التفاعلات بعد الرسم ---------- */
  function bindCarousel() {
    const track = $("#car");
    if (!track) return;
    const slides = $$(".slide", track), dots = $$(".dots button");
    if (slides.length < 2) return;
    let cur = 0, lastTouch = 0, visible = true, raf;
    const center = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
    let target = -1; // أثناء الانتقال المبرمج لا نغيّر الشريحة النشطة
    const setActive = (i) => {
      cur = i;
      dots.forEach((d, j) => d.classList.toggle("on", j === i));
      slides.forEach((s, j) => s.classList.toggle("is-on", j === i));
    };
    const go = (i) => {
      i = (i + slides.length) % slides.length;
      target = i;
      setActive(i);
      track.scrollBy({ left: center(slides[i]) - center(track), behavior: "smooth" });
      clearTimeout(go.t);
      go.t = setTimeout(() => { target = -1; }, 900);
    };
    const sync = () => {
      const mid = center(track);
      let best = 0, bd = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(center(s) - mid); if (d < bd) { bd = d; best = i; } });
      if (target >= 0 && best !== target) return;
      target = -1;
      if (best !== cur) setActive(best);
    };
    // التعتيم يتبع الإصبع مباشرة: كلما اقتربت الشريحة من المنتصف صارت أوضح
    const fade = () => {
      const mid = center(track);
      slides.forEach((s) => {
        const d = Math.min(1, Math.max(0, Math.abs(center(s) - mid) / s.offsetWidth - 0.06) / 0.94);
        s.style.opacity = (1 - d * 0.45).toFixed(3);
      });
    };
    setActive(0);
    fade();
    let ticking = false;
    track.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; fade(); sync(); }); }
      clearTimeout(raf); raf = setTimeout(() => { fade(); sync(); }, 80);
    }, { passive: true });
    addEventListener("resize", fade);
    track.addEventListener("scrollend", sync);
    const touched = () => { lastTouch = Date.now(); };
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach((ev) => track.addEventListener(ev, touched, { passive: true }));
    $$("[data-dot]").forEach((d) => d.addEventListener("click", () => { touched(); go(+d.dataset.dot); }));
    $$("[data-car]").forEach((b) => b.addEventListener("click", () => { touched(); go(cur + +b.dataset.car); }));
    if (io) new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.5 }).observe(track);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!calm) setInterval(() => {
      if (!visible || document.hidden || isOpen() || Date.now() - lastTouch < 9000) return;
      go(cur + 1);
    }, 6000);
  }

  function bindTasbeeh() {
    const bead = $("#bead");
    if (!bead) return;
    let cur = "سبحان الله";
    const counts = store.get("tasbeeh", {});
    const draw = () => {
      bead.textContent = counts[cur] || 0;
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      $("#dhikr-total").textContent = `${cur} · المجموع اليوم: ${total}`;
    };
    $("#dhikr").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      cur = b.dataset.d;
      $$("#dhikr button").forEach((x) => x.classList.toggle("on", x === b));
      draw();
    });
    bead.addEventListener("click", () => {
      counts[cur] = (counts[cur] || 0) + 1;
      store.set("tasbeeh", counts);
      if (navigator.vibrate) navigator.vibrate(15);
      if (counts[cur] % 33 === 0) toast(`أتممت ${counts[cur]}`);
      draw();
    });
    $("#bead-reset").addEventListener("click", () => { counts[cur] = 0; store.set("tasbeeh", counts); draw(); });
    draw();
  }

  function bindPoll() {
    const box = $("#poll-opts");
    if (!box) return;
    const key = "poll:" + POLL.id;
    const draw = () => {
      const mine = store.get(key, null);
      const counts = (POLL.counts || POLL.options.map(() => 0)).map((n, i) => n + (mine === i ? 1 : 0));
      const total = counts.reduce((s, n) => s + n, 0) || 1;
      box.innerHTML = POLL.options.map((o, i) => {
        const pct = Math.round((counts[i] / total) * 100);
        return `<button class="opt ${mine === i ? "mine" : ""}" data-i="${i}">
          <div class="bar" style="width:${mine == null ? 0 : pct}%"></div>
          <span><span>${esc(o)}</span>${mine == null ? "" : `<b>${pct}%</b>`}</span>
        </button>`;
      }).join("");
      $("#poll-note").textContent = mine == null ? "اختر رأيك." : "سُجّل صوتك ✔ يمكنك تغييره بالضغط على خيار آخر.";
    };
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".opt");
      if (!b) return;
      store.set(key, +b.dataset.i);
      draw();
    });
    draw();
  }

    const artCanvas = (g, i, h) => g.img
    ? `<img class="canvas" src="${g.img}" alt="${esc(g.title)}" loading="lazy">`
    : `<div class="canvas" style="height:${h}px;background:
        radial-gradient(circle at ${20 + ((i * 37) % 60)}% ${25 + ((i * 23) % 50)}%, hsla(${g.hue},80%,75%,.9), transparent 45%),
        radial-gradient(circle at ${70 - ((i * 17) % 40)}% 80%, hsla(${(g.hue + 30) % 360},60%,35%,.9), transparent 55%),
        linear-gradient(${i * 40}deg, hsl(${g.hue},55%,45%), hsl(${(g.hue + 20) % 360},45%,22%))"></div>`;

  function bindGallery() {
    const el = $("#gallery");
    if (!el) return;
    const likes = store.get("likes", {});
    const heights = [260, 200, 320, 230];
    let kind = "";
    const draw = () => {
      el.innerHTML = GALLERY.map((g, i) => ({ g, i })).filter(({ g }) => !kind || g.kind === kind).map(({ g, i }) => `
        <figure class="art" data-art="${i}" style="margin-inline:0">
          ${artCanvas(g, i, heights[i % 4])}
          <figcaption class="cap"><div><b>${esc(g.title)}</b><small>${esc(g.artist)} · ${esc(g.kind)}</small></div>
          <button class="like ${likes[i] ? "on" : ""}" data-like="${i}" aria-label="إعجاب">${likes[i] ? "♥" : "♡"}</button></figcaption>
        </figure>`).join("");
    };
    $("#gal-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      kind = b.dataset.k;
      $$("#gal-tabs button").forEach((x) => x.classList.toggle("on", x === b));
      draw();
    });
    el.addEventListener("click", (e) => {
      const lk = e.target.closest("[data-like]");
      if (lk) {
        const i = lk.dataset.like;
        likes[i] = !likes[i];
        store.set("likes", likes);
        lk.classList.toggle("on", likes[i]);
        lk.textContent = likes[i] ? "♥" : "♡";
        if (likes[i]) toast("أُضيف إلى مفضلتك ♥");
        return;
      }
      const art = e.target.closest("[data-art]");
      if (!art) return;
      const i = +art.dataset.art, g = GALLERY[i];
      if (!isOpen()) history.pushState({ lb: 1 }, "", location.href);
      openModal(`<div class="rd-bar"><button class="rd-btn close" aria-label="إغلاق">→</button><span class="rd-club">${esc(g.kind)}</span></div>${artCanvas(g, i, 480)}<div class="content"><h2>${esc(g.title)}</h2><div class="meta" style="color:var(--sand)">${esc(g.artist)} · ${esc(g.kind)}</div></div>`, true);
    });
    draw();
  }

  /* ---------- الظهور التدريجي والعدادات ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((ents) => ents.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
        $$("[data-count]", en.target).forEach(countUp);
      }), { threshold: 0.12 })
    : null;
  function observe() {
    $$(".reveal:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  }
  function countUp(el) {
    const to = +el.dataset.count, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- التشغيل ---------- */
  const main =
    PAGE === "home" ? homePage()
    : PAGE === "variety" ? varietyPage()
    : PAGE === "games" ? gamesPage()
    : PAGE === "rawasiyat" ? rawasiyatPage()
    : CLUBS[PAGE] ? clubPage(PAGE)
    : homePage();
  shell(main);
  document.title = PAGE === "home" ? SITE.name : `${(CLUBS[PAGE] || { variety: VARIETY, games: { name: "ركن الألعاب" }, rawasiyat: { name: "رواسيات" } }[PAGE] || {}).name || ""} — ${SITE.name}`;

  const listSrc = PAGE === "variety" ? sorted.filter((a) => a.club === "variety") : sorted.filter((a) => a.club === PAGE && !a.pen);
  bindTabs("list", listSrc);
  bindCarousel();
  bindRawasiyat();
  bindTasbeeh();
  bindWords();
  bindResala();
  bindPoll();
  bindGallery();
  observe();

  // نقرات عامة
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-soon]")) { e.preventDefault(); toast("الرابط قيد التجهيز — قريبًا!"); return; }
    const sh = t.closest("[data-share]");
    if (sh) { share(sh.dataset.share); return; }
    if (t.closest("#reader .close") || t.id === "reader") { closeModal(); return; }
    if (t.closest("[data-font]")) {
      const next = (store.get("fs", 1) + 1) % FONT_SIZES.length;
      store.set("fs", next);
      const rd = $("#reader .rd");
      if (rd) rd.style.setProperty("--rd-fs", FONT_SIZES[next] + "px");
      toast(["خط صغير", "خط متوسط", "خط كبير"][next]);
      return;
    }
    const cp = t.closest("[data-copy]");
    if (cp) { copyText(location.origin + location.pathname + "#read-" + cp.dataset.copy).then(() => toast("تم نسخ الرابط ✔")); return; }
    if (t.closest("[data-psshare]")) {
      const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "rawasiyat.html#persona";
      (async () => {
        try {
          if (navigator.share) await navigator.share({ title: `شخصية العدد: ${PERSONA.name}`, text: "اكتب له كلمة", url });
          else { await copyText(url); toast("تم نسخ الرابط ✔"); }
        } catch { /* أُلغيت */ }
      })();
      return;
    }
    const mem = t.closest("[data-mem]");
    if (mem) { openMemoryPhoto(+mem.dataset.mem, +mem.dataset.k); return; }
    const fws = t.closest("[data-fwshare]");
    if (fws) { shareFawaid(+fws.dataset.fwshare); return; }
    const fw = t.closest("[data-fw]");
    if (fw) { openFawaid(+fw.dataset.fw); return; }
    const flip = t.closest(".flip");
    if (flip) { flip.classList.toggle("on"); return; }
    const r = t.closest("[data-read]");
    if (r) { e.preventDefault(); openArticle(r.dataset.read); return; }
    const dd = t.closest(".dd > button");
    if (dd) { dd.parentElement.classList.toggle("open"); return; }
    if (!t.closest(".dd")) $$(".dd.open").forEach((x) => x.classList.remove("open"));
    if (t.closest("[data-sheet]")) { $("#clubs-sheet").classList.toggle("open"); return; }
    if (t.id === "clubs-sheet") $("#clubs-sheet").classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#reader").classList.contains("open")) closeModal();
    if (e.key === "Enter" && document.activeElement?.matches("[data-read], .flip")) document.activeElement.click();
  });

  // فتح مقال من الرابط مباشرة: page.html#read-ID
  if (location.hash.startsWith("#read-")) {
    const id = location.hash.slice(6);
    history.replaceState(null, "", location.pathname + location.search); // الرجوع يعيد إلى الصفحة
    afterScripts(() => openArticle(id));
  }
  else if (/^#fw-\d+$/.test(location.hash)) {
    const n = +location.hash.slice(4);
    history.replaceState(null, "", location.pathname + location.search);
    openFawaid(n);
  }
  else if (location.hash.startsWith("#resala-") && rlOpenById) {
    const id = decodeURIComponent(location.hash.slice(8));
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => { $("#resala").scrollIntoView(); rlOpenById(id); }, 120);
  }
  else if (location.hash.length > 1) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView(), 60); }
})();
