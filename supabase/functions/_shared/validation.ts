/**
 * Request Validation Module
 * Provides runtime schema validation using Zod for all Edge Functions
 *
 * This provides type-safe validation that TypeScript interfaces cannot:
 * - Runtime type checking (TypeScript is compile-time only)
 * - Range validation (min/max values)
 * - Format validation (UUIDs, emails)
 * - Consistent error messages
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { INPUT_LIMITS } from "./sanitization.ts";

// ============================================================================
// Common Primitives
// ============================================================================

/**
 * Duration for meditation scripts (1-30 minutes)
 * Prevents resource exhaustion from extremely long scripts
 */
export const DurationSchema = z
  .number()
  .int("Duration must be a whole number")
  .min(1, "Duration must be at least 1 minute")
  .max(30, "Duration cannot exceed 30 minutes")
  .default(5);

/**
 * Main prompt/thought input
 */
export const ThoughtSchema = z
  .string()
  .min(1, "Prompt is required")
  .max(INPUT_LIMITS.thought, `Prompt exceeds maximum length of ${INPUT_LIMITS.thought} characters`);

/**
 * Existing script content for extension operations
 */
export const ScriptSchema = z
  .string()
  .max(INPUT_LIMITS.script, `Script exceeds maximum length of ${INPUT_LIMITS.script} characters`);

/**
 * Voice profile name
 */
export const VoiceNameSchema = z
  .string()
  .min(1, "Voice name is required")
  .max(INPUT_LIMITS.voiceName, `Voice name exceeds maximum length of ${INPUT_LIMITS.voiceName} characters`);

/**
 * Voice/meditation description
 */
export const DescriptionSchema = z
  .string()
  .max(INPUT_LIMITS.description, `Description exceeds maximum length of ${INPUT_LIMITS.description} characters`)
  .optional();

/**
 * UUID format validation
 */
export const UUIDSchema = z.string().uuid("Invalid UUID format");

/**
 * Temperature for AI model (0-2 range)
 */
export const TemperatureSchema = z
  .number()
  .min(0, "Temperature must be at least 0")
  .max(2, "Temperature cannot exceed 2")
  .default(0.8);

/**
 * Max tokens for AI response
 */
export const MaxTokensSchema = z
  .number()
  .int()
  .min(50, "Max tokens must be at least 50")
  .max(4000, "Max tokens cannot exceed 4000");

/**
 * Audio tag array with validation
 */
export const AudioTagsSchema = z
  .array(z.string().max(INPUT_LIMITS.audioTag))
  .max(10, "Maximum 10 audio tags allowed")
  .optional();

// ============================================================================
// Edge Function Request Schemas
// ============================================================================

/**
 * gemini-chat request schema
 */
export const GeminiChatRequestSchema = z.object({
  prompt: ThoughtSchema,
  systemPrompt: z.string().max(5000).optional(),
  maxTokens: MaxTokensSchema.default(500),
  temperature: TemperatureSchema.default(0.8),
});

export type GeminiChatRequest = z.infer<typeof GeminiChatRequestSchema>;

/**
 * gemini-script request schema
 */
export const GeminiScriptRequestSchema = z
  .object({
    thought: ThoughtSchema.optional(),
    audioTags: AudioTagsSchema,
    operation: z.enum(["generate", "extend", "harmonize"]).default("generate"),
    existingScript: ScriptSchema.optional(),
    durationMinutes: DurationSchema,
    contentCategory: z
      .enum(["meditation", "affirmation", "self_hypnosis", "guided_journey", "story"])
      .optional(),
    contentSubType: z.string().max(50).optional(),
    hypnosisDepth: z.enum(["light", "standard", "deep", "therapeutic"]).optional(),
    targetAgeGroup: z.enum(["toddler", "young_child", "older_child"]).optional(),
  })
  .refine(
    (data) => {
      // For extend/harmonize, existingScript is required
      if (data.operation === "extend" || data.operation === "harmonize") {
        return !!data.existingScript?.trim();
      }
      // For generate, thought is required
      return !!data.thought?.trim();
    },
    {
      message: "For 'generate' operation, thought is required. For 'extend'/'harmonize', existingScript is required.",
    }
  );

