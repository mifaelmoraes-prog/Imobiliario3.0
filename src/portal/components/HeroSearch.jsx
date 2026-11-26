import React, { useState } from 'react';
import { Search, Mic, MapPin, X, Waves } from 'lucide-react';
import { descreverLocal } from '../../services/regioes';
import { useProperties } from '../../context/PropertyContext';

export function HeroSearch({ onTriggerVoice }) {
  const { searchQuery, setSearchQuery } = useProperties();
  const [isListening, setIsListening] = useState(false);
  // Antes os erros do microfone eram engolidos: o botão só parava, sem dizer nada
  const [vozAviso, setVozAviso] = useState('');

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      if (onTriggerVoice) onTriggerVoice();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVozAviso('Ouvindo… diga o que procura, por exemplo "casa com 3 quartos em Vitória".');
      setIsListening(true);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVozAviso('O microfone está bloqueado. Libere o microfone no navegador ou digite a busca.');
      } else if (event.error === 'no-speech') {
        setVozAviso('Não ouvi nada. Toque no microfone e fale de novo.');
      } else if (event.error !== 'aborted') {
        setVozAviso('Não consegui usar o microfone agora. Pode digitar a busca.');
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVozAviso('');
      setSearchQuery(transcript);
    };

    try {
      recognition.start();
    } catch {
      setVozAviso('Não consegui usar o microfone agora. Pode digitar a busca.');
    }
  };

  return (
    <section className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      {/* H1 em 2 Linhas com Peso 600 (Ref. UX Tópico 02 / GAP-02.1) */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-stone-900 dark:text-white leading-[1.15] mb-4">
        Encontre o imóvel que se adapta <br className="hidden sm:inline" />
        <span className="text-accent font-medium">ao ritmo da sua rotina</span>
      </h1>

      <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-2xl mx-auto mb-6">
        Curadoria inteligente cruzando localização, tipologia e compatibilidade real de orçamento.
      </p>

      {/* Campo de Busca Protagonista com Microfone Integrado (Ref. UX Tópico 02) */}
      <div className="max-w-3xl mx-auto relative mb-4">
        <div className="relative flex items-center bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-card hover:shadow-card-hover transition-all duration-200 p-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <div className="pl-3.5 pr-2 text-stone-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busque por bairro, condomínio, características (ex.: Batel, Varanda Gourmet, 3 quartos)..."
            aria-label="Campo de busca de imóveis"
            className="w-full py-3 pr-20 text-sm sm:text-base bg-transparent text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Microfone Embutido (GAP-02.1) */}
          <button
            type="button"
            onClick={handleVoiceInput}
            aria-label="Falar busca por voz"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-stone-500 hover:text-accent hover:bg-accent/10 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
            title="Dite sua busca por voz"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
        {vozAviso && (
          <p role="status" aria-live="polite" className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
            {vozAviso}
          </p>
        )}
      </div>

      <FiltroDeLocal />
    </section>
  );
}

const chipClasse = (ativo) => `px-2.5 py-1 rounded-full transition-colors font-medium inline-flex items-center gap-1 ${
  ativo
    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
}`;

function Chip({ ativo, onClick, children, total }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={chipClasse(ativo)}>
      {children}
      {total != null && <span className={ativo ? 'opacity-70' : 'text-stone-400'}>{total}</span>}
    </button>
  );
}

// Região → Estado → Litoral/Cidade (pedido do Paulo: "ocultar cidade e mostrar primeiro a região").
// Só aparecem lugares com imóvel; a cidade fica no último nível.
function FiltroDeLocal() {
  const { arvoreDeLocais, local, setLocal, localAutomatico, selectedCity, setSelectedCity } = useProperties();
  if (!arvoreDeLocais.length) return null;

  const regiao = arvoreDeLocais.find(r => r.nome === local.regiao);
  const estado = regiao?.estados.find(e => e.uf === local.uf);
  const total = arvoreDeLocais.reduce((soma, r) => soma + r.total, 0);

  const escolher = (novo) => {
    setSelectedCity('');
    setLocal(novo);
  };
  const escolherCidade = (nome) => {
    setLocal({ regiao: local.regiao, uf: local.uf });
    setSelectedCity(selectedCity === nome ? '' : nome);
  };

  return (
    <div className="flex flex-col items-center gap-2 text-xs" aria-label="Filtrar por local">
      <div className="flex items-center justify-center flex-wrap gap-1.5">
        <span className="text-stone-500 font-medium mr-1 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Região:
        </span>
        <Chip ativo={!local.regiao && !selectedCity} onClick={() => escolher({})} total={total}>Todas</Chip>
        {arvoreDeLocais.map(r => (
          <Chip key={r.nome} ativo={local.regiao === r.nome} onClick={() => escolher({ regiao: r.nome })} total={r.total}>
            {r.nome}
          </Chip>
        ))}
      </div>

      {regiao && (
        <div className="flex items-center justify-center flex-wrap gap-1.5">
          <span className="text-stone-500 font-medium mr-1">Estado:</span>
          {regiao.estados.map(e => (
            <Chip key={e.uf} ativo={local.uf === e.uf} onClick={() => escolher(local.uf === e.uf ? { regiao: regiao.nome } : { regiao: regiao.nome, uf: e.uf })} total={e.total}>
              {e.nome}
            </Chip>
          ))}
        </div>
      )}

      {estado && (estado.cidades.length > 1 || estado.litoral > 0) && (
        <div className="flex items-center justify-center flex-wrap gap-1.5">
          <Chip ativo={!local.litoral && !selectedCity} onClick={() => escolher({ regiao: regiao.nome, uf: estado.uf })}>Todo o estado</Chip>
          {estado.litoral > 0 && estado.litoral < estado.total && (
            <Chip ativo={local.litoral && !selectedCity} onClick={() => escolher({ regiao: regiao.nome, uf: estado.uf, litoral: true })} total={estado.litoral}>
              <Waves className="w-3 h-3" aria-hidden="true" /> Litoral
            </Chip>
          )}
          {estado.cidades.length > 1 && estado.cidades.map(c => (
            <Chip key={c.nome} ativo={selectedCity === c.nome} onClick={() => escolherCidade(c.nome)} total={c.total}>{c.nome}</Chip>
          ))}
        </div>
      )}

      {localAutomatico && (
        <p role="status" className="text-stone-500 dark:text-stone-400">
          Mostrando imóveis de {descreverLocal(local)}, perto de você.{' '}
          <button type="button" onClick={() => escolher({})} className="font-semibold text-accent hover:underline">
            Ver todas as regiões
          </button>
        </p>
      )}
    </div>
  );
}
