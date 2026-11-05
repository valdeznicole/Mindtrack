import ProfilePortrait from './ProfilePortrait';

// A layered interpretation of the supplied reference. The hair becomes the page
// background; each ornament has independent reveal and ambient transforms.
function Ornament({ x, y, scale = 1, angle = 0, delay = 0.5, motion = 'float', children, extra = false }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} className={extra ? 'welcome-extra-detail' : undefined}>
      <g className="welcome-decoration" style={{ '--reveal-delay': `${delay}s` }}>
        <g className={`welcome-ambient welcome-${motion}`} style={{ '--motion-duration': `${7 + delay * 5}s`, '--motion-delay': `${1.8 + delay}s` }}>{children}</g>
      </g>
    </g>
  );
}
function Flower() {
  return <><path d="M0-11C-24-42-41-13-21 1C-48 13-23 41-7 23C-1 50 29 33 19 14C49 15 46-18 21-13C26-43 0-46 0-11Z" fill="#8ac9ac" /><circle cy="5" r="10" stroke="#e3f2d9" strokeWidth="3" /></>;
}
function Heart() { return <path d="M0 25C-52-7-23-43 0-15C22-44 51-9 0 25Z" fill="#8ac9ac" />; }
function Leaf() {
  return <><path d="M-34 27C-30 4-13-28-3-24C6-20-7 0-9 6C15-17 38-26 42-16C45-8 22 6 10 13C40 2 61 8 57 18C53 29 24 30 12 28C30 37 39 48 30 52C15 58-14 31-34 27Z" fill="#a3d4b8" /><path d="M-37 29 25 0" stroke="#e3f2d9" strokeWidth="2" strokeLinecap="round" /></>;
}
function Sprig() {
  return <><path d="M-34 32Q6 13 20-25" stroke="#9acaad" strokeWidth="2" /><path d="M-7 17C-33 15-39-6-34-18C-15-11-9 2-7 17M4 6C-3-17 3-35 14-39C22-18 15-2 4 6" fill="#72ad90" /><path d="M15-8C7-31 19-55 28-49C35-44 25-24 25-24C44-42 53-29 39-16C58-26 67-10 46-5C34-3 21-6 15-8Z" fill="#b4d9be" /></>;
}
function Note() {
  return <g stroke="#acd5b9" strokeWidth="2" strokeLinejoin="round"><path d="m-10 10 9-35 27 6-10 35M-4-15l27 6" /><ellipse cx="-17" cy="12" rx="7" ry="11" transform="rotate(-35 -17 12)" /><ellipse cx="9" cy="18" rx="7" ry="11" transform="rotate(-35 9 18)" /></g>;
}

// These accents follow the expanded panel's open spaces, beyond the portrait
// canvas. Separate zones keep them above, beside and below the centered copy.
export function ExpandedHairAccents() {
  return (
    <div className="auth-hair-accents" aria-hidden="true">
      <svg className="auth-hair-accents-top" viewBox="0 0 500 180" fill="none" focusable="false">
        <Ornament x={44} y={95} scale={0.58} angle={-12} delay={0.55}><Note /></Ornament>
        <Ornament x={113} y={44} scale={0.6} angle={15} delay={0.7}><Flower /></Ornament>
        <Ornament x={180} y={122} scale={0.5} angle={-18} delay={0.6}><Heart /></Ornament>
        <Ornament x={249} y={55} scale={0.55} angle={10} delay={0.8}><Note /></Ornament>
        <Ornament x={326} y={120} scale={0.68} angle={-12} delay={0.65}><Flower /></Ornament>
        <Ornament x={388} y={42} scale={0.45} angle={18} delay={0.85}><Heart /></Ornament>
        <Ornament x={457} y={98} scale={0.55} angle={-8} delay={0.75}><Note /></Ornament>
      </svg>
      <svg className="auth-hair-accents-side" viewBox="0 0 80 500" fill="none" focusable="false">
        <Ornament x={34} y={42} scale={0.58} angle={12} delay={0.6}><Flower /></Ornament>
        <Ornament x={48} y={166} scale={0.55} angle={-15} delay={0.8}><Heart /></Ornament>
        <Ornament x={33} y={294} scale={0.6} angle={-8} delay={0.65}><Note /></Ornament>
        <Ornament x={48} y={431} scale={0.52} angle={-12} delay={0.85}><Flower /></Ornament>
      </svg>
      <svg className="auth-hair-accents-bottom" viewBox="0 0 500 220" fill="none" focusable="false">
        <Ornament x={48} y={53} scale={0.62} angle={-14} delay={0.7}><Heart /></Ornament>
        <Ornament x={89} y={162} scale={0.57} angle={12} delay={0.9}><Note /></Ornament>
        <Ornament x={167} y={86} scale={0.73} angle={-8} delay={0.75}><Flower /></Ornament>
        <Ornament x={252} y={170} scale={0.52} angle={18} delay={0.85}><Heart /></Ornament>
        <Ornament x={285} y={41} scale={0.6} angle={-12} delay={0.65}><Note /></Ornament>
        <Ornament x={371} y={117} scale={0.65} angle={14} delay={0.8}><Flower /></Ornament>
        <Ornament x={441} y={51} scale={0.5} angle={-18} delay={0.9}><Heart /></Ornament>
        <Ornament x={464} y={180} scale={0.45} angle={8} delay={0.75}><Note /></Ornament>
      </svg>
    </div>
  );
}