export type GeminiScriptRequest = z.infer<typeof GeminiScriptRequestSchema>;

/**
 * generate-speech request schema
 */
export const GenerateSpeechRequestSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(INPUT_LIMITS.script, `Text exceeds maximum length of ${INPUT_LIMITS.script} characters`),
  voiceId: UUIDSchema.optional(),
  elevenLabsVoiceId: z.string().max(100).optional(),
  voiceSettings: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarityBoost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      useSpeakerBoost: z.boolean().optional(),
    })
    .optional(),
});

export type GenerateSpeechRequest = z.infer<typeof GenerateSpeechRequestSchema>;

/**
 * elevenlabs-tts request schema
 */
export const ElevenLabsTTSRequestSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(INPUT_LIMITS.script, `Text exceeds maximum length of ${INPUT_LIMITS.script} characters`),
  voiceId: z.string().optional(), // Can be UUID or ElevenLabs voice ID
  elevenLabsVoiceId: z.string().max(100).optional(),
  options: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarityBoost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      useSpeakerBoost: z.boolean().optional(),
      speed: z.number().min(0.7).max(1.2).optional(),
      modelId: z.enum(["eleven_multilingual_v2", "eleven_turbo_v2_5"]).optional(),
    })
    .optional(),
});

export type ElevenLabsTTSRequest = z.infer<typeof ElevenLabsTTSRequestSchema>;

/**
 * elevenlabs-clone request schema
 */
export const ElevenLabsCloneRequestSchema = z.object({
  audioBase64: z.string().min(1, "Audio data is required"),
  voiceName: VoiceNameSchema,
  description: DescriptionSchema,
  removeBackgroundNoise: z.boolean().default(false),
  metadata: z
    .object({
      language: z.string().max(50).optional(),
      accent: z.string().max(50).optional(),
      gender: z.enum(["male", "female", "neutral"]).optional(),
      ageRange: z.string().max(20).optional(),
      descriptive: z.string().max(200).optional(),
      useCase: z.string().max(100).optional(),
      hasBackgroundNoise: z.boolean().optional(),
    })
    .optional(),
});

export type ElevenLabsCloneRequest = z.infer<typeof ElevenLabsCloneRequestSchema>;

/**
 * delete-user-data (GDPR) request schema
 */
export const DeleteUserDataRequestSchema = z.object({
  confirmDeletion: z.literal(true, {
    errorMap: () => ({ message: "Deletion confirmation required (must be true)" }),
  }),
  confirmEmail: z.string().email("Invalid email format"),
});

export type DeleteUserDataRequest = z.infer<typeof DeleteUserDataRequestSchema>;

/**
 * export-user-data (GDPR) request schema
 */
export const ExportUserDataRequestSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

export type ExportUserDataRequest = z.infer<typeof ExportUserDataRequestSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
}

/**
 * Validation error response format
 */
export interface ValidationError {
  error: string;
  details?: ValidationErrorDetail[];
  requestId?: string;
}

/**
 * Format Zod validation errors into consistent error response
 */
export function formatZodError(error: z.ZodError, requestId?: string): ValidationError {
  const details: ValidationErrorDetail[] = error.errors.map((e) => ({
    path: e.path.join(".") || "root",
    message: e.message,
  }));

  // Create human-readable summary
  const summary = details.map((d) => (d.path === "root" ? d.message : `${d.path}: ${d.message}`)).join("; ");

  return {
    error: `Validation failed: ${summary}`,
    details,
    requestId,
  };
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * Validate request data against a schema
 *
 * @example
 * ```ts
 * const result = validateRequest(GeminiChatRequestSchema, await req.json(), requestId);
 * if (!result.success) {
 *   return new Response(JSON.stringify(result.error), { status: 400 });
 * }
 * const { prompt, maxTokens, temperature } = result.data;
 * ```
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  requestId?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: formatZodError(result.error, requestId) };
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  error: ValidationError,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(error), {
    status: 400,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
