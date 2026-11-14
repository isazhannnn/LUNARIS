const {launch,delay}=require('./browser-kit.cjs');const fs=require('node:fs');
(async()=>{const b=await launch(),results=[];const check=(name,value)=>{if(!value)throw Error(name);results.push(name);console.log('PASS '+name);};try{
 await b.call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'language',{get:()=> 'ru-RU'});"});
 await b.viewport(1440,900);await b.navigate('LUNARIS-Play.html');await b.evaluate('localStorage.clear()');await b.navigate('LUNARIS-Play.html');check('single HTML launches offline-ready RU browser locale',await b.evaluate("document.documentElement.lang==='ru'&&Lunaris.version==='4.0'"));
 await b.click('#start');await b.click('#brief-begin');await b.click('#pix-dialogue-close');await b.click('#pix-talk');check('PIX conversation topics available',await b.evaluate("document.querySelectorAll('#modal-body .choice').length===3"));await b.click('#modal-body .choice:nth-of-type(1)');check('PIX translates conversation as subtitles',await b.evaluate("document.querySelector('#pix-dialogue').classList.contains('visible')"));
 await b.click('#language');check('locale switch cancels stale speech',await b.evaluate("document.documentElement.lang==='en'"));
 const seed=await b.evaluate('Lunaris.getState().puzzleSeed');await b.evaluate("location.reload()");await delay(300);await b.wait('!!window.Lunaris');await b.click('#continue');check('reload retains mission seed',await b.evaluate(`Lunaris.getState().puzzleSeed===${seed}`));
 await b.click('#pix-dialogue-close');await b.viewport(844,390,true);await delay(150);
 const x=await b.evaluate('Lunaris.getState().player.x');const rect=await b.evaluate("(()=>{const r=document.querySelector('#joystick').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await b.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x,y:rect.y}]});await b.call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+32,y:rect.y}]});await delay(400);await b.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('real touch joystick moves astronaut',await b.evaluate(`Lunaris.getState().player.x>${x}+20`));
 check('joystick release clears movement',await b.evaluate("!document.querySelector('#joystick').classList.contains('held')"));await b.click('#touch-run');check('touch run toggles',await b.evaluate("document.querySelector('#touch-run').getAttribute('aria-pressed')==='true'"));
 await b.viewport(390,844,true);await delay(100);await b.click('#rotate-continue');await b.screenshot('qa-mobile-portrait-final.png');check('portrait tools remain a single row',await b.evaluate("(()=>{const r=[...document.querySelectorAll('.controls .tools>button')].filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().y);return Math.max(...r)-Math.min(...r)<2})()"));
 await b.evaluate('Lunaris.goHome()');await b.click('#academy-open');await b.viewport(1200,900);await delay(100);
 const ids=['water','shield','comms','rover'],correct={water:[1,0,1],shield:[0,1,2],comms:[1,2,0],rover:[0,1,0]};
 for(const [index,id]of ids.entries()){
  await b.evaluate(`document.querySelectorAll('.academy-launch')[${index}].click()`);await delay(80);
  const variant=await b.evaluate('LunarAcademy.getState().variant');
  if(id==='water')for(const key of ['collect','prefilter','purify','test','store'])await b.evaluate(`(()=>{const s=LunarAcademy.getState(),i=s.variant.waterOrder.filter(k=>!s.data.sequence.includes(k)).indexOf(${JSON.stringify(key)});document.querySelectorAll('.academy-option')[i].click()})()`);
  if(id==='shield')await b.evaluate("(()=>{const s=LunarAcademy.getState(),keys=['water','polymer','regolith','aluminium'];let pair;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(LunarAcademyRules.shieldResult([keys[i],keys[j]],s.variant.shield).ok)pair=[i,j];for(const i of pair)document.querySelectorAll('.academy-material')[i].click()})()");
  if(id==='comms')await b.evaluate("(()=>{const n=document.querySelector('.academy-range');n.value=LunarAcademy.getState().variant.roundTrip;n.dispatchEvent(new Event('input'))})()");
  if(id==='rover'){
   async function pathTo(target){const moves=await b.evaluate(`(()=>{const s=LunarAcademy.getState(),goal=${JSON.stringify(target)},q=[{x:s.data.x,y:s.data.y,path:[]}],seen=new Set();while(q.length){const p=q.shift();if(p.x===goal.x&&p.y===goal.y)return p.path;for(const [dx,dy]of [[-1,0],[0,-1],[0,1],[1,0]]){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(!seen.has(key)&&LunarAcademyRules.canStep(x,y)){seen.add(key);q.push({x,y,path:[...p.path,[dx,dy]]});}}}throw Error('No rover path')})()`);for(const [dx,dy] of moves){const n=dx<0?0:dy<0?1:dy>0?2:3;await b.evaluate(`document.querySelectorAll('.academy-rover-button')[${n}].click()`);}}
   await pathTo(variant.sample);await b.evaluate("document.querySelectorAll('.academy-actions .primary')[0].click()");await pathTo({x:0,y:6});
  }
  await b.evaluate("[...document.querySelectorAll('.academy-actions .primary')].at(-1).click()");check(id+' generated experiment solves',await b.evaluate("LunarAcademy.getState().phase==='science'"));
  await b.evaluate("document.querySelector('#academy-work>.primary').click()");await b.evaluate(`document.querySelector('[data-answer="${correct[id][variant.quizIndex]}"]').click()`);await b.evaluate("document.querySelector('#academy-work>.primary').click()");check(id+' knowledge explanation and badge',await b.evaluate("LunarAcademy.getState().phase==='complete'"));
  if(id==='comms')await b.screenshot('qa-academy-comms.png');
  await b.evaluate("[...document.querySelectorAll('.academy-actions button')].at(-1).click()");
 }
 check('all four academic badges recorded',await b.evaluate('Object.values(LunarAcademy.progress()).filter(Boolean).length===4'));
 await b.evaluate("document.querySelectorAll('.academy-launch')[2].click()");const distance=await b.evaluate('LunarAcademy.getState().variant.distance');await b.evaluate("document.querySelector('.academy-level-header button').click();document.querySelectorAll('.academy-launch')[2].click()");check('new academy attempt changes conditions',await b.evaluate(`LunarAcademy.getState().variant.distance!==${distance}`));
 check('no runtime exceptions in extended QA',b.errors.length===0);fs.writeFileSync(__dirname+'/../test-results/browser-extended-results.json',JSON.stringify({passed:results.length,checks:results,errors:b.errors},null,2));
 }catch(error){await b.screenshot('qa-extended-failure.png');throw error;}finally{if(b.errors.length)console.log(b.errors);await b.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1});
