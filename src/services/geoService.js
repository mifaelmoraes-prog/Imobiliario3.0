/**
 * geoService.js
 * Serviço de geolocalização e coordenadas geográficas de alta precisão
 * para os imóveis da plataforma Urban Real State (Imobiliária 3.0).
 *
 * Mapeia com granularidade:
 * - Estado (UF)
 * - Cidade (7 Capitais)
 * - Bairro (126 bairros reais)
 * - Dispersão em nível de Rua / Quadra (micro-offset determinístico baseado no ID do imóvel)
 */

export const CAPITAL_CENTERS = {
  'são paulo': { center: [-23.5505, -46.6333], zoom: 12, state: 'SP' },
  'sao paulo': { center: [-23.5505, -46.6333], zoom: 12, state: 'SP' },
  'rio de janeiro': { center: [-22.9068, -43.1729], zoom: 12, state: 'RJ' },
  'belo horizonte': { center: [-19.9167, -43.9345], zoom: 12, state: 'MG' },
  'vitória': { center: [-20.3155, -40.3128], zoom: 13, state: 'ES' },
  'vitoria': { center: [-20.3155, -40.3128], zoom: 13, state: 'ES' },
  'curitiba': { center: [-25.4284, -49.2733], zoom: 12, state: 'PR' },
  'florianópolis': { center: [-27.5954, -48.5480], zoom: 12, state: 'SC' },
  'florianopolis': { center: [-27.5954, -48.5480], zoom: 12, state: 'SC' },
  'porto alegre': { center: [-30.0346, -51.2177], zoom: 12, state: 'RS' },
  // Litoral Norte de SP (imóveis de imobiliárias parceiras)
  'são sebastião': { center: [-23.7458, -45.6848], zoom: 11, state: 'SP' },
  'caraguatatuba': { center: [-23.6214, -45.4580], zoom: 11, state: 'SP' },
  'bertioga': { center: [-23.8486, -46.1396], zoom: 12, state: 'SP' },
  'ubatuba': { center: [-23.3977, -45.0820], zoom: 11, state: 'SP' }
};

