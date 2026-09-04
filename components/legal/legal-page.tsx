import Link from "next/link";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, intro, updated, sections }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-4xl text-forest sm:text-5xl sm:leading-[1.1]">{title}</h1>
      <div className="mt-4 h-px w-14 bg-gold/60" />
      <p className="mt-6 text-sm leading-relaxed text-forest/80 sm:text-base">{intro}</p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Last updated: {updated}
      </p>

      <div className="mt-12 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-serif text-2xl text-forest">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-forest/80 sm:text-[15px] sm:leading-[1.75]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.list && (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-forest/80 sm:text-[15px]">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-forest/10 pt-8 text-sm text-muted-foreground">
        Questions about these policies? Contact us at{" "}
        <a href="mailto:info@bharwanaestate.com" className="text-gold-700 underline-offset-2 hover:underline">
          info@bharwanaestate.com
        </a>{" "}
        or review our other policies:{" "}
        <Link href="/privacy" className="text-gold-700 underline-offset-2 hover:underline">
          Privacy
        </Link>
        ,{" "}
        <Link href="/terms" className="text-gold-700 underline-offset-2 hover:underline">
          Terms
        </Link>
        ,{" "}
        <Link href="/cookies" className="text-gold-700 underline-offset-2 hover:underline">
          Cookies
        </Link>
        ,{" "}
        <Link href="/disclaimer" className="text-gold-700 underline-offset-2 hover:underline">
          Disclaimer
        </Link>
        ,{" "}
        <Link href="/deletion-policy" className="text-gold-700 underline-offset-2 hover:underline">
          Data Deletion
        </Link>
        .
      </p>
    </article>
  );
}
