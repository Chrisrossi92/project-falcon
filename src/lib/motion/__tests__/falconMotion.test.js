import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FALCON_REDUCED_MOTION_QUERY,
  falconMotion,
  falconMotionDistances,
  falconMotionDurations,
  prefersReducedMotion,
  resolveMotionDistance,
  resolveMotionDuration,
} from '../falconMotion';

describe('falconMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exposes centralized token families', () => {
    expect(falconMotion.durations).toBe(falconMotionDurations);
    expect(falconMotion.distances).toBe(falconMotionDistances);
    expect(falconMotion.durations.fast).toBe(140);
    expect(falconMotion.opacity.visible).toBe(1);
    expect(falconMotion.reducedMotionQuery).toBe(FALCON_REDUCED_MOTION_QUERY);
  });

  it('detects reduced motion preferences when matchMedia is available', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('window', { matchMedia });

    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(FALCON_REDUCED_MOTION_QUERY);
  });

  it('resolves motion values to static defaults when reduced motion is enabled', () => {
    expect(resolveMotionDuration(falconMotionDurations.normal, { reducedMotion: true })).toBe(0);
    expect(resolveMotionDistance(falconMotionDistances.lg, { reducedMotion: true })).toBe(0);
  });

  it('preserves motion values when reduced motion is disabled', () => {
    expect(resolveMotionDuration(falconMotionDurations.normal, { reducedMotion: false })).toBe(220);
    expect(resolveMotionDistance(falconMotionDistances.md, { reducedMotion: false })).toBe(8);
  });
});
