/*
 * Nidrassa – interactive behaviour for all pages.
 * All content (navigation, practices, blog cards, gallery photos) is rendered by Jekyll;
 * this file only adds interaction. Every section checks whether its elements exist,
 * so the same file can be loaded on every page.
 */

// ---------- Settings: paste the real links here once the tools are set up ----------
const CONFIG = {
  preorderUrl: "",    // checkout link for "Eine Frage weiter" (e.g. Stripe payment link or Shopify)
  waitlistUrl: ""     // form endpoint for the retreat waitlist
};


// ---------- Burger menus (screens up to 900px) ----------
// Used for the main navigation and for the retreat page's section navigation.
function setupMenu(buttonId, menuId, containerId, openLabel, closeLabel) {
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
  window.addEventListener("resize", () => { if (window.innerWidth > 900 && !menu.hidden) setOpen(false); });
}
setupMenu("burger", "menu", "site-nav", "Menü öffnen", "Menü schließen");
setupMenu("subnav-burger", "subnav-menu", "subnav", "Inhalte öffnen", "Inhalte schließen");


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

  const stopTimer = () => { clearInterval(timer); timer = null; };

  function toggleTimer(total) {
    const btn = document.getElementById("pick-timer");
    if (timer) { stopTimer(); btn.firstChild.textContent = "Weiter · "; return; }
    if (!left) left = total;
    btn.firstChild.textContent = "Pause · ";
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
      '<span class="tag">' + formats[p.format].name + " · " + p.minutes + " Min.</span>" +
      "<h3>" + p.title + "</h3>" +
      '<ol class="steps">' + p.steps.map(s => "<li>" + s + "</li>").join("") + "</ol>" +
      '<div class="pick-actions">' +
        '<button class="btn timer-btn" type="button" id="pick-timer">Timer starten · <span id="pick-time">' + clock(p.minutes * 60) + "</span></button>" +
        '<button class="ghost" type="button" id="pick-again">Andere Übung</button>' +
      "</div>" +
      '<p class="timer-done" id="timer-done" hidden>Geschafft. Wie fühlst du dich jetzt?</p>';
    box.hidden = false;
    document.getElementById("pick-again").addEventListener("click", () => choose(p.minutes));
    document.getElementById("pick-timer").addEventListener("click", () => toggleTimer(p.minutes * 60));
  }

  function choose(minutes) {
    const pool = practices.filter(p => p.minutes === minutes && p !== current);
    current = pool[Math.floor(Math.random() * pool.length)];
    stopTimer();
    left = 0;
    document.querySelectorAll(".step").forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.min) === minutes));
    render();
  }

  document.querySelectorAll(".step").forEach(b => {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => choose(Number(b.dataset.min)));
  });
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
    cards.forEach(c => { c.hidden = true; });
    match.slice(0, shown).forEach(c => { c.hidden = false; });
    more.hidden = match.length <= shown;
    buttons.forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
  }

  buttons.forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; shown = STEP; render(); }));
  more.addEventListener("click", () => { shown += STEP; render(); });
  render();
})();


// ---------- Shop: edition switch (Deutsch / English deck) ----------
(function () {
  const title = document.getElementById("p-title");
  const sub = document.getElementById("p-sub");
  const buttons = document.querySelectorAll(".edition button");
  if (!title || !buttons.length) return;

  buttons.forEach(btn => btn.addEventListener("click", () => {
    buttons.forEach(b => b.setAttribute("aria-pressed", b === btn));
    title.textContent = btn.dataset.title;
    sub.textContent = btn.dataset.sub;
  }));
})();


// ---------- Shop: photo gallery (shuffled order, changes every 5 seconds) ----------
(function () {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const main = document.getElementById("gallery-main");
  const thumbs = [...gallery.querySelectorAll(".gallery-thumbs button")];
  // Shuffle the thumbnails once per visit.
  thumbs.sort(() => Math.random() - 0.5).forEach(t => t.parentElement.appendChild(t));

  let idx = 0, timer = null;
  const show = i => {
    idx = (i + thumbs.length) % thumbs.length;
    const t = thumbs[idx];
    main.classList.remove("in");
    requestAnimationFrame(() => {
      main.src = t.dataset.src;
      main.alt = t.dataset.alt;
      requestAnimationFrame(() => main.classList.add("in"));
    });
    thumbs.forEach((b, n) => b.setAttribute("aria-current", n === idx));
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = () => { if (!reduced) { clearInterval(timer); timer = setInterval(() => show(idx + 1), 5000); } };

  thumbs.forEach((b, n) => b.addEventListener("click", () => { show(n); start(); }));
  gallery.addEventListener("mouseenter", () => clearInterval(timer));
  gallery.addEventListener("mouseleave", start);
  show(0);
  start();
})();


// ---------- Shop: pre-order button ----------
// Without a checkout link the button reads "opens soon" instead of being a dead link.
(function () {
  const btn = document.getElementById("preorder");
  if (!btn) return;
  if (CONFIG.preorderUrl) {
    btn.href = CONFIG.preorderUrl;
  } else {
    btn.removeAttribute("href");
    btn.setAttribute("aria-disabled", "true");
    btn.textContent = "Shop öffnet am 15. November";
  }
})();


// ---------- Shop: GoFundMe widget, loaded only after a click ----------
// Nothing is sent to GoFundMe before the visitor clicks "Fundraiser anzeigen" (privacy).
(function () {
  const btn = document.getElementById("gfm-load");
  if (!btn) return;
  btn.addEventListener("click", () => {
    document.getElementById("gfm-box").innerHTML =
      '<div class="gfm-embed" data-url="https://www.gofundme.com/f/eine-karte-weiter-journaling-karten-fur-unterwegs/widget/large?attribution_id=sl%3Aa3dfc4ff-5131-4358-acee-48593e322d81"></div>';
    const script = document.createElement("script");
    script.src = "https://www.gofundme.com/static/js/embed.js";
    // GoFundMe's script only builds widgets on DOMContentLoaded, which has already passed.
    script.onload = () => document.dispatchEvent(new Event("DOMContentLoaded"));
    document.body.appendChild(script);
  });
})();


// ---------- Card waitlist confirmation: countdown to the shop launch ----------
// Target date comes from _data/shop.yml (open_at). Hidden once the shop is open.
(function () {
  const box = document.querySelector("[data-countdown]");
  if (!box) return;
  const target = new Date(box.dataset.countdown).getTime();
  const units = { d: 86400, h: 3600, m: 60, s: 1 };
  function tick() {
    let left = Math.floor((target - Date.now()) / 1000);
    if (isNaN(left) || left <= 0) { box.hidden = true; clearInterval(timer); return; }
    for (const [unit, size] of Object.entries(units)) {
      box.querySelector(`[data-unit="${unit}"]`).textContent = String(Math.floor(left / size)).padStart(unit === "d" ? 1 : 2, "0");
      left %= size;
    }
  }
  const timer = setInterval(tick, 1000);
  tick();
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
// Sends to the matching endpoint in CONFIG (form data-form="waitlist" → waitlistUrl).
// The newsletter form posts straight to Brevo (see index.html) and is not handled here.
// While the endpoint is empty NOTHING is sent; the thank-you note still shows for testing.
document.querySelectorAll("form[data-form]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const url = CONFIG[form.dataset.form + "Url"];
    if (url) {
      try { await fetch(url, { method: "POST", body: new FormData(form) }); } catch (err) { /* keep the note friendly */ }
    }
    form.hidden = true;
    form.parentElement.querySelector(".notify-done").hidden = false;
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
      form.submit();
    }
  });
});
