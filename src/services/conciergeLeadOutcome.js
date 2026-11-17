/**
 * conciergeLeadOutcome.js
 * Decide o que o visitante e o modelo ficam sabendo depois de um pedido de contato com corretor.
 * A regra: só se diz "registrado" quando a gravação realmente deu certo. Antes, o aviso saía antes
 * da gravação e o resultado era ignorado, então uma falha (tabela ausente, rede) prometia um
 * retorno que nunca chegaria à equipe.
 *
 * Fica separado de conciergeLeadsClient.js de propósito: aquele módulo importa o Supabase, que
 * depende do Vite; este aqui é puro e roda também nos testes (node:test).
 */

/**
 * @param {{ ok?: boolean, motivo?: string } | undefined} saved resultado de saveLead
 * @param {{ name: string, contato: string, quando?: string, ids?: string[] }} dados
 * @returns {{ registrado: boolean, notice: string, result: object }}
 */
export function leadOutcome(saved, { name, contato, quando = '', ids = [] }) {
  if (saved?.ok === true) {
    return {
      registrado: true,
      notice: `Contato registrado: ${name} · ${contato}${quando}`,
      result: { registrado: true, imoveis_ids: ids }
    };
  }
  return {
    registrado: false,
    notice: 'Não consegui enviar seu contato à equipe agora. Pode tentar de novo em instantes?',
    result: {
      registrado: false,
      erro: 'nao_foi_possivel_enviar',
      orientacao: 'O contato NÃO chegou à equipe. Diga isso com sinceridade, peça desculpa e sugira tentar de novo em instantes. Não prometa que um corretor vai ligar.'
    }
  };
}
