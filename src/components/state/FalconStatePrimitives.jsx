import React from "react";

import {
  FALCON_REDUCED_MOTION_QUERY,
  falconMotionDurations,
  falconMotionEasing,
  prefersReducedMotion,
  resolveMotionDuration,
} from "@/lib/motion/falconMotion";
import { cn } from "@/lib/utils";

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

function stateTransitionStyle(reducedMotion, style) {
  return {
    transitionDuration: `${resolveMotionDuration(falconMotionDurations.fast, {
      reducedMotion,
    })}ms`,
    transitionTimingFunction: falconMotionEasing.standard,
    ...style,
  };
}

const skeletonShapes = {
  circle: "rounded-full",
  pill: "rounded-full",
  rounded: "rounded-md",
  square: "rounded-none",
};

export const FalconSkeleton = React.forwardRef(function FalconSkeleton(
  {
    "aria-label": ariaLabel = "Loading content",
    className,
    height = "1rem",
    shape = "rounded",
    style,
    width = "100%",
    ...props
  },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      data-state-skeleton="true"
      role="status"
      className={cn(
        "block bg-slate-200/80 motion-reduce:transition-none",
        skeletonShapes[shape] || skeletonShapes.rounded,
        className,
      )}
      style={stateTransitionStyle(reducedMotion, {
        width,
        height,
        ...style,
      })}
      {...props}
    />
  );
});

function FalconStateShell({
  action,
  children,
  className,
  description,
  icon,
  role,
  tone = "neutral",
  title,
  ...props
}) {
  const reducedMotion = usePrefersReducedMotion();
  const toneClasses = {
    error: "border-rose-200 bg-rose-50/70 text-rose-950",
    loading: "border-slate-200 bg-slate-50/80 text-slate-900",
    neutral: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    updating: "border-slate-200 bg-white text-slate-800",
  };

  return (
    <section
      role={role}
      data-state-tone={tone}
      data-motion-reduced={reducedMotion ? "true" : "false"}
      className={cn(
        "rounded-xl border px-4 py-4 shadow-sm transition-colors motion-reduce:transition-none",
        toneClasses[tone] || toneClasses.neutral,
        className,
      )}
      style={stateTransitionStyle(reducedMotion)}
      {...props}
    >
      <div className="flex gap-3">
        {icon ? <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
          {description ? (
            <p className={cn("text-sm leading-6", title ? "mt-1" : "", tone === "error" ? "text-rose-800" : "text-slate-600")}>
              {description}
            </p>
          ) : null}
          {children ? <div className={cn(title || description ? "mt-3" : "")}>{children}</div> : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function FalconLoadingState({
  children,
  className,
  description = "Keeping this space ready while the latest information loads.",
  icon,
  title = "Loading",
  ...props
}) {
  return (
    <FalconStateShell
      role="status"
      tone="loading"
      title={title}
      description={description}
      icon={icon}
      className={className}
      {...props}
    >
      {children}
    </FalconStateShell>
  );
}

export function FalconEmptyState({
  action,
  children,
  className,
  description,
  icon,
  title = "No items yet",
  ...props
}) {
  return (
    <FalconStateShell
      action={action}
      tone="neutral"
      title={title}
      description={description}
      icon={icon}
      className={cn("border-dashed bg-slate-50/70 text-center", className)}
      {...props}
    >
      {children}
    </FalconStateShell>
  );
}

export function FalconErrorState({
  action,
  children,
  className,
  description = "Try again, or continue with the available information.",
  icon,
  title = "Something needs attention",
  ...props
}) {
  return (
    <FalconStateShell
      action={action}
      role="alert"
      tone="error"
      title={title}
      description={description}
      icon={icon}
      className={className}
      {...props}
    >
      {children}
    </FalconStateShell>
  );
}

export function FalconUpdatingIndicator({
  children,
  className,
  label = "Updating",
  ...props
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <span
      role="status"
      data-motion-reduced={reducedMotion ? "true" : "false"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition-colors motion-reduce:transition-none",
        className,
      )}
      style={stateTransitionStyle(reducedMotion)}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-slate-400" aria-hidden="true" />
      <span>{label}</span>
      {children}
    </span>
  );
}

export function FalconSuccessState({
  action,
  children,
  className,
  description,
  icon,
  title = "Saved",
  ...props
}) {
  return (
    <FalconStateShell
      action={action}
      role="status"
      tone="success"
      title={title}
      description={description}
      icon={icon}
      className={className}
      {...props}
    >
      {children}
    </FalconStateShell>
  );
}
