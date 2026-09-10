import { z } from "zod";
import { digitsOnly, isValidPakistanMobileLocal } from "@/lib/phone-format";
import { passwordMeetsPolicy } from "@/lib/password-policy";

/** Pakistani CNIC: 13 digits, displayed as XXXXX-XXXXXXX-X (15 chars). */
export const PK_CNIC_DIGIT_LENGTH = 13;
export const PK_CNIC_FORMATTED_LENGTH = 15;

export function formatPakistanCnic(raw: string): string {
  const digits = digitsOnly(raw).slice(0, PK_CNIC_DIGIT_LENGTH);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidPakistanCnic(value: string): boolean {
  return /^\d{5}-\d{7}-\d$/.test(formatPakistanCnic(value));
}

export const pakistanMobileLocalSchema = z
  .string()
  .refine(isValidPakistanMobileLocal, "Enter a valid 10-digit mobile number");

export const passwordCreateSchema = z
  .string()
  .refine(passwordMeetsPolicy, "Password does not meet all requirements");

export const inquiryFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: pakistanMobileLocalSchema,
  message: z.string().min(12, "A short note helps the team prepare"),
  visitDate: z.string().optional(),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

export const propertyFormSchema = z.object({
  title: z.string().min(8, "Title should be at least 8 characters"),
  description: z
    .string()
    .min(40, "Give buyers a fuller picture")
    .max(1200, "Keep the description under 1,200 characters"),
  listingType: z.enum(["DIRECT_OWNER", "BUSINESS"]),
  purpose: z.enum(["SALE", "RENT"]),
  category: z.enum(["HOME", "PLOTS", "COMMERCIAL"]),
  subtype: z.string().min(2, "Select a property type"),
  price: z.number().positive("Enter a price"),
  areaSqft: z.number().positive("Enter the covered area"),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  address: z.string().min(6, "Enter a street address"),
  city: z.string().min(2, "Select a city"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contactPhone: pakistanMobileLocalSchema,
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(5, "Enter your email or phone"),
});

export const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Enter your name")
      .max(50, "Name must be 50 characters or fewer"),
    email: z
      .string()
      .max(50, "Email must be 50 characters or fewer")
      .email("Enter a valid email"),
    phone: pakistanMobileLocalSchema,
    password: passwordCreateSchema,
    role: z.enum(["BUYER", "HOUSE_OWNER", "DEALER"]),
    agencyName: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "DEALER") return;
    if (!data.agencyName || data.agencyName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your agency or company name",
        path: ["agencyName"],
      });
    }
    const cnic = data.registrationNumber?.trim() ?? "";
    if (!isValidPakistanCnic(cnic)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid 13-digit CNIC (e.g. 34201-1234567-1)",
        path: ["registrationNumber"],
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Sign-in only — do not enforce create-password complexity on existing credentials. */
export const userLoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(50, "Email must be 50 characters or fewer")
    .email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type UserLoginValues = z.infer<typeof userLoginSchema>;

export const phoneOtpRequestSchema = z.object({
  phone: pakistanMobileLocalSchema,
});

export const phoneOtpVerifySchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

export type PhoneOtpRequestValues = z.infer<typeof phoneOtpRequestSchema>;
export type PhoneOtpVerifyValues = z.infer<typeof phoneOtpVerifySchema>;

export const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const teamMemberFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role is required"),
  photoUrl: z.string(),
});

export type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;
