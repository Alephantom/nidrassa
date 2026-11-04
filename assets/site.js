/*
 * Nidrassa – interactive behaviour for all pages.
 * All content (navigation, practices, blog cards, gallery photos) is rendered by Jekyll;
 * this file only adds interaction. Every section checks whether its elements exist,
 * so the same file can be loaded on every page.
 */

// ---------- Settings: paste the real links here once the tools are set up ----------
const CONFIG = {
  waitlistUrl: ""     // form endpoint for the retreat waitlist (empty = the form opens an e-mail to info@nidrassa.com)
};


// ---------- Burger menus (screens up to 900px) ----------
// Used for the main navigation and for the retreat page's section navigation.
function setupMenu(buttonId, menuId, containerId, openLabel, closeLabel, maxWidth = 900) {
  const button = document.getElementById(buttonId);
  const menu = document.getElementById(menuId);
  if (!button || !menu) return;

  const setOpen = open => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", open);
    button.setAttribute("aria-label", open ? closeLabel : openLabel);
  };
  button.addEventListener("click", () => setOpen(menu.hidden));
  menu.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { setOpen(false); button.focus(); } });
  document.addEventListener("click", e => { if (!menu.hidden && !e.target.closest("#" + containerId)) setOpen(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > maxWidth && !menu.hidden) setOpen(false); });
}
setupMenu("burger", "menu", "site-nav", "Menü öffnen", "Menü schließen");
setupMenu("subnav-burger", "subnav-menu", "subnav", "Inhalte öffnen", "Inhalte schließen");
setupMenu("app-burger", "app-menu", "app-top", "Menü öffnen", "Menü schließen", 1024);   // app view (≤1024 px)


// ---------- Section navigation: highlight the section currently in view ----------
(function () {
  const subnav = document.getElementById("subnav");
  if (!subnav || !("IntersectionObserver" in window)) return;

  const links = [...subnav.querySelectorAll("[data-section]")];
  const sections = [...new Set(links.map(l => l.dataset.section))]
    .map(id => document.getElementById(id)).filter(Boolean);

  const mark = id => links.forEach(l => {
    if (l.dataset.section === id) l.setAttribute("aria-current", "true");
    else l.removeAttribute("aria-current");
  });
  // A section counts as "current" when it crosses a line ~40% down the screen.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(s => observer.observe(s));
})();


// ---------- 2-5-15 method: random practice + timer (home page) ----------
// Data comes from _data/formats.yml and _data/practices.yml, embedded in index.html.
(function () {
  const dataEl = document.getElementById("practice-data");
  const box = document.getElementById("pick");
  if (!dataEl || !box) return;

  const { formats, practices } = JSON.parse(dataEl.textContent);
  const clock = sec => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  let current = null, timer = null, left = 0;
  const labels = {};
  document.querySelectorAll(".step").forEach(b => { labels[Number(b.dataset.min)] = b.dataset.label || ""; });

  const stopTimer = () => { clearInterval(timer); timer = null; };

  function toggleTimer(total) {
    const btn = document.getElementById("pick-timer");
    if (timer) { stopTimer(); btn.querySelector(".tlbl").textContent = "Weiter"; return; }
    if (!left) left = total;
    btn.querySelector(".tlbl").textContent = "Pause";
    timer = setInterval(() => {
      left--;
      document.getElementById("pick-time").textContent = clock(left);
      if (left <= 0) {
        stopTimer();
        left = 0;
        btn.hidden = true;
        document.getElementById("timer-done").hidden = false;
      }
    }, 1000);
  }

  function render() {
    const p = current;
    box.innerHTML =
      '<div class="pick-top"><span class="when">' + (labels[p.minutes] || "") + '</span><span class="tag">' + formats[p.format].name + "</span></div>" +
      "<h3>" + p.title + "</h3>" +
      '<ol class="steps">' + p.steps.map(s => "<li>" + s + "</li>").join("") + "</ol>" +
      '<div class="pick-actions">' +
        '<button class="btn timer-btn" type="button" id="pick-timer"><span class="tlbl">Timer starten</span><span class="tsep"> · </span><span id="pick-time">' + clock(p.minutes * 60) + "</span></button>" +
        '<button class="ghost" type="button" id="pick-again">Andere Übung</button>' +
      "</div>" +
      '<p class="timer-done" id="timer-done" hidden>Geschafft. Wie fühlst du dich jetzt?</p>';
    box.hidden = false;
    document.getElementById("pick-again").addEventListener("click", () => choose(p.minutes));
    document.getElementById("pick-timer").addEventListener("click", () => toggleTimer(p.minutes * 60));
  }

  function choose(minutes, quiet) {
    const pool = practices.filter(p => p.minutes === minutes && p !== current);
    current = pool[Math.floor(Math.random() * pool.length)];
    stopTimer();
    left = 0;
    document.querySelectorAll(".step").forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.min) === minutes));
    render();
    if (quiet) return;
    // bring the exercise into view (on phones it sits below the fold)
    const r = box.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight) {
      const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: scrollY + r.top - 100, behavior: reduce ? "auto" : "smooth" });
    }
  }

  document.querySelectorAll(".step").forEach(b => {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => choose(Number(b.dataset.min)));
  });
  // on phones open with 2 minutes so visitors see an exercise right away (desktop: click first)
  if (window.matchMedia && matchMedia("(max-width: 900px)").matches) choose(2, true);
})();


