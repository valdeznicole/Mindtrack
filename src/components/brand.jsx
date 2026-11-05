import markSmall from '../assets/logo/mark-sm.webp';
import markLarge from '../assets/logo/mark.webp';
import logoFull from '../assets/logo/logo-full.webp';
import logoFullLight from '../assets/logo/logo-full-light.webp';

// MindTrack logo: a green awareness ribbon that flows under the "MindTrack" wordmark (src/assets/logo, made
// from pictures/logo-source.png). The wordmark is part of the image. `logo-full-light` has a cream "Mind" for
// dark backgrounds; the mark is the ribbon loop alone, for tight spaces.
export { markLarge };

export function Logo({ size = 36, text = true }) {
  return (
    <span className={`logo ${text ? '' : 'logo-mark-only'}`} style={{ '--logo-h': `${Math.round(size * 1.3)}px` }}>
      {text && <img className="logo-full on-light" src={logoFull} alt="" draggable="false" />}
      {text && <img className="logo-full on-dark" src={logoFullLight} alt="" draggable="false" />}
      <img className="logo-mark" src={markSmall} alt="" draggable="false" />
    </span>
  );
}

// ---------- Sign-in intro scene ----------
// Original MindTrack illustration for the sign-in panel: a student taking a calm moment with a warm drink,
// framed by a soft sun, organic waves, line-drawn leaves and a few flowers. Drawn to sit on the panel's sage
// gradient and anchored bottom-right, so the headline has open space at the top left.

