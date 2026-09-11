/* Fixed-step arcade vehicle physics, predictive AI and ordered checkpoint rules. */
(function (A) {
  'use strict';
  const DRIVERS = [
    ['YOU','#75f4cd'],['S. KIM','#ffb66d'],['L. ROSSI','#ef7186'],
    ['A. REYES','#8eabff'],['M. SATO','#e9e8df'],['J. NOVAK','#b691f4']
  ];
  class Car {
    constructor(track, id, carId='gt', tuning='balanced') {
      this.setup=A.carSetup(carId,tuning);
      this.id=id; this.name=DRIVERS[id][0]; this.color=id===0?this.setup.color:DRIVERS[id][1];
      const grid = id===0 ? 5 : id-1;
      this.distance=-10-Math.floor(grid/2)*8;
      const p=track.at(this.distance,(grid%2===0?-1:1)*3);
      this.x=p.x;this.z=p.z;this.heading=p.heading;
      this.vx=0;this.vz=0;this.speed=0;this.steer=0;this.yaw=0;this.slip=0;
      this.near=track.nearest(this.x,this.z);this.lastS=this.near.s;
      this.gates=0;this.laps=[];this.lapStart=0;this.finishTime=null;
      this.cooldown=0;this.impact=0;this.drifting=false;this.offroad=false;
      this.throttle=0;this.brake=0;this.recoveries=0;this.stuck=0;
      this.lane=(id%2===0?-1:1)*(1.5+id*.25);
    }
    get completedLaps(){return this.laps.length;}
  }
  function drive(car,input,dt,track) {
    car.cooldown=Math.max(0,car.cooldown-dt);car.impact=A.damp(car.impact,0,8,dt);
    car.steer=A.damp(car.steer,A.clamp(input.steer||0,-1,1),9,dt);
    car.throttle=A.clamp(input.throttle||0,0,1);car.brake=A.clamp(input.brake||0,0,1);
    // Ratios retain the original GT calibration exactly.
    const setup=car.setup,base=A.CARS[0],speed=Math.hypot(car.vx,car.vz);
    car.offroad=Math.abs(car.near.offset)>track.halfWidth;
    car.drifting=!!input.drift && speed>12;
    const steerAngle=.38*setup.handling/(1+speed*.045);
    // Positive input means screen-right; models face local +Z.
    const yawTarget=-car.steer*speed/2.8*steerAngle*(car.drifting?1.38:1);
    car.yaw=A.damp(car.yaw,yawTarget,car.drifting?4*setup.driftControl:9,dt);
    car.heading=A.angle(car.heading+car.yaw*dt);
    const fx=Math.sin(car.heading),fz=Math.cos(car.heading),nx=fz,nz=-fx;
    let forward=car.vx*fx+car.vz*fz, lateral=car.vx*nx+car.vz*nz;
    const grip=car.offroad?3.7:(car.drifting?2.4*setup.driftControl:setup.grip);
    lateral*=Math.exp(-grip*dt);
    const accel=car.throttle*16.5*(setup.acceleration/base.acceleration)*Math.max(.14,1-Math.max(0,forward)/(90*setup.topSpeed/base.topSpeed));
    const resistance=.6+forward*forward*.0015+(car.offroad?8:0)+(car.drifting?1.3:0);
    forward=Math.max(0,forward+(accel-resistance-car.brake*31*(setup.braking/base.braking))*dt);
    forward=Math.min(forward,78*setup.topSpeed/base.topSpeed);
    car.vx=fx*forward+nx*lateral;car.vz=fz*forward+nz*lateral;
    car.speed=Math.hypot(car.vx,car.vz);car.slip=Math.abs(Math.atan2(lateral,Math.max(1,forward)));
    car.x+=car.vx*dt;car.z+=car.vz*dt;
    car.near=track.nearest(car.x,car.z,car.near.index);
    const limit=track.wallOffset-1.25;
    if(Math.abs(car.near.offset)>limit){
      const sign=Math.sign(car.near.offset),penetration=Math.abs(car.near.offset)-limit;
      car.x-=car.near.nx*sign*penetration;car.z-=car.near.nz*sign*penetration;
      const outward=(car.vx*car.near.nx+car.vz*car.near.nz)*sign;
      if(outward>0){car.vx-=car.near.nx*sign*outward*1.15;car.vz-=car.near.nz*sign*outward*1.15;}
      if(car.cooldown===0 && speed>3){const retained=1-.23/setup.durability;car.vx*=retained;car.vz*=retained;car.impact=A.clamp(speed/(50*setup.durability),.2,1);car.cooldown=.55;}
      car.near=track.nearest(car.x,car.z,car.near.index);
    }
  }
  function collide(a,b) {
    if(Math.hypot(a.x-b.x,a.z-b.z)>5.2)return;
    const af=[Math.sin(a.heading),Math.cos(a.heading)],bf=[Math.sin(b.heading),Math.cos(b.heading)];
    for(const sa of [-1.15,1.15])for(const sb of [-1.15,1.15]){
      let dx=a.x+af[0]*sa-b.x-bf[0]*sb,dz=a.z+af[1]*sa-b.z-bf[1]*sb;
      const d=Math.hypot(dx,dz),overlap=2.05-d;
      if(overlap<=0)continue;
      if(d<.0001){dx=1;dz=0;}else{dx/=d;dz/=d;}
      a.x+=dx*overlap*.51;a.z+=dz*overlap*.51;b.x-=dx*overlap*.51;b.z-=dz*overlap*.51;
      const closing=(a.vx-b.vx)*dx+(a.vz-b.vz)*dz;
      if(closing<0){
        const impulse=-closing*.62;
        a.vx+=dx*impulse;a.vz+=dz*impulse;b.vx-=dx*impulse;b.vz-=dz*impulse;
        for(const c of [a,b])if(c.cooldown===0){c.impact=A.clamp(-closing/(25*c.setup.durability),.15,.8);c.cooldown=.35;}
      }
    }
  }
  function aiInput(car,cars,track,pace=1) {
    const speed=Math.hypot(car.vx,car.vz),s=car.near.s;
    let lane=car.lane,targetSpeed=64*pace*car.setup.topSpeed/A.CARS[0].topSpeed;
    for(let d=8;d<=100;d+=12){
      const curve=Math.abs(track.at(s+d).curve);
      const cornerSpeed=Math.sqrt(14*(car.setup.grip/11)/Math.max(.001,curve))*pace;
      targetSpeed=Math.min(targetSpeed,Math.sqrt(cornerSpeed*cornerSpeed+2*13*(car.setup.braking/A.CARS[0].braking)*Math.max(0,d-14)));
    }
    for(const other of cars){
      if(other===car)continue;
      let gap=A.mod(other.near.s-s+track.length/2,track.length)-track.length/2;
      if(gap>0 && gap<25 && Math.abs(other.near.offset-car.near.offset)<3.2){
        lane=other.near.offset+(other.near.offset>0?-3.8:3.8);
        if(gap<9)targetSpeed=Math.min(targetSpeed,Math.max(15,other.speed-2));
      }
    }
    const laneLimit=Math.min(5.5,track.halfWidth-2);
    const look=12+speed*.43,p=track.at(s+look,A.clamp(lane,-laneLimit,laneLimit));
    const desired=Math.atan2(p.x-car.x,p.z-car.z),error=A.angle(desired-car.heading);
    const steeringScale=Math.max(.4,speed/2.8*(.38*car.setup.handling/(1+speed*.045)));
    const desiredYaw=2*Math.sin(error)*Math.max(speed,8)/look;
    const steer=A.clamp(-desiredYaw/steeringScale,-1,1);
    if(Math.abs(error)>.6)targetSpeed=Math.min(targetSpeed,23);
    if(car.offroad)targetSpeed=Math.min(targetSpeed,28);
    return {steer,throttle:A.clamp((targetSpeed-speed)*.5,0,1),brake:A.clamp((speed-targetSpeed)*.17,0,1),drift:false};
  }
  class Race {
    constructor(track,pace='sport',options={}) {
      this.track=track;this.cars=DRIVERS.map((_,i)=>new Car(track,i,i===0?options.carId:'gt',i===0?options.tuning:'balanced'));this.player=this.cars[0];
      this.time=0;this.pace={rookie:.73,sport:.87,pro:1.02}[pace]||.87;
      this.events=[];this.totalLaps=A.CONFIG.laps;
    }
    step(dt,input) {
      this.events=[];this.time+=dt;
      for(const c of this.cars){
        const controls=c.id===0 && c.finishTime===null?input:aiInput(c,this.cars,this.track,this.pace*(.965+c.id*.009));
        drive(c,controls,dt,this.track);
        if(c.id!==0){c.stuck=c.speed<2?c.stuck+dt:0;if(c.stuck>3)this.recover(c);}
      }
      for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++)collide(this.cars[i],this.cars[j]);
      for(const c of this.cars){
        c.near=this.track.nearest(c.x,c.z,c.near.index);
        this.advance(c,dt);
      }
    }
    advance(c,dt) {
      const length=this.track.length;
      let delta=A.mod(c.near.s-c.lastS+length/2,length)-length/2;
      c.lastS=c.near.s;
      // Reject discontinuities, but allow reversing to subtract race distance.
      if(Math.abs(delta)>Math.max(8,c.speed*dt*3))return;
      const previous=c.distance;c.distance+=delta;
      if(c.finishTime!==null)return;
      const gateDistance=length/this.track.checkpoints,next=(c.gates+1)*gateDistance;
      if(previous<next && c.distance>=next && Math.abs(c.near.offset)<this.track.wallOffset){
        c.gates++;
        if(c.gates%this.track.checkpoints===0){
          const crossing=this.time-dt+dt*A.clamp((next-previous)/Math.max(.0001,delta),0,1);
          c.laps.push(crossing-c.lapStart);c.lapStart=crossing;
          this.events.push({type:'lap',car:c,time:c.laps[c.laps.length-1]});
          if(c.laps.length===this.totalLaps){c.finishTime=crossing;this.events.push({type:'finish',car:c});}
        }
      }
    }
    recover(c=this.player) {
      // Recover at the same arc distance: no checkpoint, lap or position shortcut.
      const p=this.track.at(c.distance,A.clamp(c.near.offset,-4,4));
      c.x=p.x;c.z=p.z;c.heading=p.heading;c.vx=0;c.vz=0;c.speed=0;c.yaw=0;c.steer=0;c.stuck=0;
      c.near=this.track.nearest(c.x,c.z);c.lastS=c.near.s;c.recoveries++;
    }
    standings(){return this.cars.slice().sort((a,b)=>{
      if(a.finishTime!==null && b.finishTime!==null)return a.finishTime-b.finishTime;
      if(a.finishTime!==null)return -1;if(b.finishTime!==null)return 1;
      return b.distance-a.distance;
    });}
  }
  Object.assign(A,{Car,Race,drive,collide,aiInput});
})(globalThis.Apex);
