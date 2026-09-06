(() => {
  'use strict';
  const D = window.ATLAS_DATA;
  if (!D) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => Number(n).toLocaleString('zh-CN');
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, parent) => { const el = document.createElementNS(svgNS, tag); Object.entries(attrs || {}).forEach(([k,v]) => el.setAttribute(k, v)); if (parent) parent.append(el); return el; };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const catById = new Map(D.categories.map(c => [c.id, c]));
  const skillById = new Map(D.skills.map(s => [s.id, s]));
  let selectedCategory = '', layout = 'domain', activeCaseFilter = 'all', activeChain = 0;
  let presenting = false, presentIndex = 0, returnFocus = null, heroOrbit = null, chapterNavigationPending = false;
  const dialog = $('#detail-dialog');
  const announce = text => { $('#announcer').textContent = text; };
  const safeLink = url => /^https:\/\//.test(url || '') ? url : '';

  function drawHero() {
    const root = $('#hero-atlas');
    svg('circle', {cx:350,cy:350,r:303,fill:'none',stroke:'#344136','stroke-width':1}, root);
    svg('circle', {cx:350,cy:350,r:191,fill:'none',stroke:'#344136','stroke-width':1}, root);
    svg('line',{x1:350,y1:15,x2:350,y2:685,stroke:'#253328','stroke-width':1},root);
    svg('line',{x1:15,y1:350,x2:685,y2:350,stroke:'#253328','stroke-width':1},root);
    const ticks=svg('g',{},root);
    for(let i=0;i<72;i++) { const a=i/72*Math.PI*2; const r1=i%6===0?312:318; svg('line',{x1:350+Math.cos(a)*r1,y1:350+Math.sin(a)*r1,x2:350+Math.cos(a)*325,y2:350+Math.sin(a)*325,stroke:i%6===0?'#a1aba0':'#344136','stroke-width':1},ticks); }
    const dots = svg('g',{id:'hero-orbit-dots'},root);
    let index=0;
    D.groups.forEach(group => {
      for(let i=0;i<group.count;i++) {
        const a=(index/244*360-90)*Math.PI/180;
        const r=224+(i%4)*16;
        const x=350+Math.cos(a)*r,y=350+Math.sin(a)*r;
        svg('rect',{x:x-3,y:y-3,width:6,height:6,rx:1,fill:group.color,opacity:.72+(i%3)*.1,transform:`rotate(${index/244*360},${x},${y})`},dots);index++;
      }
    });
    svg('circle',{cx:350,cy:350,r:174,fill:'none',stroke:'#344136','stroke-width':1,'stroke-dasharray':'3 13'},root);
  }

  const domainPositions = [
    {x:58,y:101,cols:12,step:18,labelX:58,labelY:51},
    {x:385,y:101,cols:8,step:18,labelX:385,labelY:51},
    {x:650,y:101,cols:7,step:18,labelX:650,labelY:51},
    {x:898,y:101,cols:6,step:18,labelX:898,labelY:51},
    {x:58,y:301,cols:6,step:18,labelX:58,labelY:251},
    {x:335,y:301,cols:6,step:18,labelX:335,labelY:251},
    {x:610,y:301,cols:5,step:18,labelX:610,labelY:251},
    {x:875,y:301,cols:5,step:18,labelX:875,labelY:251}
  ];
  let mapNodes = [], labelLayer;
  function coordinates(mode) {
    const counts = {}; const positions = new Map();
    D.skills.forEach(s => {
      const key = mode === 'domain' ? s.category : s.level;
      const i=counts[key] || 0;counts[key]=i+1;
      if(mode==='domain') { const p=domainPositions[D.categories.findIndex(c=>c.id===key)];positions.set(s.id,{x:p.x+(i%p.cols)*p.step,y:p.y+Math.floor(i/p.cols)*p.step}); }
      else { const k=D.levels.findIndex(l=>l.id===key);positions.set(s.id,{x:250+(i%43)*18,y:71+k*96+Math.floor(i/43)*18}); }
    });
    return {positions,counts};
  }
  function drawMap() {
    const root=$('#capability-map');labelLayer=svg('g',{},root);
    const points=svg('g',{},root), p=coordinates('domain').positions;
    D.skills.forEach(s=>{ const xy=p.get(s.id),c=catById.get(s.category); const el=svg('rect',{x:xy.x,y:xy.y,width:10,height:10,rx:1.5,fill:c.color,class:'map-node','data-skill':s.id},points);svg('title',{},el).textContent=`${s.label} · ${s.id}`;el.addEventListener('pointerenter',e=>showMapTip(e,s));el.addEventListener('pointermove',e=>positionMapTip(e));el.addEventListener('pointerleave',()=>$('#map-tip').hidden=true);el.addEventListener('click',()=>openSkill(s.id));mapNodes.push({el,s}); });
    updateMap(false);
  }
  function showMapTip(event,s) { const t=$('#map-tip');t.textContent=`${s.label} · ${s.id}`;t.hidden=false;positionMapTip(event); }
  function positionMapTip(event) { const box=$('.atlas-stage').getBoundingClientRect(), tip=$('#map-tip');const x=Math.min(event.clientX-box.left+12,box.width-280);tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,event.clientY-box.top-48)+'px'; }
  function updateMap(animate=true) {
    const {positions,counts}=coordinates(layout);labelLayer.replaceChildren();
    if(layout==='domain') D.categories.forEach((c,i)=>{const p=domainPositions[i];svg('text',{x:p.labelX,y:p.labelY,class:'map-label'},labelLayer).textContent=c.short;svg('text',{x:p.labelX,y:p.labelY+22,class:'map-label-sub'},labelLayer).textContent=`${String(counts[c.id]||0).padStart(2,'0')} ENTRIES / ${c.en}`;});
    else D.levels.forEach((l,i)=>{svg('text',{x:55,y:82+i*96,class:'map-label'},labelLayer).textContent=l.name;svg('text',{x:55,y:107+i*96,class:'map-label-sub'},labelLayer).textContent=`${counts[l.id]||0} / ${l.en}`;});
    mapNodes.forEach(({el,s},i)=>{const p=positions.get(s.id),opacity=(selectedCategory && s.category!==selectedCategory) ? .12 : 1;if(animate&&window.gsap&&!reduce.matches)gsap.to(el,{attr:{x:p.x,y:p.y},opacity,duration:.85,ease:'power3.inOut',delay:(i%19)*.006,overwrite:true});else{el.setAttribute('x',p.x);el.setAttribute('y',p.y);el.style.opacity=opacity;} });
    $$('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));
    $$('.legend-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===selectedCategory)));
    const c=catById.get(selectedCategory);
    $('#map-reading-title').textContent=c?`${c.name} · ${countsForCategory(c.id)} 项`:layout==='domain'?'两个核心，一组工作底座。':'从执行动作，到组织与改进工作。';
    $('#map-reading-text').textContent=c?c.insight:layout==='domain'?'研发与交付、内容与表达各占 34%。这是一张能力入口地图：它呈现沉淀方向，不是个人能力评分，也不代表每项都已完成业务验收。':'操作、任务、编排与方法改进，是同一批能力的另一个观察角度。48 项具体操作、154 项完整任务、28 项流程编排、14 项方法改进。层级按主要职责归类，不代表质量高低；同一项能力也可能跨层。';
  }
  const countsForCategory=id=>D.skills.filter(s=>s.category===id).length;
  function renderGroups() {
    $('#group-ribbon').innerHTML=D.groups.map(g=>`<div class="group-item" style="--group-color:${g.color}"><span class="group-top"><i></i>${esc(g.name)}</span><strong>${g.count}</strong><small>${(g.count/244*100).toFixed(1)}%</small></div>`).join('');
    $('#map-legends').innerHTML=D.categories.map(c=>`<button class="legend-button" data-category="${c.id}" style="--c:${c.color}" aria-pressed="false"><i></i>${esc(c.short)} <span>${countsForCategory(c.id)}</span></button>`).join('');
    $$('.legend-button').forEach(b=>b.addEventListener('click',()=>{selectedCategory=selectedCategory===b.dataset.category?'':b.dataset.category;updateMap();announce(selectedCategory?`已突出显示${catById.get(selectedCategory).name}`:'已显示全部能力');}));
  }

  function renderResearch() {
    $('#research-total').textContent=number(D.research.totalMessages);
    $('#research-own').textContent=number(D.research.months.reduce((n,m)=>n+(m.ownKeywordMatches.skill||0),0));
    const max=Math.max(...D.research.months.map(m=>m.ownKeywordMatches.skill||0),1);
    $('#activity-chart').innerHTML=D.research.months.map((m,i)=>{const value=m.ownKeywordMatches.skill||0;return `<button class="month-bar ${m.messages===0?'no-data':''}" data-month="${i}" aria-label="${m.month}，${m.messages===0?'没有本地可见记录':value+' 条相关消息'}，查看范围"><span class="bar-value">${m.messages===0?'—':value}</span><span class="bar" style="height:${Math.max(2,value/max*160)}px"></span><span class="month-label">${m.month.slice(2).replace('-','.')}</span></button>`;}).join('');
    $$('[data-month]').forEach(b=>b.addEventListener('click',()=>openMonth(Number(b.dataset.month))));
    $('#timeline').innerHTML=D.timeline.map(t=>`<article class="timeline-item"><span class="timeline-date">${esc(t.date)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><span class="evidence-tag">${esc(t.type)}</span>${t.caseId?`<div><button class="plain-button" data-open-case="${t.caseId}">查看对应案例 →</button></div>`:''}</article>`).join('');
    wireCaseLinks($('#timeline'));
  }
  function openMonth(i) {
    const m=D.research.months[i],events=D.timeline.filter(t=>t.date.startsWith(m.month));
    openDialog('CHAT TRACE / MONTHLY WINDOW',`<div class="dialog-body"><h2 id="dialog-title" class="dialog-title">${esc(m.month)} 的交流轨迹</h2><p class="dialog-intro">${m.messages===0?'本轮未在该月检出本地可见记录。这是数据覆盖空档，不表示当月没有相关活动。':'以下数值来自本机可读消息，按消息计数；关键词是检索线索，不是任务完成量或 Skill 调用量。'}</p><div class="detail-stats"><span class="detail-stat">本机消息 ${number(m.messages)}</span><span class="detail-stat">本人消息 ${number(m.ownMessages)}</span><span class="detail-stat">本人 Skill / 插件相关 ${number(m.ownKeywordMatches.skill||0)}</span></div>${events.map(t=>`<div class="detail-section"><h4>${esc(t.date)} · ${esc(t.type)}</h4><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`).join('')}<div class="detail-evidence"><span class="micro-label">读取范围</span><p>${esc(m.from)} 至 ${esc(m.to_exclusive)}（结束日期不含当天）；扫描 ${number(m.scannedTables)} 个聊天表。错误 ${m.errors}，截断 ${m.truncated?'有':'无'}。${m.firstObserved?`首条记录 ${esc(m.firstObserved.slice(0,10))}；末条记录 ${esc(m.lastObserved.slice(0,10))}。`:''}</p></div></div>`);
  }

  function waveform(values=D.waveforms.original,extra='') { return `<div class="cover-wave ${extra}" aria-hidden="true">${values.map(v=>`<i style="height:${Math.max(4,v*95)}%"></i>`).join('')}</div>`; }
  function renderCases() {
    const cases=D.cases.filter(c=>activeCaseFilter==='all'||c.type===activeCaseFilter);
    $('#case-count').textContent=`${String(cases.length).padStart(2,'0')} SELECTED CASES`;
    $('#case-grid').innerHTML=cases.map((c,i)=>`<button class="case-card" data-id="${c.id}" data-open-case="${c.id}" aria-label="打开案例：${esc(c.title)}"><div class="case-visual">${c.type==='audio'?`<div class="audio-cover"><strong>原声。<br>另一种可能。</strong>${waveform()}<span>ORIGINAL / SYNTHESIZED</span></div>`:`<img src="${esc(c.cover)}" alt="${esc(c.alt)}" loading="lazy">`}<span class="case-media-label">${c.type==='video'?'▶ FILM':c.type==='audio'?'≋ AUDIO':'↗ IMAGE'}</span><span class="case-open" aria-hidden="true">${c.type==='video'?'▶':c.type==='audio'?'▷':'↗'}</span></div><div class="case-meta"><span>CASE ${String(D.cases.indexOf(c)+1).padStart(2,'0')} / ${esc(c.domain)}</span><span>${esc(c.date)}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p></button>`).join('');
    wireCaseLinks($('#case-grid'));
    if(window.gsap&&!reduce.matches)gsap.fromTo('#case-grid .case-card',{y:18,opacity:0},{y:0,opacity:1,duration:.4,stagger:.045,clearProps:'transform,opacity'});
  }
  function wireCaseLinks(root) { $$('[data-open-case]',root).forEach(b=>b.addEventListener('click',()=>openCase(b.dataset.openCase))); }
  function skillChips(ids) { return ids.filter(id=>skillById.has(id)).map(id=>`<button class="skill-chip" data-open-skill="${esc(id)}">${esc(id)}</button>`).join(''); }
  function wireSkills(root) { $$('[data-open-skill]',root).forEach(b=>b.addEventListener('click',()=>openSkill(b.dataset.openSkill))); }
  function openCase(id) {
    const c=D.cases.find(x=>x.id===id);if(!c)return;
    const evidenceLink=safeLink(c.url);
    let media='';
    if(c.type==='video')media=`<div class="media-stage"><video controls playsinline preload="metadata" poster="${esc(c.cover)}" aria-label="${esc(c.title)}"><source src="${esc(c.media[0].src)}" type="video/mp4">浏览器无法播放此视频。</video></div><div class="media-controls"><span class="media-position">${esc(c.media[0].caption)}</span><a class="plain-button" href="${esc(c.media[0].src)}" download>保存视频 ↓</a></div>`;
    else if(c.type==='audio')media=`<div class="media-stage audio-lab"><div class="segmented" role="group" aria-label="选择试听版本"><button data-audio="0" aria-pressed="true">原始录音</button><button data-audio="1" aria-pressed="false">合成语音</button></div><div id="audio-wave">${waveform()}</div><audio controls preload="metadata" id="case-audio" aria-label="原始录音"><source src="${esc(c.media[0].src)}" type="audio/mpeg"></audio><p class="audio-transcript">${esc(c.transcript)}</p></div><div class="media-controls"><span id="audio-label" class="media-position">${esc(c.media[0].caption)}</span><span class="micro-copy">切换版本后点击播放</span></div>`;
    else media=`<div class="media-stage image-stage" id="image-stage"><img id="case-image" src="${esc(c.media[0].src)}" alt="${esc(c.media[0].caption)}"></div><div class="media-controls"><button id="image-prev" class="plain-button" ${c.media.length<2?'hidden':''} disabled>← 上一张</button><span id="image-caption" class="media-position">1 / ${c.media.length} · ${esc(c.media[0].caption)}</span><button id="image-zoom" class="plain-button" aria-pressed="false">放大图片 ＋</button><button id="image-next" class="plain-button" ${c.media.length<2?'hidden':''}>下一张 →</button></div>`;
    openDialog(`CASE ${String(D.cases.indexOf(c)+1).padStart(2,'0')} / ${c.type.toUpperCase()} / ${c.date}`,`<div class="dialog-body"><h2 id="dialog-title" class="dialog-title">${esc(c.title)}</h2><p class="dialog-intro">${esc(c.summary)}</p>${media}<p id="media-status" class="micro-copy" role="status"></p><div class="case-detail-columns"><div><h4>任务 / THE TASK</h4><p>${esc(c.task)}</p><h4>能力对应 / CAPABILITIES</h4><div>${skillChips(c.skills)}</div></div><div><h4>过程与判断 / WHAT MATTERED</h4><ul>${c.decisions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><div class="detail-evidence"><span class="micro-label">证据与范围</span><p>${esc(c.evidence)}${evidenceLink?` <a href="${esc(evidenceLink)}" target="_blank" rel="noopener noreferrer">查看原作品 ↗</a>`:''}</p><p class="evidence-ref">${esc(c.ref)}</p></div></div>`);
    wireSkills(dialog);
    $$('video,audio',dialog).forEach(m=>m.addEventListener('error',()=>$('#media-status').textContent='媒体未能加载。请确认 assets 文件夹与网页一同保留，并使用支持该格式的浏览器。'));
    if(c.type==='audio')$('#case-audio').addEventListener('timeupdate',event=>{const a=event.currentTarget;const ratio=a.duration?a.currentTime/a.duration:0;const bars=$$('#audio-wave i');bars.forEach((bar,i)=>bar.classList.toggle('played',(i+.5)/bars.length<=ratio));});
    if(c.type==='audio')$$('[data-audio]',dialog).forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.audio),a=$('#case-audio');a.pause();a.src=c.media[i].src;a.setAttribute('aria-label',i?'合成语音':'原始录音');a.load();$$('[data-audio]',dialog).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#audio-wave').innerHTML=waveform(i?D.waveforms.clone:D.waveforms.original);$('#audio-label').textContent=c.media[i].caption;$('#media-status').textContent='';}));
    if(c.type==='image'){
      let i=0;const stage=$('#image-stage'),img=$('#case-image');const resetZoom=()=>{stage.classList.remove('zoomed');$('#image-zoom').setAttribute('aria-pressed','false');$('#image-zoom').textContent='放大图片 ＋';};const update=()=>{resetZoom();img.src=c.media[i].src;img.alt=c.media[i].caption;$('#image-caption').textContent=`${i+1} / ${c.media.length} · ${c.media[i].caption}`;$('#image-prev').disabled=i===0;$('#image-next').disabled=i===c.media.length-1;};
      $('#image-prev').addEventListener('click',()=>{if(i>0){i--;update();}});$('#image-next').addEventListener('click',()=>{if(i<c.media.length-1){i++;update();}});const zoom=()=>{const yes=stage.classList.toggle('zoomed');$('#image-zoom').setAttribute('aria-pressed',String(yes));$('#image-zoom').textContent=yes?'适合窗口 −':'放大图片 ＋';};$('#image-zoom').addEventListener('click',zoom);img.addEventListener('click',zoom);img.addEventListener('error',()=>$('#media-status').textContent='图片未能加载，请检查配套 assets 文件夹。');
    }
  }

  function renderChains() {
    $('#chain-tabs').innerHTML=D.chains.map((c,i)=>`<button data-chain="${i}" aria-pressed="${i===activeChain}">${esc(c.title)}</button>`).join('');
    $$('[data-chain]').forEach(b=>b.addEventListener('click',()=>{activeChain=Number(b.dataset.chain);renderChains();}));
    const c=D.chains[activeChain];$('#chain-stage').innerHTML=c.steps.map((s,i)=>`<article class="chain-step"><span class="step-no">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.title)}</h3><p>${esc(s.result)}</p>${skillChips(s.skills)}</article>`).join('');$('#chain-note').textContent=c.note;wireSkills($('#chain-stage'));
    if(window.gsap&&!reduce.matches)gsap.fromTo('.chain-step',{y:15,opacity:0},{y:0,opacity:1,duration:.4,stagger:.06,clearProps:'transform,opacity'});
  }
  function initIndex() {
    $('#category-filter').insertAdjacentHTML('beforeend',D.categories.map(c=>`<option value="${c.id}">${esc(c.short)} · ${countsForCategory(c.id)}</option>`).join(''));
    $('#level-filter').insertAdjacentHTML('beforeend',D.levels.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join(''));
    ['#skill-search','#category-filter','#level-filter'].forEach(s=>$(s).addEventListener('input',renderIndex));
    $('#clear-filters').addEventListener('click',()=>{$('#skill-search').value='';$('#category-filter').value='';$('#level-filter').value='';renderIndex();$('#skill-search').focus();});renderIndex();
  }
  function renderIndex() {
    const q=$('#skill-search').value.trim().toLowerCase(),cat=$('#category-filter').value,level=$('#level-filter').value;
    const list=D.skills.filter(s=>(!q||`${s.id} ${s.label} ${s.description} ${catById.get(s.category).name}`.toLowerCase().includes(q))&&(!cat||s.category===cat)&&(!level||s.level===level));
    $('#index-count').textContent=`${list.length} / ${D.skills.length}`;$('#index-empty').hidden=!!list.length;
    $('#skill-list').innerHTML=list.map(s=>`<button class="skill-row" data-open-skill="${esc(s.id)}" style="--c:${catById.get(s.category).color}"><i class="skill-dot"></i><span class="skill-row-content"><strong>${esc(s.label===s.id?s.id:s.label)}</strong><small>${esc(s.id)} · ${esc(D.levels.find(l=>l.id===s.level).name)}</small></span><span class="row-arrow" aria-hidden="true">↗</span></button>`).join('');wireSkills($('#skill-list'));
  }
  function openSkill(id) {
    const s=skillById.get(id);if(!s)return;const cat=catById.get(s.category),cases=D.cases.filter(c=>c.skills.includes(id));
    openDialog(`CAPABILITY / ${cat.en}`,`<div class="dialog-body"><p class="eyebrow" style="color:var(--muted-ink)">${esc(cat.name)} / ${esc(D.levels.find(l=>l.id===s.level).name)}</p><h2 id="dialog-title" class="dialog-title">${esc(s.label)}</h2><p class="evidence-ref">${esc(s.id)}</p><p class="dialog-intro">${esc(s.description)}</p><div class="detail-stats"><span class="detail-stat">版本 ${esc(s.version||'未声明')}</span><span class="detail-stat">${esc(s.status)}</span>${s.hasScripts?'<span class="detail-stat">附执行脚本</span>':''}${s.hasCases?'<span class="detail-stat">有案例记录</span>':''}</div><div class="detail-section"><h4>在能力地图中的位置</h4><p>${esc(cat.insight)}</p></div><div class="detail-section"><h4>本案例集中的作品</h4>${cases.length?cases.map(c=>`<button class="button ink" data-open-case="${c.id}" style="margin:5px 8px 5px 0">${esc(c.title)} ↗</button>`).join(''):'<p>本案例集中尚未收录这项能力的独立制品。它仍作为能力入口保留在地图中。</p>'}</div><div class="detail-evidence"><span class="micro-label">阅读口径</span><p>用途来自盘点时的 Skill 说明。脚本与案例标签只表示文件或记录存在，不代表本次已经执行全部业务验证。职责层级是观察视角，允许跨层。</p></div></div>`);wireCaseLinks(dialog);
  }

  function stopMedia() { $$('audio,video',dialog).forEach(m=>m.pause()); }
  function openDialog(kicker,body) {
    stopMedia();if(!dialog.open)returnFocus=document.activeElement;$('#dialog-kicker').textContent=kicker;$('#dialog-content').innerHTML=body;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;document.body.style.overflow='hidden';$('#dialog-close').focus({preventScroll:true});
  }
  function closeDialog(){stopMedia();dialog.close();}
  $('#dialog-close').addEventListener('click',closeDialog);
  dialog.addEventListener('close',()=>{stopMedia();$('#dialog-content').replaceChildren();document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;});
  dialog.addEventListener('cancel',()=>stopMedia());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
  document.addEventListener('play',e=>{if(['VIDEO','AUDIO'].includes(e.target.tagName))$$('video,audio').forEach(m=>{if(m!==e.target)m.pause();});},true);
  function openMethod() {
    const r=D.research;
    openDialog('SOURCES / SCOPE / READING NOTES',`<div class="dialog-body"><h2 id="dialog-title" class="dialog-title">证据与口径</h2><p class="dialog-intro">地图、聊天轨迹与作品是三种不同的证据。把它们放在一起，可以观察工作方式；不能据此把文件数量当作个人能力、使用频率或商业效果。</p><div class="detail-section"><h4>01 / 能力地图</h4><p>沿用 2026.09.06 盘点快照：244 个不同 ID，其中主目录 234 个、仓外补充 10 个。包含 50 个内嵌模块或套件条目，以及兼容与实验入口。按主要用户结果分为 8 类，再归成 4 个工作重心。操作、任务、编排、方法改进按用途归类，不是质量等级。</p></div><div class="detail-section"><h4>02 / 聊天轨迹</h4><p>请求窗口为 2025.09.06 至 2026.09.06。本轮使用 lov-wdb-cli 读取本机现有 23 个数据库，按月扫描聊天表，读取 ${number(r.totalMessages)} 条窗口内记录。${esc(r.coverageNote)}</p><p>图表中的“本人相关”按方向或发送者字段判断。关键词包括 skill、lov-、技能、插件；它们可能指向不同产品，不能全部解释为自研 Skill。重复转发保留在消息计数中；每月最多保留 180 条高相关片段再作语义审阅，共 2,160 条，重复模板会影响入选。12 个时间点另按稳定记录标识回读核对，以概述呈现；这是有边界的抽样深挖，并非逐条理解全部聊天。转发记录不自动视为本人观点。</p><p>每月读取上限 1,000,000 条；本轮所有月份 ${r.months.some(m=>m.truncated)?'存在截断':'均未触发上限'}，查询错误 ${r.months.reduce((n,m)=>n+m.errors,0)}。未查询服务器未同步记录、删除记录或其他账号。正文不包含聊天对象身份、私人会话原文或数据库路径。</p><div class="method-table-wrap"><table class="method-table"><thead><tr><th>月份</th><th>可见消息</th><th>本人相关</th><th>读取状态</th></tr></thead><tbody>${r.months.map(m=>`<tr><td>${esc(m.month)}</td><td>${number(m.messages)}</td><td>${number(m.ownKeywordMatches.skill||0)}</td><td>${m.messages?'已读取':'覆盖空档'}${m.truncated?' / 截断':''}</td></tr>`).join('')}</tbody></table></div></div><div class="detail-section"><h4>03 / 案例制品</h4><p>案例使用本机现存图像、录音与成片。历史验收和发布信息按原记录注明；不把历史状态当作本次重新验证的线上状态。音色实验作为前置探索保留，不宣称当时已经由当前 Skill 自动完成。</p><p>视频保留完整内容，提供适合网页播放的 720p 副本；源成片为 1080p。音频保留原录音和合成版本供对比。图片点击后可放大查看。</p></div><div class="detail-section"><h4>04 / 展示与交互</h4><p>本专题托管于 LovStudio 官网，媒体按需加载；可下载完整离线包在本机展示。GSAP 驱动地图重排与入场，尊重系统减少动态效果设置。演示模式用左右方向键切换章节，Esc 退出；对话框内 Esc 优先关闭详情。</p><p><a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer">Agent Skills 公开规范 ↗</a> · <a href="https://gsap.com/docs/v3/GSAP/" target="_blank" rel="noopener noreferrer">GSAP 文档 ↗</a></p></div></div>`);
  }

  const chapters=$$('.chapter');
  function goToChapter(i){presentIndex=Math.max(0,Math.min(chapters.length-1,i));const target=chapters[presentIndex];if(window.gsap)gsap.killTweensOf(window);chapterNavigationPending=true;const finish=()=>{chapterNavigationPending=false;updatePresentation();};if(window.gsap&&!reduce.matches)gsap.to(window,{scrollTo:{y:target,offsetY:presenting?74:100,autoKill:true,onAutoKill:finish},duration:.8,ease:'power3.inOut',onComplete:finish});else{target.scrollIntoView({behavior:'instant',block:'start'});finish();}updatePresentation();}
  function updatePresentation(){ $('#present-position').textContent=`${String(presentIndex+1).padStart(2,'0')} / ${chapters.length} · ${chapters[presentIndex].dataset.chapter}`;$('#present-prev').disabled=presentIndex===0;$('#present-next').disabled=presentIndex===chapters.length-1; }
  function togglePresentation(yes){
    const current=chapters.reduce((index,chapter,i)=>chapter.getBoundingClientRect().top<=120?i:index,0);
    const anchorTop=chapters[current].getBoundingClientRect().top;
    if(window.gsap)gsap.killTweensOf(window);
    chapterNavigationPending=true;presenting=yes;
    document.body.classList.toggle('presenting',yes);
    $('#presentation-controls').hidden=!yes;
    $('#present-toggle').setAttribute('aria-pressed',String(yes));
    $('#present-toggle').innerHTML=yes?'演示中 <span aria-hidden="true">↗</span>':'进入演示 <span aria-hidden="true">↗</span>';
    if(window.ScrollTrigger)ScrollTrigger.refresh();
    if(yes)goToChapter(current);
    else{window.scrollTo(0,Math.max(0,chapters[current].offsetTop-anchorTop));chapterNavigationPending=false;$('#present-toggle').focus({preventScroll:true});}
    announce(yes?'已进入演示模式，使用左右方向键切换章节，Esc 退出':'已退出演示模式');
  }
  $('#present-toggle').addEventListener('click',()=>togglePresentation(!presenting));$('#present-exit').addEventListener('click',()=>togglePresentation(false));$('#present-prev').addEventListener('click',()=>goToChapter(presentIndex-1));$('#present-next').addEventListener('click',()=>goToChapter(presentIndex+1));
  document.addEventListener('keydown',e=>{const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if(dialog.open)return;if(e.key==='/'&&!editing){e.preventDefault();$('#skill-search').focus();$('#index').scrollIntoView({behavior:'instant'});}if(presenting&&!editing){if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();goToChapter(presentIndex+1);}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();goToChapter(presentIndex-1);}if(e.key==='Escape')togglePresentation(false);}});
  $$('[data-layout]').forEach(b=>b.addEventListener('click',()=>{layout=b.dataset.layout;updateMap();}));$('#map-reset').addEventListener('click',()=>{selectedCategory='';layout='domain';updateMap();});
  $('#map-to-index').addEventListener('click',()=>{$('#category-filter').value=selectedCategory;$('#skill-search').value='';$('#level-filter').value='';renderIndex();$('#index').scrollIntoView({behavior:reduce.matches?'instant':'smooth'});});
  $$('[data-case-filter]').forEach(b=>b.addEventListener('click',()=>{activeCaseFilter=b.dataset.caseFilter;$$('[data-case-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCases();}));
  ['#research-method','#method-open'].forEach(s=>$(s).addEventListener('click',openMethod));

  drawHero();renderGroups();drawMap();renderResearch();renderCases();renderChains();initIndex();updatePresentation();
  if(window.gsap){gsap.registerPlugin(ScrollTrigger,ScrollToPlugin);const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion: no-preference)',()=>{const entrance=gsap.timeline();entrance.from('.hero-copy .eyebrow',{y:16,opacity:0,duration:.55}).from('.hero h1>*',{y:36,opacity:0,duration:.85,stagger:.1,ease:'power3.out'},'-.35').from('.hero-description,.hero-actions',{y:18,opacity:0,duration:.6,stagger:.08},'-.55').from('#hero-orbit-dots rect',{opacity:0,scale:0,duration:.6,stagger:{each:.004,from:'random'},transformOrigin:'center',ease:'back.out(1.4)'},'-.95');heroOrbit=gsap.to('#hero-orbit-dots',{rotation:360,transformOrigin:'350px 350px',duration:240,repeat:-1,ease:'none'});$$('.section-heading').forEach(el=>gsap.from(el,{y:28,opacity:0,duration:.8,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}}));return()=>{heroOrbit=null;};});}
  const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const id=e.target.id;$$('.site-header nav a').forEach(a=>{const yes=a.hash==='#'+id;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});if(presenting&&!chapterNavigationPending){presentIndex=chapters.indexOf(e.target);updatePresentation();}}});},{rootMargin:'-12% 0px -65% 0px'});chapters.forEach(c=>observer.observe(c));
  document.addEventListener('visibilitychange',()=>{if(heroOrbit)document.hidden?heroOrbit.pause():heroOrbit.resume();});
})();
