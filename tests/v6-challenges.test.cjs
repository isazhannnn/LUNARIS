'use strict';
const assert=require('node:assert/strict'),P=require('../js/academy-play.js'),R=require('../js/academy.js');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
function challenge(id,seed=1){const s=P.fresh('water',R.makeVariant('water',seed));return {...s,challenge:P.challengeSpec(s,id)};}
function configure(s,v){const r=P.setChallenge(s,v);assert.equal(r.ok,true);return r.scene;}
test('each seeded flow has a valid solution and rejects a wrong flow without resource loss',()=>{
 for(let seed=0;seed<300;seed++){const s=challenge('flow',seed),c=s.challenge;let solution;
  for(let a=0;a<=6;a++)for(let b=0;b<=6;b++)if(a*2+b*3===c.target&&a+b<=c.maxUnits)solution=[a,b];
  assert.ok(solution);const bad=P.submitChallenge(s);assert.equal(bad.ok,false);assert.equal(bad.scene.battery,s.battery);assert.deepEqual(bad.scene.completed,[]);
  const good=P.submitChallenge(configure(s,solution));assert.equal(good.scene.carrying,'water_pure');assert.deepEqual(good.scene.solvedChallenges,['flow']);assert.equal(s.challenge.values[0],0);
 }
});
test('shield requires two in-bounds non-overlapping panels over every exposed section',()=>{
 const seen=new Set();for(let seed=0;seed<100;seed++){const s=challenge('shield',seed),c=s.challenge;seen.add(c.targets.join(','));assert.equal(P.submitChallenge(s).ok,false);let solution;
  outer:for(let a=0;a<15;a++)for(let ar=0;ar<2;ar++)for(let b=0;b<15;b++)for(let br=0;br<2;br++){const v=[a,ar,b,br];if(P.challengeState(configure(s,v)).ok){solution=v;break outer;}}
  assert.ok(solution);assert.equal(P.submitChallenge(configure(s,solution)).scene.success,true);
 }assert.equal(seen.size,4);assert.deepEqual(P.panelCells(4,0),[]);assert.deepEqual(P.panelCells(10,1),[]);
});
test('signal distinguishes frequency and phase and starts the physical return delay',()=>{
 for(let seed=0;seed<200;seed++){const s=challenge('signal',seed),target=s.challenge.target;assert.equal(P.challengeState(configure(s,[target[0]+1,target[1]])).ok,false);assert.equal(P.challengeState(configure(s,[target[0],(target[1]+90)%360])).ok,false);const good=P.submitChallenge(configure(s,target));assert.equal(good.ok,true);assert.ok(good.scene.replyRemaining>0);assert.ok(good.scene.completed.includes('antenna'));assert.equal(good.scene.success,false);}
});
test('drill requires ice depth and a safe rotating motor, not just a matching depth',()=>{
 const depths=new Set();for(let seed=0;seed<300;seed++){const s=challenge('drill',seed),depth=s.challenge.iceDepth;depths.add(depth);assert.equal(P.challengeState(configure(s,[depth,100])).ok,false);assert.equal(P.challengeState(configure(s,[depth,0])).ok,false);assert.equal(P.challengeState(configure(s,[0,30])).ok,false);const good=P.submitChallenge(configure(s,[depth,30]));assert.equal(good.ok,true);assert.equal(good.scene.sample,true);assert.equal(good.scene.success,false);assert.equal(good.scene.carrying,'ice');}assert.ok(depths.size>20);
});
test('challenge inputs reject nonfinite values, fractions for panels, and invalid ranges',()=>{
 for(const [id,bad]of [['flow',[.5,2]],['flow',[7,0]],['shield',[0,2,0,0]],['shield',[0,0,-1,0]],['signal',[21,0]],['drill',[11,50]],['drill',[1,101]],['drill',[NaN,30]],['signal',[Infinity,30]]]){const s=challenge(id);const r=P.setChallenge(s,bad);assert.equal(r.ok,false);assert.equal(r.scene,s);}
});
test('cancel and repeated submits cannot duplicate rewards',()=>{
 const s=challenge('drill'),done=P.submitChallenge(configure(s,[s.challenge.iceDepth,30])).scene;assert.equal(P.submitChallenge(done).ok,false);assert.equal(P.cancelChallenge(s).challenge,null);assert.deepEqual(s.solvedChallenges,[]);
});
test('rover routes avoid collision geometry at every animation step',()=>{
 let s={...P.fresh('rover'),driving:true};const target={x:850,y:200};s=P.navigate(s,target);for(let i=0;i<500;i++){s=P.move(s,0,0,.025);assert.equal(P.canMove(s,s.player.x,s.player.y),true);}assert.ok(Math.hypot(target.x-s.player.x,target.y-s.player.y)<8);
});
console.log('V6 challenges: '+passed+' tests passed');
