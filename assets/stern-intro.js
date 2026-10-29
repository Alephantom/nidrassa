/* Startseite: Stern-Intro (PROTOTYP, Variante A = läuft einmal beim Laden).
   Ein Zeitstrahl render(t) in ms; Variante B würde dieselbe Funktion über den Scroll-Fortschritt steuern.
   - prefers-reduced-motion: keine Animation
   - nur einmal pro Session (sessionStorage), ?intro=1 erzwingt sie
   - Klick, Taste, Wheel oder Touch: springt direkt zum (schnellen) Hochziehen */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var KEY = 'nidrassa-stern-intro';
  var force = /[?&]intro=1/.test(location.search);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!force && sessionStorage.getItem(KEY)) return;

  // Zeitplan (ms): Start · Drehen+Wachsen · halbiert halten · Hochziehen
  var HOLD = 300, GROW = 1700, STILL = 400, LIFT = 1000;
  var T_GROW = HOLD, T_STILL = HOLD + GROW, T_LIFT = T_STILL + STILL, TOTAL = T_LIFT + LIFT;
  var TIP = 0.45255;   // untere Spitze liegt 45,255 % der Sterngröße unter der Mitte (viewBox 0..100)

  var curtain, star, cue, geo, liftDur = LIFT, start = 0, finished = false;

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function inOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lift(x) { return x * x * (3 - 2 * x); }

  function setup() {
    var inner = hero.querySelector('.hero-inner');
    var ir = inner.getBoundingClientRect();
    var sr = hero.querySelector('.star').getBoundingClientRect();
    var hr = hero.querySelector('h1').getBoundingClientRect();
    curtain = document.createElement('div');
    curtain.className = 'hero si-curtain';   // .hero: gleiche Schrift-Styles wie der echte Hero
    curtain.setAttribute('aria-hidden', 'true');
    var clone = inner.cloneNode(true);
    clone.style.left = ir.left + 'px'; clone.style.top = ir.top + 'px'; clone.style.width = ir.width + 'px';
    curtain.appendChild(clone);
    document.body.appendChild(curtain);
    star = clone.querySelector('.star');
    cue = clone.querySelector('.scroll');
    var size = parseFloat(getComputedStyle(hero.querySelector('.star')).width), cy = sr.top + sr.height / 2;
    var gap = Math.max(14, innerHeight * 0.025);           // Abstand Spitze → Oberkante NIDRASSA
    var target = (hr.top - gap) / TIP;                      // Stern-Größe, bei der die Spitze auf NIDRASSA zeigt
    geo = { k: target / size, dy: -cy };                     // Mitte wandert an die Oberkante (= halbiert)
    // Seite darunter steht schon am Inhalt nach dem Hero
    document.documentElement.classList.add('si-lock');
    history.scrollRestoration = 'manual';
    window.scrollTo(0, hero.offsetTop + hero.offsetHeight);
  }

  function render(t) {
    var g = inOut(clamp((t - T_GROW) / GROW));
    var l = lift(clamp((t - T_LIFT) / liftDur));
    star.style.transform = 'translateY(' + (geo.dy * g) + 'px) rotate(' + (360 * g) + 'deg) scale(' + (1 + (geo.k - 1) * g) + ')';
    if (cue) cue.style.opacity = String(1 - clamp(g * 2.5));
    curtain.style.transform = 'translateY(' + (-102 * l) + '%)';
  }

  function done() {
    if (finished) return; finished = true;
    if (curtain) curtain.remove();
    document.documentElement.classList.remove('si-lock');
    sessionStorage.setItem(KEY, '1');
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { removeEventListener(e, skip); });
  }

  function skip() {
    var t = performance.now() - start;
    if (t < T_LIFT) { liftDur = 450; start = performance.now() - T_LIFT; }
  }

  function tick() {
    if (finished) return;
    var t = performance.now() - start;
    render(t);
    if (t - T_LIFT >= liftDur) done(); else requestAnimationFrame(tick);
  }

  window.sternIntro = { setup: setup, render: render, done: done, TOTAL: TOTAL };
  if (window.__sternIntroManual) return;                 // Storyboard-Modus: Bilder werden per render(t) gesetzt
  setup();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { addEventListener(e, skip, { passive: true }); });
  start = performance.now();
  requestAnimationFrame(tick);
})();
