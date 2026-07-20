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
  {label:'Strafgesetzbuch',index:1},
  {label:'Strafprozessordnung',index:2},
  {label:'Verkehrsrecht',index:3},
  {label:'Waffenrecht',index:4},
  {label:'Drogenrecht',index:5},
  {label:'Polizeirecht',index:9},
  {label:'Strafkatalog',index:11}
];

const nav=document.getElementById('lawNav');
const pdQuickGrid=document.getElementById('pdQuickGrid');
const documentEl=document.getElementById('document');
const pdSearch=document.getElementById('pdSearch');
const pdSearchInput=document.getElementById('pdSearchInput');
const pdSearchResults=document.getElementById('pdSearchResults');
const loading=document.getElementById('loading');
const errorEl=document.getElementById('error');
const sidebar=document.getElementById('sidebar');
const menuButton=document.getElementById('menuButton');
const homeButton=document.getElementById('homeButton');

const cache=new Map();
let pdIndex=null;

laws.forEach((law,index)=>{
  const btn=document.createElement('button');
  btn.className='law-link';
  btn.innerHTML=`${index+1}. ${law.short}<small>${law.title}</small>`;
  btn.addEventListener('click',()=>openLaw(law));
  nav.appendChild(btn);
});

pdQuick.forEach(item=>{
  const btn=document.createElement('button');
  btn.className='law-link';
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
  pdSearch.classList.add('hidden');
  documentEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

function setMenuOpen(open){
  sidebar.classList.toggle('open',open);
  menuButton.setAttribute('aria-expanded',String(open));
}

function closeMobileMenu(){
  if(window.innerWidth<=850) setMenuOpen(false);
}

function updateRoute(hash){
  const target=`${location.pathname}${location.search}${hash||''}`;
  const current=`${location.pathname}${location.search}${location.hash}`;
  if(target!==current) history.pushState(null,'',target);
}

async function openLaw(law,updateHistory=true){
  hideViews();
  loading.classList.remove('hidden');
  try{
    const md=await fetchLaw(law);
    if(!window.marked||typeof window.marked.parse!=='function') throw new Error('Die Dokumentdarstellung konnte nicht geladen werden.');
    documentEl.innerHTML=window.marked.parse(md);
    documentEl.classList.remove('hidden');
    document.querySelectorAll('#lawNav .law-link').forEach((el,i)=>el.classList.toggle('active',laws[i].path===law.path));
    window.scrollTo({top:0,behavior:'smooth'});
    closeMobileMenu();
    if(updateHistory) updateRoute(`#${encodeURIComponent(law.path)}`);
  }catch(err){
    errorEl.textContent=err.message;
    errorEl.classList.remove('hidden');
  }finally{
    loading.classList.add('hidden');
  }
}

async function showPdSearch(updateHistory=true){
  hideViews();
  pdSearch.classList.remove('hidden');
  document.querySelectorAll('#lawNav .law-link').forEach(el=>el.classList.remove('active'));
  if(updateHistory) updateRoute('');
  window.scrollTo({top:0,behavior:'smooth'});
  closeMobileMenu();
  setTimeout(()=>pdSearchInput.focus(),100);
  await buildPdIndex();
}

function plainText(md){
  return md.replace(/```[\s\S]*?```/g,' ').replace(/[#>*_`|\-]/g,' ').replace(/\s+/g,' ').trim();
}

function extractSections(md,law){
  const lines=md.split(/\r?\n/),sections=[];
  for(let i=0;i<lines.length;i++){
    const match=lines[i].match(/^##\s+(.+?)\s+§\s*([\d.]+)\s*[–-]\s*(.+)$/);
    if(!match) continue;
    const code=match[1].trim();
    const paragraph=match[2].trim();
    const title=match[3].trim();
    const body=[];
    for(let j=i+1;j<lines.length&&!/^##\s+/.test(lines[j]);j++){
      const text=lines[j].trim();
      if(text&&!/^---$/.test(text)) body.push(text);
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
    const heading=lines[i].match(/^#\s+(.+)/);
    if(heading) section=heading[1].replace(/^Title\s+[^–-]+[–-]\s*/,'').trim();
    if(!lines[i].trim().startsWith('|')) continue;

    const cells=lines[i].split('|').slice(1,-1).map(cell=>cell.trim());
    const next=(lines[i+1]||'').trim();
    if(next.startsWith('|')&&/^\|?[\s:|-]+\|?$/.test(next)){
      headers=cells;
      i++;
      continue;
    }
    if(!headers.length||cells.length<2) continue;

    const data={section};
    headers.forEach((header,index)=>data[header]=cells[index]||'–');
    const name=data['Tatbestand']||data['Klasse'];
    if(name) rows.push({name,section,data});
  }
  return rows;
}

async function buildPdIndex(){
  if(pdIndex) return pdIndex;

  const sectionDocs=await Promise.all(laws.slice(1,11).map(async law=>{
    try{return extractSections(await fetchLaw(law),law);}catch(e){return [];}
  }));
  const sections=sectionDocs.flat();

  let penalties=[];
  try{
    penalties=parseSentencingRows(await fetchLaw(laws[11]));
  }catch(e){}

  pdIndex={sections,penalties};
  return pdIndex;
}

function penaltyCard(row){
  const data=row.data;
  const money=data['Geldstrafe']||'–';
  const jail=data['Haft']||'–';
  const extra=data['Nebenfolgen']||data['Mögliche Nebenfolgen']||'–';
  return `<article class="penalty-card"><div class="penalty-top"><span class="penalty-section">${escapeHtml(row.section)}</span><strong>${escapeHtml(row.name)}</strong></div><div class="penalty-grid"><div><span>Geldstrafe</span><b>${escapeHtml(money)}</b></div><div><span>Haft</span><b>${escapeHtml(jail)}</b></div><div><span>Nebenfolgen</span><b>${escapeHtml(extra)}</b></div></div></article>`;
}

function sectionCard(section){
  return `<article class="law-hit"><button type="button" data-path="${escapeHtml(section.law.path)}"><span>${escapeHtml(section.code)} § ${escapeHtml(section.paragraph)}</span><strong>${escapeHtml(section.title)}</strong></button><p>${escapeHtml(section.body.slice(0,260))}${section.body.length>260?'…':''}</p><small>${escapeHtml(section.law.short)}</small></article>`;
}

async function runPdSearch(term){
  const query=term.trim().toLowerCase();
  if(query.length<2){
    pdSearchResults.innerHTML='<div class="pd-empty">Gib oben einen Suchbegriff ein.</div>';
    return;
  }

  pdSearchResults.innerHTML='<div class="status">Strafkatalog und Gesetze werden durchsucht…</div>';
  const index=await buildPdIndex();
  const penaltyMatches=index.penalties.filter(row=>JSON.stringify(row).toLowerCase().includes(query)).slice(0,20);
  const sectionMatches=index.sections.filter(section=>`${section.code} § ${section.paragraph} ${section.title} ${section.body} ${section.law.short}`.toLowerCase().includes(query)).slice(0,25);

  let html=`<div class="pd-result-summary"><strong>${penaltyMatches.length+sectionMatches.length}</strong> Treffer für „${escapeHtml(term.trim())}“</div>`;
  if(penaltyMatches.length) html+='<h2>Strafen & Maßnahmen</h2><div class="penalty-list">'+penaltyMatches.map(penaltyCard).join('')+'</div>';
  if(sectionMatches.length) html+='<h2>Passende Paragraphen</h2><div class="law-hit-list">'+sectionMatches.map(sectionCard).join('')+'</div>';
  if(!penaltyMatches.length&&!sectionMatches.length) html+='<div class="pd-empty">Keine passenden Treffer gefunden.</div>';

  pdSearchResults.innerHTML=html;
  pdSearchResults.querySelectorAll('[data-path]').forEach(btn=>btn.addEventListener('click',()=>{
    const law=laws.find(item=>item.path===btn.dataset.path);
    if(law) openLaw(law);
  }));
}

function routeFromLocation(){
  const initial=decodeURIComponent(location.hash.slice(1));
  const initialLaw=laws.find(law=>law.path===initial);
  if(initialLaw){
    openLaw(initialLaw,false);
    return;
  }
  showPdSearch(false);
}

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

let debounce;
pdSearchInput.addEventListener('input',()=>{
  clearTimeout(debounce);
  debounce=setTimeout(()=>runPdSearch(pdSearchInput.value),180);
});
menuButton.addEventListener('click',()=>setMenuOpen(!sidebar.classList.contains('open')));
homeButton.addEventListener('click',()=>showPdSearch());
window.addEventListener('popstate',routeFromLocation);
window.addEventListener('resize',()=>{if(window.innerWidth>850)setMenuOpen(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('open'))setMenuOpen(false);});

routeFromLocation();