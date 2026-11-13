/* ---------- Матч в 3D (Three.js): город по графу карты, игроки с фото, трассеры, дым, молотов, бомба ----------
   Ход матча считает движок (OV.m), сцена только показывает раунд. Табло, составы, лента, подготовка к раунду
   и все кнопки — общие с 2D-матчем (live.js). Нет WebGL — играем в 2D (liveBuild). */
/* проверочный WebGL-контекст сразу отпускаем: на телефонах число живых контекстов ограничено */
const glFree = x => { try { const e = x && x.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); } catch (e) { /* нет расширения */ } };
const m3Ok = () => { if (m3Ok.v === undefined) { try { const c = document.createElement('canvas'); const x = window.THREE && (c.getContext('webgl2') || c.getContext('webgl')); m3Ok.v = !!x; glFree(x); } catch (e) { m3Ok.v = false; } } return m3Ok.v && !m3Ok.bad; };
let M3C = null;
function m3Stop() { if (!M3C) return; const c = M3C; M3C = null; try { c.dispose(); } catch (e) { /* контекст уже освобождён */ } }
const M3D = (() => {
  const lerp = (a, b, t) => a + (b - a) * t, damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const PHC = {};   /* фото игроков для табличек над головой: id карты → картинка (или null) */
  const loadPh = url => !url ? Promise.resolve(null) : new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer';
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 2; c.getContext('2d').drawImage(im, 0, 0, 2, 2); c.getContext('2d').getImageData(0, 0, 1, 1); res(im); } catch (e) { res(null); } };
    im.onerror = () => res(null); setTimeout(() => res(null), 6000); im.src = url; });
  const THM = { sand: { sky: 0x9fb7c9, fog: 0xcab894, g: '#c9b088', g2: '#b59a72', st: 0x5e584e, curb: 0x3e3a33, roof: [0xd8c39c, 0xc9ae84, 0xbfa074, 0xd1b78e, 0xc4a77c], wall: 0xb39672, tree: 0x5c8a3a, dome: 0xc9a043 },
    inferno: { sky: 0xa9b8c4, fog: 0xbfa88a, g: '#b49a74', g2: '#9c8262', st: 0x695a4c, curb: 0x40352c, roof: [0xb8613f, 0xc97a4f, 0xa5543a, 0xd08b5c, 0xbe6c45], wall: 0xd8c2a2, tree: 0x4f7a34, dome: 0x9a7a52 },
    ancient: { sky: 0x8fb0a6, fog: 0x6f8a68, g: '#4c6741', g2: '#3c5534', st: 0x6c695d, curb: 0x3b3a33, roof: [0x8a8f7a, 0x9aa08a, 0x7d826d, 0xa7ab93, 0x8e9480], wall: 0x8a8a78, tree: 0x2f5a2a, dome: 0x7f9a6a } };

  function make(cv, m) {
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;   /* цвета в коде — в sRGB */
    const MAPN = m.map.n, MOB = Math.min(innerWidth, innerHeight) < 600, TEX = [];
    const R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    R3.setPixelRatio(Math.min(devicePixelRatio || 1, MOB ? 2 : 1.75)); R3.outputEncoding = THREE.sRGBEncoding; R3.toneMapping = THREE.ACESFilmicToneMapping; R3.toneMappingExposure = .95;
    R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, .5, 400), TH = THM[RD_MAP_THEME[MAPN] || 'sand'];
    scene.background = new THREE.Color(TH.sky); scene.fog = new THREE.Fog(TH.fog, 90, 210);
    scene.add(new THREE.HemisphereLight(0xb8cce2, 0x3a2e22, .38));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.25); sun.position.set(-62, 46, 30); sun.castShadow = true;
    const SM = MOB ? 1536 : 2048; sun.shadow.mapSize.set(SM, SM); Object.assign(sun.shadow.camera, { left: -74, right: 74, top: 74, bottom: -74, near: 10, far: 200 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
    const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = R3.capabilities.getMaxAnisotropy(); TEX.push(t); return t; };
    let seed = 0; for (const ch of MAPN) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const RM = rdMap(MAPN), GEO = rdGeo(RM), X = u => u - 50, Z = v => v - 50;
    const out = p => -rdFree(RM, p);   /* насколько точка снаружи прохода (<0 — внутри) */

    /* земля */
    const groundT = ctex(1024, 1024, (g, w) => { g.fillStyle = TH.g; g.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? TH.g2 : 'rgba(255,255,255,.06)'; g.globalAlpha = .3; const r = Math.random() * 6; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, r, 0, 7); g.fill(); } g.globalAlpha = 1; });
    groundT.wrapS = groundT.wrapT = THREE.RepeatWrapping; groundT.repeat.set(3, 3);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: groundT, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    /* улицы: бордюр + покрытие, круглые стыки */
    const stT = ctex(256, 256, (g, w) => { g.fillStyle = '#7a756b'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 90 + Math.random() * 60 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 3, 2 + Math.random() * 3); } });
    stT.wrapS = stT.wrapT = THREE.RepeatWrapping;
    const stMat = new THREE.MeshStandardMaterial({ map: stT, color: new THREE.Color(TH.st).multiplyScalar(.78), roughness: .95 }), curbMat = new THREE.MeshStandardMaterial({ color: TH.curb, roughness: .9 });
    const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, .5, 0);
    const o = new THREE.Object3D(), col = new THREE.Color();
    if (GEO.rects) {
      /* карта по схеме радара: пол зон — светлый камень, всё остальное — сплошные стены домов вплотную к проходам */
      const flT = ctex(256, 256, (g, w) => { g.fillStyle = '#8f8470'; g.fillRect(0, 0, w, w); for (let i = 0; i < 1800; i++) { const v = 110 + Math.random() * 50 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 24},.55)`; g.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 4, 2 + Math.random() * 4); }
        g.strokeStyle = 'rgba(40,32,22,.28)'; g.lineWidth = 2; for (let k = 0; k <= w; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, w); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } });
      flT.wrapS = flT.wrapT = THREE.RepeatWrapping;
      const flM = new THREE.MeshStandardMaterial({ map: flT, color: new THREE.Color(TH.floor || 0xffffff), roughness: .95 });
      /* карты, снятые с радара полосами (сотня зон): один общий пол под всей картой — стены всё равно закрывают непроходимое */
      const floorRects = RM.union ? [[-8, -8, 108, 108]] : GEO.rects;
      for (const r of floorRects) { const w = r[2] - r[0], d = r[3] - r[1], g2 = new THREE.BoxGeometry(w, .12, d), uv = g2.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 6, uv.getY(k) * d / 6); const f = new THREE.Mesh(g2, flM); f.position.set(X((r[0] + r[2]) / 2), .06, Z((r[1] + r[3]) / 2)); f.receiveShadow = true; scene.add(f); }
      /* стены: клетки 2×2 снаружи зон, слитые в полосы; высота по кварталам */
      const C = 2, hq = (x, y) => { let h = ((Math.floor(x / 9) * 73856093) ^ (Math.floor(y / 9) * 19349663) ^ seed) >>> 0; h = (h ^ h >>> 13) * 1274126177 >>> 0; return h / 4294967296; }, runs = [];
      for (let y = -8; y < 108; y += C) { let cur = null; for (let x = -8; x < 108; x += C) { const c = [x + C / 2, y + C / 2], ok = out(c) >= .95, h = ok ? 2.8 + Math.round(hq(c[0], c[1]) * 3) * .9 : 0;
        if (cur && ok && h === cur.h) cur.x1 = x + C; else { if (cur) runs.push(cur); cur = ok ? { x0: x, x1: x + C, y, h, rc: hq(c[0] + 4, c[1] + 4) } : null; } } if (cur) runs.push(cur); }
      const walls = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .9 }), runs.length), tops = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .92 }), runs.length);
      runs.forEach((u, k) => { const w = u.x1 - u.x0; o.position.set(X(u.x0 + w / 2), 0, Z(u.y + C / 2)); o.scale.set(w, u.h, C); o.updateMatrix(); walls.setMatrixAt(k, o.matrix); walls.setColorAt(k, col.setHex(TH.wall).multiplyScalar(1.02 + u.rc * .14));
        o.position.y = u.h; o.scale.set(w, .2, C); o.updateMatrix(); tops.setMatrixAt(k, o.matrix); tops.setColorAt(k, col.setHex(TH.roof[(u.rc * TH.roof.length) | 0]).multiplyScalar(.62)); });
      for (const b of [walls, tops]) { b.castShadow = b.receiveShadow = true; if (b.instanceColor) b.instanceColor.needsUpdate = true; scene.add(b); }
      /* проёмы только для обзора (окно на мид): низкий подоконник */
      for (const r of GEO.vrects) { const sill = new THREE.Mesh(boxG, new THREE.MeshStandardMaterial({ color: TH.wall, roughness: .9 })); sill.position.set(X((r[0] + r[2]) / 2), 0, Z((r[1] + r[3]) / 2)); sill.scale.set(r[2] - r[0], 1.4, r[3] - r[1]); sill.castShadow = true; scene.add(sill); }
    } else {
      /* проходы: своя ширина у каждого, площадки у узлов (точки, респауны, мид) */
      const road = (pad, y, mat) => { for (const sg of GEO.segs) { const a = sg.a, b = sg.b, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const r = new THREE.Mesh(new THREE.BoxGeometry(L, .12, sg.h * 2 + pad), mat); r.position.set(X((a[0] + b[0]) / 2), y, Z((a[1] + b[1]) / 2)); r.rotation.y = -Math.atan2(dy, dx); r.receiveShadow = true; scene.add(r); }
        for (const c of GEO.circ) if (c.r > 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r + pad / 2, c.r + pad / 2, .12, 28), mat); m.position.set(X(c.c[0]), y, Z(c.c[1])); m.receiveShadow = true; scene.add(m); } };
      road(1.4, .04, curbMat); road(0, .1, stMat);
      /* дома: инстансы коробок с крышами, детали на крышах */
      const lots = [];
      for (let y = -14; y < 114; y += 4.4) for (let x = -14; x < 114; x += 4.4) { const cx = x + rnd() * 1.4, cy = y + rnd() * 1.4, w = 3.2 + rnd() * 1.6, d = 3.2 + rnd() * 1.6; if (out([cx + w / 2, cy + d / 2]) < 2.6 + Math.max(w, d) * .25) continue; const edge = Math.max(Math.abs(cx - 50), Math.abs(cy - 50)) > 56; if (edge && rnd() < .5) continue; if (rnd() < .07) continue;
        const near = out([cx + w / 2, cy + d / 2]) + 4.3; lots.push({ x: cx, y: cy, w, d, h: (near < 12 ? 3.2 : 4.5) + rnd() * (near < 12 ? 3.4 : 6) }); }
      const bodies = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .88, metalness: 0 }), lots.length), roofs = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .9 }), lots.length);
      const det = [];
      lots.forEach((L, i) => { o.position.set(X(L.x + L.w / 2), 0, Z(L.y + L.d / 2)); o.scale.set(L.w, L.h, L.d); o.rotation.set(0, 0, 0); o.updateMatrix(); bodies.setMatrixAt(i, o.matrix); bodies.setColorAt(i, col.setHex(TH.wall).multiplyScalar(.85 + rnd() * .2));
        o.position.y = L.h; o.scale.set(L.w * .96, .25, L.d * .96); o.updateMatrix(); roofs.setMatrixAt(i, o.matrix); roofs.setColorAt(i, col.setHex(TH.roof[(rnd() * TH.roof.length) | 0]));
        const q = rnd(); if (q < .35) det.push({ k: 'ac', x: L.x + L.w * (.25 + rnd() * .4), y: L.y + L.d * (.25 + rnd() * .4), h: L.h + .25 }); else if (q < .43 && RD_MAP_THEME[MAPN] !== 'ancient') det.push({ k: 'dome', x: L.x + L.w / 2, y: L.y + L.d / 2, h: L.h + .25, r: Math.min(L.w, L.d) * .34 }); });
      for (const b of [bodies, roofs]) { b.castShadow = b.receiveShadow = true; if (b.instanceColor) b.instanceColor.needsUpdate = true; scene.add(b); }
      { const acs = det.filter(d => d.k === 'ac'), dms = det.filter(d => d.k === 'dome');
        const a = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: .6, metalness: .3 }), acs.length); acs.forEach((d, i) => { o.position.set(X(d.x), d.h, Z(d.y)); o.scale.set(.9, .6, .7); o.updateMatrix(); a.setMatrixAt(i, o.matrix); }); a.castShadow = true; scene.add(a);
        const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: TH.dome, roughness: .35, metalness: .5 }), dms.length); dms.forEach((d, i) => { o.position.set(X(d.x), d.h, Z(d.y)); o.scale.setScalar(d.r); o.updateMatrix(); dm.setMatrixAt(i, o.matrix); }); dm.castShadow = true; scene.add(dm); }
    }
    /* ящики и деревья у дорог */
    { const cr = [], tr = []; for (let i = 0; i < 260; i++) { const p = [rnd() * 100, rnd() * 100], d = out(p); if (d > -1.8 && d < -.6 && cr.length < (GEO.rects ? 14 : 30)) cr.push(p); else if (!GEO.rects && d > .4 && d < 2.2 && tr.length < 40 && rnd() < .5) tr.push(p); }
      const cm = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0x8b6a3f, roughness: .85 }), cr.length); cr.forEach((p, i) => { const s = 1.2 + rnd() * .5; o.position.set(X(p[0]), .1, Z(p[1])); o.scale.set(s, s * (rnd() < .3 ? 2 : 1), s); o.rotation.y = rnd(); o.updateMatrix(); cm.setMatrixAt(i, o.matrix); }); cm.castShadow = cm.receiveShadow = true; scene.add(cm);
      const tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: TH.tree, roughness: .9, flatShading: true }), tr.length), trunk = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0x6b4b2a }), tr.length);
      tr.forEach((p, i) => { o.rotation.set(0, rnd() * 3, 0); o.position.set(X(p[0]), 3.2, Z(p[1])); o.scale.set(1.3, .9, 1.3); o.updateMatrix(); tm.setMatrixAt(i, o.matrix); o.position.y = 0; o.scale.set(.3, 3, .3); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix); }); tm.castShadow = trunk.castShadow = true; scene.add(tm, trunk); }
    /* точки A/B и респауны */
    const siteT = s => ctex(256, 256, (g, w) => { g.fillStyle = '#c4252b'; g.fillRect(0, 0, w, w); g.strokeStyle = '#fff'; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, w - 20); g.fillStyle = '#fff'; g.font = '700 190px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, w / 2 + 10); });
    const sitePl = {};
    /* знак точки лежит на земле в группе: группа каждый кадр поворачивается так, чтобы буква стояла ровно перед игроком */
    const siteG = [];
    for (const s of ['A', 'B']) { const p = RM.n[s], pl = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), new THREE.MeshStandardMaterial({ map: siteT(s), roughness: .6, emissive: 0xff3030, emissiveIntensity: .08 })), g = new THREE.Group(); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; g.add(pl); g.position.set(X(p[0]), .2, Z(p[1])); scene.add(g);
      sitePl[s] = pl; siteG.push(g); }
    /* укрытия по карте: ящики, будка, фургон, машины */
    if (RM.props && RM.props.length) { const pm = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0x8b6a3f, roughness: .8 }), RM.props.length); RM.props.forEach(([x, y, w, d, h], i) => { o.position.set(X(x), .1, Z(y)); o.scale.set(w, h, d); o.rotation.set(0, 0, 0); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); pm.setColorAt(i, col.setHex([0x8b6a3f, 0x6f7a80, 0x9a8a6a][i % 3])); }); pm.castShadow = pm.receiveShadow = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true; scene.add(pm); }
    for (const [k, c] of [['TS', 0xf2c14e], ['CTS', 0x4aa3ff]]) { const p = RM.n[k], z = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .28, depthWrite: false })); z.rotation.x = -Math.PI / 2; z.position.set(X(p[0]), .22, Z(p[1])); scene.add(z); }

    /* игроки: фигурка, кольцо на земле, табличка с фото и ником */
    function tagTex(c, side, me, img) {
      return ctex(256, 128, (g, w, h) => { const cl = side === 'T' ? '#f2c14e' : '#4aa3ff'; g.clearRect(0, 0, w, h);
        g.save(); g.beginPath(); g.arc(128, 50, 42, 0, 7); g.closePath(); g.fillStyle = '#10161d'; g.fill(); g.clip(); if (img) { const s = Math.max(84 / img.naturalWidth, 84 / img.naturalHeight); g.drawImage(img, 128 - img.naturalWidth * s / 2, 8, img.naturalWidth * s, img.naturalHeight * s); } else { g.fillStyle = '#fff'; g.font = '700 34px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.nick.slice(0, 2).toUpperCase(), 128, 52); } g.restore();
        g.lineWidth = 8; g.strokeStyle = cl; g.beginPath(); g.arc(128, 50, 42, 0, 7); g.stroke();
        g.font = '700 26px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(c.nick).width + 18; g.fillStyle = me ? 'rgba(10,14,18,.92)' : 'rgba(10,14,18,.78)'; g.fillRect(128 - tw / 2, 96, tw, 30); if (me) { g.fillStyle = cl; g.fillRect(128 - tw / 2, 123, tw, 3); } g.fillStyle = '#fff'; g.fillText(c.nick, 128, 112); });
    }
    const bodyG = new THREE.CylinderGeometry(.42, .5, 1.25, 10), headG = new THREE.SphereGeometry(.34, 12, 8), ringG = new THREE.RingGeometry(.9, 1.25, 28), gunG = new THREE.BoxGeometry(.14, .14, .95);
    const P3 = {}, MATS = {};
    const matOf = (k, f) => MATS[k] || (MATS[k] = f());
    let alive = true;
    function playerMesh(team, i, side) {
      const s = team === 'a' ? m.a : m.b, c = s.info.e[i].c, cl = side === 'T' ? 0xf2c14e : 0x4aa3ff, g = new THREE.Group();
      const body = new THREE.Mesh(bodyG, matOf('b' + side, () => new THREE.MeshStandardMaterial({ color: side === 'T' ? 0x8a7146 : 0x2f4f76, roughness: .7 }))); body.position.y = .75; body.castShadow = true;
      const head = new THREE.Mesh(headG, matOf('h' + side, () => new THREE.MeshStandardMaterial({ color: side === 'T' ? 0x6d5a3c : 0x2a3f5c, roughness: .6 }))); head.position.y = 1.62; head.castShadow = true;
      const gun = new THREE.Mesh(gunG, matOf('gun', () => new THREE.MeshStandardMaterial({ color: 0x222222, metalness: .6, roughness: .4 }))); gun.position.set(.3, 1.05, .45);
      const fig = new THREE.Group(); fig.add(body, head, gun); g.add(fig);
      const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: cl, transparent: true, opacity: team === 'a' ? .95 : .75, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .24; g.add(ring);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(c, side, team === 'a', PHC[c.id] || null), depthTest: false, transparent: true })); tag.position.y = 4.2; tag.renderOrder = 10; g.add(tag);
      if (PHC[c.id] === undefined) { PHC[c.id] = null; loadPh(rvPhoto(c)).then(im => { PHC[c.id] = im; if (!im || !alive) return; for (const k in P3) if (P3[k].c === c) { const old = P3[k].tag.material.map; P3[k].tag.material.map = tagTex(c, P3[k].side, k[0] === 'a', im); P3[k].tag.material.needsUpdate = true; if (old) old.dispose(); } }); }
      scene.add(g); return { g, fig, ring, tag, c, side, dead: false, ang: 0, last: null };
    }
    const dropP = k => { const p = P3[k]; scene.remove(p.g); p.ring.material.dispose(); if (p.tag.material.map) p.tag.material.map.dispose(); p.tag.material.dispose(); delete P3[k]; };

    /* эффекты */
    const FX = [];
    const dotT = ctex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    const smokeT = ctex(128, 128, (g, w) => { for (let i = 0; i < 26; i++) { const x = 64 + (Math.random() - .5) * 60, y = 64 + (Math.random() - .5) * 60, r = 20 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(235,238,242,.5)'); gr.addColorStop(1, 'rgba(235,238,242,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } });
    /* свет эффектов: постоянный набор из 4 ламп (новые лампы перекомпилируют все шейдеры — отсюда подлагивания), радиус короткий — не светит сквозь стены */
    const flash = new THREE.PointLight(0xffd28a, 0, 6, 2); scene.add(flash);
    const LP = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(l); return { l, own: null, at: 0 }; });
    let lpN = 0; const lamp = (c, x, y, z, dist) => { const q = LP.find(e => !e.own) || LP.slice().sort((a, b) => a.at - b.at)[0], tok = {}; q.own = tok; q.at = ++lpN; q.l.color.set(c); q.l.position.set(x, y, z); q.l.distance = dist; q.l.intensity = 0;
      return { set: v => { if (q.own === tok) q.l.intensity = v; }, off: () => { if (q.own === tok) { q.l.intensity = 0; q.own = null; } } }; };
    const kill = (o3, mats) => { scene.remove(o3); for (const x of mats) x.dispose(); };
    function tracer(a, b, side) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(X(a[0]), 1.15, Z(a[1])), new THREE.Vector3(X(b[0]), 1.1, Z(b[1]))]);
      const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: side === 'T' ? 0xffe39a : 0xb8dcff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(ln);
      const mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: 0xffcc66, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); mf.position.set(X(a[0]), 1.2, Z(a[1])); mf.scale.setScalar(2.4); scene.add(mf);
      flash.position.set(X(a[0]), 1.6, Z(a[1])); flash.intensity = 3;
      FX.push({ t: 0, d: .35, f: k => { ln.material.opacity = 1 - k; mf.material.opacity = 1 - k; mf.scale.setScalar(2.4 * (1 - k * .5)); }, end: () => { kill(ln, [ln.material, geo]); kill(mf, [mf.material]); } });
    }
    function smoke(p, life, tint) {
      const grp = new THREE.Group(); grp.position.set(X(p[0]), 0, Z(p[1])); scene.add(grp); const sp = [];
      for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: tint || 0xdfe3e8, transparent: true, opacity: 0, depthWrite: false })); s.position.set((Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3); grp.add(s); sp.push(s); }
      FX.push({ t: 0, d: life, f: k => sp.forEach((s, i) => { const g = Math.min(1, k * 6); s.scale.setScalar(2 + g * (5.5 + i % 3)); s.material.opacity = Math.min(.85, g) * (k > .8 ? (1 - k) / .2 : 1); }), end: () => kill(grp, sp.map(s => s.material)) });
    }
    function fire(p, life) {
      const grp = new THREE.Group(); grp.position.set(X(p[0]), .3, Z(p[1])); scene.add(grp); const l = lamp(0xff7a1a, X(p[0]), 1.6, Z(p[1]), 7); const sp = [];
      for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: i % 2 ? 0xff7a1a : 0xffc04a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set((Math.random() - .5) * 4, Math.random() * .6, (Math.random() - .5) * 4); grp.add(s); sp.push(s); }
      FX.push({ t: 0, d: life, f: (k, T) => { const a = k > .85 ? (1 - k) / .15 : Math.min(1, k * 8); l.set(2.6 * a * (1 + .3 * Math.sin(T * 30))); sp.forEach((s, i) => { s.scale.setScalar((1.2 + Math.sin(T * 12 + i) * .5) * a + .01); s.position.y = (T * 2 + i * .3) % 1.6; s.material.opacity = a; }); }, end: () => { l.off(); kill(grp, sp.map(s => s.material)); } });
    }
    function flashbang(p) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set(X(p[0]), 2.5, Z(p[1])); scene.add(s); const l = lamp(0xffffff, X(p[0]), 2.6, Z(p[1]), 10);
      FX.push({ t: 0, d: .55, f: k => { const a = k < .15 ? k / .15 : 1 - (k - .15) / .85; s.scale.setScalar(2 + a * 9); s.material.opacity = a; l.set(7 * a); }, end: () => { l.off(); kill(s, [s.material]); } }); }
    let bomb = null, shake = 0;
    const bombMats = [new THREE.MeshStandardMaterial({ color: 0x3a3f2c, roughness: .6 }), new THREE.BoxGeometry(.7, .35, .5), new THREE.SphereGeometry(.12, 8, 6)];
    function clearBomb() { if (bomb) { scene.remove(bomb.g); bomb.led.material.dispose(); bomb = null; } for (const s of ['A', 'B']) sitePl[s].material.emissiveIntensity = .08; }
    function plantBomb(site) { const p = RM.n[site]; if (!p) return; clearBomb(); const g = new THREE.Group(), b = new THREE.Mesh(bombMats[1], bombMats[0]), led = new THREE.Mesh(bombMats[2], new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
      b.position.y = .4; led.position.set(.2, .62, 0); g.add(b, led); g.position.set(X(p[0]) + 1.5, 0, Z(p[1]) - 1.2); scene.add(g); bomb = { g, led, site, t: 0 }; }
    function boom(site) { const p = RM.n[site]; if (!p) return; const geo = new THREE.SphereGeometry(1, 20, 14), s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.set(X(p[0]), 1, Z(p[1])); scene.add(s);
      const l = lamp(0xffa040, X(p[0]), 4, Z(p[1]), 18); l.set(14); clearBomb(); smoke(p, 6, 0x4a4440); shake = 1.4;
      FX.push({ t: 0, d: 1.3, f: k => { s.scale.setScalar(2 + k * 22); s.material.opacity = 1 - k; l.set(14 * (1 - k)); }, end: () => { l.off(); kill(s, [s.material, geo]); } }); }

    /* камера: в подготовке — вся карта, в раунде — за живыми игроками */
    const CAM = { x: 0, z: 0, d: 150, tx: 0, tz: 0, td: 92 };
    let S = null, UT = [], T = 0, vw = 0, vh = 0;
    function fit() { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; if (w === vw && h === vh) return; vw = w; vh = h; R3.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 54 : 38; cam.updateProjectionMatrix(); }
    /* поворот карты: ваш респаун всегда снизу экрана на телефоне (на широком экране — справа): за T — спавн атаки, за CT — спавн защиты.
       После смены сторон карта плавно разворачивается. Пальцами: щипок — ближе/дальше, вращение двумя пальцами, перетаскивание — сдвиг,
       двойной тап (или кнопка «вид») — вернуть вид по вашей стороне. Колесо мыши — зум. */
    const TSd = (() => { const v = [RM.n.TS[0] - 50, RM.n.TS[1] - 50]; return Math.abs(v[0]) > Math.abs(v[1]) ? [Math.sign(v[0]), 0] : [0, Math.sign(v[1])]; })();
    const U = { z: 1, r: 0, px: 0, pz: 0 }, uOn = () => Math.abs(U.z - 1) > .02 || Math.abs(U.r) > .02 || Math.hypot(U.px, U.pz) > .5;
    const mySide = () => OV && OV.m && OV.m.sideA === 'D' ? 'D' : 'A';
    const baseAng = () => { const port = cam.aspect < .8, b = port ? TSd : [-TSd[1], TSd[0]], f = mySide() === 'D' ? -1 : 1; return Math.atan2(b[1] * f, b[0] * f); };
    CAM.a = null; CAM.dn = TSd;
    const rbtn = document.createElement('button'); rbtn.type = 'button'; rbtn.className = 'm3-reset'; rbtn.setAttribute('aria-label', 'Вернуть вид по вашей стороне'); rbtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 17-7-4-7 4Z"/></svg><span>вид</span>';
    (cv.parentNode || document.body).appendChild(rbtn);
    const uReset = () => { U.z = 1; U.r = 0; U.px = 0; U.pz = 0; rbtn.classList.remove('on'); };
    rbtn.addEventListener('click', e => { e.stopPropagation(); uReset(); });
    const PT = new Map(); let g0 = null, lastTap = 0;
    const gesture = () => { const a = [...PT.values()]; if (a.length < 2) return null; const [p, q] = a; return { d: Math.hypot(q.x - p.x, q.y - p.y), a: Math.atan2(q.y - p.y, q.x - p.x) }; };
    const onDown = e => { try { cv.setPointerCapture(e.pointerId); } catch (x) { /* указатель уже отпущен */ } PT.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }); g0 = gesture(); };
    const onMove = e => { const p = PT.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (PT.size >= 2) { const g = gesture(); if (g && g0) { if (g.d > 10 && g0.d > 10) U.z = clamp(U.z * g0.d / g.d, .45, 2.2); let da = g.a - g0.a; da = Math.atan2(Math.sin(da), Math.cos(da)); U.r -= da; } g0 = g; }
      else { const k = 2 * Math.tan(cam.fov * Math.PI / 360) * CAM.d / (vh || 1), dn = CAM.dn, rt = [dn[1], -dn[0]]; U.px = clamp(U.px - (rt[0] * dx + dn[0] * dy) * k, -70, 70); U.pz = clamp(U.pz - (rt[1] * dx + dn[1] * dy) * k, -70, 70); }
      rbtn.classList.toggle('on', uOn()); };
    const onUp = e => { const p = PT.get(e.pointerId); PT.delete(e.pointerId); g0 = gesture();
      if (p && PT.size === 0 && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 10) { const now = performance.now(); if (now - lastTap < 320) { uReset(); lastTap = 0; } else lastTap = now; } };
    const onWheel = e => { e.preventDefault(); U.z = clamp(U.z * Math.exp(e.deltaY * .0012), .45, 2.2); rbtn.classList.toggle('on', uOn()); };
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('wheel', onWheel, { passive: false });
    const NB = Object.keys(RM.n).map(k => [X(RM.n[k][0]), Z(RM.n[k][1]), GEO.nr[k] || 4]);
    function camFrame(dt, t, ph) {
      const port = cam.aspect < .8, tA = baseAng() + U.r; if (CAM.a == null) CAM.a = tA; else { let da = tA - CAM.a; da = Math.atan2(Math.sin(da), Math.cos(da)); CAM.a += da * (1 - Math.exp(-(PT.size ? 30 : 2.2) * dt)); }
      const dn = CAM.dn = [Math.cos(CAM.a), Math.sin(CAM.a)], rt = [dn[1], -dn[0]], tanH = Math.tan(cam.fov * Math.PI / 360);
      for (const g of siteG) g.rotation.y = Math.atan2(dn[0], dn[1]);
      const box = P => { let h0 = 1e9, h1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z, r] of P) { const h = x * rt[0] + z * rt[1], v = x * dn[0] + z * dn[1]; h0 = Math.min(h0, h - r); h1 = Math.max(h1, h + r); v0 = Math.min(v0, v - r); v1 = Math.max(v1, v + r); } return [h0, h1, v0, v1]; };
      /* расстояние, при котором рамка влезает в видимую часть экрана (сверху табло, снизу составы или план) */
      const need = (eh, ev, fv) => Math.max(eh * (port ? .8 : .95) / (2 * tanH * cam.aspect), ev * Math.sin(.95) / (2 * tanH * fv)) * 1.04;
      let b = null, fv = .62, sh = .06;
      if (ph === 'round' && S) { const al = S.dots.filter(d => d.dt == null || t < d.dt).map(d => { const p = rdPos(d, t); return [X(p[0]), Z(p[1]), 6]; }); if (al.length) b = box(al); fv = .66; sh = .02; }
      if (!b) { b = box(NB); if (ph === 'buy') { fv = port ? .6 : .6; sh = .1; } }
      const hc = (b[0] + b[1]) / 2, vc = (b[2] + b[3]) / 2, ev = b[3] - b[2];
      CAM.td = Math.max(ph === 'round' ? 52 : 60, need(b[1] - b[0], ev, fv)); const vsh = ev * sh + CAM.td * .0;
      CAM.tx = rt[0] * hc + dn[0] * (vc + vsh) + U.px; CAM.tz = rt[1] * hc + dn[1] * (vc + vsh) + U.pz;
      CAM.td = clamp(Math.min(CAM.td, 175) * U.z, 26, 230);
      CAM.x = damp(CAM.x, CAM.tx, 1.6, dt); CAM.z = damp(CAM.z, CAM.tz, 1.6, dt); CAM.d = damp(CAM.d, CAM.td, 1.3, dt);
      const tilt = .95, sx = shake > 0 ? (Math.random() - .5) * shake : 0, sw = Math.sin(T * .12) * 1.5 + sx; shake = Math.max(0, shake - dt * 2);
      cam.position.set(CAM.x + rt[0] * sw + dn[0] * CAM.d * Math.cos(tilt), CAM.d * Math.sin(tilt), CAM.z + rt[1] * sw + dn[1] * CAM.d * Math.cos(tilt)); cam.lookAt(CAM.x, 0, CAM.z);
      scene.fog.near = CAM.d * .95; scene.fog.far = CAM.d * 2.6;
    }

    /* новый расклад игроков (подготовка или раунд); в раунде — гранаты по плану атаки */
    function teams(S0) {
      S = S0; for (const k in P3) dropP(k); S.dots.forEach(d => { P3[d.team + d.i] = playerMesh(d.team, d.i, d.side); });
      UT = []; clearBomb();
      const L = LV && LV.ph === 'round' ? LV.last : null;
      /* гранаты из постановки раунда: дым, молотов, флешки */
      if (L) UT = (S.ut || []).filter(u => u.t >= (LV.rt || 0) - .01).map(u => ({ t: u.t, f: () => u.k === 'smoke' ? smoke(u.p, 9) : u.k === 'fire' ? fire(u.p, 4.5) : flashbang(u.p) }));
      planClear();
      for (const d of S.dots) { const p = P3[d.team + d.i], q = rdPos(d, 0); p.g.position.set(X(q[0]), 0, Z(q[1])); p.last = q; }
    }
    function ev(e) {
      if (!S) return;
      if (e.type === 'kill') { const kd = S.dots.find(d => d.team === (e.k.byA ? 'a' : 'b') && d.i === e.k.k), vd = S.dots.find(d => d.team === (e.k.byA ? 'b' : 'a') && d.i === e.k.v); if (kd && vd) tracer(rdPos(kd, e.t), rdPos(vd, e.t), kd.side); }
      else if (e.type === 'plant') plantBomb(e.site || S.site);
      else if (e.type === 'boom') boom(e.site || S.site);
      else if (e.type === 'defuse' && bomb) { bomb.led.material.color.set(0x4aa3ff); bomb.def = true; }
    }
    /* кадр: t — время раунда (с), dt — реальное время кадра (0 на паузе) */
    function frame(t, dt, ph, spd) {
      if (!alive) return; fit(); T += dt;
      if (ph === 'round') while (UT.length && UT[0].t <= t) UT.shift().f();
      if (S) for (const d of S.dots) { const p = P3[d.team + d.i]; if (!p) continue; const q = rdPos(d, t), dx = q[0] - (p.last ? p.last[0] : q[0]), dz = q[1] - (p.last ? p.last[1] : q[1]), mv = Math.hypot(dx, dz) > .005; p.g.position.set(X(q[0]), 0, Z(q[1]));
        const lk = !p.dead && rdLook(d, t); if (lk && (lk.f || !mv)) p.ang = Math.atan2(lk.p[0] - q[0], lk.p[1] - q[1]); else if (mv) p.ang = Math.atan2(dx, dz);
        let da = p.ang - p.fig.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); p.fig.rotation.y += da * (1 - Math.exp(-12 * dt)); p.last = q;
        const dead = d.dt != null && t >= d.dt; if (dead && !p.dead) { p.dead = true; p.ring.material.color.set(0x555555); p.tag.material.opacity = .45; }
        if (p.dead) { p.fig.rotation.x = damp(p.fig.rotation.x, -Math.PI / 2, 9, dt); p.fig.position.y = damp(p.fig.position.y, .35, 9, dt); }
        else p.fig.position.y = mv ? Math.abs(Math.sin(T * 9 + d.i)) * .08 : 0;
        const ds = cam.position.distanceTo(p.g.position), sc = ds * (MOB ? .085 : .06); p.tag.scale.set(sc, sc / 2, 1); p.tag.position.y = 2.4 + sc * .25; p.ring.scale.setScalar(Math.max(1, ds / 55)); }
      if (bomb) { bomb.t += dt * (ph === 'round' ? spd : 1); const bl = bomb.def ? .6 : (Math.sin(bomb.t * (6 + bomb.t * .8)) > 0 ? 1 : .1); bomb.led.material.color.set(bomb.def ? 0x4aa3ff : 0xff2a1a).multiplyScalar(bl + .2); const em = sitePl[bomb.site].material; em.emissive.set(bomb.def ? 0x3a8cff : 0xff3030); em.emissiveIntensity = .08 + bl * .5; }
      flash.intensity = Math.max(0, flash.intensity - dt * 40);
      for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt * (ph === 'round' ? spd : 1); const k = Math.min(1, f.t / f.d); f.f(k, T); if (k >= 1) { f.end(); FX.splice(i, 1); } }
      camFrame(Math.min(.05, dt || 0) || 0, t, ph);
      R3.render(scene, cam);
    }
    function dispose() {
      alive = false; cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('wheel', onWheel); rbtn.remove();
      scene.traverse(x => { if (x.geometry) x.geometry.dispose(); const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : []; for (const mt of ms) { if (mt.map) mt.map.dispose(); mt.dispose(); } });
      for (const t of TEX) t.dispose(); for (const x of bombMats) x.dispose(); planMat.T.dispose(); planMat.CT.dispose();
      R3.dispose(); try { R3.forceContextLoss(); } catch (e) { /* не поддерживается */ }
    }
    /* план своей команды на земле до начала раунда: маршруты (атака) или позиции (защита) */
    const PL = new THREE.Group(); scene.add(PL);
    const planMat = { T: new THREE.MeshBasicMaterial({ color: 0xffd35a, transparent: true, opacity: .85, depthWrite: false }), CT: new THREE.MeshBasicMaterial({ color: 0x59b2ff, transparent: true, opacity: .85, depthWrite: false }) };
    function planClear() { for (const c of PL.children.slice()) { PL.remove(c); c.geometry.dispose(); } }
    function plan(sideA, pl) {
      planClear(); if (!pl) return; const fake = { sideA, plan: pl, planB: { dir: 'S', tempo: 'norm' }, kills: [], end: 'elim', round: m.round || 1 }, S0 = rdScript(fake, MAPN), atk = sideA === 'A', mt = planMat[atk ? 'T' : 'CT'];
      const seg = (a, b, w) => { const L = rdD(a, b); if (L < .2) return; const g2 = new THREE.PlaneGeometry(L, w), me = new THREE.Mesh(g2, mt); me.rotation.x = -Math.PI / 2; me.rotation.z = -Math.atan2(b[1] - a[1], b[0] - a[0]); me.position.set(X((a[0] + b[0]) / 2), .2, Z((a[1] + b[1]) / 2)); me.renderOrder = 3; PL.add(me); };
      const dotM = (p, r) => { const g2 = new THREE.CircleGeometry(r, 20), me = new THREE.Mesh(g2, mt); me.rotation.x = -Math.PI / 2; me.position.set(X(p[0]), .21, Z(p[1])); me.renderOrder = 3; PL.add(me); };
      const site = pl.dir === 'A' || pl.dir === 'B' ? pl.dir : null;
      for (const d of S0.dots.filter(x => x.team === 'a')) { const upTo = atk ? (site ? 1e9 : d.stArr + .01) : d.postT + .01, w = d.wp.filter(x => x[0] <= upTo).map(x => [x[1], x[2]]);
        /* пунктир: отрезки по 1.6 с промежутком 1.1 */
        let carry = 0; for (let i = 1; i < w.length; i++) { const a = w[i - 1], b = w[i], L = rdD(a, b); let s0 = carry; while (s0 < L) { const s1 = Math.min(L, s0 + 1.6), k0 = s0 / L, k1 = s1 / L; seg([a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0], [a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1], d.lurk ? .35 : .55); s0 = s1 + 1.1; } carry = s0 - L; }
        if (w.length) dotM(w[w.length - 1], atk ? .8 : 1.3); }
      if (atk && site) { const c = RM.n[site], g2 = new THREE.RingGeometry(10, 10.8, 48), me = new THREE.Mesh(g2, mt); me.rotation.x = -Math.PI / 2; me.position.set(X(c[0]), .22, Z(c[1])); PL.add(me); }
    }
    fit(); R3.render(scene, cam);
    return { teams, ev, frame, dispose, plan };
  }
  return { make };
})();

/* ---------- Экран матча в 3D: те же табло, составы и кнопки, что и в 2D, поверх 3D-сцены ---------- */
function m3Build() {
  const m = OV.m; m3Stop(); OV.st = 'live';
  $('#mt').innerHTML = `<div class="lv m3"><canvas class="m3-gl" id="m3gl" aria-label="Карта ${esc(m.map.n)}, вид сверху"></canvas>
    <div class="m3-hud">
      <div class="lv-top"><div class="lv-tm" id="tA"><b>Вы</b><span id="monA"></span></div><div class="lv-sc"><b id="scA">0</b><div><span id="rn"></span><span class="lv-map">${esc(m.map.n)} <i>LIVE</i></span></div><b id="scB">0</b></div><div class="lv-tm r" id="tB"><b>${esc(m.b.name)}</b><span id="monB"></span></div></div>
      <div class="hist" id="hist"></div>
      <div class="lv-team op" id="rowB">${[0, 1, 2, 3, 4].map(i => plH(m, 'b', i)).join('')}</div>
      <div class="rd-clock" id="rdc"></div>
      <div class="m3-sp"></div>
      <div class="lv-team mine" id="rowA">${[0, 1, 2, 3, 4].map(i => plH(m, 'a', i)).join('')}</div>
      <div class="lv-ctl" id="mbtn"></div>
    </div>
    <div class="feed" id="feed" aria-live="off"></div><div id="bn"></div>
    <div class="lv-intro" id="intro"><small>Добро пожаловать на</small><b>${esc(m.map.n)}</b></div>
    <div class="lv-prep" id="prep"></div></div>`;
  M3C = M3D.make($('#m3gl'), m);
  LV = { ph: 'buy', t: 0, T: 1, q: [], paused: false, last: null, ts: 0, spd: LV && LV.spd || 1, cam: { x: 50, y: 50, z: 1 }, kd: null, kc: { A: [0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0] }, d3: 1 };
  warmStart(W_3D); requestAnimationFrame(lvTick);
}
/* 3D, если браузер умеет WebGL; иначе — 2D-карта */
function liveGo() {
  if (m3Ok()) { try { m3Build(); return; } catch (e) { m3Ok.bad = true; m3Stop(); } }
  liveBuild();
}

/* ---------- Быстрый план: тактики стороны листаются вбок, одно нажатие — раунд пошёл ----------
   Тактики и их взаимные плюсы — TK в core.js. Показываются только доступные при текущей закупке (data-v — номер в полном списке). */
const QP = { A: TK_T.map(k => Object.assign({ k }, TK[k])), D: TK_CT.map(k => Object.assign({ k }, TK[k])) };
const qpCan = (m, k) => !!AC[k] && m.a.hand.includes(k) && m.canPlay(m.a, [k]);
const qpBuy = m => m.decider ? 'full' : m.buyOf(m.a, [], OV.plan.buy);
const qpAvail = m => QP[m.sideA].map((p, i) => i).filter(i => tkOk(QP[m.sideA][i].k, qpBuy(m)));
/* совет: то, что бьёт прошлую тактику соперника на этой стороне; после победы — повторить свою; иначе — дефолт/ровно */
function qpRec(m) {
  const L = QP[m.sideA], av = qpAvail(m), h = m.hist.filter(x => x.side === m.sideA).slice(-1)[0], ix = k => L.findIndex(p => p.k === k);
  if (h && h.tkB) { const c = av.filter(i => L[i].bt.includes(h.tkB)); if (c.length) return c[0]; }
  if (h && h.win && h.tkA && av.includes(ix(h.tkA))) return ix(h.tkA);
  const d = ix(m.sideA === 'A' ? 'deflt' : 'even'); return av.includes(d) ? d : av[0];
}
function qpApply(i) { const m = OV.m, p = QP[m.sideA][i]; if (!p) return; OV.plan.dir = p.dir; OV.plan.tempo = p.tempo; OV.plan.tk = p.k; OV.sel = qpCan(m, p.card) ? [p.card] : []; }
const qpNames = ks => ks.slice(0, 2).map(k => TK[k] ? TK[k].n : '').join(', ');
function qpDraw(el) {
  const m = OV.m, L = QP[m.sideA], ri = LV.qr = qpRec(m), atk = m.sideA === 'A', av = qpAvail(m);
  const kind = m.decider ? 'решающий' : m.isPistol() ? 'пистолетный' : (BUY[qpBuy(m)] || BUY.eco).n.toLowerCase();
  const order = [ri, ...av.filter(i => i !== ri)];
  el.className = 'lv-prep on qp';
  el.innerHTML = `<div class="pp-h"><div><small class="eyebrow">${atk ? 'Атака · T' : 'Защита · CT'} · раунд ${m.round} · ${kind}</small><b>Выберите тактику <span class="qp-n">${av.length}</span></b></div><div class="qp-ring" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" id="qpg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg><span id="qpt"></span></div></div>
    <div class="qp-cards" role="list">${order.map(i => { const p = L[i]; return `<button class="qp-c ${i === ri ? 'rec' : ''}" role="listitem" data-act="qp" data-v="${i}" style="--ac:${p.ac}">${i === ri ? '<span class="qp-r">совет</span>' : ''}<span class="qp-i">${p.ic}</span><b>${p.n}</b><small>${p.d}</small>${p.bt.length ? `<span class="qp-t up">бьёт: ${esc(qpNames(p.bt))}</span>` : ''}${p.ls.length ? `<span class="qp-t dn">слабо: ${esc(qpNames(p.ls))}</span>` : ''}${qpCan(m, p.card) ? `<em>+ ${esc(AC[p.card].n)}</em>` : ''}</button>`; }).join('')}</div>
    <div class="qp-f"><span>Деньги <b>$${nf(m.a.money)}</b> · приказы ${m.a.en}/8</span><span class="qp-sw">листайте →</span></div>`;
  qpTick();
}
function qpTick() {
  const g = $('#qpg'), n = $('#qpt'); if (!g || !LV) return; const k = clamp(LV.t / (LV.T || 1), 0, 1), s = String(Math.ceil(Math.max(0, LV.t) / 1000));
  g.setAttribute('stroke-dashoffset', (100.5 * (1 - k)).toFixed(1)); if (n.textContent !== s) n.textContent = s;
}
