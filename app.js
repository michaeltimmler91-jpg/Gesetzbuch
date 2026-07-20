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

let cache=new Map();
let activePath=null;

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

async function openLaw(law){
  activePath=law.path;
  welcome.classList.add('hidden');
  searchResults.classList.add('hidden');
  documentEl.classList.add('hidden');
  errorEl.classList.add('hidden');
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
  }finally{
    loading.classList.add('hidden');
  }
}

function showHome(){
  activePath=null;
  documentEl.classList.add('hidden');
  searchResults.classList.add('hidden');
  errorEl.classList.add('hidden');
  welcome.classList.remove('hidden');
  searchInput.value='';
  homeSearchInput.value='';
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
  const start=Math.max(0,idx-70);
  const end=Math.min(text.length,idx+110);
  return (start>0?'…':'')+text.slice(start,end)+(end<text.length?'…':'');
}

async function searchAll(term){
  const clean=term.trim();
  searchInput.value=term;
  homeSearchInput.value=term;

  if(clean.length<2){
    searchResults.classList.add('hidden');
    if(activePath){
      const law=laws.find(l=>l.path===activePath);
      if(law) return openLaw(law);
    }
    welcome.classList.remove('hidden');
    return;
  }

  welcome.classList.add('hidden');
  documentEl.classList.add('hidden');
  searchResults.classList.remove('hidden');
  searchResults.innerHTML='<h2>Suche</h2><div class="status">Gesetzbücher werden durchsucht…</div>';

  const matches=[];
  for(const law of laws){
    try{
      const md=await fetchLaw(law);
      const text=plainText(md);
      if(text.toLowerCase().includes(clean.toLowerCase())||law.title.toLowerCase().includes(clean.toLowerCase())||law.short.toLowerCase().includes(clean.toLowerCase())){
        matches.push({law,text});
      }
    }catch(e){/* einzelne fehlende Datei überspringen */}
  }

  searchResults.innerHTML=`<h2>Suchergebnisse für „${escapeHtml(clean)}“</h2>`;
  if(!matches.length){
    searchResults.innerHTML+='<p>Keine Treffer gefunden.</p>';
    return;
  }

  matches.forEach(({law,text})=>{
    const item=document.createElement('div');
    item.className='result-item';
    const button=document.createElement('button');
    button.textContent=`${law.short} – ${law.title}`;
    button.addEventListener('click',()=>openLaw(law));
    const p=document.createElement('p');
    p.textContent=snippet(text,clean);
    item.append(button,p);
    searchResults.appendChild(item);
  });
}

function escapeHtml(value){
  return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

let debounce;
function queueSearch(value){
  clearTimeout(debounce);
  debounce=setTimeout(()=>searchAll(value),220);
}

searchInput.addEventListener('input',()=>queueSearch(searchInput.value));
homeSearchInput.addEventListener('input',()=>queueSearch(homeSearchInput.value));
menuButton.addEventListener('click',()=>sidebar.classList.toggle('open'));
homeButton.addEventListener('click',showHome);
pdButton.addEventListener('click',()=>openLaw(laws[11]));

const initial=decodeURIComponent(location.hash.slice(1));
const initialLaw=laws.find(l=>l.path===initial);
if(initialLaw) openLaw(initialLaw);