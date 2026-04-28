import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const contentRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target) || contentRef.current?.contains(event.target)) return;
      setOpen(false);
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
    <DropdownMenuContext.Provider value={{ open, setOpen, menuRef, contentRef }}>
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
  ({ align = "end", side = "bottom", sideOffset = 8, className, children, ...props }, ref) => {
    const { open, menuRef, contentRef } = useDropdownMenu();
    const [position, setPosition] = useState(null);

    useEffect(() => {
      if (!open) return;

      const updatePosition = () => {
        const trigger = menuRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const offset = Number(sideOffset) || 0;
        const next = {
          position: "fixed",
          top: side === "top" ? rect.top - offset : rect.bottom + offset,
          left: align === "end" ? rect.right : align === "center" ? rect.left + rect.width / 2 : rect.left,
          transform: side === "top"
            ? `translate(${align === "end" ? "-100%" : align === "center" ? "-50%" : "0"}, -100%)`
            : `translateX(${align === "end" ? "-100%" : align === "center" ? "-50%" : "0"})`,
        };

        setPosition(next);
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [align, menuRef, open, side, sideOffset]);

    if (!open) return null;

    return createPortal(
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "z-[100] min-w-[180px] rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none",
          className
        )}
        style={position || { position: "fixed", top: 0, left: 0, visibility: "hidden" }}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>,
      document.body
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
