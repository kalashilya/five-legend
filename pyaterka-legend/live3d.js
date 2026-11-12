/* ---------- Матч в 3D (Three.js): город по графу карты, игроки с фото, трассеры, дым, молотов, бомба ----------
   Ход матча считает движок (OV.m), сцена только показывает раунд. Табло, составы, лента, подготовка к раунду
   и все кнопки — общие с 2D-матчем (live.js). Нет WebGL — играем в 2D (liveBuild). */
const m3Ok = () => { if (m3Ok.v === undefined) { try { const c = document.createElement('canvas'); m3Ok.v = !!(window.THREE && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { m3Ok.v = false; } } return m3Ok.v && !m3Ok.bad; };
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
    const SM = MOB ? 1536 : 2048; sun.shadow.mapSize.set(SM, SM); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 220 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
    const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = R3.capabilities.getMaxAnisotropy(); TEX.push(t); return t; };
    let seed = 0; for (const ch of MAPN) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const RM = rdMap(MAPN), W = 8.6, X = u => u - 50, Z = v => v - 50;
    const SEG = RM.e.map(([a, b]) => [RM.n[a], RM.n[b]]);
    const dist = p => Math.min(...SEG.map(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }));

    /* земля */
    const groundT = ctex(1024, 1024, (g, w) => { g.fillStyle = TH.g; g.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? TH.g2 : 'rgba(255,255,255,.06)'; g.globalAlpha = .3; const r = Math.random() * 6; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, r, 0, 7); g.fill(); } g.globalAlpha = 1; });
    groundT.wrapS = groundT.wrapT = THREE.RepeatWrapping; groundT.repeat.set(3, 3);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: groundT, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    /* улицы: бордюр + покрытие, круглые стыки */
    const stT = ctex(256, 256, (g, w) => { g.fillStyle = '#7a756b'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 90 + Math.random() * 60 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 3, 2 + Math.random() * 3); } g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let y = 0; y < w; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    stT.wrapS = stT.wrapT = THREE.RepeatWrapping;
    const stMat = new THREE.MeshStandardMaterial({ map: stT, color: new THREE.Color(TH.st).multiplyScalar(.78), roughness: .95 }), curbMat = new THREE.MeshStandardMaterial({ color: TH.curb, roughness: .9 });
    const road = (wd, y, mat) => { for (const [a, b] of SEG) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const r = new THREE.Mesh(new THREE.BoxGeometry(L, .12, wd), mat); r.position.set(X((a[0] + b[0]) / 2), y, Z((a[1] + b[1]) / 2)); r.rotation.y = -Math.atan2(dy, dx); r.receiveShadow = true; scene.add(r); }
      for (const k in RM.n) { const p = RM.n[k], c = new THREE.Mesh(new THREE.CylinderGeometry(wd / 2, wd / 2, .12, 24), mat); c.position.set(X(p[0]), y, Z(p[1])); c.receiveShadow = true; scene.add(c); } };
    road(W + 1.4, .04, curbMat); road(W, .1, stMat);
    /* дома: инстансы коробок с крышами, детали на крышах */
    const lots = [];
    for (let y = -14; y < 114; y += 4.4) for (let x = -14; x < 114; x += 4.4) { const cx = x + rnd() * 1.4, cy = y + rnd() * 1.4, w = 3.2 + rnd() * 1.6, d = 3.2 + rnd() * 1.6; if (dist([cx + w / 2, cy + d / 2]) < W / 2 + 2.6 + Math.max(w, d) * .25) continue; const edge = Math.max(Math.abs(cx - 50), Math.abs(cy - 50)) > 56; if (edge && rnd() < .5) continue; if (rnd() < .07) continue;
      const near = dist([cx + w / 2, cy + d / 2]); lots.push({ x: cx, y: cy, w, d, h: (near < 12 ? 3.2 : 4.5) + rnd() * (near < 12 ? 3.4 : 6) }); }
    const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, .5, 0);
    const bodies = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .88, metalness: 0 }), lots.length), roofs = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ roughness: .9 }), lots.length);
    const det = [], o = new THREE.Object3D(), col = new THREE.Color();
    lots.forEach((L, i) => { o.position.set(X(L.x + L.w / 2), 0, Z(L.y + L.d / 2)); o.scale.set(L.w, L.h, L.d); o.rotation.set(0, 0, 0); o.updateMatrix(); bodies.setMatrixAt(i, o.matrix); bodies.setColorAt(i, col.setHex(TH.wall).multiplyScalar(.85 + rnd() * .2));
      o.position.y = L.h; o.scale.set(L.w * .96, .25, L.d * .96); o.updateMatrix(); roofs.setMatrixAt(i, o.matrix); roofs.setColorAt(i, col.setHex(TH.roof[(rnd() * TH.roof.length) | 0]));
      const q = rnd(); if (q < .35) det.push({ k: 'ac', x: L.x + L.w * (.25 + rnd() * .4), y: L.y + L.d * (.25 + rnd() * .4), h: L.h + .25 }); else if (q < .43 && RD_MAP_THEME[MAPN] !== 'ancient') det.push({ k: 'dome', x: L.x + L.w / 2, y: L.y + L.d / 2, h: L.h + .25, r: Math.min(L.w, L.d) * .34 }); });
    for (const b of [bodies, roofs]) { b.castShadow = b.receiveShadow = true; if (b.instanceColor) b.instanceColor.needsUpdate = true; scene.add(b); }
    { const acs = det.filter(d => d.k === 'ac'), dms = det.filter(d => d.k === 'dome');
      const a = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: .6, metalness: .3 }), acs.length); acs.forEach((d, i) => { o.position.set(X(d.x), d.h, Z(d.y)); o.scale.set(.9, .6, .7); o.updateMatrix(); a.setMatrixAt(i, o.matrix); }); a.castShadow = true; scene.add(a);
      const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: TH.dome, roughness: .35, metalness: .5 }), dms.length); dms.forEach((d, i) => { o.position.set(X(d.x), d.h, Z(d.y)); o.scale.setScalar(d.r); o.updateMatrix(); dm.setMatrixAt(i, o.matrix); }); dm.castShadow = true; scene.add(dm); }
    /* ящики и деревья у дорог */
    { const cr = [], tr = []; for (let i = 0; i < 260; i++) { const p = [rnd() * 100, rnd() * 100], d = dist(p); if (d > W / 2 - 1.8 && d < W / 2 - .5 && cr.length < 55) cr.push(p); else if (d > W / 2 + .4 && d < W / 2 + 2.2 && tr.length < 40 && rnd() < .5) tr.push(p); }
      const cm = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0x8b6a3f, roughness: .85 }), cr.length); cr.forEach((p, i) => { const s = 1.2 + rnd() * .5; o.position.set(X(p[0]), .1, Z(p[1])); o.scale.set(s, s * (rnd() < .3 ? 2 : 1), s); o.rotation.y = rnd(); o.updateMatrix(); cm.setMatrixAt(i, o.matrix); }); cm.castShadow = cm.receiveShadow = true; scene.add(cm);
      const tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: TH.tree, roughness: .9, flatShading: true }), tr.length), trunk = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({ color: 0x6b4b2a }), tr.length);
      tr.forEach((p, i) => { o.rotation.set(0, rnd() * 3, 0); o.position.set(X(p[0]), 3.2, Z(p[1])); o.scale.set(1.3, .9, 1.3); o.updateMatrix(); tm.setMatrixAt(i, o.matrix); o.position.y = 0; o.scale.set(.3, 3, .3); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix); }); tm.castShadow = trunk.castShadow = true; scene.add(tm, trunk); }
    /* точки A/B и респауны */
    const siteT = s => ctex(256, 256, (g, w) => { g.fillStyle = '#c4252b'; g.fillRect(0, 0, w, w); g.strokeStyle = '#fff'; g.lineWidth = 12; g.strokeRect(10, 10, w - 20, w - 20); g.fillStyle = '#fff'; g.font = '700 190px Oswald, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, w / 2 + 10); });
    const siteLight = {};
    for (const s of ['A', 'B']) { const p = RM.n[s], pl = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), new THREE.MeshStandardMaterial({ map: siteT(s), roughness: .6, emissive: 0xff3030, emissiveIntensity: .08 })); pl.rotation.x = -Math.PI / 2; pl.position.set(X(p[0]), .2, Z(p[1])); pl.receiveShadow = true; scene.add(pl);
      const l = new THREE.PointLight(0xff3b30, 0, 20, 2); l.position.set(X(p[0]), 3, Z(p[1])); scene.add(l); siteLight[s] = l; }
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
    const flash = new THREE.PointLight(0xffd28a, 0, 14, 2); scene.add(flash);
    const kill = (o3, mats) => { scene.remove(o3); for (const x of mats) x.dispose(); };
    function tracer(a, b, side) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(X(a[0]), 1.15, Z(a[1])), new THREE.Vector3(X(b[0]), 1.1, Z(b[1]))]);
      const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: side === 'T' ? 0xffe39a : 0xb8dcff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(ln);
      const mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: 0xffcc66, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); mf.position.set(X(a[0]), 1.2, Z(a[1])); mf.scale.setScalar(2.4); scene.add(mf);
      flash.position.set(X(a[0]), 2, Z(a[1])); flash.intensity = 6;
      FX.push({ t: 0, d: .35, f: k => { ln.material.opacity = 1 - k; mf.material.opacity = 1 - k; mf.scale.setScalar(2.4 * (1 - k * .5)); }, end: () => { kill(ln, [ln.material, geo]); kill(mf, [mf.material]); } });
    }
    function smoke(p, life, tint) {
      const grp = new THREE.Group(); grp.position.set(X(p[0]), 0, Z(p[1])); scene.add(grp); const sp = [];
      for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: tint || 0xdfe3e8, transparent: true, opacity: 0, depthWrite: false })); s.position.set((Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3); grp.add(s); sp.push(s); }
      FX.push({ t: 0, d: life, f: k => sp.forEach((s, i) => { const g = Math.min(1, k * 6); s.scale.setScalar(2 + g * (5.5 + i % 3)); s.material.opacity = Math.min(.85, g) * (k > .8 ? (1 - k) / .2 : 1); }), end: () => kill(grp, sp.map(s => s.material)) });
    }
    function fire(p, life) {
      const grp = new THREE.Group(); grp.position.set(X(p[0]), .3, Z(p[1])); scene.add(grp); const l = new THREE.PointLight(0xff7a1a, 0, 12, 2); l.position.y = 1.5; grp.add(l); const sp = [];
      for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotT, color: i % 2 ? 0xff7a1a : 0xffc04a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set((Math.random() - .5) * 4, Math.random() * .6, (Math.random() - .5) * 4); grp.add(s); sp.push(s); }
      FX.push({ t: 0, d: life, f: (k, T) => { const a = k > .85 ? (1 - k) / .15 : Math.min(1, k * 8); l.intensity = 4 * a * (1 + .3 * Math.sin(T * 30)); sp.forEach((s, i) => { s.scale.setScalar((1.2 + Math.sin(T * 12 + i) * .5) * a + .01); s.position.y = (T * 2 + i * .3) % 1.6; s.material.opacity = a; }); }, end: () => kill(grp, sp.map(s => s.material)) });
    }
    let bomb = null, shake = 0;
    const bombMats = [new THREE.MeshStandardMaterial({ color: 0x3a3f2c, roughness: .6 }), new THREE.BoxGeometry(.7, .35, .5), new THREE.SphereGeometry(.12, 8, 6)];
    function clearBomb() { if (bomb) { scene.remove(bomb.g); bomb.led.material.dispose(); bomb = null; } for (const s of ['A', 'B']) siteLight[s].intensity = 0; }
    function plantBomb(site) { const p = RM.n[site]; if (!p) return; clearBomb(); const g = new THREE.Group(), b = new THREE.Mesh(bombMats[1], bombMats[0]), led = new THREE.Mesh(bombMats[2], new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
      b.position.y = .4; led.position.set(.2, .62, 0); g.add(b, led); g.position.set(X(p[0]) + 1.5, 0, Z(p[1]) - 1.2); scene.add(g); bomb = { g, led, site, t: 0 }; }
    function boom(site) { const p = RM.n[site]; if (!p) return; const geo = new THREE.SphereGeometry(1, 20, 14), s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.set(X(p[0]), 1, Z(p[1])); scene.add(s);
      const l = new THREE.PointLight(0xffa040, 30, 60, 2); l.position.set(X(p[0]), 6, Z(p[1])); scene.add(l); clearBomb(); smoke(p, 6, 0x4a4440); shake = 1.4;
      FX.push({ t: 0, d: 1.3, f: k => { s.scale.setScalar(2 + k * 22); s.material.opacity = 1 - k; l.intensity = 30 * (1 - k); }, end: () => { kill(s, [s.material, geo]); scene.remove(l); } }); }

    /* камера: в подготовке — вся карта, в раунде — за живыми игроками */
    const CAM = { x: 0, z: 30, d: 140, tx: 0, tz: 8, td: 92 };
    let S = null, UT = [], T = 0, vw = 0, vh = 0;
    function fit() { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; if (w === vw && h === vh) return; vw = w; vh = h; R3.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 46 : 36; cam.updateProjectionMatrix(); }
    function camFrame(dt, t, ph) {
      const pr = cam.aspect < .8 ? 1.55 : 1;
      if (ph === 'round' && S) { const al = S.dots.filter(d => d.dt == null || t < d.dt).map(d => rdPos(d, t)); if (al.length) { const xs = al.map(p => X(p[0])), zs = al.map(p => Z(p[1])), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
        CAM.tx = (x0 + x1) / 2; CAM.tz = (z0 + z1) / 2 + 4; CAM.td = Math.max(50, Math.max((x1 - x0) * pr * .9, (z1 - z0)) * 1.25 + 30); } }
      else { CAM.tx = 0; CAM.tz = 8; CAM.td = 92 * pr * .86; }
      CAM.x = damp(CAM.x, CAM.tx, 1.6, dt); CAM.z = damp(CAM.z, CAM.tz, 1.6, dt); CAM.d = damp(CAM.d, CAM.td, 1.3, dt);
      const tilt = .95, sx = shake > 0 ? (Math.random() - .5) * shake : 0; shake = Math.max(0, shake - dt * 2);
      cam.position.set(CAM.x + sx + Math.sin(T * .12) * 1.5, CAM.d * Math.sin(tilt), CAM.z + CAM.d * Math.cos(tilt)); cam.lookAt(CAM.x, 0, CAM.z);
      sun.target.position.set(CAM.x, 0, CAM.z); sun.position.set(CAM.x - 62, 46, CAM.z + 30); sun.target.updateMatrixWorld();
    }

    /* новый расклад игроков (подготовка или раунд); в раунде — гранаты по плану атаки */
    function teams(S0) {
      S = S0; for (const k in P3) dropP(k); S.dots.forEach(d => { P3[d.team + d.i] = playerMesh(d.team, d.i, d.side); });
      UT = []; clearBomb();
      const L = LV && LV.ph === 'round' ? LV.last : null, site = S.site;
      if (L && RM.tr[site] && RM.n[site]) {
        const at = L.sideA === 'A' ? L.plan : L.planB, path = rdPts(RM, RM.tr[site][0]), entry = path[path.length - 2] || path[0], sp = RM.n[site];
        UT = [{ t: S.tc - .6, f: () => smoke([lerp(entry[0], sp[0], .55), lerp(entry[1], sp[1], .55)], 9) }, { t: S.tc + .4, f: () => fire([lerp(entry[0], sp[0], .3), lerp(entry[1], sp[1], .3)], 4.5) }];
        if (at && at.dir === 'S' && RM.tr.M) UT.push({ t: S.tc - 1.2, f: () => smoke(RM.n[RM.tr.M[RM.tr.M.length - 1]], 8) });
        UT.sort((a, b) => a.t - b.t);
      }
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
        if (mv) p.ang = Math.atan2(dx, dz); p.fig.rotation.y = damp(p.fig.rotation.y, p.ang, 10, dt); p.last = q;
        const dead = d.dt != null && t >= d.dt; if (dead && !p.dead) { p.dead = true; p.ring.material.color.set(0x555555); p.tag.material.opacity = .45; }
        if (p.dead) { p.fig.rotation.x = damp(p.fig.rotation.x, -Math.PI / 2, 9, dt); p.fig.position.y = damp(p.fig.position.y, .35, 9, dt); }
        else p.fig.position.y = mv ? Math.abs(Math.sin(T * 9 + d.i)) * .08 : 0;
        const ds = cam.position.distanceTo(p.g.position), sc = ds * (MOB ? .085 : .06); p.tag.scale.set(sc, sc / 2, 1); p.tag.position.y = 2.4 + sc * .25; p.ring.scale.setScalar(Math.max(1, ds / 55)); }
      if (bomb) { bomb.t += dt * (ph === 'round' ? spd : 1); const bl = bomb.def ? .6 : (Math.sin(bomb.t * (6 + bomb.t * .8)) > 0 ? 1 : .1); bomb.led.material.color.set(bomb.def ? 0x4aa3ff : 0xff2a1a).multiplyScalar(bl + .2); siteLight[bomb.site].color.set(bomb.def ? 0x4aa3ff : 0xff3b30); siteLight[bomb.site].intensity = bl * 5; }
      flash.intensity = Math.max(0, flash.intensity - dt * 40);
      for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt * (ph === 'round' ? spd : 1); const k = Math.min(1, f.t / f.d); f.f(k, T); if (k >= 1) { f.end(); FX.splice(i, 1); } }
      camFrame(Math.min(.05, dt || 0) || 0, t, ph);
      R3.render(scene, cam);
    }
    function dispose() {
      alive = false;
      scene.traverse(x => { if (x.geometry) x.geometry.dispose(); const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : []; for (const mt of ms) { if (mt.map) mt.map.dispose(); mt.dispose(); } });
      for (const t of TEX) t.dispose(); for (const x of bombMats) x.dispose();
      R3.dispose(); try { R3.forceContextLoss(); } catch (e) { /* не поддерживается */ }
    }
    fit(); R3.render(scene, cam);
    return { teams, ev, frame, dispose };
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
  setTimeout(() => { const n = $('#intro'); if (n) n.classList.add('out'); }, 2300);
  lvBuy(true); requestAnimationFrame(lvTick);
}
/* 3D, если браузер умеет WebGL; иначе — 2D-карта */
function liveGo() {
  if (m3Ok()) { try { m3Build(); return; } catch (e) { m3Ok.bad = true; m3Stop(); } }
  liveBuild();
}

