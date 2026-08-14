import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'https://centralmagistrate.bexar.org/';

function decodeHtml(value='') {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function textFromHtml(value='') {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(value='') {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRows(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => textFromHtml(m[1]));
    if (cells.length < 5) continue;
    const [name, race, dobOrAge, sid, bookingNumber] = cells;
    if (!name || /NAME/i.test(name) || !bookingNumber) continue;
    rows.push({ name, race, dobOrAge, sid, bookingNumber });
  }
  return rows;
}

export async function GET(request) {
  const name = new URL(request.url).searchParams.get('name')?.trim() || '';
  if (!name) return NextResponse.json({ ok:false, error:'Falta el nombre.', sourceUrl:SOURCE }, { status:400 });

  try {
    const res = await fetch(SOURCE, {
      cache:'no-store',
      headers: { 'User-Agent':'Mozilla/5.0 PublicRecordsSearch/1.0' },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) throw new Error(`Fuente respondiÃ³ ${res.status}`);
    const html = await res.text();
    const all = parseRows(html);
    const wanted = norm(name).split(' ').filter(Boolean);
    const records = all.filter(row => {
      const hay = norm(row.name);
      return wanted.every(part => hay.includes(part));
    }).slice(0, 25);

    return NextResponse.json({ ok:true, count:records.length, records, sourceUrl:SOURCE, coverage:'Ãltimas 24 horas' });
  } catch (error) {
    return NextResponse.json({ ok:false, unavailable:true, sourceUrl:SOURCE, error:'La fuente oficial no permitiÃ³ completar la consulta automÃ¡tica en este momento.' }, { status:200 });
  }
}
