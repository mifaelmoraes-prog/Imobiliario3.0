import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { FileDown, MessageSquare, Check, Sparkles } from 'lucide-react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';

export function ExitIntentModal({ isOpen, onClose }) {
  const { profile, identifyLead, logActivity } = useBuyerProfile();
  const { properties, favorites } = useProperties();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Pega imóveis favoritos ou os 3 maiores matches
  const selectedDossierProperties = favorites.length > 0
    ? properties.filter(p => favorites.includes(p.id))
    : properties.slice(0, 3);

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    identifyLead({ leadName: name, leadPhone: phone });
    logActivity('DOSSIER_DOWNLOAD', `Dossiê baixado por ${name} (${phone}) com ${selectedDossierProperties.length} imóveis`);

    setDownloadSuccess(true);
    setTimeout(() => {
      // Dispara impressão / salvar como PDF nativo do navegador
      window.print();
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Antes de ir: Deseja baixar o Dossiê destes Imóveis?"
      subtitle="Reunimos as opções mais compatíveis com o seu perfil em um documento resumido."
      maxWidth="max-w-lg"
    >
      {downloadSuccess ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-stone-900 dark:text-white">Dossiê gerado com sucesso!</h4>
          <p className="text-xs text-stone-500">
            A janela de impressão/PDF foi aberta e nosso consultor já tem seu contato prioritário.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Mini Lista dos Imóveis Selecionados */}
          <div className="space-y-2 bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              {favorites.length > 0 ? 'Seus Imóveis Favoritados' : 'Top 3 Imóveis Compatíveis'}:
            </span>
            {selectedDossierProperties.slice(0, 3).map(prop => (
              <div key={prop.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-200/50 dark:border-stone-700/50 last:border-0">
                <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[240px]">
                  {prop.title}
                </span>
                <span className="font-bold text-accent tabular-nums">
                  {formatCurrencyBRL(prop.price)}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleConfirm} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 block mb-1">
                Seu Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como prefere ser chamado?"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 block mb-1">
                WhatsApp com DDD
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 99999-9999"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800"
              >
                Agora não
              </button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                icon={FileDown}
              >
                Gerar Dossiê em PDF
              </Button>
            </div>
          </form>

        </div>
      )}
    </Modal>
  );
}

