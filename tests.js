'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',file]);
for(const file of ['math.js','config.js','profile.js','track.js','physics.js','geometry.js','world.js'])require('./'+file);
const A=globalThis.Apex;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const track=new A.Track();
test('closed track and nearest-point projection',()=>{
  for(let s=-100;s<track.length*2;s+=37){const p=track.at(s),n=track.nearest(p.x,p.z);assert.ok(n.distance<.02);assert.ok(Number.isFinite(p.curve));}
  assert.deepEqual(track.at(0),track.at(track.length));
});
test('deterministic fixed-step simulation and finite state',()=>{
  const a=new A.Race(track),b=new A.Race(track);
  for(let i=0;i<1200;i++){const input={throttle:1,steer:Math.sin(i/120)*.2,drift:i>800};a.step(1/120,input);b.step(1/120,input);}
  for(let i=0;i<a.cars.length;i++){assert.equal(a.cars[i].x,b.cars[i].x);assert.ok(Number.isFinite(a.cars[i].speed));}
});
test('ordered checkpoints, finish and no duplicate laps',()=>{
  const race=new A.Race(track),c=race.player,dt=1/120;c.distance=0;c.lastS=0;c.speed=60;
  for(let s=.5;s<=track.length*3+1;s+=.5){race.time+=dt;c.near=track.at(s);c.near.offset=0;race.advance(c,dt);}
  assert.equal(c.gates,24);assert.equal(c.completedLaps,3);assert.ok(c.finishTime>0);
});
test('teleports rejected and recovery preserves progression',()=>{
  const race=new A.Race(track),c=race.player;const distance=c.distance;
  c.near=track.at(track.length*.4);c.near.offset=0;race.advance(c,1/120);assert.equal(c.distance,distance);assert.equal(c.gates,0);
  c.distance=track.length*.7;c.gates=5;c.x+=100;race.recover();
  assert.equal(c.distance,track.length*.7);assert.equal(c.gates,5);assert.equal(c.completedLaps,0);assert.equal(c.speed,0);
});
test('reverse movement subtracts distance without awarding gates',()=>{
  const race=new A.Race(track),c=race.player;c.distance=30;c.lastS=30;c.speed=20;c.near=track.at(29);c.near.offset=0;
  race.advance(c,1/120);assert.ok(Math.abs(c.distance-29)<1e-8);assert.equal(c.gates,0);
});
test('predictive AI brakes for approaching corners',()=>{
  const c=new A.Car(track,1);let braking=false;
  for(let s=0;s<track.length;s+=20){const p=track.at(s);Object.assign(c,{x:p.x,z:p.z,heading:p.heading,near:track.nearest(p.x,p.z),vx:Math.sin(p.heading)*70,vz:Math.cos(p.heading)*70});
    const input=A.aiInput(c,[c],track);assert.ok(Math.abs(input.steer)<=1);if(input.brake>0)braking=true;
  }assert.ok(braking);
});
test('browser script order and local assets exist',()=>{
  const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]);
  const context=vm.createContext({console});for(const file of scripts){assert.ok(fs.existsSync(file));if(file!=='game.js')vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});}
  assert.ok(context.Apex.Race);assert.ok(context.Apex.Renderer);
});
test('vehicle setups, tuning and distinct geometry',()=>{
  const base=JSON.stringify(A.CARS);assert.ok(A.carSetup('gt','grip').grip>A.carSetup('gt').grip);
  assert.ok(A.carSetup('gt','speed').topSpeed>A.carSetup('gt').topSpeed);assert.equal(JSON.stringify(A.CARS),base);
  const speeds=[];
  for(const def of A.CARS){const c=new A.Car(track,0,def.id);for(let i=0;i<120;i++)A.drive(c,{throttle:1},A.CONFIG.step,track);speeds.push(c.speed);
    const data=A.carGeometry(def.color,def.shape).data();assert.ok(data.length>0);assert.ok(data.every(Number.isFinite));}
  assert.ok(speeds[1]>speeds[0]);assert.ok(speeds[0]>speeds[3]);
});
test('default GT matches original physics calibration',()=>{
  const context=vm.createContext({});vm.runInContext(fs.readFileSync('math.js','utf8'),context);
  vm.runInContext(execFileSync('git',['show','c24b67b:physics.js'],{encoding:'utf8'}),context);
  const original=context.Apex,c=new A.Car(track,0),old=new original.Car(track,0);
  for(let i=0;i<1600;i++){const input={throttle:1,steer:Math.sin(i/150)*.4,brake:i%400>350?1:0,drift:i%500>350};A.drive(c,input,1/120,track);original.drive(old,input,1/120,track);}
  for(const key of ['x','z','vx','vz','heading'])assert.ok(Math.abs(c[key]-old[key])<1e-8,key);
});
test('all tracks generate finite scenery and AI completes races',()=>{
  for(const def of A.TRACKS){
    const t=new A.Track(def.id),data=A.buildWorld(t).data();assert.ok(data.length>0);assert.ok(data.every(Number.isFinite));
    const race=new A.Race(t,'sport');
    for(let i=0;i<120*300&&!race.cars.every(c=>c.finishTime!==null);i++)race.step(A.CONFIG.step,A.aiInput(race.player,race.cars,t,.87));
    for(const c of race.cars){assert.ok(c.finishTime!==null,`${def.id}: ${c.name} did not finish (${c.distance})`);assert.equal(c.gates,24);assert.ok(Number.isFinite(c.x));}
    console.log(`  ${def.name}: all six drivers finished`);
  }
});
test('profile validation, legacy migration, unlocks and one-time rewards',()=>{
  const values=new Map([['apex.coastal.best.v1','42']]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const profile=new A.Profile(storage);assert.equal(profile.best('coastal'),42);assert.equal(profile.best('desert'),Infinity);
  assert.equal(profile.select({carId:'titan',trackId:'desert'}).carId,'gt');
  const race=new A.Race(track);assert.equal(profile.complete(race),null);
  Object.assign(race.player,{laps:[43,41,42],finishTime:126,gates:24});
  const reward=profile.complete(race);assert.equal(reward.xp,500);assert.equal(profile.level,2);assert.ok(reward.unlocks.includes('Mountain Pass'));
  assert.equal(profile.complete(race),null);assert.equal(profile.races,1);assert.equal(profile.best('coastal'),41);
  profile.select({carId:'vortex',trackId:'mountain',tuning:'grip'});profile.save();
  const loaded=new A.Profile(storage);assert.equal(loaded.selection.trackId,'mountain');assert.equal(loaded.xp,500);
  assert.equal(loaded.record('desert',-3),false);assert.equal(loaded.record('desert',Infinity),false);
  values.set('apex.profile.v1','{broken');assert.equal(new A.Profile(storage).level,1);
  const denied=new A.Profile({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert.equal(denied.save(),false);assert.equal(denied.level,1);
});
test('application startup, selection, pause, results and GPU buffer lifecycle',require('./smoke-tests.js'));
console.log(`${passed} regression checks passed.`);
