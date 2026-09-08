const CONFIG_KEY="filament_github_config_v1";
const DEFAULT_TYPES=["PLA","PETG","ASA","ABS"];
const DATA_PATH="filamente.json";
const API_VERSION="2022-11-28";

let config=loadConfig(),filaments=[],filamentTypes=[...DEFAULT_TYPES],fileSha=null,sortState={key:"manufacturer",direction:"asc"},connected=false,saving=false;
let currentRating=0;

const el=id=>document.getElementById(id);
const tableBody=el("filamentTableBody"),dialog=el("filamentDialog"),typesDialog=el("typesDialog"),settingsDialog=el("settingsDialog"),form=el("filamentForm"),emptyState=el("emptyState");

const fields={
  id:el("filamentId"),manufacturer:el("manufacturer"),type:el("type"),designation:el("designation"),
  articleNumber:el("articleNumber"),priceKg:el("priceKg"),colorRgb:el("colorRgb"),colorHex:el("colorHex"),
  printTemp:el("printTemp"),pressureAdvance:el("pressureAdvance"),flowRatio:el("flowRatio"),
  retraction:el("retraction"),volumetricSpeed:el("volumetricSpeed"),rating:el("rating"),supplier:el("supplier"),
  status:el("status"),rolls:el("rolls")
};

