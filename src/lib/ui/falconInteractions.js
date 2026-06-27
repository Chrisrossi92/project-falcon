import {
  falconMotionDurations,
  falconMotionEasing,
  falconMotionScale,
  resolveMotionDistance,
  resolveMotionDuration,
} from "@/lib/motion/falconMotion";
import { cn } from "@/lib/utils";

const interactionTransition =
  "transition-[background-color,border-color,box-shadow,color,opacity,transform] motion-reduce:transition-none";

export const falconInteractionClasses = Object.freeze({
  clickableSurface:
    "cursor-pointer select-none rounded-xl border border-slate-200 bg-white text-left shadow-sm",
  subtleHoverLift:
    "hover:translate-y-[var(--falcon-interaction-hover-lift)] motion-reduce:hover:translate-y-0",
  pressFeedback:
    "active:scale-[var(--falcon-interaction-press-scale)] motion-reduce:active:scale-100",
  selectedState:
    "border-slate-900 bg-slate-50 shadow-sm ring-2 ring-slate-900 ring-offset-1",
  disabledState:
    "cursor-not-allowed opacity-50 pointer-events-none grayscale-[0.08]",
  focusVisibleRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
  rowHover: "hover:bg-slate-50 hover:text-slate-950",
  cardHover: "hover:border-slate-300 hover:bg-white hover:shadow-md",
  quietSecondaryAction:
    "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  destructiveAction:
    "border border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800",
  transition: interactionTransition,
});

export const falconInteractionRecipes = Object.freeze({
  clickableSurface: [
    "clickableSurface",
    "transition",
    "subtleHoverLift",
    "pressFeedback",
    "focusVisibleRing",
  ],
  row: ["transition", "rowHover", "focusVisibleRing"],
  card: ["clickableSurface", "transition", "subtleHoverLift", "pressFeedback", "cardHover", "focusVisibleRing"],
  quietSecondaryAction: ["transition", "quietSecondaryAction", "pressFeedback", "focusVisibleRing"],
  destructiveAction: ["transition", "destructiveAction", "pressFeedback", "focusVisibleRing"],
});

export function falconInteractionStyles({ reducedMotion = false, style } = {}) {
  return {
    "--falcon-interaction-duration": `${resolveMotionDuration(falconMotionDurations.fast, {
      reducedMotion,
    })}ms`,
    "--falcon-interaction-easing": falconMotionEasing.standard,
    "--falcon-interaction-hover-lift": `${resolveMotionDistance(falconMotionScale.hoverLift, {
      reducedMotion,
    })}px`,
    "--falcon-interaction-press-scale": reducedMotion ? 1 : falconMotionScale.pressScale,
    transitionDuration: "var(--falcon-interaction-duration)",
    transitionTimingFunction: "var(--falcon-interaction-easing)",
    ...style,
  };
}

export function falconInteractionClassNames(recipe = "clickableSurface", options = {}) {
  const recipeKeys = falconInteractionRecipes[recipe] || falconInteractionRecipes.clickableSurface;
  const classes = recipeKeys.map((key) => falconInteractionClasses[key]);

  return cn(
    classes,
    options.selected && falconInteractionClasses.selectedState,
    options.disabled && falconInteractionClasses.disabledState,
    options.className,
  );
}
