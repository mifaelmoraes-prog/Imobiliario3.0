import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { calculatePropertyMatch } from '../../services/smartMatchEngine';
import { extractBudget } from '../../services/conciergeParser';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  User,
  ArrowRight
} from 'lucide-react';

const KNOWN_NEIGHBORHOODS = ['batel', 'ecoville', 'bigorrilho', 'cabral', 'juvevê', 'pinheiros', 'itaim bibi', 'vila mariana', 'moema'];

const KNOWN_AMENITIES = [
  { key: 'varanda gourmet', label: 'Varanda Gourmet' },
  { key: 'piscina', label: 'Piscina' },
  { key: 'academia', label: 'Academia' },
  { key: 'sol da manhã', label: 'Sol da Manhã' },
  { key: 'pet friendly', label: 'Pet Friendly' },
  { key: 'churrasqueira', label: 'Churrasqueira' }
];

const getSpeechRecognition = () =>
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

export function SplitVoiceConcierge({ isOpen, onClose }) {
  const { profile, updatePillar, setMaxBudget, addAmenities, activePillarsCount, logActivity } = useBuyerProfile();
  const { properties } = useProperties();

  const [isRecording, setIsRecording] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'concierge',
      text: 'Olá! Sou seu Concierge Imobiliário. Você pode falar por voz ou digitar o que está buscando. Por exemplo: "Procuro um apartamento de 3 quartos no Batel ou Ecoville até R$ 2 milhões com varanda gourmet".'
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const replyTimeoutsRef = useRef(new Set());

  // Refs com os valores mais recentes: o callback de voz e o setTimeout
  // rodam depois do render em que foram criados.
  const profileRef = useRef(profile);
  const propertiesRef = useRef(properties);
  profileRef.current = profile;
  propertiesRef.current = properties;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Encerra o microfone e respostas pendentes ao fechar o modal ou desmontar
  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setIsRecording(false);
    }
  }, [isOpen]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    replyTimeoutsRef.current.forEach(clearTimeout);
    replyTimeoutsRef.current.clear();
  }, []);

  const fallbackToText = (hint) => {
    setVoiceHint(hint);
    setIsRecording(false);
    inputRef.current?.focus();
  };

  // Processa texto e extrai os 4 pilares com inteligência heurística/semântica
  const processInput = (text) => {
    if (!text.trim()) return;

    // Adiciona mensagem do usuário
    const userMsg = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const lower = text.toLowerCase();
    const feedbackParts = [];

    // Perfil projetado com as alterações desta mensagem, para contar compatíveis
    // sem depender do próximo render.
    const current = profileRef.current;
    const projected = {
      ...current,
      location: { ...current.location },
      typology: { ...current.typology },
      budget: { ...current.budget },
      lifestyle: { ...current.lifestyle, amenities: [...(current.lifestyle?.amenities || [])] }
    };

    // 1. Extração de Bairros
    const neighborhoodsFound = KNOWN_NEIGHBORHOODS
      .filter(nh => lower.includes(nh))
      .map(nh => nh.charAt(0).toUpperCase() + nh.slice(1));
    if (neighborhoodsFound.length > 0) {
      updatePillar('location', { neighborhoods: neighborhoodsFound });
      projected.location.neighborhoods = neighborhoodsFound;
      feedbackParts.push(`Localização ajustada para: ${neighborhoodsFound.join(', ')}`);
    }

    // 2. Extração de Quartos
    const bedroomMatch = lower.match(/(\d+)\s*(quarto|quartos|dorm|dormitório|dorms)/);
    if (bedroomMatch) {
      const bedrooms = parseInt(bedroomMatch[1], 10);
      updatePillar('typology', { minBedrooms: bedrooms });
      projected.typology.minBedrooms = bedrooms;
      feedbackParts.push(`Definido mínimo de ${bedrooms} ${bedrooms === 1 ? 'quarto' : 'quartos'}`);
    }

    // 3. Extração de Tipo de Imóvel
    let propertyType = null;
    if (lower.includes('apartamento') || lower.includes('apto')) propertyType = 'Apartamento';
    else if (lower.includes('casa')) propertyType = 'Casa';
    else if (lower.includes('cobertura')) propertyType = 'Cobertura';
    if (propertyType) {
      updatePillar('typology', { propertyType });
      projected.typology.propertyType = propertyType;
      feedbackParts.push(`Tipologia: ${propertyType}`);
    }

    // 4. Extração de Orçamento
    const budget = extractBudget(text);
    if (budget !== null) {
      setMaxBudget(budget);
      projected.budget.maxBudget = budget;
      feedbackParts.push(`Teto orçamentário configurado para ${formatCurrencyBRL(budget)}`);
    }

    // 5. Comodidades: apenas adiciona (repetir um item não o remove)
    const amenitiesFound = KNOWN_AMENITIES.filter(item => lower.includes(item.key)).map(item => item.label);
    if (amenitiesFound.length > 0) {
      addAmenities(amenitiesFound);
      amenitiesFound.forEach(a => {
        if (!projected.lifestyle.amenities.includes(a)) projected.lifestyle.amenities.push(a);
      });
      feedbackParts.push(`Comodidades anotadas: ${amenitiesFound.join(', ')}`);
    }

    logActivity('CONCIERGE_INTERACTION', `Interação no concierge: "${text}"`);

    // Conta imóveis que atendem a todos os critérios do perfil projetado
    const matches = propertiesRef.current.map(p => calculatePropertyMatch(p, projected));
    const hasActiveProfile = matches.some(m => m.hasActiveProfile);
    const compatibleCount = matches.filter(m => m.hasActiveProfile && m.criteriaMet === m.totalCriteria).length;

    // Resposta do Concierge
    const timeoutId = setTimeout(() => {
      replyTimeoutsRef.current.delete(timeoutId);
      let replyText;
      if (feedbackParts.length === 0) {
        replyText = 'Não consegui identificar bairro, tipo de imóvel, quartos, orçamento ou comodidades nessa mensagem. Pode me contar, por exemplo, o bairro e o valor máximo que pretende investir?';
      } else {
        replyText = `Perfeito! Entendi: ${feedbackParts.join('. ')}.`;
        if (hasActiveProfile) {
          replyText += compatibleCount > 0
            ? ` Encontrei ${compatibleCount} ${compatibleCount === 1 ? 'imóvel que atende' : 'imóveis que atendem'} a todos os seus critérios. Deseja refinar algo mais?`
            : ' Ainda não encontrei imóveis que atendam a todos os critérios juntos. Quer flexibilizar algum deles?';
        }
      }

      setMessages(prev => [
        ...prev,
        { id: `concierge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sender: 'concierge', text: replyText }
      ]);
    }, 600);
    replyTimeoutsRef.current.add(timeoutId);
  };

  const processInputRef = useRef(processInput);
  processInputRef.current = processInput;

  // Gravação de voz com parada real e fallback discreto para texto (RNF-03)
  const handleToggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      fallbackToText('Seu navegador não suporta voz. Pode digitar livremente por aqui.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceHint('');
      setIsRecording(true);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setIsRecording(false);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        fallbackToText('Microfone sem permissão. Pode digitar livremente por aqui.');
      } else if (event.error === 'no-speech') {
        setVoiceHint('Não ouvi nada. Tente novamente ou digite por aqui.');
      } else if (event.error !== 'aborted') {
        fallbackToText('Não foi possível usar a voz agora. Pode digitar livremente por aqui.');
      }
      setIsRecording(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processInputRef.current(transcript);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      fallbackToText('Não foi possível usar a voz agora. Pode digitar livremente por aqui.');
    }
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
                ref={inputRef}
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
              <span aria-live="polite">
                {isRecording
                  ? "🔴 Ouvindo sua voz com atenção..."
                  : voiceHint || "Dica: Fale naturalmente sobre bairro, orçamento e estilo de vida"}
              </span>
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

