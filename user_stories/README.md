# Urban Real State — Documentação de Negócio, UX e Especificação de User Stories (US)

Seja bem-vindo à documentação oficial de negócio, arquitetura funcional e mapeamento de jornadas da plataforma **Urban Real State**, agora integralmente revisada e refinada com base no **Relatório de Melhorias de Hierarquia, Leveza Visual e Fluxo de CRM (Auditoria de UX)**.

Este repositório documental foi estruturado por um Analista de Negócios especializado no mercado de inteligência e tecnologia imobiliária em estreita consonância com as melhores práticas de Design de Produto (Product Design & UX).

---

## 1. Nomenclatura e Personas Genéricas de Negócio

Para garantir neutralidade, portabilidade e modelo White-Label enterprise, todos os documentos adotam termos padronizados:
- **Nome do Projeto:** **Urban Real State**
- **Personas Envolvidas:**
  1. **Lead Comprador / Investidor (Buyer Persona):** Usuário final em busca de aquisição imobiliária, avaliando aderência orçamentária, localização e estilo de vida.
  2. **Lead Proprietário / Vendedor (Seller Persona):** Proprietário que disponibiliza seu imóvel para captação, exigindo transparência, valorização do anúncio e rapidez de fechamento.
  3. **Consultor Imobiliário / Corretor (Sales Persona):** Profissional de linha de frente responsável pelo atendimento, visitas presenciais, simulação de financiamento e negociação.
  4. **Gestor Comercial / Diretor Imobiliário (Leadership Persona):** Líder da equipe de vendas focado em volume geral de vendas (VGV), pipeline, comissões projetadas e velocidade do ciclo comercial.
  5. **Analista Financeiro / Correspondente Bancário (Financial Persona):** Especialista na aprovação de crédito imobiliário, montagem de pastas bancárias e amortizações SAC/PRICE.
  6. **Administrador do Sistema (Admin Persona):** Gestor de tecnologia, governança de dados por papéis (RBAC), segurança, webhooks e integrações.

---

## 2. Princípios de UX Incorporados nas User Stories

Com base na auditoria especializada de UX, todas as especificações absorveram 10 pilares fundamentais:
1. **Header Limpo:** Separação entre navegação por texto (*Imóveis, Match Explicável, Busca Guiada*) e ações; um único botão de destaque (*Concierge*); o acesso ao CRM passa a ser rotulado como *"Painel do corretor"*, visível exclusivamente para perfis autenticados com esse papel.
2. **Hero com Busca Protagonista:** H1 direto em 2 linhas (peso 600) focado no benefício do usuário (*rotina*); campo de busca amplo acima da dobra com microfone embutido.
3. **Faixa de Perfil Compacta:** Eliminação de 600px de filtros verticais acumulados, devolvendo **450px de altura diretamente para o catálogo de fotos**, com gaveta lateral (*drawer*) de edição completa.
4. **Recálculo 100% Automático:** Atualização instantânea com debounce (300 a 500ms), eliminando qualquer botão manual de recálculo.
5. **Estados Honestos:** Fim da falsa qualificação quando nada está restrito. Exibição de progresso real (*"1 de 4 pilares"*).
6. **Concierge Multimodal em Tela Dividida:** Voz e Chat com o **mesmo peso visual**; diálogo à esquerda e os 4 pilares se preenchendo e editáveis ao vivo à direita.
7. **Cards de Imóveis Otimizados:** Remoção de badges escuras sobre a imagem; selo *"Match 92%"* exibido apenas se houver perfil ativo; specs em linha única de texto neutro com concordância gramatical (*"1 vaga", "1 quarto"*); preço com **R$/m²** e bairro posicionado abaixo do valor.
8. **Separação de Linguagem (Comprador vs. Corretor):** O comprador vê *"Perfil salvo e compartilhado com seu consultor"*, nunca termos internos de vendas como *"CRM"*, *"Lead"* ou *"Qualificado"*.
9. **Sistema Visual "Um Acento, Uma Função":** Adoção de Design Tokens (`--accent: #C8431F`), superfícies claras como padrão (`--bg: #FAFAF8`), cartões com elevação suave (`--shadow-card`) e eliminação do arco-íris de cores conflitantes.
10. **Acessibilidade Universal (WCAG 2.1 AA):** Rótulos acessíveis em todos os botões de ícone (`aria-label`), alvos de toque mínimos de 44x44px e contraste superior a 4.5:1.

---

## 3. Estrutura de Pastas e Índice Completo de User Stories (US)

