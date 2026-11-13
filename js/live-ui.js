/* =========================================================
   صحيفة الرواسي — واجهة المناظرة المباشرة (للزوار)
   صفحة المناظرات: تصويت حي + تصفيق + تعليقات
   الصفحة الرئيسية: شريط «مباشر الآن»
   ========================================================= */
(() => {
  if (!window.LIVE || !window.R) return;
  const { $, esc, store, toast } = window.R;
  const page = document.body.dataset.page;

  const ago = (ms) => {
    const s = (Date.now() - ms) / 1000;
    if (s < 45) return "الآن";
    const m = Math.round(s / 60);
    if (m < 60) return `قبل ${m} د`;
    return `قبل ${Math.round(m / 60)} س`;
  };
  const nice = (e) => {
    const m = (e && e.message) || "";
    return /permission|insufficient/i.test(m) ? "تعذّر الإرسال — ربما انتهت المناظرة" : m || "تعذّر الاتصال";
  };
  const ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

  LIVE.ready.then((be) => {
    if (page === "rawasiyat") mountThread(be);
    if (!be) return;
    if (page === "home") homeBanner(be);
    if (page === "munazarat") mount(be);
  });

  /* ---------- صندوق تعليقات عام (شخصية العدد والمقالات) ---------- */
  function threadBox(be, box, tid, o = {}) {
    const list = box.querySelector(".th-list"), wrap = box.querySelector(".th-form-wrap"), cnt = box.querySelector(".th-n");
    if (!be || !be.watchThread) { list.innerHTML = `<div class="chat-empty">التعليقات تُفتح قريبًا.</div>`; return () => {}; }
    const open = o.open !== false;
    const whoHtml = () => {
      const name = store.get("cname", "");
      return name ? `تعلّق باسم <b>${esc(name)}</b> · <button type="button" class="th-chname">تغيير</button>` : `<input class="th-name" maxlength="30" placeholder="اسمك (يظهر مع تعليقك)">`;
    };
    wrap.innerHTML = open ? `<form class="chat-form" autocomplete="off">
      <div class="who th-who">${whoHtml()}</div>
      <div class="row"><textarea class="th-text" rows="1" maxlength="500" placeholder="${esc(o.placeholder || "اكتب تعليقك…")}"></textarea>
      <button class="send" aria-label="إرسال">${ICON_SEND}</button></div>
    </form>` : `<p class="meta th-closed">${esc(o.closedText || "أُغلقت التعليقات")}</p>`;
    let items = [];
    const paint = (force) => {
      const near = force || list.scrollHeight - list.scrollTop - list.clientHeight < 60;
      const vis = items.filter((c) => !c.hidden);
      if (cnt) cnt.textContent = vis.length ? `${vis.length} تعليق` : "";
      list.innerHTML = vis.length
        ? vis.map((c) => `<div class="msg"><div class="mh"><b>${esc(c.name)}</b><small>${ago(c.ts)}</small></div><p>${esc(c.text)}</p></div>`).join("")
        : `<div class="chat-empty">${esc(open ? o.empty || "كن أول من يعلّق" : "لا توجد تعليقات")}</div>`;
      if (near) list.scrollTop = list.scrollHeight;
    };
    const unsub = be.watchThread(tid, (c) => { items = c || []; paint(); });
    const iv = setInterval(() => paint(), 30000);
    let sending = false;
    box.addEventListener("click", (e) => {
      if (!e.target.closest(".th-chname")) return;
      store.set("cname", "");
      box.querySelector(".th-who").innerHTML = whoHtml();
      box.querySelector(".th-name").focus();
    });
    box.addEventListener("input", (e) => {
      if (e.target.classList.contains("th-text")) { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }
    });
    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      const nameEl = box.querySelector(".th-name"), textEl = box.querySelector(".th-text");
      const name = (nameEl ? nameEl.value : store.get("cname", "")).trim(), text = textEl.value.trim();
      if (!name) { toast("اكتب اسمك أولًا"); if (nameEl) nameEl.focus(); return; }
      if (!text) { textEl.focus(); return; }
      sending = true;
      const btn = box.querySelector(".send");
      btn.disabled = true;
      try {
        await be.addToThread(tid, { name, text });
        store.set("cname", name);
        textEl.value = ""; textEl.style.height = "auto";
        box.querySelector(".th-who").innerHTML = whoHtml();
        setTimeout(() => paint(true), 300);
      } catch (err) { toast(nice(err)); }
      sending = false;
      btn.disabled = false;
    });
    return () => { try { if (unsub) unsub(); } catch { /* */ } clearInterval(iv); };
  }

  function mountThread(be) {
    const box = $("#ps-com");
    if (box) threadBox(be, box, box.dataset.tid, { placeholder: "اكتب له كلمة شكر…", empty: "كن أول من يكتب له كلمة" });
  }

  // تعليقات المقال داخل نافذة القراءة (يستدعيها app.js)
  let artStop = null;
  window.RAWASI_COMMENTS = (box, tid, opts) => {
    if (artStop) { artStop(); artStop = null; }
    LIVE.ready.then((be) => { if (box.isConnected) artStop = threadBox(be, box, tid, opts); });
  };
  window.RAWASI_COMMENTS_STOP = () => { if (artStop) { artStop(); artStop = null; } };

  /* ---------- شريط الصفحة الرئيسية ---------- */
  function homeBanner(be) {
    let el = null;
    be.watchDebate((cur) => {
      if (cur && (cur.status === "live" || cur.status === "soon")) {
        if (!el) {
          el = document.createElement("a");
          el.className = "live-banner";
          el.href = "munazarat.html#live-sec";
          $("#main").prepend(el);
        }
        const bimg = /^data:image\/(jpeg|png|webp);base64,/.test(cur.img || "") ? cur.img : "";
        el.innerHTML = `${bimg ? `<img class="lb-img" src="${bimg}" alt="">` : `<span class="live-dot"></span>`}<span class="tx"><b>${cur.status === "soon" ? "مناظرة قادمة" : "مناظرة مباشرة الآن"}</b><span>«${esc(cur.motion)}»</span></span><span class="go">${cur.status === "soon" ? "التفاصيل ←" : "صوّت ←"}</span>`;
        el.classList.toggle("is-soon", cur.status === "soon");
      } else if (el) { el.remove(); el = null; }
    });
  }

  const ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  /* ---------- صفحة المناظرات ---------- */
  function mount(be) {
    const sec = $("#live-sec");
    if (!sec) return;
    let cur = null, sig = "", tally = { a: 0, b: 0, claps: 0 }, comments = [], mine = null;
    let unT = null, unC = null, lastClap = 0, sending = false;
    if (location.hash === "#live-sec") {
      sec.hidden = false;
      sec.innerHTML = `<div class="lv lv-loading"><div class="lv-head"><div class="lv-pills"><span class="live-pill">مناظرة</span></div><p class="lv-wait">جارٍ تحميل المناظرة…</p></div></div>`;
      requestAnimationFrame(() => sec.scrollIntoView({ block: "start" }));
    }

    be.watchDebate(async (d) => {
      const oldPoll = $("#poll");
      if (!d) {
        cur = null; sig = ""; sec.hidden = true;
        if (oldPoll) oldPoll.hidden = false;
        return;
      }
      if (oldPoll) oldPoll.hidden = true;
      sec.hidden = false;
      const newDebate = !cur || cur.id !== d.id;
      const sd = { ...d, started: 0, img: (d.img || "").length + (d.img || "").slice(-40) };
      const newSig = JSON.stringify(Object.keys(sd).sort().map((k) => [k, sd[k]]));
      cur = d;
      if (newDebate) {
        if (unT) unT();
        if (unC) unC();
        tally = { a: 0, b: 0, claps: 0 }; comments = [];
        try { mine = await be.myVote(d.id); } catch { mine = null; }
        unT = be.watchTally(d.id, (t) => { tally = t || tally; paintTally(); });
        unC = be.watchComments(d.id, (c) => { comments = c || []; paintChat(); });
      }
      if (newSig !== sig) { sig = newSig; render(); }
      if (newDebate && location.hash === "#live-sec") setTimeout(() => sec.scrollIntoView({ behavior: "smooth" }), 200);
    });

    function formHtml() {
      const name = store.get("cname", "");
      return `<form class="chat-form" id="chat-form" autocomplete="off">
        <div class="who">${name
          ? `تعلّق باسم <b>${esc(name)}</b> · <button type="button" id="chname">تغيير</button>`
          : `<input id="cname" maxlength="30" placeholder="اسمك (يظهر مع تعليقك)">`}</div>
        <div class="row">
          <textarea id="ctext" rows="1" maxlength="280" placeholder="شارك برأيك…"></textarea>
          <button class="send" aria-label="إرسال">${ICON_SEND}</button>
        </div>
      </form>`;
    }

    const safeImg = (src) => (/^data:image\/(jpeg|png|webp);base64,/.test(src || "") ? src : "");
    const safeLink = (x) => (/^https:\/\//.test(x || "") ? x : "");
    const whenText = (w) => {
      const d = w ? new Date(w) : null;
      if (!d || isNaN(d)) return "";
      return d.toLocaleDateString("ar-SD-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }) + " · " + d.toLocaleTimeString("ar-SD-u-nu-latn", { hour: "numeric", minute: "2-digit" });
    };
    const joinLabel = (x) => (/meet\.google/.test(x) ? "انضم عبر Google Meet" : /zoom\./.test(x) ? "انضم عبر Zoom" : "رابط المناظرة");
    const teamHtml = (side) => {
      const name = side === "a" ? cur.sideA : cur.sideB, mem = (side === "a" ? cur.membersA : cur.membersB) || [];
      return `<div class="lv-team ${side}"><b>${esc(name)}</b>${mem.length ? `<ul>${mem.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}</div>`;
    };
    function render() {
      const st = cur.status, live = st === "live", soon = st === "soon";
      const img = safeImg(cur.img), link = safeLink(cur.link), when = whenText(cur.when);
      sec.innerHTML = `
        <div class="lv is-${esc(st)}">
          ${img ? `<div class="lv-poster"><img src="${img}" alt="ملصق المناظرة"></div>` : ""}
          <div class="lv-head">
            <div class="lv-pills"><span class="live-pill">${live ? "<i></i> مباشر الآن" : soon ? "قريبًا" : "انتهت المناظرة"}</span>${cur.kind ? `<span class="lv-kind">${esc(cur.kind)}</span>` : ""}</div>
            <h2 class="live-motion">«${esc(cur.motion)}»</h2>
            ${when || cur.place ? `<p class="lv-when">${[when, cur.place].filter(Boolean).map(esc).join(" ✦ ")}</p>` : ""}
            <span class="lv-count" id="lv-count"></span>
            <div class="lv-acts">
              ${link && st !== "closed" ? `<a class="btn gold lv-join" href="${esc(link)}" target="_blank" rel="noopener">${joinLabel(link)}</a>` : ""}
              <button type="button" class="lv-share" id="lv-share">${ICON_SHARE}${st === "closed" ? "شارك النتيجة" : "شارك المناظرة"}</button>
            </div>
          </div>
          <div class="lv-body">
            <div class="lv-teams">${teamHtml("a")}<span class="lv-vs">ضد</span>${teamHtml("b")}</div>
            ${soon ? `<p class="live-hint">التصويت والتعليقات تُفتح مع انطلاق المناظرة.</p>` : `
            <div class="tug" aria-hidden="true"><div class="ta" id="ta"><b id="pa"></b></div><div class="tb"><b id="pb"></b></div></div>
            <div class="vote-btns">
              <button class="vb a" data-v="a" ${live ? "" : "disabled"}><span>${esc(cur.sideA)}</span><small id="na"></small></button>
              <button class="vb b" data-v="b" ${live ? "" : "disabled"}><span>${esc(cur.sideB)}</span><small id="nb"></small></button>
            </div>
            <p class="live-hint" id="lv-hint"></p>
            <div class="chat">
              <div class="chat-head">
                <b>التعليقات</b>
                <button class="clap" id="clap" ${live ? "" : "disabled"} aria-label="تصفيق">👏 <span id="nclap">0</span></button>
              </div>
              <div class="chat-list" id="chat" aria-live="polite"></div>
              ${live ? formHtml() : `<p class="meta" style="text-align:center;margin:10px 0 0">أُغلقت التعليقات</p>`}
            </div>`}
          </div>
        </div>`;
      paintTally();
      paintChat(true);
    }

    function paintTally() {
      if (cur && cur.status === "soon") {
        const c = $("#lv-count"), d = cur.when ? new Date(cur.when) : null;
        if (c && d && !isNaN(d)) {
          const days = Math.round((new Date(d).setHours(12, 0, 0, 0) - new Date().setHours(12, 0, 0, 0)) / 864e5);
          c.textContent = days > 1 ? `تبدأ بعد ${days} ${days <= 10 ? "أيام" : "يومًا"}` : days === 1 ? "تبدأ غدًا" : days === 0 ? "تبدأ اليوم" : "";
        }
        return;
      }
      if (!cur || !$("#ta")) return;
      const a = Math.max(0, tally.a || 0), b = Math.max(0, tally.b || 0), total = a + b;
      const pa = total ? Math.round((a / total) * 100) : 50;
      $("#ta").style.width = pa + "%";
      $("#pa").textContent = total ? pa + "%" : "";
      $("#pb").textContent = total ? 100 - pa + "%" : "";
      $("#na").textContent = a;
      $("#nb").textContent = b;
      $("#nclap").textContent = tally.claps || 0;
      $("#lv-count").textContent = total ? `${total} ${total > 10 ? "مصوّتًا" : "مصوّتين"}` : "";
      sec.querySelectorAll(".vb").forEach((x) => x.classList.toggle("mine", x.dataset.v === mine));
      const hint = $("#lv-hint");
      if (cur.status === "live") {
        hint.textContent = mine
          ? `صوّتَّ لـ«${mine === "a" ? cur.sideA : cur.sideB}» — يمكنك تغيير رأيك حتى نهاية المناظرة`
          : "اختر موقفك — ويمكنك تغييره إن أقنعك الطرف الآخر";
      } else {
        hint.innerHTML = !total ? "لم يصوّت أحد" : a === b ? "النتيجة: <b>تعادل</b>"
          : `النتيجة النهائية: <b>${esc(a > b ? cur.sideA : cur.sideB)}</b> بنسبة ${Math.max(pa, 100 - pa)}%`;
      }
    }

    function paintChat(force) {
      const box = $("#chat");
      if (!box || !cur) return;
      const nearBottom = force || box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      const list = comments.filter((c) => !c.hidden);
      box.innerHTML = list.length
        ? list.map((c) => `<div class="msg ${c.side || ""}">
            <div class="mh"><b>${esc(c.name)}</b>${c.side ? `<span class="chip">${esc(c.side === "a" ? cur.sideA : cur.sideB)}</span>` : ""}<small>${ago(c.ts)}</small></div>
            <p>${esc(c.text)}</p></div>`).join("")
        : `<div class="chat-empty">${cur.status === "live" ? "كن أول من يعلّق" : "لا توجد تعليقات"}</div>`;
      if (nearBottom) box.scrollTop = box.scrollHeight;
    }

    async function shareDebate() {
      const url = new URL("live/", location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "")).href;
      const when = whenText(cur.when);
      const text = cur.status === "soon" ? `مناظرة قادمة: «${cur.motion}»${when ? "\n" + when : ""}`
        : cur.status === "live" ? `المناظرة مباشرة الآن: «${cur.motion}»\nصوّت وعلّق معنا`
        : `نتيجة المناظرة: «${cur.motion}»`;
      try {
        if (navigator.share) { await navigator.share({ title: "مناظرات الرواسي", text, url }); return; }
      } catch (err) { if (err && err.name === "AbortError") return; }
      const full = text + "\n" + url;
      try { await navigator.clipboard.writeText(full); }
      catch {
        const t = document.createElement("textarea");
        t.value = full; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); } catch {}
        t.remove();
      }
      toast("تم نسخ رابط المناظرة ✔");
    }

    sec.addEventListener("click", (e) => {
      if (e.target.closest("#lv-share")) { if (cur) shareDebate(); return; }
      if (!cur || cur.status !== "live") return;
      const vb = e.target.closest(".vb");
      if (vb) {
        const side = vb.dataset.v;
        if (side === mine) return;
        const old = mine;
        if (old) tally[old] = (tally[old] || 0) - 1;
        tally[side] = (tally[side] || 0) + 1;
        mine = side;
        paintTally();
        if (navigator.vibrate) navigator.vibrate(12);
        be.vote(cur.id, side).catch((err) => { toast(nice(err)); be.myVote(cur.id).then((v) => { mine = v; paintTally(); }).catch(() => {}); });
        return;
      }
      const cl = e.target.closest("#clap");
      if (cl) {
        const now = Date.now();
        if (now - lastClap < 250) return;
        lastClap = now;
        tally.claps = (tally.claps || 0) + 1;
        $("#nclap").textContent = tally.claps;
        const f = document.createElement("span");
        f.className = "clap-fly";
        f.textContent = "👏";
        f.style.insetInlineStart = 10 + Math.random() * 30 + "px";
        cl.appendChild(f);
        setTimeout(() => f.remove(), 900);
        be.clap(cur.id).catch(() => {});
        return;
      }
      if (e.target.closest("#chname")) {
        store.set("cname", "");
        const w = $(".chat-form .who");
        if (w) w.innerHTML = `<input id="cname" maxlength="30" placeholder="اسمك (يظهر مع تعليقك)">`;
        $("#cname").focus();
      }
    });

    sec.addEventListener("input", (e) => {
      if (e.target.id === "ctext") { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }
    });
    sec.addEventListener("keydown", (e) => {
      if (e.target.id === "ctext" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("#chat-form").requestSubmit(); }
    });
    sec.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending || !cur) return;
      const nameEl = $("#cname"), textEl = $("#ctext");
      const name = (nameEl ? nameEl.value : store.get("cname", "")).trim();
      const text = textEl.value.trim();
      if (!name) { toast("اكتب اسمك أولًا"); if (nameEl) nameEl.focus(); return; }
      if (!text) { textEl.focus(); return; }
      sending = true;
      const btn = $(".chat-form .send");
      btn.disabled = true;
      try {
        await be.addComment(cur.id, { name, text, side: mine });
        store.set("cname", name);
        textEl.value = "";
        textEl.style.height = "auto";
        if (nameEl) $(".chat-form .who").innerHTML = `تعلّق باسم <b>${esc(name)}</b> · <button type="button" id="chname">تغيير</button>`;
        const box = $("#chat");
        if (box) setTimeout(() => { box.scrollTop = box.scrollHeight; }, 300);
      } catch (err) { toast(nice(err)); }
      sending = false;
      btn.disabled = false;
    });

    // تحديث «قبل كم دقيقة» كل نصف دقيقة
    setInterval(() => paintChat(), 30000);
  }
})();
