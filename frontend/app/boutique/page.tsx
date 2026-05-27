'use client';
import { useState } from 'react';

const PRODUCTS = [
  { id:'p1', name:'T-shirt PAC Logo',    emoji:'👕', price:7500,  oldPrice:10000, badge:'🔥', cat:'Vêtements'   },
  { id:'p2', name:'Casquette PAC',       emoji:'🧢', price:5000,  oldPrice:null,  badge:'New', cat:'Vêtements'  },
  { id:'p3', name:'Trophée Collector',   emoji:'🏆', price:25000, oldPrice:null,  badge:null,  cat:'Trophées'   },
  { id:'p4', name:'Coque PAC Phone',     emoji:'📱', price:3500,  oldPrice:null,  badge:null,  cat:'Accessoires'},
  { id:'p5', name:'Maillot Supporter',   emoji:'🎽', price:12000, oldPrice:null,  badge:null,  cat:'Vêtements'  },
  { id:'p6', name:'Photo Dédicacée',     emoji:'🖼️', price:2000,  oldPrice:null,  badge:'Éd.', cat:'Photos'     },
  { id:'p7', name:'Sac à dos PAC',       emoji:'🎒', price:18000, oldPrice:null,  badge:null,  cat:'Accessoires'},
  { id:'p8', name:'Montre PAC Edition',  emoji:'⌚', price:35000, oldPrice:50000, badge:'Promo',cat:'Accessoires'},
];

const CATS = ['Tout','👕 Vêtements','🏆 Trophées','📱 Accessoires','📸 Photos'];
const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function BoutiquePage() {
  const [cat,   setCat]   = useState('Tout');
  const [cart,  setCart]  = useState<string[]>([]);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function addToCart(id: string, name: string) {
    setCart(prev => [...prev, id]);
    showToast(`🛍️ ${name} ajouté au panier !`);
  }

  const filtered = PRODUCTS.filter(p =>
    cat === 'Tout' || p.cat === cat.replace(/^.+\s/, '')
  );

  const total = cart.reduce((s, id) => {
    const p = PRODUCTS.find(p => p.id === id);
    return s + (p?.price || 0);
  }, 0);

  return (
    <div style={{ background:'#1a1a1a', minHeight:'100vh', paddingBottom:'1rem' }}>

      {/* Panier */}
      {cart.length > 0 && (
        <div style={{ margin:'.5rem 1rem', background:'#1a1400', border:'0.5px solid #F5A623',
          borderRadius:'10px', padding:'.65rem 1rem', display:'flex',
          alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:'12px', color:'#F5A623', fontWeight:500 }}>
              🛒 Mon panier
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:'16px', height:'16px', background:'#E24B4A', borderRadius:'50%',
                fontSize:'9px', color:'#fff', marginLeft:'4px' }}>{cart.length}</span>
            </div>
            <div style={{ fontSize:'10px', color:'#5A5040', marginTop:'2px' }}>
              Total : {fmt(total)} F CFA
            </div>
          </div>
          <button onClick={() => showToast('🛍️ Commande en cours...')} style={{
            background:'#F5A623', border:'none', borderRadius:'7px', padding:'6px 14px',
            fontSize:'11px', fontWeight:500, color:'#000', cursor:'pointer', fontFamily:'inherit',
          }}>Commander</button>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:'flex', gap:'6px', padding:'.4rem 1rem .3rem', overflowX:'auto' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding:'4px 12px', borderRadius:'16px', fontSize:'11px', fontWeight:500,
            whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', flexShrink:0,
            background: cat===c ? '#F5A623' : '#222',
            border: cat===c ? 'none' : '0.5px solid #3A3A3A',
            color: cat===c ? '#000' : '#9A9080',
          }}>{c}</button>
        ))}
      </div>

      <div style={{ padding:'.5rem 1rem .2rem', fontSize:'11px', fontWeight:500, color:'#9A9080' }}>
        🔥 Populaires
      </div>

      {/* Grille produits */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', padding:'.4rem 1rem' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background:'#222', border:'0.5px solid #2A2A2A',
            borderRadius:'10px', overflow:'hidden', cursor:'pointer' }}>
            <div style={{ width:'100%', height:'120px', background:'#111',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'32px', position:'relative' }}>
              {p.emoji}
              {p.badge && (
                <span style={{ position:'absolute', top:'6px', right:'6px',
                  background: p.badge === '🔥' || p.badge === 'Promo' ? '#E24B4A' : '#1D9E75',
                  color:'#fff', fontSize:'8px', fontWeight:500, padding:'2px 5px',
                  borderRadius:'4px' }}>{p.badge}</span>
              )}
            </div>
            <div style={{ padding:'.6rem .75rem .7rem' }}>
              <div style={{ fontSize:'12px', fontWeight:500, color:'#F0ECE4', marginBottom:'3px' }}>
                {p.name}
              </div>
              <div>
                <span style={{ fontSize:'13px', fontWeight:500, color:'#F5A623' }}>
                  {fmt(p.price)} F
                </span>
                {p.oldPrice && (
                  <span style={{ fontSize:'10px', color:'#5A5040',
                    textDecoration:'line-through', marginLeft:'4px' }}>
                    {fmt(p.oldPrice)} F
                  </span>
                )}
              </div>
              <button onClick={() => addToCart(p.id, p.name)} style={{
                width:'100%', marginTop:'6px', padding:'6px',
                background:'#0a1f17', border:'0.5px solid #1D9E75', borderRadius:'6px',
                fontSize:'11px', fontWeight:500, color:'#1D9E75', cursor:'pointer',
                fontFamily:'inherit',
              }}>+ Panier</button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          background:'#1D9E75', color:'#fff', padding:'8px 18px', borderRadius:'18px',
          fontSize:'12px', fontWeight:500, zIndex:9999, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

