import { describe, expect, it } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportSchema,
  ReviewReportJSONSchema,
} from '../src/types/index.js';

describe('Zod Schema Validation Tests', () => {
  describe('CodeQualityResultSchema', () => {
    const validQuality = {
      file: 'src/index.ts',
      issues: [
        {
          line: 10,
          severity: 'high',
          category: 'security',
          description: 'Potential SQL injection',
          suggestion: 'Use parameterized queries',
        },
      ],
      overallScore: 85,
      summary: 'High priority security issue found.',
    };

    it('accepts valid code quality results', () => {
      const result = CodeQualityResultSchema.safeParse(validQuality);
      expect(result.success).toBe(true);
    });

    it('handles empty issues array (clean file)', () => {
      const result = CodeQualityResultSchema.safeParse({
        ...validQuality,
        issues: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts boundary scores 0 and 100', () => {
      expect(
        CodeQualityResultSchema.safeParse({ ...validQuality, overallScore: 0 }).success
      ).toBe(true);
      expect(
        CodeQualityResultSchema.safeParse({ ...validQuality, overallScore: 100 }).success
      ).toBe(true);
    });

    it('rejects scores below 0 or above 100', () => {
      expect(
        CodeQualityResultSchema.safeParse({ ...validQuality, overallScore: -1 }).success
      ).toBe(false);
      expect(
        CodeQualityResultSchema.safeParse({ ...validQuality, overallScore: 101 }).success
      ).toBe(false);
    });

    it('rejects invalid severity and category', () => {
      expect(
        CodeQualityResultSchema.safeParse({
          ...validQuality,
          issues: [{ ...validQuality.issues[0]!, severity: 'unknown' as any }],
        }).success
      ).toBe(false);

      expect(
        CodeQualityResultSchema.safeParse({
          ...validQuality,
          issues: [{ ...validQuality.issues[0]!, category: 'unknown' as any }],
        }).success
      ).toBe(false);
    });
  });

  describe('TestCoverageResultSchema', () => {
    const validCoverage = {
      file: 'src/service.ts',
      hasTests: true,
      testFiles: ['tests/service.test.ts'],
      untestedPaths: [
        {
          type: 'function',
          location: 'service.ts:L45',
          priority: 'critical',
          reasoning: 'Critical authentication handler untested',
          suggestedTest: 'testAuthFlow()',
        },
      ],
      coverageEstimate: 75,
      summary: 'Coverage is moderate with key gaps.',
    };

    it('accepts valid test coverage results', () => {
      const result = TestCoverageResultSchema.safeParse(validCoverage);
      expect(result.success).toBe(true);
    });

    it('handles empty testFiles and untestedPaths arrays', () => {
      const result = TestCoverageResultSchema.safeParse({
        ...validCoverage,
        testFiles: [],
        untestedPaths: [],
      });
      expect(result.success).toBe(true);
    });

    it('accepts boundary coverage estimates 0 and 100', () => {
      expect(
        TestCoverageResultSchema.safeParse({ ...validCoverage, coverageEstimate: 0 }).success
      ).toBe(true);
      expect(
        TestCoverageResultSchema.safeParse({ ...validCoverage, coverageEstimate: 100 }).success
      ).toBe(true);
    });

    it('rejects coverage estimates out of bounds', () => {
      expect(
        TestCoverageResultSchema.safeParse({ ...validCoverage, coverageEstimate: -5 }).success
      ).toBe(false);
      expect(
        TestCoverageResultSchema.safeParse({ ...validCoverage, coverageEstimate: 105 }).success
      ).toBe(false);
    });

    it('rejects invalid path type or priority', () => {
      expect(
        TestCoverageResultSchema.safeParse({
          ...validCoverage,
          untestedPaths: [{ ...validCoverage.untestedPaths[0]!, type: 'invalid' as any }],
        }).success
      ).toBe(false);
      expect(
        TestCoverageResultSchema.safeParse({
          ...validCoverage,
          untestedPaths: [{ ...validCoverage.untestedPaths[0]!, priority: 'super-high' as any }],
        }).success
      ).toBe(false);
    });
  });

  describe('RefactoringSuggestionSchema', () => {
    const validRefactoring = {
      file: 'src/utils.ts',
      suggestions: [
        {
          type: 'modernize',
          location: 'utils.ts:L12-L20',
          impact: 'medium',
          description: 'Use Array.prototype.flatMap',
          before: 'arr.map().filter()',
          after: 'arr.flatMap()',
          benefits: 'Cleaner syntax and single-pass iteration',
        },
      ],
      summary: '1 modernization suggestion identified.',
    };

    it('accepts valid refactoring suggestions', () => {
      const result = RefactoringSuggestionSchema.safeParse(validRefactoring);
      expect(result.success).toBe(true);
    });

    it('handles empty suggestions array', () => {
      const result = RefactoringSuggestionSchema.safeParse({
        ...validRefactoring,
        suggestions: [],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid refactoring type or impact', () => {
      expect(
        RefactoringSuggestionSchema.safeParse({
          ...validRefactoring,
          suggestions: [{ ...validRefactoring.suggestions[0]!, type: 'rewrite' as any }],
        }).success
      ).toBe(false);
      expect(
        RefactoringSuggestionSchema.safeParse({
          ...validRefactoring,
          suggestions: [{ ...validRefactoring.suggestions[0]!, impact: 'extreme' as any }],
        }).success
      ).toBe(false);
    });
  });

  describe('ReviewReportSchema', () => {
    const validReport = {
      pullRequest: {
        owner: 'airaamane',
        repo: 'simple-todo-app',
        number: 1,
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 100,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0,
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 120,
        agentVersions: { codeQuality: '1.0.0' },
      },
    };

    it('accepts valid review report with empty collections', () => {
      const result = ReviewReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it('rejects missing pullRequest fields', () => {
      const invalid = {
        ...validReport,
        pullRequest: { owner: 'airaamane' },
      };
      expect(ReviewReportSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects invalid recommendation priority', () => {
      const invalid = {
        ...validReport,
        recommendations: [
          {
            priority: 'urgent',
            category: 'security',
            description: 'Fix flaw',
            files: ['src/app.ts'],
          },
        ],
      };
      expect(ReviewReportSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('SDK Structured Output JSON Schema Exports', () => {
    it('exports valid JSON Schemas for subagents and orchestrator', () => {
      expect(CodeQualityResultJSONSchema).toBeDefined();
      expect(typeof CodeQualityResultJSONSchema).toBe('object');
      expect((CodeQualityResultJSONSchema as any).type).toBe('object');

      expect(TestCoverageResultJSONSchema).toBeDefined();
      expect(typeof TestCoverageResultJSONSchema).toBe('object');
      expect((TestCoverageResultJSONSchema as any).type).toBe('object');

      expect(RefactoringSuggestionJSONSchema).toBeDefined();
      expect(typeof RefactoringSuggestionJSONSchema).toBe('object');
      expect((RefactoringSuggestionJSONSchema as any).type).toBe('object');

      expect(ReviewReportJSONSchema).toBeDefined();
      expect(typeof ReviewReportJSONSchema).toBe('object');
      expect((ReviewReportJSONSchema as any).type).toBe('object');
    });
  });
});