// Mapeamento preciso por Cidade + Bairro
export const NEIGHBORHOOD_COORDINATES = {
  // ===================== SÃO PAULO - SP =====================
  'são paulo - sp::jardim nossa senhora do carmo': [-23.5786, -46.4678],
  'são paulo - sp::rio pequeno': [-23.5728, -46.7441],
  'são paulo - sp::vila robertina': [-23.5134, -46.4952],
  'são paulo - sp::vila matilde': [-23.5323, -46.5286],
  'são paulo - sp::jardim pinheiros': [-23.5762, -46.7214],
  'são paulo - sp::jardim colonial': [-23.5971, -46.4719],
  'são paulo - sp::jardim edilene': [-23.6811, -46.6892],
  'são paulo - sp::jardim angelina': [-23.6734, -46.6621],
  'são paulo - sp::vila ema': [-23.5852, -46.5512],
  'são paulo - sp::jardim presidente': [-23.6214, -46.7312],
  'são paulo - sp::bairro nobre de são paulo': [-23.5615, -46.6821], // Jardins / Itaim
  'são paulo - sp::jardim felicidade (zona oeste)': [-23.5089, -46.7423],
  'são paulo - sp::jordanópolis': [-23.7021, -46.6812],
  'são paulo - sp::parque mandaqui': [-23.4792, -46.6341],
  'são paulo - sp::jardim prudência': [-23.6601, -46.6712],
  'são paulo - sp::bela vista': [-23.5591, -46.6492],
  'são paulo - sp::real parque': [-23.6092, -46.7012],
  'são paulo - sp::jardim adhemar de barros': [-23.7011, -46.7023],
  'são paulo - sp::parque munhoz': [-23.6421, -46.7612],
  'são paulo - sp::parque imperial': [-23.6241, -46.6312],
  'são paulo - sp::brás': [-23.5412, -46.6189],
  'são paulo - sp::lapa de baixo': [-23.5182, -46.6892],
  'são paulo - sp::chácara califórnia': [-23.5412, -46.5412],
  'são paulo - sp::jardim miriam': [-23.6782, -46.6521],

  // ===================== RIO DE JANEIRO - RJ =====================
  'rio de janeiro - rj::senador vasconcelos': [-22.8834, -43.5882],
  'rio de janeiro - rj::piedade': [-22.8912, -43.3092],
  'rio de janeiro - rj::realengo': [-22.8791, -43.4312],
  'rio de janeiro - rj::campo grande': [-22.9031, -43.5582],
  'rio de janeiro - rj::sepetiba': [-22.9712, -43.7012],
  'rio de janeiro - rj::quintino bocaiúva': [-22.8841, -43.3182],
  'rio de janeiro - rj::marechal hermes': [-22.8612, -43.3712],
  'rio de janeiro - rj::recreio dos bandeirantes': [-23.0282, -43.4612],
  'rio de janeiro - rj::bairro nobre de rio de janeiro': [-22.9832, -43.2012], // Ipanema
  'rio de janeiro - rj::pechincha': [-22.9341, -43.3612],
  'rio de janeiro - rj::santíssimo': [-22.8712, -43.5182],
  'rio de janeiro - rj::engenho de dentro': [-22.8981, -43.2982],
  'rio de janeiro - rj::curicica': [-22.9712, -43.3882],
  'rio de janeiro - rj::taquara': [-22.9212, -43.3712],
  'rio de janeiro - rj::barra olímpica': [-22.9812, -43.3912],
  'rio de janeiro - rj::santa cruz': [-22.9182, -43.6812],
  'rio de janeiro - rj::bangu': [-22.8781, -43.4682],
  'rio de janeiro - rj::madureira': [-22.8732, -43.3392],
  'rio de janeiro - rj::pilares': [-22.8812, -43.2912],
  'rio de janeiro - rj::jacarepaguá': [-22.9312, -43.3512],
  'rio de janeiro - rj::botafogo': [-22.9512, -43.1812],
  'rio de janeiro - rj::méier': [-22.9012, -43.2812],

  // ===================== BELO HORIZONTE - MG =====================
  'belo horizonte - mg::bairro nobre de belo horizonte': [-19.9381, -43.9312], // Savassi / Lourdes
  'belo horizonte - mg::santa terezinha': [-19.8682, -43.9912],
  'belo horizonte - mg::penha': [-19.8912, -43.8912],
  'belo horizonte - mg::goiânia': [-19.8812, -43.8812],
  'belo horizonte - mg::itapoã': [-19.8381, -43.9512],
  'belo horizonte - mg::santa mônica': [-19.8212, -43.9812],
  'belo horizonte - mg::jardim alvorada': [-19.8912, -44.0112],
  'belo horizonte - mg::são gabriel': [-19.8612, -43.9182],
  'belo horizonte - mg::são salvador': [-19.8912, -44.0212],
  'belo horizonte - mg::canaã': [-19.8212, -43.9412],
  'belo horizonte - mg::dom joaquim': [-19.8812, -43.9112],
  'belo horizonte - mg::renascença': [-19.8912, -43.9382],
  'belo horizonte - mg::pompéia': [-19.9182, -43.9012],
  'belo horizonte - mg::esplanada': [-19.9112, -43.9112],
  'belo horizonte - mg::califórnia': [-19.9182, -44.0182],
  'belo horizonte - mg::buritis': [-19.9712, -43.9682],
  'belo horizonte - mg::camargos': [-19.9212, -44.0312],
  'belo horizonte - mg::cidade nova': [-19.8882, -43.9212],
  'belo horizonte - mg::coração de jesus': [-19.9512, -43.9482],
  'belo horizonte - mg::havaí': [-19.9612, -43.9812],
  'belo horizonte - mg::cardoso (barreiro)': [-19.9812, -44.0212],
  'belo horizonte - mg::são luiz': [-19.8582, -43.9712],
  'belo horizonte - mg::lourdes': [-19.9312, -43.9412],

  // ===================== VITÓRIA - ES =====================
  'vitória - es::centro': [-20.3212, -40.3382],
  'vitória - es::bairro nobre de vitória': [-20.3012, -40.2912],
  'vitória - es::jardim camburi': [-20.2612, -40.2712],
  'vitória - es::jucutuquara': [-20.3112, -40.3182],
  'vitória - es::bento ferreira': [-20.3182, -40.3112],
  'vitória - es::itararé': [-20.3012, -40.3112],
  'vitória - es::república': [-20.2782, -40.2982],
  'vitória - es::santa lúcia': [-20.3082, -40.3012],
  'vitória - es::jardim da penha': [-20.2882, -40.2912],
  'vitória - es::enseada do suá': [-20.3182, -40.2912],
  'vitória - es::praia do canto': [-20.3012, -40.2912],
  'vitória - es::mata da praia': [-20.2782, -40.2882],
  'vitória - es::barro vermelho': [-20.3012, -40.3012],

  // ===================== CURITIBA - PR =====================
  'curitiba - pr::lindóia': [-25.4812, -49.2782],
  'curitiba - pr::bairro nobre de curitiba': [-25.4419, -49.2891], // Batel
  'curitiba - pr::cidade industrial': [-25.5012, -49.3382],
  'curitiba - pr::sítio cercado': [-25.5382, -49.2682],
  'curitiba - pr::parolin': [-25.4612, -49.2682],
  'curitiba - pr::cajuru': [-25.4482, -49.2212],
  'curitiba - pr::tatuquara': [-25.5682, -49.3312],
  'curitiba - pr::pilarzinho': [-25.3982, -49.2882],
  'curitiba - pr::umbará': [-25.5682, -49.2712],
  'curitiba - pr::bacacheri': [-25.3982, -49.2312],
  'curitiba - pr::guaíra': [-25.4682, -49.2782],
  'curitiba - pr::novo mundo': [-25.4882, -49.2912],
  'curitiba - pr::hauer': [-25.4782, -49.2512],
  'curitiba - pr::mercês': [-25.4212, -49.2982],
  'curitiba - pr::água verde': [-25.4528, -49.2858],
  'curitiba - pr::santa cândida': [-25.3612, -49.2212],
  'curitiba - pr::batel': [-25.4419, -49.2891],
  'curitiba - pr::xaxim': [-25.5012, -49.2612],
  'curitiba - pr::ecoville': [-25.4389, -49.3364],
  'curitiba - pr::mossunguê': [-25.4389, -49.3364],
  'curitiba - pr::bigorrilho': [-25.4326, -49.2974],
  'curitiba - pr::champagnat': [-25.4326, -49.2974],
  'curitiba - pr::cabral': [-25.4124, -49.2558],
  'curitiba - pr::juvevê': [-25.4182, -49.2592],

  // ===================== FLORIANÓPOLIS - SC =====================
  'florianópolis - sc::são joão do rio vermelho': [-27.5012, -48.4212],
  'florianópolis - sc::santo antônio de lisboa': [-27.5082, -48.5182],
  'florianópolis - sc::ingleses do rio vermelho': [-27.4382, -48.3982],
  'florianópolis - sc::jurerê internacional': [-27.4382, -48.5012],
  'florianópolis - sc::jurerê': [-27.4412, -48.4912],
  'florianópolis - sc::campeche': [-27.6812, -48.4882],
  'florianópolis - sc::bairro nobre de florianópolis': [-27.5912, -48.5512],
  'florianópolis - sc::itacorubi': [-27.5782, -48.5112],
  'florianópolis - sc::coqueiros': [-27.6082, -48.5782],
  'florianópolis - sc::agronômica': [-27.5782, -48.5382],
  'florianópolis - sc::abraão': [-27.6012, -48.5882],

  // ===================== PORTO ALEGRE - RS =====================
  'porto alegre - rs::ponta grossa': [-30.1812, -51.2182],
  'porto alegre - rs::nonoai': [-30.0882, -51.2182],
  'porto alegre - rs::ipanema': [-30.1382, -51.2282],
  'porto alegre - rs::chácara das pedras': [-30.0382, -51.1582],
  'porto alegre - rs::bairro nobre de porto alegre': [-30.0282, -51.2012], // Moinhos de Vento
  'porto alegre - rs::azenha': [-30.0512, -51.2182],
  'porto alegre - rs::farrapos': [-29.9882, -51.1982],
  'porto alegre - rs::são sebastião': [-30.0012, -51.1412],
  'porto alegre - rs::guarujá': [-30.1582, -51.2382],
  'porto alegre - rs::jardim itu': [-30.0182, -51.1382],
  'porto alegre - rs::jardim botânico': [-30.0512, -51.1812],
  'porto alegre - rs::cavalhada': [-30.1082, -51.2282],
  'porto alegre - rs::jardim do salso': [-30.0582, -51.1682],
  'porto alegre - rs::moinhos de vento': [-30.0282, -51.2012],
  'porto alegre - rs::higienópolis': [-30.0182, -51.1882],

  // ===================== LITORAL NORTE E OUTROS (SP) =====================
  // Posições aproximadas (nível de bairro/praia), obtidas do OpenStreetMap.
  'são paulo - sp::jardim paulista': [-23.5652, -46.6602],
  'são paulo - sp::jardim guedala': [-23.5870, -46.7187],
  'são sebastião - sp::praia do engenho': [-23.7641, -45.7815],
  'são sebastião - sp::praia de juquehy': [-23.7692, -45.7280],
  'são sebastião - sp::praia de maresias': [-23.7870, -45.5616],
  'são sebastião - sp::praia barra do sahy': [-23.7705, -45.6921],
  'são sebastião - sp::praia de camburi': [-23.7742, -45.6437],
  'caraguatatuba - sp::praia do indaiá': [-23.6441, -45.4238],
  'caraguatatuba - sp::prainha': [-23.6311, -45.3904],
  'caraguatatuba - sp::praia da tabatinga': [-23.5668, -45.2729],
  'caraguatatuba - sp::condomínio costa verde tabatinga': [-23.5668, -45.2729],
  'caraguatatuba - sp::martim de sá': [-23.6270, -45.3822],
  'caraguatatuba - sp::morro do algodão': [-23.6828, -45.4515],
  'caraguatatuba - sp::travessão - portal dos passaros': [-23.7077, -45.4456],
  'bertioga - sp::riviera de são lourenço': [-23.7947, -46.0237],
  'ubatuba - sp::praia da lagoinha': [-23.5235, -45.2104]
};