```
user_stories/
│
├── README.md                                                       <-- Este Guia Mestre
│
├── EPIC-01_PORTAL_PUBLICO_E_DESCOBERTA/
│   ├── US-01_Jornada_Anonymous_First_e_Onboarding/
│   │   └── US-01_Jornada_Anonymous_First.md                <-- [Atualizado com UX: Header limpo e Hero com busca protagonista]
│   ├── US-02_Concierge_Digital_de_Voz_e_Qualificacao/
│   │   └── US-02_Concierge_Digital_de_Voz.md                <-- [Atualizado com UX: Voz e Chat equilibrados e layout dividido]
│   ├── US-03_Busca_Semantica_Filtros_e_Metricas/
│   │   └── US-03_Busca_Semantica_Filtros_e_Metricas.md      <-- [Atualizado com UX: Faixa de perfil compacta e recálculo automático]
│   └── US-04_Catalogo_e_Visualizacao_em_Mapa/
│       └── US-04_Catalogo_e_Visualizacao_em_Mapa.md         <-- [Atualizado com UX: Cards otimizados, specs em texto e R$/m²]
│
├── EPIC-02_DETALHE_IMOVEL_E_CONVERSAO/
│   ├── US-05_Ficha_Tecnica_e_Match_Explicavel/
│   │   └── US-05_Ficha_Tecnica_e_Match_Explicavel.md
│   ├── US-06_Listing_Quality_Score_Auditoria_Anuncio/
│   │   └── US-06_Listing_Quality_Score.md
│   ├── US-07_Feedback_Critica_e_Refinamento_Perfil/
│   │   └── US-07_Feedback_Critica_e_Refinamento.md
│   ├── US-08_Captura_Leads_Exit_Intent_e_Dossie/
│   │   └── US-08_Captura_Leads_Exit_Intent_Dossie.md
│   └── US-09_Chatbot_Atendimento_Continuo/
│       └── US-09_Chatbot_Atendimento_Continuo.md
│
├── EPIC-03_AUTENTICACAO_GOVERNANCA_E_CONFIGURACAO/
│   ├── US-10_Autenticacao_e_Controle_Acesso_RBAC/
│   │   └── US-10_Autenticacao_e_Controle_Acesso_RBAC.md     <-- [Atualizado com UX: Painel do corretor visível apenas com RBAC]
│   └── US-11_Customizacao_Visual_White_Label_e_Temas/
│       └── US-11_Customizacao_Visual_White_Label.md         <-- [Atualizado com UX: Tokens CSS, um acento por função e acessibilidade]
│
├── EPIC-04_CRM_PIPELINE_E_GESTAO_DE_LEADS/
│   ├── US-12_Revenue_Home_Dashboard_Executivo/
│   │   └── US-12_Revenue_Home_Dashboard_Executivo.md        <-- [Atualizado com UX: Timeline de eventos e selo demo neutro]
│   ├── US-13_Pipeline_Kanban_e_Gestao_Oportunidades/
│   │   └── US-13_Pipeline_Kanban_Gestao_Oportunidades.md
│   ├── US-14_Perfil_Tridimensional_do_Comprador/
│   │   └── US-14_Perfil_Tridimensional_do_Comprador.md      <-- [Atualizado com UX: Modelo único de 4 pilares e separação de linguagem]
│   ├── US-15_Motor_Smart_Matching_e_Pitch_WhatsApp/
│   │   └── US-15_Motor_Smart_Matching_Pitch_WhatsApp.md
│   └── US-16_Distribuicao_Automatica_de_Leads/
│       └── US-16_Distribuicao_Automatica_Leads.md
│
├── EPIC-05_GESTAO_DE_ESTOQUE_E_SIMULADORES/
│   ├── US-17_Gestao_Inventario_Imoveis_e_Auditoria_LQS/
│   │   └── US-17_Gestao_Inventario_Imoveis_LQS.md
│   ├── US-18_Simulador_Credito_Imobiliario_MultiBanco/
│   │   └── US-18_Simulador_Credito_Imobiliario_MultiBanco.md
│   └── US-19_Gestao_Comissoes_e_Divisao_Honorarios/
│       └── US-19_Gestao_Comissoes_Divisao_Honorarios.md
│
├── EPIC-06_INTEGRACOES_MULTICANAL_E_AUTOMACAO/
│   ├── US-20_Sincronizacao_Portais_Imobiliarios/
│   │   └── US-20_Sincronizacao_Portais_Imobiliarios.md
│   ├── US-21_Webhooks_Meta_Ads_e_Fontes_Externas/
│   │   └── US-21_Webhooks_Meta_Ads_Fontes_Externas.md
│   ├── US-22_Simulador_WhatsApp_Cloud_API/
│   │   └── US-22_Simulador_WhatsApp_Cloud_API.md
│   └── US-23_Console_Automacoes_Workflows_e_Gatilhos/
│       └── US-23_Console_Automacoes_Workflows_Gatilhos.md
│
└── HIERARQUIA_DE_DESENVOLVIMENTO_E_JORNADAS/
    ├── HIERARQUIA_DE_DESENVOLVIMENTO_URBAN_REAL_STATE.md    <-- [Atualizado com o Plano de 8 Entregas do UX]
    └── MATRIZ_CONSOLIDADA_DE_GAPS_E_ROADMAP.md              <-- [Atualizado com os 28 GAPs de UX e Engenharia]
```

---

## 4. Navegação Direta para Documentos Estratégicos

- 🧭 **[Hierarquia de Desenvolvimento e Plano de Execução](file:///c:/DEV/imobiliaria2.0/user_stories/HIERARQUIA_DE_DESENVOLVIMENTO_E_JORNADAS/HIERARQUIA_DE_DESENVOLVIMENTO_URBAN_REAL_STATE.md)**: Mapeamento ponta a ponta dos fluxos do Lead Comprador e do Usuário Interno, além do plano de execução ordenado em 8 entregas prioritárias por esforço e impacto.
- 🎯 **[Matriz Consolidada de GAPs e Roadmap](file:///c:/DEV/imobiliaria2.0/user_stories/HIERARQUIA_DE_DESENVOLVIMENTO_E_JORNADAS/MATRIZ_CONSOLIDADA_DE_GAPS_E_ROADMAP.md)**: Quadro executivo detalhando os 28 GAPs técnicos e de interface classificados por severidade, com cronograma em 3 ondas evolutivas.
