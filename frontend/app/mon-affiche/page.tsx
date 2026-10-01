'use client';
// frontend/app/mon-affiche/page.tsx
// Generateur d'affiche "Vote pour moi" — reserve aux utilisateurs connectes.
// Lien fixe (non modifiable), titre principal long (multi-lignes), 9 couleurs vives.
import { useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';

const LIEN_FIXE = 'www.diki-diki.com';
const QR_B64 = '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';

export default function MonAffichePage() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; ran.current = true;
    // Reserve aux connectes
    try {
      if (!localStorage.getItem('dkdk_token')) {
        window.location.href = '/auth/login?redirect=' + encodeURIComponent('/mon-affiche');
        return;
      }
    } catch (e) {}

    // Polices Anton + Sora
    try {
      if (!document.getElementById('maff-fonts')) {
        var lk = document.createElement('link');
        lk.id = 'maff-fonts'; lk.rel = 'stylesheet';
        lk.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Sora:wght@400;600;700;800&display=swap';
        document.head.appendChild(lk);
      }
    } catch (e) {}

    var q = function (id: string): any { return document.getElementById(id); };

    // (Pas de pre-remplissage du nom : aucun prenom de membre n'est affiche.)

    (function () {
      'use strict';
      function hexA(h: string, a: number) { var n = h.replace('#', ''); var r = parseInt(n.substr(0, 2), 16), g = parseInt(n.substr(2, 2), 16), b = parseInt(n.substr(4, 2), 16); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }
      function clampc(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }
      function light(h: string, amt: number) { var n = h.replace('#', ''); var r = clampc(parseInt(n.substr(0, 2), 16) + amt), g = clampc(parseInt(n.substr(2, 2), 16) + amt), b = clampc(parseInt(n.substr(4, 2), 16) + amt); return 'rgb(' + r + ',' + g + ',' + b + ')'; }
      function dark(h: string, amt: number) { return light(h, -amt); }
      function mk(label: string, c: string, c2: string, ink: string): any { return { name: label, bg1: '#0f0a12', bg2: '#0a070d', bg3: '#120a14', glow: hexA(c, .55), glowFrame: hexA(c, .95), frame: c, chip: c, chipInk: ink, nameCol: c, foot1: c, foot2: c2, footInk: ink, star: c, or: c, head: '#FFFFFF', msg: '#f0e6da', sw: 'linear-gradient(160deg,' + light(c, 45) + ' 0%,' + c + ' 50%,' + c2 + ' 100%)' }; }
      var THEMES: any = {
        arene: mk('Arène', '#FF7A00', '#FF4D00', '#2a1200'),
        rouge: mk('Rouge', '#FF1830', '#E00018', '#2a0006'),
        ornuit: mk('Or nuit', '#FFD400', '#FFAA00', '#2a2100'),
        emeraude: mk('Émeraude', '#00E676', '#00B85A', '#00291a'),
        ocean: mk('Bleu', '#009BFF', '#0066FF', '#001a33'),
        indigo: mk('Indigo', '#5B5BFF', '#3A2FE0', '#0a0a2e'),
        violet: mk('Violet', '#B01EFF', '#8A00E0', '#1c0033'),
        magenta: mk('Magenta', '#FF00AA', '#D6008C', '#2e001d'),
        rose: mk('Rose', '#FF3D85', '#FF1A6B', '#2e0016')
      };
      var theme = THEMES.arene;

      var cv: any = q('poster'); if (!cv) return; var ctx = cv.getContext('2d'); var W = 1080, H = 1920;
      var FR = { x: 72, y: 300, w: 936, h: 1000, r: 44 };
      var img: any = null, iw = 0, ih = 0, zoom = 1, panX = 0, panY = 0;
      var qrImg: any = (typeof Image !== 'undefined') ? new Image() : null;
      var el = { titre: q('titre'), nom: q('nom'), disc: q('disc'), msg: q('msg'), zoom: q('zoom') };

      function roundRect(c: any, x: number, y: number, w: number, h: number, r: number) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function fitFont(t: string, fam: string, wt: string, maxW: number, start: number, min: number) { var s = start; do { ctx.font = wt + ' ' + s + 'px ' + fam; if (ctx.measureText(t).width <= maxW) break; s -= 2; } while (s > min); return s; }
      function coverScale() { return Math.max(FR.w / iw, FR.h / ih); }
      function clampPan() { if (!img) return; var eff = coverScale() * zoom, dw = iw * eff, dh = ih * eff; var mx = Math.max(0, (dw - FR.w) / 2), my = Math.max(0, (dh - FR.h) / 2); panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY)); }
      function star(cx: number, cy: number, rO: number, pts: number) { var rI = rO * 0.42, step = Math.PI / pts; ctx.beginPath(); for (var i = 0; i < 2 * pts; i++) { var r = (i % 2 === 0) ? rO : rI; var a = -Math.PI / 2 + i * step; var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); }
      function drawStar(cx: number, cy: number, r: number, color: string, rot: number, alpha: number) { ctx.save(); ctx.globalAlpha = (alpha == null ? 1 : alpha); ctx.translate(cx, cy); ctx.rotate(rot || 0); star(0, 0, r, 5); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }

      // Titre principal : TOUJOURS sur une seule ligne. On reduit la taille pour les titres longs.
      function layoutTitle(text: string, maxW: number, startSize?: number, minSize?: number) {
        text = (text || '').toUpperCase();
        var size = startSize || 84, mn = (minSize == null ? 26 : minSize);
        ctx.font = '400 ' + size + 'px Anton, sans-serif';
        while (ctx.measureText(text).width > maxW && size > mn) { size -= 1; ctx.font = '400 ' + size + 'px Anton, sans-serif'; }
        return { size: size, lines: [text] };
      }

      function drawOfficialLogo(targetW: number, topY: number) {
        var vbW = 680, vbH = 165, s = targetW / vbW, ox = (W - vbW * s) / 2, oy = topY;
        function X(x: number) { return ox + x * s; } function Y(y: number) { return oy + y * s; }
        ctx.fillStyle = '#FFAA00'; ctx.font = '900 ' + (80 * s) + 'px "Arial Black", Impact, sans-serif'; ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'right'; ctx.fillText('Diki', X(280), Y(108));
        ctx.textAlign = 'left'; ctx.fillText('Diki', X(400), Y(108));
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(2 * s, 2); ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(X(3), Y(126)); ctx.lineTo(X(299), Y(126)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(381), Y(126)); ctx.lineTo(X(677), Y(126)); ctx.stroke();
        var pts = [[340, 28], [350, 58], [382, 58], [356, 76], [366, 106], [340, 88], [314, 106], [324, 76], [298, 58], [330, 58]];
        ctx.fillStyle = '#FF0000'; ctx.beginPath();
        pts.forEach(function (p, i) { var xx = X(p[0]), yy = Y(p[1]); if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); });
        ctx.closePath(); ctx.fill();
        roundRect(ctx, X(299), Y(114), 82 * s, 24 * s, 4 * s); ctx.fillStyle = '#0a0a0f'; ctx.fill();
        ctx.lineWidth = Math.max(2 * s, 1.5); ctx.strokeStyle = '#006600'; ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 ' + (13 * s) + 'px "Arial Black", sans-serif';
        try { ctx.letterSpacing = (2 * s) + 'px'; } catch (e) {}
        ctx.fillText('VISION', X(340), Y(126));
        try { ctx.letterSpacing = '0px'; } catch (e) {}
        ctx.textBaseline = 'alphabetic';
        return oy + vbH * s;
      }

      function disciplineKind(disc: string) {
        var d = (disc || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        var sports = ['taekwondo', 'karate', 'judo', 'boxe', 'lutte', 'football', 'foot', 'basket', 'athletisme', 'martial', 'sport', 'handball', 'volley', 'tennis', 'natation', 'rugby', 'gym', 'mma'];
        var arts = ['danse', 'chant', 'humour', 'instrument', 'cappella', 'poesie', 'slam', 'theatre', 'musique', 'rap', 'magie', 'mode', 'griot'];
        for (var i = 0; i < sports.length; i++) { if (d.indexOf(sports[i]) >= 0) return 'sport'; }
        for (var j = 0; j < arts.length; j++) { if (d.indexOf(arts[j]) >= 0) return 'art'; }
        return 'neutre';
      }

      function draw() {
        var W = cv.width, H = cv.height, fy = H / 1920;
        FR.x = 72; FR.w = 936; FR.y = 300 * fy; FR.h = 1000 * fy; FR.r = 44 * fy;
        ctx.clearRect(0, 0, W, H);
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#241617'); bg.addColorStop(0.5, '#180d0e'); bg.addColorStop(1, '#120a0b');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        var tg = ctx.createRadialGradient(W / 2, 150 * fy, 40 * fy, W / 2, 150 * fy, 880 * fy);
        tg.addColorStop(0, hexA(theme.frame, 0.42)); tg.addColorStop(0.5, hexA(theme.frame, 0.12)); tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 900 * fy);
        drawStar(W / 2, 1055 * fy, 360 * fy, '#521216', 0, 1);

        var logoBottom = drawOfficialLogo(648 * fy, 62 * fy);
        var kind = disciplineKind(el.disc.value);
        var kicker = kind === 'sport' ? 'L’ARÈNE SPORTIVE DES TALENTS AFRICAINS' : kind === 'art' ? 'L’ARÈNE ARTISTIQUE DES TALENTS AFRICAINS' : 'L’ARÈNE DES TALENTS AFRICAINS';
        ctx.textAlign = 'center'; ctx.fillStyle = '#F5EFE3';
        var ks = fitFont(kicker, 'Sora, sans-serif', '700', W - 110, Math.max(25 * fy, 15), 14);
        ctx.font = '700 ' + ks + 'px Sora, sans-serif'; ctx.fillText(kicker, W / 2, logoBottom + 42 * fy);

        ctx.save();
        roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r);
        ctx.shadowColor = theme.glowFrame; ctx.shadowBlur = 62 * fy; ctx.fillStyle = '#241826'; ctx.fill(); ctx.shadowBlur = 0; ctx.clip();
        if (img) {
          var eff = coverScale() * zoom, dw = iw * eff, dh = ih * eff, dx = FR.x + (FR.w - dw) / 2 + panX, dy = FR.y + (FR.h - dh) / 2 + panY;
          ctx.drawImage(img, dx, dy, dw, dh);
          var pg = ctx.createLinearGradient(0, FR.y + FR.h - 260 * fy, 0, FR.y + FR.h);
          pg.addColorStop(0, 'rgba(22,16,25,0)'); pg.addColorStop(1, 'rgba(22,16,25,.6)');
          ctx.fillStyle = pg; ctx.fillRect(FR.x, FR.y + FR.h - 260 * fy, FR.w, 260 * fy);
        } else {
          ctx.fillStyle = '#7c6d78'; ctx.textAlign = 'center';
          ctx.font = '700 ' + (44 * fy) + 'px Sora, sans-serif'; ctx.fillText('📷 Ajoute ta photo', W / 2, FR.y + FR.h / 2 - 6);
          ctx.font = '400 ' + (28 * fy) + 'px Sora, sans-serif'; ctx.fillText('elle se placera ici', W / 2, FR.y + FR.h / 2 + 42 * fy);
        }
        ctx.restore();
        roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r);
        var fgr = ctx.createLinearGradient(FR.x, FR.y, FR.x + FR.w, FR.y + FR.h);
        fgr.addColorStop(0, light(theme.frame, 42)); fgr.addColorStop(.5, theme.frame); fgr.addColorStop(1, dark(theme.frame, 22));
        ctx.lineWidth = Math.max(9 * fy, 4); ctx.strokeStyle = fgr; ctx.shadowColor = theme.glowFrame; ctx.shadowBlur = 34 * fy; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.save(); roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r); ctx.clip();
        var sh = ctx.createLinearGradient(0, FR.y, 0, FR.y + 90 * fy); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; ctx.fillRect(FR.x, FR.y, FR.w, 90 * fy); ctx.restore();

        var bs = 120 * fy, bm = 26 * fy, bx = FR.x + FR.w - bm - bs / 2, by = FR.y + FR.h - bm - bs / 2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10 * fy; ctx.shadowOffsetY = 2 * fy;
        ctx.beginPath(); ctx.arc(bx, by, bs / 2, 0, Math.PI * 2); ctx.fillStyle = '#0a0a0f'; ctx.fill();
        ctx.lineWidth = Math.max(4 * fy, 2); ctx.strokeStyle = theme.frame; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = theme.frame; star(bx, by, 30 * fy, 5); ctx.fill(); ctx.restore();

        var disc = (el.disc.value || '').trim().toUpperCase(), chipY = 1332 * fy;
        if (disc) {
          var cfs = Math.max(34 * fy, 20);
          ctx.font = '700 ' + cfs + 'px Sora, sans-serif';
          var cw = ctx.measureText(disc).width, padX = 34 * fy, ch = Math.max(64 * fy, 40), cx = W / 2 - cw / 2 - padX, cwFull = cw + padX * 2;
          roundRect(ctx, cx, chipY - ch / 2, cwFull, ch, ch / 2);
          var cg = ctx.createLinearGradient(0, chipY - ch / 2, 0, chipY + ch / 2);
          cg.addColorStop(0, light(theme.chip, 30)); cg.addColorStop(.5, theme.chip); cg.addColorStop(1, dark(theme.chip, 12));
          ctx.save(); ctx.shadowColor = hexA(theme.chip, .6); ctx.shadowBlur = 26 * fy; ctx.fillStyle = cg; ctx.fill(); ctx.restore();
          roundRect(ctx, cx + 6, chipY - ch / 2 + 4, cwFull - 12, ch / 2 - 4, (ch / 2 - 4) / 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
          ctx.fillStyle = theme.chipInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(disc, W / 2, chipY + 2); ctx.textBaseline = 'alphabetic';
        }

        var TL = layoutTitle(el.titre.value || 'VOTE POUR MOI', W - 150, 84 * fy, Math.max(26 * fy, 20));
        ctx.font = '400 ' + TL.size + 'px Anton, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = theme.head;
        ctx.fillText(TL.lines[0], W / 2, 1500 * fy);

        var nom = (el.nom.value || '').trim().toUpperCase() || 'TON NOM';
        var ns = fitFont(nom, 'Anton, sans-serif', '400', W - 150, 92 * fy, Math.max(40 * fy, 28));
        ctx.font = '400 ' + ns + 'px Anton, sans-serif';
        ctx.save(); ctx.shadowColor = hexA(theme.nameCol, .5); ctx.shadowBlur = 22 * fy; ctx.fillStyle = theme.nameCol; ctx.fillText(nom, W / 2, 1602 * fy); ctx.restore();

        var msg = (el.msg.value || '').trim();
        if (msg) { var ms = fitFont(msg, 'Sora, sans-serif', '400', W - 160, Math.max(34 * fy, 20), 16); ctx.font = '400 ' + ms + 'px Sora, sans-serif'; ctx.fillStyle = theme.msg; ctx.fillText(msg, W / 2, 1656 * fy); }

        var by2 = 1716 * fy, bh = 152 * fy, bx2 = 72, bw = W - 144;
        roundRect(ctx, bx2, by2, bw, bh, 30 * fy);
        var fg = ctx.createLinearGradient(bx2, by2, bx2 + bw, by2 + bh); fg.addColorStop(0, light(theme.foot1, 14)); fg.addColorStop(.5, theme.foot1); fg.addColorStop(1, theme.foot2);
        ctx.save(); ctx.shadowColor = hexA(theme.foot1, .55); ctx.shadowBlur = 30 * fy; ctx.fillStyle = fg; ctx.fill(); ctx.restore();
        roundRect(ctx, bx2 + 8, by2 + 6, bw - 16, bh / 2 - 4, 24 * fy);
        var fhg = ctx.createLinearGradient(0, by2, 0, by2 + bh / 2); fhg.addColorStop(0, 'rgba(255,255,255,.30)'); fhg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fhg; ctx.fill();
        var qs = 120 * fy, qm = 16 * fy, qx = bx2 + bw - qm - qs, qy = by2 + (bh - qs) / 2;
        roundRect(ctx, qx - 7 * fy, qy - 7 * fy, qs + 14 * fy, qs + 14 * fy, 12 * fy); ctx.fillStyle = '#ffffff'; ctx.fill();
        if (qrImg && qrImg.complete && qrImg.naturalWidth) ctx.drawImage(qrImg, qx, qy, qs, qs);
        var tcx = (bx2 + (qx - 16 * fy)) / 2;
        ctx.fillStyle = theme.footInk; ctx.textAlign = 'center';
        ctx.globalAlpha = .85; ctx.font = '700 ' + Math.max(20 * fy, 14) + 'px Sora, sans-serif'; ctx.fillText('SOUTIENS TON TALENT SUR', tcx, by2 + 56 * fy); ctx.globalAlpha = 1;
        var ls = fitFont(LIEN_FIXE, 'Sora, sans-serif', '800', (qx - 16 * fy - bx2) - 24, Math.max(46 * fy, 20), 16);
        ctx.font = '800 ' + ls + 'px Sora, sans-serif'; ctx.fillStyle = theme.footInk; ctx.fillText(LIEN_FIXE, tcx, by2 + 108 * fy);
      }

      // themes UI
      var themesEl = q('themes');
      Object.keys(THEMES).forEach(function (k) {
        var t = THEMES[k], d = document.createElement('div');
        d.className = 'maff-theme' + (k === 'arene' ? ' on' : ''); (d as any).dataset.k = k;
        d.innerHTML = '<div class="maff-chip" style="background:' + t.sw + '"></div><div class="maff-tn">' + t.name + '</div>';
        d.onclick = function () { theme = THEMES[k]; var all = document.querySelectorAll('.maff-theme'); for (var i = 0; i < all.length; i++) { (all[i] as any).classList.toggle('on', (all[i] as any).dataset.k === k); } draw(); };
        themesEl.appendChild(d);
      });

      ['input', 'change'].forEach(function (ev) { [el.titre, el.nom, el.disc, el.msg].forEach(function (i) { i.addEventListener(ev, draw); }); });
      el.zoom.addEventListener('input', function () { zoom = parseInt(el.zoom.value, 10) / 100; clampPan(); draw(); });
      q('reset').addEventListener('click', function () { zoom = 1; el.zoom.value = '100'; panX = 0; panY = 0; draw(); });

      var drop = q('drop'), file = q('file');
      drop.addEventListener('click', function () { file.click(); });
      drop.addEventListener('keydown', function (e: any) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
      file.addEventListener('change', function () { if (file.files && file.files[0]) loadFile(file.files[0]); });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e: any) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e: any) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e: any) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });
      cv.addEventListener('dragover', function (e: any) { e.preventDefault(); });
      cv.addEventListener('drop', function (e: any) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });
      function loadFile(f: any) { if (!/^image\//.test(f.type)) return; var rd = new FileReader(); rd.onload = function () { var im = new Image(); im.onload = function () { img = im; iw = im.naturalWidth; ih = im.naturalHeight; zoom = 1; el.zoom.value = '100'; panX = 0; panY = 0; draw(); }; im.src = rd.result as string; }; rd.readAsDataURL(f); }

      var dragging = false, lx = 0, ly = 0;
      function canvasScale() { return cv.width / cv.getBoundingClientRect().width; }
      cv.addEventListener('pointerdown', function (e: any) { if (!img) return; dragging = true; cv.classList.add('drag'); cv.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY; });
      cv.addEventListener('pointermove', function (e: any) { if (!dragging) return; var s = canvasScale(); panX += (e.clientX - lx) * s; panY += (e.clientY - ly) * s; lx = e.clientX; ly = e.clientY; clampPan(); draw(); });
      ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { dragging = false; cv.classList.remove('drag'); }); });

      // ── API + jeton + rattachement challenge (anti-fausses affiches) ──
      var API = (process.env.NEXT_PUBLIC_API_URL as string) || 'http://localhost:4000/v1';
      var token = '';
      try { token = localStorage.getItem('dkdk_token') || ''; } catch (e) {}
      var selectedBracketId = '';
      var chSel: any = q('challenge'), chNote: any = q('chNote');
      if (chSel) {
        fetch(API + '/affiches/mes-challenges', { headers: { Authorization: 'Bearer ' + token } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (d) {
            var list = (d && d.data) || [];
            chSel.innerHTML = '';
            var o0 = document.createElement('option'); o0.value = '';
            o0.textContent = list.length ? '— Choisis ton challenge —' : 'Aucun challenge (affiche générique)';
            chSel.appendChild(o0);
            list.forEach(function (c: any) {
              var o = document.createElement('option'); o.value = c.id;
              o.textContent = (c.code ? c.code + ' · ' : '') + (c.title || c.discipline || 'Challenge') + (c.status ? ' (' + c.status + ')' : '');
              (o as any).dataset.disc = c.discipline || '';
              chSel.appendChild(o);
            });
            if (chNote) chNote.textContent = list.length
              ? 'Ton affiche sera rattachée à ce challenge — gage d’authenticité.'
              : 'Tu n’es inscrit à aucun challenge : ton affiche sera marquée « générique ».';
          })
          .catch(function () { chSel.innerHTML = '<option value="">Challenges indisponibles</option>'; });
        chSel.addEventListener('change', function () {
          selectedBracketId = chSel.value;
          var o = chSel.options[chSel.selectedIndex];
          var dsc = (o && (o as any).dataset) ? (o as any).dataset.disc : '';
          if (dsc) { el.disc.value = dsc; draw(); }
        });
      }

      // ── Multi-formats ──
      var FORMATS: any = {
        story:    { w: 1080, h: 1920, label: 'Story 9:16' },
        portrait: { w: 1080, h: 1350, label: 'Portrait 4:5' },
        carre:    { w: 1080, h: 1080, label: 'Carré 1:1' },
      };
      var activeFmt = 'story';
      function setFormat(key: string) {
        activeFmt = key; var f = FORMATS[key]; cv.width = f.w; cv.height = f.h; draw();
        var all = document.querySelectorAll('.maff-fmt');
        for (var i = 0; i < all.length; i++) { (all[i] as any).classList.toggle('on', (all[i] as any).dataset.k === key); }
      }
      var fmtEl = q('formats');
      if (fmtEl) {
        Object.keys(FORMATS).forEach(function (k) {
          var f = FORMATS[k]; var b = document.createElement('button'); b.type = 'button';
          b.className = 'maff-fmt' + (k === 'story' ? ' on' : ''); (b as any).dataset.k = k; b.textContent = f.label;
          b.onclick = function () { setFormat(k); };
          fmtEl.appendChild(b);
        });
      }

      // ── Generation : produit les 3 formats + journalise cote serveur ──
      var saveBox = q('saveBox'), resultMulti: any = q('resultMulti'), posted = false;
      q('gen').addEventListener('click', function () {
        var prev = activeFmt;
        if (resultMulti) resultMulti.innerHTML = '';
        Object.keys(FORMATS).forEach(function (k) {
          var f = FORMATS[k]; cv.width = f.w; cv.height = f.h; draw();
          var url = cv.toDataURL('image/png');
          var card = document.createElement('div'); card.className = 'maff-rcard';
          var lab = document.createElement('div'); lab.className = 'maff-rlab'; lab.textContent = f.label;
          var im = document.createElement('img'); im.src = url; (im as any).alt = 'Affiche ' + f.label;
          var a = document.createElement('a'); a.className = 'maff-btn maff-ghost'; (a as any).href = url;
          (a as any).download = 'affiche-diki-diki-' + k + '.png'; a.textContent = '⬇ Télécharger ' + f.label;
          card.appendChild(lab); card.appendChild(im); card.appendChild(a);
          if (resultMulti) resultMulti.appendChild(card);
        });
        setFormat(prev);
        if (saveBox) { saveBox.hidden = false; saveBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        if (!posted) {
          posted = true;
          try {
            fetch(API + '/affiches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ bracket_id: selectedBracketId || null, titre: el.titre.value || '', discipline: el.disc.value || '' }),
            }).catch(function () {});
          } catch (e) {}
        }
      });

      if (qrImg) { qrImg.onload = function () { draw(); }; qrImg.src = 'data:image/png;base64,' + QR_B64; }
      draw();
      if ((document as any).fonts && (document as any).fonts.ready) { (document as any).fonts.ready.then(draw); }
      setTimeout(draw, 400);
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 115% 44% at 50% 0%, hsla(339,98%,49%,0.5) 0%, transparent 62%), var(--bg)', color: 'var(--ink)', fontFamily: 'Sora, system-ui, sans-serif', paddingBottom: 48 }}>
      <Navbar />
      <style>{`
        .maff-wrap{max-width:1080px;margin:0 auto;padding:16px 16px 10px}
      .maff-select{width:100%;background:#160d16;border:1px solid rgba(255,0,170,.35);border-radius:12px;padding:12px 14px;color:#f3e9f3;font-size:15px;outline:none}
      .maff-select:focus{border-color:rgba(255,0,170,.7)}
      .maff-note{margin-top:6px;font-size:12.5px;line-height:1.35;color:#c9a9c9}
      .maff-formats{display:flex;gap:8px;flex-wrap:wrap}
      .maff-fmt{flex:1;min-width:92px;background:#160d16;border:1px solid rgba(255,0,170,.30);border-radius:12px;padding:11px 8px;color:#e9d9e9;font-size:13px;font-weight:700;cursor:pointer}
      .maff-fmt.on{background:linear-gradient(135deg,rgba(126,3,128,.55),rgba(237,7,15,.9));border-color:transparent;color:#fff}
      .maff-rmulti{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-top:12px}
      .maff-rcard{display:flex;flex-direction:column;gap:8px;align-items:center}
      .maff-rlab{font-size:12.5px;font-weight:800;color:#ffb0e6;letter-spacing:.3px}
      .maff-rcard img{width:100%;height:auto;border-radius:10px;border:1px solid rgba(255,255,255,.08)}
      .maff-rcard a{width:100%;text-align:center;text-decoration:none}
        .maff-wrap *{box-sizing:border-box}
        .maff-head{max-width:760px;margin:0 auto 22px;text-align:center;background:linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15));border:1px solid rgb(10,0,0);border-radius:16px;padding:22px 20px;box-shadow:0 8px 40px rgba(225,29,143,0.35)}
        .maff-kick{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#F6C453;font-weight:700}
        .maff-head h1{font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:clamp(1.5rem,5vw,2.1rem);margin:.2em 0 .1em;line-height:1}
        .maff-head h1 .st{color:#FF0000}
        .maff-head p{color:rgba(255,255,255,0.92);font-size:13.5px;max-width:60ch;margin:0 auto;line-height:1.55}
        .maff-grid{display:grid;grid-template-columns:minmax(200px,360px) minmax(0,1fr);gap:22px;align-items:start}
        @media (max-width:520px){ .maff-grid{grid-template-columns:1fr;gap:18px} }
        .maff-shell{position:relative;width:100%;max-width:420px;margin:0 auto;border-radius:22px;overflow:hidden;box-shadow:0 26px 60px -20px rgba(0,0,0,.7),0 0 0 1px #3a2c3f}
        #poster{display:block;width:100%;height:auto;touch-action:none;cursor:grab;background:#221826}
        #poster.drag{cursor:grabbing}
        .maff-hint{font-size:12px;color:#cdbcae;text-align:center;margin-top:10px}
        .maff-panel{background:linear-gradient(180deg,#221826,#2c2030);border:1px solid #3a2c3f;border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:16px;overflow:hidden}
        .maff-field{display:flex;flex-direction:column;gap:6px}
        .maff-field label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#F6C453;font-weight:700}
        .maff-field input[type=text]{width:100%;padding:11px 12px;border-radius:11px;border:1px solid #3a2c3f;background:#1b1420;color:#FBEFE0;font:inherit;font-size:15px}
        .maff-field input[type=text]:focus{outline:2px solid #F08A24;border-color:#F08A24}
        .maff-drop{border:2px dashed #6a4b3a;border-radius:14px;padding:18px;text-align:center;cursor:pointer;background:#1b1420}
        .maff-drop:hover,.maff-drop.over{border-color:#F08A24;background:#211624}
        .maff-drop b{color:#FBEFE0;display:block;font-size:15px}
        .maff-drop span{color:#cdbcae;font-size:12.5px}
        .maff-row{display:flex;gap:10px;align-items:center}
        .maff-row .maff-field{flex:1}
        .maff-fixed{background:#1b1420;border:1px solid #3a2c3f;border-radius:11px;padding:11px 12px;color:#cdbcae;font-size:14px;display:flex;align-items:center;gap:8px}
        .maff-fixed b{color:#FBEFE0}
        input[type=range]{width:100%;accent-color:#E8641E}
        .maff-themes{display:flex;gap:10px;flex-wrap:wrap}
        .maff-theme{flex:1;min-width:92px;border:1px solid #3a2c3f;border-radius:12px;padding:10px 8px 9px;cursor:pointer;background:#1b1420;text-align:center}
        .maff-theme:hover{border-color:#F08A24}
        .maff-theme.on{border-color:#fff;box-shadow:0 0 0 2px #221826,0 0 0 3px #fff}
        .maff-chip{height:26px;border-radius:8px;margin-bottom:7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 6px rgba(0,0,0,.25),0 2px 7px rgba(0,0,0,.4)}
        .maff-tn{font-size:12px;font-weight:700;color:#FBEFE0}
        .maff-btn{font:inherit;font-weight:800;border:0;border-radius:12px;padding:13px 16px;cursor:pointer}
        .maff-primary{background:linear-gradient(180deg,#F08A24,#E8641E);color:#2a160a;width:100%}
        .maff-ghost{background:#1b1420;color:#FBEFE0;border:1px solid #3a2c3f}
        .maff-save{border:1px solid #3a2c3f;border-radius:14px;padding:14px;background:#1b1420}
        .maff-save h3{margin:0 0 8px;font-size:14px;letter-spacing:.05em;text-transform:uppercase;color:#F6C453}
        .maff-save p{margin:0 0 12px;font-size:13px;color:#cdbcae;line-height:1.5}
        .maff-save img{width:100%;max-width:300px;display:block;margin:0 auto;border-radius:10px;border:1px solid #3a2c3f}
        .maff-tips{font-size:12.5px;color:#cdbcae;line-height:1.55;margin:0}
        .maff-tips b{color:#FBEFE0}
        [hidden]{display:none!important}
      `}</style>

      <div className="maff-wrap">
        <header className="maff-head">
          <div className="maff-kick">★ ESPACE CRÉATION PUBLICITÉ ★</div>
          <h1>CRÉER VOTRE AFFICHE PUBLICITAIRE</h1>
          <p>Ajoute ta photo, écris ton titre et ton nom, choisis une couleur, puis télécharge ton affiche verticale pour WhatsApp, tes statuts et TikTok.</p>
        </header>

        <div className="maff-grid">
          <div>
            <div className="maff-shell"><canvas id="poster" width={1080} height={1920} aria-label="Aperçu de l'affiche"></canvas></div>
            <div className="maff-hint">Astuce : fais glisser la photo dans l'aperçu pour la recadrer.</div>
          </div>

          <div className="maff-panel">
            <div className="maff-field">
              <label>Thème (couleur de l'affiche)</label>
              <div className="maff-themes" id="themes"></div>
            </div>

            <div className="maff-field">
              <label htmlFor="drop">Photo du candidat</label>
              <div className="maff-drop" id="drop" tabIndex={0} role="button" aria-label="Ajouter une photo">
                <b>📷 Ajouter une photo</b>
                <span>Glisse une image ici, ou clique pour choisir (JPG / PNG)</span>
              </div>
              <input id="file" type="file" accept="image/*" hidden />
            </div>

            <div className="maff-row">
              <div className="maff-field"><label htmlFor="zoom">Zoom photo</label><input id="zoom" type="range" min={100} max={260} defaultValue={100} /></div>
              <button className="maff-btn maff-ghost" id="reset" type="button" title="Recentrer la photo">Recentrer</button>
            </div>

            <div className="maff-field">
              <label htmlFor="challenge">Challenge concerné</label>
              <select id="challenge" className="maff-select"><option value="">Chargement…</option></select>
              <div className="maff-note" id="chNote"></div>
            </div>
            <div className="maff-field"><label htmlFor="titre">Titre principal</label><input id="titre" type="text" maxLength={46} placeholder="Ex : 3 Séries de 12 Lancers Francs" defaultValue="VOTE POUR MOI" /></div>
            <div className="maff-field"><label htmlFor="nom">Nom du candidat</label><input id="nom" type="text" maxLength={22} placeholder="Ex : ton nom ou pseudo" /></div>
            <div className="maff-field"><label htmlFor="disc">Discipline</label><input id="disc" type="text" maxLength={18} placeholder="Ex : Basket" defaultValue="CHALLENGE BASKET" /></div>
            <div className="maff-field"><label htmlFor="msg">Message court (optionnel)</label><input id="msg" type="text" maxLength={34} placeholder="Ex : Soutiens-moi dans l'Arène !" defaultValue="Merci de voter pour moi !" /></div>

            <div className="maff-field">
              <label>Lien affiché (fixe)</label>
              <div className="maff-fixed">🔒 <b>{LIEN_FIXE}</b> — non modifiable</div>
            </div>

            <div className="maff-field">
              <label>Formats à générer</label>
              <div className="maff-formats" id="formats"></div>
              <div className="maff-note">Un clic sur « Enregistrer » produit les 3 formats. Les boutons changent l\'aperçu.</div>
            </div>
            <button className="maff-btn maff-primary" id="gen" type="button">Enregistrer mes affiches</button>
            <p className="maff-tips"><b>Rappel Diki-Diki :</b> on ne promet jamais un montant. Le partage sert à faire venir la communauté voter — jamais à offrir des votes.</p>

            <div className="maff-save" id="saveBox" hidden>
              <h3>Tes affiches sont prêtes ✅</h3>
              <p><b>Sur téléphone :</b> appui long sur une image → « Enregistrer l'image ».<br /><b>Sur ordinateur :</b> clic droit → « Enregistrer l'image sous… », ou le bouton sous chaque format.</p>
              <div id="resultMulti" className="maff-rmulti"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
