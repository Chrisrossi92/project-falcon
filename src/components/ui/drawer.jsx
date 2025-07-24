// components/ui/drawer.jsx
import * as React from 'react';
import { Drawer as RadixDrawer } from '@radix-ui/react-dialog'; // Renamed import to avoid conflict; adjust package if it's not dialog-based

const Drawer = React.forwardRef(({ className, ...props }, ref) => {
  return <RadixDrawer className={className} ref={ref} {...props} />;
});
Drawer.displayName = 'Drawer';

export { Drawer };
