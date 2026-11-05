import { useId } from 'react';
import referenceArtwork from '../../assets/illustrations/welcome-reference.png';

// Display the actual portrait from the supplied reference, preserving its face,
// expression and hands. The SVG crop excludes the reference's text/navigation;
// the surrounding flowing shapes and ornaments remain independent SVG layers.
export default function ProfilePortrait() {
  const id = useId();
  const cropId = `${id}-portrait-crop`;
  const paletteId = `${id}-portrait-palette`;

  return (
    <g transform="scale(1.2)">
      <defs>
        <clipPath id={cropId}>
          <path d="M132 389C147 391 157 394 177 397C203 399 217 411 231 434C261 452 293 466 310 494C333 523 326 546 354 560C395 568 417 592 425 628C435 675 435 721 440 754L440 810H60C75 784 81 764 87 742C87 720 92 714 90 701C89 691 94 685 98 678C92 666 97 656 105 651C94 641 105 629 119 625C126 607 132 593 141 586C132 588 117 590 113 581C107 563 104 544 102 527L98 510C90 503 88 491 94 483C98 478 105 474 110 471L101 459L117 455C119 437 121 412 132 389Z" />
        </clipPath>
        <filter id={paletteId} filterUnits="userSpaceOnUse" x="60" y="380" width="380" height="420" colorInterpolationFilters="sRGB">
          {/* Blue ink has B > R; skin has R > B. Preserve the skin pixels. */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -10 0 10 0 0" result="ink-mask" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  31.875 0 0 0 -4.375" result="light-ink-mask" />
          <feFlood floodColor="#28594c" result="light-ink" />
          <feComposite in="light-ink" in2="light-ink-mask" operator="in" result="light-ink-shape" />
          <feFlood floodColor="#163f36" result="dark-ink" />
          <feMerge result="emerald-ink"><feMergeNode in="dark-ink" /><feMergeNode in="light-ink-shape" /></feMerge>
          <feComposite in="emerald-ink" in2="ink-mask" operator="in" result="recolored-ink" />
          {/* Match the narrow original paper highlights to the page's cream. */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 20 0 0 -18" result="paper-mask" />
          <feFlood floodColor="#f6f4e7" result="paper" />
          <feComposite in="paper" in2="paper-mask" operator="in" result="recolored-paper" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="recolored-paper" /><feMergeNode in="recolored-ink" /></feMerge>
        </filter>
      </defs>
      <g clipPath={`url(#${cropId})`}>
        <image className="welcome-reference-portrait" href={referenceArtwork} x="0" y="0" width="1200" height="800" preserveAspectRatio="xMidYMid meet" filter={`url(#${paletteId})`} />
      </g>
    </g>
  );
}
