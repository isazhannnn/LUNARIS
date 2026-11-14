from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]; checks=[]
def ok(label,condition):
    if not condition: raise AssertionError(label)
    checks.append(label)
    print('OK',label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1440,900),(390,844),(320,670)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<500,has_touch=width<500)
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((ROOT/'LUNARIS-Play.html').read_text(encoding='utf-8'),wait_until='load')
  ok(f'{width} home shows academy',page.locator('#academy-open').is_visible())
  page.locator('#academy-open').click()
  ok(f'{width} academy has four missions',page.locator('.academy-card').count()==4)
  ok(f'{width} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
  if width==1440:page.screenshot(path=str(ROOT.parent/'academy-home.png'),full_page=True)
  page.locator('.academy-launch').nth(0).click()
  ok(f'{width} water puzzle 5 empty slots',page.locator('.academy-step').count()==5)
  # Select steps in correct order using UI.
  for name in ['Собрать конденсат','Убрать крупные примеси','Очистить воду','Проверить качество','Направить в резервуар']:
   page.get_by_role('button',name=name,exact=True).click()
  page.get_by_role('button',name='Проверить',exact=True).click()
  ok(f'{width} water completed experiment',page.get_by_text('Эксперимент выполнен!').is_visible())
  page.get_by_role('button',name='Проверь знания →').click()
  page.get_by_role('button',name='Чтобы убедиться, что она безопасна').click()
  page.get_by_role('button',name='Ответить').click()
  ok(f'{width} water quiz passed',page.get_by_text('Уровень пройден!').is_visible())
  page.get_by_role('button',name='Другой уровень →').click()
  page.locator('.academy-launch').nth(1).click()
  page.get_by_role('button',name='Вода Масса 4 · Защита 4').click()
  page.get_by_role('button',name='Полимер Масса 3 · Защита 4').click()
  page.get_by_role('button',name='Проверить',exact=True).click()
  ok(f'{width} shield complete',page.get_by_text('Эксперимент выполнен!').is_visible())
  page.get_by_role('button',name='Проверь знания →').click()
  page.get_by_role('button',name='Масса и ресурсы ограничены').click()
  page.get_by_role('button',name='Ответить').click()
  page.get_by_role('button',name='Другой уровень →').click()
  page.locator('.academy-launch').nth(2).click()
  page.locator('.academy-range').evaluate('(e)=>{e.value=2.6;e.dispatchEvent(new Event("input",{bubbles:true}));}')
  page.get_by_role('button',name='Проверить',exact=True).click()
  ok(f'{width} comms complete',page.get_by_text('Эксперимент выполнен!').is_visible())
  page.get_by_role('button',name='Проверь знания →').click()
  page.get_by_role('button',name='Свету нужно время на путь').click()
  page.get_by_role('button',name='Ответить').click()
  page.get_by_role('button',name='Другой уровень →').click()
  page.locator('.academy-launch').nth(3).click()
  ok(f'{width} rover starts',page.get_by_text('Батарея: 40').is_visible())
  # Find shortest path on the exposed engine, using deterministic costs.
  route=page.evaluate('''()=>{
   const rules=window.LunarAcademyRules,goal=[7,1],start=[0,6];
   let heap=[[0,0,6,[]]],seen=new Map();
   while(heap.length){heap.sort((a,b)=>a[0]-b[0]);const [d,x,y,path]=heap.shift();if((seen.get(x+","+y)??Infinity)<=d)continue;seen.set(x+","+y,d);
    if(x===goal[0]&&y===goal[1])return path;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(!rules.canStep(nx,ny))continue;
      heap.push([d+(nx>=4&&ny<=2?2:1),nx,ny,[...path,[dx,dy]]]);
    }
   } return [];
  }''')
  arrows={(1,0):'▶',(-1,0):'◀',(0,1):'▼',(0,-1):'▲'}
  for dx,dy in route:page.get_by_role('button',name=arrows[(dx,dy)],exact=True).click()
  ok(f'{width} rover reached sample',page.evaluate('LunarAcademy.getState().data.x===7&&LunarAcademy.getState().data.y===1'))
  page.get_by_role('button',name='Взять образец').click()
  for dx,dy in route[::-1]:page.get_by_role('button',name=arrows[(-dx,-dy)],exact=True).click()
  page.get_by_role('button',name='Проверить',exact=True).click()
  ok(f'{width} rover complete',page.get_by_text('Эксперимент выполнен!').is_visible())
  page.get_by_role('button',name='Проверь знания →').click()
  page.get_by_role('button',name='Солнечный свет туда почти не попадает').click()
  page.get_by_role('button',name='Ответить').click()
  ok(f'{width} four completed badges',sum(page.evaluate('Object.values(LunarAcademy.progress()).map(Boolean)'))==4)
  page.locator('#language').click()
  ok(f'{width} English translation',page.get_by_text('Level complete!').is_visible())
  ok(f'{width} no overflow after locale',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  if width==390:page.screenshot(path=str(ROOT.parent/'academy-mobile.png'),full_page=True)
  page.locator('#academy-back').click()
  ok(f'{width} return to main menu',page.locator('#start').is_visible())
  page.locator('#start').click()
  ok(f'{width} story campaign still starts',page.locator('#brief-begin').is_visible())
  ctx.close()
 ok('no page errors',not errors)
 browser.close()
print('Passed',len(checks),'checks')
