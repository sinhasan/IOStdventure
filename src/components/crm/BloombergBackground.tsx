export default function BloombergBackground() {
  const ventureTerms = [
    ['AI +2.8%', 'text-lime-400'],
    ['SAAS +1.4%', 'text-blue-400'],
    ['FINTECH +3.1%', 'text-lime-300'],
    ['HEALTHTECH -0.7%', 'text-red-400'],
    ['CLIMATE TECH +1.9%', 'text-lime-300'],
    ['DEEPTECH +2.2%', 'text-blue-300'],
    ['CONSUMER -0.4%', 'text-red-300'],
    ['EDTECH +0.8%', 'text-yellow-300'],
    ['AGRI TECH +1.1%', 'text-lime-400'],
    ['ROBOTICS +2.7%', 'text-blue-400'],
    ['SEED', 'text-yellow-300'],
    ['PRE-SEED', 'text-blue-300'],
    ['SERIES A', 'text-lime-300'],
    ['SERIES B', 'text-yellow-300'],
    ['GROWTH', 'text-blue-400'],
    ['GOLD 80%', 'text-yellow-300'],
    ['SILVER 60%', 'text-blue-300'],
    ['BRONZE 40%', 'text-red-300'],
    ['MATCH 87%', 'text-lime-400'],
    ['VC SIGNAL', 'text-lime-300'],
    ['DEAL FLOW', 'text-blue-300'],
    ['REVEAL LIVE', 'text-yellow-300'],
    ['TERM SHEET', 'text-lime-400'],
    ['DUE DILIGENCE', 'text-red-300'],
    ['CLOSE RATE +3.4X', 'text-blue-400'],
    ['FOLLOW-UP DUE', 'text-yellow-300'],
    ['INVESTOR ACTIVE', 'text-lime-300'],
    ['FOUNDER READY', 'text-blue-300'],
  ];

  const cities = [
    ['BANGALORE', 'text-lime-300'],
    ['MUMBAI', 'text-blue-300'],
    ['DELHI NCR', 'text-yellow-300'],
    ['HYDERABAD', 'text-lime-400'],
    ['CHENNAI', 'text-blue-400'],
    ['PUNE', 'text-yellow-300'],
    ['AHMEDABAD', 'text-lime-300'],
    ['JAIPUR', 'text-blue-300'],
    ['KOCHI', 'text-lime-400'],
    ['INDORE', 'text-yellow-300'],
    ['SINGAPORE', 'text-blue-400'],
    ['DUBAI', 'text-yellow-300'],
    ['LONDON', 'text-blue-300'],
    ['NEW YORK', 'text-lime-300'],
    ['SAN FRANCISCO', 'text-red-300'],
  ];

  const rows = Array.from({ length: 12 }).map((_, i) => {
    const source = i % 3 === 0 ? cities : ventureTerms;
    return {
      top: `${8 + i * 7}%`,
      speed: `${28 + (i % 5) * 6}s`,
      direction: i % 2 === 0 ? 'tickerLeft' : 'tickerRight',
      items: source,
      opacity: i % 2 === 0 ? 0.26 : 0.2,
      size: i % 3 === 0 ? 'text-xs' : 'text-sm',
    };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020403]">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(rgba(163,255,18,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(163,255,18,0.11) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="absolute left-0 w-[300%]"
          style={{
            top: row.top,
            opacity: row.opacity,
          }}
        >
          <div
            className={`whitespace-nowrap ${row.size} tracking-[0.42em]`}
            style={{
              animation: `${row.direction} ${row.speed} linear infinite`,
            }}
          >
            {Array.from({ length: 10 }).map((_, repeatIndex) =>
              row.items.map(([text, cls], itemIndex) => (
                <span key={`${repeatIndex}-${itemIndex}`} className={`mx-7 ${cls}`}>
                  {text}
                </span>
              ))
            )}
          </div>
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/75" />

      <style>{`
        @keyframes tickerLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-33%); }
        }

        @keyframes tickerRight {
          from { transform: translateX(-33%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
