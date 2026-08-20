import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-forest lg:block">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
          alt=""
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-ivory">
          <p className="font-display text-sm tracking-crest text-gold">BHARWANA</p>
          <p className="mt-3 font-serif text-4xl">A key, passed quietly.</p>
        </div>
      </div>
      <div className="flex flex-col bg-ivory px-6 py-10">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <Image src="/logo.png" alt="Bharwana" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="font-display text-xs tracking-crest text-forest">BHARWANA</span>
        </Link>
        <div className="mx-auto w-full max-w-md flex-1">{children}</div>
      </div>
    </div>
  );
}
