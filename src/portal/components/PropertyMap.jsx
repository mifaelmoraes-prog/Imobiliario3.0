import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatCurrencyBRL } from '../../design-system/SliderRange';

// Coordenadas aproximadas para bairros de Curitiba e São Paulo
const NEIGHBORHOOD_COORDS = {
  // Curitiba
  'batel': [-25.4419, -49.2891],
  'ecoville': [-25.4389, -49.3364],
  'mossunguê': [-25.4389, -49.3364],
  'bigorrilho': [-25.4326, -49.2974],
  'champagnat': [-25.4326, -49.2974],
  'cabral': [-25.4124, -49.2558],
  'juvevê': [-25.4182, -49.2592],
  'água verde': [-25.4528, -49.2858],
  'centro cívico': [-25.4191, -49.2687],
  // São Paulo
  'pinheiros': [-23.5615, -46.7026],
  'itaim bibi': [-23.5847, -46.6811],
  'vila mariana': [-23.5898, -46.6346],
  'moema': [-23.6015, -46.6631],
  'jardins': [-23.5684, -46.6661],
  'perdizes': [-23.5358, -46.6738]
};

const DEFAULT_CENTER = [-25.4284, -49.2733]; // Curitiba

function createCustomPin(price) {
  const shortPrice = price >= 1000000 
    ? `R$ ${(price / 1000000).toFixed(1)}M` 
    : `R$ ${(price / 1000).toFixed(0)}k`;

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="background-color: #C8431F; color: white; padding: 4px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
        ${shortPrice}
      </div>
    `,
    iconSize: [60, 26],
    iconAnchor: [30, 13]
  });
}

export function PropertyMap({ properties, onSelectProperty }) {
  const validProperties = useMemo(() => {
    return properties.map((prop, idx) => {
      const nh = (prop.neighborhood || '').toLowerCase();
      let coords = null;

      for (const [key, val] of Object.entries(NEIGHBORHOOD_COORDS)) {
        if (nh.includes(key)) {
          coords = [val[0] + (Math.random() - 0.5) * 0.008, val[1] + (Math.random() - 0.5) * 0.008];
          break;
        }
      }

      if (!coords) {
        coords = [DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.04, DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.04];
      }

      return {
        ...prop,
        mapCoords: coords
      };
    });
  }, [properties]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card relative z-0">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {validProperties.map((prop) => (
            <Marker
              key={prop.id}
              position={prop.mapCoords}
              icon={createCustomPin(prop.price)}
            >
              <Popup className="property-map-popup">
                <div className="w-64 p-1">
                  <img
                    src={prop.images?.hero || prop.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'}
                    alt={prop.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <span className="text-sm font-bold text-stone-900 block">
                    {formatCurrencyBRL(prop.price)}
                  </span>
                  <span className="text-xs text-stone-600 block mb-1">
                    {prop.neighborhood} · {prop.area} m²
                  </span>
                  <p className="text-xs text-stone-500 line-clamp-1 mb-2">
                    {prop.title}
                  </p>
                  <button
                    onClick={() => onSelectProperty(prop)}
                    className="w-full py-1.5 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-hover transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
