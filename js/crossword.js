/* =========================================================
   صحيفة الرواسي — محرّك الكلمات المتقاطعة
   يبني الشبكة تلقائيًا من قائمة الكلمات (بلا عشوائية: نفس الشبكة للجميع)
   يُستخدم في الألعاب ولوحة التحكم
   ========================================================= */
(() => {
  // توحيد الحروف: الهمزات والتاء المربوطة والألف المقصورة والتشكيل
  const norm = (s) => String(s || "")
    .replace(/[ً-ٰٟـ\s​-‏]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");

  function build(list) {
    const words = (list || []).map((w, i) => ({ ...w, i, sol: [...norm(w.answer)] })).filter((w) => w.sol.length >= 2);
    const order = [...words].sort((a, b) => b.sol.length - a.sol.length || a.i - b.i);
    const grid = new Map(), dirs = new Map(), placed = [];
    const key = (r, c) => r + "," + c;
    const get = (r, c) => grid.get(key(r, c));

    // كم تقاطعًا تصنع الكلمة هنا؟ (-1 = لا تصلح)
    function fits(w, r, c, dir) {
      const dr = dir === "d" ? 1 : 0, dc = dir === "a" ? 1 : 0, n = w.sol.length;
      if (get(r - dr, c - dc) || get(r + dr * n, c + dc * n)) return -1;
      let cross = 0;
      for (let k = 0; k < n; k++) {
        const rr = r + dr * k, cc = c + dc * k, g = get(rr, cc);
        if (g) {
          if (g !== w.sol[k] || (dirs.get(key(rr, cc)) || "").includes(dir)) return -1;
          cross++;
        } else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
      }
      return cross;
    }
    function place(w, r, c, dir) {
      const dr = dir === "d" ? 1 : 0, dc = dir === "a" ? 1 : 0;
      w.sol.forEach((ch, k) => {
        const kk = key(r + dr * k, c + dc * k);
        grid.set(kk, ch);
        dirs.set(kk, (dirs.get(kk) || "") + dir);
      });
      placed.push({ ...w, r, c, dir });
    }
    function bounds(extra) {
      let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
      const add = (r, c) => { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); };
      grid.forEach((_, k) => { const [r, c] = k.split(",").map(Number); add(r, c); });
      if (extra) extra.forEach(([r, c]) => add(r, c));
      return { r0, r1, c0, c1 };
    }
    function tryPlace(w) {
      let best = null;
      for (const p of placed) {
        p.sol.forEach((pch, k) => {
          w.sol.forEach((ch, j) => {
            if (ch !== pch) return;
            const dir = p.dir === "a" ? "d" : "a";
            const cr = p.r + (p.dir === "d" ? k : 0), cc = p.c + (p.dir === "a" ? k : 0);
            const r = cr - (dir === "d" ? j : 0), c = cc - (dir === "a" ? j : 0);
            const cross = fits(w, r, c, dir);
            if (cross < 1) return;
            const end = dir === "d" ? [r + w.sol.length - 1, c] : [r, c + w.sol.length - 1];
            const b = bounds([[r, c], end]);
            const h = b.r1 - b.r0 + 1, wd = b.c1 - b.c0 + 1;
            const score = cross * 100 - h * wd - Math.abs(h - wd) * 3;
            if (!best || score > best.score) best = { r, c, dir, score };
          });
        });
      }
      if (best) { place(w, best.r, best.c, best.dir); return true; }
      return false;
    }

    let pending = [];
    order.forEach((w, idx) => { if (idx === 0) place(w, 0, 0, "a"); else if (!tryPlace(w)) pending.push(w); });
    for (let pass = 0; pass < 3 && pending.length; pass++) pending = pending.filter((w) => !tryPlace(w));

    if (!placed.length) return { rows: 0, cols: 0, cells: {}, words: [], skipped: words };
    const b = bounds();
    const cells = {};
    grid.forEach((ch, k) => { const [r, c] = k.split(",").map(Number); cells[key(r - b.r0, c - b.c0)] = ch; });
    const out = placed.map((w) => ({ ...w, r: w.r - b.r0, c: w.c - b.c0 }));
    // الترقيم: من الأعلى للأسفل، ومن اليمين لليسار
    const starts = [...new Set(out.map((w) => key(w.r, w.c)))].map((k) => k.split(",").map(Number)).sort((a, z) => a[0] - z[0] || a[1] - z[1]);
    const num = new Map(starts.map(([r, c], i) => [key(r, c), i + 1]));
    out.forEach((w) => { w.num = num.get(key(w.r, w.c)); });
    out.sort((a, z) => a.num - z.num);
    return { rows: b.r1 - b.r0 + 1, cols: b.c1 - b.c0 + 1, cells, words: out, skipped: pending };
  }

  window.CW = { build, norm };
})();
