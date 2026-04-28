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
    const childArray = React.Children.toArray(children).filter(Boolean);

    useEffect(() => {
      if (!open) return;

      const updatePosition = () => {
        const trigger = menuRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const offset = Number(sideOffset) || 0;
        const viewportPadding = 8;
        const estimatedWidth = 220;

        let top = side === "top" ? rect.top - offset : rect.bottom + offset;

        let left = rect.left;
        if (align === "end") left = rect.right - estimatedWidth;
        if (align === "center") left = rect.left + rect.width / 2 - estimatedWidth / 2;

        left = Math.min(Math.max(viewportPadding, left), window.innerWidth - estimatedWidth - viewportPadding);
        top = Math.max(viewportPadding, top);

        setPosition({ position: "fixed", top, left });
      };

      const updatePositionForMountedContent = () => {
        updatePosition();

        const trigger = menuRef.current;
        const content = contentRef.current;
        if (!trigger || !content) return;

        const rect = trigger.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const offset = Number(sideOffset) || 0;
        const viewportPadding = 8;
        const width = contentRect.width || 220;
        const height = contentRect.height || 0;
        const roomBelow = window.innerHeight - rect.bottom;
        const roomAbove = rect.top;
        const shouldOpenTop =
          (side === "top" || rect.bottom + offset + height > window.innerHeight - viewportPadding) &&
          roomAbove > roomBelow;

        let top = shouldOpenTop ? rect.top - offset - height : rect.bottom + offset;
        let left = rect.left;
        if (align === "end") left = rect.right - width;
        if (align === "center") left = rect.left + rect.width / 2 - width / 2;

        left = Math.min(Math.max(viewportPadding, left), window.innerWidth - width - viewportPadding);
        top = Math.max(viewportPadding, top);

        setPosition({ position: "fixed", top, left });
      };

      updatePosition();
      const frame = window.requestAnimationFrame(updatePositionForMountedContent);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [align, menuRef, open, side, sideOffset]);

    if (!open || childArray.length === 0) return null;

    return createPortal(
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "w-56 rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg focus:outline-none",
          className
        )}
        style={{
          ...(position || { position: "fixed", top: 0, left: 0 }),
          minWidth: 224,
          maxWidth: "calc(100vw - 16px)",
          zIndex: 1000,
        }}
        {...props}
      >
        <div className="flex max-h-80 flex-col overflow-y-auto p-1">
          {childArray}
        </div>
      </div>,
      document.body
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef(
  ({ children, className, inset, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownMenu();

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex min-h-9 w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-left text-sm leading-5 text-slate-900 outline-none transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        }}
        {...props}
      >
        <span className="block min-w-0 flex-1 truncate text-left">
          {children}
        </span>
      </button>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuPortal = ({ children }) => <>{children}</>;
