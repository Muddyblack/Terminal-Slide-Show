import { frontendConfig } from '@/config';

/**
 * How one slide changes into the next. Set per device with `slideshow.transition`.
 * - crossfade: the new slide fades in over the old one, which stays solid underneath (default)
 * - blur: like crossfade, but the new slide comes out of a blur
 * - zoom: crossfade with a slow zoom
 * - morph: the two pictures melt into each other (images only, needs WebGL)
 * - morphBlur: morph with a soft blur at the midpoint
 */
export type TransitionKind = 'crossfade' | 'blur' | 'zoom' | 'morph' | 'morphBlur';

export const TRANSITION_KINDS: TransitionKind[] = ['crossfade', 'morph', 'morphBlur', 'blur', 'zoom'];

export const DEFAULT_TRANSITION: TransitionKind = 'crossfade';

export const isTransitionKind = (value: unknown): value is TransitionKind =>
  typeof value === 'string' && (TRANSITION_KINDS as string[]).includes(value);

/** The configured transition, or the default if the setting is missing or misspelled */
export const configuredTransition = (): TransitionKind => {
  const value = (frontendConfig.slideshow as { transition?: unknown }).transition;
  return isTransitionKind(value) ? value : DEFAULT_TRANSITION;
};

/** Milliseconds a transition takes */
export const configuredTransitionDuration = (): number => {
  const value = Number((frontendConfig.slideshow as { transitionDuration?: unknown }).transitionDuration);
  return Number.isFinite(value) && value >= 100 ? value : 1000;
};

export type FadeStyle = 'crossfade' | 'blur' | 'zoom' | 'instant';

/** Morph kinds are drawn by the morph layer; the plain fade is what the slides themselves do */
export const fadeStyleOf = (kind: TransitionKind): FadeStyle => (kind === 'blur' || kind === 'zoom' ? kind : 'crossfade');

/**
 * Animation of a slide that comes in (initial, animate) and one that leaves (exit).
 *
 * The slide that leaves stays (almost) solid underneath and is only removed well after the
 * new one is fully in, so the black background never shows through. Its exit runs longer
 * than the fade because the new slide may need a moment to draw before its fade starts.
 * Opacity goes to 0.99 rather than staying at 1 because an exit that changes nothing ends at once.
 */
export const fadeVariants = (style: FadeStyle, durationMs: number) => {
  const ease = [0.4, 0, 0.2, 1] as [number, number, number, number];
  const transition = { duration: durationMs / 1000, ease };
  const exitTransition = { duration: (durationMs + 800) / 1000, ease };
  const shown = { opacity: 1, scale: 1, filter: 'blur(0px)' };
  const holding = { opacity: 0.99, scale: 1, filter: 'blur(0px)', transition: exitTransition };

  switch (style) {
    case 'blur':
      return {
        initial: { ...shown, opacity: 0, filter: 'blur(18px)' },
        animate: { ...shown, transition },
        exit: { ...holding, filter: 'blur(6px)' },
      };
    case 'zoom':
      return {
        initial: { ...shown, opacity: 0, scale: 1.12 },
        animate: { ...shown, transition },
        exit: { ...holding, scale: 0.97 },
      };
    case 'instant':
      // Shown straight away (after a morph); it still leaves like any other slide
      return { initial: shown, animate: shown, exit: holding };
    default:
      return {
        initial: { ...shown, opacity: 0 },
        animate: { ...shown, transition },
        exit: holding,
      };
  }
};
