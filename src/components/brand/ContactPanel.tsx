import { Wordmark } from "@/components/brand/Logo";
import { Rule } from "@/components/ui/Rule";
import { site } from "@/data/site";

/**
 * The contact page's right-hand piece: a fragment of MILLE identity, not a
 * photograph. Desktop/tablet only — see the `hidden lg:flex` where this is
 * used; mobile stays form-only.
 *
 * The shield graphic is deliberately left out here. It's solid burgundy fill
 * with a cream border and "M" — on a burgundy panel the fill disappears into
 * the background, leaving only the cream border line and letters floating
 * with no visible edge. Same problem, same fix as the House of Motor Culture
 * plate on the home page: the wordmark alone carries the mark cleanly: no
 * new asset, no altered logo, just the one part of it that reads on this
 * background.
 */
export function ContactPanel() {
  return (
    <div className="relative hidden min-h-[32rem] flex-col items-center justify-center gap-10 bg-burgundy px-10 py-16 text-center lg:flex">
      <div>
        <Wordmark
          tone="cream"
          className="text-[clamp(2.25rem,3.2vw,3rem)] tracking-[0.24em]"
        />
        <p className="label-caps mt-4 text-cream/60">House of Motor Culture</p>
      </div>

      <Rule className="bg-cream/25" />

      <p className="max-w-[15rem] font-display text-[clamp(1.5rem,2.4vw,1.875rem)] leading-[1.3] text-cream uppercase">
        Más que carros,
        <br />
        es un estilo de vida.
      </p>

      <p className="eyebrow absolute bottom-12 text-cream/45">
        {site.city}, {site.country}
      </p>
    </div>
  );
}
