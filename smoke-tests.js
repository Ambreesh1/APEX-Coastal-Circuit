/* Application integration smoke test with DOM/WebGL doubles; no browser dependency. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
module.exports=function(){
  const html=fs.readFileSync('index.html','utf8'),nodes={},errors=[],buffers=new Set();let nextBuffer=0;
  const noop=()=>{},context2d=new Proxy({},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
  const gl=new Proxy({createBuffer(){const b=++nextBuffer;buffers.add(b);return b;},deleteBuffer(b){assert.ok(buffers.delete(b));},createShader:()=>({}),createProgram:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({})},{get:(o,k)=>k in o?o[k]:/^[A-Z_]+$/.test(k)?1:noop});
  function node(id){return{id,value:'',hidden:false,width:360,height:220,style:{},dataset:{},textContent:'',innerHTML:'',classList:{toggle:noop,add:noop,remove:noop},addEventListener:noop,setAttribute:noop,focus:noop,blur:noop,querySelectorAll:()=>[],getContext:type=>type==='webgl'?gl:context2d};}
  for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes[match[1]]=node(match[1]);
  nodes.difficulty.value='sport';nodes.quality.value='auto';nodes.tuning.value='balanced';nodes['error-screen'].hidden=true;
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const document={body:node('body'),querySelectorAll:s=>s==='[id]'?Object.values(nodes):[],getElementById:id=>nodes[id],addEventListener:noop};
  const context=vm.createContext({document,console:{log:noop,error:e=>errors.push(e)},localStorage:storage,requestAnimationFrame:noop,addEventListener:noop,matchMedia:()=>({matches:false}),navigator:{maxTouchPoints:0},innerWidth:1280,innerHeight:800,devicePixelRatio:1});
  for(const match of html.matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(fs.readFileSync(match[1],'utf8'),context,{filename:match[1]});
  const A=context.Apex,g=A.game;assert.ok(g,errors.join('\n'));assert.equal(g.state,'menu');
  // Audio is independently browser-driven; keep this test synchronous.
  g.audio={muted:false,start:()=>({then:fn=>fn()}),update:noop,countdown:noop,lap:noop,finish:noop};
  g.frame(100);assert.equal(g.stopped,false);
  nodes['car-select'].value='comet';nodes.tuning.value='grip';g.preview();assert.equal(g.race.player.setup.id,'comet');
  g.start();for(let i=0;i<361;i++)g.tick(A.CONFIG.step,{});assert.equal(g.state,'racing');
  g.tick(A.CONFIG.step,{throttle:1});const time=g.race.time;g.pause();g.tick(A.CONFIG.step,{throttle:1});assert.equal(g.race.time,time);g.resume();assert.equal(g.state,'racing');
  g.profile.xp=1000;g.menu();const count=buffers.size;
  for(const id of ['mountain','desert','coastal']){nodes['track-select'].value=id;g.preview();assert.equal(g.track.id,id);assert.equal(g.ui.track.id,id);assert.equal(g.renderer.track.id,id);g.frame(g.lastFrame+16);assert.equal(buffers.size,count);}
  g.start();g.setState('racing');const c=g.race.player;Object.assign(c,{laps:[45,44,43],gates:24,finishTime:132});
  g.race.step=()=>{g.race.events=[{type:'finish',car:c}];};g.tick(A.CONFIG.step,{});assert.equal(g.state,'finished');assert.ok(nodes['result-reward'].textContent.includes('XP'));
  g.start();assert.equal(g.state,'countdown');assert.equal(g.race.player.completedLaps,0);g.menu();assert.equal(g.state,'menu');
  assert.equal(g.stopped,false);assert.equal(nodes['error-screen'].hidden,true);assert.equal(errors.length,0);
};
