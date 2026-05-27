'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

const COUNTRIES = [
  { code: 'BJ', name: 'Benin', dialCode: '+229', operators: [
    { id: 'mtn_bj', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'moov_bj', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'CI', name: "Cote d'Ivoire", dialCode: '+225', operators: [
    { id: 'orange_ci', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'mtn_ci', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'wave_ci', label: 'Wave', color: '#1DC8EE', bg: '#1DC8EE', fg: '#FFF', text: 'W' },
    { id: 'moov_ci', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'SN', name: 'Senegal', dialCode: '+221', operators: [
    { id: 'orange_sn', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'wave_sn', label: 'Wave', color: '#1DC8EE', bg: '#1DC8EE', fg: '#FFF', text: 'W' },
    { id: 'free_sn', label: 'Free Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'FREE' },
  ]},
  { code: 'CM', name: 'Cameroun', dialCode: '+237', operators: [
    { id: 'mtn_cm', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'orange_cm', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
  ]},
  { code: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', operators: [
    { id: 'mtn_cg', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'airtel_cg', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'CD', name: 'Congo RDC', dialCode: '+243', operators: [
    { id: 'airtel_cd', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
    { id: 'orange_cd', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'mpesa_cd', label: 'M-Pesa', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'M-P' },
  ]},
  { code: 'GA', name: 'Gabon', dialCode: '+241', operators: [
    { id: 'airtel_ga', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
    { id: 'moov_ga', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'CF', name: 'Centrafrique', dialCode: '+236', operators: [
    { id: 'orange_cf', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'moov_cf', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'TD', name: 'Tchad', dialCode: '+235', operators: [
    { id: 'airtel_td', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
    { id: 'moov_td', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'GQ', name: 'Guinee Equatoriale', dialCode: '+240', operators: [
    { id: 'mtn_gq', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'BI', name: 'Burundi', dialCode: '+257', operators: [
    { id: 'lumitel_bi', label: 'Lumitel', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'LUM' },
    { id: 'airtel_bi', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'GH', name: 'Ghana', dialCode: '+233', operators: [
    { id: 'mtn_gh', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'vodafone_gh', label: 'Vodafone Cash', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'VF' },
    { id: 'airteltigo_gh', label: 'AirtelTigo Money', color: '#FF0000', bg: '#FF0000', fg: '#FFF', text: 'AT' },
  ]},
  { code: 'ML', name: 'Mali', dialCode: '+223', operators: [
    { id: 'orange_ml', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'moov_ml', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', operators: [
    { id: 'orange_bf', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'moov_bf', label: 'Moov Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MOOV' },
  ]},
  { code: 'TG', name: 'Togo', dialCode: '+228', operators: [
    { id: 'tmoney_tg', label: 'T-Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'TM' },
    { id: 'flooz_tg', label: 'Flooz', color: '#FF9900', bg: '#FF9900', fg: '#FFF', text: 'FL' },
  ]},
  { code: 'NE', name: 'Niger', dialCode: '+227', operators: [
    { id: 'orange_ne', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'airtel_ne', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'GN', name: 'Guinee', dialCode: '+224', operators: [
    { id: 'orange_gn', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'mtn_gn', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'GW', name: 'Guinee-Bissau', dialCode: '+245', operators: [
    { id: 'orange_gw', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
  ]},
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', operators: [
    { id: 'orange_sl', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'africell_sl', label: 'Africell Money', color: '#0033A0', bg: '#0033A0', fg: '#FFF', text: 'AF' },
  ]},
  { code: 'LR', name: 'Liberia', dialCode: '+231', operators: [
    { id: 'orange_lr', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'lonestar_lr', label: 'Lonestar MTN', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'GM', name: 'Gambie', dialCode: '+220', operators: [
    { id: 'africell_gm', label: 'Africell Money', color: '#0033A0', bg: '#0033A0', fg: '#FFF', text: 'AF' },
    { id: 'qmoney_gm', label: 'QMoney', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'QM' },
  ]},
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', operators: [
    { id: 'mattel_mr', label: 'Mattel Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MAT' },
    { id: 'chinguitel_mr', label: 'Chinguitel', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'CH' },
  ]},
  { code: 'NG', name: 'Nigeria', dialCode: '+234', operators: [
    { id: 'opay_ng', label: 'OPay', color: '#00C853', bg: '#00C853', fg: '#FFF', text: 'OP' },
    { id: 'palmpay_ng', label: 'PalmPay', color: '#007B5E', bg: '#007B5E', fg: '#FFF', text: 'PP' },
    { id: 'mtn_ng', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'KE', name: 'Kenya', dialCode: '+254', operators: [
    { id: 'mpesa_ke', label: 'M-Pesa', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'M-P' },
    { id: 'airtel_ke', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', operators: [
    { id: 'mpesa_tz', label: 'M-Pesa', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'M-P' },
    { id: 'tigo_tz', label: 'Tigo Pesa', color: '#00AEEF', bg: '#00AEEF', fg: '#FFF', text: 'TIGO' },
    { id: 'airtel_tz', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'UG', name: 'Ouganda', dialCode: '+256', operators: [
    { id: 'mtn_ug', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'airtel_ug', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'RW', name: 'Rwanda', dialCode: '+250', operators: [
    { id: 'mtn_rw', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
    { id: 'airtel_rw', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'ET', name: 'Ethiopie', dialCode: '+251', operators: [
    { id: 'telebirr_et', label: 'Telebirr', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'TB' },
    { id: 'cbebirr_et', label: 'CBE Birr', color: '#003087', bg: '#003087', fg: '#FFF', text: 'CBE' },
  ]},
  { code: 'MG', name: 'Madagascar', dialCode: '+261', operators: [
    { id: 'mvola_mg', label: 'MVola', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'MV' },
    { id: 'orange_mg', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'airtel_mg', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', operators: [
    { id: 'mpesa_mz', label: 'M-Pesa', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'M-P' },
    { id: 'airtel_mz', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
  ]},
  { code: 'ZM', name: 'Zambie', dialCode: '+260', operators: [
    { id: 'airtel_zm', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
    { id: 'mtn_zm', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', operators: [
    { id: 'ecocash_zw', label: 'EcoCash', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'EC' },
    { id: 'onemoney_zw', label: 'One Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'OM' },
  ]},
  { code: 'MW', name: 'Malawi', dialCode: '+265', operators: [
    { id: 'airtel_mw', label: 'Airtel Money', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'AIR' },
    { id: 'mpamba_mw', label: 'TNM Mpamba', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MP' },
  ]},
  { code: 'AO', name: 'Angola', dialCode: '+244', operators: [
    { id: 'multicaixa_ao', label: 'Multicaixa Express', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'MX' },
  ]},
  { code: 'BW', name: 'Botswana', dialCode: '+267', operators: [
    { id: 'orange_bw', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'myzaka_bw', label: 'MyZaka', color: '#003087', bg: '#003087', fg: '#FFF', text: 'MZ' },
  ]},
  { code: 'NA', name: 'Namibie', dialCode: '+264', operators: [
    { id: 'mtn_na', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'SZ', name: 'Eswatini', dialCode: '+268', operators: [
    { id: 'mtn_sz', label: 'MTN Mobile Money', color: '#FFD700', bg: '#FFD700', fg: '#000', text: 'MTN' },
  ]},
  { code: 'LS', name: 'Lesotho', dialCode: '+266', operators: [
    { id: 'mpesa_ls', label: 'M-Pesa', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'M-P' },
    { id: 'econet_ls', label: 'Econet Money', color: '#003087', bg: '#003087', fg: '#FFF', text: 'EC' },
  ]},
  { code: 'MA', name: 'Maroc', dialCode: '+212', operators: [
    { id: 'orangemoney_ma', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'inwi_ma', label: 'Inwi Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'IW' },
  ]},
  { code: 'TN', name: 'Tunisie', dialCode: '+216', operators: [
    { id: 'ooredoo_tn', label: 'Ooredoo Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'OR' },
    { id: 'orange_tn', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
  ]},
  { code: 'DZ', name: 'Algerie', dialCode: '+213', operators: [
    { id: 'ooredoo_dz', label: 'Ooredoo Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'OR' },
    { id: 'djezzy_dz', label: 'Djezzy Money', color: '#E2001A', bg: '#E2001A', fg: '#FFF', text: 'DJ' },
  ]},
  { code: 'EG', name: 'Egypte', dialCode: '+20', operators: [
    { id: 'vodafone_eg', label: 'Vodafone Cash', color: '#E60000', bg: '#E60000', fg: '#FFF', text: 'VF' },
    { id: 'orange_eg', label: 'Orange Money', color: '#FF6600', bg: '#FF6600', fg: '#FFF', text: 'OM' },
    { id: 'etisalat_eg', label: 'Etisalat Cash', color: '#00A651', bg: '#00A651', fg: '#FFF', text: 'ET' },
  ]},
];

const s = {
  bg1: 'var(--color-background-primary)',
  bg2: 'var(--color-background-secondary)',
  bgI: 'var(--color-background-info)',
  bgD: 'var(--color-background-danger)',
  bdr: 'var(--color-border-tertiary)',
  bdrI: 'var(--color-border-info)',
  bdrD: 'var(--color-border-danger)',
  txt: 'var(--color-text-primary)',
  txt2: 'var(--color-text-secondary)',
  txt3: 'var(--color-text-tertiary)',
  txtI: 'var(--color-text-info)',
  txtD: 'var(--color-text-danger)',
  rad: 'var(--border-radius-md)',
  font: 'var(--font-sans)',
};

export default function RechargePage() {
  const [country, setCountry] = useState('');
  const [operator, setOperator] = useState('');
  const [amount, setAmount] = useState(0);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  function handleCountrySelect(code: string) {
    setCountry(code);
    setOperator('');
    const c = COUNTRIES.find(x => x.code === code);
    if (c) setPhone(c.dialCode + ' ');
  }

  async function handleSubmit() {
    if (!operator || !amount || !phone) { setError('Remplis tous les champs.'); return; }
    setLoading(true); setError('');
    try {
      const res: any = await api.wallet.initiate(operator, phone, amount);
      if (res.paymentUrl) window.location.href = res.paymentUrl;
    } catch { setError('Une erreur est survenue. Reessaie.'); }
    finally { setLoading(false); }
  }

  const labelStyle = {
    fontSize: '12px', fontWeight: 600 as const,
    color: s.txt3, marginBottom: '8px',
    textTransform: 'uppercase' as const, letterSpacing: '1px',
  };

  return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: s.txt, marginBottom: '4px' }}>
        Recharger mon compte
      </h1>
      <p style={{ fontSize: '13px', color: s.txt3, marginBottom: '1.5rem' }}>
        Selectionnez votre pays et votre operateur
      </p>

      {/* Pays */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={labelStyle}>Pays</div>
        <select
          value={country}
          onChange={e => handleCountrySelect(e.target.value)}
          style={{
            width: '100%', padding: '13px 16px',
            background: s.bg1, border: `1px solid ${s.bdr}`,
            borderRadius: s.rad, fontSize: '15px',
            color: country ? s.txt : s.txt3,
            fontFamily: s.font, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">-- Selectionnez votre pays --</option>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name} ({c.dialCode})</option>
          ))}
        </select>
      </div>

      {/* Operateur */}
      {selectedCountry && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={labelStyle}>Operateur</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedCountry.operators.map(op => (
              <button
                key={op.id}
                onClick={() => setOperator(op.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px',
                  background: operator === op.id ? s.bgI : s.bg1,
                  border: operator === op.id ? `2px solid ${op.color}` : `1px solid ${s.bdr}`,
                  borderRadius: s.rad, cursor: 'pointer', fontFamily: s.font,
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: op.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: op.fg, fontFamily: 'Arial Black, sans-serif' }}>
                    {op.text}
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: s.txt }}>{op.label}</span>
                {operator === op.id && (
                  <span style={{ marginLeft: 'auto', color: op.color, fontSize: '20px' }}>&#10003;</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Montant */}
      {operator && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={labelStyle}>Montant (F CFA)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                style={{
                  padding: '12px',
                  background: amount === a ? s.bgI : s.bg1,
                  border: amount === a ? `2px solid ${s.bdrI}` : `1px solid ${s.bdr}`,
                  borderRadius: s.rad, cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600,
                  color: amount === a ? s.txtI : s.txt,
                  fontFamily: s.font,
                }}
              >
                {a.toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Numero */}
      {operator && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={labelStyle}>Numero Mobile Money</div>
          <input
            type="tel"
            placeholder={selectedCountry ? selectedCountry.dialCode + ' XX XX XX XX' : '+XXX XX XX XX'}
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              width: '100%', padding: '13px 16px',
              background: s.bg1, border: `1px solid ${s.bdr}`,
              borderRadius: s.rad, fontSize: '15px',
              color: s.txt, fontFamily: s.font, outline: 'none',
            }}
          />
        </div>
      )}

      {/* Resume */}
      {amount > 0 && (
        <div style={{
          background: s.bg2, border: `1px solid ${s.bdr}`,
          borderRadius: s.rad, padding: '12px 16px',
          marginBottom: '1.5rem', fontSize: '13px', color: s.txt2,
        }}>
          {amount.toLocaleString('fr-FR')} F CFA = {Math.floor(amount / 100)} votes disponibles
        </div>
      )}

      {error && (
        <div style={{
          background: s.bgD, border: `1px solid ${s.bdrD}`,
          borderRadius: s.rad, padding: '10px 14px',
          marginBottom: '1rem', fontSize: '13px', color: s.txtD,
        }}>
          {error}
        </div>
      )}

      {operator && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #FFB800, #FF6B00)',
            border: 'none', borderRadius: s.rad,
            fontSize: '15px', fontWeight: 700,
            color: '#000', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, fontFamily: s.font,
          }}
        >
          {loading ? 'Redirection...' : 'Payer ' + (amount > 0 ? amount.toLocaleString('fr-FR') + ' F CFA' : '')}
        </button>
      )}
    </main>
  );
}
