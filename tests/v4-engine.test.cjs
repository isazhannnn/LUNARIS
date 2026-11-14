'use strict';
const assert=require('node:assert/strict');
const S=require('../js/engine.js'),W=require('../js/world.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
function outside(){let s=S.fresh();for(const a of ['power','air','grow','exit'])s=S.apply(s,a).state;return s;}

test('old saves without EVA timeline remain compatible',()=>{
  const s=outside();delete s.evaTime;for(const h of s.history)delete h.evaTime;
  assert.equal(S.validSave(s),true);S.advanceEVA(s,5);assert.equal(s.evaTime,5);
});
test('EVA timeline freezes inside and after a mission ends',()=>{
  const s=S.fresh();S.advanceEVA(s,200);assert.equal(s.evaTime,0);
  s.world='surface';s.ended=true;S.advanceEVA(s,200);assert.equal(s.evaTime,0);
});
test('event warning comes eight seconds before localized impacts',()=>{
  const s=outside();S.advanceEVA(s,20);let event=S.hazardState(s);
  assert.equal(event.kind,'micrometeorites');assert.equal(event.phase,'warning');assert.equal(event.remaining,8);
  s.player.x=event.zone.x;s.player.y=event.zone.y;assert.equal(S.hazardState(s).multiplier,1);
  S.advanceEVA(s,8);event=S.hazardState(s);assert.equal(event.phase,'active');assert.equal(event.multiplier,1.9);
});
test('moving clear of the announced impact circle avoids its extra cost',()=>{
  const s=outside();s.evaTime=29;s.player={x:620,y:490,facing:1};const e=S.hazardState(s);
  assert.equal(e.kind,'micrometeorites');assert.equal(e.phase,'active');assert.equal(e.exposed,false);assert.equal(e.multiplier,1);
});
test('radiation gives ten seconds of warning and rock shadow protects the suit',()=>{
  const s=outside();s.evaTime=54;let event=S.hazardState(s);
  assert.equal(event.kind,'radiation');assert.equal(event.phase,'warning');assert.equal(event.remaining,10);
  s.evaTime=64;s.player={x:620,y:490,facing:1};event=S.hazardState(s);assert.equal(event.multiplier,1.65);
  s.player={x:365,y:480,facing:1};assert.equal(W.canStand('surface',s.player.x,s.player.y),true);
  event=S.hazardState(s);assert.equal(event.sheltered,true);assert.equal(event.multiplier,1);
});
test('hatch safety area also protects from the radiation event',()=>{
  const s=outside();s.evaTime=70;assert.equal(S.hazardState(s).sheltered,true);assert.equal(S.hazardState(s).multiplier,1);
});
test('hazard warning and active state never directly consume resources or turns',()=>{
  const s=outside(),initial=S.copy(s);S.advanceEVA(s,70);
  for(const k of ['energy','air','water','crops','suit','turn','ended'])assert.equal(s[k],initial[k]);
  assert.deepEqual(s.trace,initial.trace);assert.deepEqual(s.history,initial.history);
});
test('event cycle is deterministic, bounded and alternates impact locations',()=>{
  const s=outside();s.evaTime=29;const first=S.hazardState(s);
  s.evaTime=125;const next=S.hazardState(s);assert.equal(next.cycle,1);assert.notDeepEqual(next.zone,first.zone);
  assert.deepEqual(S.hazardState(s),next);
  for(let n=0;n<300;n++){s.evaTime=n;const e=S.hazardState(s);assert.ok(e.remaining>=0);assert.ok(e.multiplier>=1&&e.multiplier<=1.9);}
});
test('invalid EVA deltas cannot corrupt a save or rewind clock backwards',()=>{
  const s=outside();S.advanceEVA(s,4);for(const dt of [NaN,Infinity,-1,0])S.advanceEVA(s,dt);
  assert.equal(s.evaTime,4);assert.equal(S.validSave(s),true);
  s.evaTime=-1;assert.equal(S.validSave(s),false);s.evaTime=Infinity;assert.equal(S.validSave(s),false);
});
test('hazard time and optional research survive save and decision rewind',()=>{
  let s=outside();S.advanceEVA(s,26.5);const before=S.copy(s);s=S.apply(s,'solar').state;
  assert.equal(S.validSave(JSON.parse(JSON.stringify(s))),true);assert.deepEqual(S.rewind(s),before);
});
test('surface guidance visits solar generation before the long-range antenna',()=>{
  let s=outside();assert.equal(W.target(s).id,'solar');s=S.apply(s,'solar').state;
  assert.equal(W.target(s).id,'antenna');s=S.apply(s,'antenna').state;assert.equal(W.target(s).id,'hatch');
});
test('guidance supplies consistent bearing, arrival and distance',()=>{
  const s=S.fresh();s.player={x:286,y:222,facing:1};let g=W.guidance(s);
  assert.equal(g.id,'power');assert.equal(g.distance,0);assert.equal(g.near,true);
  s.player={x:100,y:222,facing:1};g=W.guidance(s);assert.equal(g.bearing,'E');assert.equal(g.distance,186);assert.equal(g.near,false);
});
test('fresh missions get different seeds while explicit seeds reproduce equipment',()=>{
  const a=S.fresh(),b=S.fresh();assert.notEqual(a.puzzleSeed,b.puzzleSeed);
  assert.deepEqual(S.missionPuzzle(S.fresh('mission',101),'air'),S.missionPuzzle(S.fresh('mission',101),'air'));
});
test('generated circuit is unsolved but every tile can reach a connected solution',()=>{
  const arrangements=new Set();
  for(let seed=1;seed<=500;seed++){
    const p=S.missionPuzzle(S.fresh('mission',seed),'circuit');
    assert.equal(S.connected(p.tiles),false);assert.equal(S.connected(p.solution),true);
    for(let i=0;i<12;i++){
      let tile=p.tiles[i],reachable=false;
      for(let n=0;n<4;n++){if(tile===p.solution[i])reachable=true;tile=S.rotate(tile);}
      assert.equal(reachable,true);
    }
    arrangements.add(p.tiles.join(','));
  }
  assert.ok(arrangements.size>200);
});
test('air telemetry produces solvable varied arithmetic within the six-unit budget',()=>{
  const configurations=new Set();
  for(let seed=1;seed<=250;seed++){
    const p=S.missionPuzzle(S.fresh('mission',seed),'air');
    assert.deepEqual(p.requiredPower.map((n,i)=>n/p.unitPower[i]),p.target);
    assert.equal(p.target.reduce((a,b)=>a+b,0),6);assert.equal(S.validAir(...p.target,p.target),true);
    assert.equal(S.validAir(0,0,0,p.target),false);assert.equal(S.validAir(4,4,4,p.target),false);
    configurations.add(p.target.join(','));
  }
  assert.equal(configurations.size,10);
});
test('radio telemetry clues reconstruct a varied 100 percent signal target',()=>{
  const targets=new Set();
  for(let seed=1;seed<=250;seed++){
    const p=S.missionPuzzle(S.fresh('mission',seed),'radio');
    assert.deepEqual(p.reference.map((n,i)=>n-p.offset[i]),p.target);
    assert.equal(S.signal(...p.target,p.target),100);assert.ok(S.signal(...p.initial,p.target)<90);
    targets.add(p.target.join(','));
  }
  assert.ok(targets.size>200);
});
test('legacy saves retain the original mission puzzle answers',()=>{
  const s=S.fresh();delete s.puzzleSeed;
  assert.deepEqual(S.missionPuzzle(s,'circuit').tiles,S.puzzle);
  assert.deepEqual(S.missionPuzzle(s,'air').target,[2,3,1]);
  assert.deepEqual(S.missionPuzzle(s,'radio').target,[62,48]);assert.equal(S.validSave(s),true);
});
test('seed survives save, mission decisions and rewind without changing equipment',()=>{
  let s=S.fresh('mission',45938);const p=S.missionPuzzle(s,'radio');s=S.apply(s,'power').state;
  assert.equal(S.validSave(JSON.parse(JSON.stringify(s))),true);
  assert.deepEqual(S.missionPuzzle(S.rewind(s),'radio'),p);
  for(const seed of [0,-1,0.1,NaN,4294967296]){const bad=S.copy(s);bad.puzzleSeed=seed;assert.equal(S.validSave(bad),false);}
});
test('sabotage cases unlock in story order and teach reproducible telemetry calculations',()=>{
  let s=S.fresh('mission',1234);assert.equal(S.sabotageCase(s),null);
  for(const action of ['power','air'])s=S.apply(s,action).state;
  const air=S.sabotageCase(s);assert.equal(air.id,'air');assert.equal(air.result,air.a-air.b);
  assert.equal(air.options[air.correctIndex],air.result);assert.equal(new Set(air.options).size,3);
  assert.deepEqual(S.sabotageCase(JSON.parse(JSON.stringify(s))),air);
  assert.equal(S.sabotageCase(s,'power'),null);
});
test('wrong sabotage answers have no penalty, no history change and allow retry',()=>{
  const s=outside(),before=S.copy(s),diagnostic=S.sabotageCase(s);
  const r=S.resolveSabotage(s,diagnostic.id,(diagnostic.correctIndex+1)%3);
  assert.equal(r.ok,true);assert.equal(r.correct,false);assert.deepEqual(r.state,before);assert.deepEqual(s,before);
});
test('correct optional diagnostic grants a bounded actual reward once and costs no decision',()=>{
  const s=outside(),before=S.copy(s),diagnostic=S.sabotageCase(s);
  let r=S.resolveSabotage(s,diagnostic.id,diagnostic.correctIndex);assert.equal(r.correct,true);
  assert.equal(r.state.air,Math.min(100,s.air+6));assert.equal(r.state.turn,s.turn);assert.deepEqual(r.state.trace,s.trace);
  assert.deepEqual(s,before);assert.equal(S.validSave(r.state),true);
  assert.equal(S.resolveSabotage(r.state,diagnostic.id,diagnostic.correctIndex).ok,false);
  assert.deepEqual(S.rewind(r.state),before);
});
test('second sabotage uses solar electrical power multiplication and rejects malformed resolution',()=>{
  let s=outside();s=S.apply(s,'antenna').state;
  const p=S.sabotageCase(s,'power');assert.equal(p.result,p.a*p.b);assert.equal(p.reward,'energy');
  assert.equal(S.resolveSabotage(s,'power',NaN).ok,false);assert.equal(S.resolveSabotage(s,'fake',0).ok,false);
  s=S.resolveSabotage(s,'power',p.correctIndex).state;assert.equal(S.validSave(s),true);
  s.sabotageResolved=['air','air'];assert.equal(S.validSave(s),false);
});
console.log(`\n${passed} V4 hazard, guidance, puzzle variation and sabotage tests passed.`);
