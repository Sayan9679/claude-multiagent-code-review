import { describe, expect, it } from 'vitest';
import {
  ErrorCodes,
  ReviewError,
  formatError,
  withRetry,
  withTimeout,
} from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('error-handler utilities', () => {
  it('retries a failing operation and eventually succeeds', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('temporary failure');
        }
        return 'success';
      },
      3,
      1
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('throws RETRY_EXHAUSTED after retries are exhausted', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('persistent failure');
        },
        2,
        1
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.RETRY_EXHAUSTED,
    });
  });

  it('returns before the timeout when the operation completes', async () => {
    await expect(
      withTimeout(async () => 'completed', 1000)
    ).resolves.toBe('completed');
  });

  it('throws AGENT_TIMEOUT when the operation exceeds the timeout', async () => {
    await expect(
      withTimeout(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve('too late'), 100);
          }),
        10
      )
    ).rejects.toMatchObject({
      code: ErrorCodes.AGENT_TIMEOUT,
    });
  });

  it('formats ReviewError correctly', () => {
    const error = new ReviewError('Something failed', ErrorCodes.AGENT_FAILED);
    expect(formatError(error)).toBe('[AGENT_FAILED] Something failed');
  });
});

describe('RateLimiter', () => {
  it('allows requests within configured limits', () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 2,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    expect(limiter.canProceed(100)).toBe(true);
  });

  it('blocks requests when the concurrent limit is reached', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 10000,
      maxConcurrent: 1,
    });

    await limiter.acquire(100);

    expect(limiter.canProceed(100)).toBe(false);

    limiter.release();
  });

  it('tracks request and token usage', async () => {
    const limiter = new RateLimiter({
      maxRequestsPerMinute: 10,
      maxTokensPerMinute: 1000,
      maxConcurrent: 2,
    });

    await limiter.acquire(250);

    const status = limiter.getStatus();

    expect(status.activeRequests).toBe(1);
    expect(status.requestsInWindow).toBe(1);
    expect(status.tokensInWindow).toBe(250);

    limiter.release();
  });
});
