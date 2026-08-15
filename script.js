(function () {
  const RING_CIRCUMFERENCE = 841.95;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  const MOBILE_BREAKPOINT = 720;
  const PLATE_CX = 460, PLATE_CY = 300;

  // Starting positions (px within the 920x560 stage) for each food icon -
  // also each icon's base inline left/top, so all dx/dy below are offsets
  // from these points regardless of device.
  const START = {
    onion: [68, 223], egg: [229, 386], cup: [719, 224],
    mushroom: [874, 217], pineapple: [718, 370],
    grid: [228, 223], leaf: [794, 299], fish: [156, 299],
  };
  // Desktop: only these three fly to the plate; the rest just drift in place.
  const TARGET = { grid: [395, 240], leaf: [548, 293], fish: [449, 387] };
  const FLIGHT_WINDOW = { grid: [0.04, 0.30], leaf: [0.28, 0.52], fish: [0.50, 0.74] };
  const PASSIVE_ICONS = ['onion', 'egg', 'cup', 'mushroom', 'pineapple'];

  // Mobile: the ring is scaled up to be the focal point, which pushes most
  // of the desktop-authored icon layout off-canvas. The five muted icons
  // are hidden entirely on mobile (see the max-width:720px media query) -
  // only the three full-color ones land on the plate, spread evenly around
  // it (120° apart) instead of reusing their clustered desktop targets.
  const MOBILE_ACTIVE_IDS = ['grid', 'leaf', 'fish'];
  const MOBILE_TARGET = {};
  const MOBILE_START = {};
  const MOBILE_FLIGHT_WINDOW = {};
  (function buildMobileLayout() {
    const landingRadius = 88; // close to the percent number but clear of it
    const startRadius = 900; // clears the viewport at any angle, including near-vertical ones on tall phones
    const startAngleDeg = -90; // straight up, then 120° apart
    const stepDeg = 360 / MOBILE_ACTIVE_IDS.length;
    MOBILE_ACTIVE_IDS.forEach((id, i) => {
      const rad = (startAngleDeg + i * stepDeg) * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      MOBILE_TARGET[id] = [PLATE_CX + landingRadius * cos, PLATE_CY + landingRadius * sin];
      MOBILE_START[id] = [PLATE_CX + startRadius * cos, PLATE_CY + startRadius * sin];
      MOBILE_FLIGHT_WINDOW[id] = FLIGHT_WINDOW[id];
    });
  })();

  const stage = $('animStage');
  const track = $('anim-track');
  if (!stage || !track) return;

  const apply = (p) => {
    const wrap = stage.parentElement;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    let scale;
    if (isMobile) {
      // Size the ring itself, not the full desktop icon spread - it's the
      // focal point on mobile, so let it take up most of the screen width.
      // Anchor scaling to the top so the stage's top edge stays put as it
      // shrinks/grows (the default center-center origin would shift the
      // whole canvas up or down as scale changes, throwing off the height
      // math below). wrap.clientHeight isn't reliable either - the 920x560
      // canvas keeps its full *layout* height regardless of the visual
      // scale, so the flex box reserves space for all 560px even when the
      // ring renders much smaller - so measure from the wrap's actual
      // screen position instead, and reserve room for the fixed scroll-cue
      // pill near the bottom of the viewport.
      stage.style.transformOrigin = 'top center';
      const pillClearance = 116;
      const wrapTop = wrap.getBoundingClientRect().top;
      const availH = Math.max(140, window.innerHeight - wrapTop - pillClearance);
      const widthScale = clamp(window.innerWidth * 0.92, 240, 400) / 300;
      const heightScale = availH / 442; // 442 = local offset from stage top to the ring stroke's true bottom edge
      scale = clamp(Math.min(widthScale, heightScale), 200 / 300, 400 / 300);
    } else {
      stage.style.transformOrigin = 'center center';
      const availW = Math.min(window.innerWidth - 28, 1000);
      const availH = Math.max(200, wrap.clientHeight - 76);
      scale = Math.min(1, availW / 920, availH / 560);
    }
    stage.style.transform = `scale(${scale})`;

    const arc = $('ringArc');
    const fill = clamp(0.05 + smooth(seg(p, 0.03, 0.78)) * 0.95, 0, 1);
    if (arc) arc.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fill));

    const percentValue = $('percentValue');
    if (percentValue) percentValue.textContent = String(Math.round(fill * 100));

    const endFade = seg(p, 0.78, 0.88);
    const activeIds = isMobile ? MOBILE_ACTIVE_IDS : Object.keys(TARGET);

    for (const id of activeIds) {
      const el = $('icon-' + id);
      if (!el) continue;
      const target = isMobile ? MOBILE_TARGET[id] : TARGET[id];
      const from = isMobile ? MOBILE_START[id] : START[id];
      const win = isMobile ? MOBILE_FLIGHT_WINDOW[id] : FLIGHT_WINDOW[id];
      const t = smooth(seg(p, win[0], win[1]));
      const curX = from[0] + (target[0] - from[0]) * t;
      const curY = from[1] + (target[1] - from[1]) * t;
      // dx/dy are relative to the icon's base inline position, which is
      // always the desktop START point regardless of device.
      const dx = curX - START[id][0];
      const dy = curY - START[id][1];
      const sc = 1 - 0.35 * endFade;
      el.style.transform = `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${sc})`;
      el.style.opacity = String(1 - endFade);
    }

    if (!isMobile) {
      for (const id of PASSIVE_ICONS) {
        const el = $('icon-' + id);
        if (!el) continue;
        const [sx, sy] = START[id];
        const ux = sx - PLATE_CX, uy = sy - PLATE_CY;
        const len = Math.hypot(ux, uy) || 1;
        const drift = 30 * p;
        el.style.transform = `translate(-50%,-50%) translate(${(ux / len) * drift}px,${(uy / len) * drift}px)`;
        el.style.opacity = String(1 - endFade);
      }
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
    if (cue) cue.style.opacity = String((1 - seg(p, 0.92, 1)) * 0.9);
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
