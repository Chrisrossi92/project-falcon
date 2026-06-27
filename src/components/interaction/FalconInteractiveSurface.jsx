import React from "react";

import {
  FALCON_REDUCED_MOTION_QUERY,
  prefersReducedMotion,
} from "@/lib/motion/falconMotion";
import {
  falconInteractionClassNames,
  falconInteractionStyles,
} from "@/lib/ui/falconInteractions";

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(() => prefersReducedMotion());

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(FALCON_REDUCED_MOTION_QUERY);
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return reducedMotion;
}

export const FalconInteractiveSurface = React.forwardRef(function FalconInteractiveSurface(
  {
    as: Component = "div",
    children,
    className,
    disabled = false,
    onClick,
    recipe = "clickableSurface",
    selected = false,
    style,
    ...props
  },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
  };

  return (
    <Component
      ref={ref}
      aria-disabled={disabled ? true : undefined}
      data-interaction-disabled={disabled ? "true" : "false"}
      data-interaction-selected={selected ? "true" : "false"}
      className={falconInteractionClassNames(recipe, { className, disabled, selected })}
      disabled={Component === "button" ? disabled : undefined}
      style={falconInteractionStyles({ reducedMotion, style })}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Component>
  );
});
