const assert=require('node:assert/strict');
const S=require('../js/engine.js');
const W=require('../js/world.js');
let assertions=0;
function check(name,fn){fn();assertions++;console.log('PASS',name);}
check('all discovery coordinates are walkable',()=>{for(const d of S.discoveries)assert.equal(W.canStand(d.world,d.x,d.y),true,d.id);});
check('scan frequency puzzle has unique clear peak',()=>{for(const d of S.discoveries){assert.equal(S.spectrum(d.frequency,d.frequency),100);assert.ok(S.spectrum(d.frequency-12,d.frequency)<90);}});
check('scan cannot claim data remotely',()=>{const s=S.fresh();assert.equal(S.collect(s,'airtrace').ok,false);});
check('scan cannot claim cross-map data',()=>{const s=S.fresh();s.player.x=798;s.player.y=347;assert.equal(S.collect(s,'regolith').ok,false);});
check('air and water research grants actual bounded resources with no mission turn',()=>{let s=S.fresh();s.player={x:578,y:283,facing:1};let r=S.collect(s,'airtrace');assert.equal(r.ok,true);assert.equal(r.state.air,81);assert.equal(r.state.turn,0);assert.equal(s.air,72);assert.equal(r.state.trace.length,1);s=r.state;s.player={x:1100,y:225,facing:1};r=S.collect(s,'irrigation');assert.equal(r.state.water,82);assert.equal(r.state.turn,0);});
check('research can only be collected once',()=>{let s=S.fresh();s.player={x:578,y:283,facing:1};s=S.collect(s,'airtrace').state;assert.equal(S.collect(s,'airtrace').ok,false);});
check('rewind correctly undoes science discovery',()=>{let s=S.fresh();s.player={x:578,y:283,facing:1};s=S.collect(s,'airtrace').state;const b=S.rewind(s);assert.equal(b.air,72);assert.equal(b.discoveries.length,0);});
check('regolith field research improves later shielding',()=>{let s=S.fresh();for(const a of ['power','air','seeds','exit'])s=S.apply(s,a).state;s.player={x:798,y:347,facing:1};s=S.collect(s,'regolith').state;for(const a of ['antenna','enter','waterShield'])s=S.apply(s,a).state;assert.equal(s.shield,98);assert.equal(s.researchShield,true);});
check('storm pressure increases as decisions are made',()=>{let s=S.fresh(),zero=S.stormPressure(s);s=S.apply(s,'power').state;assert.ok(S.stormPressure(s)>zero);});
check('hazards are separate from collision and affect suit',()=>{const pos=W.hazards[0];assert.equal(W.hazardAt(pos.x,pos.y),true);let a=S.fresh();a.world='surface';const b=S.copy(a);S.drainSuit(a,5,2.4);S.drainSuit(b,5,1);assert.ok(a.suit<b.suit);});
check('science discoveries persist and validate save files',()=>{let s=S.fresh();s.player={x:578,y:283,facing:1};s=S.collect(s,'airtrace').state;assert.equal(S.validSave(JSON.parse(JSON.stringify(s))),true);s.discoveries=['fake'];assert.equal(S.validSave(s),false);});
check('mission score is deterministic and bounded',()=>{const s=S.fresh();s.ended=true;s.ending='safeHarbor';const x=S.score(s);assert.ok(x.points>=0&&x.points<=100);assert.equal(S.score(s).points,x.points);});
console.log(`${assertions} algorithm upgrade tests passed`);
