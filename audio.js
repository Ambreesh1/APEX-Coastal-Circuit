/* Web Audio synthesis: engine harmonics, filtered tire noise, wind and race cues. */
(function(A){
  'use strict';
  class RaceAudio{
    constructor(){this.context=null;this.muted=false;this.available=true;this.lastImpact=0;}
    async start(){
      try{
        if(!this.context){
          const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
          if(!Context){this.available=false;return;}
          const ctx=this.context=new Context();
          this.master=ctx.createGain();this.master.gain.value=this.muted?0:.33;this.master.connect(ctx.destination);
          this.engineGain=ctx.createGain();this.engineGain.gain.value=0;
          this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=500;
          this.filter.connect(this.engineGain);this.engineGain.connect(this.master);
          this.oscillators=[];
          for(const [mult,type,volume] of [[1,'sawtooth',.43],[2,'triangle',.29],[.5,'sawtooth',.15]]){
            const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=type;oscillator.frequency.value=45*mult;
            gain.gain.value=volume;oscillator.connect(gain);gain.connect(this.filter);oscillator.start();this.oscillators.push({oscillator,mult});
          }
          const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
          let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*2-1)*.55;data[i]=previous;}
          this.noiseBuffer=buffer;
          this.skid=this.noiseChannel('bandpass',1800,1.8);
          this.wind=this.noiseChannel('lowpass',650,.6);
        }
        if(this.context.state==='suspended')await this.context.resume();
      }catch(error){this.available=false;console.warn('Audio is unavailable; the race is still playable.',error.message);}
    }
    noiseChannel(type,frequency,q){
      const ctx=this.context,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=this.noiseBuffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
      gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();return{gain,filter};
    }
    mute(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.33,this.context.currentTime,.04);}
    update(car,active){
      if(!this.context||!this.available)return;
      const now=this.context.currentTime,speed=car.speed,gear=Math.min(6,1+Math.floor(speed/13));
      const rpm=900+(speed%13)/13*3800+car.throttle*1000;
      for(const {oscillator,mult} of this.oscillators)oscillator.frequency.setTargetAtTime((rpm/60+gear*5)*mult,now,.055);
      this.filter.frequency.setTargetAtTime(400+car.throttle*1100+speed*15,now,.09);
      this.engineGain.gain.setTargetAtTime(active?.13+car.throttle*.14+speed*.001:0,now,.12);
      this.skid.gain.gain.setTargetAtTime(active&&car.speed>9?(car.drifting?.21:Math.max(0,car.slip-.1)*1.1)+car.brake*.035:0,now,.065);
      this.wind.gain.gain.setTargetAtTime(active?Math.pow(speed/78,2)*.25:0,now,.15);
      if(active&&car.impact>.18&&now-this.lastImpact>.4){this.impact(car.impact);this.lastImpact=now;}
    }
    tone(frequency,duration=.15,volume=.25,delay=0){
      if(!this.context||!this.available)return;
      const ctx=this.context,now=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(volume,now+.008);g.gain.exponentialRampToValueAtTime(.001,now+duration);
      o.connect(g);g.connect(this.master);o.start(now);o.stop(now+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    countdown(go){this.tone(go?880:440,go?.5:.14,go?.42:.3);}
    lap(){this.tone(660,.17,.2);this.tone(880,.3,.2,.15);}
    finish(){[523,659,784,1047].forEach((f,i)=>this.tone(f,.45,.24,i*.16));}
    impact(strength){
      const ctx=this.context,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
      source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=400;
      gain.gain.setValueAtTime(strength*.7,now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);
      source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.stop(now+.22);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }
  }
  A.RaceAudio=RaceAudio;
})(globalThis.Apex);
