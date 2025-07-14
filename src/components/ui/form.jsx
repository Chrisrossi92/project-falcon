// components/ui/form.jsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const FormField = ({ label, children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      {children}
    </div>
  );
};

export { FormField };