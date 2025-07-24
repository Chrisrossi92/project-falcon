// src/components/orders/OrderInfoFields.jsx
import React from 'react';
import BasicInfoFields from './BasicInfoFields';
import AssignmentFields from './AssignmentFields';
import DateFields from './DateFields';
import TypeFields from './TypeFields';
import FeeFields from './FeeFields';
import InvoiceFields from './InvoiceFields';
import NotesField from './NotesField';

export default function OrderInfoFields(props) {
  const { disabled } = props; // Extract for passing down

  return (
    <>
      <BasicInfoFields {...props} disabled={disabled} />
      <AssignmentFields {...props} disabled={disabled} />
      <DateFields {...props} disabled={disabled} />
      <TypeFields {...props} disabled={disabled} />
      <FeeFields {...props} disabled={disabled} />
      <InvoiceFields {...props} disabled={disabled} />
      <NotesField {...props} disabled={disabled} />
    </>
  );
}