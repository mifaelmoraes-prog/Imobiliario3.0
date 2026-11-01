import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Car, 
  Bath, 
  Maximize2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Calendar, 
  Calculator, 
  ThumbsDown,
  ShieldCheck,
  Check
} from 'lucide-react';

export function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onOpenCriticism,
  onOpenFinanceSimulator
}) {
  const { profile, logActivity } = useBuyerProfile();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  if (!property) return null;

  const {
    id,
    title,
    type,
    neighborhood,
    city,
    price = 0,
    pricePerM2,
    area = 0,
    bedrooms = 0,
    suites = 0,
    bathrooms = 0,
    parking = 0,
    condoFee = 0,
    iptuMonthly = 0,
    description,
    amenities = [],
    images = {},
    matchScore,
    matchDetails
  } = property;

  const photos = [
    images.hero || property.image,
    images.kitchen,
    images.bedroom,
    images.leisure
  ].filter(Boolean);

  if (photos.length === 0) {
    photos.push('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');
  }

  const calculatedM2 = pricePerM2 || (area > 0 && price > 0 ? Math.round(price / area) : null);
  const totalMonthlyHolding = (condoFee || 0) + (iptuMonthly || 0);

  // Listing Quality Score (LQS) simulado / auditado (US-06)
  const lqsScore = 94; // Ex.: 94/100

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      `Olá! Tenho interesse no imóvel ${title} no bairro ${neighborhood} (${formatCurrencyBRL(price)}). Gostaria de agendar uma visita e receber mais informações.`
    );
    logActivity('WHATSAPP_CLICK', `Lead clicou para falar no WhatsApp sobre ${title}`, { propertyId: id });
    window.open(`https://wa.me/5541999999999?text=${text}`, '_blank');
  };

  const handleScheduleVisit = (e) => {
    e.preventDefault();
    setIsScheduled(true);
    logActivity('SCHEDULE_VISIT', `Visita solicitada para ${title} por ${leadName || 'Comprador'}`, {
      propertyId: id,
      leadName,
      leadPhone
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      showCloseButton={true}
    >
      <div className="space-y-6">

        {/* Galeria de Fotos */}
        <div className="space-y-2">
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
            <img
              src={photos[selectedPhoto]}
              alt={title}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {matchScore && (
              <div className="absolute top-4 left-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-accent shadow-md flex items-center gap-1.5 border border-stone-200/50">
                <Sparkles className="w-4 h-4" />
                <span>Match {matchScore}% com seu perfil</span>
              </div>
            )}
            <div className="absolute bottom-4 right-4 bg-stone-900/70 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-sm font-medium">
              Foto {selectedPhoto + 1} de {photos.length}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhoto(idx)}
                  className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    selectedPhoto === idx ? 'border-accent ring-2 ring-accent/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Miniatura" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Título, Preço e Localização */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                {type || 'Imóvel'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>LQS {lqsScore}/100</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-tight">
              {title}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-stone-400" />
              <span>{neighborhood}, {city}</span>
            </p>
          </div>

          <div className="md:text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tabular-nums">
              {formatCurrencyBRL(price)}
            </div>
            {calculatedM2 && (
              <span className="text-xs text-stone-500 block font-medium">
                R$ {calculatedM2.toLocaleString('pt-BR')}/m²
              </span>
            )}
            {totalMonthlyHolding > 0 && (
              <span className="text-xs text-stone-500 block mt-1">
                Condomínio: R$ {condoFee} · IPTU: R$ {iptuMonthly}/mês
              </span>
            )}
          </div>
        </div>

        {/* Especificações Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Área Útil</span>
              <span className="text-sm font-bold text-stone-900 dark:text-white">{area} m²</span>
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Quartos</span>
              <span className="text-sm font-bold text-stone-900 dark:text-white">
                {bedrooms} {suites > 0 ? `(${suites} suítes)` : ''}
              </span>
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Vagas</span>
              <span className="text-sm font-bold text-stone-900 dark:text-white">
                {parking} {parking === 1 ? 'vaga' : 'vagas'}
              </span>
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 shadow-sm">
              <Bath className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 block">Banheiros</span>
              <span className="text-sm font-bold text-stone-900 dark:text-white">{bathrooms}</span>
            </div>
          </div>
        </div>

        {/* Match Explicável em 5 Dimensões (US-05) */}
        {matchDetails && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                Explicabilidade do Match com seu Perfil
              </span>
              <span className="text-xs font-semibold text-accent">
                {matchDetails.summary}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {matchDetails.whyMatches?.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{msg}</span>
                </div>
              ))}

              {matchDetails.whyNot?.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descrição e Comodidades */}
        <div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-2">Sobre o Imóvel</h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-4">
            {description}
          </p>

          {amenities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Comodidades & Diferenciais</h4>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map(a => (
                  <span key={a} className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2.5 py-1 rounded-md font-medium">
                    ✓ {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ações de Conversão e Pré-Requisitos */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenCriticism(property)}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ThumbsDown className="w-3.5 h-3.5 text-stone-400" />
              <span>O que não gostou? (Refinar Perfil)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="md"
              icon={Calculator}
              onClick={() => onOpenFinanceSimulator(property)}
            >
              Simular Financiamento
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={MessageSquare}
              onClick={handleWhatsAppContact}
            >
              Falar com Consultor
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
