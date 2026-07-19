type Props = {
  className?: string;
  /** Accessible name — the SVG is meaningful content (a link's label), not decorative. */
  label: string;
};

/**
 * The app wordmark as inline SVG rather than an `<img>`.
 *
 * The text uses `fill="currentColor"` so it follows the surrounding text colour and
 * stays legible in both light and dark themes. An `<img src>` breaks that — `currentColor`
 * there resolves to the SVG's own default (black), so the wordmark vanished on the dark
 * sidebar. Inlining it lets the colour inherit (e.g. `text-sidebar-foreground`). The mark
 * keeps its fixed brand colours.
 */
export function Logo({ className, label }: Props) {
  return (
    <svg viewBox="0 0 176 40" role="img" aria-label={label} className={className}>
      <rect width="40" height="40" rx="9" fill="#0958d9" />
      <path
        fill="#fff"
        d="M11 13.5A2.5 2.5 0 0 1 13.5 11h13a2.5 2.5 0 0 1 2.5 2.5v3.1a.9.9 0 0 1-.62.86 2.7 2.7 0 0 0 0 5.08.9.9 0 0 1 .62.86v3.1a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 11 26.5v-3.1a.9.9 0 0 1 .62-.86 2.7 2.7 0 0 0 0-5.08.9.9 0 0 1-.62-.86Z"
      />
      <path
        stroke="#0958d9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2.4 3"
        d="M20 14.5v11"
      />
      <text
        x="52"
        y="20.5"
        fill="currentColor"
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
        fontSize="15"
        fontWeight="600"
      >
        Help Desk
      </text>
      <text
        x="52"
        y="32"
        fill="currentColor"
        opacity="0.6"
        fontFamily="'Be Vietnam Pro', system-ui, sans-serif"
        fontSize="9"
        fontWeight="400"
        letterSpacing="1.4"
      >
        SUPPORT
      </text>
    </svg>
  );
}
