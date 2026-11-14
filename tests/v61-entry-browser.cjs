const {launch,delay}=require('./browser-kit.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await launch(),checks=[];const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);console.log('PASS '+name);};
 try{
  await b.viewport(1440,1000);await b.call('Network.enable');
  await b.call('Network.setBlockedURLs',{urls:['*://127.0.0.1:4173/js/*','*://127.0.0.1:4173/css/*','*://127.0.0.1:4173/assets/*']});
  await b.navigate('expeditions-v6-1.html');await b.evaluate('LunarAcademyRender.preload()');
  check('fresh entry automatically opens playable academy',await b.evaluate("Lunaris.getScreen()==='academy'&&LunarAcademy.getState().scene.id==='hub'"));
  check('all four maps load even when every external game asset is blocked',await b.evaluate("['water','shield','comms','rover'].every(id=>LunarAcademyRender.assetStatus()[id]==='ready')&&document.querySelector('#boot-warning').hidden"));
  check('mission launcher shows four actual-art previews',await b.evaluate("document.querySelectorAll('.academy-card img').length===4&&Array.from(document.querySelectorAll('.academy-card img')).every(i=>i.complete&&i.naturalWidth>0)"));
  await b.evaluate("location.hash='water'");await b.wait("LunarAcademy.getState().active==='water'");await delay(300);await b.evaluate("document.querySelector('#pix-dialogue-close').click()");await b.screenshot('v61-direct-water.png');
  check('direct mission hash opens actual walking world',await b.evaluate("!!document.querySelector('#academy-play-canvas')&&!document.querySelector('#academy-visual')"));
  const x=await b.evaluate('LunarAcademy.getState().scene.player.x');await b.key('KeyD');await delay(250);await b.key('KeyD','keyUp');check('directly opened mission accepts keyboard movement',await b.evaluate(`LunarAcademy.getState().scene.player.x>${x}+15`));
  for(const id of ['shield','comms','rover']){await b.evaluate(`location.hash='${id}'`);await b.wait(`LunarAcademy.getState().active==='${id}'`);check(id+' direct link enters game canvas',await b.evaluate("!!document.querySelector('#academy-play-canvas')&&LunarAcademy.getState().phase==='experiment'"));}
  await b.navigate('index.html#story');await b.wait("Lunaris.getScreen()==='home'");check('homepage makes expeditions the primary action',await b.evaluate("document.querySelector('#academy-open').classList.contains('primary')&&document.querySelector('#academy-open').textContent.includes('6.1')"));
  await b.click('#academy-open');check('primary action enters updated missions',await b.evaluate("Lunaris.getScreen()==='academy'&&LunarAcademy.getState().scene.id==='hub'"));
  check('no exceptions in bundled direct routes',b.errors.length===0);
  const dir=process.env.LUNARIS_QA_OUTPUT||path.resolve(__dirname,'../test-results');fs.writeFileSync(path.join(dir,'v61-entry-results.json'),JSON.stringify({passed:checks.length,checks,errors:b.errors},null,2));console.log('DONE '+checks.length+' V6.1 entry checks');
 }catch(e){await b.screenshot('v61-entry-failure.png');throw e;}finally{await b.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
