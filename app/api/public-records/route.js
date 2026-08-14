import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCES = {
  property: {
    name: 'Bexar Central Appraisal District',
    url: 'https://bexar.trueautomation.com/clientdb/propertysearch.aspx?cid=110'
  },
  civil: {
    name: 'Bexar County Clerk Official Records',
    url: 'https://bexar.tx.publicsearch.us/'
  },
  court: {
    name: 'Bexar County Justice Information Portal',
    url: 'https://portal-txbexar.tylertech.cloud/Portal/'
  }
};

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHtml(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsName(text, name) {
  const haystack = normalize(text);
  const parts = normalize(name).split(' ').filter(Boolean);

  if (parts.length === 0) return false;

  return parts.every((part) => haystack.includes(part));
}

async function fetchPage(url) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PublicRecordsSearch/1.0; +https://public-records-search.vercel.app)',
      Accept: 'text/html,application/xhtml+xml'
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    throw new Error(`Fuente respondió ${response.status}`);
  }

  return await response.text();
}

async function checkPropertySource(name) {
  const source = SOURCES.property;

  try {
    const html = await fetchPage(source.url);
    const text = cleanHtml(html);

    return {
      type: 'property',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: true,
      matchedOnLandingPage: containsName(text, name),
      note:
        'BCAD ofrece búsqueda pública por nombre del propietario, pero la búsqueda interactiva requiere enviar el formulario del sitio oficial.'
    };
  } catch {
    return {
      type: 'property',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: false,
      note: 'No fue posible consultar BCAD automáticamente en este momento.'
    };
  }
}

async function checkCivilSource(name) {
  const source = SOURCES.civil;

  try {
    const html = await fetchPage(source.url);
    const text = cleanHtml(html);

    return {
      type: 'civil',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: true,
      matchedOnLandingPage: containsName(text, name),
      note:
        'El County Clerk permite buscar matrimonios y otros documentos públicos, pero su buscador oficial funciona de forma interactiva y no expone una API pública documentada.'
    };
  } catch {
    return {
      type: 'civil',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: false,
      note:
        'No fue posible consultar la fuente del County Clerk automáticamente.'
    };
  }
}

async function checkCourtSource(name) {
  const source = SOURCES.court;

  try {
    const html = await fetchPage(source.url);
    const text = cleanHtml(html);

    return {
      type: 'court',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: true,
      matchedOnLandingPage: containsName(text, name),
      note:
        'El portal judicial requiere JavaScript, cookies y una búsqueda interactiva; por eso no se extraen casos automáticamente desde esta ruta.'
    };
  } catch {
    return {
      type: 'court',
      source: source.name,
      sourceUrl: source.url,
      automatic: false,
      available: false,
      note:
        'No fue posible consultar el portal judicial automáticamente.'
    };
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name')?.trim() || '';
  const category = url.searchParams.get('category') || 'all';

  if (!name) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Falta el nombre de la persona.',
        records: []
      },
      { status: 400 }
    );
  }

  const checks = [];

  if (category === 'all' || category === 'property') {
    checks.push(checkPropertySource(name));
  }

  if (category === 'all' || category === 'civil') {
    checks.push(checkCivilSource(name));
  }

  if (category === 'all' || category === 'court') {
    checks.push(checkCourtSource(name));
  }

  const sources = await Promise.all(checks);

  return NextResponse.json({
    ok: true,
    query: name,
    records: [],
    sources,
    message:
      'No se inventan coincidencias. Solo se muestran registros automáticamente cuando una fuente oficial permite obtenerlos de forma técnica y legítima.'
  });
}
