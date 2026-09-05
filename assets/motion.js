/* GSAP 3.15 / ScrollTrigger / Flip — local, progressively enhanced. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const toggle = $('#motion-toggle');
  const region = $('.spotlight-window');
  const track = $('.spotlight-track');
  const panels = $$('.spotlight-panel');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let preference = null;
  try { preference = localStorage.getItem('shougongchuan.exhibit.motion'); } catch {}
  let enabled = false, rootContext, mediaContext, railTrigger, flipAnimation;
  let revealTweens = [], refreshFrame, currentPanel = 0, navigationTween;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger && window.Flip);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger, Flip);

  function setPanel(index) {
    const next = Math.max(0, Math.min(2, index));
    if (next !== currentPanel || !$('#spotlight-count').dataset.ready) {
      currentPanel = next;
      $('#spotlight-count').textContent = `0${next + 1} / 03`;
      $('#spotlight-count').dataset.ready = 'true';
      $$('[data-spot-direction]').forEach(button => {
        button.disabled = Number(button.dataset.spotDirection) < 0 ? next === 0 : next === 2;
      });
    }
  }
  function baselineProgress() {
    if (railTrigger) {
      // Browsers may scroll an overflow:hidden box to reveal keyboard focus.
      // The pinned scene has one position source: the document scroll timeline.
      if (region.scrollLeft) region.scrollLeft = 0;
      return;
    }
    const max = region.scrollWidth - region.clientWidth;
    const progress = max > 0 ? region.scrollLeft / max : 0;
    $('.spotlight-progress>span').style.transform = `translateX(${progress * 200}%)`;
    setPanel(Math.round(progress * 2));
  }
  region.addEventListener('scroll', baselineProgress, {passive:true});
  function navigateTo(index) {
    const next = Math.max(0, Math.min(2, index));
    navigationTween?.kill();
    if (railTrigger && enabled) {
      // Native document scroll; no wheel interception or separate scroll engine.
      const position = {y:scrollY};
      const destination = railTrigger.start + (railTrigger.end - railTrigger.start) * next / 2;
      navigationTween = gsap.to(position, {y:destination,duration:.8,ease:'power3.inOut',onUpdate:()=>window.scrollTo(0,position.y)});
    } else {
      const max = region.scrollWidth - region.clientWidth;
      region.scrollTo({left:max * next / 2,behavior:enabled?'smooth':'auto'});
    }
  }
  $$('[data-spot-direction]').forEach(button => button.addEventListener('click', () => navigateTo(currentPanel + Number(button.dataset.spotDirection))));
  region.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); navigateTo(currentPanel + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); navigateTo(event.key === 'Home' ? 0 : 2);
    }
  });
  // A keyboard user can focus every item even while the strip is pinned.
  region.addEventListener('focusin', event => {
    const index = panels.indexOf(event.target.closest('.spotlight-panel'));
    if (index >= 0 && index !== currentPanel) navigateTo(index);
  });
  function cancelNavigation() { navigationTween?.kill(); }
  window.addEventListener('wheel',cancelNavigation,{passive:true});
  window.addEventListener('touchstart',cancelNavigation,{passive:true});

  function refresh() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => { if (enabled) ScrollTrigger.refresh(); baselineProgress(); });
  }
  function finishReveals() {
    for (const tween of revealTweens) {
      tween.progress(1); tween.scrollTrigger?.kill(); tween.kill();
    }
    revealTweens = [];
  }
  function setup() {
    if (!hasGSAP || enabled) return;
    enabled = true;
    document.documentElement.classList.remove('motion-off');
    rootContext = gsap.context(() => {
      // Only JS creates hidden states: the full exhibition remains usable without it.
      const intro = gsap.timeline({defaults:{ease:'power4.out'}});
      if (scrollY < 100 && !$('#case-dialog').open && !location.hash) {
        intro.from('.title-line>span',{yPercent:112,rotation:3,duration:1.15,stagger:.12},.12)
          .from('.hero-kicker',{opacity:0,y:16,duration:.7},.12)
          .from('.hero-description,.hero-actions,.hero-footnote',{opacity:0,y:25,duration:.85,stagger:.1},.48)
          .from('.hero-book',{opacity:0,scale:.83,rotation:-12,duration:1.4},.08)
          .from('.floating-art',{opacity:0,x:-65,y:50,rotation:-30,duration:1.1},.54)
          .from('.floating-type',{opacity:0,x:40,y:-45,rotation:27,duration:1.1},.62)
          .from('.orbit-lines',{opacity:0,scale:.8,duration:1.4},.3)
          .from('.site-header .identity,.site-header nav,.site-header .button',{opacity:0,y:-15,duration:.6,stagger:.07},0);
      }
      // End the entry sequence before a fast scroll or keyboard interaction takes over.
      const finishIntro = () => intro.progress(1);
      window.addEventListener('wheel',finishIntro,{passive:true,once:true});
      window.addEventListener('touchstart',finishIntro,{passive:true,once:true});
      document.addEventListener('keydown',finishIntro,{once:true});
      mediaContext = gsap.matchMedia();
      mediaContext.add({desktop:'(min-width: 1000px) and (min-height: 650px)',small:'(max-width: 999px), (max-height: 649px)'}, context => {
        const desktop = context.conditions.desktop;
        if (desktop) {
          const hero = gsap.timeline({onUpdate(){ $('.hero-actions').inert = this.progress() > .3; },scrollTrigger:{id:'exhibit-hero',trigger:'.hero-stage',start:'top top',end:'+=780',pin:true,scrub:.75,anticipatePin:1,invalidateOnRefresh:true}});
          hero.to('.hero-copy',{y:-80,opacity:0,duration:.38,ease:'power2.in'},0)
            .to('.hero-art',{xPercent:13,scale:1.13,rotation:7,duration:1,ease:'none'},0)
            .to('.orbit-lines',{rotation:95,duration:1,ease:'none'},0)
            .to('.hero-type-bg',{xPercent:-12,yPercent:20,opacity:.35,duration:1,ease:'none'},0)
            .to('.floating-art',{y:-80,rotation:3,duration:1,ease:'none'},0)
            .to('.floating-type',{y:90,rotation:-7,duration:1,ease:'none'},0)
            .to('.hero-scroll-cue',{opacity:0,duration:.2},0)
            .fromTo('.hero-reprise',{autoAlpha:0,y:70},{autoAlpha:1,y:0,duration:.45,ease:'power2.out'},.38);
          const distance = () => Math.max(1, track.scrollWidth - region.clientWidth);
          region.scrollLeft = 0;
          $('.spotlight').classList.add('is-pinned');
          $('.spotlight-instruction').textContent = '继续滚动，展开作品';
          const rail = gsap.to(track,{x:()=>-distance(),ease:'none',scrollTrigger:{id:'exhibit-rail',trigger:'.spotlight-stage',start:'top top',end:()=>`+=${distance()}`,pin:true,scrub:.7,anticipatePin:1,invalidateOnRefresh:true,onUpdate:self=>{
            setPanel(Math.round(self.progress*2));
            gsap.set('.spotlight-progress>span',{xPercent:self.progress*200});
          }}});
          railTrigger = rail.scrollTrigger;
          return () => {
            navigationTween?.kill(); railTrigger = null;
            $('.hero-actions').inert = false;
            $('.spotlight').classList.remove('is-pinned');
            $('.spotlight-instruction').textContent = '横向浏览，展开作品';
            region.scrollLeft = 0;
          };
        }
        $('.spotlight-instruction').textContent = '横向浏览，展开作品';
        gsap.from('.hero-art',{y:38,opacity:.35,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.hero-art',start:'top 93%',once:true}});
        gsap.to('.orbit-lines',{rotation:40,ease:'none',scrollTrigger:{trigger:'.hero-art',start:'top bottom',end:'bottom top',scrub:1}});
      });
      const revealTargets = $$('.works-section .section-heading,.case-card,.cinema .section-heading,.cinema-grid,.listening-room,.timeline-section .section-heading,.year-tabs,.about-grid');
      revealTweens = revealTargets.map(element => gsap.from(element,{
        y:element.matches('.case-card')?55:35,opacity:0,duration:.85,ease:'power3.out',
        scrollTrigger:{trigger:element,start:'top 94%',once:true}
      }));
      gsap.to('.reading-progress>span',{scaleX:1,ease:'none',scrollTrigger:{id:'exhibit-progress',start:0,end:'max',scrub:.2}});
      mediaContext.add('(hover: hover) and (pointer: fine)', () => {
        const cleanups = [];
        $$('.case-card,.hero-book,[data-magnetic]').forEach(element => {
          const magnetic = element.hasAttribute('data-magnetic');
          const target = element.querySelector('.case-art') || element;
          const first = gsap.quickTo(target,magnetic?'x':'rotationY',{duration:.55,ease:'power3.out'});
          const second = gsap.quickTo(target,magnetic?'y':'rotationX',{duration:.55,ease:'power3.out'});
          const move = event => {
            const r = element.getBoundingClientRect();
            const x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
            first(x*(magnetic?16:7)); second(y*(magnetic?12:-7));
          };
          const leave = () => {first(0);second(0);};
          element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);
          element.addEventListener('blur',leave);
          cleanups.push(()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);element.removeEventListener('blur',leave);});
        });
        return () => cleanups.forEach(cleanup=>cleanup());
      });
      return () => {
        window.removeEventListener('wheel',finishIntro);window.removeEventListener('touchstart',finishIntro);document.removeEventListener('keydown',finishIntro);
      };
    });
    rootContext.add('gridAnimation', state => {
      const cards = $$('.case-card');
      if (!cards.length) { refresh(); return; }
      flipAnimation = Flip.from(state,{
        targets:cards,duration:.65,ease:'power3.inOut',scale:true,
        onEnter:elements=>gsap.fromTo(elements,{opacity:0,y:32,scale:.96},{opacity:1,y:0,scale:1,duration:.55,stagger:.035,clearProps:'opacity,transform'}),
        onComplete:refresh
      });
      refresh();
    });
    rootContext.add('detailAnimation', () => {
      const targets=$$('#case-content .detail-header>*');
      gsap.killTweensOf(targets);
      gsap.fromTo(targets,{opacity:0,y:25},{opacity:1,y:0,duration:.55,stagger:.045,ease:'power3.out',clearProps:'opacity,transform'});
      gsap.fromTo('#case-content .detail-visual',{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)',duration:.75,ease:'power3.inOut',clearProps:'clipPath'});
    });
    rootContext.add('imageAnimation', () => {
      gsap.fromTo('#lightbox-image',{opacity:0,scale:.96},{opacity:1,scale:1,duration:.45,ease:'power3.out',clearProps:'opacity,transform',overwrite:true});
    });
    rootContext.add('yearAnimation', () => {
      gsap.fromTo('#year-panel>div',{opacity:0,y:22},{opacity:1,y:0,duration:.5,stagger:.08,ease:'power3.out',clearProps:'opacity,transform'});
    });
    refresh();
  }
  function teardown() {
    enabled=false;
    navigationTween?.kill(); flipAnimation?.progress(1).kill();
    mediaContext?.revert(); rootContext?.revert();
    railTrigger=null; revealTweens=[];
    document.documentElement.classList.add('motion-off');
    $('.spotlight').classList.remove('is-pinned');
    $('.reading-progress>span').style.transform='scaleX(0)';
    baselineProgress();
  }
  function syncPreference() {
    const shouldEnable=hasGSAP&&!reduced.matches&&preference!=='off';
    if(shouldEnable&&!enabled)setup();else if(!shouldEnable&&enabled)teardown();
    document.documentElement.classList.toggle('motion-off',!shouldEnable);
    toggle.hidden=!hasGSAP;
    toggle.disabled=reduced.matches;
    toggle.setAttribute('aria-pressed',String(shouldEnable));
    toggle.setAttribute('aria-label',reduced.matches?'已遵循系统的减少动态效果设置':shouldEnable?'关闭动态效果':'开启动效');
    toggle.title=reduced.matches?'系统已开启减少动态效果，展览自动切换为静态浏览':'动态效果可随时切换，选择保存在本机';
    $('#motion-label').textContent=shouldEnable?'动效 ON':'动效 OFF';
    baselineProgress();
  }
  toggle.addEventListener('click',()=>{
    // Preserve the visible section when pin spacing changes on a preference switch.
    const anchors=$$('.hero-stage,.spotlight-stage,.works-section,.cinema,.timeline-section,.about-section');
    const anchor=anchors.find(el=>{const r=el.getBoundingClientRect();return r.top<=innerHeight*.35&&r.bottom>innerHeight*.35;});
    const top=anchor?.getBoundingClientRect().top;
    preference=enabled?'off':'on';
    try{localStorage.setItem('shougongchuan.exhibit.motion',preference);}catch{}
    syncPreference();
    if(anchor&&top!==undefined)requestAnimationFrame(()=>{window.scrollBy(0,anchor.getBoundingClientRect().top-top);});
  });
  reduced.addEventListener('change',syncPreference);
  document.addEventListener('focusin',event=>{
    if(!enabled)return;
    // Never leave a focus target hidden behind an entrance animation.
    for(const tween of revealTweens){const target=tween.targets()[0];if(target?.contains(event.target)){tween.progress(1);tween.scrollTrigger?.kill();}}
  });
  document.addEventListener('toggle',event=>{if(event.target.matches('details'))refresh();},true);
  window.addEventListener('resize',refresh,{passive:true});
  window.addEventListener('load',refresh,{once:true});
  document.fonts?.ready.then(refresh);
  window.CaseMotion = {
    get enabled(){return enabled;},
    get version(){return hasGSAP?gsap.version:null;},
    beforeGrid(){
      if(!enabled)return null;
      flipAnimation?.progress(1).kill();finishReveals();
      return Flip.getState($$('.case-card'));
    },
    afterGrid(state){if(enabled&&state)rootContext.gridAnimation(state);},
    detailOpen(){if(enabled)rootContext.detailAnimation();},
    imageOpen(){if(enabled)rootContext.imageAnimation();},
    yearChanged(){if(enabled)rootContext.yearAnimation();}
  };
  syncPreference();
})();
