// components/MapContainer.jsx

// <MapContainer address={order.address} />

import React from 'react';

const MapContainer = ({ lat, lng, className = '' }) => {
  const mapSrc = `https://www.google.com/maps?q=${lat},${lng}&hl=es;z=14&output=embed`;

  return (
    <div className={`w-full h-64 rounded-md overflow-hidden border ${className}`}>
      <iframe
        title="Google Map"
        src={mapSrc}
        width="100%"
        height="100%"
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-full"
      />
    </div>
  );
};

export default MapContainer;
