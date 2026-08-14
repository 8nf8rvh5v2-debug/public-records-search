'use client';

import { useMemo, useState } from 'react';

const categories = [
  { id: 'all', label: 'Todo' },
  { id: 'property', label: 'Propiedades' },
  { id: 'civil', label: 'Matrimonio / documentos' },
  { id: 'court', label: 'Tribunales' },
  { id: 'arrest', label: 'Arrestos' }
];

const sources = [
  {
    id: 'magistrate',
    category: 'arrest',
    name: 'Central Magistrate Search',
    agency: 'Bexar County',
    url: 'https://centralmagistrate.bexar.org/',
    status: 'Consulta automática',
    note: 'Arrestos procesados recientemente por Central Magistrate.'
  },
  {
    id: 'justice',
    category: 'court',
    name: 'Justice Information Portal',
    agency: 'Bexar County',
    url: 'https://portal-txbexar.tylertech.cloud/Portal/',
    status: 'Fuente oficial',
    note: 'Expedientes públicos de County Clerk y District Clerk.'
  },
  {
    id: 'records',
    category: 'civil',
    name: 'Official Public Records Search',
    agency: 'Bexar County Clerk',
    url: 'https://bexar.tx.publicsearch.us/',
    status: 'Fuente oficial',
    note: 'Matrimonios, documentos públicos, land records y otros registros.'
  },
  {
    id: 'property',
    category: 'property',
    name: 'BCAD Property Search',
    agency: 'Bexar Central Appraisal District',
    url: 'https://bexar.trueautomation.com/clientdb/propertysearch.aspx?cid=110',
    status: 'Fuente oficial',
    note: 'Propiedades públicas registradas a nombre de propietarios.'
  }
];

