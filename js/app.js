// app.js - single entry for feed, incidents, submit and map
// load incidents.json, render feed, incidents, map, submit

let INCIDENTS = [];            // in-memory store
let isAdmin = false;
const DATA_PATH = 'data/incidents.json';

// helpers
const byId = id => document.getElementById(id);
const formatTime = t => t || new Date().toLocaleString();

// fetch initial data
async function loadData(){
  try{
    const res = await fetch(DATA_PATH);
    INCIDENTS = await res.json();
  }catch(e){
    console.warn('Could not load incidents.json — starting empty', e);
    INCIDENTS = [];
  }
  renderAll();
}

// render everything
function renderAll(){
  renderHighFeed();
  renderRandomImages();
  renderFeed(INCIDENTS);
  renderIncidents(INCIDENTS);
  initMap(INCIDENTS);
  updateSummary();
}

// ---------- NAVIGATION ----------
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));
    btn.classList.add('active');
    const section = btn.dataset.section;
    showSection(section);
  });
});
function showSection(name){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active-section'));
  const el = document.getElementById(name);
  if(el) el.classList.add('active-section');
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-section]').forEach(el=>{
  el.addEventListener('click', e=>{
    const s = e.currentTarget.dataset.section;
    if(s) showSection(s);
  });
});

// admin toggle
const adminToggle = byId('adminToggle');
adminToggle.addEventListener('click', ()=>{
  isAdmin = !isAdmin;
  adminToggle.textContent = isAdmin ? 'Exit Admin' : 'Enter Admin';
  document.querySelectorAll('.admin-only').forEach(el=>el.style.display = isAdmin ? 'inline-block' : 'none');
});

// ---------- HIGH FEED (red alerts scroll) ----------
function renderHighFeed(){
  const container = byId('highFeed');
  container.innerHTML = '';
  const highs = INCIDENTS.filter(i => i.severity === 'alltime' || i.severity === 'critical').slice(0,10);
  highs.forEach(i=>{
    const card = document.createElement('div');
    card.className = 'high-card';
    card.innerHTML = `
      <div class="prediction">${Math.floor(Math.random()*30)+70}%</div>
      <img src="${i.image || randomImage()}" alt="">
      <h4 style="margin:.5rem 0 .2rem">${i.title}</h4>
      <small style="color:#667085">${i.time}</small>
      <p style="margin-top:.5rem;color:#0f172a">${i.description}</p>
    `;
    container.appendChild(card);
  });
}

// ---------- random images (unsplash-ish) ----------
function randomImage(size='780x520'){
  // quick set of royalty-free images from unsplash source (no API key)
  const themes = ['ocean','sea','oil spill','coast','boat','storm'];
  const q = encodeURIComponent(themes[Math.floor(Math.random()*themes.length)]);
  return `https://source.unsplash.com/random/${size}/?${q}`;
}
function renderRandomImages(){
  const container = byId('randomImages');
  container.innerHTML = '';
  for(let i=0;i<6;i++){
    const img = document.createElement('img');
    img.src = randomImage('640x420');
    img.alt = 'ocean image';
    container.appendChild(img);
  }
}

