(() => {
  'use strict';
  const cases = window.CASES;
  const media = window.MEDIA_DATA;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${Math.floor(seconds % 60).toString().padStart(2,'0')}`;
  const dialog = $('#case-dialog');
  const imageDialog = $('#image-dialog');
  const film = $('#main-film');
  const voice = $('#voice');
  let category = '全部';
  let activeCase = null;
  let guide = false;
  let returnHash = '#works';
  let imageOpener = null;
  let caseOpener = null;
  let journeyIndex = 0;
  let toastTimer;
  const cardCache = new Map();

  const feather = `<svg class="feather-art" viewBox="0 0 180 210" fill="none" aria-hidden="true"><path d="M32 174C27 101 66 38 143 15C151 93 121 156 32 174Z" fill="#f1f1e4" stroke="currentColor" stroke-width="1.2"/><path d="M22 199L140 21M36 178L101 160M46 159L119 131M60 139L132 102M76 114L142 69M45 162L39 124M62 134L58 83M82 105L84 49M105 71L113 31" stroke="currentColor" stroke-width="1.1"/><path d="M4 115C15 117 19 124 17 131M148 148C165 139 178 139 172 161M140 180C153 168 169 168 178 174" stroke="currentColor" opacity=".35"/></svg>`;
  function travelArt() {
    return `<div class="travel-art"><svg viewBox="0 0 340 205" aria-hidden="true"><path d="M24 56H288Q318 56 318 87T288 118H55Q25 118 25 145T55 175H260" stroke="currentColor" opacity=".4" fill="none" stroke-width="1.5" stroke-dasharray="3 4"/>${[[24,56,'常州'],[106,56,'上海'],[199,56,'广州'],[288,56,'香港'],[288,118,'昆明'],[172,118,'成都'],[55,118,'武汉'],[104,175,'南京'],[260,175,'北京']].map(([x,y,label],i)=>`<circle cx="${x}" cy="${y}" r="${i===8?6:3.5}" fill="currentColor"/><text x="${x}" y="${y-13}" text-anchor="${x===24?'start':'middle'}">${label}</text>`).join('')}</svg></div>`;
  }
  function art(c, arrow = false) {
    let inner = '';
    if(c.art==='book') inner='<img src="/ai-cases/assets/book-cover.png" alt="金色多面体书籍封面" loading="lazy">';
    if(c.art==='film') inner='<img src="/ai-cases/assets/film-cover.png" alt="手工川 AI 实战视频封面" loading="lazy">';
    if(c.art==='portrait') inner='<span class="riso-crop" role="img" aria-label="手工川抬手演讲的 Riso 人像，取自五指修正版"></span>';
    if(c.art==='hanzi') inner='<span class="hanzi-sidenote">敛翼而起 · 聚合与和协</span><span class="hanzi-glyph">翕</span><span class="hanzi-caption">XĪ / THE MOTION OF A CHARACTER</span>';
    if(c.art==='matrix') inner='<img src="/ai-cases/assets/matrix.png" alt="跨端技术比较决策矩阵" loading="lazy">';
    if(c.art==='bauhaus') inner='<img src="/ai-cases/assets/bauhaus-visual.jpg" alt="包豪斯风格的独立 AI 视觉素材" loading="lazy">';
    if(c.art==='travel') inner='<span class="art-label">VTRIP / 2025.02 — 03</span>'+travelArt()+'<span class="art-disclosure">原数据行程节选 · 示意重绘</span>';
    if(c.art==='speech') inner='<span class="art-label">VOICE → TIMECODE → SUBTITLES</span><span class="speech-num">49.257<small>s</small></span><div class="mini-wave" aria-hidden="true">'+Array.from({length:45},(_,i)=>`<i style="height:${15+((i*17+i*i*7)%80)}%"></i>`).join('')+'</div><span class="art-disclosure">识别耗时记录 · 波形为示意</span>';
    if(c.art==='writing') inner='<span class="art-label">CALIBRATING THE RULER</span><div class="writing-figure"><div class="writing-bar" style="height:85%"><span>66%</span><small>校准前</small></div><div class="writing-bar" style="height:11.6%"><span>9%</span><small>校准后</small></div></div><span class="art-disclosure">同批语料回测 · 非独立准确率</span>';
    if(c.art==='runtime') inner='<span class="art-label">LESS WORK. SAME WORKSPACE.</span><span class="runtime-numbers">916 <span>→ 33</span></span><span class="runtime-dots" aria-hidden="true">'+Array.from({length:120},(_,i)=>`<i class="${i<33?'active':''}"></i>`).join('')+'</span><span class="art-disclosure">初始加载记录上限 · 图形为示意</span>';
    if(c.art==='feather') inner='<span class="art-label">A SMALL GAME / A BIG CURIOSITY</span>'+feather+'<span class="art-disclosure">2023 开发回顾 · 编辑性示意</span>';
    if(c.art==='memory') inner='<span class="art-label">ONE DETAIL CHANGES THE ANSWER</span><div class="memory-art"><del>驴</del><span class="arrow">→</span><span>犬</span></div><span class="memory-caption">纠正线索：藏獒</span>';
    return `<div class="case-art ${c.art}">${inner}${arrow?'<span class="card-arrow" aria-hidden="true">↗</span>':''}</div>`;
  }
  function renderFilters() {
    const categories = ['全部','软件与交互','视觉与设计','知识与表达','影像与声音','效率与系统'];
    $('#category-filters').innerHTML = categories.map(label => `<button data-category="${label}" aria-pressed="${label===category}">${label}<small>${label==='全部'?cases.length:cases.filter(c=>c.category===label).length}</small></button>`).join('');
  }
  function renderGrid() {
    const query = $('#search').value.toLocaleLowerCase().trim();
    const visible = cases.filter(c => (category==='全部'||c.category===category) && (!query||[c.title,c.name,c.summary,c.year,c.category,...c.tags].join(' ').toLocaleLowerCase().includes(query)));
    const flipState = window.CaseMotion?.beforeGrid();
    const cards = visible.map(c => {
      if (!cardCache.has(c.id)) {
        const card = document.createElement('button');
        card.className = 'case-card'; card.dataset.case = c.id;
        card.dataset.flipId = c.id;
        card.setAttribute('aria-label', `查看案例 ${c.number}：${c.title}`);
        card.innerHTML = `${art(c,true)}<span class="card-meta"><span>${c.number} / ${c.category}</span><span>${c.date} · ${c.media}</span></span><h3 class="card-title">${c.title}</h3><p class="card-summary">${c.summary}</p><span class="card-bottom"><b><em>${c.metric}</em> ${c.unit}</b><span>进入案例 ↗</span></span>`;
        cardCache.set(c.id, card);
      }
      return cardCache.get(c.id);
    });
    $('#case-grid').replaceChildren(...cards);
    $('#result-count').textContent = `${visible.length} 个${query||category!=='全部'?'匹配':'精选'}案例`;
    $('#empty-state').hidden = visible.length!==0;
    $$('#category-filters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
    window.CaseMotion?.afterGrid(flipState);
  }
  function galleryHTML(c) {
    if(!c.gallery) return '';
    return `<section class="detail-section"><h3>看见成果</h3><div class="gallery">${c.gallery.map(([src,caption])=>`<figure><button data-image="${src}" data-caption="${esc(caption)}" aria-label="放大查看：${esc(caption)}"><img src="${src}" alt="${esc(caption)}" loading="lazy"></button><figcaption>${caption}</figcaption></figure>`).join('')}</div></section>`;
  }
  function comparisonHTML(c) {
    return `<section class="detail-section"><h3>从生活照，到职业形象</h3><div class="comparison"><img src="${c.compare[1]}" alt="职业形象照"><img class="compare-top" src="${c.compare[0]}" alt="原始生活照"><span class="compare-divider"></span><span class="compare-label">生活照</span><span class="compare-label right">职业照</span><input id="compare-slider" type="range" min="0" max="100" value="50" aria-label="拖动比较生活照与职业照" aria-valuetext="生活照显示 50%"></div><p class="compare-hint">左右拖动查看 · 键盘方向键也可调整 · 两张照片按容器适应显示</p></section>`;
  }
  function journeyHTML() {
    return `<section class="detail-section"><h3>重走这 21 站</h3><div class="journey"><div class="journey-view" id="journey-view" aria-live="polite"></div><div class="journey-stops" role="group" aria-label="选择旅行停靠点">${media.travel.map((stop,i)=>`<button data-stop="${i}" aria-pressed="${i===0}" aria-label="第 ${i+1} 站 ${stop.city}，${stop.date}">${String(i+1).padStart(2,'0')} ${stop.city}</button>`).join('')}</div><div class="journey-navigation"><button data-action="journey-prev">← 上一站</button><button data-action="journey-next">下一站 →</button></div><p class="journey-note">2025-02-03 — 03-02 · 21 个停靠点 / 19 座城市<br>依据原始行程 JSON 重绘；重复抵达的城市按实际顺序保留。</p></div></section>`;
  }
  function updateJourney(index) {
    journeyIndex = Math.max(0,Math.min(media.travel.length-1,index));
    const stop = media.travel[journeyIndex];
    $('#journey-view').innerHTML = `<span class="stop-index">${String(journeyIndex+1).padStart(2,'0')}</span><strong>${esc(stop.city)}</strong><time>${stop.date}</time>`;
    $$('.journey-stops button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===journeyIndex)));
    $('[data-action="journey-prev"]').disabled = journeyIndex===0;
    $('[data-action="journey-next"]').disabled = journeyIndex===media.travel.length-1;
  }
  function pauseInside(container) {container.querySelectorAll('audio,video').forEach(el=>el.pause());}
  function setCaseHash(id) {
    history.replaceState(null,'',`${location.pathname}${location.search}#case/${id}`);
  }
  function openCase(id,{fromHash=false,tour=false}={}) {
    const c=cases.find(item=>item.id===id);
    if(!c)return;
    if(!dialog.open){
      caseOpener=document.activeElement;
      if(!location.hash.startsWith('#case/')) returnHash=location.hash||'#works';
      guide=tour;
    }
    pauseInside(dialog);
    activeCase = c;
    film.pause(); voice.pause();
    const index=cases.indexOf(c), next=cases[(index+1)%cases.length];
    $('#dialog-index').textContent=`${guide?'导览':'CASE STUDY'} / ${c.number} OF ${String(cases.length).padStart(2,'0')}`;
    $('#case-content').innerHTML=`<header class="detail-header"><div class="detail-kicker"><span>${c.category} / ${c.media}</span><span>${c.date}</span></div><h2 id="case-title" tabindex="-1">${c.title}</h2><p class="detail-deck">${c.summary}</p><div class="detail-tags">${c.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></header><div class="detail-visual">${art(c)}</div><div class="detail-body"><div class="detail-lead"><span class="detail-label">最初的问题</span><p>${c.question}</p></div><section class="detail-section"><h3>从想法到作品</h3>${c.process.map(([title,body],i)=>`<div class="process-step"><span>0${i+1}</span><div><h4>${title}</h4><p>${body}</p></div></div>`).join('')}</section><div class="collaboration"><div><h4>人的判断</h4><p>${c.human}</p></div><div><h4>AI 的参与</h4><p>${c.ai}</p></div></div><section class="detail-section"><h3>最终留下了什么</h3><p>${c.result}</p>${c.download?`<a class="text-link" href="${c.download[0]}" target="_blank" rel="noopener">${c.download[1]} <span aria-hidden="true">↗</span></a>`:''}</section>${c.video?`<section class="detail-section"><video class="detail-video" controls playsinline preload="none" poster="/ai-cases/assets/film-cover.png" aria-label="手工川 AI 实战第一期完整成片"><source src="${c.video}" type="video/mp4"><track kind="subtitles" src="/ai-cases/assets/film.vtt" srclang="zh" label="中文外挂字幕"></video></section>`:''}${c.compare?comparisonHTML(c):''}${c.id==='vtrip'?journeyHTML():''}${galleryHTML(c)}<blockquote class="case-lesson">${c.lesson}</blockquote><p class="evidence-boundary"><strong>阅读这个案例时，请保留这条边界。</strong><br>${c.boundary}</p><details class="evidence-list"><summary>查看原始依据 · ${c.evidence.length} 项</summary><ul>${c.evidence.map(([label,path])=>`<li>${path.startsWith('https://')?`<a href="${esc(path)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`:esc(label)}<code>${esc(path)}</code></li>`).join('')}</ul><p>路径以本地 LovStudio 工作区为起点；来源保留各自的时间与验证范围。</p></details><footer class="detail-footer"><span class="detail-next-label">NEXT / ${next.number}</span><button class="text-link" data-case="${next.id}">${next.title} <span aria-hidden="true">→</span></button></footer></div>`;
    if(c.id==='vtrip')updateJourney(0);
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    $('#case-title').focus({preventScroll:true});
    if(!fromHash)setCaseHash(c.id);
    window.CaseMotion?.detailOpen();
  }
  function closeCase() {
    if(imageDialog.open)imageDialog.close();
    if(dialog.open)dialog.close();
  }
  dialog.addEventListener('close',()=>{
    pauseInside(dialog);
    activeCase=null; guide=false;
    if(location.hash.startsWith('#case/'))history.replaceState(null,'',`${location.pathname}${location.search}${returnHash}`);
    if(caseOpener?.isConnected)caseOpener.focus({preventScroll:true});
  });
  function nextCase(direction) {
    if(!activeCase)return;
    const index=(cases.indexOf(activeCase)+direction+cases.length)%cases.length;
    openCase(cases[index].id);
  }
  function openImage(src,caption) {
    imageOpener=document.activeElement;
    $('#lightbox-image').src=src;$('#lightbox-image').alt=caption;
    $('#image-caption').textContent=caption;
    $('#original-image').href=src;
    $('.image-stage').classList.remove('zoomed');
    $('#lightbox-image').setAttribute('aria-pressed','false');
    imageDialog.showModal();
    window.CaseMotion?.imageOpen();
  }
  imageDialog.addEventListener('close',()=>{if(imageOpener?.isConnected)imageOpener.focus({preventScroll:true});});
  $('#lightbox-image').setAttribute('tabindex','0');
  $('#lightbox-image').setAttribute('role','button');
  $('#lightbox-image').setAttribute('aria-label','切换图片适应视口与原尺寸');
  function toggleZoom(){const zoomed=$('.image-stage').classList.toggle('zoomed');$('#lightbox-image').setAttribute('aria-pressed',String(zoomed));}
  $('#lightbox-image').addEventListener('click',toggleZoom);
  $('#lightbox-image').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleZoom();}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeCase();}});

  function showToast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');
    if(!target)return;
    if(target.dataset.case){event.preventDefault();openCase(target.dataset.case);}
    if(target.dataset.category){category=target.dataset.category;renderGrid();}
    if(target.dataset.image)openImage(target.dataset.image,target.dataset.caption);
    if(target.dataset.stop!==undefined)updateJourney(Number(target.dataset.stop));
    if(target.dataset.year)renderYear(target.dataset.year);
    if(target.dataset.format)changeFormat(target.dataset.format);
    if(target.dataset.seek){film.currentTime=Number(target.dataset.seek);film.play().catch(error=>{if(error.name==='NotAllowedError')showToast('点击播放器中的播放按钮，开始观看。');});}
    switch(target.dataset.action){
      case 'tour':openCase(cases[0].id,{tour:true});break;
      case 'prev':nextCase(-1);break;
      case 'next':nextCase(1);break;
      case 'close':closeCase();break;
      case 'close-image':imageDialog.close();break;
      case 'reset':category='全部';$('#search').value='';renderGrid();$('#search').focus({preventScroll:true});break;
      case 'journey-prev':updateJourney(journeyIndex-1);break;
      case 'journey-next':updateJourney(journeyIndex+1);break;
    }
  });
  $('#search').addEventListener('input',renderGrid);
  document.addEventListener('input',event=>{if(event.target.id==='compare-slider'){event.target.closest('.comparison').style.setProperty('--split',`${event.target.value}%`);event.target.setAttribute('aria-valuetext',`生活照显示 ${event.target.value}%`);}});
  document.addEventListener('keydown',event=>{
    const interactive=event.target.closest('input,textarea,select,video,audio,[contenteditable=true],[role=tab]');
    if(event.key==='/'&&!dialog.open&&!imageDialog.open&&!interactive){event.preventDefault();$('#search').focus();$('#works').scrollIntoView({behavior:'smooth'});}
    if(dialog.open&&!imageDialog.open&&!interactive){if(event.key==='ArrowRight'){event.preventDefault();nextCase(1);}if(event.key==='ArrowLeft'){event.preventDefault();nextCase(-1);}}
  });

  const years={
    '2023':{kicker:'SEPTEMBER / 游戏与代码',title:'好奇，是最早的启动指令。',text:'想把一款吹羽毛游戏搬到网页，就开始研究加速度、多人世界与游戏引擎。与 ChatGPT-4 协作写动画，发生在这样一件具体的小事里。',id:'feather'},
    '2024':{kicker:'OCTOBER / 记忆与检索',title:'开始认真对待，一个问题的问法。',text:'从错误线索到正确线索，从详细描述到模糊描述。找回一部电影的三轮对照，让上下文质量与回答置信度变得可感知。',id:'memory'},
    '2025':{kicker:'MARCH / 为生活造物',title:'工具不合用，就为自己做一个。',text:'一份覆盖 19 座城市、21 个停靠点的真实行程，成为产品的第一组数据。用 AI 开发 VTrip，让抵达的顺序成为可以观看的路线。',id:'vtrip'},
    '2026':{kicker:'APRIL — SEPTEMBER / 跨媒介实践',title:'从单个结果，走向完整作品。',text:'书稿走向 202 页 PDF；录屏走向横竖双版成片；照片走向可校正的视觉作品。也开始为写作和工程建立能回读、能修正的质量标准。',id:'book'}
  };
  function renderYear(year){
    const y=years[year];if(!y)return;
    $$('#year-tabs button').forEach(b=>{const selected=b.dataset.year===year;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    $('#year-panel').setAttribute('aria-labelledby',`year-${year}`);
    $('#year-panel').innerHTML=`<div><p class="eyebrow">${y.kicker}</p><h3>${y.title}</h3></div><div><p>${y.text}</p><button class="text-link" data-case="${y.id}">查看这一年的代表案例 <span aria-hidden="true">↗</span></button></div>`;
    window.CaseMotion?.yearChanged();
  }
  $('#year-tabs').addEventListener('keydown',event=>{
    const tabs=$$('#year-tabs button'), index=tabs.indexOf(document.activeElement);
    if(index<0)return;
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();renderYear(tabs[next].dataset.year);tabs[next].focus();
  });

  $('#chapters').innerHTML=media.chapters.map((chapter,i)=>`<button data-seek="${chapter.time}" aria-label="跳到第 ${i+1} 章：${chapter.title}，${time(chapter.time)}"><span class="chapter-number">0${i+1}</span><span>${chapter.title}</span><time>${time(chapter.time)}</time></button>`).join('');
  film.addEventListener('timeupdate',()=>{$$('#chapters button').forEach((button,i)=>{const on=film.currentTime>=media.chapters[i].time && (i===media.chapters.length-1||film.currentTime<media.chapters[i+1].time);button.classList.toggle('active',on);if(on)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});});
  let formatRevision=0;
  function changeFormat(format){
    if(film.dataset.format===format||(format==='horizontal'&&!film.dataset.format))return;
    const wasPlaying=!film.paused, currentTime=film.currentTime, revision=++formatRevision;
    film.pause(); film.dataset.format=format;
    $$('.format-switch button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.format===format)));
    $('.screen-shell').classList.toggle('vertical',format==='vertical');
    film.poster=format==='vertical'?'/ai-cases/assets/film-cover-vertical.png':'/ai-cases/assets/film-cover.png';
    film.querySelector('source').src=`/ai-cases/assets/film-${format}.mp4`;
    film.addEventListener('loadedmetadata',()=>{if(revision!==formatRevision)return;film.currentTime=Math.min(currentTime,film.duration);if(wasPlaying)film.play().catch(()=>{});},{once:true});
    film.load();
  }
  $('#waveform').innerHTML=media.waveform.map(height=>`<i style="height:${Math.max(4,height*100)}%"></i>`).join('');
  voice.addEventListener('timeupdate',()=>{$$('#waveform i').forEach((bar,i)=>bar.classList.toggle('played',i/media.waveform.length<=voice.currentTime/(voice.duration||1)));});
  document.addEventListener('play',event=>{if(event.target.matches('audio,video'))$$('audio,video').forEach(player=>{if(player!==event.target)player.pause();});},true);
  document.addEventListener('error',event=>{
    const el=event.target;
    if(el.matches?.('video,audio')){const note=document.createElement('p');note.className='media-failure';note.textContent='这个媒体暂时无法播放。请稍后重试，或从案例中的原始作品入口查看。';if(!el.nextElementSibling?.classList.contains('media-failure'))el.after(note);}
    if(el.matches?.('img')&&!el.dataset.failed){el.dataset.failed='true';const note=document.createElement('p');note.className='media-failure';note.textContent=`图片未能载入：${el.alt}`;el.hidden=true;el.after(note);}
  },true);
  window.addEventListener('hashchange',()=>{const id=location.hash.startsWith('#case/')?location.hash.slice(6):null;if(id)openCase(id,{fromHash:true});else if(dialog.open)closeCase();});
  renderFilters();renderGrid();renderYear('2023');
  if(location.hash.startsWith('#case/'))openCase(location.hash.slice(6),{fromHash:true});
})();
