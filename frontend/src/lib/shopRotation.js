/**
 * shopRotation.js
 * Motor de Rotação da Loja Nexus (Ciclos de 3 dias / 72 horas)
 * Calcula de forma determinística a seleção de molduras ativas na vitrine,
 * variações dinâmicas de preços e promoções automáticas sorteadas.
 */

// Duração de cada ciclo: 72 horas (3 dias) em milissegundos
export const ROTATION_CYCLE_MS = 3 * 24 * 60 * 60 * 1000;

// Época de referência base (01/01/2024 00:00:00 UTC)
export const ROTATION_EPOCH = 1704067200000;

// Chave para armazenar o offset de rotação do Admin no localStorage
export const ROTATION_OFFSET_KEY = 'nexus_shop_rotation_offset';

/**
 * Obtém o offset manual de rotação definido pelo Administrador
 */
export function getAdminRotationOffset() {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(ROTATION_OFFSET_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
}

/**
 * Define um novo offset de rotação (usado pelo Admin para forçar uma nova rotação)
 */
export function setAdminRotationOffset(newOffset) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROTATION_OFFSET_KEY, String(newOffset));
  window.dispatchEvent(new CustomEvent('nexus_shop_rotation_changed', { detail: { offset: newOffset } }));
}

/**
 * Força a próxima rotação imediatamente (avança 1 ciclo)
 */
export function forceNextRotation() {
  const currentOffset = getAdminRotationOffset();
  const nextOffset = currentOffset + 1;
  setAdminRotationOffset(nextOffset);
  return nextOffset;
}

/**
 * Reseta o offset para a rotação natural do calendário
 */
export function resetRotationOffset() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROTATION_OFFSET_KEY);
  window.dispatchEvent(new CustomEvent('nexus_shop_rotation_changed', { detail: { offset: 0 } }));
}

/**
 * Gerador de números pseudo-aleatórios determinístico (Mulberry32)
 * Garante que a mesma semente (seed) produza exatamente os mesmos números em qualquer dispositivo.
 */
