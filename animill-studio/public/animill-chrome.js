(function installSharedAnimillChrome(){
  function install(){
    if(document.documentElement.dataset.animillChromeInstalled)return;
    document.documentElement.dataset.animillChromeInstalled='true';
    document.body.classList.add('animillReticle');
    if(!document.querySelector('.pointerLight'))document.body.insertAdjacentHTML('afterbegin','<div class="pointerLight" aria-hidden="true"></div>');
    if(!document.querySelector('.halo'))document.body.insertAdjacentHTML('afterbegin','<div class="halo" aria-hidden="true"></div><div class="cursor" aria-hidden="true"></div>');
    if(!document.querySelector('#pointerInfo'))document.body.insertAdjacentHTML('beforeend','<div class="pointerInfo" id="pointerInfo" aria-hidden="true"><b>CONTROL</b><span></span></div>');
    let info=document.querySelector('#pointerInfo'),label=info.querySelector('span');
    let hot='button,.archetype,.beatBar,.beat,input,select,textarea,.toolItem,.clip,.block,.chip,[data-tip]';
    let describe=el=>{
      let text=el.dataset.tip||el.getAttribute('aria-label')||el.getAttribute('title');
      if(!text&&el.matches('input,select,textarea'))text=el.closest('.field,.beat')?.querySelector('label')?.textContent;
      if(!text&&el.matches('button,.archetype'))text=el.textContent;
      return String(text||'').replace(/\s+/g,' ').trim();
    };
    window.addEventListener('pointermove',event=>{document.documentElement.style.setProperty('--mx',event.clientX+'px');document.documentElement.style.setProperty('--my',event.clientY+'px')},{passive:true});
    window.addEventListener('pointerover',event=>{let el=event.target.closest&&event.target.closest(hot);if(!el)return;el.dataset.animillHover=el.matches('input,select,textarea,.beat')?'field':'action';let text=describe(el);document.body.classList.add('hot');if(text){label.textContent=text;info.classList.add('show')}});
    window.addEventListener('pointerout',event=>{let from=event.target.closest&&event.target.closest(hot),to=event.relatedTarget?.closest&&event.relatedTarget.closest(hot);if(from===to)return;if(!to){document.body.classList.remove('hot');info.classList.remove('show')}});
  }
  let css=`
    :root{--mx:50vw;--my:50vh;--soft:cubic-bezier(.2,.8,.2,1)}
    body.animillReticle{cursor:none}
    body.animillReticle .pointerLight{position:fixed;left:0;top:0;width:520px;height:520px;margin:-260px 0 0 -260px;z-index:0;pointer-events:none;transform:translate3d(var(--mx),var(--my),0);background:radial-gradient(circle, color-mix(in srgb,var(--gold) 15%,transparent) 0, color-mix(in srgb,var(--mint) 7%,transparent) 28%,transparent 70%);opacity:.78;transition:opacity .18s var(--soft);will-change:transform}
    body.animillReticle.hot .pointerLight{opacity:1}
    body.animillReticle .cursor,body.animillReticle .halo{position:fixed;left:0;top:0;pointer-events:none;z-index:100001;transform:translate3d(var(--mx),var(--my),0)}
    body.animillReticle .cursor{width:10px;height:10px;background:var(--gold);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);margin:-5px 0 0 -5px;box-shadow:0 0 22px color-mix(in srgb,var(--gold) 80%,transparent)}
    body.animillReticle .halo{width:46px;height:46px;margin:-23px 0 0 -23px;border:1px solid color-mix(in srgb,var(--gold) 38%,transparent);clip-path:polygon(12% 0,88% 0,100% 28%,100% 72%,88% 100%,12% 100%,0 72%,0 28%);transition:width .18s var(--soft),height .18s var(--soft),margin .18s var(--soft),border-color .18s var(--soft)}
    body.animillReticle.hot .halo{width:68px;height:68px;margin:-34px 0 0 -34px;border-color:color-mix(in srgb,var(--mint) 62%,transparent)}
    body.animillReticle [data-animill-hover="action"]{transition:transform .16s var(--soft),border-color .16s var(--soft),filter .16s var(--soft),box-shadow .16s var(--soft)}
    body.animillReticle [data-animill-hover="action"]:not(.block):hover{border-color:color-mix(in srgb,var(--gold) 78%,transparent);transform:translateY(-1px);filter:brightness(1.08) drop-shadow(0 8px 16px color-mix(in srgb,var(--gold) 14%,transparent))}
    body.animillReticle .block[data-animill-hover="action"]:hover{filter:brightness(1.06) drop-shadow(0 0 18px color-mix(in srgb,var(--gold) 18%,transparent))}
    body.animillReticle [data-animill-hover="field"]{transition:border-color .16s var(--soft),box-shadow .16s var(--soft)}
    body.animillReticle [data-animill-hover="field"]:hover{border-color:color-mix(in srgb,var(--mint) 58%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--mint) 10%,transparent)}
    .pointerInfo{position:fixed;left:calc(var(--mx) + 25px);top:calc(var(--my) + 19px);z-index:100002;pointer-events:none;max-width:250px;padding:6px 9px;border:1px solid var(--line2);border-left:2px solid var(--mint);background:rgba(3,4,6,.94);color:var(--ink);clip-path:var(--bevelSm);opacity:0;transform:translateY(5px);transition:opacity .12s,transform .12s;font:800 9px/1.25 Inter,ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-transform:none;box-shadow:0 12px 28px rgba(0,0,0,.4)}
    .pointerInfo b{display:block;color:var(--mint);font-size:7px;letter-spacing:.16em;margin-bottom:2px}.pointerInfo.show{opacity:1;transform:translateY(0)}
    @media(pointer:coarse){body.animillReticle{cursor:auto}body.animillReticle .cursor,body.animillReticle .halo,body.animillReticle .pointerLight,.pointerInfo{display:none}}
  `;
  let style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
