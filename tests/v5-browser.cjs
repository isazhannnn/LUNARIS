/* Real input-driven walkthrough of the V5 science worlds. No mutation of live game state. */
const {launch,delay}=require('./browser-kit.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const b=await launch(),checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);console.log('PASS '+name);};
 async function domClick(selector){await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(80);}
 async function walk(id){
  const target=await b.evaluate(`LunarAcademy.getState().scene.stations.find(s=>s.id===${JSON.stringify(id)})`);if(!target)throw Error('Missing station '+id);
  const initial=await b.evaluate('LunarAcademy.getState().scene.player'),dx=target.x-initial.x,dy=target.y-initial.y;
  if(Math.abs(dx)>23&&Math.abs(dy)>23){const cx=dx>0?'KeyD':'KeyA',cy=dy>0?'KeyS':'KeyW';await b.key(cx);await b.key(cy);await b.wait(`Math.abs(LunarAcademy.getState().scene.player.x-${target.x})<23||Math.abs(LunarAcademy.getState().scene.player.y-${target.y})<23`,12000);await b.key(cx,'keyUp');await b.key(cy,'keyUp');}
  for(const axis of ['x','y']){
   const current=await b.evaluate(`LunarAcademy.getState().scene.player.${axis}`),difference=target[axis]-current;
   if(Math.abs(difference)<22)continue;
   const code=axis==='x'?(difference>0?'KeyD':'KeyA'):(difference>0?'KeyS':'KeyW');
   await b.key(code);await b.wait(`Math.abs(LunarAcademy.getState().scene.player.${axis}-${target[axis]})<23`,12000);await b.key(code,'keyUp');
  }
  await b.wait(`LunarAcademyPlay.nearest(LunarAcademy.getState().scene)?.id===${JSON.stringify(id)}`);await b.key('KeyE');await b.key('KeyE','keyUp');await delay(100);
 }
 async function select(id){await b.evaluate(`(()=>{LunarAcademy.startSelection();const ids=['water','shield','comms','rover'];document.querySelectorAll('.academy-launch')[ids.indexOf(${JSON.stringify(id)})].click()})()`);await b.wait(`LunarAcademy.getState().active===${JSON.stringify(id)}&&!!document.querySelector('#academy-play-canvas')`);await delay(200);}
 async function finishQuiz(id){
  await b.wait("LunarAcademy.getState().phase==='science'",5000);check(id+' physical mission completes',true);
  await domClick('#academy-work>.primary');const index=await b.evaluate('LunarAcademy.getState().variant.quizIndex');const answers={water:[1,0,1],shield:[0,1,2],comms:[1,2,0],rover:[0,1,0]};await domClick(`[data-answer="${answers[id][index]}"]`);await domClick('#academy-work>.primary');check(id+' knowledge check awards badge',await b.evaluate("LunarAcademy.getState().phase==='complete'"));
 }
 try{
  await b.call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'language',{get:()=> 'ru-RU'});"});
  await b.viewport(1440,1000);await b.navigate();await b.evaluate('localStorage.clear()');await b.navigate();
  check('V5 and Parsec Studio branding load',await b.evaluate("Lunaris.version==='5.0'&&document.title.includes('Parsec Studio')"));
  await b.click('#start');await domClick('#brief-begin');check('main mission retained',await b.evaluate('Lunaris.getState().chapter===0'));
  await domClick('#pix-dialogue-close');await b.evaluate('Lunaris.goHome()');await b.click('#academy-open');
  check('academy is a walkable hub',await b.evaluate("LunarAcademy.getState().scene.id==='hub'"));await delay(350);await b.screenshot('v5-academy-hub.png');
  const x=await b.evaluate('LunarAcademy.getState().scene.player.x');await b.key('KeyD');await delay(300);await b.key('KeyD','keyUp');check('hub keyboard moves astronaut',await b.evaluate(`LunarAcademy.getState().scene.player.x>${x}+20`));
  await walk('water');check('walking through lab door launches mission',await b.evaluate("LunarAcademy.getState().active==='water'"));
  await walk('prefilter');check('water rejects wrong physical station',await b.evaluate('LunarAcademy.getState().scene.completed.length===0'));
  for(const id of ['collect','prefilter','purify','test'])await walk(id);
  check('processed sample is carried',await b.evaluate("LunarAcademy.getState().scene.carrying==='water_tested'"));await b.screenshot('v5-water.png');await walk('store');await finishQuiz('water');
  await select('shield');const pair=await b.evaluate("(()=>{const s=LunarAcademy.getState(),m=LunarAcademyPlay.materials,ids=Object.keys(m);for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(m[ids[i]].mass+m[ids[j]].mass<=s.variant.shield.maxMass&&m[ids[i]].shield+m[ids[j]].shield>=s.variant.shield.minProtection)return[ids[i],ids[j]];throw Error('Unsolvable shield')})()");
  await walk(pair[0]);check('shield material physically picked up',await b.evaluate(`LunarAcademy.getState().scene.carrying===${JSON.stringify(pair[0])}`));await b.screenshot('v5-shield-carry.png');await walk('shelter');check('shelter installs carried panel',await b.evaluate('LunarAcademy.getState().scene.installed.length===1'));
  await walk(pair[1]);await walk('shelter');await finishQuiz('shield');
  await select('comms');await walk('antenna');check('antenna requires calibration first',await b.evaluate("!LunarAcademy.getState().scene.completed.includes('antenna')"));await walk('power');await walk('timing');
  check('physical timing console opens',await b.evaluate("!!document.querySelector('#academy-timing-range')"));await b.evaluate("(()=>{const e=document.querySelector('#academy-timing-range');e.value=LunarAcademy.getState().variant.roundTrip;e.dispatchEvent(new Event('input'))})()");await domClick('#academy-timing-submit');check('calculation calibrates signal',await b.evaluate("LunarAcademy.getState().scene.completed.includes('timing')"));
  await b.screenshot('v5-comms.png');await walk('antenna');await walk('receiver');
  if(await b.evaluate("LunarAcademy.getState().phase==='experiment'&&!LunarAcademy.getState().scene.success")){await b.wait('LunarAcademy.getState().scene.replyRemaining<=0',6000);await b.key('KeyE');await b.key('KeyE','keyUp');}
  await finishQuiz('comms');
  await select('rover');await walk('kit');await walk('rover');check('astronaut boards driveable rover',await b.evaluate('LunarAcademy.getState().scene.driving'));
  await walk('sample');check('expedition collects sample',await b.evaluate('LunarAcademy.getState().scene.sample'));await b.screenshot('v5-rover.png');await walk('base');await finishQuiz('rover');
  check('four V5 badges recorded',await b.evaluate('Object.values(LunarAcademy.progress()).filter(Boolean).length===4'));
  await select('water');const seed=await b.evaluate('LunarAcademy.getState().variant.seed');await b.click('#language');check('language change preserves physical scene',await b.evaluate(`document.documentElement.lang==='en'&&LunarAcademy.getState().variant.seed===${seed}`));await b.click('#language');
  await b.viewport(844,390,true);await delay(200);if(await b.evaluate("!document.querySelector('#rotate-prompt').hidden"))await domClick('#rotate-continue');await b.screenshot('v5-academy-landscape.png');
  check('landscape academy canvas visible',await b.evaluate("document.querySelector('#academy-play-canvas').getBoundingClientRect().height>=150"));check('landscape has no horizontal overflow',await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  const rect=await b.evaluate("(()=>{const r=document.querySelector('#academy-joystick').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()"),before=await b.evaluate('LunarAcademy.getState().scene.player.x');
  await b.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});await b.call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+25,y:rect.y}]});await delay(400);await b.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('academy touch joystick moves hero',await b.evaluate(`LunarAcademy.getState().scene.player.x>${before}+20`));
  await b.viewport(390,844,true);await delay(150);if(await b.evaluate("!document.querySelector('#rotate-prompt').hidden"))await domClick('#rotate-continue');await b.screenshot('v5-academy-portrait.png');check('portrait academy has no overflow',await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  check('no JavaScript exceptions',b.errors.length===0);
  const dir=process.env.LUNARIS_QA_OUTPUT?path.resolve(process.env.LUNARIS_QA_OUTPUT):path.resolve(__dirname,'../test-results');fs.writeFileSync(path.join(dir,'v5-browser-results.json'),JSON.stringify({passed:checks.length,checks,errors:b.errors},null,2));console.log('DONE '+checks.length+' V5 checks');
 }catch(error){await b.screenshot('v5-browser-failure.png');throw error;}finally{if(b.errors.length)console.error(b.errors);await b.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
