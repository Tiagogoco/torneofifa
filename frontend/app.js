/* =============== NAV: cambiar vistas =============== */
document.querySelectorAll('.subnav-link').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    const view = a.dataset.view;
    document.querySelectorAll('.subnav-link').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');

    document.getElementById('view-partidos').style.display = (view==='partidos')?'block':'none';
    document.getElementById('view-groups').style.display   = (view==='groups')?'block':'none';
    document.getElementById('view-bracket').style.display  = (view==='bracket')?'block':'none';

    if(view === 'bracket'){
      scheduleRedraw();
    }
  });
});

/* =============== DATA DE GRUPOS (en blanco) =============== */
const GROUPS = [
  { name: 'Grupo A', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]},
  { name: 'Grupo B', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]},
  { name: 'Grupo C', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]},
  { name: 'Grupo D', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]},
  { name: 'Grupo E', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]},
  { name: 'Grupo F', teams: [
    { pos:1, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:2, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:3, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 },
    { pos:4, code:'—', flag:'', PJ:0, G:0, E:0, P:0, GF:0, GC:0, DG:0, Pts:0 }
  ]}
];

/* =============== RENDER DE GRUPOS =============== */
const groupsRoot = document.getElementById('groups-root');
function renderGroups(){
  if(!groupsRoot) return;
  groupsRoot.innerHTML = '';
  GROUPS.forEach((g)=>{
    const card = document.createElement('article');
    card.className = 'group-card';

    const head = document.createElement('div');
    head.className = 'group-header';
    head.innerHTML = `<div class="group-rail"></div><div class="group-name">${g.name}</div>`;

    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
          <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    g.teams.forEach(t=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.pos}</td>
        <td><span class="badge"><span class="flag">${t.flag||''}</span><span class="code">${t.code}</span></span></td>
        <td>${t.PJ}</td><td>${t.G}</td><td>${t.E}</td><td>${t.P}</td>
        <td>${t.GF}</td><td>${t.GC}</td>
        <td class="${t.DG>=0?'dg-pos':'dg-neg'}">${t.DG}</td>
        <td><strong>${t.Pts}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    card.appendChild(head);
    card.appendChild(table);
    groupsRoot.appendChild(card);
  });
}
renderGroups();

/* =============== BRACKET DATA (R16 → QF → SF → Final) =============== */
window.BRACKET_DATA = {
  octavos: [
    { id:'R16_1', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_2', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_3', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_4', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_5', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_6', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_7', teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'R16_8', teamA:null, scoreA:null, teamB:null, scoreB:null }
  ],
  cuartos: [
    { id:'QF1', from:['R16_1','R16_2'], teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'QF2', from:['R16_3','R16_4'], teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'QF3', from:['R16_5','R16_6'], teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'QF4', from:['R16_7','R16_8'], teamA:null, scoreA:null, teamB:null, scoreB:null }
  ],
  semifinal: [
    { id:'SF1', from:['QF1','QF2'], teamA:null, scoreA:null, teamB:null, scoreB:null },
    { id:'SF2', from:['QF3','QF4'], teamA:null, scoreA:null, teamB:null, scoreB:null }
  ],
  final: [
    { id:'F1', from:['SF1','SF2'], teamA:null, scoreA:null, teamB:null, scoreB:null }
  ],
  campeon: null
};

/* =============== HELPERS (UI) =============== */
function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; }
function teamRow(data){
  const name  = data?.name || 'Por definirse';
  const flag  = data?.flag || '';
  const score = (data?.score ?? data?.scoreA ?? null);
  const wrap = el('div','team');
  const info = el('div','info');
  const flagEl = el('span','flag', flag ? '' : '');
  if(flag) flagEl.textContent = flag;
  info.appendChild(flagEl);
  info.appendChild(el('span','name', name));
  const right = el('div','score', score != null ? score : '—');
  wrap.appendChild(info); wrap.appendChild(right);
  return wrap;
}
function matchCard(m){
  const card = el('div','match'); card.id = m.id;
  card.appendChild(teamRow({ name: m.teamA?.name, flag: m.teamA?.flag, score: m.scoreA }));
  card.appendChild(teamRow({ name: m.teamB?.name, flag: m.teamB?.flag, score: m.scoreB }));
  return card;
}

