import React, { createContext, useContext, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DropdownMenuContext = createContext(null);

const useDropdownMenu = () => {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu components must be used within DropdownMenu");
  return ctx;
};

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, menuRef }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu();

    const handleClick = (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      setOpen(!open);
    };

    if (asChild) {
      const child = React.Children.only(children);
      return React.cloneElement(child, {
        ref,
        ...props,
        onClick: (event) => {
          child.props.onClick?.(event);
          handleClick(event);
        },
      });
    }

    return (
      <button type="button" ref={ref} {...props} onClick={handleClick}>
        {children}
      </button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef(
  ({ align = "end", className, children, ...props }, ref) => {
    const { open } = useDropdownMenu();
    if (!open) return null;

    const alignment = align === "start" ? "left-0" : "right-0";

    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 mt-2 min-w-[180px] rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none",
          alignment,
          className
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef(
  ({ className, inset, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownMenu();

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        }}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuPortal = ({ children }) => <>{children}</>;