export default function WelcomeIllustration({ compact = false, stationaryPortrait = false }) {
  return (
    <svg className="welcome-illustration" viewBox={compact ? '20 310 730 650' : '0 0 1440 960'} preserveAspectRatio={compact ? 'xMidYMid meet' : 'xMinYMax slice'} fill="none" aria-hidden="true" focusable="false">
      <g className="welcome-flow">
        <path d="M-20-20H1460V980H-20Z" fill={compact ? '#163f36' : '#f6f4e7'} />
        {compact && <path d="M90 424C40 398-3 474 24 560C57 662 40 759 20 823C-8 890 46 956 134 980H580C637 972 640 904 594 856C550 811 490 855 473 788C455 720 383 654 300 625C254 604 246 532 207 482C173 438 134 447 90 424Z" fill="#f6f4e7" />}
        <path d="M524-20C431 20 469 101 411 169C378 208 330 162 286 181C239 200 244 247 247 283C211 302 128 276 113 333C97 365 126 398 110 430C88 475 135 485 133 526C129 569 163 614 208 641C260 674 257 733 310 751C361 772 411 745 462 795C502 833 543 811 571 791C638 744 679 779 717 811C757 842 813 828 829 888L844 980H1460V-20Z" fill="#28594c" />
        <path d="M610-20C503 30 550 123 473 177C430 211 366 192 348 237C334 272 365 304 330 342C300 374 229 362 211 411C194 459 254 488 271 525C300 583 325 620 379 634C430 648 422 709 473 733C529 758 582 704 621 741C661 779 692 723 727 726C777 730 768 763 810 748C868 726 889 698 931 722C1003 764 1015 817 1097 815C1175 813 1242 799 1316 825C1399 854 1397 920 1460 937V-20Z" fill="#163f36" />
        <path d="M112 427C143 403 91 330 135 305C170 284 220 308 214 263C204 216 214 169 270 153" stroke="#28594c" strokeWidth="3" strokeLinecap="round" />
        <path d="M491 757C570 799 596 730 640 755C675 776 700 747 719 747C748 746 758 786 799 761C864 722 886 703 930 733C1007 783 1019 839 1111 827" stroke="#3a705f" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      </g>
      <g className="welcome-art-parallax">
        <g className="welcome-strands welcome-ambient">
          <path d="M261 467C343 440 290 570 389 551C432 544 468 533 506 535M267 495C346 504 321 581 399 574C439 570 493 549 532 562M347 442C401 426 418 359 450 355M477 382C501 345 543 331 593 335M583 580C608 616 607 678 660 694" stroke="#acd5b9" strokeWidth="2" strokeLinecap="round" />
          <path d="m517 535 24 5m-55-132 8-13m112-61 29-9M441 356q10-4 18-1" stroke="#acd5b9" strokeWidth="2" strokeLinecap="round" />
        </g>
        {!stationaryPortrait && <g className="welcome-person"><ProfilePortrait /></g>}
        <Ornament x={490} y={147} scale={0.65} angle={12} delay={0.4}><Heart /></Ornament>
        <Ornament x={556} y={213} scale={0.65} angle={-65} delay={0.55} motion="sway"><Leaf /></Ornament>
        <Ornament x={328} y={287} scale={0.62} delay={0.45}><Flower /></Ornament>
        <Ornament x={783} y={199} scale={0.8} delay={0.65}><Flower /></Ornament>
        <Ornament x={632} y={246} scale={0.42} delay={0.8}><Flower /></Ornament>
        <Ornament x={441} y={317} scale={0.45} delay={0.7}><Flower /></Ornament>
        <Ornament x={539} y={344} scale={0.92} angle={-27} delay={0.6}><Heart /></Ornament>
        <Ornament x={860} y={227} scale={0.95} angle={-20} delay={0.8} motion="sway"><Leaf /></Ornament>
        <Ornament x={843} y={388} scale={0.48} delay={0.9}><Flower /></Ornament>
        <Ornament x={221} y={418} scale={0.45} delay={0.7}><Flower /></Ornament>
        <Ornament x={286} y={362} scale={0.8} angle={-68} delay={0.65} motion="sway"><Sprig /></Ornament>
        <Ornament x={86} y={743} scale={0.9} angle={-12} delay={0.75} motion="sway"><Sprig /></Ornament>
        <Ornament x={817} y={672} scale={0.85} angle={7} delay={0.95} motion="sway"><Sprig /></Ornament>
        <Ornament x={681} y={639} scale={0.85} delay={0.85}><Flower /></Ornament>
        <Ornament x={620} y={871} scale={0.85} delay={1}><Flower /></Ornament>
        <Ornament x={845} y={794} scale={0.6} angle={-55} delay={0.9} motion="sway"><Leaf /></Ornament>
        <Ornament x={482} y={614} scale={0.7} angle={34} delay={0.8}><Heart /></Ornament>
        <Ornament x={360} y={500} scale={0.6} angle={30} delay={0.55}><Heart /></Ornament>
        <Ornament x={717} y={868} scale={0.35} delay={1.1}><Heart /></Ornament>
        <Ornament x={1024} y={157} scale={0.6} angle={-15} delay={0.6} extra><Heart /></Ornament>
        <Ornament x={753} y={511} scale={0.9} angle={15} delay={0.8}><Note /></Ornament>
        <Ornament x={878} y={510} scale={0.6} angle={5} delay={1}><Note /></Ornament>
        <Ornament x={561} y={673} scale={0.7} angle={15} delay={0.7}><Note /></Ornament>
        <Ornament x={895} y={121} scale={0.6} angle={10} delay={0.6} extra><Note /></Ornament>
        <Ornament x={402} y={239} scale={0.55} angle={10} delay={0.9}><Note /></Ornament>
        {/* Smaller accents fill the open hair waves without entering the face or copy. */}
        <Ornament x={604} y={76} scale={0.38} angle={-14} delay={0.45} extra><Flower /></Ornament>
        <Ornament x={681} y={151} scale={0.34} angle={18} delay={0.65} extra><Flower /></Ornament>
        <Ornament x={185} y={352} scale={0.35} angle={-12} delay={0.55} extra><Flower /></Ornament>
        <Ornament x={362} y={395} scale={0.4} angle={15} delay={0.75}><Flower /></Ornament>
        <Ornament x={575} y={453} scale={0.5} angle={-16} delay={0.6}><Flower /></Ornament>
        <Ornament x={633} y={553} scale={0.36} angle={20} delay={0.8}><Flower /></Ornament>
        <Ornament x={526} y={746} scale={0.4} angle={-8} delay={0.9}><Flower /></Ornament>
        <Ornament x={724} y={719} scale={0.37} angle={15} delay={0.85} extra><Flower /></Ornament>
        <Ornament x={608} y={153} scale={0.36} angle={-18} delay={0.55} extra><Heart /></Ornament>
        <Ornament x={732} y={309} scale={0.5} angle={18} delay={0.75} extra><Heart /></Ornament>
        <Ornament x={612} y={382} scale={0.4} angle={-12} delay={0.65}><Heart /></Ornament>
        <Ornament x={521} y={506} scale={0.38} angle={20} delay={0.8}><Heart /></Ornament>
        <Ornament x={715} y={573} scale={0.43} angle={-15} delay={0.7}><Heart /></Ornament>
        <Ornament x={616} y={712} scale={0.38} angle={24} delay={0.9}><Heart /></Ornament>
        <Ornament x={726} y={88} scale={0.46} angle={-12} delay={0.6} extra><Note /></Ornament>
        <Ornament x={697} y={248} scale={0.42} angle={-8} delay={0.7} extra><Note /></Ornament>
        <Ornament x={487} y={431} scale={0.48} angle={-10} delay={0.85}><Note /></Ornament>
        <Ornament x={564} y={584} scale={0.46} angle={-14} delay={0.75}><Note /></Ornament>
        <Ornament x={779} y={594} scale={0.4} angle={10} delay={0.9} extra><Note /></Ornament>
        <Ornament x={716} y={789} scale={0.48} angle={-8} delay={0.8} extra><Note /></Ornament>
        <g className="welcome-petals welcome-ambient">
          {[[319,234,-15,6],[389,277,30,5],[487,280,50,9],[524,280,50,5],[629,302,65,6],[714,401,85,6],[759,432,-65,6],[689,454,85,12],[577,529,-65,10],[440,563,75,5],[475,421,55,9],[491,437,50,5],[449,396,50,5],[319,475,85,6],[723,195,60,6],[799,284,85,5],[723,48,85,5]].map(([x,y,a,r], i) => <ellipse key={i} cx={x} cy={y} rx={r / 2} ry={r} fill="#c2e0cd" transform={`rotate(${a} ${x} ${y})`} />)}
        </g>
      </g>
      {stationaryPortrait && <g className="welcome-person"><ProfilePortrait /></g>}
    </svg>
  );
}
