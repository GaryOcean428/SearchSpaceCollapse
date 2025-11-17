import { z } from "zod";

export const phraseSchema = z.object({
  phrase: z.string(),
  wordCount: z.number(),
  address: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
});

export const qigScoreSchema = z.object({
  contextScore: z.number().min(0).max(100),
  eleganceScore: z.number().min(0).max(100),
  typingScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
});

export const candidateSchema = z.object({
  id: z.string(),
  phrase: z.string(),
  address: z.string(),
  score: z.number(),
  qigScore: z.object({
    contextScore: z.number(),
    eleganceScore: z.number(),
    typingScore: z.number(),
    totalScore: z.number(),
  }),
  testedAt: z.string(),
});

export const searchStatsSchema = z.object({
  tested: z.number(),
  rate: z.number(),
  highPhiCount: z.number(),
  runtime: z.string(),
  isSearching: z.boolean(),
});

export const testPhraseRequestSchema = z.object({
  phrase: z.string().refine((p) => p.trim().split(/\s+/).length === 12, {
    message: "Phrase must contain exactly 12 words",
  }),
});

export const batchTestRequestSchema = z.object({
  phrases: z.array(z.string()),
});

export const verificationResultSchema = z.object({
  success: z.boolean(),
  testAddress: z.string().optional(),
  error: z.string().optional(),
});

export const targetAddressSchema = z.object({
  id: z.string(),
  address: z.string(),
  label: z.string().optional(),
  addedAt: z.string(),
});

export const addAddressRequestSchema = z.object({
  address: z.string().min(26).max(35),
  label: z.string().optional(),
});

export const generateRandomPhrasesRequestSchema = z.object({
  count: z.number().min(1).max(100),
});

export type Phrase = z.infer<typeof phraseSchema>;
export type QIGScore = z.infer<typeof qigScoreSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type SearchStats = z.infer<typeof searchStatsSchema>;
export type TestPhraseRequest = z.infer<typeof testPhraseRequestSchema>;
export type BatchTestRequest = z.infer<typeof batchTestRequestSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type TargetAddress = z.infer<typeof targetAddressSchema>;
export type AddAddressRequest = z.infer<typeof addAddressRequestSchema>;
export type GenerateRandomPhrasesRequest = z.infer<typeof generateRandomPhrasesRequestSchema>;
