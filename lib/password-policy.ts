export const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A–Z)",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lower",
    label: "One lowercase letter (a–z)",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "One special character (!@#$…)",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function passwordMeetsPolicy(value: string): boolean {
  return PASSWORD_REQUIREMENTS.every((item) => item.test(value));
}
