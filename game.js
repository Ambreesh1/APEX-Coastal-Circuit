/* Application state machine. Simulation uses a fixed 120 Hz step; rendering is independent. */
(function(A){
  'use strict';
  class Game{
    constructor(){
      this.track=new A.Track();this.ui=new A.UI(this.track);this.audio=new A.RaceAudio();
      this.race=new A.Race(this.track);this.state='menu';this.previousState='racing';
      this.clock=0;this.countdownTime=3;this.goUntil=0;this.accumulator=0;this.hudClock=0;
      this.best=Infinity;this.lastCountdown=null;this.lastFrame=0;this.stopped=false;
      try{const best=Number(localStorage.getItem('apex.coastal.best.v1'));if(Number.isFinite(best)&&best>0)this.best=best;this.audio.muted=localStorage.getItem('apex.sound')==='off';}catch{/* Storage can be unavailable on file URLs/private browsing. */}
      this.updateRecord();this.renderer=new A.Renderer(this.ui.nodes.scene,this.track);
      this.input=new A.Input(action=>this.action(action));this.bind();this.setState('menu');this.soundLabel();
      this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
    }
    bind(){
      const on=(id,fn)=>this.ui.nodes[id].addEventListener('click',event=>{event.currentTarget.blur();fn();});
      on('start',()=>this.start());on('again',()=>this.start());on('restart',()=>this.start());on('resume',()=>this.resume());
      on('exit',()=>this.menu());on('result-menu',()=>this.menu());on('pause-button',()=>this.action('pause'));on('sound',()=>this.action('mute'));
      this.ui.nodes.brand.addEventListener('click',event=>{event.preventDefault();if(this.state==='racing'||this.state==='countdown')this.pause();else if(this.state!=='menu')this.menu();});
      this.ui.nodes.quality.addEventListener('change',event=>{this.renderer.quality=event.target.value;});
      this.ui.nodes.scene.addEventListener('webglcontextlost',event=>{event.preventDefault();this.pause();this.stopped=true;this.fail('The graphics context was interrupted. Close other GPU-heavy tabs and choose Try Again.');});
      document.addEventListener('fullscreenchange',()=>{this.renderer.cameraReady=false;});
    }
    updateRecord(){this.ui.text('menu-best',Number.isFinite(this.best)?A.formatTime(this.best):'— SET YOUR FIRST LAP');}
    soundLabel(){this.ui.text('sound-state',this.audio.muted?'OFF':'ON');this.ui.nodes.sound.setAttribute('aria-pressed',String(!this.audio.muted));}
    setState(state){this.state=state;this.ui.state(state,this.input?.touch||false);}
    start(){
      this.input.clear();this.race=new A.Race(this.track,this.ui.nodes.difficulty.value);this.renderer.reset();
      this.countdownTime=3;this.lastCountdown=3;this.accumulator=0;this.hudClock=0;this.goUntil=0;
      this.setState('countdown');this.ui.countdown(3);this.ui.hud(this.race,this.input.read(),this.best);
      this.audio.start().then(()=>this.audio.countdown(false));this.ui.toastUntil=0;
    }
    menu(){
      this.input.clear();this.race=new A.Race(this.track,this.ui.nodes.difficulty.value);this.renderer.reset();this.accumulator=0;
      this.setState('menu');this.updateRecord();this.audio.update(this.race.player,false);this.ui.toastUntil=0;
    }
    pause(){
      if(!['racing','countdown'].includes(this.state))return;
      this.previousState=this.state;this.input.clear();this.setState('paused');this.accumulator=0;this.audio.update(this.race.player,false);this.ui.nodes.resume.focus();
    }
    resume(){
      if(this.state!=='paused')return;
      this.input.clear();this.setState(this.previousState);this.accumulator=0;this.audio.start();
      if(this.state==='countdown')this.ui.countdown(Math.ceil(this.countdownTime));
    }
    action(action){
      if(action==='mute'){this.audio.mute(!this.audio.muted);this.soundLabel();try{localStorage.setItem('apex.sound',this.audio.muted?'off':'on');}catch{}return;}
      if(action==='blur'){this.pause();return;}
      if(action==='pause'){if(this.state==='paused')this.resume();else this.pause();return;}
      if(action==='enter'){if(this.state==='menu'||this.state==='finished')this.start();else if(this.state==='paused')this.resume();return;}
      if(action==='restart'&&['racing','countdown','paused','finished'].includes(this.state)){this.start();return;}
      if(action==='camera'&&['racing','countdown'].includes(this.state)){this.renderer.cameraMode=1-this.renderer.cameraMode;this.ui.toast(this.renderer.cameraMode?'CAMERA / WIDE CHASE':'CAMERA / CLOSE CHASE',this.clock,1.4);}
      if(action==='recover'&&this.state==='racing'){this.race.recover();this.renderer.cameraReady=false;this.ui.toast('BACK ON TRACK — SAME RACE DISTANCE',this.clock);}
    }
    tick(dt,input){
      if(this.state==='countdown'){
        this.countdownTime-=dt;
        const value=Math.max(0,Math.ceil(this.countdownTime));
        if(value!==this.lastCountdown){this.lastCountdown=value;this.ui.countdown(value);this.audio.countdown(value===0);}
        if(this.countdownTime<=0){this.setState('racing');this.goUntil=this.clock+.9;}
        return;
      }
      if(this.state!=='racing')return;
      this.race.step(dt,input);
      for(const event of this.race.events){
        if(event.car.id!==0)continue;
        if(event.type==='lap'){
          const record=event.time<this.best;
          if(record){this.best=event.time;try{localStorage.setItem('apex.coastal.best.v1',String(this.best));}catch{}this.updateRecord();}
          if(event.car.completedLaps<3){this.audio.lap();this.ui.toast(`${record?'NEW BEST / ':''}LAP ${event.car.completedLaps}  ${A.formatTime(event.time)}${event.car.completedLaps===2?'  /  FINAL LAP':''}`,this.clock,3);}
        }
        if(event.type==='finish'){
          this.setState('finished');this.ui.countdown(null);this.ui.results(this.race);this.audio.finish();this.input.clear();this.ui.toastUntil=0;
        }
      }
    }
    frame(timestamp){
      if(this.stopped)return;
      try{
        const dt=Math.min(.1,this.lastFrame?(timestamp-this.lastFrame)/1000:1/60);this.lastFrame=timestamp;this.clock+=dt;
        const input=this.input.read();
        if(this.state==='racing'||this.state==='countdown'){
          this.accumulator+=dt;
          while(this.accumulator>=1/120){this.tick(1/120,input);this.accumulator-=1/120;if(this.state==='finished'){this.accumulator=0;break;}}
        }
        if(this.state==='racing'&&this.clock>this.goUntil)this.ui.countdown(null);
        this.hudClock+=dt;if(this.hudClock>.08){this.hudClock=0;if(['racing','countdown','paused'].includes(this.state))this.ui.hud(this.race,input,this.best);}
        this.ui.tick(this.clock);this.ui.nodes['collision-flash'].style.opacity=this.state==='racing'?String(this.race.player.impact*.35):'0';
        this.audio.update(this.race.player,['racing','countdown'].includes(this.state));
        this.renderer.render(this.race,this.state,this.clock,dt);requestAnimationFrame(this.frame);
      }catch(error){this.stopped=true;this.fail(error.message);console.error(error);}
    }
    fail(message){this.ui.text('error-message',message);this.ui.show('error-screen',true);this.audio.update(this.race.player,false);}
  }
  try{A.game=new Game();}catch(error){console.error(error);document.getElementById('error-message').textContent=error.message;document.getElementById('error-screen').hidden=false;}
})(globalThis.Apex);
