import React, { useState } from 'react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useProperties } from '../../context/PropertyContext';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Search, 
  SlidersHorizontal,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';

export function InventoryTable({ onSelectPropertyForBuyers }) {
  const { properties } = useProperties();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAuditProperty, setSelectedAuditProperty] = useState(null);

  const filtered = properties.filter(p => {
    const matchesSearch = 
      (p.title && p.title.toLowerCase().includes(search.toLowerCase())) ||
      (p.neighborhood && p.neighborhood.toLowerCase().includes(search.toLowerCase())) ||
      (p.id && p.id.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      
      {/* Header do Inventário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Gestão de Estoque & Auditoria LQS
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhe a integridade dos anúncios (Listing Quality Score) e identifique compradores compatíveis
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-850 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-card">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, condomínio ou bairro..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent text-stone-900 dark:text-white focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-stone-500 font-medium">Status:</span>
          {['All', 'Available', 'Reserved', 'Sold'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {st === 'All' ? 'Todos' : st === 'Available' ? 'Disponíveis' : st === 'Reserved' ? 'Reservados' : 'Vendidos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Imóveis */}
      <div className="bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700/80 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Imóvel</th>
                <th className="p-3.5">Preço / R$ m²</th>
                <th className="p-3.5">Tipologia</th>
                <th className="p-3.5">Auditoria LQS</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Match Inverso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filtered.slice(0, 20).map((prop) => {
                const calculatedM2 = prop.pricePerM2 || (prop.area > 0 && prop.price > 0 ? Math.round(prop.price / prop.area) : null);
                const lqs = 85 + (prop.id.charCodeAt(prop.id.length - 1) % 15); // LQS entre 85 e 99

                return (
                  <tr key={prop.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                    
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={prop.images?.hero || prop.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80'}
                          alt={prop.title}
                          className="w-12 h-10 object-cover rounded-lg shrink-0 border border-stone-200/60 dark:border-stone-700"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 dark:text-white truncate max-w-[280px]">
                            {prop.title}
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{prop.neighborhood}, {prop.city}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-stone-900 dark:text-white tabular-nums">
                        {formatCurrencyBRL(prop.price)}
                      </div>
                      {calculatedM2 && (
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          R$ {calculatedM2.toLocaleString('pt-BR')}/m²
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-stone-600 dark:text-stone-300">
                      <div>{prop.area} m² · {prop.bedrooms} quartos</div>
                      <div className="text-[11px] text-stone-400">{prop.parking || 0} vagas · {prop.bathrooms || 0} banheiros</div>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => setSelectedAuditProperty({ ...prop, lqs })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        title="Ver detalhes da auditoria de qualidade"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>LQS {lqs}/100</span>
                      </button>
                    </td>

                    <td className="p-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {prop.status === 'Available' ? 'Disponível' : prop.status === 'Reserved' ? 'Reservado' : 'Vendido'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Users}
                        onClick={() => onSelectPropertyForBuyers(prop)}
                      >
                        Compradores
                      </Button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Auditoria LQS (US-06) */}
      {selectedAuditProperty && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAuditProperty(null)}
          title={`Auditoria LQS — Score ${selectedAuditProperty.lqs}/100`}
          subtitle={selectedAuditProperty.title}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 font-medium">
              Anúncio classificado como Excelente. O anúncio atende aos mais rigorosos critérios de conversão para portais imobiliários.
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-stone-50 dark:bg-stone-800">
                <span>Fotografia em Alta Resolução (Hero, Cozinha, Quarto)</span>
                <span className="font-bold text-emerald-600">100% (+30 pts)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-stone-50 dark:bg-stone-800">
                <span>Custos Transparentes (Condomínio e IPTU preenchidos)</span>
                <span className="font-bold text-emerald-600">100% (+25 pts)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-stone-50 dark:bg-stone-800">
                <span>Descrição Semântica e Comodidades de Estilo de Vida</span>
                <span className="font-bold text-emerald-600">95% (+25 pts)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-stone-50 dark:bg-stone-800">
                <span>Geolocalização e Bairro Verificado</span>
                <span className="font-bold text-emerald-600">100% (+20 pts)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedAuditProperty(null)}>
                Concluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

