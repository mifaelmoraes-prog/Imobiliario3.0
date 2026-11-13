import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { calculatePropertyMatch } from '../../services/smartMatchEngine';
import {
  extractBudget,
  buildVocabulary,
  extractLocationAndLifestyle,
  extractBedrooms,
  extractPropertyType
} from '../../services/conciergeParser';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  User,
  ArrowRight,
  Volume2,
  VolumeX,
  BedDouble,
  MapPin
} from 'lucide-react';
import {
  askBrain,
  buildBrainContext,
  isBrainAvailable,
  searchCatalog
} from '../../services/conciergeBrainClient';
import {
  speak,
  stopSpeaking,
  canSpeak,
  spokenMoney,
  joinPt
} from '../../services/conciergeSpeech';

const VOICE_REPLIES_KEY = 'concierge_voice_replies';
// Saudação falada ao abrir: o áudio fica pronto em public/ (voz Marin), sem esperar a voz neural.
// Se mudar o texto, gere o áudio de novo com a mesma frase.
const GREETING_TEXT = 'Olá! Sou o Concierge da Urban Real State. Me conta: que tipo de imóvel você está procurando, e em qual região?';
const GREETING_AUDIO = '/audio/concierge-saudacao.mp3';

const getSpeechRecognition = () =>
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

