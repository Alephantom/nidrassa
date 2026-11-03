/* Startseite: Stern-Intro (Variante A, freigegeben 29.10.2026).
   - läuft nur beim allerersten Besuch (localStorage), ?intro=1 erzwingt sie
   - prefers-reduced-motion, Anker-Link oder Zurück-Button: keine Animation
   - Klick, Taste, Wheel oder Touch: Vorhang hebt sich sofort (300 ms)
   - Zeitstrahl render(t) in ms: 0,3 s Start · 1,7 s Drehen+Wachsen · 0,4 s halbiert · 1,0 s Hochziehen
   - LCP/CLS: Vorhang = Kopie des Hero im selben Layout, nur transform. Die Seite darunter wird erst
     nach dem Laden der Schriften auf den Inhalt gestellt (kein Font-Swap im sichtbaren Bereich);
     das erste Bild darunter wird schon vorher geladen. */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero || !window.requestAnimationFrame) return;
  var KEY = 'nidrassa-stern-intro';
  var force = /[?&]intro=1/.test(location.search);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (!force && localStorage.getItem(KEY)) return; } catch (e) { return; }
  if (!force && (location.hash || window.scrollY > 0)) return;

  var HOLD = 300, GROW = 1700, STILL = 400, LIFT = 1800, SKIP_LIFT = 300, FONT_WAIT = 2000;
  var T_GROW = HOLD, T_STILL = HOLD + GROW, T_LIFT = T_STILL + STILL, TOTAL = T_LIFT + LIFT;
  var TIP = 0.45255;   // untere Spitze liegt 45,255 % der Sterngröße unter der Mitte (viewBox 0..100)
  var GAP = 64;        // Luft zwischen Header und Brief-Club-Kachel im Endzustand (px)
  var EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

  var curtain, star, cue, geo, liftDur = LIFT, start = 0, running = false, finished = false;

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function inOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lift(x) { return x * x * (3 - 2 * x); }

  // Endposition: Kachel „Mamá te quiero“ steht GAP px unter dem schwebenden Header
  function endScroll() {
    var nav = document.getElementById('site-nav');
    var card = document.querySelector('.club-card');
    var navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    var heroEnd = hero.getBoundingClientRect().bottom;
    var top = card ? card.getBoundingClientRect().top : heroEnd;
    // nie weniger als das Hero-Ende, sonst blitzt oben ein Olive-Streifen hinter dem Header
    return Math.max(0, Math.round(window.scrollY + Math.max(heroEnd, top - navBottom - GAP)));
  }
  function syncScroll() { var y = endScroll(); if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y); }

  // Vorhang sofort anlegen: sieht genau aus wie der Hero und liegt an derselben Stelle
  function cover() {
    curtain = document.createElement('div');
    curtain.className = 'hero si-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.appendChild(hero.querySelector('.hero-inner').cloneNode(true));
    var a = curtain.querySelector('a'); if (a) a.setAttribute('tabindex', '-1');
    document.body.appendChild(curtain);
    star = curtain.querySelector('.star');
    cue = curtain.querySelector('.scroll');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // erstes Bild unter dem Hero schon jetzt laden (wird im Endzustand sichtbar)
    var img = document.querySelector('.hero ~ section img[loading="lazy"]');
    if (img) { img.loading = 'eager'; if ('fetchPriority' in img) img.fetchPriority = 'high'; }
  }

  // Nach dem Laden der Schriften: Geometrie messen, Seite darunter auf den Inhalt stellen
  function measure() {
    var sr = star.getBoundingClientRect();
    var hr = curtain.querySelector('h1').getBoundingClientRect();
    var size = sr.width, cy = sr.top + sr.height / 2;
    var gap = Math.max(14, innerHeight * 0.025);           // Abstand Spitze → Oberkante NIDRASSA
    var target = (hr.top - gap) / TIP;                      // Größe, bei der die Spitze auf NIDRASSA zeigt
    geo = { k: target / size, dy: -cy };                     // Mitte wandert an die Oberkante (= halbiert)
    bigStar(sr.left + sr.width / 2, cy, size * geo.k);
    syncScroll();
  }

  // Scharfer Stern: dieselben Ebenen (#star, Creme/Sage) gleich in Endgröße gezeichnet und per
  // scale(<1) auf die Hero-Größe verkleinert. Er wird nie über seine native Größe vergrößert,
  // die Kanten bleiben daher in jedem Frame scharf (auch 2560 px und Retina).
  function bigStar(cx, cy, px) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use');
    s.setAttribute('class', 'star-lite si-star');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('aria-hidden', 'true');
    u.setAttribute('href', '#star');
    s.appendChild(u);
    s.style.width = s.style.height = px + 'px';
    s.style.transform = 'scale(' + (1 / geo.k) + ')';
    star.parentNode.insertBefore(s, star.nextSibling);      // gleiche Zeichenreihenfolge wie der Hero-Stern
    var r = s.getBoundingClientRect();                       // Ursprung des Bezugsrahmens ausgleichen
    s.style.left = (cx - (r.left + r.width / 2)) + 'px';
    s.style.top = (cy - (r.top + r.height / 2)) + 'px';
    star.style.visibility = 'hidden';
    star = s;
  }

  function render(t) {
    var g = inOut(clamp((t - T_GROW) / GROW));
    var l = lift(clamp((t - T_LIFT) / liftDur));
    star.style.transform = 'translateY(' + (geo.dy * g) + 'px) rotate(' + (360 * g) + 'deg) scale(' + (1 + (geo.k - 1) * g) / geo.k + ')';
    if (cue) cue.style.opacity = String(1 - clamp(g * 2.5));
    // ganz hoch inkl. Schatten (80 px), damit beim Entfernen nichts mehr zuckt
    curtain.style.transform = 'translateY(calc(' + (-100 * l) + '% - ' + (80 * l) + 'px))';
  }

  function done() {
    if (finished) return; finished = true;
    EVENTS.forEach(function (e) { removeEventListener(e, skip); });
    if (curtain) curtain.remove();
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  }

  function skip() {
    if (!running) begin();
    var t = performance.now() - start;
    if (t < T_LIFT) { liftDur = SKIP_LIFT; start = performance.now() - T_LIFT; }
  }

  function tick() {
    if (finished) return;
    var t = performance.now() - start;
    if (t < T_LIFT) syncScroll();                          // falls sich darunter noch etwas verschiebt
    render(t);
    if (t - T_LIFT >= liftDur) done(); else requestAnimationFrame(tick);
  }

  function begin() {
    if (running) return; running = true;
    measure();
    start = performance.now();
    requestAnimationFrame(tick);
  }

  window.sternIntro = { cover: cover, measure: measure, render: render, done: done, TOTAL: TOTAL };
  if (window.__sternIntroManual) return;                   // Storyboard-Modus: Bilder per render(t)
  cover();
  try { localStorage.setItem(KEY, '1'); } catch (e) {}     // auch bei Abbruch oder Reload nur einmal
  EVENTS.forEach(function (e) { addEventListener(e, skip, { passive: true }); });
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, FONT_WAIT); })]).then(begin);
})();