/* ---------- Быстрый план: три карточки, одно нажатие — раунд пошёл; «Тонкая настройка» — полная подготовка ---------- */
const QP = {
  A: [{ n: 'Раш B', d: 'Быстро всей командой на B', ic: 'B', dir: 'B', tempo: 'fast', card: 'tempo', ac: '#ff8a3d' }, { n: 'Дефолт', d: 'Разведка по карте, точка по ходу', ic: '⇄', dir: 'S', tempo: 'norm', card: 'nades', ac: '#f2c14e' }, { n: 'Сплит A', d: 'Медленно, с двух сторон на A', ic: 'A', dir: 'A', tempo: 'slow', card: 'fake', ac: '#ff5a5a' }],
  D: [{ n: 'Стек A', d: 'Трое на A, по одному на мид и B', ic: 'A', dir: 'A', tempo: 'norm', card: 'stack', ac: '#4aa3ff' }, { n: 'Ровно', d: 'Двое на каждой точке, один на миде', ic: '◎', dir: 'S', tempo: 'norm', card: 'cross', ac: '#7fe0d0' }, { n: 'Стек B', d: 'Трое на B, по одному на мид и A', ic: 'B', dir: 'B', tempo: 'norm', card: 'stack', ac: '#8f7bff' }]
};
const qpCan = (m, k) => !!AC[k] && m.a.hand.includes(k) && m.canPlay(m.a, [k]);
/* совет: после победы — то же направление, после поражения — следующее */
function qpRec(m) { const L = QP[m.sideA], h = m.hist[m.hist.length - 1]; if (!h || h.side !== m.sideA) return 1; const i = L.findIndex(p => p.dir === h.dirA); return i < 0 ? 1 : h.win ? i : (i + 1) % 3; }
function qpApply(i) { const m = OV.m, p = QP[m.sideA][i]; if (!p) return; OV.plan.dir = p.dir; OV.plan.tempo = p.tempo; OV.sel = qpCan(m, p.card) ? [p.card] : []; }
function qpDraw(el) {
  const m = OV.m, L = QP[m.sideA], ri = LV.qr = qpRec(m), atk = m.sideA === 'A';
  const kind = m.decider ? 'решающий' : m.isPistol() ? 'пистолетный' : (BUY[m.buyOf(m.a, [])] || BUY.eco).n.toLowerCase();
  el.className = 'lv-prep on qp';
  el.innerHTML = `<div class="pp-h"><div><small class="eyebrow">${atk ? 'Атака · T' : 'Защита · CT'} · раунд ${m.round} · ${kind}</small><b>Выберите план</b></div><div class="qp-ring" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" id="qpg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg><span id="qpt"></span></div></div>
    <div class="qp-cards">${L.map((p, i) => `<button class="qp-c ${i === ri ? 'rec' : ''}" data-act="qp" data-v="${i}" style="--ac:${p.ac}">${i === ri ? '<span class="qp-r">совет</span>' : ''}<span class="qp-i">${p.ic}</span><b>${p.n}</b><small>${p.d}</small>${qpCan(m, p.card) ? `<em>+ ${esc(AC[p.card].n)}</em>` : ''}</button>`).join('')}</div>
    <div class="qp-f"><span>Деньги <b>$${nf(m.a.money)}</b> · приказы ${m.a.en}/8</span><button class="btn s" data-act="prepOpen">Тонкая настройка</button></div>`;
  qpTick();
}
function qpTick() {
  const g = $('#qpg'), n = $('#qpt'); if (!g || !LV) return; const k = clamp(LV.t / (LV.T || 1), 0, 1), s = String(Math.ceil(Math.max(0, LV.t) / 1000));
  g.setAttribute('stroke-dashoffset', (100.5 * (1 - k)).toFixed(1)); if (n.textContent !== s) n.textContent = s;
}