// ---------- Blog overview: topic filter + "Mehr Artikel anzeigen" ----------
(function () {
  const list = document.getElementById("blog-list");
  if (!list) return;

  const cards = [...list.querySelectorAll(".post")];
  const more = document.getElementById("blog-more");
  const buttons = document.querySelectorAll("#blog-filter button");
  const STEP = 12;
  let filter = "all", shown = STEP;

  function render() {
    const match = cards.filter(c => filter === "all" || c.dataset.topic === filter);
    cards.forEach(c => { c.hidden = true; c.classList.remove("is-first"); });
    match.slice(0, shown).forEach(c => { c.hidden = false; });
    if (match[0]) match[0].classList.add("is-first");   // app view (≤1024 px): first article shown large
    more.hidden = match.length <= shown;
    buttons.forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
  }

  buttons.forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; shown = STEP; render(); }));
  more.addEventListener("click", () => { shown += STEP; render(); });
  render();
})();


// ---------- Advent calendar page: unlock with the code from the waitlist email ----------
// The PDFs are encrypted with the code (tools/encrypt-advent.mjs), so they are useless without it.
// The code is checked by decrypting a tiny test file; it is remembered on this device.
(function () {
  const page = document.querySelector("[data-advent]");
  if (!page || !window.crypto || !crypto.subtle) return;
  const dir = page.dataset.dir;
  const salt = Uint8Array.from(atob(page.dataset.salt), c => c.charCodeAt(0));
  const form = page.querySelector(".advent-form");
  const error = page.querySelector(".advent-error");
  let key;

  async function deriveKey(code) {
    const clean = code.toLowerCase().replace(/[\s+]/g, "");
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clean), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  }
  async function open(name, k) {
    const buf = await (await fetch(dir + name + ".bin")).arrayBuffer();
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, k, buf.slice(12));
  }
  async function tryCode(code) {
    try {
      const k = await deriveKey(code);
      await open("check", k);   // throws if the code is wrong
      key = k;
      page.querySelector(".advent-lock").hidden = true;
      page.querySelector(".advent-open").hidden = false;
      return true;
    } catch (e) { return false; }
  }

  let saved = null;
  try { saved = localStorage.getItem("advent2026"); } catch (e) {}
  if (saved) tryCode(saved);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.hidden = true;
    const button = form.querySelector("button");
    button.disabled = true;
    if (await tryCode(form.code.value)) {
      try { localStorage.setItem("advent2026", form.code.value); } catch (e) {}
    } else {
      error.hidden = false;
    }
    button.disabled = false;
  });

  page.querySelectorAll("[data-file]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!key || btn.disabled) return;
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Wird geladen …";
      try {
        const pdf = await open(btn.dataset.file, key);
        const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url; a.download = btn.dataset.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        btn.textContent = label;
      } catch (e) {
        btn.textContent = "Fehler, bitte noch mal versuchen";
        setTimeout(() => { btn.textContent = label; }, 4000);
      }
      btn.disabled = false;
    });
  });
})();

