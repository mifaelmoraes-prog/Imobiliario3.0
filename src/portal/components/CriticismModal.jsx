import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { ThumbsDown, Check, Sparkles } from 'lucide-react';

const COMMON_DISLIKES = [
  'Preço muito alto para a metragem',
  'Condomínio muito caro',
  'Bairro não é o preferido',
  'Poucas vagas de garagem',
  'Falta área de lazer no condomínio',
  'Pouca iluminação natural / Sol',
  'Planta mal distribuída',
  'Acabamento antigo'
];

export function CriticismModal({ property, isOpen, onClose }) {
  const { profile, updatePillar, logActivity } = useBuyerProfile();
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  if (!property) return null;

  const toggleReason = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = () => {
    // Calibra o perfil com base nas críticas
    if (selectedReasons.includes('Preço muito alto para a metragem') && property.price) {
      // Ajusta teto para baixo do valor deste imóvel
      updatePillar('budget', { maxBudget: Math.min(profile.budget.maxBudget, property.price * 0.95) });
    }
    if (selectedReasons.includes('Poucas vagas de garagem')) {
      updatePillar('typology', { minParking: Math.max(profile.typology.minParking, (property.parking || 0) + 1) });
    }

    logActivity('PROPERTY_CRITICISM', `Crítica registrada para ${property.title}: ${selectedReasons.join(', ')}`, {
      propertyId: property.id,
      reasons: selectedReasons
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedReasons([]);
      onClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="O que você não gostou neste imóvel?"
      subtitle={`Sua opinião ajuda a refinar a curadoria e eliminar opções fora do seu padrão.`}
      maxWidth="max-w-lg"
    >
      {submitted ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-stone-900 dark:text-white">Perfil calibrado com sucesso!</h4>
          <p className="text-xs text-stone-500">
            Ajustamos seus filtros para priorizar opções mais alinhadas ao seu gosto.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Selecione os motivos pelos quais este imóvel não te agradou:
          </p>

          <div className="flex flex-wrap gap-2">
            {COMMON_DISLIKES.map(reason => {
              const selected = selectedReasons.includes(reason);
              return (
                <button
                  key={reason}
                  onClick={() => toggleReason(reason)}
                  className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all text-left ${
                    selected
                      ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300 font-semibold shadow-sm'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {reason} {selected && '✕'}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-600 hover:text-stone-900"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              size="md"
              disabled={selectedReasons.length === 0}
              onClick={handleSubmit}
            >
              Calibrar Perfil
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

