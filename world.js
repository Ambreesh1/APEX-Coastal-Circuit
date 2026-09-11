/* Procedural coastal scenery: all assets are generated locally and batched once. */
(function (A) {
  'use strict';
  function buildWorld(track){
    const g=new A.Geometry(),rnd=A.random(2206),width=track.halfWidth,theme=track.definition.theme;
    const point=(s,offset,y=.045)=>{const p=track.at(s,offset);return[p.x,y,p.z];};
    const strip=(s0,s1,a,b,color,y=.045)=>g.quad(point(s0,a,y),point(s1,a,y),point(s1,b,y),point(s0,b,y),color,[0,1,0]);
    const boxAt=(s,o,y,w,h,d,color)=>{const p=track.at(s,o);g.box(p.x,y,p.z,w,h,d,color,p.heading);};
    g.box(0,-1.1,0,2100,2,2100,theme==='desert'?'#bd9b68':theme==='mountain'?'#476750':'#527964');
    // Coastal shelf, sand and sea. The eastern side of the course overlooks water.
    if(theme==='coastal'){
    g.box(1050,-.35,0,1200,.1,3200,'#377e89');
    g.box(451,-.05,0,35,.12,1450,'#b9b796');
    for(let i=0;i<65;i++){
      const x=475+rnd()*1000,z=(rnd()-.5)*2200;
      g.box(x,-.27,z,10+rnd()*75,.015,.3+rnd()*.7,'#6bacae');
    }
    }
    for(let i=0;i<track.count;i++){
      const s=i*track.step,e=s+track.step;
      strip(s,e,-track.wallOffset+.2,track.wallOffset-.2,i%5===0?'#9b9b81':'#91957d',.006);
      const v=.205+rnd()*.014;
      strip(s,e,-width,width,[v*.9,v,v*1.05],.04);
      for(const sign of [-1,1]){
        strip(s,e,sign*width,sign*(width+1),i%4<2?'#e6e3d2':'#cf6458',.052);
        strip(s,e,sign*(width-.45),sign*(width-.32),'#e6e4d7',.058);
        const p0=point(s,sign*track.wallOffset,.78),p1=point(e,sign*track.wallOffset,.78);
        g.beam(p0,p1,.38,.7,i%12<6?'#d0d5ce':'#626e6c');
        if(i%4===0){boxAt(s,sign*track.wallOffset,.52,.2,1,.22,'#475956');}
      }
      if(i%8<3){strip(s,e,-.07,.07,'#b7bcb0',.055);}
      // Subtle rubber laid down near the racing line.
      if(Math.abs(track.points[i].curve)>.007 && i%3!==0){
        const lane=-Math.sign(track.points[i].curve)*2.8;
        strip(s,e,lane-.78,lane-.66,'#2a3336',.06);strip(s,e,lane+.66,lane+.78,'#2a3336',.06);
      }
    }
    // The start line and six painted grid boxes.
    for(let row=0;row<3;row++)for(let col=0;col<18;col++)strip(row*.65,(row+1)*.65,-width+col*width/9,-width+(col+1)*width/9,(row+col)%2?'#edf0e3':'#202b31',.075);
    for(let i=0;i<6;i++){
      const s=-10-Math.floor(i/2)*8,o=(i%2===0?-1:1)*3;
      strip(s-2.6,s+2.6,o-1.4,o-1.3,'#d1d8c7',.07);
      strip(s-2.6,s+2.6,o+1.3,o+1.4,'#d1d8c7',.07);
      strip(s+2.5,s+2.6,o-1.4,o+1.4,'#d1d8c7',.07);
    }
    const glyph={A:['01110','11011','11011','11111','11011','11011','11011'],P:['11110','11011','11011','11110','11000','11000','11000'],E:['11111','11000','11000','11110','11000','11000','11111'],X:['11011','11011','01110','00100','01110','11011','11011']};
    const sign=(s,offset,y,width=12)=>{
      const p=track.at(s,offset),h=p.heading,cs=Math.cos(h),sn=Math.sin(h);
      g.box(p.x,y,p.z,width,2.6,.4,'#142b30',h);
      const unit=width/31,text='APEX';
      for(let k=0;k<text.length;k++)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[text[k]][row][col]==='1'){
        const x=(11.5-k*6-col)*unit,z=-.23;
        g.box(p.x+x*cs+z*sn,y+(3-row)*unit,p.z-x*sn+z*cs,unit*.86,unit*.86,.035,'#8bffdb',h);
      }
    };
    boxAt(3,-11.5,3.4,.65,6.8,.65,'#233b3d');boxAt(3,11.5,3.4,.65,6.8,.65,'#233b3d');
    sign(3,0,6.5,24);
    for(let i=0;i<5;i++)boxAt(3,-2+i,4.8,.45,.45,.45,'#343e3a');
    for(let cp=1;cp<track.checkpoints;cp++)for(const side of [-1,1]){
      boxAt(track.length*cp/track.checkpoints,side*(track.wallOffset+1),1.6,.3,3.2,.3,'#75d9bb');
      boxAt(track.length*cp/track.checkpoints,side*(track.wallOffset+1),3.3,1.1,.6,.22,'#c6f3d5');
    }
    // Pit complex and spectator grandstands along the main straight.
    for(let i=0;i<9;i++){
      const s=24+i*12;
      boxAt(s,28,3.5,17,7,10,'#c3c6b4');boxAt(s,28,7.1,18,.35,11,'#344e52');
      boxAt(s,19.4,2.5,.18,3.7,7.5,'#31434a');boxAt(s,22,5.2,.2,1.1,10,'#6a9299');
      boxAt(s,18.8,.03,9,.04,10,'#727d74');
    }
    for(let row=0;row<5;row++){
      boxAt(60,-23-row*2,1+row*.8,2,1.7+row*1.6,90,'#819895');
      for(let j=0;j<40;j++){
        const s=18+j*2.1;
        boxAt(s,-23-row*2,2+row*1.6,.6,.55,.55,['#e7b477','#d9ded0','#456d75','#d77566'][Math.floor(rnd()*4)]);
      }
    }
    boxAt(60,-29,10,17,.45,98,'#234a50');
    for(const s of [15,60,105])boxAt(s,-36,5,.4,10,.4,'#435955');
    // Road furniture: lamps, sponsor boards, distance markers and cones.
    for(let s=155;s<track.length-70;s+=75){
      const p=track.at(s,-15.5);
      g.box(p.x,4,p.z,.18,8,.18,'#3e5353');
      const arm=track.at(s,-13.3);g.beam([p.x,8,p.z],[arm.x,8,arm.z],.16,.15,'#526260');
      g.box(arm.x,7.95,arm.z,1.3,.12,.5,'#ecddad',p.heading);
      if(Math.abs(track.at(s+35).curve)>.012){
        boxAt(s,15,1.2,.12,2.4,.12,'#b6c4b1');boxAt(s,15,2.4,.2,1.1,1.5,'#f2cc7e');
      }
    }
    for(let s=220;s<track.length;s+=280){sign(s,-19,3.2,10);boxAt(s,-19,1.3,.3,2.6,.3,'#3b5250');}
    for(let i=0;i<15;i++){
      const p=track.at(12+i*5,11.6);g.cylinder(p.x,.4,p.z,.22,0,.8,'#e58c59',6);
      g.cylinder(p.x,.36,p.z,.15,.11,.14,'#e3ded0',6);
    }
    function tree(x,z,size,palm=false){
      g.disk(x+1,.008,z+1,size*.65,size*.5,'#3e6455',8);
      g.cylinder(x,size*.47,z,.28,.14,size*.94,'#766b4c',6);
      if(palm){
        for(let i=0;i<7;i++){
          const a=i*Math.PI*2/7,dx=Math.cos(a)*size*.6,dz=Math.sin(a)*size*.6;
          g.tri([x,size,z],[x+dx,size*.76,z+dz],[x+dx*.5-dz*.18,size*1.03,z+dz*.5+dx*.18],'#376b50');
          g.tri([x,size,z],[x+dx*.5+dz*.18,size*1.03,z+dz*.5-dx*.18],[x+dx,size*.76,z+dz],'#52835a');
        }
      }else{
        g.cylinder(x,size*.85,z,size*.4,0,size*.85,'#356650',7);
        g.cylinder(x,size*1.12,z,size*.3,0,size*.7,'#477e5a',7);
      }
    }
    for(let i=0;i<470;i++){
      const x=-470+rnd()*880,z=-490+rnd()*1000,p=track.nearest(x,z);
      if(p.distance<21 || (p.s<145 && p.distance<60) || (p.s>track.length-40 && p.distance<40))continue;
      if(theme==='desert'){
        if(i%4===0){const size=2+rnd()*5;g.cylinder(x,size/2,z,size,size*.65,size,'#a58058',6);}
      }else tree(x,z,4+rnd()*8,theme==='coastal'&&(x>270 || i%9===0));
    }
    // Low-rise coastal town, balconies and illuminated window strips.
    for(let i=0;i<(theme==='coastal'?45:0);i++){
      const x=-380+rnd()*220,z=-110+rnd()*280,p=track.nearest(x,z);
      if(p.distance<45)continue;
      const w=10+rnd()*17,d=10+rnd()*17,h=7+rnd()*35;
      const color=['#b8b8a0','#c4b9a2','#8d9f98','#a4ac9b'][i%4];
      g.box(x,h/2,z,w,h,d,color);g.box(x,h+.25,z,w+1,.5,d+1,'#456263');
      for(let y=3;y<h-1;y+=3.5){
        g.box(x,y,z-d/2-.03,w*.85,1.35,.05,i%3?'#4d7276':'#dbbb7d');
        g.box(x+w/2+.03,y,z,.05,1.35,d*.8,'#567d7c');
      }
      g.box(x,h+1.2,z,3,2,3,'#82948a');
    }
    // Layered faceted mountains frame the inland horizon.
    for(let i=0;i<42;i++){
      const a=i/42*Math.PI*2,r=780+rnd()*340,x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(theme==='coastal'&&x>520)continue;
      const h=90+rnd()*180;
      g.cylinder(x,h/2-10,z,140+rnd()*170,theme==='desert'?90:8,h,theme==='desert'?'#a27c59':i%2?'#657f79':'#78908a',7);
    }
    return g;
  }
  A.buildWorld=buildWorld;
})(globalThis.Apex);
