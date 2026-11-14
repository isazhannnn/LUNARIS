const assert=require('node:assert/strict');
const A=require('../js/academy.js');
assert.equal(A.waterValid(['collect','prefilter','purify','test','store']),true);
assert.equal(A.waterValid(['collect','purify','prefilter','test','store']),false);
assert.equal(A.shieldResult(['regolith','polymer']).ok,true);
assert.equal(A.shieldResult(['water','regolith']).ok,false);
assert.equal(A.shieldResult(['water','water']).ok,false);
assert.equal(A.commValid(2.6),true);
assert.equal(A.commValid(1.3),false);
assert.equal(A.canStep(2,1),false);
assert.equal(A.canStep(7,1),true);
assert.equal(A.roverMove({x:0,y:6,battery:5},-1,0).moved,false);
assert.equal(A.roverMove({x:0,y:6,battery:5},1,0).battery,4);
// Confirm a feasible round trip exists at the stated 40-point starting budget.
function shortest(sx,sy,tx,ty){let dist=new Map([[`${sx},${sy}`,0]]),queue=[[sx,sy,0]];while(queue.length){queue.sort((a,b)=>a[2]-b[2]);const [x,y,d]=queue.shift();if(d!==dist.get(`${x},${y}`))continue;if(x===tx&&y===ty)return d;for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,ny=y+dy;if(!A.canStep(nx,ny))continue;const nd=d+(nx>=4&&ny<=2?2:1);if(nd<(dist.get(`${nx},${ny}`)??Infinity)){dist.set(`${nx},${ny}`,nd);queue.push([nx,ny,nd]);}}}return Infinity;}
const cost=shortest(0,6,7,1)*2;assert.ok(cost<=40,`rover roundtrip requires ${cost}>40`);
console.log('Academy engine tests passed; rover shortest roundtrip cost:',cost);
