// src/components/ui/drawer.jsx
import * as React from "react";
import { Drawer as VaulDrawer } from "vaul"; // Import from vaul library

const Drawer = React.forwardRef(({ className, ...props }, ref) => {
  return <VaulDrawer className={className} ref={ref} {...props} />;
});
Drawer.displayName = "Drawer";

export { Drawer };
