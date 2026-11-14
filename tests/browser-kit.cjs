const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(){
 const root=process.env.LUNARIS_QA_ROOT?path.resolve(process.env.LUNARIS_QA_ROOT):path.resolve(__dirname,'..'); const evidenceDir=process.env.LUNARIS_QA_OUTPUT?path.resolve(process.env.LUNARIS_QA_OUTPUT):path.join(root,'test-results');fs.mkdirSync(evidenceDir,{recursive:true});
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
  const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
  try{const data=fs.readFileSync(target);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'})[path.extname(target)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 const browserPath=process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));if(!browserPath){server.close();throw Error('Set CHROME_PATH to a Chromium browser executable');} const chrome=spawn(browserPath,['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9229','--remote-allow-origins=*','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disk-cache-size=1048576','--disable-extensions','--mute-audio','--disable-features=Translate,OptimizationHints,OptimizationTargetPrediction,OptimizationGuideModelDownloading,OnDeviceModel,ModelExecution,MediaRouter','--user-data-dir='+path.join(evidenceDir,'qa-profile-'+Date.now()).replaceAll('\\','/'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let log='';chrome.stderr.on('data',data=>log+=data.toString());chrome.on('error',e=>log+=e.message);chrome.on('exit',code=>log+='EXIT '+code);
 let tabs;for(let i=0;i<80;i++){try{tabs=await fetch('http://127.0.0.1:9229/json').then(r=>r.json());if(tabs.length)break;}catch{}await delay(150);}
 if(!tabs?.length){chrome.kill();server.close();throw Error('Chrome debugging endpoint unavailable: '+log);}
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{const item=JSON.parse(e.data);if(item.id){const call=pending.get(item.id);if(!call)return;pending.delete(item.id);if(item.error)call.reject(Error(JSON.stringify(item.error)));else call.resolve(item.result);}else if(item.method==='Runtime.exceptionThrown')errors.push(item.params.exceptionDetails.exception?.description||item.params.exceptionDetails.text);};
 ws.onclose=()=>{for(const request of pending.values())request.reject(Error('Chrome debugging connection closed'));pending.clear();};
 function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});}
 await call('Page.enable');await call('Runtime.enable');
 async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 async function wait(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await delay(70);}throw Error('Timed out: '+expression);}
 async function click(selector){const r=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||!n.getClientRects().length)throw Error('Missing or hidden: '+${JSON.stringify(selector)});n.scrollIntoView({block:'center',inline:'nearest'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});await delay(80);}
 async function key(code,type='keyDown'){const map={KeyE:'e',KeyN:'n',KeyM:'m',KeyJ:'j',KeyQ:'q',KeyL:'l',KeyX:'x',KeyD:'d',KeyW:'w',KeyA:'a',KeyS:'s',Space:' ',Escape:'Escape',ShiftLeft:'Shift'};await call('Input.dispatchKeyEvent',{type,code,key:map[code]||code,windowsVirtualKeyCode:code==='Escape'?27:code==='Space'?32:code==='ShiftLeft'?16:(map[code]||'').toUpperCase().charCodeAt(0)});}
 async function screenshot(name){if(process.env.LUNARIS_QA_SKIP_SCREENSHOTS==='1')return;const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(evidenceDir,name),Buffer.from(r.data,'base64'));}
 async function viewport(width,height,mobile=false){await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1});await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});}
 async function navigate(page='index.html'){const target=new URL(page,'http://127.0.0.1:4173/');target.searchParams.set('qaNav',String(Date.now()));const url=target.href;await call('Page.navigate',{url});await wait('document.readyState==="complete"&&location.href==='+JSON.stringify(url)+'&&!!window.Lunaris');await delay(120);}
 async function cleanup(){try{await call('Browser.close');}catch{}ws.close();chrome.kill();await new Promise(r=>server.close(r));}
 return {call,evaluate,wait,click,key,screenshot,viewport,navigate,cleanup,errors,delay};
}
module.exports={launch,delay};