// ---------- Forms: retreat waitlist ----------
// With an endpoint in CONFIG the form is posted there. Without one NOTHING could be stored,
// so instead of a fake "Danke" the visitor's mail app opens with a ready e-mail to info@nidrassa.com.
document.querySelectorAll("form[data-form]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const url = CONFIG[form.dataset.form + "Url"];
    const done = form.parentElement.querySelector(".notify-done");
    if (url) {
      try {
        const res = await fetch(url, { method: "POST", body: new FormData(form) });
        if (!res.ok) throw new Error(res.status);
        form.hidden = true;
        done.hidden = false;
        return;
      } catch (err) { /* fall through to the e-mail fallback */ }
    }
    const data = new FormData(form);
    const picks = data.getAll("retreat").join(", ") || "alle";
    const body = "Hallo Anna-Lena,\n\nbitte setz mich auf die Retreat-Warteliste.\nRetreats: " + picks + "\nE-Mail: " + (data.get("email") || "") + "\n";
    window.location.href = "mailto:info@nidrassa.com?subject=" + encodeURIComponent("Retreat-Warteliste") + "&body=" + encodeURIComponent(body);
    done.textContent = "Dein E-Mail-Programm öffnet sich. Schick die Nachricht ab, dann setzen wir dich auf die Warteliste.";
    done.hidden = false;
  });
});


// ---------- Forms: Brevo forms with data-redirect ----------
// Posting straight to Brevo shows its raw {"success":true} reply unless a redirect is set in Brevo.
// So we send the form in the background and open our own "check your inbox" page.
// If the request fails, the form is submitted the normal way.
document.querySelectorAll("form[data-redirect]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const button = form.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    try {
      const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json().catch(() => ({}));
      if (data.success === false) throw new Error("rejected");
      window.location.href = form.dataset.redirect;
    } catch (err) {
      // fetch blocked (e.g. Safari privacy / content blocker): send the normal way,
      // but into a hidden frame, so the visitor never sees Brevo's raw {"success":true} page.
      let frame = document.getElementById("brevo-sink");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.name = frame.id = "brevo-sink";
        frame.hidden = true;
        document.body.appendChild(frame);
      }
      frame.onload = () => { window.location.href = form.dataset.redirect; };
      form.target = "brevo-sink";
      form.submit();
      setTimeout(() => { window.location.href = form.dataset.redirect; }, 6000);
    }
  });
});

/* Footer: collapsible link groups on phones (≤560px). Without JS everything stays open. */
(function () {
  var btn = document.querySelector('.foot-toggle');
  var panel = document.getElementById('foot-links');
  if (!btn || !panel || !window.matchMedia) return;
  var mq = window.matchMedia('(max-width: 560px)');
  function set(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.classList.toggle('is-collapsed', !open);
  }
  btn.hidden = false;
  set(!mq.matches);
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  var onChange = function (e) { set(!e.matches); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  requestAnimationFrame(function () { requestAnimationFrame(function () { panel.parentNode.classList.add('foot-ready'); }); });
})();


// =====================================================================================
// App view (screens up to 1024 px, approved 04.11.2026). Markup: _includes/app-shell.html,
// index.html (Auszeit), shop.html (slider), lernen.html, ueber.html, merkliste.html.
// Nothing here is sent anywhere: bookmarks and course progress stay in localStorage.
// =====================================================================================
const appStore = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: no saving */ } }
};
const MERK_KEY = "nidrassa-merkliste";
const appReduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- „Zurück“ (top right): previous page on this site, else the home page ----------
document.querySelectorAll("[data-back]").forEach(a => a.addEventListener("click", e => {
  if (document.referrer.indexOf(location.origin) === 0 && history.length > 1) { e.preventDefault(); history.back(); }
}));

