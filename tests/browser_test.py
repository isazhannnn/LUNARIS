"""UI tests use bundled HTML; managed Chromium blocks URL navigation.
Save tests use an explicit test-only in-memory Storage API fixture.
"""
from pathlib import Path
import json
import time
START=time.monotonic()
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'LUNARIS-Play.html').read_text(encoding='utf-8')
RESULTS=[]
ERRORS=[]

def check(name,value):
    if not value: raise AssertionError(name)
    RESULTS.append(name);print(f'{time.monotonic()-START:5.1f}s PASS',name,flush=True)
    (ROOT/'docs'/'browser-checks-progress.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2),encoding='utf-8')

def storage_html(seed=None):
    payload=json.dumps(seed or {},ensure_ascii=False).replace('</','<\\/')
    fixture='''<script>(()=>{const store=PAYLOAD;
    const storage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?String(store[k]):null,
    setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},clear:()=>{Object.keys(store).forEach(k=>delete store[k])},
    key:i=>Object.keys(store)[i]??null,get length(){return Object.keys(store).length}};
    Object.defineProperty(window,'localStorage',{configurable:true,value:storage});window.__testStorage=store;})();</script>'''.replace('PAYLOAD',payload)
    return HTML.replace('<head>','<head>'+fixture,1)

def mount(old_page,seed=None):
    page=old_page.context.new_page()
    page.set_default_timeout(10000)
    page.on('pageerror',lambda e:ERRORS.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    old_page.close()
    page.set_content(storage_html(seed),wait_until='load')
    page.wait_for_function('window.Lunaris && window.LunarSim')
    page.evaluate('window.focus()')
    return page

def state(page):return page.evaluate('Lunaris.getState()')
def brief(page):page.locator('#brief-begin').click()

def travel(page,target):
    positions=page.evaluate('s=>s.world==="base"?LunarWorld.terminals:LunarWorld.surface',state(page))
    o=next(o for o in positions if o['id']==target)
    page.locator('#map').click();b=page.locator('#map-canvas').bounding_box()
    page.mouse.click(b['x']+o['x']/1200*b['width'],b['y']+o['y']/780*b['height'])
    page.wait_for_function('(id)=>LunarWorld.nearest(Lunaris.getState())?.id===id',arg=target,timeout=20000)
    page.keyboard.press('KeyE');page.wait_for_function('!document.getElementById("modal").hidden')

def make_state(page,actions,position=None):
    s=page.evaluate('actions=>{let s=LunarSim.fresh();for(const a of actions){const r=LunarSim.apply(s,a);if(!r.ok)throw Error(a);s=r.state;}return s}',actions)
    if position:s['player'].update(position)
    return s

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
    page=ctx.new_page();page.on('pageerror',lambda e:ERRORS.append(str(e)))
    requests=[];page.on('request',lambda r:requests.append(r.url))
    page=mount(page)
    check('home loads without JavaScript errors',page.locator('#home').is_visible() and not ERRORS)
    page.screenshot(path=str(ROOT.parent/'LUNARIS-home.png'),full_page=True)
    page.locator('#start').click();brief(page)
    check('mission starts at chapter one',state(page)['chapter']==0 and state(page)['turn']==0)
    page.screenshot(path=str(ROOT.parent/'LUNARIS-game.png'),full_page=True)
    travel(page,'power');page.locator('#circuit-submit').click()
    check('incomplete circuit costs no turn',state(page)['turn']==0 and bool(page.locator('#puzzle-error').inner_text()))
    rotations=page.evaluate('()=>LunarSim.puzzle.map((v,i)=>{let n=0;while(v!==LunarSim.solution[i]&&n<4){v=LunarSim.rotate(v);n++}return n})')
    for i,n in enumerate(rotations):
        for _ in range(n):page.locator(f'[data-tile="{i}"]').click()
    page.locator('#modal-language').click()
    check('language switch preserves solved puzzle',page.locator('.circuit-state').inner_text()=='CIRCUIT COMPLETE' and state(page)['turn']==0)
    page.screenshot(path=str(ROOT.parent/'LUNARIS-circuit.png'),full_page=True)
    page.locator('#circuit-submit').click();brief(page)
    check('circuit repair advances chapter',state(page)['chapter']==1 and state(page)['grid'])
    travel(page,'air');page.locator('#air-submit').click()
    check('invalid air allocation is rejected',state(page)['chapter']==1 and bool(page.locator('#puzzle-error').inner_text()))
    page.locator('#air-plus-0').click();page.locator('#air-plus-1').click();page.locator('#air-plus-1').click()
    page.locator('#air-submit').click();brief(page)
    check('2/3/1 life support succeeds',state(page)['life'] and state(page)['chapter']==2)
    travel(page,'garden');page.locator('#choose-grow').click();brief(page)
    check('greenhouse changes real resources',state(page)['garden']=='grow' and state(page)['water']==56)
    travel(page,'airlock');page.locator('#exit-submit').click()
    check('airlock changes map and equips suit',state(page)['world']=='surface' and state(page)['suit']>99)
    page.wait_for_timeout(800);a=state(page)['suit'];page.wait_for_timeout(700)
    check('suit drains on active surface',state(page)['suit']<a)
    page.locator('#pause').click();a=state(page)['suit'];page.wait_for_timeout(700)
    check('pause freezes suit',state(page)['suit']==a);page.locator('#resume-button').click()
    travel(page,'solar');page.locator('#solar-submit').click()
    check('solar repair enables generation',state(page)['solar'])
    travel(page,'antenna');page.locator('#radio-submit').click()
    check('weak signal cannot complete repair',state(page)['comms'] is None and bool(page.locator('#puzzle-error').inner_text()))
    for sel,v in [('#radio-0','62'),('#radio-1','48')]:page.locator(sel).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',v)
    check('radio controls calculate actual peak','100 / 100' in page.locator('#radio-quality').inner_text())
    page.screenshot(path=str(ROOT.parent/'LUNARIS-radio.png'),full_page=True)
    page.locator('#radio-submit').click();brief(page)
    check('antenna completes chapter four',state(page)['signal']==100 and state(page)['chapter']==4)
    page.screenshot(path=str(ROOT.parent/'LUNARIS-surface.png'),full_page=True)
    travel(page,'hatch');page.locator('#enter-submit').click()
    travel(page,'shelter');page.locator('#choose-waterShield').click()
    page.locator('#action').click();page.locator('#seal-submit').click();result=state(page)
    check('full browser playthrough reaches Last Signal',result['ending']=='lastSignal' and result['turn']==11)
    check('browser outcome matches model',(result['energy'],result['water'],result['crops'])==(38,20,81))
    page.wait_for_timeout(3600);page.screenshot(path=str(ROOT.parent/'LUNARIS-ending.png'),full_page=True)
    page.locator('.decision').first.click()
    check('replay selects actual history',page.locator('.decision').first.evaluate('e=>e.classList.contains("selected")'))
    page.locator('#rewind-button').click()
    check('rewind restores pre-shelter state',not state(page)['ended'] and state(page)['turn']==8)
    page.locator('#action').click();page.locator('#seal-submit').click()
    check('same decision is reproducible',state(page)['energy']==38 and state(page)['ending']=='lastSignal')
    seed=page.evaluate('({...window.__testStorage})');page=mount(page,seed);page.locator('#continue').click()
    check('Storage API fixture restores ending',state(page)['ending']=='lastSignal')
    page.locator('#play-again').click();brief(page)
    check('restart resets history/resources',state(page)['turn']==0 and not state(page)['trace'] and state(page)['energy']==80)
    midway=make_state(page,['power','air'],{'x':680,'y':225})
    page=mount(page,{'lunaris.save.v1':json.dumps(midway),'lunaris.language':'en'});page.locator('#continue').click()
    check('save resumes chapter and position',state(page)['chapter']==2 and state(page)['player']['x']==680)
    check('saved language restores',page.locator('html').get_attribute('lang')=='en')
    for name,actions in [('seedKeepers',['power','air','seeds','exit','antenna','enter','cargoShield','seal']),('safeHarbor',['power','air','seeds','beacon','cargoShield','seal']),('airLost',['wait']*11)]:
        value=make_state(page,actions);page=mount(page,{'lunaris.save.v1':json.dumps(value)});page.locator('#continue').click()
        check('end-screen renders '+name,state(page)['ending']==name and page.locator('#ending').is_visible())
    page=mount(page,{'lunaris.save.v1':'{broken'})
    check('corrupt save does not crash startup',not page.locator('#continue').is_visible())
    page.locator('#start').click();brief(page)
    for width,height in [(320,640),(375,812),(390,844),(430,932),(768,1024),(1024,768),(1440,900),(1920,1080),(844,390)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
        dims=page.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})')
        check(f'no horizontal overflow {width}x{height}',dims['s']<=dims['w'])
        page.locator('#journal').click()
        fits=page.locator('.modal-panel').evaluate('e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight+1}')
        check(f'dialog fits {width}x{height}',fits);page.locator('#modal-close').click()
    mobile_ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    mobile=mobile_ctx.new_page();mobile.on('pageerror',lambda e:ERRORS.append(str(e)));mobile=mount(mobile)
    mobile.locator('#start').tap();mobile.locator('#brief-begin').tap()
    x1=state(mobile)['player']['x'];b=mobile.locator('[data-dir="right"]').bounding_box()
    mobile.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2);mobile.mouse.down();mobile.wait_for_timeout(350);mobile.mouse.up()
    x2=state(mobile)['player']['x'];mobile.wait_for_timeout(250);x3=state(mobile)['player']['x']
    check('mobile directional pointer moves and releases',x2>x1 and abs(x3-x2)<1)
    cdp=mobile_ctx.new_cdp_session(mobile);b=mobile.locator('[data-dir="left"]').bounding_box();before=state(mobile)['player']['x']
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]});mobile.wait_for_timeout(280)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    check('emulated touch controls move astronaut',state(mobile)['player']['x']<before)
    mobile.wait_for_timeout(3600);mobile.screenshot(path=str(ROOT.parent/'LUNARIS-mobile.png'),full_page=True)
    mobile.locator('#action').tap();check('mobile Action opens terminal',mobile.locator('#modal').is_visible())
    mobile.locator('#modal-language').tap();check('mobile dialog language toggle works',mobile.locator('html').get_attribute('lang')=='en');mobile.locator('#modal-close').tap()
    page.close();page=ctx.new_page();page.on('pageerror',lambda e:ERRORS.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.set_viewport_size({'width':1440,'height':900});page.set_content(HTML,wait_until='load');page.locator('#start').click();brief(page)
    check('blocked localStorage fallback remains playable',state(page)['chapter']==0 and page.locator('#game').is_visible())
    check('zero runtime network requests',not requests)
    check('zero JavaScript errors',not ERRORS)
    browser.close()
report={'browser':'Chromium in managed container','method':'set_content + standalone; explicit test-only in-memory Storage fixture','passed':len(RESULTS),'checks':RESULTS,'javascript_errors':ERRORS,'runtime_network_requests':requests}
(ROOT/'docs'/'browser-test-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'\n{len(RESULTS)} browser checks passed.',flush=True)
