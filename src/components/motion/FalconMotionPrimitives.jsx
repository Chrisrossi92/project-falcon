import React from "react";

import {
  FALCON_REDUCED_MOTION_QUERY,
  falconMotionDistances,
  falconMotionDurations,
  falconMotionEasing,
  falconMotionOpacity,
  falconMotionScale,
  prefersReducedMotion,
  resolveMotionDistance,
  resolveMotionDuration,
} from "@/lib/motion/falconMotion";
import { cn } from "@/lib/utils";

const FalconListMotionContext = React.createContext({
  distance: falconMotionDistances.xs,
  duration: falconMotionDurations.fast,
  easing: falconMotionEasing.decelerate,
});

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

function useMotionEntered(reducedMotion) {
  const [entered, setEntered] = React.useState(reducedMotion);

  React.useEffect(() => {
    if (reducedMotion) {
      setEntered(true);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return entered;
}

function getMotionDuration(duration, reducedMotion) {
  return `${resolveMotionDuration(duration, { reducedMotion })}ms`;
}

function buildEntranceStyle({
  entered,
  reducedMotion,
  duration = falconMotionDurations.normal,
  distance = falconMotionDistances.sm,
  easing = falconMotionEasing.decelerate,
  transitionProperty = "opacity, transform",
  style,
}) {
  const resolvedDistance = resolveMotionDistance(distance, { reducedMotion });
  const durationValue = getMotionDuration(duration, reducedMotion);

  return {
    opacity: entered ? falconMotionOpacity.visible : falconMotionOpacity.hidden,
    transform: entered || reducedMotion ? "translateY(0)" : `translateY(${resolvedDistance}px)`,
    transitionProperty,
    transitionDuration: durationValue,
    transitionTimingFunction: easing,
    ...style,
  };
}

export const FalconPageMotion = React.forwardRef(function FalconPageMotion(
  { children, className, style, ...props },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const entered = useMotionEntered(reducedMotion);

  return (
    <div
      ref={ref}
      className={className}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      style={buildEntranceStyle({
        entered,
        reducedMotion,
        duration: falconMotionDurations.normal,
        distance: falconMotionDistances.md,
        style,
      })}
      {...props}
    >
      {children}
    </div>
  );
});

export const FalconCardMotion = React.forwardRef(function FalconCardMotion(
  {
    children,
    className,
    interactive = false,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
    onPointerUp,
    style,
    ...props
  },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const entered = useMotionEntered(reducedMotion);
  const [interactionState, setInteractionState] = React.useState("rest");
  const isPressed = interactive && interactionState === "pressed" && !reducedMotion;
  const isHovered = interactive && interactionState === "hovered" && !reducedMotion;
  const interactiveTransform = isPressed
    ? `scale(${falconMotionScale.pressScale})`
    : `translateY(${falconMotionScale.hoverLift}px) scale(${falconMotionScale.activeScale})`;

  return (
    <div
      ref={ref}
      className={cn(interactive && "falcon-card-motion-interactive", className)}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      data-motion-interactive={interactive ? "true" : "false"}
      style={{
        ...buildEntranceStyle({
          entered,
          reducedMotion,
          duration: falconMotionDurations.normal,
          distance: falconMotionDistances.sm,
          transitionProperty: "opacity, transform, box-shadow",
        }),
        transform:
          entered && (isHovered || isPressed)
            ? interactiveTransform
            : buildEntranceStyle({
                entered,
                reducedMotion,
                distance: falconMotionDistances.sm,
              }).transform,
        "--falcon-motion-hover-lift": `${resolveMotionDistance(
          falconMotionScale.hoverLift,
          { reducedMotion },
        )}px`,
        "--falcon-motion-press-scale": reducedMotion ? 1 : falconMotionScale.pressScale,
        "--falcon-motion-active-scale": reducedMotion ? 1 : falconMotionScale.activeScale,
        ...style,
      }}
      onPointerEnter={(event) => {
        if (interactive) {
          setInteractionState("hovered");
        }
        onPointerEnter?.(event);
      }}
      onPointerDown={(event) => {
        if (interactive) {
          setInteractionState("pressed");
        }
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        if (interactive) {
          setInteractionState("hovered");
        }
        onPointerUp?.(event);
      }}
      onPointerLeave={(event) => {
        if (interactive) {
          setInteractionState("rest");
        }
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const FalconListMotion = React.forwardRef(function FalconListMotion(
  { children, className, style, ...props },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const entered = useMotionEntered(reducedMotion);

  return (
    <FalconListMotionContext.Provider
      value={{
        distance: falconMotionDistances.xs,
        duration: falconMotionDurations.fast,
        easing: falconMotionEasing.decelerate,
      }}
    >
      <div
        ref={ref}
        className={className}
        data-motion-entered={entered ? "true" : "false"}
        data-motion-reduced={reducedMotion ? "true" : "false"}
        style={{
          "--falcon-list-item-duration": getMotionDuration(falconMotionDurations.fast, reducedMotion),
          "--falcon-list-item-distance": `${resolveMotionDistance(
            falconMotionDistances.xs,
            { reducedMotion },
          )}px`,
          "--falcon-list-item-easing": falconMotionEasing.decelerate,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </FalconListMotionContext.Provider>
  );
});

export const FalconListItemMotion = React.forwardRef(function FalconListItemMotion(
  { children, className, style, ...props },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const entered = useMotionEntered(reducedMotion);
  const listMotion = React.useContext(FalconListMotionContext);

  return (
    <div
      ref={ref}
      className={className}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      style={buildEntranceStyle({
        entered,
        reducedMotion,
        duration: listMotion.duration,
        distance: listMotion.distance,
        easing: listMotion.easing,
        style,
      })}
      {...props}
    >
      {children}
    </div>
  );
});

export const FalconFade = React.forwardRef(function FalconFade(
  { children, className, show = true, style, ...props },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden={show ? undefined : true}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      data-motion-state={show ? "visible" : "hidden"}
      style={{
        opacity: show ? falconMotionOpacity.visible : falconMotionOpacity.hidden,
        transitionProperty: "opacity",
        transitionDuration: getMotionDuration(falconMotionDurations.fast, reducedMotion),
        transitionTimingFunction: falconMotionEasing.standard,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const FalconCollapse = React.forwardRef(function FalconCollapse(
  { children, className, open = true, style, ...props },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      className={className}
      aria-hidden={open ? undefined : true}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      data-motion-state={open ? "open" : "closed"}
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? falconMotionOpacity.visible : falconMotionOpacity.hidden,
        overflow: "hidden",
        transitionProperty: "grid-template-rows, opacity",
        transitionDuration: getMotionDuration(falconMotionDurations.normal, reducedMotion),
        transitionTimingFunction: falconMotionEasing.decelerate,
        ...style,
      }}
      {...props}
    >
      <div style={{ minHeight: 0 }}>{children}</div>
    </div>
  );
});
