const {launch,delay}=require('./browser-kit.cjs');
const fs=require('node:fs');
(async()=>{
 const b=await launch();const results=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);results.push(name);console.log('PASS '+name);};
 try{
 await b.call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'language',{get:()=> 'en-US'});"});
 await b.viewport(1440,1000);await b.navigate();await b.evaluate("localStorage.clear();location.reload()");await b.wait('!!window.Lunaris');
 check('automatic English browser locale',await b.evaluate("document.documentElement.lang==='en'"));
 await b.click('#language');check('manual Russian locale',await b.evaluate("document.documentElement.lang==='ru'"));
 await b.screenshot('qa-home.png');await b.click('#start');await b.click('#brief-begin');
 check('new mission starts',await b.evaluate('Lunaris.getState().chapter===0'));
 check('mission has persistent seed',await b.evaluate('Number.isInteger(Lunaris.getState().puzzleSeed)'));
 check('PIX subtitles and alien glyph speech',await b.evaluate("document.querySelector('#pix-dialogue').classList.contains('visible')&&document.querySelector('#pix-subtitle').textContent.length>20&&document.querySelector('#pix-glyphs').textContent.length>0"));
 await b.click('#pix-dialogue-close');await b.screenshot('qa-game.png');
 async function travel(id){
  await b.evaluate("document.querySelector('#pix-dialogue-close').click()");
  await b.click('#map');
  await b.evaluate(`(()=>{const s=Lunaris.getState(),o=(s.world==='base'?LunarWorld.terminals:LunarWorld.surface).find(t=>t.id===${JSON.stringify(id)}),c=document.querySelector('#map-canvas'),r=c.getBoundingClientRect();c.dispatchEvent(new MouseEvent('click',{clientX:r.x+o.x/1200*r.width,clientY:r.y+o.y/780*r.height,bubbles:true}));})()`);
  await b.wait(`LunarWorld.nearest(Lunaris.getState())?.id===${JSON.stringify(id)}`,18000);await b.key('KeyE');await b.key('KeyE','keyUp');await b.wait("!document.getElementById('modal').hidden");
 }
 await travel('power');await b.click('#circuit-submit');check('invalid circuit explained without cost',await b.evaluate("Lunaris.getState().turn===0&&document.querySelector('#puzzle-error').textContent.length>0"));
 await b.evaluate("(()=>{const s=Lunaris.getState(),p=LunarSim.missionPuzzle(s,'circuit');document.querySelectorAll('[data-tile]').forEach((el,i)=>{let v=p.tiles[i];while(v!==p.solution[i]){el.click();v=LunarSim.rotate(v);}});})()");
 await b.screenshot('qa-circuit.png');await b.click('#circuit-submit');await b.click('#brief-begin');check('circuit advances actual mission',await b.evaluate('Lunaris.getState().chapter===1'));
 await travel('air');
 await b.evaluate("(()=>{const target=LunarSim.missionPuzzle(Lunaris.getState(),'air').target;target.forEach((v,i)=>{while(+document.querySelector('#air-value-'+i).textContent<v)document.querySelector('#air-plus-'+i).click();});})()");
 await b.screenshot('qa-air.png');await b.click('#air-submit');await b.click('#brief-begin');check('generated air arithmetic solves',await b.evaluate('Lunaris.getState().chapter===2'));
 await b.evaluate("document.querySelector('#pix-dialogue-close').click()");await b.click('#sabotage');
 await b.evaluate("(()=>{const d=LunarSim.sabotageCase(Lunaris.getState());document.querySelectorAll('#modal-body .choice')[d.correctIndex].click();})()");check('sabotage repair recorded once',await b.evaluate("Lunaris.getState().sabotageResolved.includes('air')"));
 await travel('garden');await b.click('#choose-grow');await b.click('#brief-begin');await travel('airlock');await b.click('#exit-submit');check('surface transition and suit',await b.evaluate("Lunaris.getState().world==='surface'&&Lunaris.getState().suit>99"));
 await b.evaluate("document.querySelector('#pix-dialogue-close').click()");await b.screenshot('qa-surface.png');
 await travel('solar');await b.click('#solar-submit');await travel('antenna');
 await b.evaluate("(()=>{const p=LunarSim.missionPuzzle(Lunaris.getState(),'radio');p.target.forEach((v,i)=>{const e=document.querySelector('#radio-'+i);e.value=v;e.dispatchEvent(new Event('input'));});})()");
 check('generated radio peak reads 100',await b.evaluate("document.querySelector('#radio-quality').textContent.includes('100 / 100')"));await b.screenshot('qa-radio.png');await b.click('#radio-submit');await b.click('#brief-begin');
 await travel('hatch');await b.click('#enter-submit');await travel('shelter');await b.click('#choose-waterShield');await b.click('#action');await b.click('#seal-submit');check('complete mission reaches good ending',await b.evaluate("Lunaris.getState().ending==='lastSignal'"));await b.screenshot('qa-ending.png');
 await b.evaluate("localStorage.removeItem('lunaris.save.v1');location.reload()");await b.wait('!!window.Lunaris');check('manual locale survives reload',await b.evaluate("document.documentElement.lang==='ru'"));
 await b.viewport(844,390,true);await b.click('#start');await b.click('#brief-begin');await b.evaluate("document.querySelector('#pix-dialogue-close').click()");await delay(250);await b.screenshot('qa-mobile-landscape.png');
 check('landscape game fits viewport',await b.evaluate("document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1"));check('touch joystick visible',await b.evaluate("document.querySelector('#joystick').getBoundingClientRect().width>50"));
 const before=await b.evaluate('Lunaris.getState().player.x');await b.key('KeyD');await delay(350);await b.key('KeyD','keyUp');check('keyboard movement works',await b.evaluate(`Lunaris.getState().player.x>${before}+10`));
 await b.viewport(390,844,true);await delay(150);check('portrait rotation prompt visible',await b.evaluate("!document.getElementById('rotate-prompt').hidden"));await b.click('#rotate-continue');check('portrait fallback keeps play available',await b.evaluate("document.getElementById('rotate-prompt').hidden"));
 await b.screenshot('qa-mobile-portrait.png');check('portrait fits without horizontal overflow',await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await b.click('#pause');const time=await b.evaluate('Lunaris.getState().evaTime');await delay(200);check('pause freezes EVA',await b.evaluate('Lunaris.getState().evaTime')===time);await b.click('#resume-button');
 await b.evaluate("Lunaris.goHome()");await b.click('#academy-open');check('academy opens',await b.evaluate("Lunaris.getScreen()==='academy'"));await b.screenshot('qa-academy.png');
 check('no runtime exceptions',b.errors.length===0);
 fs.writeFileSync(__dirname+'/../test-results/browser-results.json',JSON.stringify({passed:results.length,checks:results,errors:b.errors},null,2));console.log('DONE '+results.length);
 }finally{if(b.errors.length)console.error('BROWSER ERRORS',b.errors);await b.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
