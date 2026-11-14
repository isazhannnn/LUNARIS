/* Root URL acceptance: actual mission buttons and keyboard/touch input. */
const {launch,delay}=require('./browser-kit.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await launch(),checks=[];function check(name,ok){if(!ok)throw Error(name);checks.push(name);console.log('PASS '+name);}
 try{
  await b.viewport(1440,1000);await b.navigate('');await b.evaluate('LunarAcademyRender.preload()');
  check('root URL opens main menu',await b.evaluate("location.pathname==='/'&&Lunaris.getScreen()==='home'&&!document.querySelector('#home').hidden&&document.querySelector('#academy').hidden"));
  check('all four illustrated locations are loaded',await b.evaluate("['water','shield','comms','rover'].every(id=>LunarAcademyRender.assetStatus()[id]==='ready')&&document.querySelector('#boot-warning').hidden"));
  await b.click('#academy-open');check('menu action opens playable expedition hub',await b.evaluate("Lunaris.getScreen()==='academy'&&LunarAcademy.getState().scene.id==='hub'"));
  check('all four missions are offered',await b.evaluate("document.querySelectorAll('.academy-launch').length===4"));
  await b.evaluate("document.querySelector('#academy-back').click()");await delay(150);check('return to story menu is usable',await b.evaluate("Lunaris.getScreen()==='home'"));
  await b.navigate('index.html');check('index URL also opens main menu',await b.evaluate("Lunaris.getScreen()==='home'&&!document.querySelector('#home').hidden"));await b.click('#academy-open');
  for(const [i,id]of ['water','shield','comms','rover'].entries()){
   await b.viewport(1440,1000);if(i>0)await b.evaluate('LunarAcademy.startSelection()');
   await b.click(`.academy-card[data-mission=${id}] .academy-launch`);await b.wait(`LunarAcademy.getState().active==='${id}'`);await b.evaluate("document.querySelector('#pix-dialogue-close').click();document.querySelector('#academy-play-canvas').scrollIntoView({block:'center'})");await delay(160);
   check(id+' opens an illustrated playable scene',await b.evaluate(`LunarAcademy.getState().scene.id==='${id}'&&!!document.querySelector('#academy-play-canvas')&&LunarAcademyRender.assetStatus()['${id}']==='ready'`));
   const before=await b.evaluate('LunarAcademy.getState().scene.player.x');await b.key('KeyD');await delay(220);await b.key('KeyD','keyUp');check(id+' hero responds to keyboard',await b.evaluate(`LunarAcademy.getState().scene.player.x>${before}+15`));
  }
  await b.viewport(844,390,true);await b.evaluate("document.querySelector('#rotate-continue').click();LunarAcademy.openMission('water');document.querySelector('#pix-dialogue-close').click();document.querySelector('#academy-play-canvas').scrollIntoView({block:'center'})");await delay(200);
  const stick=await b.evaluate("(()=>{const r=document.querySelector('#academy-joystick').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()"),x=await b.evaluate('LunarAcademy.getState().scene.player.x');
  await b.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});await b.call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x+25,y:stick.y}]});await delay(300);await b.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check('phone joystick moves hero from main entry',await b.evaluate(`LunarAcademy.getState().scene.player.x>${x}+15`));
  check('phone layout has no horizontal overflow',await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await b.viewport(1440,1000);await b.navigate('index.html#story');check('explicit story URL remains available',await b.evaluate("Lunaris.getScreen()==='home'"));
  check('no JavaScript exceptions',b.errors.length===0);
  const dir=process.env.LUNARIS_QA_OUTPUT||path.resolve(__dirname,'../test-results');fs.writeFileSync(path.join(dir,'main-entry-results.json'),JSON.stringify({passed:checks.length,checks,errors:b.errors},null,2));console.log('DONE '+checks.length+' main URL checks');
 }catch(e){await b.screenshot('main-entry-failure.png');throw e;}finally{await b.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