/* =============== BRACKET RENDER/PLACEMENT =============== */
function renderBracket(){
  const root = document.getElementById('bracket'); if(!root) return;
  const svg = root.querySelector('.bracket-svg');
  root.querySelectorAll('.bracket-grid').forEach(n=>n.remove());
  const grid = el('div','bracket-grid');

  // Octavos
  const r16 = el('div','round'); r16.id='round-r16';
  r16.appendChild(el('div','round-title','Octavos de final'));
  window.BRACKET_DATA.octavos.forEach(m => r16.appendChild(matchCard(m)));
  grid.appendChild(r16);

  // Cuartos (posicionables entre sus R16)
  const qf = el('div','round quarters'); qf.id='round-qf';
  qf.appendChild(el('div','round-title','Cuartos de final'));
  window.BRACKET_DATA.cuartos.forEach(m => qf.appendChild(matchCard(m)));
  grid.appendChild(qf);

  // Semifinal
  const sf = el('div','round semis'); sf.id='round-sf';
  sf.appendChild(el('div','round-title','Semifinal'));
  window.BRACKET_DATA.semifinal.forEach(m => sf.appendChild(matchCard(m)));
  grid.appendChild(sf);

  // Final
  const fin = el('div','round final'); fin.id='round-final';
  fin.appendChild(el('div','round-title','Final'));
  window.BRACKET_DATA.final.forEach(m => fin.appendChild(matchCard(m)));
  const champ = el('div','champion', window.BRACKET_DATA.campeon ? `🏆 Campeón: ${window.BRACKET_DATA.campeon.name}` : '🏆 Campeón: por definirse');
  fin.appendChild(champ);
  grid.appendChild(fin);

  root.appendChild(grid);
  scheduleRedraw();
}
renderBracket();

/* Coloca QF entre R16; SF entre QF; F entre SF */
function positionRounds(){
  const container = document.getElementById('bracket');
  const roundR16 = document.getElementById('round-r16');
  const roundQF  = document.getElementById('round-qf');
  const roundSF  = document.getElementById('round-sf');
  const roundFIN = document.getElementById('round-final');
  if(!container || !roundR16 || !roundQF || !roundSF || !roundFIN) return;

  if (window.matchMedia('(max-width: 560px)').matches) {
    [roundQF, roundSF, roundFIN].forEach(col=>{
      col.style.minHeight = '';
      col.querySelectorAll('.match').forEach(m => m.style.top = '');
    });
    return;
  }

  const centerYIn = (el, colRect) => {
    const r  = el.getBoundingClientRect();
    const cy = (r.top + r.bottom) / 2;
    return (cy - colRect.top) + container.scrollTop;
  };

  // Cuartos entre Octavos
  const rcQF  = roundQF.getBoundingClientRect();
  const idsR16 = ['R16_1','R16_2','R16_3','R16_4','R16_5','R16_6','R16_7','R16_8'].map(id=>document.getElementById(id));
  const qfs = ['QF1','QF2','QF3','QF4'].map(id=>document.getElementById(id));

  const placeBetween = (aEl, bEl, targetEl, colRect) => {
    const mid = (centerYIn(aEl, colRect) + centerYIn(bEl, colRect)) / 2;
    const h   = targetEl.getBoundingClientRect().height;
    targetEl.style.position = 'absolute';
    targetEl.style.top = `${mid - h/2}px`;
    return (mid + h/2);
  };

  const bottomsQF = [];
  if(idsR16[0] && idsR16[1] && qfs[0]) bottomsQF.push(placeBetween(idsR16[0], idsR16[1], qfs[0], rcQF));
  if(idsR16[2] && idsR16[3] && qfs[1]) bottomsQF.push(placeBetween(idsR16[2], idsR16[3], qfs[1], rcQF));
  if(idsR16[4] && idsR16[5] && qfs[2]) bottomsQF.push(placeBetween(idsR16[4], idsR16[5], qfs[2], rcQF));
  if(idsR16[6] && idsR16[7] && qfs[3]) bottomsQF.push(placeBetween(idsR16[6], idsR16[7], qfs[3], rcQF));
  if(bottomsQF.length) roundQF.style.minHeight = `${Math.max(...bottomsQF) + 16}px`;

  // Semis entre Cuartos
  const rcSF = roundSF.getBoundingClientRect();
  const sf1 = document.getElementById('SF1');
  const sf2 = document.getElementById('SF2');
  const bottomsSF = [];
  if(qfs[0] && qfs[1] && sf1) bottomsSF.push(placeBetween(qfs[0], qfs[1], sf1, rcSF));
  if(qfs[2] && qfs[3] && sf2) bottomsSF.push(placeBetween(qfs[2], qfs[3], sf2, rcSF));
  if(bottomsSF.length) roundSF.style.minHeight = `${Math.max(...bottomsSF) + 16}px`;

  // Final entre Semis
  const rcFIN = roundFIN.getBoundingClientRect();
  const f1 = document.getElementById('F1');
  if(sf1 && sf2 && f1){
    const mid = (centerYIn(sf1, rcFIN) + centerYIn(sf2, rcFIN)) / 2;
    const h   = f1.getBoundingClientRect().height;
    f1.style.position = 'absolute'; f1.style.top = `${mid - h/2}px`;
    const champ  = roundFIN.querySelector('.champion');
    const champH = champ ? champ.getBoundingClientRect().height : 0;
    const finalBottom = (mid + h/2) + 12 + champH;
    roundFIN.style.minHeight = `${finalBottom + 16}px`;
  }
}

