// components/ui/AddressAutocomplete.jsx
import React, { useEffect, useRef } from 'react';

const AddressAutocomplete = ({ onAddressSelect, placeholder = 'Enter address' }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!window.google || !window.google.maps) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      const components = {};
      place.address_components.forEach(({ types, long_name, short_name }) => {
        if (types.includes('street_number')) components.street_number = long_name;
        if (types.includes('route')) components.route = long_name;
        if (types.includes('locality')) components.city = long_name;
        if (types.includes('administrative_area_level_2')) components.county = long_name;
        if (types.includes('administrative_area_level_1')) components.state = short_name;
        if (types.includes('postal_code')) components.zip = long_name;
      });

      const address = [components.street_number, components.route].filter(Boolean).join(' ');

      onAddressSelect({
        address,
        city: components.city || '',
        county: components.county || '',
        state: components.state || '',
        zip: components.zip || '',
        full: place.formatted_address,
      });
    });
  }, [onAddressSelect]);

  return (
    <input
      type="text"
      ref={inputRef}
      placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring"
    />
  );
};

export default AddressAutocomplete;