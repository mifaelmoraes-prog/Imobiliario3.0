import React, { useState } from 'react';
import { Search, Mic, MapPin, X } from 'lucide-react';
import { useProperties } from '../../context/PropertyContext';
import { useBuyerProfile } from '../../context/BuyerProfileContext';

export function HeroSearch({ onTriggerVoice }) {
  const { searchQuery, setSearchQuery, selectedCity, setSelectedCity, availableCities } = useProperties();
  const { profile } = useBuyerProfile();
  const [isListening, setIsListening] = useState(false);

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

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };

    recognition.start();
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
      </div>

      {/* Fileira Única de Cidades (Ref. UX Tópico 03 / GAP-03.1) */}
      {availableCities.length > 0 && (
        <div className="flex items-center justify-center flex-wrap gap-1.5 text-xs">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Cidades:
          </span>
          <button
            onClick={() => setSelectedCity('')}
            className={`px-2.5 py-1 rounded-full transition-colors font-medium ${
              selectedCity === ''
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Todas
          </button>
          {availableCities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city === selectedCity ? '' : city)}
              className={`px-2.5 py-1 rounded-full transition-colors font-medium ${
                selectedCity === city
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

