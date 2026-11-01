import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { Stepper } from '../../design-system/Stepper';
import { SliderRange, formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  RotateCcw,
  Bot,
  User,
  ArrowRight
} from 'lucide-react';

export function SplitVoiceConcierge({ isOpen, onClose }) {
  const { profile, updatePillar, setMaxBudget, toggleAmenity, activePillarsCount, logActivity } = useBuyerProfile();
  const { properties } = useProperties();

  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'concierge',
      text: 'Olá! Sou seu Concierge Imobiliário. Você pode falar por voz ou digitar o que está buscando. Por exemplo: "Procuro um apartamento de 3 quartos no Batel ou Ecoville até R$ 2 milhões com varanda gourmet".'
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Processa texto e extrai os 4 pilares com inteligência heurística/semântica
  const processInput = (text) => {
    if (!text.trim()) return;

    // Adiciona mensagem do usuário
    const userMsg = { id: `user-${Date.now()}`, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const lower = text.toLowerCase();
    const updates = {};
    const feedbackParts = [];

    // 1. Extração de Bairros
    const neighborhoodsFound = [];
    const knownNeighborhoods = ['batel', 'ecoville', 'bigorrilho', 'cabral', 'juvevê', 'pinheiros', 'itaim bibi', 'vila mariana', 'moema'];
    knownNeighborhoods.forEach(nh => {
      if (lower.includes(nh)) {
        neighborhoodsFound.push(nh.charAt(0).toUpperCase() + nh.slice(1));
      }
    });
    if (neighborhoodsFound.length > 0) {
      updatePillar('location', { neighborhoods: neighborhoodsFound });
      feedbackParts.push(`Localização ajustada para: ${neighborhoodsFound.join(', ')}`);
    }

    // 2. Extração de Quartos
    const bedroomMatch = lower.match(/(\d+)\s*(quarto|quartos|dorm|dormitório|dorms)/);
    if (bedroomMatch) {
      const bedrooms = parseInt(bedroomMatch[1], 10);
      updatePillar('typology', { minBedrooms: bedrooms });
      feedbackParts.push(`Definido mínimo de ${bedrooms} ${bedrooms === 1 ? 'quarto' : 'quartos'}`);
    }

    // 3. Extração de Tipo de Imóvel
    if (lower.includes('apartamento') || lower.includes('apto')) {
      updatePillar('typology', { propertyType: 'Apartamento' });
      feedbackParts.push('Tipologia: Apartamento');
    } else if (lower.includes('casa')) {
      updatePillar('typology', { propertyType: 'Casa' });
      feedbackParts.push('Tipologia: Casa');
    } else if (lower.includes('cobertura')) {
      updatePillar('typology', { propertyType: 'Cobertura' });
      feedbackParts.push('Tipologia: Cobertura');
    }

    // 4. Extração de Orçamento
    const budgetMatch = lower.match(/(até|max|máximo|teto)?\s*(r\$)?\s*(\d+(?:[.,]\d+)?)\s*(milhões|milhao|mi|mil)/);
    if (budgetMatch) {
      const num = parseFloat(budgetMatch[3].replace(',', '.'));
      const unit = budgetMatch[4];
      let val = num;
      if (unit.startsWith('mi')) val = num * 1000000;
      else if (unit === 'mil') val = num * 1000;

      if (val >= 200000) {
        setMaxBudget(val);
        feedbackParts.push(`Teto orçamentário configurado para ${formatCurrencyBRL(val)}`);
      }
    }

    // 5. Comodidades
    const knownAmenities = [
      { key: 'varanda gourmet', label: 'Varanda Gourmet' },
      { key: 'piscina', label: 'Piscina' },
      { key: 'academia', label: 'Academia' },
      { key: 'sol da manhã', label: 'Sol da Manhã' },
      { key: 'pet friendly', label: 'Pet Friendly' },
      { key: 'churrasqueira', label: 'Churrasqueira' }
    ];

    knownAmenities.forEach(item => {
      if (lower.includes(item.key)) {
        toggleAmenity(item.label);
        feedbackParts.push(`Comodidade anotada: ${item.label}`);
      }
    });

    logActivity('CONCIERGE_INTERACTION', `Interação no concierge: "${text}"`);

    // Resposta do Concierge
    setTimeout(() => {
      let replyText = 'Perfeito! Já atualizei seus 4 pilares em tempo real ao lado.';
      if (feedbackParts.length > 0) {
        replyText += ` Entendi: ${feedbackParts.join('. ')}.`;
      }
      replyText += ` Encontrei ${properties.length} imóveis compatíveis com o que você procura. Deseja refinar algo mais?`;

      setMessages(prev => [
        ...prev,
        { id: `concierge-${Date.now()}`, sender: 'concierge', text: replyText }
      ]);
    }, 600);
  };

  // Suporte a gravação de voz contínua
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz nativo. Por favor, utilize o campo de digitação.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processInput(transcript);
    };

    recognition.start();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-5xl"
      showCloseButton={true}
      title="Concierge Digital Imobiliário"
      subtitle="Atendimento multimodal: fale ou digite enquanto seus 4 pilares se organizam ao vivo"
    >
      {/* Layout Dividido em Tempo Real (Ref. UX Tópico 06 / GAP-06.1 e GAP-06.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        
        {/* Painel Esquerdo: Conversa (Voz e Chat com o mesmo peso visual) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-stone-50 dark:bg-stone-850 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
          
          {/* Feed de Diálogo */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[380px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'concierge' && (
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                    m.sender === 'user'
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-br-none shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-bl-none border border-stone-200/70 dark:border-stone-700/70 shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Entrada Multimodal Equilibrada (Ref. UX GAP-06.1) */}
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processInput(inputText);
              }}
              className="flex items-center gap-2"
            >
              {/* Botão de Voz com Alvo Generoso */}
              <button
                type="button"
                onClick={handleToggleVoice}
                aria-label={isRecording ? "Parar gravação" : "Falar por voz"}
                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:text-accent hover:border-accent shadow-sm'
                }`}
                title={isRecording ? "Ouvindo... Clique para parar" : "Clique para falar"}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Campo de Texto para Digitação Direta */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ou digite o que procura (ex.: Casa no Ecoville)..."
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 text-xs sm:text-sm focus:outline-none focus:border-accent"
              />

              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={!inputText.trim()}
                icon={Send}
                ariaLabel="Enviar mensagem"
                className="min-h-[48px]"
              />
            </form>

            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span>{isRecording ? "🔴 Ouvindo sua voz com atenção..." : "Dica: Fale naturalmente sobre bairro, orçamento e estilo de vida"}</span>
            </div>
          </div>

        </div>

        {/* Painel Direito: Os 4 Pilares Preenchendo e Editáveis ao Vivo (Ref. UX GAP-06.2) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-stone-850 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 space-y-4">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-bold text-stone-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Seus 4 Pilares ao Vivo
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {activePillarsCount} de 4 definidos
              </span>
            </div>

            <div className="space-y-4 mt-3 text-xs">
              
              {/* Pilar 1: Localização */}
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-semibold text-stone-700 dark:text-stone-200 block mb-1">
                  1. Localização
                </span>
                {profile.location?.neighborhoods?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {profile.location.neighborhoods.map(n => (
                      <span key={n} className="bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">ex.: Batel, Ecoville, Pinheiros...</span>
                )}
              </div>

              {/* Pilar 2: Tipologia */}
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-semibold text-stone-700 dark:text-stone-200 block mb-1">
                  2. Tipologia
                </span>
                <span className="text-stone-800 dark:text-stone-200 font-medium">
                  {profile.typology?.propertyType || 'Todos'} · {profile.typology?.minBedrooms || 0}+ quartos
                </span>
              </div>

              {/* Pilar 3: Orçamento */}
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-semibold text-stone-700 dark:text-stone-200 block mb-1">
                  3. Teto Orçamentário
                </span>
                <span className="text-accent font-bold text-sm">
                  {profile.budget?.maxBudget >= 10000000 
                    ? 'Sem Limite' 
                    : formatCurrencyBRL(profile.budget?.maxBudget)}
                </span>
              </div>

              {/* Pilar 4: Estilo de Vida */}
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60">
                <span className="font-semibold text-stone-700 dark:text-stone-200 block mb-1">
                  4. Estilo de Vida
                </span>
                {profile.lifestyle?.amenities?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {profile.lifestyle.amenities.map(a => (
                      <span key={a} className="bg-accent/10 text-accent px-2 py-0.5 rounded font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">ex.: Varanda Gourmet, Sol da Manhã...</span>
                )}
              </div>

            </div>
          </div>

          {/* Botão de Fechar e Ver Resultados */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              variant="primary"
              size="lg"
              onClick={onClose}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full shadow-md"
            >
              Explorar {properties.length} Imóveis no Catálogo
            </Button>
          </div>

        </div>

      </div>
    </Modal>
  );
}
