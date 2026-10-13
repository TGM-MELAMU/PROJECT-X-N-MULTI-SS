/**
 * Original line illustration of lab glassware (replaces the stock photo in the wireframe until
 * the client supplies real photography). Pure SVG: no image weight, sharp at any size.
 */
export function HeroArt({ className }: { className?: string }) {
  const glass = { fill: "rgb(255 255 255 / 0.07)", stroke: "rgb(255 255 255 / 0.7)", strokeWidth: 2, strokeLinejoin: "round" as const };
  const liquid = "#4f9f78";
  const liquidDeep = "#2f825c";

  return (
    <svg viewBox="0 0 420 290" className={className} role="img" aria-label="Laboratory flask, beaker and test tubes">
      {/* shelf */}
      <line x1="14" y1="254" x2="406" y2="254" stroke="rgb(255 255 255 / 0.25)" strokeWidth="2" strokeLinecap="round" />

      {/* Erlenmeyer flask */}
      <path d="M158 178H262L292 240Q298 252 284 252H136Q122 252 128 240Z" fill={liquid} fillOpacity="0.9" />
      <path d="M158 178H262" stroke="#b3d9c3" strokeWidth="2" strokeLinecap="round" />
      <path d="M192 40H228V110L292 240Q298 252 284 252H136Q122 252 128 240L192 110Z" {...glass} />
      <path d="M185 36H235" stroke="rgb(255 255 255 / 0.85)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="214" r="6" fill="none" stroke="#b3d9c3" strokeWidth="1.6" />
      <circle cx="222" cy="200" r="4" fill="none" stroke="#b3d9c3" strokeWidth="1.6" />
      <circle cx="238" cy="224" r="7" fill="none" stroke="#b3d9c3" strokeWidth="1.6" />
      <path d="M200 64v34" stroke="rgb(255 255 255 / 0.35)" strokeWidth="3" strokeLinecap="round" />

      {/* Beaker with graduations */}
      <path d="M44 178H116V244Q116 252 108 252H52Q44 252 44 244Z" fill={liquidDeep} fillOpacity="0.95" />
      <path d="M44 178H116" stroke="#82bf9d" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 128V244Q40 252 48 252H112Q120 252 120 244V128" {...glass} fill="rgb(255 255 255 / 0.05)" />
      <path d="M36 128H124" stroke="rgb(255 255 255 / 0.85)" strokeWidth="3" strokeLinecap="round" />
      {[148, 168, 188, 208, 228].map((y, i) => (
        <path key={y} d={`M40 ${y}h${i % 2 === 0 ? 16 : 10}`} stroke="rgb(255 255 255 / 0.6)" strokeWidth="1.6" strokeLinecap="round" />
      ))}

      {/* Test tubes */}
      <path d="M326 192H350V240A12 12 0 0 1 326 240Z" fill="#82bf9d" fillOpacity="0.9" />
      <path d="M326 96V240A12 12 0 0 0 350 240V96" {...glass} />
      <path d="M323 96H353" stroke="rgb(255 255 255 / 0.85)" strokeWidth="3" strokeLinecap="round" />

      <path d="M366 150H390V240A12 12 0 0 1 366 240Z" fill={liquid} fillOpacity="0.9" />
      <path d="M366 70V240A12 12 0 0 0 390 240V70" {...glass} />
      <path d="M363 70H393" stroke="rgb(255 255 255 / 0.85)" strokeWidth="3" strokeLinecap="round" />

      {/* drop */}
      <path d="M210 8c-5 8-8 12-8 17a8 8 0 0 0 16 0c0-5-3-9-8-17Z" fill="#b3d9c3" />
    </svg>
  );
}