// A line-drawn branch: a curved stem with alternating leaves along it.
function Branch({ d, leaves, stroke = '#4E8570', fill = '#BFDCCB', fill2 = '#E3EFD2', className = '' }) {
  return (
    <g className={className}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      {leaves.map(([x, y, angle, size = 1], i) => (
        <path
          key={i}
          d="M0 0C9-10 11-27 0-44C-11-27-9-10 0 0Z"
          transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}
          fill={i % 2 ? fill2 : fill}
          stroke={stroke}
          strokeWidth={2 / size}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function Flower({ x, y, scale = 1, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 70Q-4 30 0 0" fill="none" stroke="#4E8570" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-4 -30L-9 -54M4 -30L10 -56M0 -30V-60" stroke="#4E8570" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="-9" cy="-55" r="2.4" fill="#4E8570" />
      <circle cx="10" cy="-57" r="2.4" fill="#4E8570" />
      <circle cx="0" cy="-61" r="2.4" fill="#4E8570" />
      <path d="M0 4C-20 0-30-22-24-44C-14-34-6-22 0-4Z" fill="url(#wsPetal)" />
      <path d="M0 4C20 0 30-22 24-44C14-34 6-22 0-4Z" fill="url(#wsPetal)" />
      <path d="M0 4C-12-6-12-34 0-48C12-34 12-6 0 4Z" fill="url(#wsPetalFront)" />
    </g>
  );
}

// Four-point twinkle.
function Sparkle({ x, y, s = 1, delay = 0 }) {
  const a = 14 * s;
  const b = 2 * s;
  return (
    <path
      className="scene-sparkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - a}Q${x + b} ${y - b} ${x + a} ${y}Q${x + b} ${y + b} ${x} ${y + a}Q${x - b} ${y + b} ${x - a} ${y}Q${x - b} ${y - b} ${x} ${y - a}Z`}
      fill="#fff"
    />
  );
}

export function WellnessScene({ className = '' }) {
  return (
    <svg className={`wellness-scene ${className}`} viewBox="0 0 800 900" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="wsSun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4EAB8" />
          <stop offset="1" stopColor="#B9D3A9" />
        </linearGradient>
        <linearGradient id="wsSweater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF7EE" />
          <stop offset="1" stopColor="#EDE6D6" />
        </linearGradient>
        <linearGradient id="wsSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9D3B8" />
          <stop offset="1" stopColor="#F2BD9C" />
        </linearGradient>
        <linearGradient id="wsMug" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5E9A83" />
          <stop offset="1" stopColor="#4C846F" />
        </linearGradient>
        <linearGradient id="wsPetal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#E7685C" />
          <stop offset="1" stopColor="#F6A48C" />
        </linearGradient>
        <linearGradient id="wsPetalFront" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#EE7C6A" />
          <stop offset="1" stopColor="#FBC2A6" />
        </linearGradient>
      </defs>

      {/* Soft sun and background waves */}
      <circle cx="585" cy="470" r="215" fill="url(#wsSun)" opacity=".62" />
      <circle cx="585" cy="470" r="262" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
      <path d="M800 300C700 250 640 330 560 350C480 370 430 330 360 370C300 404 300 470 240 500L800 500Z" fill="#9CCAB5" opacity=".45" />
      <path d="M0 610C90 560 170 640 260 620C360 598 390 540 470 552C560 566 610 640 800 600V900H0Z" fill="#D6EBDF" />

      {/* Continuation to the left (only visible when the intro fills the screen) */}
      <path d="M-1600 650C-1300 560 -1000 700 -700 640C-420 584 -200 560 0 610V900H-1600Z" fill="#D6EBDF" />
      <path d="M-1600 800C-1260 730 -960 850 -640 790C-380 742 -160 780 0 760V900H-1600Z" fill="#F7F4EA" />
      <Branch className="scene-sway" d="M-260 900C-250 800 -210 720 -140 650" leaves={[[-256, 850, -48], [-250, 800, 58], [-236, 752, -44, 0.95], [-214, 706, 62, 0.9], [-186, 670, -36, 0.85]]} />
      <Flower x={-430} y={810} scale={1} rotate={5} />
      <Branch d="M-620 900C-630 830 -612 770 -570 720" leaves={[[-624, 860, 52, 0.85], [-622, 816, -40, 0.8], [-610, 776, 58, 0.75], [-594, 744, -30, 0.7]]} fill="#D5E7C8" fill2="#BFDCCB" />
      <Branch className="scene-sway delay" d="M-980 900C-975 810 -940 740 -880 680" leaves={[[-978, 856, -50], [-970, 806, 56], [-956, 760, -42, 0.9], [-932, 716, 60, 0.85]]} />
      <Flower x={-1180} y={830} scale={0.9} rotate={-8} />
      <Sparkle x={-120} y={560} s={0.8} delay={0.9} />
      <Sparkle x={-760} y={600} s={0.7} delay={2.2} />

      {/* Back plants (behind the character) */}
      <Branch className="scene-sway" d="M770 900C752 760 752 620 790 500" leaves={[[762, 800, -58], [772, 740, 52], [764, 680, -60, 0.95], [776, 620, 50, 0.9], [778, 560, -54, 0.85]]} />
      <Flower x={752} y={600} scale={0.9} rotate={8} />

      {/* Character */}
      <g className="scene-person" transform="translate(52 34)">
        {/* hair behind the head */}
        <path d="M418 468C404 382 452 330 522 328C596 326 640 384 628 470C624 520 636 560 612 594C588 610 466 612 440 592C414 566 424 520 418 468Z" fill="#3B2B27" />
        {/* body: cream knit sweater */}
        <path d="M352 900C352 760 380 676 444 646C476 632 564 632 596 646C662 676 690 760 690 900Z" fill="url(#wsSweater)" />
        <path d="M398 720C396 780 392 840 392 900M644 720C646 780 650 840 650 900" stroke="#E2D9C5" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* neck */}
        <path d="M494 560H550V632C534 644 510 644 494 632Z" fill="#EDB594" />
        {/* turtleneck collar */}
        <path d="M466 628C466 612 484 604 522 604C560 604 578 612 578 628C578 652 556 662 522 662C488 662 466 652 466 628Z" fill="#9CC9B3" />
        <path d="M478 620C498 630 546 630 566 620" stroke="#86B8A1" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* ears */}
        <ellipse cx="434" cy="486" rx="16" ry="22" fill="#F2BD9C" />
        <ellipse cx="610" cy="486" rx="16" ry="22" fill="#F2BD9C" />
        {/* face */}
        <path d="M436 470C436 408 474 376 522 376C570 376 608 408 608 470C608 540 572 580 522 580C472 580 436 540 436 470Z" fill="url(#wsSkin)" />
        {/* fringe, swept to one side */}
        <path d="M430 468C422 396 466 346 530 346C592 346 626 392 616 452C596 420 560 404 528 400C510 426 470 448 430 468Z" fill="#3B2B27" />
        <path d="M530 360C558 364 588 380 604 410" stroke="#58433D" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
        {/* leaf hair clip */}
        <g transform="translate(578 404) rotate(-28)">
          <path d="M0 0C8-9 10-24 0-38C-10-24-8-9 0 0Z" fill="#A7D3BD" stroke="#4E8570" strokeWidth="2" />
          <path d="M0-4V-32" stroke="#4E8570" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        {/* closed, content eyes */}
        <path d="M468 486C476 496 492 496 500 486M544 486C552 496 568 496 576 486" stroke="#3B2B27" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M468 470C476 464 490 464 498 468M546 468C554 464 568 464 576 470" stroke="#6B5048" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
        {/* cheeks, nose, smile */}
        <ellipse cx="470" cy="516" rx="18" ry="11" fill="#F2917F" opacity=".42" />
        <ellipse cx="574" cy="516" rx="18" ry="11" fill="#F2917F" opacity=".42" />
        <path d="M520 500C517 510 520 514 526 514" stroke="#D99478" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M506 536C516 546 532 546 542 536" stroke="#C0645A" strokeWidth="3.6" fill="none" strokeLinecap="round" />

        {/* warm drink held with both hands */}
        <g className="scene-steam" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".85">
          <path d="M506 690C496 676 516 666 506 650" />
          <path d="M540 690C530 674 552 664 542 646" />
        </g>
        <path d="M468 700H580V790C580 812 562 826 540 826H508C486 826 468 812 468 790Z" fill="url(#wsMug)" />
        <path d="M580 720C610 720 616 766 580 772" stroke="#4C846F" strokeWidth="11" fill="none" strokeLinecap="round" />
        <ellipse cx="524" cy="700" rx="56" ry="10" fill="#7DB39C" />
        <ellipse cx="524" cy="701" rx="46" ry="6" fill="#8A5A43" />
        {/* MindTrack heart on the mug */}
        <path d="M524 786C516 780 510 775 510 767A7 7 0 0 1 524 763A7 7 0 0 1 538 767C538 775 532 780 524 786Z" fill="#fff" opacity=".92" />
        {/* hands and sleeve cuffs */}
        <path d="M436 812C420 790 424 756 452 744C470 738 484 752 482 772C480 792 470 812 452 818Z" fill="#F2BD9C" />
        <path d="M612 812C628 790 624 756 596 744C578 738 564 752 566 772C568 792 578 812 596 818Z" fill="#F2BD9C" />
        <path d="M398 900C396 858 406 822 432 806C450 822 462 846 462 900Z" fill="#F4EEE2" />
        <path d="M650 900C652 858 642 822 616 806C598 822 586 846 586 900Z" fill="#F4EEE2" />
        <path d="M424 812C438 822 454 826 468 822M624 812C610 822 594 826 580 822" stroke="#E2D9C5" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      {/* Foreground: cream wave and plants */}
      <path d="M0 760C80 720 150 770 230 750C300 732 330 700 380 706C360 780 340 840 330 900H0Z" fill="#F7F4EA" />
      <Branch className="scene-sway delay" d="M110 900C112 800 150 700 230 610" leaves={[[116, 850, -48], [124, 800, 58], [138, 752, -44, 0.95], [156, 706, 62, 0.9], [178, 666, -36, 0.85], [206, 632, 70, 0.8]]} />
      <Branch d="M300 900C290 830 300 770 336 720" leaves={[[296, 860, 52, 0.85], [296, 816, -40, 0.8], [308, 776, 58, 0.75], [322, 744, -30, 0.7]]} fill="#D5E7C8" fill2="#BFDCCB" />
      <Flower x={210} y={800} scale={1.05} rotate={-6} />
      <Branch d="M790 900C760 830 740 780 760 720" leaves={[[782, 870, -60, 0.9], [768, 826, 48, 0.85], [760, 786, -58, 0.8], [760, 750, 40, 0.75]]} fill="#D5E7C8" fill2="#BFDCCB" />

      {/* Sparkles */}
      <Sparkle x={712} y={236} s={1} />
      <Sparkle x={440} y={590} s={0.75} delay={0.6} />
      <Sparkle x={776} y={420} s={0.6} delay={2} />
      <Sparkle x={260} y={600} s={0.9} delay={1.6} />
      <circle cx="640" cy="262" r="5" fill="#fff" opacity=".6" />
      <circle cx="372" cy="560" r="4" fill="#fff" opacity=".5" />
    </svg>
  );
}
