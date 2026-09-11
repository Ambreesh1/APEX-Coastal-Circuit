/* Versioned local progression. Storage failures never prevent racing. */
(function(A){
  'use strict';
  const KEY='apex.profile.v1',MAX_XP=(A.CONFIG.maxLevel-1)*A.CONFIG.xpPerLevel;
  class Profile{
    constructor(storage){
      this.storage=storage;this.xp=0;this.races=0;this.records={};this.selection={carId:'gt',trackId:'coastal',tuning:'balanced'};this.saved=true;this.rewarded=new WeakSet();
      try{
        if(storage===undefined)this.storage=globalThis.localStorage;
        const raw=JSON.parse(this.storage?.getItem(KEY)||'null');
        if(raw&&raw.version===1){
          if(Number.isSafeInteger(raw.xp)&&raw.xp>=0)this.xp=Math.min(MAX_XP,raw.xp);
          if(Number.isSafeInteger(raw.races)&&raw.races>=0)this.races=raw.races;
          for(const t of A.TRACKS){const best=raw.records?.[t.id];if(typeof best==='number'&&Number.isFinite(best)&&best>0)this.records[t.id]=best;}
          this.select(raw.selection||{});
        }
        const legacy=Number(this.storage?.getItem('apex.coastal.best.v1'));
        if(Number.isFinite(legacy)&&legacy>0)this.records.coastal=Math.min(this.records.coastal||Infinity,legacy);
      }catch{this.saved=false;}
    }
    get level(){return Math.min(A.CONFIG.maxLevel,1+Math.floor(this.xp/A.CONFIG.xpPerLevel));}
    select(selection){
      const car=A.carDefinition(selection.carId),track=A.trackDefinition(selection.trackId);
      this.selection={carId:car.level<=this.level?car.id:'gt',trackId:track.level<=this.level?track.id:'coastal',tuning:['balanced','grip','speed'].includes(selection.tuning)?selection.tuning:'balanced'};
      return this.selection;
    }
    save(){
      try{
        if(!this.storage)throw new Error('Storage unavailable');
        this.storage.setItem(KEY,JSON.stringify({version:1,xp:this.xp,races:this.races,records:this.records,selection:this.selection}));this.saved=true;
      }catch{this.saved=false;}
      return this.saved;
    }
    best(trackId){return this.records[trackId]||Infinity;}
    record(trackId,time){
      if(!A.TRACKS.some(t=>t.id===trackId)||!Number.isFinite(time)||time<=0||time>=this.best(trackId))return false;
      this.records[trackId]=time;this.save();return true;
    }
    complete(race){
      const c=race.player;
      if(this.rewarded.has(race)||!Number.isFinite(c.finishTime)||c.finishTime<=0||c.completedLaps!==race.totalLaps||c.gates!==race.totalLaps*race.track.checkpoints)return null;
      this.rewarded.add(race);
      const oldLevel=this.level,position=race.standings().indexOf(c)+1;
      const earned=Math.round((200+(7-position)*50)*race.track.definition.multiplier);
      const previous=this.xp;this.xp=Math.min(MAX_XP,this.xp+earned);this.races++;
      for(const time of c.laps)this.record(race.track.id,time);
      this.save();
      return{xp:this.xp-previous,level:this.level,unlocks:[...A.CARS,...A.TRACKS].filter(item=>item.level>oldLevel&&item.level<=this.level).map(item=>item.name)};
    }
  }
  A.Profile=Profile;
})(globalThis.Apex);
