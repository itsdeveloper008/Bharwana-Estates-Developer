import { z } from "zod";
import {
  AGENCY_NAME_MAX_LENGTH,
  AGENCY_NAME_MESSAGE,
  AGENCY_NAME_MIN_LENGTH,
  isValidAgencyName,
  normalizeAgencyName,
} from "@/lib/agency-name";
import { digitsOnly, isValidPakistanMobileLocal } from "@/lib/phone-format";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import {
  FULL_NAME_MAX_LENGTH,
  isLettersAndSpacesOnly,
  normalizePersonName,
  PERSON_NAME_LETTERS_MESSAGE,
} from "@/lib/person-name";
import { CITIES } from "@/lib/types";
import { AREA_UNITS, toAreaSqft, type AreaUnitId } from "@/lib/area-units";

/** Shared Full name: letters + spaces, max length, min 2 letters after normalize. */
export const personNameSchema = z
  .string()
  .max(FULL_NAME_MAX_LENGTH, `Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer`)
  .refine((value) => /^[A-Za-z\s]*$/.test(value), PERSON_NAME_LETTERS_MESSAGE)
  .refine((value) => normalizePersonName(value).length >= 2, {
    message: "Please enter your name.",
  })
  .refine((value) => isLettersAndSpacesOnly(normalizePersonName(value)), {
    message: PERSON_NAME_LETTERS_MESSAGE,
  });

/** Agency / company: letters + numbers + spaces + & - . ', max 80. */
export const agencyNameSchema = z
  .string()
  .max(AGENCY_NAME_MAX_LENGTH, `Agency name must be ${AGENCY_NAME_MAX_LENGTH} characters or fewer`)
  .refine((value) => /^[A-Za-z0-9\s&.'-]*$/.test(value), AGENCY_NAME_MESSAGE)
  .refine((value) => normalizeAgencyName(value).length >= AGENCY_NAME_MIN_LENGTH, {
    message: "Enter your agency or company name",
  })
  .refine((value) => isValidAgencyName(value), {
    message: AGENCY_NAME_MESSAGE,
  });

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
  fullName: personNameSchema,
  email: z.string().email("Enter a valid email"),
  phone: pakistanMobileLocalSchema,
  message: z.string().min(12, "A short note helps the team prepare"),
  visitDate: z.string().optional(),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

const EMPTY_REQUIRED = "This field cannot be empty or contain only spaces";

export const propertyFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, EMPTY_REQUIRED)
      .min(8, "Title should be at least 8 characters"),
    description: z
      .string()
      .trim()
      .min(1, EMPTY_REQUIRED)
      .min(40, "Give buyers a fuller picture"),
    listingType: z.enum(["DIRECT_OWNER", "BUSINESS"], {
      message: "Select origin",
    }),
    purpose: z.enum(["SALE", "RENT"]),
    category: z.enum(["HOME", "PLOTS", "COMMERCIAL"]),
    subtype: z.string().trim().min(2, "Select a property type"),
    price: z.number({ message: "Enter a price" }).positive("Enter a price"),
    areaValue: z
      .number({ message: "Enter the area" })
      .positive("Enter the area"),
    areaUnit: z.enum(
      AREA_UNITS.map((item) => item.id) as [AreaUnitId, ...AreaUnitId[]],
      { message: "Select an area unit" },
    ),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().min(0).optional(),
    address: z
      .string()
      .trim()
      .min(1, EMPTY_REQUIRED)
      .min(6, "Enter a street address"),
    city: z
      .string()
      .trim()
      .min(1, "Select a city")
      .refine((value) => (CITIES as readonly string[]).includes(value), "Select a city"),
    latitude: z
      .number({ message: "Pin the property on the map (or select a city above)." })
      .min(-90, "Pin the property on the map (or select a city above).")
      .max(90, "Pin the property on the map (or select a city above)."),
    longitude: z
      .number({ message: "Pin the property on the map (or select a city above)." })
      .min(-180, "Pin the property on the map (or select a city above).")
      .max(180, "Pin the property on the map (or select a city above)."),
    contactPhone: pakistanMobileLocalSchema,
    highlightSpecs: z
      .array(z.enum(["bedrooms", "bathrooms", "area", "price"]))
      .min(1, "Select at least one feature to highlight")
      .optional(),
    featureTags: z
      .array(z.string().trim().min(1).max(40))
      .max(6, "Up to 6 custom features")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const sqft = toAreaSqft(data.areaValue, data.areaUnit);
    if (sqft > 5_000_000) {
      ctx.addIssue({
        code: "custom",
        path: ["areaValue"],
        message: "Area is unrealistically large — check the value and unit",
      });
    }
    if (data.category === "HOME") {
      if (data.bedrooms == null || !Number.isFinite(data.bedrooms)) {
        ctx.addIssue({
          code: "custom",
          path: ["bedrooms"],
          message: "Enter bedrooms",
        });
      }
      if (data.bathrooms == null || !Number.isFinite(data.bathrooms)) {
        ctx.addIssue({
          code: "custom",
          path: ["bathrooms"],
          message: "Enter bathrooms",
        });
      }
    }
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
    fullName: personNameSchema,
    email: z
      .string()
      .max(50, "Email must be 50 characters or fewer")
      .email("Enter a valid email"),
    phone: pakistanMobileLocalSchema,
    password: passwordCreateSchema,
    role: z.enum(["INDIVIDUAL", "DEALER"]),
    agencyName: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "DEALER") return;
    const agency = data.agencyName?.trim() ?? "";
    if (!agency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter your agency or company name",
        path: ["agencyName"],
      });
    } else {
      const parsed = agencyNameSchema.safeParse(data.agencyName ?? "");
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? AGENCY_NAME_MESSAGE;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["agencyName"],
        });
      }
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

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function looksLikeLoginPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  // 03XXXXXXXXX, 3XXXXXXXXX, 92XXXXXXXXXX, +92…
  if (digits.length === 10 && digits.startsWith("3")) return true;
  if (digits.length === 11 && digits.startsWith("03")) return true;
  if (digits.length === 12 && digits.startsWith("92") && digits[2] === "3") return true;
  if (digits.length === 13 && digits.startsWith("923")) return true;
  return false;
}

/** Unified Sign In - email or Pakistani mobile + password. */
export const userLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email or phone is required")
    .max(80, "Email or phone is too long")
    .refine((value) => {
      if (looksLikeEmail(value)) {
        return z.string().email().safeParse(value).success;
      }
      return looksLikeLoginPhone(value);
    }, "Enter a valid email or Pakistani mobile number"),
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
  fullName: personNameSchema,
  role: z.string().min(2, "Role is required"),
  photoUrl: z.string(),
});

export type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;
