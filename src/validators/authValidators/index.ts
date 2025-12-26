import { z, ZodSchema } from "zod";

export const signupSchema: ZodSchema<{
  email: string;
  password: string;
  name: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  name: z.string(),
});

export const loginSchema: ZodSchema<{
  email: string;
  password: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z.string(),
});

export const otpVerifySchema: ZodSchema<{
  email: string;
  otp: string;
}> = z.object({
  email: z.string(),
  otp: z.string(),
});

export const otpSendSchema: ZodSchema<{
  email: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
});

export const changePasswordSchema: ZodSchema<{
  oldPassword: string;
  newPassword: string;
}> = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});

export const resetPasswordSchema: ZodSchema<{
  password: string;
}> = z.object({
  password: z.string(),
});

export const createProfileSchema: ZodSchema<{
  businessName: string;
  companySize: string;
  about?: string | null;
}> = z.object({
  businessName: z.string(),
  companySize: z.string(),
  about: z.string().optional().nullable(),
});

export const updateProfileSchema: ZodSchema<{
  businessName?: string | null;
  companySize?: string | null;
  about?: string | null;
}> = z.object({
  businessName: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
});