// ---------- Auszeit: 2/5/15 segment, practice card, timer, bookmark ----------
// The first practice is already in the HTML (no layout shift); this only swaps it on click.
(function () {
  const card = document.getElementById("az-card");
  const dataEl = document.getElementById("practice-data");
  if (!card || !dataEl) return;
  const { formats, practices } = JSON.parse(dataEl.textContent);
  const NUM = ["Null", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben"];
  const PAUSE = { atmung: "Atempause", meditation: "Meditation", journaling: "Schreibpause", dehnen: "Bewegungspause", alltag: "Pause" };
  const clock = sec => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  const segs = [...document.querySelectorAll(".az-seg button")];
  const btn = document.getElementById("az-timer");
  const mark = card.querySelector(".az-mark");
  let current = practices.find(p => p.title === card.dataset.title) || practices[0];
  let timer = null, left = 0;

  const stop = () => { clearInterval(timer); timer = null; };
  const syncMark = () => {
    const on = appStore.get(MERK_KEY, []).includes(current.title);
    mark.setAttribute("aria-pressed", on);
    mark.setAttribute("aria-label", on ? "Von der Merkliste nehmen" : "Auf die Merkliste setzen");
  };

  function show(p) {
    current = p; stop(); left = 0;
    card.dataset.title = p.title;
    card.querySelector(".az-tag").textContent = formats[p.format].name + " · " + p.minutes + " Min.";
    card.querySelector(".az-title").textContent = p.title;
    card.querySelector(".az-sub").textContent = (NUM[p.steps.length] || p.steps.length) + " Schritte für deine " + (PAUSE[p.format] || "Pause") + ".";
    const ol = card.querySelector(".az-steps");
    ol.textContent = "";
    p.steps.forEach((s, i) => {
      const li = document.createElement("li"), b = document.createElement("b"), t = document.createElement("span");
      b.textContent = i + 1; t.textContent = s; li.append(b, t); ol.appendChild(li);
    });
    btn.hidden = false;
    btn.querySelector(".tlbl").textContent = "Timer starten";
    btn.querySelector(".az-time").textContent = clock(p.minutes * 60);
    card.querySelector(".az-done").hidden = true;
    segs.forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.min) === p.minutes));
    syncMark();
  }
  function choose(minutes) {
    const pool = practices.filter(p => p.minutes === minutes && p !== current);
    show(pool[Math.floor(Math.random() * pool.length)] || current);
  }

  segs.forEach(b => b.addEventListener("click", () => choose(Number(b.dataset.min))));
  document.getElementById("az-other").addEventListener("click", () => choose(current.minutes));
  document.querySelectorAll(".az-picks [data-title]").forEach(t => t.addEventListener("click", () => {
    const p = practices.find(x => x.title === t.dataset.title);
    if (!p) return;
    show(p);
    const r = card.getBoundingClientRect();
    if (r.top < 70) window.scrollTo({ top: scrollY + r.top - 80, behavior: appReduced ? "auto" : "smooth" });
  }));
  btn.addEventListener("click", () => {
    if (timer) { stop(); btn.querySelector(".tlbl").textContent = "Weiter"; return; }
    if (!left) left = current.minutes * 60;
    btn.querySelector(".tlbl").textContent = "Pause";
    timer = setInterval(() => {
      left--;
      btn.querySelector(".az-time").textContent = clock(left);
      if (left <= 0) { stop(); left = 0; btn.hidden = true; card.querySelector(".az-done").hidden = false; }
    }, 1000);
  });
  mark.addEventListener("click", () => {
    const list = appStore.get(MERK_KEY, []);
    const i = list.indexOf(current.title);
    if (i < 0) list.push(current.title); else list.splice(i, 1);
    appStore.set(MERK_KEY, list);
    syncMark();
  });
  syncMark();
})();

// ---------- Merkliste page ----------
(function () {
  const box = document.getElementById("merk-list");
  const dataEl = document.getElementById("practice-data");
  if (!box || !dataEl) return;
  const { formats, practices } = JSON.parse(dataEl.textContent);
  function render() {
    const titles = appStore.get(MERK_KEY, []);
    const items = titles.map(t => practices.find(p => p.title === t)).filter(Boolean);
    box.textContent = "";
    items.forEach(p => {
      const d = document.createElement("details"), s = document.createElement("summary"), ol = document.createElement("ol");
      const tag = document.createElement("span"), rm = document.createElement("button");
      d.className = "merk-item";
      tag.className = "merk-tag"; tag.textContent = formats[p.format].name + " · " + p.minutes + " Min.";
      s.append(tag, document.createTextNode(p.title));
      p.steps.forEach(x => { const li = document.createElement("li"); li.textContent = x; ol.appendChild(li); });
      rm.type = "button"; rm.className = "merk-rm"; rm.textContent = "Von der Merkliste nehmen";
      rm.addEventListener("click", () => { appStore.set(MERK_KEY, appStore.get(MERK_KEY, []).filter(t => t !== p.title)); render(); });
      d.append(s, ol, rm);
      box.appendChild(d);
    });
    document.getElementById("merk-empty").hidden = items.length > 0;
  }
  render();
})();

