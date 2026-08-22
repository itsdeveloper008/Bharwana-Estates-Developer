import { z } from "zod";

export const inquiryFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
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
  price: z.number().positive("Enter a price"),
  areaSqft: z.number().positive("Enter the covered area"),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  address: z.string().min(6, "Enter a street address"),
  city: z.string().min(2, "Select a city"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(5, "Enter your email or phone"),
});

export const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["BUYER", "HOUSE_OWNER"]),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const userLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type UserLoginValues = z.infer<typeof userLoginSchema>;

export const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const teamMemberFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role is required"),
  bio: z.string().max(150, "Bio must be 150 characters or fewer"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email")]),
  linkedinUrl: z.union([z.literal(""), z.string().url("Enter a valid URL")]),
  photoUrl: z.string(),
});

export type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;