function ResultCard({ record }) {
  return (
    <article className="record">
      <div className="recordName">{record.title || record.name || 'Registro público'}</div>

      <div className="recordGrid">
        {record.fields?.map((field, index) => (
          <div key={index}>
            <span>{field.label}</span>
            <b>{field.value || '—'}</b>
          </div>
        ))}
      </div>

      {record.sourceUrl && (
        <a
          className="sourceBtn"
          href={record.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Ver registro oficial →
        </a>
      )}
    </article>
  );
}

export default function Page() {
  const [name, setName] = useState('');
  const [county, setCounty] = useState('Bexar');
  const [category, setCategory] = useState('all');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [arrests, setArrests] = useState(null);
  const [otherResults, setOtherResults] = useState([]);

  const filteredSources = useMemo(() => {
    if (category === 'all') return sources;
    return sources.filter((source) => source.category === category);
  }, [category]);

  async function searchArrests(query) {
    try {
      const response = await fetch(
        `/api/recent-arrests?name=${encodeURIComponent(query)}`,
        { cache: 'no-store' }
      );

      return await response.json();
    } catch {
      return {
        ok: false,
        unavailable: true,
        error: 'No fue posible consultar Central Magistrate.',
        sourceUrl: 'https://centralmagistrate.bexar.org/'
      };
    }
  }

  async function searchOtherSources(query) {
    try {
      const response = await fetch(
        `/api/public-records?name=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (!data?.ok || !Array.isArray(data.records)) {
        return [];
      }

      return data.records;
    } catch {
      return [];
    }
  }

  async function runSearch(event) {
    event.preventDefault();

    const query = name.trim();
    if (!query) return;

    setSearched(true);
    setLoading(true);
    setArrests(null);
    setOtherResults([]);

    try {
      const jobs = [];

      if (category === 'all' || category === 'arrest') {
        jobs.push(
          searchArrests(query).then((data) => {
            setArrests(data);
          })
        );
      }

      if (category !== 'arrest') {
        jobs.push(
          searchOtherSources(query).then((records) => {
            setOtherResults(records);
          })
        );
      }

      await Promise.all(jobs);
    } finally {
      setLoading(false);
    }
  }

  const totalAutomatic =
    (arrests?.ok ? arrests.count || 0 : 0) + otherResults.length;

  return (
    <main className="wrap">
      <section className="hero">
        <div className="eyebrow">TEXAS · BEXAR COUNTY</div>

        <h1>Public Records Search</h1>

        <p>
          Busca información pública oficial sobre una persona desde un solo
          lugar, sin API de pago.
        </p>
      </section>

      <section className="panel searchPanel">
        <form onSubmit={runSearch}>
          <div className="grid">
            <label>
              Nombre completo
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Juan Carlos Pérez"
                autoComplete="off"
                required
              />
            </label>

            <label>
              Condado
              <input
                value={county}
                onChange={(event) => setCounty(event.target.value)}
                placeholder="Bexar"
              />
            </label>

            <label>
              Estado
              <select value="TX" disabled>
                <option value="TX">Texas</option>
              </select>
            </label>

            <label>
              Buscar en
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="btn" disabled={loading}>
            {loading
              ? 'Buscando en fuentes oficiales…'
              : 'Buscar registros públicos'}
          </button>
        </form>

        <div className="chips">
          <span className="chip green">Sin API de pago</span>
          <span className="chip">Fuentes oficiales</span>
          <span className="chip">Resultados dentro del sitio</span>
          <span className="chip">No evade CAPTCHA</span>
        </div>
      </section>

      {searched && (
        <>
          <section className="summary">
            <div>
              <span>Persona buscada</span>
              <strong>{name}</strong>
            </div>

            <div>
              <span>Jurisdicción</span>
              <strong>{county || 'Bexar'}, Texas</strong>
            </div>

            <div>
              <span>Coincidencias automáticas</span>
              <strong>{loading ? 'Buscando…' : totalAutomatic}</strong>
            </div>
          </section>

          {loading && (
            <section className="panel">
              <div className="loadingBox">
                Consultando fuentes públicas oficiales…
              </div>
            </section>
          )}

          {!loading &&
            (category === 'all' || category === 'arrest') &&
            arrests && (
              <section className="panel">
                <div className="sectionHead">
                  <div>
                    <div className="eyebrow dark">ARRESTOS</div>
                    <h2>Arrestos recientes</h2>
                  </div>

                  <span className="statusBadge">
                    Central Magistrate · últimas 24 h
                  </span>
                </div>

                {arrests.ok && arrests.count === 0 && (
                  <div className="goodBox">
                    <strong>
                      No encontré coincidencias con ese nombre en el registro
                      consultado.
                    </strong>

                    <p>
                      Esta búsqueda solo cubre el periodo disponible en Central
                      Magistrate. No significa que la persona nunca haya sido
                      arrestada.
                    </p>
                  </div>
                )}

                {arrests.ok && arrests.count > 0 && (
                  <div className="matchArea">
                    <div className="warningTitle">
                      Posibles coincidencias: {arrests.count}
                    </div>

                    {arrests.records.map((record, index) => (
                      <article
                        className="record"
                        key={`${record.bookingNumber}-${index}`}
                      >
                        <div className="recordName">{record.name}</div>

                        <div className="recordGrid">
                          <div>
                            <span>Fecha de nacimiento / edad</span>
                            <b>{record.dobOrAge || '—'}</b>
                          </div>

                          <div>
                            <span>SID</span>
                            <b>{record.sid || '—'}</b>
                          </div>

                          <div>
                            <span>Booking #</span>
                            <b>{record.bookingNumber || '—'}</b>
                          </div>
                        </div>

                        <a
                          className="sourceBtn"
                          href={arrests.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver fuente oficial →
                        </a>
                      </article>
                    ))}

                    <div className="warn">
                      <b>Importante:</b> un arresto no equivale a una condena.
                      Verifica que el registro corresponda a la misma persona y
                      revisa el resultado final del caso.
                    </div>
                  </div>
                )}

                {!arrests.ok && (
                  <div className="warn">
                    <b>Consulta automática no disponible.</b>{' '}
                    {arrests.error}
                  </div>
                )}
              </section>
            )}

          {!loading && category !== 'arrest' && (
            <section className="panel">
              <div className="sectionHead">
                <div>
                  <div className="eyebrow dark">REGISTROS PÚBLICOS</div>
                  <h2>Resultados encontrados</h2>
                </div>

                <span className="statusBadge">
                  Propiedades · Matrimonio · Tribunales
                </span>
              </div>

              {otherResults.length > 0 ? (
                <div className="matchArea">
                  <div className="warningTitle">
                    Posibles coincidencias: {otherResults.length}
                  </div>

                  {otherResults.map((record, index) => (
                    <ResultCard
                      key={`${record.type || 'record'}-${index}`}
                      record={record}
                    />
                  ))}

                  <div className="warn">
                    <b>Verificación de identidad:</b> personas diferentes pueden
                    tener el mismo nombre. Compara fechas, edad, condado,
                    dirección y otros datos públicos antes de determinar que se
                    trata de la misma persona.
                  </div>
                </div>
              ) : (
                <div className="goodBox">
                  <strong>
                    No se obtuvieron registros automáticos adicionales.
                  </strong>

                  <p>
                    Algunas fuentes oficiales requieren una búsqueda interactiva
                    o bloquean consultas automáticas. Esas fuentes aparecen abajo
                    para verificación.
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="panel">
            <div className="sectionHead">
              <div>
                <div className="eyebrow dark">FUENTES OFICIALES</div>
                <h2>Verificación adicional</h2>
              </div>
            </div>

            <div className="results">
              {filteredSources.map((source) => (
                <article className="card" key={source.id}>
                  <div className="cardTop">
                    <span className="typeTag">
                      {categories.find(
                        (item) => item.id === source.category
                      )?.label || source.category}
                    </span>

                    <span className="sourceStatus">{source.status}</span>
                  </div>

                  <h3>{source.name}</h3>

                  <p className="agency">{source.agency}</p>

                  <p>{source.note}</p>

                  <a
                    className="sourceBtn"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir fuente oficial →
                  </a>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <footer>
        Solo utiliza registros públicos. No recopila SSN, contraseñas, cuentas
        financieras, ubicación en tiempo real ni información privada.
      </footer>
    </main>
  );
}
