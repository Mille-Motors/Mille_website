/**
 * Brand glyphs lucide no longer ships. Drawn to sit next to lucide's
 * 24-grid, 1.5 stroke style so the icon set stays consistent.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

export function InstagramIcon({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsappIcon({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3.5 20.5l1.3-4.1A8.2 8.2 0 1 1 8 19.4l-4.5 1.1Z" />
      <path d="M9 8.4c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.7l-.4.4c-.2.2-.2.4 0 .7a7 7 0 0 0 2.6 2.2c.3.1.5.1.7-.1l.5-.6c.2-.2.4-.2.6-.1l1.5.8c.3.2.4.3.4.5 0 .6-.4 1.4-1 1.7-.6.3-1.4.3-2.5-.1a10 10 0 0 1-4.6-4c-.6-1-.7-1.9-.6-2.5.1-.6.4-1 .5-1.2Z" />
    </svg>
  );
}