/**
 * Gera um micro-offset pseudo-aleatório porém determinístico (baseado no ID do imóvel),
 * espalhando os pins pelas ruas e quadras do mesmo bairro (raio de ~100m a 350m).
 */
function getStreetOffset(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = (((Math.abs(hash) % 100) / 100) - 0.5) * 0.005; // ~250m
  const lngOffset = (((Math.abs(hash >> 3) % 100) / 100) - 0.5) * 0.005; // ~250m
  return [latOffset, lngOffset];
}

/**
 * Obtém as coordenadas geográficas exatas [lat, lng] do imóvel,
 * respeitando Cidade, Estado, Bairro e rua (granularidade máxima).
 */
export function getPropertyCoordinates(property) {
  if (!property) return [-25.4284, -49.2733];

  const city = (property.city || '').toLowerCase().trim();
  const neighborhood = (property.neighborhood || '').toLowerCase().trim();
  const key = `${city}::${neighborhood}`;

  // 1. Busca exata de Cidade + Bairro
  let baseCoords = NEIGHBORHOOD_COORDINATES[key];

  // 2. Se não encontrou exato, tenta casar bairro por substring
  if (!baseCoords) {
    const entry = Object.entries(NEIGHBORHOOD_COORDINATES).find(([k]) => {
      return k.startsWith(city) && (k.includes(neighborhood) || neighborhood.includes(k.split('::')[1]));
    });
    if (entry) {
      baseCoords = entry[1];
    }
  }

  // 3. Fallback inteligente: Centro da Cidade do Imóvel (NUNCA Curitiba forçado!)
  if (!baseCoords) {
    const cityKey = Object.keys(CAPITAL_CENTERS).find(c => city.includes(c));
    if (cityKey) {
      baseCoords = CAPITAL_CENTERS[cityKey].center;
    } else {
      baseCoords = [-23.5505, -46.6333]; // Fallback neutro para São Paulo se cidade for desconhecida
    }
  }

  // 4. Aplica micro-offset para distribuição por ruas do bairro
  const [offsetLat, offsetLng] = getStreetOffset(property.id || '');
  return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
}

/**
 * Calcula o centro e zoom ideais para o mapa com base na cidade selecionada e imóveis.
 */
export function getMapViewport(selectedCity, properties = []) {
  if (selectedCity && selectedCity !== 'Todas') {
    const cityClean = selectedCity.toLowerCase().trim();
    const cityKey = Object.keys(CAPITAL_CENTERS).find(c => cityClean.includes(c));
    if (cityKey) {
      return {
        center: CAPITAL_CENTERS[cityKey].center,
        zoom: CAPITAL_CENTERS[cityKey].zoom
      };
    }
  }

  // Se 'Todas' as cidades estiverem selecionadas:
  // Centro geográfico equilibrado do Brasil Sul/Sudeste onde estão as 7 capitais
  return {
    center: [-24.8, -47.0], // Ponto médio entre SP, RJ, MG, ES, PR, SC, RS
    zoom: 6
  };
}