function createPRNG(seed) {
  let s = Math.abs(Math.floor(seed)) || 12345;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calcula o estado completo da rotação de 3 dias para a lista de molduras
 * 
 * @param {Array} allFrames - Lista completa de molduras (nativas + cadastradas pelo admin)
 * @param {number} customOffset - Offset opcional do admin
 * @param {number} customNow - Timestamp opcional (padrão Date.now())
 * @returns {Object} Estado da rotação contendo itens ativos, promoções, tempo restante e ciclo atual
 */
export function calculateFrameRotation(allFrames = [], customOffset = null, customNow = null) {
  const now = customNow || Date.now();
  const offset = customOffset !== null ? customOffset : getAdminRotationOffset();

  // Índice base do ciclo a cada 3 dias
  const naturalCycleIndex = Math.floor((now - ROTATION_EPOCH) / ROTATION_CYCLE_MS);
  const cycleIndex = naturalCycleIndex + offset;

  // Próxima troca no calendário natural
  const nextRotationTimestamp = (naturalCycleIndex + 1) * ROTATION_CYCLE_MS + ROTATION_EPOCH;
  const msRemaining = Math.max(0, nextRotationTimestamp - now);

  if (!Array.isArray(allFrames) || allFrames.length === 0) {
    return {
      cycleIndex,
      nextRotationTimestamp,
      msRemaining,
      rotatingFrames: [],
      flashDeal: null,
      weeklyDeal: null,
      allRotatedFrames: []
    };
  }

  // Filtrar apenas molduras válidas (evitando a moldura 'none' ou 'default')
  const validFrames = allFrames.filter(f => f && f.id && f.id !== 'default' && f.id !== 'none');

  // Identificar molduras recém-adicionadas pelo admin (últimos 3 dias ou com flag is_new)
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  const newFrames = validFrames.filter(f => {
    if (f.is_new || f.isNew) return true;
    if (f.created_at) {
      const createdTime = new Date(f.created_at).getTime();
      return !isNaN(createdTime) && createdTime > threeDaysAgo;
    }
    return false;
  });

  const regularFrames = validFrames.filter(f => !newFrames.some(nf => nf.id === f.id));

  // Inicializar o PRNG determinístico para este ciclo
  const rng = createPRNG(cycleIndex * 7919 + 42);

  // Embaralhar molduras normais de forma determinística (Fisher-Yates)
  const shuffledRegular = [...regularFrames];
  for (let i = shuffledRegular.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledRegular[i], shuffledRegular[j]] = [shuffledRegular[j], shuffledRegular[i]];
  }

  // Tamanho desejado da vitrine de molduras por ciclo (5 a 7 molduras)
  const targetVitrineCount = Math.min(validFrames.length, Math.max(5, Math.min(7, validFrames.length)));

  // Novas molduras ganham vaga prioritária na vitrine com selo de NOVIDADE!
  const selectedPool = [...newFrames];
  for (const frame of shuffledRegular) {
    if (selectedPool.length >= targetVitrineCount) break;
    if (!selectedPool.some(p => p.id === frame.id)) {
      selectedPool.push(frame);
    }
  }

  // Se por acaso a lista for pequena, inclui todas as disponíveis
  if (selectedPool.length === 0) {
    selectedPool.push(...validFrames);
  }

  // Processar cada moldura da vitrine calculando Variação Dinâmica de Preço e Promoções
  // Sorteamos 1 Oferta Relâmpago (35% a 50% de desconto) e 1 Promoção em Destaque (20% a 25% de desconto)
  const promoRng = createPRNG(cycleIndex * 15485863 + 137);

  // Índices para as promoções dentro da vitrine
  const flashDealIndex = selectedPool.length > 0 ? Math.floor(promoRng() * selectedPool.length) : -1;
  let weeklyDealIndex = -1;
  if (selectedPool.length > 1) {
    do {
      weeklyDealIndex = Math.floor(promoRng() * selectedPool.length);
    } while (weeklyDealIndex === flashDealIndex && selectedPool.length > 1);
  }

  let flashDealItem = null;
  let weeklyDealItem = null;

  const rotatingFrames = selectedPool.map((frame, idx) => {
    const isNew = newFrames.some(nf => nf.id === frame.id);
    const basePrice = typeof frame.price === 'number' ? frame.price : 200;

    // Se o item for gratuito ou exclusivo (ex: frame_beta), não altera preço
    if (basePrice === 0 || frame.isExclusive) {
      return {
        ...frame,
        basePrice,
        price: 0,
        originalPrice: 0,
        discountPercent: 0,
        isFlashDeal: false,
        isWeeklyDeal: false,
        isNewItem: isNew,
        rotationTag: isNew ? 'NOVIDADE 🔥' : (frame.isExclusive ? 'EXCLUSIVA 🧪' : null)
      };
    }

    // 1. Variação Dinâmica de Mercado (-10% a +20%) a cada ciclo
    // Cria a sensação de preços vivos que mudam a cada 3 dias
    const priceVarianceFactor = 0.9 + (promoRng() * 0.3); // entre 0.9 e 1.2
    let dynamicBasePrice = Math.round((basePrice * priceVarianceFactor) / 5) * 5;
    dynamicBasePrice = Math.max(50, dynamicBasePrice); // Mínimo de 50 coins

    let finalPrice = dynamicBasePrice;
    let discountPercent = 0;
    let isFlash = false;
    let isWeekly = false;
    let tag = null;

    if (idx === flashDealIndex) {
      // ⚡ OFERTA RELÂMPAGO: 35% a 50% de desconto
      isFlash = true;
      const discounts = [35, 40, 45, 50];
      discountPercent = discounts[Math.floor(promoRng() * discounts.length)];
      finalPrice = Math.max(30, Math.round((dynamicBasePrice * (1 - discountPercent / 100)) / 5) * 5);
      tag = `⚡ OFERTA -${discountPercent}%`;
    } else if (idx === weeklyDealIndex) {
      // 🔥 DESTAQUE PROMOCIONAL: 20% a 25% de desconto
      isWeekly = true;
      const discounts = [20, 25];
      discountPercent = discounts[Math.floor(promoRng() * discounts.length)];
      finalPrice = Math.max(40, Math.round((dynamicBasePrice * (1 - discountPercent / 100)) / 5) * 5);
      tag = `🔥 PROMO -${discountPercent}%`;
    } else if (isNew) {
      tag = 'NOVIDADE 🔥';
    } else if (dynamicBasePrice < basePrice) {
      tag = 'EM BAIXA 📉';
    }

    const processedItem = {
      ...frame,
      basePrice,
      originalPrice: dynamicBasePrice,
      price: finalPrice,
      discountPercent,
      isFlashDeal: isFlash,
      isWeeklyDeal: isWeekly,
      isNewItem: isNew,
      rotationTag: tag
    };

    if (isFlash) flashDealItem = processedItem;
    if (isWeekly) weeklyDealItem = processedItem;

    return processedItem;
  });

  // Ordenar a vitrine colocando a Oferta Relâmpago e Novidades no topo
  rotatingFrames.sort((a, b) => {
    if (a.isFlashDeal && !b.isFlashDeal) return -1;
    if (!a.isFlashDeal && b.isFlashDeal) return 1;
    if (a.isNewItem && !b.isNewItem) return -1;
    if (!a.isNewItem && b.isNewItem) return 1;
    if (a.isWeeklyDeal && !b.isWeeklyDeal) return -1;
    if (!a.isWeeklyDeal && b.isWeeklyDeal) return 1;
    return 0;
  });

  return {
    cycleIndex,
    nextRotationTimestamp,
    msRemaining,
    rotatingFrames,
    flashDeal: flashDealItem,
    weeklyDeal: weeklyDealItem,
    allFramesCount: validFrames.length
  };
}

/**
 * Formata os milissegundos restantes em tempo legível (ex: "2d 14h 23m 10s")
 */
export function formatRemainingRotationTime(ms) {
  if (ms <= 0) return '00m 00s';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}
