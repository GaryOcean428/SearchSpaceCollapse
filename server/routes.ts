import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateBitcoinAddress, verifyBrainWallet } from "./crypto";
import { scorePhrase } from "./qig-scoring";
import { KNOWN_12_WORD_PHRASES } from "./known-phrases";
import { testPhraseRequestSchema, batchTestRequestSchema, type Candidate } from "@shared/schema";
import { randomUUID } from "crypto";

const TARGET_ADDRESS = "15BKWJjL5YWXtaP449WAYqVYZQE1szicTn";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/verify-crypto", (req, res) => {
    try {
      const result = verifyBrainWallet();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/test-phrase", async (req, res) => {
    try {
      const validation = testPhraseRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrase } = validation.data;
      const address = generateBitcoinAddress(phrase);
      const qigScore = scorePhrase(phrase);
      const match = address === TARGET_ADDRESS;

      if (qigScore.totalScore >= 75) {
        const candidate: Candidate = {
          id: randomUUID(),
          phrase,
          address,
          score: qigScore.totalScore,
          qigScore,
          testedAt: new Date().toISOString(),
        };
        await storage.addCandidate(candidate);
      }

      res.json({
        phrase,
        address,
        match,
        score: qigScore.totalScore,
        qigScore,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/batch-test", async (req, res) => {
    try {
      const validation = batchTestRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrases } = validation.data;
      const results = [];
      const candidates: Candidate[] = [];
      let highPhiCount = 0;

      for (const phrase of phrases) {
        const words = phrase.trim().split(/\s+/);
        if (words.length !== 12) {
          continue;
        }

        const address = generateBitcoinAddress(phrase);
        const qigScore = scorePhrase(phrase);
        const match = address === TARGET_ADDRESS;

        if (match) {
          return res.json({
            found: true,
            phrase,
            address,
            score: qigScore.totalScore,
          });
        }

        if (qigScore.totalScore >= 75) {
          const candidate: Candidate = {
            id: randomUUID(),
            phrase,
            address,
            score: qigScore.totalScore,
            qigScore,
            testedAt: new Date().toISOString(),
          };
          candidates.push(candidate);
          await storage.addCandidate(candidate);
          highPhiCount++;
        }

        results.push({
          phrase,
          address,
          score: qigScore.totalScore,
        });
      }

      res.json({
        tested: results.length,
        highPhiCandidates: highPhiCount,
        candidates,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/known-phrases", (req, res) => {
    try {
      res.json({ phrases: KNOWN_12_WORD_PHRASES });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
