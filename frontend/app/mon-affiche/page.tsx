'use client';
// frontend/app/mon-affiche/page.tsx
// Generateur d'affiche "Vote pour moi" — reserve aux utilisateurs connectes.
// Lien fixe (non modifiable), titre principal long (multi-lignes), 9 couleurs vives.
import { useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';

const LIEN_FIXE = 'www.diki-diki.com';

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
      var el = { titre: q('titre'), nom: q('nom'), disc: q('disc'), msg: q('msg'), zoom: q('zoom') };

      function roundRect(c: any, x: number, y: number, w: number, h: number, r: number) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function fitFont(t: string, fam: string, wt: string, maxW: number, start: number, min: number) { var s = start; do { ctx.font = wt + ' ' + s + 'px ' + fam; if (ctx.measureText(t).width <= maxW) break; s -= 2; } while (s > min); return s; }
      function coverScale() { return Math.max(FR.w / iw, FR.h / ih); }
      function clampPan() { if (!img) return; var eff = coverScale() * zoom, dw = iw * eff, dh = ih * eff; var mx = Math.max(0, (dw - FR.w) / 2), my = Math.max(0, (dh - FR.h) / 2); panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY)); }
      function star(cx: number, cy: number, rO: number, pts: number) { var rI = rO * 0.42, step = Math.PI / pts; ctx.beginPath(); for (var i = 0; i < 2 * pts; i++) { var r = (i % 2 === 0) ? rO : rI; var a = -Math.PI / 2 + i * step; var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); }
      function drawStar(cx: number, cy: number, r: number, color: string, rot: number, alpha: number) { ctx.save(); ctx.globalAlpha = (alpha == null ? 1 : alpha); ctx.translate(cx, cy); ctx.rotate(rot || 0); star(0, 0, r, 5); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }

      // Titre principal : TOUJOURS sur une seule ligne. On reduit la taille pour les titres longs.
      function layoutTitle(text: string, maxW: number) {
        text = (text || '').toUpperCase();
        var size = 84;
        ctx.font = '400 ' + size + 'px Anton, sans-serif';
        while (ctx.measureText(text).width > maxW && size > 26) { size -= 1; ctx.font = '400 ' + size + 'px Anton, sans-serif'; }
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
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0d0a0c'; ctx.fillRect(0, 0, W, H);
        var g1 = ctx.createRadialGradient(W * 0.92, H * 0.05, 40, W * 0.92, H * 0.05, W * 1.0);
        g1.addColorStop(0, hexA(theme.frame, 0.55)); g1.addColorStop(0.5, hexA(theme.frame, 0.13)); g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
        var g2 = ctx.createRadialGradient(W * 0.06, H * 0.97, 40, W * 0.06, H * 0.97, W * 0.95);
        g2.addColorStop(0, hexA(theme.frame, 0.45)); g2.addColorStop(0.5, hexA(theme.frame, 0.11)); g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

        var logoBottom = drawOfficialLogo(648, 62);
        var kind = disciplineKind(el.disc.value);
        var kicker = kind === 'sport' ? 'L’ARÈNE SPORTIVE DES TALENTS AFRICAINS' : kind === 'art' ? 'L’ARÈNE ARTISTIQUE DES TALENTS AFRICAINS' : 'L’ARÈNE DES TALENTS AFRICAINS';
        ctx.textAlign = 'center'; ctx.fillStyle = '#F5EFE3';
        var ks = fitFont(kicker, 'Sora, sans-serif', '700', W - 110, 25, 17);
        ctx.font = '700 ' + ks + 'px Sora, sans-serif'; ctx.fillText(kicker, W / 2, logoBottom + 42);

        // etoiles rouges qui depassent derriere les coins bas de la photo
        drawStar(FR.x + 28, FR.y + FR.h - 4, 96, '#E11D2E', -0.12, 1);
        drawStar(FR.x + FR.w - 28, FR.y + FR.h - 4, 96, '#E11D2E', 0.12, 1);
        ctx.save();
        roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r);
        ctx.shadowColor = theme.glowFrame; ctx.shadowBlur = 62; ctx.fillStyle = '#241826'; ctx.fill(); ctx.shadowBlur = 0; ctx.clip();
        if (img) {
          var eff = coverScale() * zoom, dw = iw * eff, dh = ih * eff, dx = FR.x + (FR.w - dw) / 2 + panX, dy = FR.y + (FR.h - dh) / 2 + panY;
          ctx.drawImage(img, dx, dy, dw, dh);
          var pg = ctx.createLinearGradient(0, FR.y + FR.h - 260, 0, FR.y + FR.h);
          pg.addColorStop(0, 'rgba(22,16,25,0)'); pg.addColorStop(1, 'rgba(22,16,25,.6)');
          ctx.fillStyle = pg; ctx.fillRect(FR.x, FR.y + FR.h - 260, FR.w, 260);
        } else {
          ctx.fillStyle = '#7c6d78'; ctx.textAlign = 'center';
          ctx.font = '700 44px Sora, sans-serif'; ctx.fillText('📷 Ajoute ta photo', W / 2, FR.y + FR.h / 2 - 6);
          ctx.font = '400 28px Sora, sans-serif'; ctx.fillText('elle se placera ici', W / 2, FR.y + FR.h / 2 + 42);
        }
        ctx.restore();
        // cadre brillant
        roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r);
        var fgr = ctx.createLinearGradient(FR.x, FR.y, FR.x + FR.w, FR.y + FR.h);
        fgr.addColorStop(0, light(theme.frame, 42)); fgr.addColorStop(.5, theme.frame); fgr.addColorStop(1, dark(theme.frame, 22));
        ctx.lineWidth = 9; ctx.strokeStyle = fgr; ctx.shadowColor = theme.glowFrame; ctx.shadowBlur = 34; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.save(); roundRect(ctx, FR.x, FR.y, FR.w, FR.h, FR.r); ctx.clip();
        var sh = ctx.createLinearGradient(0, FR.y, 0, FR.y + 90); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; ctx.fillRect(FR.x, FR.y, FR.w, 90); ctx.restore();

        // badge rond
        var bs = 120, bm = 26, bx = FR.x + FR.w - bm - bs / 2, by = FR.y + FR.h - bm - bs / 2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
        ctx.beginPath(); ctx.arc(bx, by, bs / 2, 0, Math.PI * 2); ctx.fillStyle = '#0a0a0f'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = theme.frame; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = theme.frame; star(bx, by, 30, 5); ctx.fill(); ctx.restore();

        // pastille discipline
        var disc = (el.disc.value || '').trim().toUpperCase(), chipY = 1332;
        drawStar(W / 2, chipY, 80, '#E11D2E', 0, 0.96);
        if (disc) {
          ctx.font = '700 34px Sora, sans-serif';
          var cw = ctx.measureText(disc).width, padX = 34, ch = 64, cx = W / 2 - cw / 2 - padX, cwFull = cw + padX * 2;
          roundRect(ctx, cx, chipY - ch / 2, cwFull, ch, ch / 2);
          var cg = ctx.createLinearGradient(0, chipY - ch / 2, 0, chipY + ch / 2);
          cg.addColorStop(0, light(theme.chip, 30)); cg.addColorStop(.5, theme.chip); cg.addColorStop(1, dark(theme.chip, 12));
          ctx.save(); ctx.shadowColor = hexA(theme.chip, .6); ctx.shadowBlur = 26; ctx.fillStyle = cg; ctx.fill(); ctx.restore();
          roundRect(ctx, cx + 6, chipY - ch / 2 + 4, cwFull - 12, ch / 2 - 4, (ch / 2 - 4) / 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
          ctx.fillStyle = theme.chipInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(disc, W / 2, chipY + 2); ctx.textBaseline = 'alphabetic';
        }

        // titre principal (1 ou 2 lignes)
        var TL = layoutTitle(el.titre.value || 'VOTE POUR MOI', W - 150);
        ctx.font = '400 ' + TL.size + 'px Anton, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = theme.head;
        ctx.fillText(TL.lines[0], W / 2, 1500);

        // nom
        var nom = (el.nom.value || '').trim().toUpperCase() || 'TON NOM';
        var ns = fitFont(nom, 'Anton, sans-serif', '400', W - 150, 92, 40);
        ctx.font = '400 ' + ns + 'px Anton, sans-serif';
        ctx.save(); ctx.shadowColor = hexA(theme.nameCol, .5); ctx.shadowBlur = 22; ctx.fillStyle = theme.nameCol; ctx.fillText(nom, W / 2, 1602); ctx.restore();

        // message
        var msg = (el.msg.value || '').trim();
        if (msg) { var ms = fitFont(msg, 'Sora, sans-serif', '400', W - 160, 34, 22); ctx.font = '400 ' + ms + 'px Sora, sans-serif'; ctx.fillStyle = theme.msg; ctx.fillText(msg, W / 2, 1656); }

        // pied (lien fixe)
        var by2 = 1720, bh = 146, bx2 = 72, bw = W - 144;
        roundRect(ctx, bx2, by2, bw, bh, 30);
        var fg = ctx.createLinearGradient(bx2, by2, bx2 + bw, by2 + bh); fg.addColorStop(0, light(theme.foot1, 14)); fg.addColorStop(.5, theme.foot1); fg.addColorStop(1, theme.foot2);
        ctx.save(); ctx.shadowColor = hexA(theme.foot1, .55); ctx.shadowBlur = 30; ctx.fillStyle = fg; ctx.fill(); ctx.restore();
        roundRect(ctx, bx2 + 8, by2 + 6, bw - 16, bh / 2 - 4, 24);
        var fhg = ctx.createLinearGradient(0, by2, 0, by2 + bh / 2); fhg.addColorStop(0, 'rgba(255,255,255,.30)'); fhg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fhg; ctx.fill();
        ctx.fillStyle = theme.footInk; ctx.font = '700 22px Sora, sans-serif'; ctx.textAlign = 'center';
        ctx.globalAlpha = .85; ctx.fillText('SOUTIENS TON TALENT SUR', W / 2, by2 + 52); ctx.globalAlpha = 1;
        var ls = fitFont(LIEN_FIXE, 'Sora, sans-serif', '800', bw - 80, 52, 26);
        ctx.font = '800 ' + ls + 'px Sora, sans-serif'; ctx.fillStyle = theme.footInk; ctx.fillText(LIEN_FIXE, W / 2, by2 + 112);
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

      var saveBox = q('saveBox'), result = q('result');
      q('gen').addEventListener('click', function () { draw(); var url = cv.toDataURL('image/png'); result.src = url; saveBox.hidden = false; saveBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      q('dl').addEventListener('click', function () { try { var a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'affiche-diki-diki.png'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {} });

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

            <div className="maff-field"><label htmlFor="titre">Titre principal</label><input id="titre" type="text" maxLength={46} placeholder="Ex : 3 Séries de 12 Lancers Francs" defaultValue="VOTE POUR MOI" /></div>
            <div className="maff-field"><label htmlFor="nom">Nom du candidat</label><input id="nom" type="text" maxLength={22} placeholder="Ex : A. SHALOM" defaultValue="A. SHALOM" /></div>
            <div className="maff-field"><label htmlFor="disc">Discipline</label><input id="disc" type="text" maxLength={18} placeholder="Ex : Basket" defaultValue="CHALLENGE BASKET" /></div>
            <div className="maff-field"><label htmlFor="msg">Message court (optionnel)</label><input id="msg" type="text" maxLength={34} placeholder="Ex : Soutiens-moi dans l'Arène !" defaultValue="Merci de voter pour moi !" /></div>

            <div className="maff-field">
              <label>Lien affiché (fixe)</label>
              <div className="maff-fixed">🔒 <b>{LIEN_FIXE}</b> — non modifiable</div>
            </div>

            <button className="maff-btn maff-primary" id="gen" type="button">Enregistrer l'affiche</button>
            <p className="maff-tips"><b>Rappel Diki-Diki :</b> on ne promet jamais un montant. Le partage sert à faire venir la communauté voter — jamais à offrir des votes.</p>

            <div className="maff-save" id="saveBox" hidden>
              <h3>Ton affiche est prête ✅</h3>
              <p><b>Sur téléphone :</b> appui long sur l'image → « Enregistrer l'image ».<br /><b>Sur ordinateur :</b> clic droit → « Enregistrer l'image sous… ».</p>
              <img id="result" alt="Affiche générée à enregistrer" />
              <div className="maff-row" style={{ marginTop: 12 }}><button className="maff-btn maff-ghost" id="dl" type="button">Tenter le téléchargement direct</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
