// Duration tokens keep Falcon interactions calm, fast, and consistent.
// Values are expressed in milliseconds for direct use in CSS, JS, or motion libraries.
export const falconMotionDurations = Object.freeze({
  instant: 0,
  fast: 140,
  normal: 220,
  slow: 320,
  deliberate: 480,
});

// Easing tokens define the feel of movement. Prefer standard/decelerate for most UI transitions;
// reserve emphasized for important spatial changes that need slightly more presence.
export const falconMotionEasing = Object.freeze({
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
});

// Distance tokens keep reveals, slides, and subtle movement spatially restrained.
// Use smaller distances for dense work surfaces and larger distances for panels or page sections.
export const falconMotionDistances = Object.freeze({
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
});

// Scale and press tokens provide tactile feedback without making professional workflows feel playful.
// Use hoverLift as a translateY pixel value and scale values for press/active states.
export const falconMotionScale = Object.freeze({
  hoverLift: -1,
  pressScale: 0.98,
  activeScale: 0.995,
});

// Opacity tokens standardize hidden, quiet, and fully visible states across future motion patterns.
export const falconMotionOpacity = Object.freeze({
  hidden: 0,
  muted: 0.64,
  visible: 1,
});

export const FALCON_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(FALCON_REDUCED_MOTION_QUERY).matches;
}

export function resolveMotionDuration(duration, { reducedMotion = prefersReducedMotion() } = {}) {
  return reducedMotion ? falconMotionDurations.instant : duration;
}

export function resolveMotionDistance(distance, { reducedMotion = prefersReducedMotion() } = {}) {
  return reducedMotion ? 0 : distance;
}

export const falconReducedMotionDefaults = Object.freeze({
  duration: falconMotionDurations.instant,
  distance: 0,
});

export const falconMotion = Object.freeze({
  durations: falconMotionDurations,
  easing: falconMotionEasing,
  distances: falconMotionDistances,
  scale: falconMotionScale,
  opacity: falconMotionOpacity,
  reducedMotionQuery: FALCON_REDUCED_MOTION_QUERY,
  reducedMotionDefaults: falconReducedMotionDefaults,
});
