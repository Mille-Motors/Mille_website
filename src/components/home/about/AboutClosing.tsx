import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Rule } from "@/components/ui/Rule";

/** End of the brand story. */
export function AboutClosing() {
  return (
    <div className="border-t border-stone">
      <Container width="wide">
        <div className="flex flex-col items-center py-20 text-center lg:py-28">
          <Rule />
          <p className="mt-9 font-display text-[clamp(1.875rem,4.2vw,3rem)] leading-[1.15] text-ink uppercase">
            Different machines.
            <br />
            Same passion.
          </p>
          <p className="eyebrow mt-9 leading-[2] text-ink-muted">
            David Hernández · Nicolás Henao
            <br />
            Bogotá, Colombia
          </p>
          <ButtonLink
            href="/contacto"
            variant="outline"
            size="lg"
            className="mt-11"
          >
            Escríbenos
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
