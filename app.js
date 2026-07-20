const laws=[
{title:'Constitution of the State of San Andreas',short:'Verfassung',path:'01-constitution/constitution.md'},
{title:'San Andreas Penal Code (SAPC)',short:'Strafgesetzbuch',path:'02-penal-code/penal-code.md'},
{title:'Code of Criminal Procedure (SACCP)',short:'Strafprozessordnung',path:'03-criminal-procedure/criminal-procedure.md'},
{title:'Vehicle & Traffic Code (SAVC)',short:'Verkehrsrecht',path:'04-vehicle-traffic-code/traffic-code.md'},
{title:'Firearms & Weapons Code (SAWC)',short:'Waffenrecht',path:'05-firearms-weapons-code/weapons-code.md'},
{title:'Controlled Substances Act (SACSA)',short:'Betäubungsmittelrecht',path:'06-controlled-substances-act/controlled-substances.md'},
{title:'Business & Licensing Code (SABLC)',short:'Gewerbe & Lizenzen',path:'07-business-licensing-code/business-licensing.md'},
{title:'Civil Code (SACC)',short:'Zivilrecht',path:'08-civil-code/civil-code.md'},
{title:'Judicial Code (SAJC)',short:'Justiz',path:'09-judicial-code/judicial-code.md'},
{title:'Law Enforcement Code (SALEC)',short:'Polizeirecht',path:'10-law-enforcement-code/law-enforcement.md'},
{title:'Government & Administration Code (SAGAC)',short:'Regierung & Verwaltung',path:'11-government-administration/government-administration.md'},
{title:'Sentencing & Fine Schedule',short:'Straf- & Bußgeldkatalog',path:'12-sentencing-fine-schedule/sentencing-fine-schedule.md'}
];

const pdQuick=[
{label:'Strafgesetzbuch',index:1},{label:'Strafprozessordnung',index:2},{label:'Verkehrsrecht',index:3},
{label:'Waffenrecht',index:4},{label:'Drogenrecht',index:5},{label:'Polizeirecht',index:9},{label:'Strafkatalog',index:11}
];

const nav=document.getElementById('lawNav');
const quickGrid=document.getElementById('quickGrid');
const pdQuickGrid=document.getElementById('pdQuickGrid');
const documentEl=document.getElementById('document');
const welcome=document.getElementById('welcome');
const searchInput=document.getElementById('searchInput');
const homeSearchInput=document.getElementById('homeSearchInput');
const searchResults=document.getElementById('searchResults');
const loading=document.getElementById('loading');
const errorEl=document.getElementById('error');
const sidebar=document.getElementById('sidebar');
const menuButton=document.getElementById('menuButton');
const homeButton=document.getElementById('homeButton');
const pdButton=document.getElementById('pdButton');
const pdSearch=document.getElementById('pdSearch');
const pdSearchInput=document.getElementById('pdSearchInput');
const pdSearchResults=document.getElementById('pdSearchResults');
const closePdButton=document.getElementById('closePdButton');

let cache=new Map();
let activePath=null;
let pdIndex=null;

laws.forEach((law,index)=>{
  const btn=document.createElement('button');
  btn.className='law-link';
  btn.innerHTML=`${index+1}. ${law.short}<small>${law.title}</small>`;
  btn.addEventListener('click',()=>openLaw(law));
  nav.appendChild(btn);

  const card=document.createElement('div');
  card.className='quick-card';
  card.innerHTML=`<strong>${index+1}. ${law.short}</strong><span>${law.title}</span>`;
  card.addEventListener('click',()=>openLaw(law));
  quickGrid.appendChild(card);
});

pdQuick.forEach(item=>{
  const btn=document.createElement('button');
  btn.className='pd-quick';
  btn.textContent=item.label;
  btn.addEventListener('click',()=>openLaw(laws[item.index]));
  pdQuickGrid.appendChild(btn);
});

async function fetchLaw(law){
  if(cache.has(law.path)) return cache.get(law.path);
  const response=await fetch(law.path);
  if(!response.ok) throw new Error(`Datei konnte nicht geladen werden: ${law.path}`);
  const text=await response.text();
  cache.set(law.path,text);
  return text;
}

function hideViews(){
  welcome.classList.add('hidden');
  searchResults.classList.add('hidden');
  documentEl.classList.add('hidden');
  pdSearch.classList.add('hidden');
  errorEl.classList.add('hidden');
}

