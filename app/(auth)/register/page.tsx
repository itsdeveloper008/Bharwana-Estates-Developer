import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Join</p>
      <h1 className="mt-2 font-serif text-4xl">Create an account</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Buyers and owners. Sales and admin seats are issued internally.
      </p>
      <RegisterForm />
    </>
  );
}
