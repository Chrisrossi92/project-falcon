// components/ui/drawer.jsx
import * as React from 'react';
import { Drawer } from '@radix-ui/react-dialog'; // or @radix-ui/react-drawer if it exists

const Drawer = React.forwardRef(({ className, ...props }, ref) => {
  return <RadixDrawer className={className} ref={ref} {...props} />;
});
Drawer.displayName = 'Drawer';

export { Drawer };
