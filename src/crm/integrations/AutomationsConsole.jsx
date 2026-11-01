import React, { useState } from 'react';
import { Button } from '../../design-system/Button';
import { 
  Radio, 
  Send, 
  Zap, 
  Share2, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Code2, 
  Layers 
} from 'lucide-react';

const XML_FEEDS = [
  { portal: 'ZAP Imóveis', items: 181, status: 'Ativo', lastSync: 'Hoje, 12:15', url: '/api/feeds/zap.xml' },
  { portal: 'VivaReal', items: 181, status: 'Ativo', lastSync: 'Hoje, 12:15', url: '/api/feeds/vivareal.xml' },
  { portal: 'OLX Imóveis', items: 164, status: 'Ativo', lastSync: 'Ontem, 23:40', url: '/api/feeds/olx.xml' }
];

const RECENT_WEBHOOKS = [
  { id: 'wh-1', source: 'Meta Ads (Facebook Lead Ads)', lead: 'Camila Ferreira', phone: '(41) 99222-1144', campaign: 'Campanha Batel Prime Q4', time: 'Há 14 min', status: 'Ingerido (SLA 3s)' },
  { id: 'wh-2', source: 'Google Ads (Search Form)', lead: 'Henrique Prado', phone: '(41) 98877-5500', campaign: 'Pesquisa "Apartamento Ecoville"', time: 'Há 42 min', status: 'Ingerido (SLA 2s)' }
];

export function AutomationsConsole() {
  const [testPhone, setTestPhone] = useState('(41) 99999-8888');
  const [templateName, setTemplateName] = useState('pitch_match_alto_padrao');
  const [simulatedStatus, setSimulatedStatus] = useState('');

  const handleSimulateWhatsApp = (e) => {
    e.preventDefault();
    setSimulatedStatus('Enviando via WhatsApp Business Cloud API...');
    setTimeout(() => {
      setSimulatedStatus('✅ Mensagem enviada com sucesso! Status: DELIVERED (wamid.HBgL...)');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
          Integrações Multicanal & Console de Automações
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Feeds XML para portais imobiliários, webhooks de Meta/Google Ads e simulador oficial de WhatsApp Cloud API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Sincronização de Portais (Feeds XML - US-20) */}
        <div className="bg-white dark:bg-stone-850 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Feeds XML para Portais Externos (US-20)</h2>
              <p className="text-[11px] text-stone-400">Padrão nacional Grupo OLX / Navent</p>
            </div>
          </div>

          <div className="space-y-3">
            {XML_FEEDS.map((feed) => (
              <div
                key={feed.portal}
                className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-stone-900 dark:text-white">{feed.portal}</div>
                  <div className="text-[11px] text-stone-400">{feed.items} imóveis ativos · Sincronizado {feed.lastSync}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                    {feed.status}
                  </span>
                  <a
                    href={feed.url}
                    onClick={(e) => { e.preventDefault(); alert(`Download do XML de exportação para ${feed.portal}`); }}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 hover:text-accent hover:border-accent"
                    title="Baixar feed XML"
                  >
                    <Code2 className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Webhooks de Mídia Paga (US-21) */}
        <div className="bg-white dark:bg-stone-850 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Webhooks Inbound de Tráfego Pago (US-21)</h2>
              <p className="text-[11px] text-stone-400">Ingestão instantânea de formulários Meta e Google</p>
            </div>
          </div>

          <div className="space-y-3">
            {RECENT_WEBHOOKS.map((wh) => (
              <div
                key={wh.id}
                className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/40 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-white">{wh.source}</span>
                  <span className="text-[10px] text-stone-400">{wh.time}</span>
                </div>
                <div className="text-stone-700 dark:text-stone-300">
                  Lead: <span className="font-semibold">{wh.lead}</span> ({wh.phone})
                </div>
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{wh.status} · Campanha: {wh.campaign}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Simulador WhatsApp Business Cloud API (US-22) */}
        <div className="bg-white dark:bg-stone-850 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Simulador WhatsApp Cloud API & Templates (US-22)</h2>
              <p className="text-[11px] text-stone-400">Validação de mensagens HSM corporativas pré-aprovadas pela Meta</p>
            </div>
          </div>

          <form onSubmit={handleSimulateWhatsApp} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Número do Lead (com DDD)
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Template Oficial Meta (HSM)
              </label>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white cursor-pointer"
              >
                <option value="pitch_match_alto_padrao">pitch_match_alto_padrao (Apresentação de Imóvel)</option>
                <option value="confirmacao_visita_sabado">confirmacao_visita_sabado (Agendamento)</option>
                <option value="dossie_download_followup">dossie_download_followup (Envio de Dossiê)</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="primary" size="md" type="submit" icon={Send} className="w-full">
                Testar Disparo da API
              </Button>
            </div>
          </form>

          {simulatedStatus && (
            <div className="p-3 rounded-xl bg-stone-900 text-emerald-400 font-mono text-xs border border-stone-800">
              {simulatedStatus}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