export function SplitVoiceConcierge({ isOpen, onClose }) {
  const { profile, updatePillar, setMaxBudget, addAmenities, activePillarsCount, logActivity, identifyLead } = useBuyerProfile();
  const { properties, allProperties, selectedCity, setSelectedCity, setActivePropertyDetail } = useProperties();

  // Bairros, cidades e comodidades vêm do próprio catálogo
  const vocabulary = useMemo(() => buildVocabulary(allProperties), [allProperties]);
  const brainContext = useMemo(() => buildBrainContext(vocabulary), [vocabulary]);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceHint, setVoiceHint] = useState('');
  // Respostas faladas (preferência do visitante, lembrada no navegador)
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try {
      return localStorage.getItem(VOICE_REPLIES_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const isThinkingRef = useRef(false);
  // Histórico no formato do modelo (user / assistant / tool), separado das bolhas
  const brainHistoryRef = useRef([]);
  const brainContextRef = useRef(brainContext);
  brainContextRef.current = brainContext;
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'concierge',
      text: GREETING_TEXT
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const replyTimeoutsRef = useRef(new Set());
  // Modo conversa: depois de responder em voz, volta a ouvir sozinho
  const conversationRef = useRef(false);
  const noSpeechCountRef = useRef(0);

  // Refs com os valores mais recentes: o callback de voz e o setTimeout
  // rodam depois do render em que foram criados.
  const profileRef = useRef(profile);
  const allPropertiesRef = useRef(allProperties);
  const vocabularyRef = useRef(vocabulary);
  const selectedCityRef = useRef(selectedCity);
  profileRef.current = profile;
  allPropertiesRef.current = allProperties;
  vocabularyRef.current = vocabulary;
  selectedCityRef.current = selectedCity;
  const isOpenRef = useRef(isOpen);
  const voiceRepliesRef = useRef(voiceReplies);
  isOpenRef.current = isOpen;
  voiceRepliesRef.current = voiceReplies;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Encerra o microfone e respostas pendentes ao fechar o modal ou desmontar
  useEffect(() => {
    if (!isOpen) {
      conversationRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopSpeaking();
      setIsRecording(false);
      setIsSpeaking(false);
      setInterimText('');
    }
  }, [isOpen]);

  useEffect(() => () => {
    conversationRef.current = false;
    stopSpeaking();
    recognitionRef.current?.abort();
    replyTimeoutsRef.current.forEach(clearTimeout);
    replyTimeoutsRef.current.clear();
  }, []);

  const fallbackToText = (hint) => {
    conversationRef.current = false;
    setVoiceHint(hint);
    setIsRecording(false);
    inputRef.current?.focus();
  };

  // Fala a resposta e, no modo conversa, volta a ouvir quando terminar
  const replyByVoice = (spokenText) => {
    if (!voiceRepliesRef.current || !canSpeak()) return;
    speak(spokenText, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (conversationRef.current && isOpenRef.current) startListeningRef.current();
      }
    });
  };

  const toggleVoiceReplies = () => {
    const next = !voiceReplies;
    setVoiceReplies(next);
    try {
      localStorage.setItem(VOICE_REPLIES_KEY, next ? 'on' : 'off');
    } catch {
      // preferência só vale nesta sessão
    }
    if (!next) {
      conversationRef.current = false;
      stopSpeaking();
      setIsSpeaking(false);
    }
  };

  const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Aplica ao perfil (painel dos 4 pilares e catálogo) os critérios da busca do cérebro
  const applyCriteria = (criteria) => {
    updatePillar('location', {
      ...(criteria.city ? { city: criteria.city.label } : {}),
      neighborhoods: criteria.neighborhoods
    });
    setSelectedCity(criteria.city?.shortLabel || '');
    updatePillar('typology', { propertyType: criteria.propertyType, minBedrooms: criteria.minBedrooms });
    setMaxBudget(criteria.maxBudget);
    updatePillar('lifestyle', { amenities: criteria.amenities });
  };

  // Executa uma ferramenta pedida pelo modelo; devolve o conteúdo da resposta da ferramenta
  const runTool = (call) => {
    let args = {};
    try {
      args = JSON.parse(call.function?.arguments || '{}');
    } catch {
      return { erro: 'argumentos inválidos' };
    }
    if (call.function?.name === 'buscar_imoveis') {
      const { result, criteria } = searchCatalog(args, {
        allProperties: allPropertiesRef.current,
        vocabulary: vocabularyRef.current
      });
      applyCriteria(criteria);
      return result;
    }
    if (call.function?.name === 'mostrar_imoveis') {
      const ids = Array.isArray(args.ids) ? args.ids.slice(0, 3) : [];
      const found = ids.map(id => allPropertiesRef.current.find(p => p.id === id)).filter(Boolean);
      if (found.length) {
        setMessages(prev => [...prev, { id: newId('cards'), sender: 'concierge', cards: found }]);
        logActivity('CONCIERGE_SHOW', `Concierge mostrou: ${found.map(p => p.id).join(', ')}`);
      }
      return { mostrados: found.map(p => p.id), nao_encontrados: ids.filter(id => !found.some(p => p.id === id)) };
    }
    if (call.function?.name === 'registrar_interesse') {
      const name = String(args.nome || '').trim().slice(0, 120);
      const phoneDigits = String(args.telefone || '').replace(/\D/g, '');
      const phone = phoneDigits.length >= 8 ? String(args.telefone).trim().slice(0, 40) : '';
      const email = /\S+@\S+\.\S+/.test(args.email || '') ? String(args.email).trim().slice(0, 120) : '';
      if (!name) return { registrado: false, erro: 'falta o nome' };
      if (!phone && !email) return { registrado: false, erro: 'falta um telefone (com DDD) ou e-mail válido' };

      const ids = (Array.isArray(args.imoveis_ids) ? args.imoveis_ids : [])
        .filter(id => allPropertiesRef.current.some(p => p.id === id))
        .slice(0, 5);
      identifyLead({ leadName: name, leadPhone: phone, leadEmail: email });
      logActivity('VISIT_REQUEST', `Pediu contato de corretor pelo Concierge${args.melhor_horario ? ` (${args.melhor_horario})` : ''}`, {
        propertyIds: ids,
        preferredTime: args.melhor_horario || null,
        purpose: args.finalidade || null,
        timeline: args.prazo || null,
        notes: args.observacoes || null,
        channel: 'concierge'
      });
      const when = args.melhor_horario ? ` · ${args.melhor_horario}` : '';
      setMessages(prev => [...prev, {
        id: newId('lead'),
        sender: 'concierge',
        notice: `Contato registrado: ${name} · ${phone || email}${when}`
      }]);
      return { registrado: true, imoveis_ids: ids };
    }
    return { erro: `ferramenta desconhecida: ${call.function?.name}` };
  };

  // Conversa com o cérebro (modelo + ferramentas). Devolve false se não conseguiu responder.
  const respondWithBrain = async (text, viaVoice) => {
    const history = brainHistoryRef.current;
    const snapshot = history.length;
    history.push({ role: 'user', content: text });
    setIsThinking(true);
    let toolsRan = false;
    try {
      for (let round = 0; round < 4; round++) {
        const reply = await askBrain(history, brainContextRef.current);
        history.push(reply);
        if (reply.tool_calls?.length) {
          toolsRan = true;
          reply.tool_calls.forEach(call => {
            history.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(runTool(call)) });
          });
          continue;
        }
        const answer = (reply.content || '').trim();
        if (!answer) break;
        setMessages(prev => [...prev, { id: newId('concierge'), sender: 'concierge', text: answer }]);
        if (viaVoice) replyByVoice(answer);
        return true;
      }
      throw new Error('cérebro sem resposta final');
    } catch (err) {
      history.length = snapshot; // não deixa histórico pela metade
      if (toolsRan) {
        // Algo já aconteceu nesta vez (busca, cartões, contato): não responde por regras por cima
        console.warn('[concierge] falha depois de executar ferramentas:', err?.message || err);
        const sorry = 'Tive uma instabilidade agora, mas o que aparece acima já está valendo. Pode repetir sua última mensagem?';
        setMessages(prev => [...prev, { id: newId('concierge'), sender: 'concierge', text: sorry }]);
        if (viaVoice) replyByVoice(sorry);
        return true;
      }
      console.warn('[concierge] usando respostas por regras:', err?.message || err);
      return false;
    } finally {
      // Mantém o histórico enxuto: as últimas ~40 mensagens, começando num "user"
      if (history.length > 40) {
        let cut = history.length - 40;
        while (cut < history.length && history[cut].role !== 'user') cut++;
        history.splice(0, cut);
      }
      setIsThinking(false);
    }
  };

  const processInput = async (text, { viaVoice = false } = {}) => {
    if (!text.trim() || isThinkingRef.current) return;
    if (!viaVoice) {
      // Digitar encerra o modo conversa e interrompe a fala em andamento
      conversationRef.current = false;
      stopSpeaking();
      setIsSpeaking(false);
    }

    setMessages(prev => [...prev, { id: newId('user'), sender: 'user', text }]);
    setInputText('');
    logActivity('CONCIERGE_INTERACTION', `Interação no concierge: "${text}"`);

    if (isBrainAvailable()) {
      isThinkingRef.current = true;
      const ok = await respondWithBrain(text, viaVoice);
      isThinkingRef.current = false;
      if (ok) return;
    }
    respondWithRules(text, viaVoice);
  };

  // Reserva sem modelo: extrai os 4 pilares com regras e responde com a contagem
  const respondWithRules = (text, viaVoice) => {
    const feedbackParts = [];
    // Versão curta para ser falada: "casa, 3 quartos, no Jardim Camburi, até 900 mil reais"
    const spokenParts = {};

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

    // 1. Localização: cidade e bairros reconhecidos no catálogo
    const extracted = extractLocationAndLifestyle(text, vocabularyRef.current);
    if (extracted.city || extracted.neighborhoods.length > 0) {
      const cityChanged = extracted.city && extracted.city.label !== current.location?.city;
      const location = {};
      if (extracted.city) {
        location.city = extracted.city.label;
        setSelectedCity(extracted.city.shortLabel);
        feedbackParts.push(`Cidade: ${extracted.city.label}`);
        spokenParts.city = `em ${extracted.city.shortLabel}`;
      }
      // Bairros citados substituem os anteriores; trocar de cidade limpa bairros antigos
      if (extracted.neighborhoods.length > 0 || cityChanged) {
        location.neighborhoods = extracted.neighborhoods;
      }
      if (extracted.neighborhoods.length > 0) {
        feedbackParts.push(`Bairros: ${extracted.neighborhoods.join(', ')}`);
        spokenParts.neighborhoods = `${extracted.neighborhoods.length === 1 ? 'no bairro' : 'nos bairros'} ${joinPt(extracted.neighborhoods.map(n => n.replace(/\s*\(.*?\)/g, '')))}`;
      }
      updatePillar('location', location);
      Object.assign(projected.location, location);
    }

    // 2. Extração de Quartos (aceita número por extenso)
    const bedrooms = extractBedrooms(text);
    if (bedrooms !== null) {
      updatePillar('typology', { minBedrooms: bedrooms });
      projected.typology.minBedrooms = bedrooms;
      feedbackParts.push(`Definido mínimo de ${bedrooms} ${bedrooms === 1 ? 'quarto' : 'quartos'}`);
      spokenParts.bedrooms = `${bedrooms === 1 ? '1 quarto' : `${bedrooms} quartos`} ou mais`;
    }

    // 3. Extração de Tipo de Imóvel (palavra inteira: "casal" não vira Casa)
    const propertyType = extractPropertyType(text);
    if (propertyType) {
      updatePillar('typology', { propertyType });
      projected.typology.propertyType = propertyType;
      feedbackParts.push(`Tipologia: ${propertyType}`);
      spokenParts.type = propertyType.toLowerCase();
    }

    // 4. Extração de Orçamento
    const budget = extractBudget(text);
    if (budget !== null) {
      setMaxBudget(budget);
      projected.budget.maxBudget = budget;
      feedbackParts.push(`Teto orçamentário configurado para ${formatCurrencyBRL(budget)}`);
      spokenParts.budget = `até ${spokenMoney(budget)}`;
    }

    // 5. Comodidades do catálogo: apenas adiciona (repetir um item não o remove)
    const amenitiesFound = extracted.amenities;
    if (amenitiesFound.length > 0) {
      addAmenities(amenitiesFound);
      amenitiesFound.forEach(a => {
        if (!projected.lifestyle.amenities.includes(a)) projected.lifestyle.amenities.push(a);
      });
      feedbackParts.push(`Comodidades anotadas: ${amenitiesFound.join(', ')}`);
      spokenParts.amenities = `com ${joinPt(amenitiesFound.map(a => a.toLowerCase()))}`;
    }
    const unsupported = extracted.unsupportedAmenities;

    // Conta imóveis que atendem a todos os critérios do perfil projetado
    // Mesmo critério do filtro de cidade do catálogo (PropertyContext)
    const cityFilter = (extracted.city?.shortLabel || selectedCityRef.current || '').toLowerCase();
    const pool = cityFilter
      ? allPropertiesRef.current.filter(p => (p.city || '').toLowerCase().includes(cityFilter))
      : allPropertiesRef.current;
    const matches = pool.map(p => calculatePropertyMatch(p, projected));
    const hasActiveProfile = matches.some(m => m.hasActiveProfile);
    const compatible = pool.filter((p, i) => matches[i].hasActiveProfile && matches[i].criteriaMet === matches[i].totalCriteria);
    const compatibleCount = compatible.length;

    // "quero saber mais", "me mostra", "detalhes", "link", "sim": mostra os imóveis
    const wantsToSee = /\b(sim|quero ver|ver (os|o|as|a)?\s*im[oó]ve|mostr|detalhe|saber mais|mais informa|link|foto|quais s[aã]o|me (manda|envia|passa))/i.test(text);
    if (feedbackParts.length === 0 && unsupported.length === 0 && wantsToSee) {
      const toShow = (compatibleCount > 0 ? compatible : [])
        .slice()
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 3);
      const timeoutId = setTimeout(() => {
        replyTimeoutsRef.current.delete(timeoutId);
        const replyText = toShow.length
          ? `Aqui ${toShow.length === 1 ? 'está o imóvel' : `estão os ${toShow.length} imóveis`} que combinam com o que você me contou. Toque em "Ver detalhes" para abrir fotos e a ficha completa.`
          : 'Ainda não tenho imóveis selecionados para mostrar. Me conte o bairro ou a cidade, e quanto pretende investir.';
        setMessages(prev => [
          ...prev,
          ...(toShow.length ? [{ id: newId('cards'), sender: 'concierge', cards: toShow }] : []),
          { id: newId('concierge'), sender: 'concierge', text: replyText }
        ]);
        if (viaVoice) replyByVoice(replyText);
      }, 600);
      replyTimeoutsRef.current.add(timeoutId);
      return;
    }

    // Resposta do Concierge
    const timeoutId = setTimeout(() => {
      replyTimeoutsRef.current.delete(timeoutId);
      let replyText;
      let countText = '';
      const unsupportedNote = unsupported.length > 0
        ? ` Ainda não consigo filtrar por ${unsupported.join(', ')}: essa informação não está cadastrada nos imóveis.`
        : '';
      if (feedbackParts.length === 0 && unsupported.length > 0) {
        replyText = unsupportedNote.trim();
      } else if (feedbackParts.length === 0) {
        replyText = hasActiveProfile && compatibleCount > 0
          ? `Não entendi bem essa parte. Tenho ${compatibleCount} ${compatibleCount === 1 ? 'imóvel' : 'imóveis'} com o que você me contou: quer que eu ${compatibleCount === 1 ? 'mostre' : 'mostre os principais'}, ou prefere ajustar o bairro, os quartos ou o orçamento?`
          : 'Não entendi bem essa parte. Me conte o bairro ou a cidade que você procura e quanto pretende investir.';
      } else {
        // Contagem, depois o aviso do que não filtramos e, por último, a pergunta
        let question = '';
        if (hasActiveProfile) {
          if (compatibleCount > 0) {
            countText = ` Encontrei ${compatibleCount} ${compatibleCount === 1 ? 'imóvel que atende' : 'imóveis que atendem'} a todos os seus critérios.`;
            question = ' Deseja refinar algo mais?';
          } else {
            countText = ' Ainda não encontrei imóveis que atendam a todos os critérios juntos.';
            question = ' Quer flexibilizar algum deles?';
          }
        } else if (extracted.city) {
          countText = ` Temos ${pool.length} ${pool.length === 1 ? 'imóvel' : 'imóveis'} em ${extracted.city.shortLabel}.`;
          question = ' Conte o bairro, o tipo de imóvel ou o orçamento para eu filtrar.';
        }
        countText = `${countText}${unsupportedNote}${question}`;
        replyText = `Perfeito! Entendi: ${feedbackParts.join('. ')}.${countText}`;
      }

      // Em voz, um resumo curto em vez da lista de campos
      let spokenText = replyText;
      if (feedbackParts.length === 0 && unsupported.length === 0) {
        spokenText = replyText;
      } else if (feedbackParts.length > 0) {
        const order = ['type', 'bedrooms', 'neighborhoods', 'city', 'budget', 'amenities'];
        const summary = order.filter(k => spokenParts[k]).map(k => spokenParts[k]).join(', ');
        spokenText = `Entendi: ${summary}.${countText}`;
      }

      setMessages(prev => [
        ...prev,
        { id: `concierge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sender: 'concierge', text: replyText }
      ]);
      // O modelo precisa ver o que foi dito e respondido por regras, senão perde o fio na próxima vez
      brainHistoryRef.current.push({ role: 'user', content: text }, { role: 'assistant', content: spokenText || replyText });
      if (viaVoice) replyByVoice(spokenText);
    }, 600);
    replyTimeoutsRef.current.add(timeoutId);
  };

  const processInputRef = useRef(processInput);
  processInputRef.current = processInput;

  // Escuta uma fala (pt-BR) com transcrição ao vivo e fallback discreto para texto (RNF-03)
  const startListening = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      fallbackToText('Seu navegador não suporta voz. Pode digitar livremente por aqui.');
      return;
    }
    stopSpeaking();
    setIsSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    // Contínuo: uma pausa curta ("eu quero… investir 4 milhões") não encerra a fala.
    // Só encerra depois de END_OF_SPEECH_MS sem nada novo.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const END_OF_SPEECH_MS = 1600;
    let finalText = '';
    let lastInterim = '';
    let retryAfterSilence = false;
    let hadError = false;
    let endTimer = null;
    const scheduleEnd = () => {
      clearTimeout(endTimer);
      endTimer = setTimeout(() => recognition.stop(), END_OF_SPEECH_MS);
    };

    recognition.onstart = () => {
      setVoiceHint('');
      setInterimText('');
      setIsRecording(true);
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${chunk} `;
        else interim += chunk;
      }
      lastInterim = interim;
      setInterimText(`${finalText}${interim}`.trim());
      if (`${finalText}${interim}`.trim()) scheduleEnd();
    };
    recognition.onerror = (event) => {
      hadError = true;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        fallbackToText('Microfone sem permissão. Pode digitar livremente por aqui.');
      } else if (event.error === 'no-speech') {
        noSpeechCountRef.current += 1;
        // No modo conversa, tolera um silêncio antes de desligar o microfone
        if (conversationRef.current && noSpeechCountRef.current < 2) {
          retryAfterSilence = true;
        } else {
          conversationRef.current = false;
          setVoiceHint('Não ouvi nada. Toque no microfone quando quiser continuar.');
        }
      } else if (event.error !== 'aborted') {
        fallbackToText('Não foi possível usar a voz agora. Pode digitar livremente por aqui.');
      }
    };
    recognition.onend = () => {
      clearTimeout(endTimer);
      if (recognitionRef.current !== recognition) return; // substituída ou abortada
      recognitionRef.current = null;
      setIsRecording(false);
      setInterimText('');
      // Se parou antes de o navegador confirmar o trecho final, usa o provisório
      const heard = `${finalText}${lastInterim}`.replace(/\s+/g, ' ').trim();
      if (heard) {
        noSpeechCountRef.current = 0;
        processInputRef.current(heard, { viaVoice: true });
      } else if (retryAfterSilence && isOpenRef.current) {
        startListeningRef.current();
      } else if (conversationRef.current && !hadError) {
        // O Chrome às vezes encerra sem erro e sem fala: trata como silêncio
        noSpeechCountRef.current += 1;
        if (noSpeechCountRef.current < 2 && isOpenRef.current) {
          startListeningRef.current();
        } else {
          conversationRef.current = false;
          setVoiceHint('Não ouvi nada. Toque no microfone quando quiser continuar.');
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      fallbackToText('Não foi possível usar a voz agora. Pode digitar livremente por aqui.');
    }
  };

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  // Ao abrir pela primeira vez: o Concierge fala a saudação e já abre o microfone
  // (modo conversa). O clique no botão que abriu o modal libera o áudio no navegador.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || greetedRef.current) return;
    greetedRef.current = true;
    if (!voiceRepliesRef.current || !getSpeechRecognition()) return; // sem voz: fica no texto
    noSpeechCountRef.current = 0;
    conversationRef.current = true;
    speak(GREETING_TEXT, {
      audioUrl: GREETING_AUDIO,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (conversationRef.current && isOpenRef.current) startListeningRef.current();
      }
    });
  }, [isOpen]);

  // Microfone: ouvindo → para; falando → interrompe e ouve; parado → começa a conversa
  const handleToggleVoice = () => {
    if (isRecording) {
      conversationRef.current = false;
      recognitionRef.current?.stop(); // o que já foi dito ainda é processado
      return;
    }
    noSpeechCountRef.current = 0;
    conversationRef.current = voiceReplies && canSpeak();
    startListening();
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
                {m.notice ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {m.notice}
                  </div>
                ) : m.cards ? (
                  <div className="flex flex-col gap-2 max-w-[85%] w-full">
                    {m.cards.map(p => (
                      <div
                        key={p.id}
                        className="flex gap-3 p-2 rounded-2xl rounded-bl-none bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-sm"
                      >
                        {p.image && (
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            className="w-24 h-20 sm:w-28 rounded-xl object-cover shrink-0 bg-stone-100 dark:bg-stone-700"
                          />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1 text-xs">
                          <div>
                            <span className="block font-bold text-sm text-accent">{formatCurrencyBRL(p.price)}</span>
                            <span className="block font-semibold text-stone-800 dark:text-stone-100">
                              {p.type} · {p.area} m²
                            </span>
                            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {p.neighborhood}, {(p.city || '').split('-')[0].trim()}
                            </span>
                            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                              <BedDouble className="w-3 h-3 shrink-0" />
                              {p.bedrooms} {p.bedrooms === 1 ? 'quarto' : 'quartos'}
                              {p.parking ? ` · ${p.parking} ${p.parking === 1 ? 'vaga' : 'vagas'}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePropertyDetail(p);
                              logActivity('VIEW_PROPERTY', `Visualizou pelo Concierge: ${p.title}`, { propertyId: p.id });
                            }}
                            className="self-start inline-flex items-center gap-1 min-h-[32px] px-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                          >
                            Ver detalhes <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                      m.sender === 'user'
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-br-none shadow-sm'
                        : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-bl-none border border-stone-200/70 dark:border-stone-700/70 shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                )}
                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-3 justify-start" role="status" aria-label="Concierge pensando">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 shadow-sm flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {interimText && (
              <div className="flex gap-3 justify-end" aria-hidden="true">
                <div className="p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] rounded-br-none border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 italic">
                  {interimText}…
                </div>
                <div className="w-8 h-8 shrink-0" />
              </div>
            )}
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
                aria-label={isRecording ? 'Parar de ouvir' : isSpeaking ? 'Interromper e falar' : 'Falar por voz'}
                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : isSpeaking
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:text-accent hover:border-accent shadow-sm'
                }`}
                title={isRecording ? 'Ouvindo... Clique para parar' : isSpeaking ? 'Clique para interromper e falar' : 'Clique para conversar por voz'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : isSpeaking ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
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
                disabled={!inputText.trim() || isThinking}
                icon={Send}
                ariaLabel="Enviar mensagem"
                className="min-h-[48px]"
              />
            </form>

            <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span aria-live="polite">
                {isRecording
                  ? 'Ouvindo… fale naturalmente. Toque no microfone para parar.'
                  : isSpeaking
                    ? 'Concierge falando… toque no microfone para interromper e responder.'
                    : voiceHint || 'Dica: toque no microfone e converse; eu respondo em voz.'}
              </span>
              {canSpeak() && (
                <button
                  type="button"
                  onClick={toggleVoiceReplies}
                  aria-pressed={voiceReplies}
                  className="shrink-0 inline-flex items-center gap-1 min-h-[32px] px-2 rounded-lg hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={voiceReplies ? 'Desligar respostas faladas' : 'Ligar respostas faladas'}
                >
                  {voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {voiceReplies ? 'Voz ligada' : 'Voz desligada'}
                </button>
              )}
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
                {selectedCity && (
                  <span className="block text-stone-800 dark:text-stone-200 font-medium mb-1">
                    {selectedCity}
                  </span>
                )}
                {profile.location?.neighborhoods?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {profile.location.neighborhoods.map(n => (
                      <span key={n} className="bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">ex.: Jardim Camburi (Vitória), Batel (Curitiba)...</span>
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
                  <span className="text-stone-400 italic">ex.: Rua Silenciosa, Sol da Manhã...</span>
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

