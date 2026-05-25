function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const baseSurface =
  "transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out motion-reduce:transition-none";

const interactiveSurface =
  "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 motion-reduce:hover:translate-y-0";

export const workspaceSurfaceRecipes = {
  primary: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100",
  secondary: "rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm",
  action: "rounded-xl border border-slate-300 bg-white p-4 shadow-sm ring-1 ring-slate-100",
  evidence: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-3",
  priority: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm",
  table: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
};

export function workspaceSurfaceClassNames(variant = "secondary", className = "", interactive = false) {
  return cx(
    workspaceSurfaceRecipes[variant] || workspaceSurfaceRecipes.secondary,
    baseSurface,
    interactive && interactiveSurface,
    className,
  );
}

export function WorkspaceSurface({
  as: Component = "section",
  variant = "secondary",
  interactive = false,
  className = "",
  children,
  ...props
}) {
  return (
    <Component className={workspaceSurfaceClassNames(variant, className, interactive)} {...props}>
      {children}
    </Component>
  );
}
