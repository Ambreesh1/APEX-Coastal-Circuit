/* A compact WebGL renderer: lit geometry, atmospheric fog, procedural sky and particles. */
(function(A){
  'use strict';
  const vertex=`
    attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor;
    uniform mat4 uVP; uniform mat4 uModel;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor;
    void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;
      vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;gl_Position=uVP*world;}`;
  const fragment=`
    precision mediump float;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor;
    uniform vec3 uEye; uniform float uOpacity; uniform float uGloss;
    void main(){
      vec3 sun=normalize(vec3(-0.55,0.65,-0.5));
      vec3 normal=normalize(vNormal);
      float diffuse=max(dot(normal,sun),0.0);
      vec3 lit=vColor*(vec3(0.53,0.64,0.70)+vec3(0.55,0.44,0.31)*diffuse);
      vec3 view=normalize(uEye-vWorld);vec3 halfDir=normalize(sun+view);
      float spec=pow(max(dot(normal,halfDir),0.0),52.0)*uGloss;
      lit+=vec3(1.0,0.87,0.67)*spec;
      float distanceToEye=length(uEye-vWorld);
      float fog=1.0-exp(-pow(distanceToEye/620.0,1.6));
      vec3 fogColor=vec3(0.65,0.72,0.69);
      gl_FragColor=vec4(mix(lit,fogColor,min(fog,0.96)),uOpacity);
    }`;
  const skyVertex=`attribute vec2 aPosition; varying vec2 vUV; void main(){vUV=aPosition;gl_Position=vec4(aPosition,1.0,1.0);}`;
  const skyFragment=`
    precision mediump float; varying vec2 vUV;
    uniform vec3 uForward;uniform vec3 uRight;uniform vec3 uUp;uniform float uAspect;uniform float uTan;
    void main(){
      vec3 ray=normalize(uForward+uRight*vUV.x*uAspect*uTan+uUp*vUV.y*uTan);
      float h=max(ray.y,0.0);
      vec3 color=mix(vec3(0.82,0.77,0.64),vec3(0.29,0.52,0.65),pow(clamp(h*1.65,0.0,1.0),0.55));
      vec3 sun=normalize(vec3(-0.72,0.24,-0.65));float d=max(dot(ray,sun),0.0);
      color+=vec3(0.28,0.17,0.065)*pow(d,22.0);
      color=mix(color,vec3(1.0,0.91,0.65),smoothstep(0.9991,0.9996,d));
      float cloud=sin(ray.x*21.0+ray.z*8.0)*sin(ray.z*24.0-ray.x*7.0);
      color=mix(color,vec3(0.92,0.86,0.73),smoothstep(0.32,0.7,cloud)*smoothstep(0.09,0.18,h)*(1.0-smoothstep(0.23,0.4,h))*.2);
      gl_FragColor=vec4(color,1.0);
    }`;
  class Renderer{
    constructor(canvas,track){
      this.canvas=canvas;this.track=track;
      const gl=this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});
      if(!gl)throw new Error('WebGL is unavailable. Enable browser hardware acceleration, or try Chrome, Edge or Firefox.');
      this.program=this.programFrom(vertex,fragment);this.skyProgram=this.programFrom(skyVertex,skyFragment);
      this.locations=this.locationsFor(this.program,['aPosition','aNormal','aColor'],['uVP','uModel','uEye','uOpacity','uGloss']);
      this.skyLocations=this.locationsFor(this.skyProgram,['aPosition'],['uForward','uRight','uUp','uAspect','uTan']);
      this.skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      this.world=this.upload(A.buildWorld(track));
      this.cars=['#75f4cd','#ffb66d','#ef7186','#8eabff','#e9e8df','#b691f4'].map(c=>this.upload(A.carGeometry(c)));
      this.shadow=this.upload(new A.Geometry().disk(0,.09,0,1.32,2.65,'#1c292b',20));
      this.smokeMesh=this.upload(new A.Geometry().sphere(0,0,0,1,'#b6c4bc',7,4));
      this.brakeMesh=this.upload(new A.Geometry().box(0,.73,-2.23,1.8,.08,.03,'#ff7564'));
      this.skidMesh={buffer:gl.createBuffer(),count:0};
      this.skids=[];this.particles=[];this.emission=0;this.eye=[0,5,0];this.target=[0,1,0];
      this.cameraMode=0;this.quality='auto';this.cameraReady=false;this.lastState='';
      this.reduced=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    }
    programFrom(vs,fs){
      const gl=this.gl,p=gl.createProgram();
      for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(p,shader);gl.deleteShader(shader);
      }
      gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
    }
    locationsFor(program,attrs,uniforms){
      const out={};for(const key of attrs)out[key]=this.gl.getAttribLocation(program,key);
      for(const key of uniforms)out[key]=this.gl.getUniformLocation(program,key);return out;
    }
    upload(geometry){const gl=this.gl,buffer=gl.createBuffer(),data=geometry.data();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return{buffer,count:data.length/9};}
    resize(){
      const cap=this.quality==='low'?1:this.quality==='high'?2:1.5;
      const ratio=Math.min(devicePixelRatio||1,cap),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
      this.gl.viewport(0,0,w,h);
    }
    draw(mesh,model,gloss=0,alpha=1){
      if(!mesh.count)return;const gl=this.gl,l=this.locations;
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      for(const [name,offset] of [['aPosition',0],['aNormal',12],['aColor',24]]){gl.enableVertexAttribArray(l[name]);gl.vertexAttribPointer(l[name],3,gl.FLOAT,false,36,offset);}
      gl.uniformMatrix4fv(l.uModel,false,model);gl.uniform1f(l.uGloss,gloss);gl.uniform1f(l.uOpacity,alpha);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    setPlayer(setup){
      if(this.playerModel===setup.id)return;
      const mesh=this.upload(A.carGeometry(setup.color,setup.shape));
      this.gl.deleteBuffer(this.cars[0].buffer);this.cars[0]=mesh;this.playerModel=setup.id;
    }
    setTrack(track){
      if(this.track===track)return;
      const world=this.upload(A.buildWorld(track));
      this.gl.deleteBuffer(this.world.buffer);this.world=world;this.track=track;this.reset();
    }
    reset(){this.cameraReady=false;this.skids=[];this.particles=[];this.emission=0;}
    updateEffects(cars,dt,active){
      this.emission+=dt;
      for(const s of this.skids)s.life-=dt;this.skids=this.skids.filter(s=>s.life>0);
      for(const p of this.particles){p.life-=dt;p.y+=dt*.7;p.x+=p.vx*dt;p.z+=p.vz*dt;p.size+=dt*.5;}
      this.particles=this.particles.filter(p=>p.life>0);
      if(active && this.emission>.055){
        this.emission=0;
        for(const c of cars){
          if(c.speed<9 || !(c.drifting||c.slip>.17||c.brake>.7||c.offroad))continue;
          for(const side of [-.84,.84]){
            const fx=Math.sin(c.heading),fz=Math.cos(c.heading),nx=fz,nz=-fx;
            const x=c.x-fx*1.5+nx*side,z=c.z-fz*1.5+nz*side;
            if(!c.offroad)this.skids.push({x,z,h:c.heading,length:Math.max(.4,c.speed*.07),life:22});
            if(this.particles.length<75)this.particles.push({x,y:.3,z,vx:-c.vx*.03,vz:-c.vz*.03,size:.23,life:1.2});
          }
        }
      }
      if(this.skids.length>700)this.skids.splice(0,this.skids.length-700);
      const geo=new A.Geometry();
      for(const s of this.skids){const fade=1-Math.min(1,s.life/5),v=.115+fade*.08;geo.box(s.x,.069,s.z,.18,.008,s.length,[v,v*1.1,v*1.14],s.h);}
      const data=geo.data(),gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.skidMesh.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);this.skidMesh.count=data.length/9;
    }
    render(race,state,time,dt){
      this.resize();const gl=this.gl,c=race.player,isMenu=state==='menu',speed=c.speed;
      const h=c.heading,fx=Math.sin(h),fz=Math.cos(h),nx=fz,nz=-fx;
      let eye,target;
      if(isMenu){
        const orbit=this.reduced?0:Math.sin(time*.12)*.2,a=h+.7+orbit;
        eye=[c.x+Math.sin(a)*11.5,4.8,c.z+Math.cos(a)*11.5];target=[c.x,.7,c.z];
      }else{
        const near=this.track.at(c.near.s+10),follow=h+A.angle(near.heading-h)*.28;
        const dx=Math.sin(follow),dz=Math.cos(follow),far=this.cameraMode===1;
        const distance=(far?16:10)+speed*.025;
        eye=[c.x-dx*distance,(far?7:4.6)+speed*.006,c.z-dz*distance];
        target=[c.x+dx*12,1.1,c.z+dz*12];
      }
      if(!this.cameraReady||isMenu!==(this.lastState==='menu')){this.eye=eye;this.target=target;this.cameraReady=true;}
      else for(let i=0;i<3;i++){this.eye[i]=A.damp(this.eye[i],eye[i],isMenu?2.5:8,dt);this.target[i]=A.damp(this.target[i],target[i],9,dt);}
      this.lastState=state;
      const shake=this.reduced?0:c.impact*.08;
      const actualEye=[this.eye[0]+Math.sin(time*81)*shake,this.eye[1]+Math.cos(time*67)*shake,this.eye[2]];
      const aspect=this.canvas.width/this.canvas.height,fov=(isMenu?54:64+(this.reduced?0:speed*.1))*Math.PI/180;
      const projection=A.mat.perspective(fov,aspect,.15,2200);if(isMenu&&aspect>1.15)projection[8]=-.39;
      const view=A.mat.lookAt(actualEye,this.target),vp=A.mat.multiply(projection,view);
      gl.clearColor(.5,.65,.68,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);gl.useProgram(this.skyProgram);
      const sl=this.skyLocations,forward=A.vec.normalize(A.vec.sub(this.target,actualEye)),right=A.vec.normalize(A.vec.cross(forward,[0,1,0])),up=A.vec.cross(right,forward);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.skyBuffer);gl.enableVertexAttribArray(sl.aPosition);gl.vertexAttribPointer(sl.aPosition,2,gl.FLOAT,false,0,0);
      gl.uniform3fv(sl.uForward,forward);gl.uniform3fv(sl.uRight,right);gl.uniform3fv(sl.uUp,up);gl.uniform1f(sl.uAspect,aspect);gl.uniform1f(sl.uTan,Math.tan(fov/2));gl.drawArrays(gl.TRIANGLES,0,6);
      gl.enable(gl.DEPTH_TEST);gl.useProgram(this.program);gl.uniformMatrix4fv(this.locations.uVP,false,vp);gl.uniform3fv(this.locations.uEye,actualEye);
      this.draw(this.world,A.mat.identity());
      this.updateEffects(race.cars,state==='paused'?0:dt,state==='racing');this.draw(this.skidMesh,A.mat.identity());
      for(const car of race.cars){
        this.draw(this.shadow,A.mat.model(car.x,0,car.z,car.heading));
        const roll=A.clamp(car.yaw*car.speed*.0009,-.055,.055);
        this.draw(this.cars[car.id],A.mat.model(car.x,0,car.z,car.heading,roll),.45);
        if(car.brake>.1)this.draw(this.brakeMesh,A.mat.model(car.x,0,car.z,car.heading),1);
      }
      gl.enable(gl.BLEND);gl.depthMask(false);
      this.particles.sort((a,b)=>Math.hypot(b.x-actualEye[0],b.z-actualEye[2])-Math.hypot(a.x-actualEye[0],a.z-actualEye[2]));
      for(const p of this.particles)this.draw(this.smokeMesh,A.mat.model(p.x,p.y,p.z,0,0,p.size),0,Math.min(.23,p.life*.25));
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
  }
  A.Renderer=Renderer;
})(globalThis.Apex);