async function openLaw(law){
  activePath=law.path;
  hideViews();
  loading.classList.remove('hidden');
  try{
    const md=await fetchLaw(law);
    documentEl.innerHTML=marked.parse(md);
    documentEl.classList.remove('hidden');
    document.querySelectorAll('.law-link').forEach((el,i)=>el.classList.toggle('active',laws[i].path===law.path));
    window.scrollTo({top:0,behavior:'smooth'});
    if(window.innerWidth<=850) sidebar.classList.remove('open');
    history.replaceState(null,'',`#${encodeURIComponent(law.path)}`);
  }catch(err){
    errorEl.textContent=err.message;
    errorEl.classList.remove('hidden');
  }finally{loading.classList.add('hidden');}
}

function showHome(){
  activePath=null;
  hideViews();
  welcome.classList.remove('hidden');
  searchInput.value=''; homeSearchInput.value='';
  document.querySelectorAll('.law-link').forEach(el=>el.classList.remove('active'));
  history.replaceState(null,'',location.pathname);
  window.scrollTo({top:0,behavior:'smooth'});
  if(window.innerWidth<=850) sidebar.classList.remove('open');
}

function plainText(md){
  return md.replace(/```[\s\S]*?```/g,' ').replace(/[#>*_`|\-]/g,' ').replace(/\s+/g,' ').trim();
}

function snippet(text,term){
  const lower=text.toLowerCase();
  const idx=lower.indexOf(term.toLowerCase());
  if(idx<0) return text.slice(0,180)+'…';
  const start=Math.max(0,idx-70),end=Math.min(text.length,idx+110);
  return (start>0?'…':'')+text.slice(start,end)+(end<text.length?'…':'');
}

async function searchAll(term){
  const clean=term.trim();
  searchInput.value=term; homeSearchInput.value=term;
  if(clean.length<2){
    searchResults.classList.add('hidden');
    if(activePath){const law=laws.find(l=>l.path===activePath); if(law) return openLaw(law);}
    welcome.classList.remove('hidden'); return;
  }
  hideViews();
  searchResults.classList.remove('hidden');
  searchResults.innerHTML='<h2>Suche</h2><div class="status">Gesetzbücher werden durchsucht…</div>';
  const matches=[];
  for(const law of laws){
    try{
      const md=await fetchLaw(law),text=plainText(md);
      if(text.toLowerCase().includes(clean.toLowerCase())||law.title.toLowerCase().includes(clean.toLowerCase())||law.short.toLowerCase().includes(clean.toLowerCase())) matches.push({law,text});
    }catch(e){}
  }
  searchResults.innerHTML=`<h2>Suchergebnisse für „${escapeHtml(clean)}“</h2>`;
  if(!matches.length){searchResults.innerHTML+='<p>Keine Treffer gefunden.</p>';return;}
  matches.forEach(({law,text})=>{
    const item=document.createElement('div'); item.className='result-item';
    const button=document.createElement('button'); button.textContent=`${law.short} – ${law.title}`; button.addEventListener('click',()=>openLaw(law));
    const p=document.createElement('p'); p.textContent=snippet(text,clean); item.append(button,p); searchResults.appendChild(item);
  });
}

function extractSections(md,law){
  const lines=md.split(/\r?\n/),sections=[];
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^##\s+(.+?)\s+§\s*([\d.]+)\s*[–-]\s*(.+)$/);
    if(!m) continue;
    const code=m[1].trim(),paragraph=m[2].trim(),title=m[3].trim();
    let body=[];
    for(let j=i+1;j<lines.length && !/^##\s+/.test(lines[j]);j++){
      const t=lines[j].trim(); if(t && !/^---$/.test(t)) body.push(t);
      if(body.join(' ').length>420) break;
    }
    sections.push({law,code,paragraph,title,body:plainText(body.join(' '))});
  }
  return sections;
}

function parseSentencingRows(md){
  const lines=md.split(/\r?\n/),rows=[];
  let section='Strafkatalog',headers=[];
  for(let i=0;i<lines.length;i++){
    const heading=lines[i].match(/^#\s+(.+)/); if(heading) section=heading[1].replace(/^Title\s+[^–-]+[–-]\s*/,'').trim();
    if(!lines[i].trim().startsWith('|')) continue;
    const cells=lines[i].split('|').slice(1,-1).map(c=>c.trim());
    const next=(lines[i+1]||'').trim();
    if(next.startsWith('|') && /^\|?[\s:|-]+\|?$/.test(next)) {headers=cells;i++;continue;}
    if(!headers.length || cells.length<2) continue;
    const obj={section}; headers.forEach((h,idx)=>obj[h]=cells[idx]||'–');
    const name=obj['Tatbestand']||obj['Klasse']; if(name) rows.push({name,section,data:obj});
  }
  return rows;
}

async function buildPdIndex(){
  if(pdIndex) return pdIndex;
  const sections=[];
  for(const law of laws.slice(1,11)){
    try{sections.push(...extractSections(await fetchLaw(law),law));}catch(e){}
  }
  let penalties=[];
  try{penalties=parseSentencingRows(await fetchLaw(laws[11]));}catch(e){}
  pdIndex={sections,penalties}; return pdIndex;
}

function penaltyCard(row){
  const d=row.data;
  const money=d['Geldstrafe']||'–',jail=d['Haft']||'–',extra=d['Nebenfolgen']||d['Mögliche Nebenfolgen']||'–';
  return `<article class="penalty-card"><div class="penalty-top"><span class="penalty-section">${escapeHtml(row.section)}</span><strong>${escapeHtml(row.name)}</strong></div><div class="penalty-grid"><div><span>Geldstrafe</span><b>${escapeHtml(money)}</b></div><div><span>Haft</span><b>${escapeHtml(jail)}</b></div><div><span>Nebenfolgen</span><b>${escapeHtml(extra)}</b></div></div></article>`;
}

function sectionCard(s){
  return `<article class="law-hit"><button type="button" data-path="${escapeHtml(s.law.path)}"><span>${escapeHtml(s.code)} § ${escapeHtml(s.paragraph)}</span><strong>${escapeHtml(s.title)}</strong></button><p>${escapeHtml(s.body.slice(0,260))}${s.body.length>260?'…':''}</p><small>${escapeHtml(s.law.short)}</small></article>`;
}

async function runPdSearch(term){
  const q=term.trim().toLowerCase();
  if(q.length<2){pdSearchResults.innerHTML='<div class="pd-empty">Gib oben einen Suchbegriff ein.</div>';return;}
  pdSearchResults.innerHTML='<div class="status">Strafkatalog und Gesetze werden durchsucht…</div>';
  const index=await buildPdIndex();
  const penaltyMatches=index.penalties.filter(r=>JSON.stringify(r).toLowerCase().includes(q)).slice(0,20);
  const sectionMatches=index.sections.filter(s=>`${s.code} § ${s.paragraph} ${s.title} ${s.body} ${s.law.short}`.toLowerCase().includes(q)).slice(0,25);
  let html=`<div class="pd-result-summary"><strong>${penaltyMatches.length+sectionMatches.length}</strong> Treffer für „${escapeHtml(term.trim())}“</div>`;
  if(penaltyMatches.length){html+='<h2>Strafen & Maßnahmen</h2><div class="penalty-list">'+penaltyMatches.map(penaltyCard).join('')+'</div>';}
  if(sectionMatches.length){html+='<h2>Passende Paragraphen</h2><div class="law-hit-list">'+sectionMatches.map(sectionCard).join('')+'</div>';}
  if(!penaltyMatches.length&&!sectionMatches.length) html+='<div class="pd-empty">Keine passenden Treffer gefunden.</div>';
  pdSearchResults.innerHTML=html;
  pdSearchResults.querySelectorAll('[data-path]').forEach(btn=>btn.addEventListener('click',()=>{const law=laws.find(l=>l.path===btn.dataset.path);if(law)openLaw(law);}));
}

async function showPdSearch(){
  activePath=null; hideViews(); pdSearch.classList.remove('hidden');
  document.querySelectorAll('.law-link').forEach(el=>el.classList.remove('active'));
  history.replaceState(null,'',`${location.pathname}#pd-search`);
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(()=>pdSearchInput.focus(),100);
  await buildPdIndex();
}

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

let debounce,debouncePd;
function queueSearch(value){clearTimeout(debounce);debounce=setTimeout(()=>searchAll(value),220);}
searchInput.addEventListener('input',()=>queueSearch(searchInput.value));
homeSearchInput.addEventListener('input',()=>queueSearch(homeSearchInput.value));
pdSearchInput.addEventListener('input',()=>{clearTimeout(debouncePd);debouncePd=setTimeout(()=>runPdSearch(pdSearchInput.value),180);});
menuButton.addEventListener('click',()=>sidebar.classList.toggle('open'));
homeButton.addEventListener('click',showHome);
pdButton.addEventListener('click',showPdSearch);
closePdButton.addEventListener('click',showHome);

const initial=decodeURIComponent(location.hash.slice(1));
if(initial==='pd-search') showPdSearch(); else {const initialLaw=laws.find(l=>l.path===initial);if(initialLaw)openLaw(initialLaw);}
