(function () {
  const RING_CIRCUMFERENCE = 841.95;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  // Starting positions (px within the 920x560 stage) for each food icon.
  const START = {
    onion: [68, 223], egg: [229, 386], cup: [719, 224],
    mushroom: [874, 217], pineapple: [718, 370],
    grid: [228, 223], leaf: [794, 299], fish: [156, 299],
  };
  // Where the three "active" icons fly to as they land on the plate.
  const TARGET = { grid: [408, 252], leaf: [512, 296], fish: [452, 366] };
  // Scroll-progress window in which each active icon makes its flight.
  const FLIGHT_WINDOW = { grid: [0.04, 0.30], leaf: [0.28, 0.52], fish: [0.50, 0.74] };
  const PASSIVE_ICONS = ['onion', 'egg', 'cup', 'mushroom', 'pineapple'];

  const stage = $('animStage');
  const track = $('anim-track');
  if (!stage || !track) return;

  const apply = (p) => {
    const wrap = stage.parentElement;
    const availW = Math.min(window.innerWidth - 28, 1000);
    const availH = Math.max(200, wrap.clientHeight - 76);
    const scale = Math.min(1, availW / 920, availH / 560);
    stage.style.transform = `scale(${scale})`;

    const arc = $('ringArc');
    const fill = clamp(0.05 + smooth(seg(p, 0.03, 0.78)) * 0.95, 0, 1);
    if (arc) arc.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fill));

    const endFade = seg(p, 0.78, 0.88);

    for (const id of Object.keys(TARGET)) {
      const el = $('icon-' + id);
      if (!el) continue;
      const t = smooth(seg(p, FLIGHT_WINDOW[id][0], FLIGHT_WINDOW[id][1]));
      const dx = (TARGET[id][0] - START[id][0]) * t;
      const dy = (TARGET[id][1] - START[id][1]) * t;
      const sc = 1 - 0.35 * endFade;
      el.style.transform = `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${sc})`;
      el.style.opacity = String(1 - endFade);
    }

    for (const id of PASSIVE_ICONS) {
      const el = $('icon-' + id);
      if (!el) continue;
      const [sx, sy] = START[id];
      const ux = sx - 460, uy = sy - 300;
      const len = Math.hypot(ux, uy) || 1;
      const drift = 30 * p;
      el.style.transform = `translate(-50%,-50%) translate(${(ux / len) * drift}px,${(uy / len) * drift}px)`;
      el.style.opacity = String(1 - endFade);
    }

    const plate = $('plate');
    if (plate) {
      const pf = seg(p, 0.78, 0.88);
      plate.style.opacity = String(1 - pf);
      plate.style.transform = `translate(-50%,-50%) scale(${1 - 0.12 * pf})`;
    }

    const check = $('checkmark');
    if (check) {
      const cp = seg(p, 0.80, 0.94);
      let cs = 0, co = 0;
      if (cp > 0) {
        co = clamp(cp / 0.28, 0, 1);
        cs = cp < 0.62 ? smooth(cp / 0.62) * 1.14 : 1.14 - smooth((cp - 0.62) / 0.38) * 0.14;
      }
      check.style.transform = `translate(-50%,-50%) scale(${cs})`;
      check.style.opacity = String(co);
    }

    const head = $('heroHead');
    if (head) {
      head.style.transform = `translateY(${-p * 180}px)`;
      head.style.opacity = String(1 - seg(p, 0.55, 1) * 0.15);
    }
    const cue = $('scrollCue');
    if (cue) cue.style.opacity = String((1 - seg(p, 0.02, 0.14)) * 0.9);
  };

  let ticking = false;
  const tick = () => {
    ticking = false;
    const range = track.offsetHeight - window.innerHeight;
    const p = range > 0 ? clamp(-track.getBoundingClientRect().top / range, 0, 1) : 0;
    apply(p);
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  tick();
})();
