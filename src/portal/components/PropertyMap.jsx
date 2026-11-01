import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { getPropertyCoordinates, getMapViewport, CAPITAL_CENTERS } from '../../services/geoService';
import { useProperties } from '../../context/PropertyContext';
import { MapPin, Navigation, Maximize2, Bed, Car } from 'lucide-react';

/**
 * Controlador de Câmera / Viewport Reativo do Mapa
 * Ajusta o centro e zoom suavemente quando a cidade filtrada é alterada
 */
function MapViewController({ selectedCity, properties }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedCity && selectedCity !== 'Todas' && selectedCity !== '') {
      const viewport = getMapViewport(selectedCity, properties);
      map.flyTo(viewport.center, viewport.zoom, { duration: 1.2 });
    } else if (properties.length > 0) {
      // Ajusta o enquadramento (bounds) para cobrir todos os imóveis visíveis no Brasil
      try {
        const points = properties.map(p => p.mapCoords);
        if (points.length > 0) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1.2 });
        }
      } catch (err) {
        map.setView([-24.8, -47.0], 6);
      }
    }
  }, [selectedCity, properties, map]);

  return null;
}

/**
 * Criação do Pin Customizado do Imóvel no Mapa
 */
function createCustomPin(price, isSelected = false) {
  const shortPrice = price >= 1000000 
    ? `R$ ${(price / 1000000).toFixed(1)}M` 
    : `R$ ${(price / 1000).toFixed(0)}k`;

  return L.divIcon({
    className: 'custom-property-pin',
    html: `
      <div style="
        background-color: ${isSelected ? '#B33917' : '#C8431F'};
        color: white;
        padding: 4px 8px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 11px;
        font-family: Inter, system-ui, sans-serif;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -100%);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        ${shortPrice}
      </div>
    `,
    iconSize: [60, 26],
    iconAnchor: [0, 0]
  });
}

export function PropertyMap({ onSelectProperty }) {
  const { 
    properties, 
    selectedCity, 
    setSelectedCity, 
    availableCities,
    activePropertyDetail 
  } = useProperties();

  // Mapeia coordenadas com precisão de Estado, Cidade, Bairro e Rua
  const validProperties = useMemo(() => {
    return properties.map((prop) => {
      const coords = getPropertyCoordinates(prop);
      return {
        ...prop,
        mapCoords: coords
      };
    });
  }, [properties]);

  const initialViewport = useMemo(() => {
    return getMapViewport(selectedCity, validProperties);
  }, [selectedCity, validProperties]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Barra Flutuante de Cidades sobre o Mapa */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-850 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-card text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
          <Navigation className="w-4 h-4 text-accent" />
          <span>Explorar Capitais:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCity('')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              !selectedCity || selectedCity === 'Todas'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Todas as Cidades ({validProperties.length})
          </button>

          {availableCities.map(city => {
            const countInCity = properties.filter(p => p.city && p.city.toLowerCase().includes(city.toLowerCase())).length;
            const isSelected = selectedCity && selectedCity.toLowerCase().includes(city.toLowerCase());

            return (
              <button
                key={city}
                onClick={() => setSelectedCity(isSelected ? '' : city)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {city} ({countInCity})
              </button>
            );
          })}
        </div>
      </div>

      {/* Container do Mapa Leaflet */}
      <div className="w-full h-[680px] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card relative z-0">
        <MapContainer
          center={initialViewport.center}
          zoom={initialViewport.zoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewController selectedCity={selectedCity} properties={validProperties} />

          {validProperties.map((prop) => {
            const isSelected = activePropertyDetail?.id === prop.id;
            const calculatedM2 = prop.pricePerM2 || (prop.area > 0 && prop.price > 0 ? Math.round(prop.price / prop.area) : null);

            return (
              <Marker
                key={prop.id}
                position={prop.mapCoords}
                icon={createCustomPin(prop.price, isSelected)}
              >
                <Popup className="property-map-popup" minWidth={260} maxWidth={300}>
                  <div className="p-1 text-stone-900 font-sans">
                    
                    {/* Foto de Capa */}
                    <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-2 bg-stone-100">
                      <img
                        src={prop.images?.hero || prop.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {prop.matchScore && (
                        <div className="absolute top-1.5 left-1.5 bg-accent text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                          Match {prop.matchScore}%
                        </div>
                      )}
                    </div>

                    {/* Preço e R$/m² */}
                    <div className="flex items-baseline justify-between gap-1 mb-1">
                      <span className="text-base font-extrabold text-stone-900 tabular-nums">
                        {formatCurrencyBRL(prop.price)}
                      </span>
                      {calculatedM2 && (
                        <span className="text-[11px] font-semibold text-stone-500 tabular-nums">
                          R$ {calculatedM2.toLocaleString('pt-BR')}/m²
                        </span>
                      )}
                    </div>

                    {/* Hierarquia Completa: Estado > Cidade > Bairro */}
                    <div className="bg-stone-100 p-2 rounded-md mb-2 text-[11px] text-stone-700 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-stone-800">
                        <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{prop.city}</span>
                      </div>
                      <div className="pl-4 font-semibold text-accent">
                        Bairro: {prop.neighborhood}
                      </div>
                    </div>

                    {/* Specs em Linha */}
                    <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium mb-3 px-1">
                      <span>{prop.area} m²</span>
                      <span>{prop.bedrooms} {prop.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                      <span>{prop.parking || 0} {prop.parking === 1 ? 'vaga' : 'vagas'}</span>
                    </div>

                    {/* Botão de Ação */}
                    <button
                      type="button"
                      onClick={() => onSelectProperty(prop)}
                      className="w-full py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Ver Detalhes Completos
                    </button>

                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
}
