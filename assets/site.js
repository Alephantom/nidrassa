/*
 * Nidrassa – interactive behaviour for all pages.
 * All content (navigation, practices, blog cards, gallery photos) is rendered by Jekyll;
 * this file only adds interaction. Every section checks whether its elements exist,
 * so the same file can be loaded on every page.
 */

// ---------- Settings: paste the real links here once the tools are set up ----------
const CONFIG = {
  preorderUrl: "",    // checkout link for "Eine Frage weiter" (e.g. Stripe payment link or Shopify)
  newsletterUrl: "",  // form endpoint of the newsletter tool (e.g. Brevo, MailerLite)
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
    btn.textContent = "Vorbestellung öffnet bald";
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


// ---------- Forms: newsletter + retreat waitlist ----------
// Sends to the matching endpoint in CONFIG (form data-form="newsletter" → newsletterUrl).
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
