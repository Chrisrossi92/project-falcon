// /src/hooks/useEditableForm.js
import { useState, useEffect } from 'react';

export function useEditableForm(initialData = {}) {
  const [editedData, setEditedData] = useState(initialData);

  useEffect(() => {
    setEditedData(initialData); // Update when initialData changes (e.g., when switching orders)
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const updateField = (field, value) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    editedData,
    setEditedData,
    handleChange,
    updateField,
  };
}
