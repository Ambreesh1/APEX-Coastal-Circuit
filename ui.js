/* DOM presentation and high-DPI circuit maps, independent of simulation logic. */
(function(A){
  'use strict';
  class UI{
    constructor(track){
      this.track=track;this.nodes={};document.querySelectorAll('[id]').forEach(el=>this.nodes[el.id]=el);
      this.toastUntil=0;this.lastCountdown=null;this.setTrack(track);
    }
    setTrack(track){
      this.track=track;const t=track.definition;
      this.text('track-length',(track.length/1000).toFixed(2));this.nodes.sectors.innerHTML='<i></i>'.repeat(track.checkpoints);
      this.text('menu-laps',String(A.CONFIG.laps).padStart(2,'0'));this.text('total-laps',` / ${A.CONFIG.laps}`);
      for(const id of ['event-track','race-track'])this.text(id,t.name.toUpperCase());
      this.text('event-environment',t.environment.toUpperCase());this.text('track-theme',t.theme.toUpperCase());
      this.text('track-sectors',`${track.checkpoints} SECTORS`);this.text('track-intro',`${t.environment}. Find your line on ${t.name}.`);
      this.text('track-details',`${t.difficulty} · ${t.corners} corners · ${track.halfWidth*2} m road · ${t.multiplier}× XP · Recommended: ${t.recommended}`);
      this.nodes['menu-map'].setAttribute('aria-label',`${t.name} track map`);this.nodes.scene.setAttribute('aria-label',`3D ${t.name} racing circuit`);
      document.title=`APEX — ${t.name}`;this.drawMap(this.nodes['menu-map']);
    }
    profile(profile){
      this.garage(profile.level);
      const select=this.nodes['track-select'],selected=select.value;
      select.innerHTML=A.TRACKS.map(t=>`<option value="${t.id}" ${t.level>profile.level?'disabled':''}>${t.name}${t.level>profile.level?` / LV ${t.level}`:''}</option>`).join('');
      select.value=A.TRACKS.some(t=>t.id===selected&&t.level<=profile.level)?selected:'coastal';
      this.text('profile-status',`LEVEL ${profile.level} · ${profile.level===A.CONFIG.maxLevel?'MAX LEVEL':`${profile.xp%A.CONFIG.xpPerLevel} / ${A.CONFIG.xpPerLevel} XP`} · ${profile.races} races${profile.saved?'':' · Progress is session-only (storage unavailable)'}`);
    }
    garage(level){
      const select=this.nodes['car-select'],selected=select.value;
      select.innerHTML=A.CARS.map(c=>`<option value="${c.id}" ${c.level>level?'disabled':''}>${c.name}${c.level>level?` / LV ${c.level}`:''}</option>`).join('');
      select.value=A.CARS.some(c=>c.id===selected&&c.level<=level)?selected:'gt';
    }
    carDetails(c){
      this.text('car-details',`${c.type} · Accel ${c.acceleration.toFixed(1)} · Speed ${Math.round(c.topSpeed*3.6)} km/h · Grip ${c.grip.toFixed(1)} · Brake ${c.braking.toFixed(1)} — ${c.pros}. ${c.cons}.`);
    }
    text(id,value){this.nodes[id].textContent=value;}
    show(id,visible){this.nodes[id].hidden=!visible;}
    state(state,touch){
      this.show('menu',state==='menu');this.show('hud',['countdown','racing','paused'].includes(state));
      this.show('pause-screen',state==='paused');this.show('results',state==='finished');
      this.show('pause-button',['countdown','racing','paused'].includes(state));
      this.show('touch-controls',touch&&['countdown','racing'].includes(state));
      if(state!=='countdown'&&state!=='racing')this.show('countdown',false);
    }
    toast(message,now,duration=2.5){this.text('toast',message);this.toastUntil=now+duration;this.nodes.toast.classList.add('visible');}
    tick(now){if(now>this.toastUntil)this.nodes.toast.classList.remove('visible');}
    countdown(number){
      this.show('countdown',number!==null);if(number===null)return;
      this.nodes.countdown.classList.toggle('go',number===0);this.text('countdown-number',number===0?'GO!':number);
      this.text('countdown-label',number===0?'FIND YOUR LINE':'GET READY');
      this.nodes.countdown.querySelectorAll('i').forEach((el,i)=>el.classList.toggle('lit',number===0||i<4-number));
    }
    drawMap(canvas,cars=null){
      const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const b=this.track.bounds,scale=Math.min((w-45)/(b.maxX-b.minX),(h-45)/(b.maxZ-b.minZ));
      const ox=w/2-(b.minX+b.maxX)*.5*scale,oy=h/2-(b.minZ+b.maxZ)*.5*scale;
      const p=(x,z)=>[ox+x*scale,oy+z*scale];
      ctx.lineCap='round';ctx.lineJoin='round';
      const path=()=>{ctx.beginPath();this.track.points.forEach((pt,i)=>{const [x,y]=p(pt.x,pt.z);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();};
      path();ctx.strokeStyle='#9dc2b316';ctx.lineWidth=14;ctx.stroke();
      path();ctx.strokeStyle='#71978b';ctx.lineWidth=4;ctx.stroke();
      for(let i=1;i<this.track.checkpoints;i++){
        const q=this.track.at(this.track.length*i/this.track.checkpoints),[x,y]=p(q.x,q.z);
        ctx.fillStyle='#a9c9bd';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();
      }
      const start=this.track.at(0),[sx,sy]=p(start.x,start.z);
      ctx.fillStyle='#75f4cd';ctx.shadowColor='#75f4cd';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(sx,sy,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.font='8px Arial';ctx.fillStyle='#c1d3c9';ctx.fillText('S / F',sx-10,sy-11);
      if(cars){
        for(const car of [...cars.filter(c=>c.id!==0),cars[0]]){
          const [x,y]=p(car.x,car.z);ctx.fillStyle=car.color;ctx.strokeStyle='#10252a';ctx.lineWidth=2;
          if(car.id===0){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI-car.heading);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-4.5,4.5);ctx.lineTo(0,2);ctx.lineTo(4.5,4.5);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();}
          else{ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.stroke();ctx.fill();}
        }
      }
    }
    row(car,index,right){return `<div class="driver-row ${car.id===0?'you':''}"><span class="driver-pos">${index+1}</span><i class="driver-color" style="background:${car.color}"></i><span class="driver-name">${car.name}</span><span class="driver-gap">${right}</span></div>`;}
    hud(race,input,best){
      const c=race.player,order=race.standings(),speed=Math.round(c.speed*3.6);
      this.text('position',order.indexOf(c)+1);this.text('lap',Math.min(race.totalLaps,c.completedLaps+1));
      this.text('timer',A.formatTime(race.time));this.text('lap-time',A.formatTime(race.time-c.lapStart));this.text('best-lap',A.formatTime(best));
      this.text('speed',String(speed).padStart(3,'0'));this.text('gear',speed<2?'N':Math.min(6,1+Math.floor(c.speed/13)));
      this.nodes['rev-bar'].style.width=`${speed<2?3:20+(c.speed%13)/13*80}%`;
      this.nodes['progress-fill'].style.width=`${A.clamp(c.distance/(race.track.length*race.totalLaps),0,1)*100}%`;
      this.nodes['drift-label'].classList.toggle('drifting',c.drifting||c.slip>.17);
      this.text('drift-label',c.offroad?'OFF TRACK':c.drifting?'DRIFTING':c.slip>.17?'SLIDING':'GRIP');
      this.text('car-status',c.offroad?'OFFROAD / LOW TRACTION':`${c.setup.name.toUpperCase()} / RWD`);
      this.text('throttle-status',input.brake?'BRAKING':input.throttle?'THROTTLE':'COASTING');
      this.nodes.sectors.querySelectorAll('i').forEach((el,i)=>el.classList.toggle('passed',i<c.gates%race.track.checkpoints));
      this.nodes.leaderboard.innerHTML=order.map((car,i)=>this.row(car,i,car.id===0?'YOU':car.finishTime!==null?'FIN':`${Math.abs(Math.round(car.distance-c.distance))}m`)).join('');
      this.drawMap(this.nodes['race-map'],race.cars);
      const curve=this.track.at(c.near.s+60).curve;
      this.text('race-hint',Math.abs(curve)>.009?(curve>0?'LEFT TURN AHEAD':'RIGHT TURN AHEAD'):'BRAKE EARLY. EXIT FAST.');
    }
    results(race){
      const c=race.player,order=race.standings(),position=order.indexOf(c)+1,best=Math.min(...c.laps);
      this.text('result-title',position===1?'THE CIRCUIT IS YOURS.':position<=3?'PODIUM FINISH.':'RACE COMPLETE.');
      this.nodes['result-position'].innerHTML=`${position}<span>${['','ST','ND','RD','TH','TH','TH'][position]}</span>`;
      this.text('result-time',A.formatTime(c.finishTime));this.text('result-best',`BEST LAP  ${A.formatTime(best)}`);
      this.nodes['result-laps'].innerHTML=c.laps.map((t,i)=>`<div>LAP 0${i+1}<strong class="${t===best?'mint':''}">${A.formatTime(t)}</strong></div>`).join('');
      this.nodes['result-table'].innerHTML=order.map((car,i)=>this.row(car,i,car.finishTime!==null?A.formatTime(car.finishTime):`LAP ${Math.min(race.totalLaps,car.completedLaps+1)} / ${race.totalLaps}`)).join('');
    }
  }
  A.UI=UI;
})(globalThis.Apex);
