'use strict';
const assert=require('node:assert/strict'),P=require('../js/academy-play.js'),R=require('../js/academy.js');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
function at(s,id){const p=s.stations.find(x=>x.id===id);return {...s,player:{...s.player,x:p.x,y:p.y}};}
function solve(s){const c=P.challengeState(s);if(!c)return s;let values;
 if(c.id==='flow'){for(let a=0;a<=6;a++)for(let b=0;b<=6;b++)if(a*2+b*3===c.target&&a+b<=c.maxUnits)values=[a,b];}
 if(c.id==='shield'){outer:for(let a=0;a<15;a++)for(let ar=0;ar<2;ar++)for(let b=0;b<15;b++)for(let br=0;br<2;br++){const r=P.setChallenge(s,[a,ar,b,br]);if(P.challengeState(r.scene).ok){values=[a,ar,b,br];break outer;}}}
 if(c.id==='signal')values=c.target;
 if(c.id==='drill')values=[c.iceDepth,30];
 assert.ok(values,'generated challenge is solvable');const result=P.submitChallenge(P.setChallenge(s,values).scene);assert.equal(result.ok,true);return result.scene;
}
function use(s,id){return solve(P.interact(at(s,id)).scene);}
test('hub portals require physical proximity',()=>{const s=P.fresh('hub');assert.equal(P.interact(s).ok,false);assert.deepEqual(P.interact(at(s,'water')).event,{type:'launch',id:'water'});});
test('walking is normalized bounded and immutable',()=>{const s=P.fresh('water'),a=P.move(s,1,0,.05),b=P.move(s,1,1,.05);assert.equal(s.player.x,140);assert.equal(a.player.x,148);assert.ok(Math.abs(Math.hypot(b.player.x-140,b.player.y-480)-8)<1e-9);const edge=P.move({...s,player:{x:964,y:554,facing:1}},1,1,.05);assert.ok(P.canWalk(edge.player.x,edge.player.y));});
test('tap navigation walks to the destination without teleporting',()=>{let s=P.navigate(P.fresh('water'),{x:220,y:480});s=P.move(s,0,0,.05);assert.equal(s.player.x,148);for(let i=0;i<20;i++)s=P.move(s,0,0,.05);assert.ok(Math.abs(s.player.x-220)<6);assert.equal(s.destination,null);});
test('water rejects wrong order and carries the sample through all stations',()=>{let s=P.fresh('water');assert.equal(P.interact(at(s,'test')).ok,false);for(const id of P.waterSteps)s=use(s,id);assert.equal(s.success,true);assert.equal(s.carrying,null);assert.deepEqual(s.completed,P.waterSteps);});
test('water layouts change with the generated mission',()=>{const a=P.fresh('water',R.makeVariant('water',10)),b=P.fresh('water',R.makeVariant('water',11));assert.notDeepEqual(a.stations,b.stations);assert.deepEqual([...a.stations.map(s=>s.id)].sort(),[...P.waterSteps].sort());});
test('shield requires pickup carry and installation',()=>{let s=P.fresh('shield');s=use(s,'polymer');assert.equal(s.carrying,'polymer');assert.equal(s.installed.length,0);s=use(s,'shelter');assert.deepEqual(s.installed,['polymer']);assert.equal(s.carrying,null);assert.equal(s.success,false);});
test('two physically installed materials solve 200 generated budgets',()=>{for(let seed=1;seed<=200;seed++){const v=R.makeVariant('shield',seed),initial=P.fresh('shield',v),keys=Object.keys(P.materials);let pair;for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)if(R.shieldResult([keys[i],keys[j]],v.shield).ok)pair=[keys[i],keys[j]];let s=initial;for(const id of pair){s=use(s,id);s=use(s,'shelter');}assert.equal(s.success,true);assert.deepEqual(initial.installed,[]);}});
test('wrong shield can be removed returned and replaced',()=>{let s=P.fresh('shield',{shield:{maxMass:8,minProtection:10}});for(const id of ['water','aluminium'])s=use(use(s,id),'shelter');assert.equal(s.status,'shield_weak');s=use(s,'shelter');assert.equal(s.carrying,'aluminium');s=use(s,'aluminium');s=use(s,'shelter');s=use(s,'water');for(const id of ['polymer','regolith'])s=use(use(s,id),'shelter');assert.equal(s.success,true);});
test('comms requires power calculation transmit and actual reply travel',()=>{let s=P.fresh('comms',{roundTrip:2.6,distance:390000});assert.equal(P.setTiming(s,2.6).ok,false);assert.equal(P.interact(at(s,'antenna')).ok,false);s=use(s,'power');assert.equal(P.setTiming(s,1.3).ok,false);s=P.setTiming(s,2.6).scene;s=use(s,'antenna');assert.equal(s.replyRemaining,2.6);assert.equal(P.interact(at(s,'receiver')).ok,false);for(let i=0;i<54;i++)s=P.move(s,0,0,.05);assert.equal(use(s,'receiver').success,true);});
test('nonfinite calibration values are rejected',()=>{const s=use(P.fresh('comms',{roundTrip:2.6}),'power');for(const value of [NaN,Infinity,-Infinity,undefined,'2.6'])assert.equal(P.setTiming(s,value).ok,false);});
test('rover needs tools boarding sample and return',()=>{let s=P.fresh('rover',{sample:{x:7,y:1}});assert.equal(P.interact(at(s,'rover')).ok,false);s=use(s,'kit');assert.equal(s.carrying,'toolkit');s=use(s,'rover');assert.equal(s.driving,true);const battery=s.battery;s=P.move(s,1,0,.05);assert.ok(s.battery<battery);s=use(s,'sample');assert.equal(s.sample,true);s=use(s,'base');assert.equal(s.success,true);assert.equal(s.driving,false);});
test('walking before boarding spends no rover energy',()=>assert.equal(P.move(P.fresh('rover'),1,0,.05).battery,40));
test('shadow costs more energy and an empty rover stops',()=>{const s={...P.fresh('rover'),driving:true,player:{x:700,y:180,facing:1}},a=P.move(s,1,0,.05),b=P.move({...s,player:{x:700,y:400,facing:1}},1,0,.05);assert.ok(a.battery<b.battery);const empty=P.move({...s,battery:.001},1,0,.05);assert.equal(empty.battery,0);assert.equal(empty.failed,true);});
test('1000 generated rover trips return on safe routes around rocks',()=>{
 function travel(s,id){const goal=s.stations.find(t=>t.id===id);s=P.navigate(s,goal);for(let i=0;i<3000;i++){if(Math.hypot(goal.x-s.player.x,goal.y-s.player.y)<=7)return s;s=P.move(s,0,0,.025);assert.equal(s.failed,false,'battery must cover the planned route');}throw Error('route failed to arrive');}
 let reserve=40;const visited=new Set();
 for(let seed=1;seed<=1000;seed++){const variant=R.makeVariant('rover',seed);visited.add(variant.sample.x+','+variant.sample.y);let s=P.fresh('rover',variant);s=solve(P.interact(travel(s,'kit')).scene);s=solve(P.interact(travel(s,'rover')).scene);s=solve(P.interact(travel(s,'sample')).scene);assert.equal(s.sample,true);s=solve(P.interact(travel(s,'base')).scene);assert.equal(s.success,true);reserve=Math.min(reserve,s.battery);}
 assert.equal(visited.size,4);assert.ok(reserve>=2,'the most demanding planned route retains a small reserve');
});
test('completed and failed scenes cannot produce extra actions',()=>{let s=P.fresh('water');for(const id of P.waterSteps)s=use(s,id);assert.equal(P.interact(s).ok,false);assert.equal(P.interact({...s,success:false,failed:true}).ok,false);});
console.log('Playable academy:',passed,'tests passed');