/* ===== scheduleRedraw: re-calcular tras reflow/Device Toolbar ===== */
function scheduleRedraw(){
  requestAnimationFrame(()=>{
    positionRounds();
    drawBracketConnections();
    setTimeout(()=>{
      positionRounds();
      drawBracketConnections();
    }, 50);
  });
}

/* Curvas SVG */
function pathCurve(x1,y1,x2,y2){
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`;
}
function getCenterRight(el, container){
  const r = el.getBoundingClientRect();
  const rc = container.getBoundingClientRect();
  return { x:(r.right-rc.left)+container.scrollLeft, y:(r.top+r.bottom)/2-rc.top+container.scrollTop };
}
function getCenterLeft(el, container){
  const r = el.getBoundingClientRect();
  const rc = container.getBoundingClientRect();
  return { x:(r.left-rc.left)+container.scrollLeft, y:(r.top+r.bottom)/2-rc.top+container.scrollTop };
}
function drawBracketConnections(){
  const container = document.getElementById('bracket'); if(!container) return;

  const grid = container.querySelector('.bracket-grid');
  const svg = container.querySelector('.bracket-svg');

  const w = Math.max(container.scrollWidth, grid?.scrollWidth || 0);
  const h = Math.max(container.scrollHeight, grid?.scrollHeight || 0);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);

  while(svg.firstChild) svg.removeChild(svg.firstChild);

  const pairs = [
    { from:'R16_1', to:'QF1' }, { from:'R16_2', to:'QF1' },
    { from:'R16_3', to:'QF2' }, { from:'R16_4', to:'QF2' },
    { from:'R16_5', to:'QF3' }, { from:'R16_6', to:'QF3' },
    { from:'R16_7', to:'QF4' }, { from:'R16_8', to:'QF4' },
    { from:'QF1', to:'SF1'  }, { from:'QF2', to:'SF1'  },
    { from:'QF3', to:'SF2'  }, { from:'QF4', to:'SF2'  },
    { from:'SF1', to:'F1'   }, { from:'SF2', to:'F1'   }
  ];

  pairs.forEach(p=>{
    const fromEl = document.getElementById(p.from);
    const toEl   = document.getElementById(p.to);
    if(!fromEl || !toEl) return;
    const a = getCenterRight(fromEl, container);
    const b = getCenterLeft(toEl, container);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', pathCurve(a.x, a.y, b.x, b.y));
    path.setAttribute('fill','none');
    path.setAttribute('stroke','var(--wire)');
    path.setAttribute('stroke-width','2');
    path.setAttribute('stroke-linecap','round');
    svg.appendChild(path);
  });
}

/* Redibujo en resize y scroll */
window.addEventListener('resize', scheduleRedraw);
document.getElementById('bracket').addEventListener('scroll', ()=>{
  clearTimeout(window.__brk_t);
  window.__brk_t = setTimeout(scheduleRedraw, 50);
});

/* Redibujo cuando cambia el media query móvil (Device Toolbar) */
const mq = window.matchMedia('(max-width: 560px)');
if(mq.addEventListener) mq.addEventListener('change', scheduleRedraw);
else if(mq.addListener) mq.addListener(scheduleRedraw);

/* =============== PARTIDOS (lista + filtros + búsqueda) =============== */
const GROUP_LETTERS = ['A','B','C','D','E','F'];

function generateGroupFixtures(){
  const fixtures = [];
  GROUP_LETTERS.forEach(letter=>{
    for(let i=1;i<=6;i++){
      fixtures.push({
        id: `G${letter}_${i}`,
        phase: 'groups',
        group: letter,
        a: '—', b: '—',
        sa: null, sb: null,
        date: '—', time: '—'
      });
    }
  });
  return fixtures;
}
function generateKOFixtures(){
  const make = (id, phase)=>({ id, phase, group:null, a:'—', b:'—', sa:null, sb:null, date:'—', time:'—' });
  return [
    // R16
    make('R16_1','r16'), make('R16_2','r16'), make('R16_3','r16'), make('R16_4','r16'),
    make('R16_5','r16'), make('R16_6','r16'), make('R16_7','r16'), make('R16_8','r16'),
    // QF
    make('QF1','qf'), make('QF2','qf'), make('QF3','qf'), make('QF4','qf'),
    // SF
    make('SF1','sf'), make('SF2','sf'),
    // Final
    make('F1','final')
  ];
}
const MATCHES_ALL = [
  ...generateGroupFixtures(),
  ...generateKOFixtures()
];

const matchesRoot = document.getElementById('matches-root');
const searchInput = document.getElementById('match-search');
const phaseSelect = document.getElementById('match-phase');
const groupSelect = document.getElementById('match-group');

function phaseLabel(phase){
  return ({
    groups: 'Fase de grupos',
    r16: 'Octavos de final',
    qf: 'Cuartos de final',
    sf: 'Semifinal',
    final: 'Final'
  })[phase] || phase;
}
function matchCardListItem(m){
  const wrap = el('div','match-card');

  const head = el('div','match-head');
  const left = el('div',null, m.phase==='groups'
    ? `${phaseLabel(m.phase)} — Grupo ${m.group}`
    : `${phaseLabel(m.phase)}`
  );
  const right = el('div','match-score', (m.sa!=null && m.sb!=null) ? `${m.sa} - ${m.sb}` : '— - —');
  head.appendChild(left); head.appendChild(right);

  const title = el('div','match-title', `${m.a} vs ${m.b}`);

  const meta = el('div','match-meta');
  const d = el('div',null, `🗓 Fecha: ${m.date}`);
  const t = el('div',null, `⏰ Hora: ${m.time}`);
  meta.appendChild(d); meta.appendChild(t);

  wrap.appendChild(head);
  wrap.appendChild(title);
  wrap.appendChild(meta);
  return wrap;
}

/* Orden: por fase (grupos A-F → R16 → QF → SF → Final) */
const PHASE_ORDER = { groups:1, r16:2, qf:3, sf:4, final:5 };
function sortMatches(list){
  return list.slice().sort((a,b)=>{
    const pa = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
    if(pa!==0) return pa;
    if(a.phase==='groups' && b.phase==='groups'){
      return GROUP_LETTERS.indexOf(a.group) - GROUP_LETTERS.indexOf(b.group) || a.id.localeCompare(b.id);
    }
    return a.id.localeCompare(b.id);
  });
}

/* Filtro + búsqueda */
function applyFilters(){
  let list = MATCHES_ALL;

  const phaseVal = phaseSelect.value; // all | groups | r16 | qf | sf | final
  if(phaseVal!=='all'){
    list = list.filter(m => m.phase===phaseVal);
  }

  const showingGroups = (phaseVal==='groups');
  groupSelect.style.display = showingGroups ? '' : 'none';
  if(showingGroups){
    const gVal = groupSelect.value; // all | A..F
    if(gVal!=='all'){
      list = list.filter(m => m.group===gVal);
    }
  }

  const q = (searchInput.value || '').trim().toLowerCase();
  if(q){
    list = list.filter(m => (m.a||'').toLowerCase().includes(q) || (m.b||'').toLowerCase().includes(q));
  }

  list = sortMatches(list);
  renderMatches(list);
}
function renderMatches(list){
  if(!matchesRoot) return;
  matchesRoot.innerHTML = '';
  if(!list.length){
    matchesRoot.appendChild(el('div', null, 'No hay partidos que coincidan con el filtro.'));
    return;
  }
  list.forEach(m => matchesRoot.appendChild(matchCardListItem(m)));
}

/* Eventos de filtros/búsqueda */
searchInput.addEventListener('input', applyFilters);
phaseSelect.addEventListener('change', applyFilters);
groupSelect.addEventListener('change', applyFilters);

/* Estado inicial: mostrar Fase de grupos + todos los grupos */
applyFilters();
