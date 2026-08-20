import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/properties", label: "Residences" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/owner/add-property", label: "List a property" },
  { href: "/login", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="border-t border-forest/10 bg-forest text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Bharwana" width={48} height={48} className="h-12 w-12 object-contain" />
            <div>
              <p className="font-display text-sm tracking-crest">BHARWANA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Estates Developer</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">
            Private homes and developer-verified residences, presented with the same care as the buildings themselves.
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Atelier</p>
          <p className="mt-4 text-sm text-ivory/80">
            14-C, Gulberg III
            <br />
            Lahore, Pakistan
          </p>
          <p className="mt-3 text-sm text-ivory/80">+92 42 111 224 000</p>
          <p className="text-sm text-ivory/80">hello@bharwana.example</p>
        </div>
      </div>
      <div className="gold-rule" />
      <p className="px-4 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-ivory/50">
        © {new Date().getFullYear()} Bharwana Estates Developer
      </p>
    </footer>
  );
}
