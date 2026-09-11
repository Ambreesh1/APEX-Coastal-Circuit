/* Keyboard and independent multi-pointer touch input with safe release on blur. */
(function(A){
  'use strict';
  class Input{
    constructor(onAction){
      this.keys=new Set();this.pointers=new Map();this.onAction=onAction;
      this.touch=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
      document.body.classList.toggle('touch',this.touch);
      const driving=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
      addEventListener('keydown',event=>{
        if(event.target.matches('select,input,textarea'))return;
        if(driving.includes(event.code)){event.preventDefault();this.keys.add(event.code);}
        if(event.repeat)return;
        const actions={Escape:'pause',KeyP:'pause',KeyC:'camera',KeyX:'recover',KeyM:'mute',KeyR:'restart'};
        if(actions[event.code]){event.preventDefault();onAction(actions[event.code]);}
        if(event.code==='Enter' && event.target===document.body)onAction('enter');
      });
      addEventListener('keyup',event=>this.keys.delete(event.code));
      addEventListener('blur',()=>{this.clear();onAction('blur');});
      document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();onAction('blur');}});
      for(const button of document.querySelectorAll('[data-control]')){
        button.addEventListener('contextmenu',e=>e.preventDefault());
        button.addEventListener('pointerdown',event=>{
          event.preventDefault();button.setPointerCapture(event.pointerId);this.pointers.set(event.pointerId,button.dataset.control);button.classList.add('pressed');
        });
        const release=event=>{this.pointers.delete(event.pointerId);if(![...this.pointers.values()].includes(button.dataset.control))button.classList.remove('pressed');};
        button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
      }
    }
    clear(){this.keys.clear();this.pointers.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
    read(){
      const touch=new Set(this.pointers.values()),key=(...codes)=>codes.some(k=>this.keys.has(k));
      return{throttle:key('KeyW','ArrowUp')||touch.has('throttle')?1:0,brake:key('KeyS','ArrowDown')||touch.has('brake')?1:0,
        steer:Number(key('KeyD','ArrowRight')||touch.has('right'))-Number(key('KeyA','ArrowLeft')||touch.has('left')),
        drift:key('Space')||touch.has('drift')};
    }
  }
  A.Input=Input;
})(globalThis.Apex);
