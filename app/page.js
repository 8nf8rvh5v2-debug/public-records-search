'use client';
import { useMemo, useState } from 'react';

const categories = [
  { id:'all', label:'Todo' },
  { id:'property', label:'Propiedades' },
  { id:'civil', label:'Matrimonio / documentos' },
  { id:'court', label:'Tribunales' },
  { id:'arrest', label:'Arrestos recientes' }
];

const sources = [
  {
    id:'magistrate', category:'arrest', name:'Central Magistrate Search', agency:'Bexar County',
    url:'https://centralmagistrate.bexar.org/', status:'Automático',
    note:'Busca automáticamente coincidencias en arrestos procesados durante las últimas 24 horas.'
  },
  {
    id:'justice', category:'court', name:'Justice Information Portal', agency:'Bexar County',
    url:'https://portal-txbexar.tylertech.cloud/Portal/', status:'Fuente oficial',
    note:'Casos públicos de County Clerk y District Clerk. Algunos tipos de casos están restringidos.'
  },
  {
    id:'records', category:'civil', name:'Official Public Records Search', agency:'Bexar County Clerk',
    url:'https://bexar.tx.publicsearch.us/', status:'Fuente oficial',
    note:'Land Records, Marriage, Assumed Names, Foreclosures y otros documentos públicos.'
  },
  {
    id:'property', category:'property', name:'BCAD Property Search', agency:'Bexar Central Appraisal District',
    url:'https://bexar.trueautomation.com/clientdb/propertysearch.aspx?cid=110', status:'Fuente oficial',
    note:'Búsqueda pública de propiedades por nombre del propietario, dirección o Property ID.'
  },
  {
    id:'sheriff', category:'arrest', name:'Bexar County Sheriff', agency:'BCSO',
    url:'https://www.bexar.org/600/Sheriffs-Office', status:'Fuente oficial',
    note:'Recursos de cárcel, SID, actividad del jail y enlaces a registros judiciales.'
  },
  {
    id:'recordsHub', category:'court', name:'Justice Searches & Records', agency:'Bexar County',
    url:'https://www.bexar.org/3021/Searches-Records', status:'Directorio oficial',
    note:'Acceso oficial a dockets, misdemeanor records, arrest search y otras búsquedas judiciales.'
  }
];

