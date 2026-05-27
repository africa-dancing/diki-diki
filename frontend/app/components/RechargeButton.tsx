'use client';

export default function RechargeButton() {
  return (
    
     <a href="/recharge"
      target="_blank"
      title="Recharger mon compte"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        background: 'linear-gradient(135deg, #FFB800, #FF6B00)',
        borderRadius: '50px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(255, 184, 0, 0.4)',
        fontSize: '13px',
        fontWeight: 700,
        color: '#000',
        fontFamily: 'system-ui, sans-serif',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontSize: '16px' }}>+</span>
      Recharger
    </a>
  );
}