// ---------- Shop: highlight slider (swipe; auto-advance only without reduced motion) ----------
(function () {
  const track = document.getElementById("hl-track");
  if (!track) return;
  const dots = [...document.querySelectorAll("#hl-dots i")];
  const slides = [...track.children];
  let idx = 0, timer = null, paused = false;
  const visible = () => track.offsetParent !== null;   // hidden on desktop: do nothing
  track.addEventListener("scroll", () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== idx) { idx = i; dots.forEach((d, n) => d.classList.toggle("on", n === idx)); }
  }, { passive: true });
  const go = i => track.scrollTo({ left: ((i + slides.length) % slides.length) * track.clientWidth, behavior: "smooth" });
  const start = () => {
    if (appReduced) return;
    clearInterval(timer);
    timer = setInterval(() => { if (!paused && !document.hidden && visible()) go(idx + 1); }, 6000);
  };
  ["pointerdown", "touchstart", "focusin", "mouseenter"].forEach(e => track.addEventListener(e, () => { paused = true; }, { passive: true }));
  ["mouseleave", "focusout"].forEach(e => track.addEventListener(e, () => { paused = false; }));
  track.addEventListener("touchend", () => { paused = false; start(); }, { passive: true });
  start();
})();

// ---------- Lernen: course progress (episodes, flash cards, quiz), only on this device ----------
(function () {
  const page = document.querySelector("[data-kurs]");
  if (!page) return;
  const KEY = "nidrassa-kurs-" + page.dataset.kurs;
  const st = Object.assign({ heard: [], cards: [], quiz: {} }, appStore.get(KEY, {}));
  const save = () => appStore.set(KEY, st);
  const total = Number(page.dataset.total) || 1;

  function paint() {
    document.getElementById("k-heard").textContent = st.heard.length;
    document.getElementById("k-bar").style.width = Math.round(100 * st.heard.length / total) + "%";
    document.querySelectorAll(".k-ep").forEach(li => li.classList.toggle("done", st.heard.includes(Number(li.dataset.n))));
    document.getElementById("k-cards-seen").textContent = st.cards.length;
    const qs = document.querySelectorAll(".k-q");
    let answered = 0, right = 0;
    qs.forEach(f => {
      const a = st.quiz[f.dataset.i];
      if (a === undefined) return;
      answered++;
      const ok = Number(a) === Number(f.dataset.answer);
      if (ok) right++;
      const input = f.querySelector('input[value="' + a + '"]');
      if (input) input.checked = true;
      f.classList.toggle("ok", ok); f.classList.toggle("no", !ok);
      f.querySelectorAll("label").forEach((l, n) => l.classList.toggle("right", n === Number(f.dataset.answer)));
      f.querySelector(".k-why").hidden = false;
    });
    document.getElementById("k-quiz-score").textContent = answered ? right + " von " + answered + " richtig." : "";
  }

  // Episodes count as heard only when an audio file exists and was played to the end.
  document.querySelectorAll(".k-ep audio").forEach(au => au.addEventListener("ended", () => {
    const n = Number(au.closest(".k-ep").dataset.n);
    if (!st.heard.includes(n)) { st.heard.push(n); save(); paint(); }
  }));
  document.querySelectorAll(".k-card").forEach(d => d.addEventListener("toggle", () => {
    const i = Number(d.dataset.i);
    if (d.open && !st.cards.includes(i)) { st.cards.push(i); save(); paint(); }
  }));
  document.querySelectorAll(".k-q input").forEach(inp => inp.addEventListener("change", () => {
    st.quiz[inp.closest(".k-q").dataset.i] = Number(inp.value); save(); paint();
  }));
  st.heard = st.heard.filter(n => document.querySelector('.k-ep[data-n="' + n + '"] audio'));   // no audio yet = not heard
  paint();
})();
