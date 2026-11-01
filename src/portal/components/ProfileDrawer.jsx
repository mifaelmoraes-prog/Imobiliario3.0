import React from 'react';
import { Drawer } from '../../design-system/Drawer';
import { Stepper } from '../../design-system/Stepper';
import { SliderRange } from '../../design-system/SliderRange';
import { Button } from '../../design-system/Button';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { RotateCcw, Check } from 'lucide-react';

const COMMON_AMENITIES = [
  'Varanda Gourmet',
  'Piscina',
  'Academia',
  'Sol da Manhã',
  'Pet Friendly',
  'Portaria 24h',
  'Churrasqueira',
  'Vista Panorâmica',
  'Ar Condicionado',
  'Mobiliado'
];

const PROPERTY_TYPES = ['Todos', 'Apartamento', 'Casa', 'Cobertura'];

const POPULAR_NEIGHBORHOODS = [
  'Batel',
  'Ecoville',
  'Bigorrilho',
  'Cabral',
  'Juvevê',
  'Pinheiros',
  'Itaim Bibi',
  'Vila Mariana',
  'Moema'
];

export function ProfileDrawer({ isOpen, onClose }) {
  const { profile, updatePillar, setMaxBudget, toggleAmenity, resetProfile } = useBuyerProfile();
  const { properties } = useProperties();

  const handleNeighborhoodToggle = (neighborhood) => {
    const current = profile.location?.neighborhoods || [];
    const exists = current.includes(neighborhood);
    const updated = exists ? current.filter(n => n !== neighborhood) : [...current, neighborhood];
    updatePillar('location', { neighborhoods: updated });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Personalizar Perfil de Busca"
      subtitle="Recálculo 100% automático dos imóveis e do score de compatibilidade"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={resetProfile}
            className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Redefinir Tudo</span>
          </button>
          <Button variant="primary" size="md" onClick={onClose} icon={Check}>
            Ver {properties.length} Imóveis
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* 1. Pilar Orçamento */}
        <div className="bg-stone-50/80 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            1. Orçamento e Capacidade
          </h3>
          <SliderRange
            label="Preço Máximo Desejado"
            value={profile.budget?.maxBudget || 10000000}
            min={300000}
            max={10000000}
            step={100000}
            onChange={(val) => setMaxBudget(val)}
          />

          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="acceptsFinancing"
              checked={profile.budget?.acceptsFinancing ?? true}
              onChange={(e) => updatePillar('budget', { acceptsFinancing: e.target.checked })}
              className="rounded border-stone-300 text-accent focus:ring-accent"
            />
            <label htmlFor="acceptsFinancing" className="text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
              Considerar imóveis aptos para financiamento bancário
            </label>
          </div>
        </div>

        {/* 2. Pilar Tipologia */}
        <div className="bg-stone-50/80 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            2. Tipologia e Espaço
          </h3>

          <div>
            <span className="text-xs font-medium text-stone-600 dark:text-stone-300 block mb-1.5">
              Tipo de Imóvel
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PROPERTY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => updatePillar('typology', { propertyType: type })}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center ${
                    profile.typology?.propertyType === type
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stepper
              label="Quartos Mínimos"
              value={profile.typology?.minBedrooms || 0}
              min={0}
              max={6}
              unit="quarto"
              pluralUnit="quartos"
              onChange={(val) => updatePillar('typology', { minBedrooms: val })}
            />

            <Stepper
              label="Vagas Mínimas"
              value={profile.typology?.minParking || 0}
              min={0}
              max={6}
              unit="vaga"
              pluralUnit="vagas"
              onChange={(val) => updatePillar('typology', { minParking: val })}
            />
          </div>
        </div>

        {/* 3. Pilar Localização */}
        <div className="bg-stone-50/80 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            3. Bairros Preferenciais
          </h3>
          <p className="text-xs text-stone-500 mb-3">
            Selecione uma ou mais regiões de interesse:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_NEIGHBORHOODS.map(nh => {
              const selected = (profile.location?.neighborhoods || []).includes(nh);
              return (
                <button
                  key={nh}
                  onClick={() => handleNeighborhoodToggle(nh)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                    selected
                      ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900 dark:border-white'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {nh} {selected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Pilar Estilo de Vida */}
        <div className="bg-stone-50/80 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            4. Estilo de Vida e Comodidades
          </h3>
          <p className="text-xs text-stone-500 mb-3">
            Critérios que elevam a compatibilidade do imóvel:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_AMENITIES.map(amenity => {
              const selected = (profile.lifestyle?.amenities || []).includes(amenity);
              return (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                    selected
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {amenity} {selected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </Drawer>
  );
}
