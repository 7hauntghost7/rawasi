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

  /* ---------- تعليقات شخصية العدد ---------- */
  function mountThread(be) {
    const box = $("#ps-com");
    if (!box) return;
    const tid = box.dataset.tid, list = $("#th-list"), wrap = $("#th-form-wrap");
    if (!be || !be.watchThread) {
      list.innerHTML = `<div class="chat-empty">التعليقات تُفتح قريبًا.</div>`;
      return;
    }
    const whoHtml = () => {
      const name = store.get("cname", "");
      return name ? `تعلّق باسم <b>${esc(name)}</b> · <button type="button" id="th-chname">تغيير</button>` : `<input id="th-name" maxlength="30" placeholder="اسمك (يظهر مع تعليقك)">`;
    };
    wrap.innerHTML = `<form class="chat-form" id="th-form" autocomplete="off">
      <div class="who" id="th-who">${whoHtml()}</div>
      <div class="row"><textarea id="th-text" rows="1" maxlength="500" placeholder="اكتب له كلمة شكر…"></textarea>
      <button class="send" aria-label="إرسال">${ICON_SEND}</button></div>
    </form>`;
    let items = [];
    const paint = (force) => {
      const near = force || list.scrollHeight - list.scrollTop - list.clientHeight < 60;
      const vis = items.filter((c) => !c.hidden);
      $("#th-n").textContent = vis.length ? `${vis.length} تعليق` : "";
      list.innerHTML = vis.length
        ? vis.map((c) => `<div class="msg"><div class="mh"><b>${esc(c.name)}</b><small>${ago(c.ts)}</small></div><p>${esc(c.text)}</p></div>`).join("")
        : `<div class="chat-empty">كن أول من يكتب له كلمة</div>`;
      if (near) list.scrollTop = list.scrollHeight;
    };
    be.watchThread(tid, (c) => { items = c || []; paint(); });
    setInterval(() => paint(), 30000);
    box.addEventListener("click", (e) => {
      if (!e.target.closest("#th-chname")) return;
      store.set("cname", "");
      $("#th-who").innerHTML = whoHtml();
      $("#th-name").focus();
    });
    box.addEventListener("input", (e) => {
      if (e.target.id === "th-text") { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }
    });
    let sending = false;
    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      const nameEl = $("#th-name"), textEl = $("#th-text");
      const name = (nameEl ? nameEl.value : store.get("cname", "")).trim(), text = textEl.value.trim();
      if (!name) { toast("اكتب اسمك أولًا"); if (nameEl) nameEl.focus(); return; }
      if (!text) { textEl.focus(); return; }
      sending = true;
      const btn = $("#th-form .send");
      btn.disabled = true;
      try {
        await be.addToThread(tid, { name, text });
        store.set("cname", name);
        textEl.value = ""; textEl.style.height = "auto";
        $("#th-who").innerHTML = whoHtml();
        setTimeout(() => paint(true), 300);
      } catch (err) { toast(nice(err)); }
      sending = false;
      btn.disabled = false;
    });
  }

  /* ---------- شريط الصفحة الرئيسية ---------- */
  function homeBanner(be) {
    let el = null;
    be.watchDebate((cur) => {
      if (cur && cur.status === "live") {
        if (!el) {
          el = document.createElement("a");
          el.className = "live-banner";
          el.href = "munazarat.html#live-sec";
          $("#main").prepend(el);
        }
        el.innerHTML = `<span class="live-dot"></span><span class="tx"><b>مناظرة مباشرة الآن</b><span>«${esc(cur.motion)}»</span></span><span class="go">صوّت ←</span>`;
      } else if (el) { el.remove(); el = null; }
    });
  }

  /* ---------- صفحة المناظرات ---------- */
  function mount(be) {
    const sec = $("#live-sec");
    if (!sec) return;
    let cur = null, sig = "", tally = { a: 0, b: 0, claps: 0 }, comments = [], mine = null;
    let unT = null, unC = null, lastClap = 0, sending = false;

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
      const newSig = [d.id, d.status, d.motion, d.sideA, d.sideB].join("|");
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

    function render() {
      const live = cur.status === "live";
      sec.innerHTML = `
        <div class="live ${live ? "is-live" : "is-closed"}">
          <div class="live-top">
            <span class="live-pill">${live ? "<i></i> مباشر الآن" : "انتهت المناظرة"}</span>
            <span class="meta" id="lv-count"></span>
          </div>
          <h2 class="live-motion">«${esc(cur.motion)}»</h2>
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
          </div>
        </div>`;
      paintTally();
      paintChat(true);
    }

    function paintTally() {
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

    sec.addEventListener("click", (e) => {
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
