import { z } from "zod";
const text = z.string().trim().max(200).default("");
const phone = z
  .string()
  .trim()
  .regex(/^$|^\+?[0-9]{10,15}$/, "Use 10–15 digits, optionally starting with +")
  .default("");
const email = z.union([z.literal(""), z.email()]).default("");
const pin = z
  .string()
  .regex(/^$|^[1-9][0-9]{5}$/, "Enter a six-digit Indian PIN")
  .default("");
export const addressSchema = z.object({
  line1: z.string().trim().min(1, "Address is required").max(300),
  line2: text,
  country: text.default("India"),
  state: text,
  district: text,
  city: text,
  pin,
});
export const financialSchema = z
  .object({
    terms: z.enum(["Advance", "Cash", "Credit", "Custom"]).default("Cash"),
    customTerms: text,
    creditLimit: z.coerce.number().min(0).max(99999999999999).default(0),
    creditDays: z.coerce.number().int().min(0).max(3650).default(0),
    openingBalance: z.coerce.number().min(0).max(99999999999999).default(0),
    balanceType: z.enum(["Receivable", "Payable"]).default("Receivable"),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("INR"),
    tds: z.boolean().default(false),
    tdsDetails: text,
  })
  .superRefine((v, c) => {
    if (v.tds && !v.tdsDetails)
      c.addIssue({
        code: "custom",
        path: ["tdsDetails"],
        message: "Enter TDS details",
      });
    if (v.terms === "Custom" && !v.customTerms)
      c.addIssue({
        code: "custom",
        path: ["customTerms"],
        message: "Enter custom payment terms",
      });
  });
export const locationSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(1000),
  person: text,
  mobile: phone,
  email,
  pin,
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});
export const customerSchema = z
  .object({
    version: z.number().int().positive().optional(),
    type: z.enum(["Company", "Individual"]),
    name: z.string().trim().min(2, "Enter a customer name").max(200),
    legalName: text,
    displayName: text,
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
        "Enter a valid GSTIN format",
      )
      .default(""),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^$|^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN")
      .default(""),
    category: text,
    industry: text,
    active: z.boolean().default(true),
    group: text,
    salesperson: text,
    source: text,
    notes: z.string().max(5000).default(""),
    contact: z.object({
      person: z.string().trim().min(1, "Contact person is required").max(200),
      designation: text,
      mobile: phone.refine((v) => !!v, "Mobile is required"),
      alternateMobile: phone,
      email,
      website: z
        .union([
          z.literal(""),
          z
            .url()
            .refine((v) => /^https?:\/\//.test(v), "Use an http or https URL"),
        ])
        .default(""),
      landline: phone,
    }),
    billing: addressSchema,
    sameAsBilling: z.boolean().default(true),
    shipping: addressSchema.optional(),
    locations: z.array(locationSchema).max(50).default([]),
    financial: financialSchema.optional(),
  })
  .superRefine((v, c) => {
    if (!v.sameAsBilling && !v.shipping)
      c.addIssue({
        code: "custom",
        path: ["shipping", "line1"],
        message: "Enter a shipping address",
      });
    if (v.locations.filter((l) => l.active && l.isDefault).length > 1)
      c.addIssue({
        code: "custom",
        path: ["locations"],
        message: "Choose only one active default location",
      });
    if (v.gstin && v.pan && v.gstin.slice(2, 12) !== v.pan)
      c.addIssue({
        code: "custom",
        path: ["pan"],
        message: "PAN must match the PAN within GSTIN",
      });
  });
export type CustomerInput = z.infer<typeof customerSchema>;
export function customerPermissions(role: string) {
  return {
    view: role === "ADMIN" || role === "OFFICE",
    create: role === "ADMIN" || role === "OFFICE",
    edit: role === "ADMIN" || role === "OFFICE",
    status: role === "ADMIN",
    financial: role === "ADMIN",
    locations: role === "ADMIN" || role === "OFFICE",
  };
}
export function duplicateKey(name: string, mobile: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ") + "|" + mobile;
}
