import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please create a password.'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Please enter a display name.')
    .max(40, 'Display name is too long.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message || 'Invalid input.';
}

export function safeParseSignInInput(input: unknown):
  | { success: true; data: SignInInput }
  | { success: false; message: string } {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function safeParseRegisterInput(input: unknown):
  | { success: true; data: RegisterInput }
  | { success: false; message: string } {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
}
