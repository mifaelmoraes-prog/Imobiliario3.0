import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { buildVisitorContext } from '../../services/conciergeBrainClient';
import { buildAvatarTip } from '../../services/avatarTips';

// Avatar do atendimento (pedido do Paulo, "estilo o Clip do Word"): fica no canto da tela e puxa
// conversa sozinho com um balão que usa o que a pessoa já filtrou, viu e buscou. Só texto: o
// navegador não deixa tocar áudio nem abrir o microfone antes do primeiro toque da pessoa.
const PRIMEIRA_DICA_MS = 6000;   // espera a pessoa olhar a página antes de puxar conversa
const ESPERA_CONTEXTO_MS = 2500; // depois de mudar um filtro ou abrir um imóvel
const INTERVALO_MIN_MS = 40000;  // no máximo um balão a cada 40 s
const VISIVEL_MS = 14000;        // o balão some sozinho
const MAX_DICAS = 4;             // por visita
const SILENCIO_KEY = 'urs_avatar_silenciado';

const lerSilencio = () => {
  try {
    return sessionStorage.getItem(SILENCIO_KEY) === '1';
  } catch {
    return false;
  }
};

export function AtendimentoAvatar({ onOpen, hidden }) {
  const { profile, timeline } = useBuyerProfile();
  const { allProperties, selectedCity, searchQuery, favorites } = useProperties();

  const dica = useMemo(
    () => buildAvatarTip(buildVisitorContext({ profile, timeline, favorites, allProperties, selectedCity, searchQuery })),
    [profile, timeline, favorites, allProperties, selectedCity, searchQuery]
  );

  const [balao, setBalao] = useState(null); // texto em exibição
  const mostradas = useRef(new Set());
  const ultimaVez = useRef(0);
  const inicio = useRef(0); // quando a página abriu (marcado no primeiro efeito)
  const silenciado = useRef(lerSilencio());

  // Decide se e quando mostrar a dica atual. Todo setState fica dentro de timers.
  useEffect(() => {
    if (hidden || silenciado.current || mostradas.current.has(dica.chave) || mostradas.current.size >= MAX_DICAS) return undefined;
    const agora = Date.now();
    if (!inicio.current) inicio.current = agora;
    const espera = Math.max(
      PRIMEIRA_DICA_MS - (agora - inicio.current),
      ultimaVez.current ? INTERVALO_MIN_MS - (agora - ultimaVez.current) : 0,
      ESPERA_CONTEXTO_MS
    );
    const mostrar = setTimeout(() => {
      mostradas.current.add(dica.chave);
      ultimaVez.current = Date.now();
      setBalao(dica.texto);
    }, espera);
    return () => clearTimeout(mostrar);
  }, [dica, hidden]);

  // Some sozinho depois de um tempo
  useEffect(() => {
    if (!balao) return undefined;
    const sumir = setTimeout(() => setBalao(null), VISIVEL_MS);
    return () => clearTimeout(sumir);
  }, [balao]);

  if (hidden) return null;

  const abrir = () => {
    setBalao(null);
    onOpen();
  };

  const silenciar = () => {
    silenciado.current = true;
    try {
      sessionStorage.setItem(SILENCIO_KEY, '1');
    } catch {
      // sem sessionStorage o silêncio vale só até recarregar
    }
    setBalao(null);
  };

  return (
    <div
      className="fixed z-40 flex items-end gap-3"
      style={{
        right: 'max(16px, calc(env(safe-area-inset-right, 0px) + 16px))',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
      }}
    >
      {balao && (
        <div
          role="status"
          aria-live="polite"
          className="relative max-w-[240px] sm:max-w-xs bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-2xl rounded-br-sm shadow-xl p-3 pr-8 text-sm leading-snug"
        >
          <button type="button" onClick={abrir} className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
            {balao}
            <span className="block mt-1.5 text-xs font-semibold text-accent">Conversar agora</span>
          </button>
          <button
            type="button"
            onClick={silenciar}
            aria-label="Dispensar as sugestões do atendimento"
            className="absolute top-1.5 right-1.5 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir o atendimento humanizado"
        title="Atendimento Humanizado"
        className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-4 ring-white dark:ring-stone-800 shadow-xl shadow-accent/30 transition-transform motion-safe:hover:scale-105 focus:outline-none focus-visible:ring-accent"
      >
        <img src="/assets/atendimento-avatar.webp" alt="" width="64" height="64" className="w-full h-full rounded-full object-cover" />
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-800" aria-hidden="true" />
      </button>
    </div>
  );
}
