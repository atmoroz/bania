import type { ComponentProps } from "react";

import { cn } from "@/shared/lib";

/**
 * The venue's emblem, drawn rather than photographed.
 *
 * The same badge as `public/images/logo.png` — the chan over live fire,
 * whisks, the winding road — but as SVG, so the flames flicker, the steam
 * rises and embers drift. It is inline rather than an `<img src="logo.svg">`
 * because an image is an island: the page's fonts do not reach inside it, so
 * the wordmark would fall back to whatever serif the device happens to have.
 *
 * The animation lives in `globals.css` under `logo-*`, and stops entirely
 * when the visitor has asked for less motion.
 *
 * `id` prefixes every gradient and filter. SVG ids are global to the
 * document, and the emblem appears twice on every page: without distinct
 * prefixes the footer would be painted with the header's gradients, and
 * would lose them if the header ever stopped being rendered.
 */
export function LogoMark({
  id,
  className,
  title,
  ...props
}: ComponentProps<"svg"> & { id: string; title: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      role="img"
      aria-label={title}
      className={cn("block size-full", className)}
      {...props}
    >
      <defs>
        <linearGradient
          id={`${id}-glowGold`}
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#ffe8a3" />
          <stop offset="60%" stopColor="#f5b842" />
          <stop offset="100%" stopColor="#e0961b" />
        </linearGradient>
        <linearGradient
          id={`${id}-brightGold`}
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fff5db" />
          <stop offset="30%" stopColor="#ffd285" />
          <stop offset="70%" stopColor="#e5aa52" />
          <stop offset="100%" stopColor="#c48a3c" />
        </linearGradient>
        <linearGradient
          id={`${id}-fireGrad1`}
          x1="0%"
          x2="0%"
          y1="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#d42e00" />
          <stop offset="35%" stopColor="#ff5900" />
          <stop offset="70%" stopColor="#ffb81c" />
          <stop offset="100%" stopColor="#fff9d6" />
        </linearGradient>
        <linearGradient
          id={`${id}-fireGrad2`}
          x1="0%"
          x2="0%"
          y1="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#e64600" />
          <stop offset="45%" stopColor="#ff8c00" />
          <stop offset="80%" stopColor="#ffcf40" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient
          id={`${id}-innerCoreFire`}
          x1="0%"
          x2="0%"
          y1="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#ff9900" />
          <stop offset="50%" stopColor="#ffe680" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient
          id={`${id}-steamGradAnim`}
          x1="0%"
          x2="0%"
          y1="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#f5b842" stopOpacity="0" />
          <stop offset="30%" stopColor="#fff2db" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter
          height="160%"
          id={`${id}-flameGlow`}
          width="160%"
          x="-30%"
          y="-30%"
        >
          <feGaussianBlur result="blur" stdDeviation="6" />
          <feColorMatrix
            result="fireColor"
            type="matrix"
            values="1 0 0 0 1   0 0.5 0 0 0.4   0 0 0 0 0.1   0 0 0 0.9 0"
          />
          <feMerge>
            <feMergeNode in="fireColor" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          height="120%"
          id={`${id}-badgeShadow`}
          width="120%"
          x="-10%"
          y="-10%"
        >
          <feDropShadow
            dx="0"
            dy="5"
            floodColor="#000000"
            floodOpacity="0.8"
            stdDeviation="10"
          />
        </filter>
      </defs>
      <circle
        cx="300"
        cy="300"
        fill="#181b15"
        filter={`url(#${id}-badgeShadow)`}
        r="286"
        stroke={`url(#${id}-glowGold)`}
        strokeWidth="4.5"
      />
      <circle
        cx="300"
        cy="300"
        fill="none"
        opacity="0.85"
        r="274"
        stroke="#ffe396"
        strokeDasharray="6 6"
        strokeWidth="1.8"
      />
      <circle
        cx="300"
        cy="300"
        fill="none"
        opacity="0.6"
        r="260"
        stroke={`url(#${id}-glowGold)`}
        strokeWidth="1.5"
      />
      <radialGradient cx="50%" cy="46%" id={`${id}-centerWarmthAnim`} r="45%">
        <stop offset="0%" stopColor="#ff7b00" stopOpacity="0.32" />
        <stop offset="40%" stopColor="#f5b842" stopOpacity="0.18" />
        <stop offset="75%" stopColor="#f5b842" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#181b15" stopOpacity="0" />
      </radialGradient>
      <circle
        className="logo-warmth"
        cx="300"
        cy="275"
        fill={`url(#${id}-centerWarmthAnim)`}
        r="230"
      />
      <g fill={`url(#${id}-glowGold)`}>
        <polygon points="300,26 306,40 320,40 309,49 313,62 300,54 287,62 291,49 280,40 294,40" />
        <polygon points="300,574 306,560 320,560 309,551 313,538 300,546 287,538 291,551 280,560 294,560" />
        <polygon points="26,300 40,306 40,320 49,309 62,313 54,300 62,287 49,291 40,280 40,294" />
        <polygon points="574,300 560,306 560,320 551,309 538,313 546,300 538,287 551,291 560,280 560,294" />
      </g>
      <g id="road-lines">
        <path
          d="M 195,315 C 225,355 210,385 300,385 C 385,385 370,425 405,450"
          fill="none"
          opacity="0.9"
          stroke={`url(#${id}-glowGold)`}
          strokeDasharray="5 7"
          strokeLinecap="round"
          strokeWidth="3.5"
        />
        <path
          d="M 235,325 C 260,355 250,375 300,375 C 345,375 340,405 365,450"
          fill="none"
          opacity="0.7"
          stroke="#ffe396"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </g>
      <g id="main-symbol" transform="translate(0, -38)">
        <g id="animated-steam">
          <path
            className="logo-steam-1"
            d="M 264,185 C 256,145 284,128 270,98 C 262,78 280,58 272,38"
            fill="none"
            stroke={`url(#${id}-steamGradAnim)`}
            strokeLinecap="round"
            strokeWidth="5.5"
          />
          <path
            className="logo-steam-2"
            d="M 300,180 C 316,140 286,118 308,84 C 318,62 296,44 304,24"
            fill="none"
            stroke={`url(#${id}-steamGradAnim)`}
            strokeLinecap="round"
            strokeWidth="7"
          />
          <path
            className="logo-steam-3"
            d="M 336,185 C 344,145 316,128 330,98 C 338,78 320,58 328,38"
            fill="none"
            stroke={`url(#${id}-steamGradAnim)`}
            strokeLinecap="round"
            strokeWidth="5.5"
          />
        </g>
        <g fill={`url(#${id}-glowGold)`}>
          <path d="M 180,225 C 160,215 152,190 170,178 C 184,196 192,212 180,225 Z" />
          <path d="M 168,200 C 148,194 138,170 154,158 C 170,174 176,188 168,200 Z" />
          <path d="M 198,240 C 180,236 170,220 186,204 C 200,218 206,230 198,240 Z" />
          <circle cx="170" cy="178" r="3" />
          <path
            d="M 205,250 C 192,232 174,210 150,174"
            fill="none"
            stroke={`url(#${id}-glowGold)`}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path d="M 420,225 C 440,215 448,190 430,178 C 416,196 408,212 420,225 Z" />
          <path d="M 432,200 C 452,194 462,170 446,158 C 430,174 424,188 432,200 Z" />
          <path d="M 402,240 C 420,236 430,220 414,204 C 400,218 394,230 402,240 Z" />
          <circle cx="430" cy="178" r="3" />
          <path
            d="M 395,250 C 408,232 426,210 450,174"
            fill="none"
            stroke={`url(#${id}-glowGold)`}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </g>
        <ellipse
          cx="300"
          cy="205"
          fill="#1e221b"
          rx="98"
          ry="19"
          stroke={`url(#${id}-glowGold)`}
          strokeWidth="4.5"
        />
        <ellipse
          cx="300"
          cy="204"
          fill="#2d382e"
          rx="88"
          ry="13"
          stroke="#ffe396"
          strokeWidth="2"
        />
        <ellipse cx="300" cy="204" fill="#3b4d40" rx="80" ry="9" />
        <path
          d="M 204,208 C 210,285 244,310 300,310 C 356,310 390,285 396,208 Z"
          fill="#1c2019"
          stroke={`url(#${id}-glowGold)`}
          strokeLinejoin="round"
          strokeWidth="4.5"
        />
        <path
          d="M 220,248 C 245,268 272,277 300,277 C 328,277 355,268 380,248"
          fill="none"
          stroke={`url(#${id}-glowGold)`}
          strokeDasharray="3 7"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <g
          fill="#161813"
          stroke={`url(#${id}-glowGold)`}
          strokeLinecap="round"
          strokeWidth="3.5"
        >
          <path d="M 210,344 L 390,320" />
          <path d="M 210,320 L 390,344" />
          <ellipse
            cx="210"
            cy="332"
            rx="5"
            ry="12"
            transform="rotate(-10 210 332)"
          />
          <ellipse
            cx="390"
            cy="332"
            rx="5"
            ry="12"
            transform="rotate(10 390 332)"
          />
        </g>
        <g>
          <circle
            className="logo-spark-1"
            cx="280"
            cy="300"
            fill="#fff7b8"
            filter={`url(#${id}-flameGlow)`}
            r="3.2"
          />
          <circle
            className="logo-spark-2"
            cx="320"
            cy="295"
            fill="#ffd454"
            filter={`url(#${id}-flameGlow)`}
            r="2.8"
          />
          <circle
            className="logo-spark-3"
            cx="295"
            cy="285"
            fill="#ffffff"
            filter={`url(#${id}-flameGlow)`}
            r="3.5"
          />
        </g>
        <g filter={`url(#${id}-flameGlow)`}>
          <path
            className="logo-fire-left"
            d="M 246,328 C 250,305 264,295 271,275 C 277,295 288,308 281,328 Z"
            fill={`url(#${id}-fireGrad1)`}
          />
          <path
            className="logo-fire-right"
            d="M 330,328 C 325,302 339,292 344,272 C 349,294 358,308 351,328 Z"
            fill={`url(#${id}-fireGrad1)`}
          />
          <path
            className="logo-fire-main"
            d="M 268,326 C 258,282 282,266 290,238 C 298,266 318,278 308,326 Z"
            fill={`url(#${id}-fireGrad2)`}
          />
          <path
            className="logo-fire-main"
            d="M 290,326 C 288,296 300,284 305,260 C 315,280 328,294 322,326 Z"
            fill={`url(#${id}-innerCoreFire)`}
            opacity="0.95"
          />
          <path
            className="logo-fire-white"
            d="M 288,326 C 290,300 297,288 300,272 C 304,290 311,300 308,326 Z"
            fill="#ffffff"
          />
        </g>
      </g>
      <line
        stroke={`url(#${id}-glowGold)`}
        strokeWidth="2.5"
        x1="130"
        x2="210"
        y1="388"
        y2="388"
      />
      <circle cx="218" cy="388" fill={`url(#${id}-glowGold)`} r="4" />
      <line
        stroke={`url(#${id}-glowGold)`}
        strokeWidth="2.5"
        x1="390"
        x2="470"
        y1="388"
        y2="388"
      />
      <circle cx="382" cy="388" fill={`url(#${id}-glowGold)`} r="4" />
      <text
        fill="#ffdf88"
        fontFamily="var(--font-heading)"
        fontSize="13"
        fontWeight="800"
        letterSpacing="5"
        textAnchor="middle"
        x="300"
        y="380"
      >
        АВТЕНТИЧНИЙ ВІДПОЧИНОК
      </text>
      <text
        fill={`url(#${id}-glowGold)`}
        fontFamily="var(--font-heading)"
        fontSize="34"
        fontWeight="900"
        letterSpacing="5"
        textAnchor="middle"
        x="300"
        y="440"
      >
        СТАРА ДОРОГА
      </text>
      <text
        fill="#ffffff"
        fontFamily="var(--font-sans)"
        fontSize="12"
        fontWeight="800"
        letterSpacing="4.5"
        textAnchor="middle"
        x="300"
        y="475"
      >
        БАНЯ НА ДРОВАХ • ЧАН • БАСЕЙН
      </text>
      <g transform="translate(0, 18)">
        <path
          d="M 255,496 Q 300,506 345,496"
          fill="none"
          stroke={`url(#${id}-glowGold)`}
          strokeWidth="2"
        />
        <circle cx="300" cy="501" fill={`url(#${id}-glowGold)`} r="3.2" />
        <text
          fill="#ffdf88"
          fontFamily="var(--font-sans)"
          fontSize="10.5"
          fontWeight="800"
          letterSpacing="4"
          textAnchor="middle"
          x="300"
          y="525"
        >
          ЖИВИЙ ПАР ТА ТИША
        </text>
      </g>
    </svg>
  );
}