function loadConfig(){
  try{return JSON.parse(localStorage.getItem(CONFIG_KEY))||{owner:"",repo:"filament-data",branch:"main",token:""}}catch{return{owner:"",repo:"filament-data",branch:"main",token:""}}
}
function saveConfig(){localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}
function clearConfig(){localStorage.removeItem(CONFIG_KEY);config={owner:"",repo:"filament-data",branch:"main",token:""}}
function isConfigured(){return Boolean(config.owner&&config.repo&&config.branch&&config.token)}
function uniqueSorted(items){return[...new Set(items.map(v=>String(v).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de",{sensitivity:"base"}))}
function normalizeHex(value){if(!value)return"";let h=value.trim().toUpperCase();if(!h.startsWith("#"))h="#"+h;return/^#[0-9A-F]{6}$/.test(h)?h:""}
function rgbToHex(rgb){if(!rgb)return"";const p=rgb.split(",").map(v=>Number(v.trim()));if(p.length!==3||p.some(v=>!Number.isInteger(v)||v<0||v>255))return"";return"#"+p.map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase()}
function hexToRgb(hex){const h=normalizeHex(hex);if(!h)return"";const n=parseInt(h.slice(1),16);return`${(n>>16)&255}, ${(n>>8)&255}, ${n&255}`}
function fmtCurrency(v){return new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF"}).format(Number(v||0))}
function fmtNumber(v){return v===""||v==null?"–":String(v)}
function statusClass(s){return s==="An Lager"?"status-in-stock":s==="Bestellt"?"status-ordered":"status-empty"}

function renderRating(value){
  const rating=Math.max(0,Math.min(5,Number(value||0)));
  if(!rating)return '<span class="table-rating">–</span>';
  let html='<span class="table-rating" aria-label="'+rating+' von 5 Sternen">';
  for(let n=1;n<=5;n++){
    html+='<span class="'+(n<=rating?'filled':'empty')+'">★</span>';
  }
  return html+'</span>';
}

function updateRatingStars(value){
  currentRating=Math.max(0,Math.min(5,Number(value||0)));
  fields.rating.value=String(currentRating);

  document.querySelectorAll(".star-btn").forEach(btn=>{
    btn.classList.toggle("active",Number(btn.dataset.rating)<=currentRating);
  });
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function utf8ToBase64(str){const bytes=new TextEncoder().encode(str);let binary="";for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)}
function base64ToUtf8(b64){const binary=atob(b64.replace(/\n/g,""));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function apiUrl(path=""){return`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${path}`}
function apiHeaders(){return{"Accept":"application/vnd.github+json","Authorization":`Bearer ${config.token}`,"X-GitHub-Api-Version":API_VERSION}}

function setSync(state,text){const b=el("syncBadge");b.className="sync-badge "+state;b.textContent=text}
function setConnected(on) {
    connected = on;

    el("newFilamentBtn").disabled = !on;
    el("manageTypesBtn").disabled = !on;
    el("reloadBtn").disabled = !on;

    const notice = el("connectionNotice");

    // Doppelte Absicherung:
    // 1. Standard-HTML-Attribut "hidden"
    // 2. Direktes CSS, damit der Hinweis in jedem Browser sicher verschwindet.
    notice.hidden = on;
    notice.style.display = on ? "none" : "flex";
}

async function ghFetch(url,options={}){
  const response=await fetch(url,{...options,headers:{...apiHeaders(),...(options.headers||{})}});
  return response;
}

async function testConnection(candidate=config){
  const old=config;config=candidate;
  try{
    const r=await ghFetch(apiUrl());
    if(!r.ok){
      let message=`GitHub antwortet mit ${r.status}`;
      try{const j=await r.json();if(j.message)message+=": "+j.message}catch{}
      throw new Error(message);
    }
    return await r.json();
  }finally{config=old}
}

function normalizePayload(payload){
  const items=Array.isArray(payload)?payload:(Array.isArray(payload?.filaments)?payload.filaments:[]);
  filaments=items.map(item=>({
    id:item.id||crypto.randomUUID(),manufacturer:item.manufacturer||"",type:item.type||"",
    designation:item.designation||item.typeExact||"",articleNumber:item.articleNumber||"",
    priceKg:item.priceKg??"",colorRgb:item.colorRgb||"",colorHex:normalizeHex(item.colorHex)||rgbToHex(item.colorRgb)||"",
    printTemp:item.printTemp||"",pressureAdvance:item.pressureAdvance??"",flowRatio:item.flowRatio??"",
    retraction:item.retraction??"",volumetricSpeed:item.volumetricSpeed??"",rating:Number(item.rating||0),supplier:item.supplier||"",
    status:["Leer","Bestellt","An Lager"].includes(item.status)?item.status:"An Lager",rolls:Number(item.rolls||0)
  }));
  filamentTypes=uniqueSorted([...DEFAULT_TYPES,...(payload?.filamentTypes||[]),...filaments.map(f=>f.type)]);
}

async function loadFromGitHub(){
  if(!isConfigured())return;
  try{
    setSync("syncing","Lade GitHub …");
    const r=await ghFetch(apiUrl(`/contents/${DATA_PATH}?ref=${encodeURIComponent(config.branch)}`));
    if(r.status===404){
      filaments=[];filamentTypes=[...DEFAULT_TYPES];fileSha=null;
      await saveToGitHub("Filamentverwaltung initialisieren");
      setConnected(true);render();return;
    }
    if(!r.ok){
      let msg=`Laden fehlgeschlagen (${r.status})`;try{const j=await r.json();if(j.message)msg+=": "+j.message}catch{}
      throw new Error(msg);
    }
    const data=await r.json();fileSha=data.sha;normalizePayload(JSON.parse(base64ToUtf8(data.content)));
    setConnected(true);render();setSync("online","GitHub aktuell");
    el("lastSync").textContent="Zuletzt geladen: "+new Date().toLocaleString("de-CH");
  }catch(e){
    console.error(e);setConnected(false);setSync("error","Verbindung fehlgeschlagen");
    el("connectionNotice").hidden = false;
    el("connectionNotice").style.display = "flex";
    el("connectionNotice").className = "notice error";
    el("connectionNotice").innerHTML=`<strong>GitHub-Verbindung fehlgeschlagen.</strong><span>${escapeHtml(e.message)}</span>`;
  }
}

async function saveToGitHub(message="Filamentdaten aktualisieren"){
  if(saving)throw new Error("Es läuft bereits ein Speichervorgang.");
  saving=true;
  try{
    setSync("syncing","Speichere …");
    // Vor dem Speichern aktuellen SHA prüfen, um versehentliches Überschreiben fremder Änderungen zu vermeiden.
    let currentSha=fileSha;
    const check=await ghFetch(apiUrl(`/contents/${DATA_PATH}?ref=${encodeURIComponent(config.branch)}`));
    if(check.ok){
      const latest=await check.json();
      if(fileSha&&latest.sha!==fileSha){
        throw new Error("Die Daten wurden inzwischen auf einem anderen Gerät geändert. Bitte zuerst neu laden.");
      }
      currentSha=latest.sha;
    }else if(check.status!==404){
      throw new Error(`Aktueller Datenstand konnte nicht geprüft werden (${check.status}).`);
    }

    const payload={version:4,updatedAt:new Date().toISOString(),filamentTypes,filaments};
    const body={message,content:utf8ToBase64(JSON.stringify(payload,null,2)),branch:config.branch};
    if(currentSha)body.sha=currentSha;

    const r=await ghFetch(apiUrl(`/contents/${DATA_PATH}`),{
      method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
    });
    if(!r.ok){
      let msg=`Speichern fehlgeschlagen (${r.status})`;try{const j=await r.json();if(j.message)msg+=": "+j.message}catch{}
      throw new Error(msg);
    }
    const result=await r.json();fileSha=result.content?.sha||null;
    setSync("online","GitHub aktuell");el("lastSync").textContent="Zuletzt gespeichert: "+new Date().toLocaleString("de-CH");
  }finally{saving=false}
}

function compareValues(a,b,key){
  const numeric=["priceKg","pressureAdvance","flowRatio","retraction","volumetricSpeed","rating","rolls"];
  if(numeric.includes(key)){const av=a[key]===""?Infinity:Number(a[key]),bv=b[key]===""?Infinity:Number(b[key]);return av-bv}
  return String(a[key]??"").localeCompare(String(b[key]??""),"de",{numeric:true,sensitivity:"base"});
}

function render(){
  const search=el("searchInput").value.trim().toLowerCase(),status=el("statusFilter").value,type=el("typeFilter").value;
  const filtered=filaments.filter(i=>{
    const h=[i.manufacturer,i.type,i.designation,i.articleNumber,i.colorRgb,i.colorHex,i.supplier,i.status].join(" ").toLowerCase();
    return(!search||h.includes(search))&&(!status||i.status===status)&&(!type||i.type===type)
  }).sort((a,b)=>{const r=compareValues(a,b,sortState.key);return sortState.direction==="asc"?r:-r});

  tableBody.innerHTML="";
  filtered.forEach(i=>{
    const tr=document.createElement("tr");
    const cells=[
      `<div class="color-chip"><span class="color-swatch" style="background:${normalizeHex(i.colorHex)||"#808080"}"></span><span>${escapeHtml(i.colorHex)||"–"}</span></div>`,
      escapeHtml(i.manufacturer)||"–",escapeHtml(i.type)||"–",escapeHtml(i.designation)||"–",escapeHtml(i.articleNumber)||"–",
      i.priceKg!==""?fmtCurrency(i.priceKg):"–",escapeHtml(i.printTemp)||"–",fmtNumber(i.pressureAdvance),fmtNumber(i.flowRatio),
      i.retraction!==""?`${fmtNumber(i.retraction)} mm`:"–",i.volumetricSpeed!==""?`${fmtNumber(i.volumetricSpeed)} mm³/s`:"–",
      renderRating(i.rating),escapeHtml(i.supplier)||"–",`<span class="status-badge ${statusClass(i.status)}">${escapeHtml(i.status)}</span>`,fmtNumber(i.rolls)
    ];
    cells.forEach(html=>{const td=document.createElement("td");td.innerHTML=html;tr.appendChild(td)});
    const td=document.createElement("td");td.innerHTML=`<div class="row-actions"><button class="edit-btn" data-id="${i.id}">Bearbeiten</button></div>`;tr.appendChild(td);
    tableBody.appendChild(tr);
  });
  emptyState.hidden=filtered.length!==0;
  if(connected&&filaments.length===0)emptyState.innerHTML="<strong>Noch keine Filamente erfasst.</strong><span>Lege dein erstes Filament an.</span>";
  renderStats();renderTypeFilter();renderSortIndicators();
}

function renderStats(){
  const stock=filaments.filter(f=>f.status==="An Lager"),ordered=filaments.filter(f=>f.status==="Bestellt");
  el("statTypes").textContent=filaments.length;el("statRolls").textContent=stock.reduce((s,f)=>s+Number(f.rolls||0),0);
  el("statOrdered").textContent=ordered.reduce((s,f)=>s+Number(f.rolls||0),0);
  el("statValue").textContent=fmtCurrency(stock.reduce((s,f)=>s+Number(f.priceKg||0)*Number(f.rolls||0),0));
}
function renderTypeFilter(){
  const s=el("typeFilter"),cur=s.value,types=uniqueSorted([...filamentTypes,...filaments.map(f=>f.type)]);
  s.innerHTML='<option value="">Alle Arten</option>'+types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  if(types.includes(cur))s.value=cur;
}
function renderTypeSelect(selected=""){
  const types=uniqueSorted([...filamentTypes,selected].filter(Boolean));
  fields.type.innerHTML=types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  if(selected)fields.type.value=selected;
}
function renderSortIndicators(){
  document.querySelectorAll("th[data-sort]").forEach(th=>{th.querySelector(".sort-indicator").textContent=th.dataset.sort===sortState.key?(sortState.direction==="asc"?"▲":"▼"):""});
}
function renderTypesDialog(){
  el("typeList").innerHTML=uniqueSorted(filamentTypes).map(t=>{
    const used=filaments.some(f=>f.type===t);
    return`<div class="type-row"><strong>${escapeHtml(t)}</strong><button type="button" data-type="${escapeHtml(t)}" ${used?"disabled":""}>Löschen</button></div>`
  }).join("");
}

function openNew(){
  form.reset();fields.id.value="";fields.status.value="An Lager";fields.rolls.value="1";el("colorPicker").value="#808080";updateRatingStars(0);renderTypeSelect();
  el("dialogTitle").textContent="Filament erfassen";el("deleteBtn").hidden=true;dialog.showModal();fields.manufacturer.focus();
}
function openEdit(id){
  const i=filaments.find(f=>f.id===id);if(!i)return;
  fields.id.value=i.id;fields.manufacturer.value=i.manufacturer;renderTypeSelect(i.type);fields.designation.value=i.designation;fields.articleNumber.value=i.articleNumber;
  fields.priceKg.value=i.priceKg;fields.colorRgb.value=i.colorRgb;fields.colorHex.value=i.colorHex;fields.printTemp.value=i.printTemp;
  fields.pressureAdvance.value=i.pressureAdvance;fields.flowRatio.value=i.flowRatio;fields.retraction.value=i.retraction;
  fields.volumetricSpeed.value=i.volumetricSpeed;updateRatingStars(i.rating);fields.supplier.value=i.supplier;fields.status.value=i.status;fields.rolls.value=i.rolls;
  el("colorPicker").value=normalizeHex(i.colorHex)||"#808080";el("dialogTitle").textContent="Filament bearbeiten";el("deleteBtn").hidden=false;dialog.showModal();
}
function formObject(){
  let hex=normalizeHex(fields.colorHex.value),rgb=fields.colorRgb.value.trim();if(!hex&&rgb)hex=rgbToHex(rgb);if(!rgb&&hex)rgb=hexToRgb(hex);
  return{id:fields.id.value||crypto.randomUUID(),manufacturer:fields.manufacturer.value.trim(),type:fields.type.value,designation:fields.designation.value.trim(),
    articleNumber:fields.articleNumber.value.trim(),priceKg:fields.priceKg.value===""?"":Number(fields.priceKg.value),colorRgb:rgb,colorHex:hex,
    printTemp:fields.printTemp.value.trim(),pressureAdvance:fields.pressureAdvance.value===""?"":Number(fields.pressureAdvance.value),
    flowRatio:fields.flowRatio.value===""?"":Number(fields.flowRatio.value),retraction:fields.retraction.value===""?"":Number(fields.retraction.value),
    volumetricSpeed:fields.volumetricSpeed.value===""?"":Number(fields.volumetricSpeed.value),rating:currentRating,supplier:fields.supplier.value.trim(),status:fields.status.value,
    rolls:fields.rolls.value===""?0:Number(fields.rolls.value)};
}

function fillSettings(){
  el("ghOwner").value=config.owner||"";el("ghRepo").value=config.repo||"filament-data";el("ghBranch").value=config.branch||"main";el("ghToken").value=config.token||"";
}

el("settingsBtn").addEventListener("click",()=>{fillSettings();settingsDialog.showModal()});
el("closeSettingsBtn").addEventListener("click",()=>settingsDialog.close());
el("testConnectionBtn").addEventListener("click",async()=>{
  const candidate={owner:el("ghOwner").value.trim(),repo:el("ghRepo").value.trim(),branch:el("ghBranch").value.trim()||"main",token:el("ghToken").value.trim()};
  const btn=el("testConnectionBtn");btn.disabled=true;btn.textContent="Teste …";
  try{const info=await testConnection(candidate);alert(`Verbindung erfolgreich.\nRepository: ${info.full_name}\nPrivat: ${info.private?"Ja":"Nein"}`)}
  catch(e){alert("Verbindung fehlgeschlagen:\n"+e.message)}
  finally{btn.disabled=false;btn.textContent="Verbindung testen"}
});
el("settingsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  config={owner:el("ghOwner").value.trim(),repo:el("ghRepo").value.trim(),branch:el("ghBranch").value.trim()||"main",token:el("ghToken").value.trim()};
  saveConfig();settingsDialog.close();await loadFromGitHub();
});
el("forgetConnectionBtn").addEventListener("click",()=>{
  if(!confirm("Gespeicherte GitHub-Verbindung in diesem Browser wirklich löschen?"))return;
  clearConfig();filaments=[];filamentTypes=[...DEFAULT_TYPES];fileSha=null;setConnected(false);setSync("offline","Nicht verbunden");
  el("connectionNotice").hidden = false;
  el("connectionNotice").style.display = "flex";
  el("connectionNotice").className = "notice info";
  el("connectionNotice").innerHTML="<strong>Noch nicht mit GitHub verbunden.</strong><span>Öffne „GitHub-Verbindung“ und hinterlege dein privates Daten-Repository.</span>";
  settingsDialog.close();render();
});

form.addEventListener("submit",async e=>{
  e.preventDefault();const item=formObject();if(!item.manufacturer||!item.type)return;
  const backup=JSON.parse(JSON.stringify(filaments)),idx=filaments.findIndex(f=>f.id===item.id);
  if(idx>=0)filaments[idx]=item;else filaments.push(item);dialog.close();render();
  try{await saveToGitHub(idx>=0?"Filament aktualisieren":"Filament hinzufügen")}
  catch(err){filaments=backup;render();alert(err.message)}
});
el("deleteBtn").addEventListener("click",async()=>{
  const id=fields.id.value,i=filaments.find(f=>f.id===id);if(!i||!confirm(`"${i.manufacturer} ${i.designation||i.type}" wirklich löschen?`))return;
  const backup=JSON.parse(JSON.stringify(filaments));filaments=filaments.filter(f=>f.id!==id);dialog.close();render();
  try{await saveToGitHub("Filament löschen")}catch(err){filaments=backup;render();alert(err.message)}
});
el("newFilamentBtn").addEventListener("click",openNew);el("closeDialogBtn").addEventListener("click",()=>dialog.close());el("cancelBtn").addEventListener("click",()=>dialog.close());
tableBody.addEventListener("click",e=>{const b=e.target.closest(".edit-btn");if(b)openEdit(b.dataset.id)});
document.querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{const k=th.dataset.sort;if(sortState.key===k)sortState.direction=sortState.direction==="asc"?"desc":"asc";else{sortState.key=k;sortState.direction="asc"}render()}));
["searchInput","statusFilter","typeFilter"].forEach(id=>{el(id).addEventListener("input",render);el(id).addEventListener("change",render)});
el("colorPicker").addEventListener("input",e=>{const h=e.target.value.toUpperCase();fields.colorHex.value=h;fields.colorRgb.value=hexToRgb(h)});
fields.colorHex.addEventListener("input",()=>{const h=normalizeHex(fields.colorHex.value);if(h){el("colorPicker").value=h;fields.colorRgb.value=hexToRgb(h)}});
fields.colorRgb.addEventListener("change",()=>{const h=rgbToHex(fields.colorRgb.value);if(h){fields.colorHex.value=h;el("colorPicker").value=h}});
el("manageTypesBtn").addEventListener("click",()=>{renderTypesDialog();typesDialog.showModal()});el("closeTypesBtn").addEventListener("click",()=>typesDialog.close());el("closeTypesBottomBtn").addEventListener("click",()=>typesDialog.close());
el("addTypeBtn").addEventListener("click",async()=>{
  const input=el("newTypeInput"),v=input.value.trim();if(!v)return;if(filamentTypes.some(t=>t.localeCompare(v,"de",{sensitivity:"base"})===0)){alert("Diese Filament-Art existiert bereits.");return}
  const old=[...filamentTypes];filamentTypes=uniqueSorted([...filamentTypes,v]);input.value="";renderTypesDialog();renderTypeFilter();
  try{await saveToGitHub("Filament-Art hinzufügen")}catch(err){filamentTypes=old;renderTypesDialog();renderTypeFilter();alert(err.message)}
});
el("newTypeInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();el("addTypeBtn").click()}});
el("typeList").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-type]");if(!b||b.disabled)return;const old=[...filamentTypes];filamentTypes=filamentTypes.filter(t=>t!==b.dataset.type);renderTypesDialog();renderTypeFilter();
  try{await saveToGitHub("Filament-Art löschen")}catch(err){filamentTypes=old;renderTypesDialog();renderTypeFilter();alert(err.message)}
});

document.querySelectorAll(".star-btn").forEach(btn=>{
  btn.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    updateRatingStars(Number(btn.dataset.rating));
  });
});

el("clearRatingBtn").addEventListener("click",e=>{
  e.preventDefault();
  updateRatingStars(0);
});

el("reloadBtn").addEventListener("click",loadFromGitHub);

render();
if(isConfigured())loadFromGitHub();