// ---------- FEED (social media style, static logos, prediction rate) ----------
function renderFeed(data){
  const container = byId('feedContainer');
  container.innerHTML = '';
  const logos = [
    {name:'CoastWatch',url:'https://img.icons8.com/?size=512&id=102523&format=png'},
    {name:'Indian Coast Guard',url:'https://img.icons8.com/fluency/48/000000/ship.png'},
    {name:'Maritime News',url:'https://img.icons8.com/fluency/48/000000/news.png'},
    {name:'CitizenReport',url:'https://img.icons8.com/fluency/48/000000/user-male-circle.png'},
    {name:'OceanWatch',url:'https://img.icons8.com/fluency/48/000000/waves.png'}
  ];
  data.forEach((item, idx) => {
    const src = logos[idx % logos.length];
    const card = document.createElement('div');
    card.className = 'feed-card';
    const prediction = Math.floor(Math.random()*40)+60; // 60-99%
    const image = item.image || randomImage('800x600');
    card.innerHTML = `
      <div class="meta">
        <img class="avatar" src="${src.url}" alt="${src.name}">
        <div>
          <div class="source">${src.name}</div>
          <div class="time">${item.time || 'Just now'}</div>
        </div>
      </div>
      <p style="margin:.4rem 0;font-weight:600">${item.title}</p>
      <p style="color:#334155">${item.description}</p>
      <div style="margin-top:.6rem">
        <img src="${image}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:8px">
      </div>
      <div style="margin-top:.6rem;display:flex;justify-content:space-between;align-items:center">
        <div class="badge ${item.severity}">${item.severity.toUpperCase()}</div>
        <div style="color:#64748b;font-weight:700">${prediction}% predicted impact</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------- INCIDENTS (verify / flag / delete) ----------
function renderIncidents(data){
  const container = byId('incidentsContainer');
  container.innerHTML = '';
  data.forEach((item, idx)=>{
    const card = document.createElement('div');
    card.className = 'report-card ' + severityBorderClass(item.severity);
    card.innerHTML = `
      <div class="title">${item.title}</div>
      <div style="color:#475569;font-size:.95rem">${item.description}</div>
      <div style="margin:.6rem 0;color:#64748b">Location: ${item.location || (item.lat && item.lng ? `${item.lat}, ${item.lng}` : 'Unknown')}</div>
      <div class="controls">
        <button class="btn verify" data-idx="${idx}">👍 Verify <span class="count">(${item.verified||0})</span></button>
        <button class="btn flag" data-idx="${idx}">🚩 Flag <span class="count">(${item.flagged||0})</span></button>
        <button class="btn admin-only" data-idx="${idx}" style="display:none">🗑 Delete</button>
      </div>
    `;
    container.appendChild(card);
  });

  // listeners
  container.querySelectorAll('.verify').forEach(b=>{
    b.addEventListener('click', () => {
      const idx = b.dataset.idx;
      INCIDENTS[idx].verified = (INCIDENTS[idx].verified||0) + 1;
      renderIncidents(INCIDENTS);
      renderHighFeed();
    });
  });
  container.querySelectorAll('.flag').forEach(b=>{
    b.addEventListener('click', () => {
      const idx = b.dataset.idx;
      INCIDENTS[idx].flagged = (INCIDENTS[idx].flagged||0) + 1;
      renderIncidents(INCIDENTS);
    });
  });
  container.querySelectorAll('.admin-only').forEach(b=>{
    b.addEventListener('click', () => {
      const idx = b.dataset.idx;
      if(!confirm('Delete this incident?')) return;
      INCIDENTS.splice(idx,1);
      renderAll();
    });
  });

  // show admin-only buttons if admin
  document.querySelectorAll('.admin-only').forEach(el=>el.style.display = isAdmin ? 'inline-block' : 'none');
}

// severity -> border class for report-card
function severityBorderClass(sev){
  if(sev==='mild') return 'border-mild';
  if(sev==='average') return 'border-average';
  if(sev==='critical') return 'border-critical';
  if(sev==='alltime') return 'border-alltime';
  return '';
}

// ---------- SUBMIT form handling ----------
const form = document.getElementById('submitForm');
form.addEventListener('submit', e=>{
  e.preventDefault();
  const newItem = {
    title: document.getElementById('sTitle').value || 'Untitled',
    location: document.getElementById('sLoc').value || '',
    lat: parseFloat(document.getElementById('sLat').value) || null,
    lng: parseFloat(document.getElementById('sLng').value) || null,
    severity: document.getElementById('sSeverity').value || 'mild',
    description: document.getElementById('sDesc').value || '',
    image: document.getElementById('sImage').value || randomImage('800x600'),
    time: formatTime(new Date().toLocaleString()),
    verified: 0,
    flagged: 0,
    submitted: true
  };
  INCIDENTS.unshift(newItem);
  renderAll();
  form.reset();
  showSection('incidents');
});

// live preview
['sTitle','sDesc','sSeverity','sImage'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', updatePreview);
});
function updatePreview(){
  const p = byId('livePreview');
  p.innerHTML = '';
  const t = document.getElementById('sTitle').value || 'Preview Title';
  const d = document.getElementById('sDesc').value || 'Short preview description...';
  const s = document.getElementById('sSeverity').value || 'mild';
  const img = document.getElementById('sImage').value || randomImage('600x400');
  p.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.5rem">
      <div style="font-weight:800">${t}</div>
      <div style="color:#475569">${d}</div>
      <img src="${img}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-top:.6rem">
      <div style="margin-top:.4rem"><span class="badge ${s}">${s.toUpperCase()}</span></div>
    </div>
  `;
}

// ---------- MAP (Leaflet) ----------
let map, markersGroup;
function initMap(data){
  // initialize only once
  if(!map){
    map = L.map('mapid').setView([22.0,78.0],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
    markersGroup = L.layerGroup().addTo(map);
  }
  renderMarkers(data);
}
function renderMarkers(data){
  markersGroup.clearLayers();
  const colorMap = { mild:'#16a34a', average:'#f59e0b', critical:'#f97316', alltime:'#dc2626' };
  data.forEach(item=>{
    const lat = item.lat || (item.location ? (Math.random()*4+8) : 20) ; // fallback random around india if missing
    const lng = item.lng || (item.location ? (Math.random()*70+68) : 78);
    const circle = L.circleMarker([lat,lng],{
      radius:10,
      color: colorMap[item.severity] || '#0ea5e9',
      fillOpacity:0.8,
      className: item.severity === 'alltime' ? 'pulse-marker' : ''
    }).addTo(markersGroup);
    circle.bindPopup(`<b>${item.title}</b><br>${item.description}<br><i>${item.time}</i>`);
  });
}

// ---------- FILTERS (feed) ----------
document.querySelectorAll('.filter').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const sev = btn.dataset.sev;
    const filtered = (sev==='all') ? INCIDENTS : INCIDENTS.filter(i=>i.severity===sev);
    renderFeed(filtered);
    renderMarkers(filtered);
  });
});

// summary update
function updateSummary(){
  const s = byId('incSummary');
  if(!s) return;
  const total = INCIDENTS.length;
  const verified = INCIDENTS.filter(i=>i.verified>0).length;
  s.textContent = `${total} incidents · ${verified} verified`;
}

// init
loadData();
