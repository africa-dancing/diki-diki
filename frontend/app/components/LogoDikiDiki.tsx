export default function LogoDikiDiki({ width = 220 }: { width?: number }) {
  const h = Math.round(width * (165 / 680));
  return (
    <svg width={width} height={h} viewBox="0 0 680 165" role="img" xmlns="http://www.w3.org/2000/svg">
      <title>Logo Diki-Diki Vision</title>
      <text x="280" y="108"
        fontFamily="'Arial Black', Impact, sans-serif"
        fontSize="80" fontWeight="900"
        fill="#FFAA00" textAnchor="end">Diki</text>
      <line x1="3" y1="126" x2="299" y2="126" stroke="#FFFFFF" strokeWidth="2"/>
      <polygon
        points="340,28 350,58 382,58 356,76 366,106 340,88 314,106 324,76 298,58 330,58"
        fill="#FF0000"/>
      <rect x="299" y="114" width="82" height="24" rx="4"
        fill="#0a0a0f" stroke="#006600" strokeWidth="2"/>
      <text x="340" y="131"
        fontFamily="'Arial Black', sans-serif"
        fontSize="13" fontWeight="900"
        fill="#FFFFFF" textAnchor="middle" letterSpacing="2">VISION</text>
      <line x1="381" y1="126" x2="677" y2="126" stroke="#FFFFFF" strokeWidth="2"/>
      <text x="400" y="108"
        fontFamily="'Arial Black', Impact, sans-serif"
        fontSize="80" fontWeight="900"
        fill="#FFAA00" textAnchor="start">Diki</text>
    </svg>
  );
}