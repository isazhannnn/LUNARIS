from pathlib import Path
import subprocess,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'LUNARIS-Play.html').read_text()
state=json.loads(subprocess.check_output(['node','-e',f"console.log(JSON.stringify(require('{ROOT}/js/engine.js').fresh()))"]).decode())
checks=[];errors=[]
def check(name, ok):
 if not ok:raise AssertionError(name)
 checks.append(name);print('PASS',name,flush=True)
def make_html(s):
 payload=json.dumps({'lunaris.save.v1':json.dumps(s),'lunaris.language':'ru'},ensure_ascii=False)
 script="""<script>(()=>{const items=DATA;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>items[k]??null,setItem:(k,v)=>items[k]=String(v),removeItem:k=>delete items[k]}});})();</script>""".replace('DATA',payload)
 return html.replace('<head>','<head>'+script,1)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1440,900),(320,700),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=width<500,has_touch=width<500)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  local=dict(state);local['player']={'x':578,'y':283,'facing':1}
  page.set_content(make_html(local),wait_until='load');page.locator('#continue').click()
  check(f'{width}px: HUD renders',page.locator('#research-count').inner_text()=='◇ 0/3')
  page.locator('#scan').click()
  check(f'{width}px: spectrum scanner opens',page.locator('.scanner-spectrum').is_visible())
  page.locator('.scan-range').evaluate('(e)=>{e.value=31;e.dispatchEvent(new Event("input",{bubbles:true}));}')
  check(f'{width}px: tuned signal matches',page.locator('.scanner-strength b').inner_text()=='100%')
  page.locator('#scan-submit').click();check(f'{width}px: scientific reward applied',page.evaluate('Lunaris.getState().air')==81)
  page.locator('#modal-close').click()
  check(f'{width}px: research count increments',page.locator('#research-count').inner_text()=='◇ 1/3')
  check(f'{width}px: no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.locator('#lab').click()
  check(f'{width}px: scenario lab opens',page.locator('.lab-card').count()==2)
  check(f'{width}px: prediction does not consume turns',page.evaluate('Lunaris.getState().turn')==0)
  if width==320:
   page.screenshot(path=str(ROOT.parent/'LUNARIS-v2-mobile-lab.png'),full_page=True)
  page.locator('#modal-close').click()
  if width==1440:page.screenshot(path=str(ROOT.parent/'LUNARIS-v2-scanner-post.png'),full_page=True)
  context.close()
 check('no JavaScript page errors',not errors)
 browser.close()
print(f'{len(checks)} new browser checks passed')