export default function Page(){
  const [name,setName] = useState('');
  const [county,setCounty] = useState('Bexar');
  const [state] = useState('TX');
  const [category,setCategory] = useState('all');
  const [searched,setSearched] = useState(false);
  const [loading,setLoading] = useState(false);
  const [recent,setRecent] = useState(null);

  const filteredSources = useMemo(() => category === 'all' ? sources : sources.filter(s => s.category === category), [category]);

  async function runSearch(e){
    e.preventDefault();
    const q = name.trim();
    if(!q) return;
    setSearched(true);
    setRecent(null);

    if(category === 'all' || category === 'arrest'){
      setLoading(true);
      try{
        const res = await fetch(`/api/recent-arrests?name=${encodeURIComponent(q)}`, { cache:'no-store' });
        const data = await res.json();
        setRecent(data);
      }catch{
        setRecent({ok:false, unavailable:true, sourceUrl:'https://centralmagistrate.bexar.org/', error:'No fue posible consultar la fuente automáticamente.'});
      }finally{
        setLoading(false);
      }
    }
  }

  return <main className="wrap">
    <section className="hero">
      <div className="eyebrow">TEXAS · BEXAR COUNTY</div>
      <h1>Public Records Search</h1>
      <p>Busca una persona en múltiples fuentes públicas oficiales desde un solo lugar, sin API de pago.</p>
    </section>

    <section className="panel searchPanel">
      <form onSubmit={runSearch}>
        <div className="grid">
          <label>Nombre completo
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Juan Carlos Pérez" autoComplete="off" required />
          </label>
          <label>Condado
            <input value={county} onChange={e=>setCounty(e.target.value)} placeholder="Bexar" />
          </label>
          <label>Estado
            <select value={state} disabled><option value="TX">Texas</option></select>
          </label>
          <label>Buscar en
            <select value={category} onChange={e=>setCategory(e.target.value)}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>
        <button className="btn" disabled={loading}>{loading ? 'Consultando fuentes oficiales…' : 'Buscar registros públicos'}</button>
      </form>

      <div className="chips">
        <span className="chip green">Sin API de pago</span>
        <span className="chip">Fuentes oficiales</span>
        <span className="chip">Consulta automática donde es posible</span>
        <span className="chip">No evade CAPTCHA</span>
      </div>
    </section>

    {searched && <>
      <section className="summary">
        <div><span>Búsqueda</span><strong>{name}</strong></div>
        <div><span>Jurisdicción</span><strong>{county || 'Bexar'}, Texas</strong></div>
        <div><span>Fuentes disponibles</span><strong>{filteredSources.length}</strong></div>
      </section>

      {(category === 'all' || category === 'arrest') && <section className="panel">
        <div className="sectionHead">
          <div><div className="eyebrow dark">CONSULTA AUTOMÁTICA</div><h2>Arrestos recientes</h2></div>
          <span className="statusBadge">Central Magistrate · últimas 24 h</span>
        </div>

        {loading && <div className="loadingBox">Consultando el registro público oficial…</div>}

        {!loading && recent?.ok && recent.count === 0 && <div className="goodBox">
          <strong>No encontré coincidencias con ese nombre en el listado consultado.</strong>
          <p>Esto solo cubre personas procesadas por Central Magistrate durante las últimas 24 horas; no significa que la persona nunca haya sido arrestada o tenga antecedentes.</p>
        </div>}

        {!loading && recent?.ok && recent.count > 0 && <div className="matchArea">
          <div className="warningTitle">Posibles coincidencias: {recent.count}</div>
          {recent.records.map((r,i)=><article className="record" key={`${r.bookingNumber}-${i}`}>
            <div className="recordName">{r.name}</div>
            <div className="recordGrid">
              <div><span>Dato publicado</span><b>{r.dobOrAge || '—'}</b></div>
              <div><span>SID</span><b>{r.sid || '—'}</b></div>
              <div><span>Booking #</span><b>{r.bookingNumber || '—'}</b></div>
            </div>
          </article>)}
          <div className="warn"><b>Importante:</b> un arresto no equivale a una condena. Verifica identidad, cargos y resultado del caso en el expediente judicial oficial.</div>
        </div>}

        {!loading && recent && !recent.ok && <div className="warn">
          <b>Consulta automática no disponible.</b> {recent.error} <a href={recent.sourceUrl} target="_blank" rel="noreferrer">Abrir Central Magistrate →</a>
        </div>}
      </section>}

      <section className="panel">
        <div className="sectionHead"><div><div className="eyebrow dark">MÁS FUENTES</div><h2>Registros oficiales relacionados</h2></div></div>
        <div className="results">
          {filteredSources.map(s => <article className="card" key={s.id}>
            <div className="cardTop"><span className="typeTag">{categories.find(c=>c.id===s.category)?.label || s.category}</span><span className="sourceStatus">{s.status}</span></div>
            <h3>{s.name}</h3>
            <p className="agency">{s.agency}</p>
            <p>{s.note}</p>
            <a className="sourceBtn" href={s.url} target="_blank" rel="noreferrer">Abrir búsqueda oficial →</a>
          </article>)}
        </div>
        <div className="warn"><b>Verificación de identidad:</b> una coincidencia por nombre no demuestra que el registro pertenezca a la misma persona. Compara fechas, edad, condado y otros datos públicos antes de sacar conclusiones.</div>
      </section>
    </>}

    <footer>Solo registros públicos. No recopila SSN, cuentas financieras, contraseñas, ubicación en tiempo real ni información privada.</footer>
  </main>
}
