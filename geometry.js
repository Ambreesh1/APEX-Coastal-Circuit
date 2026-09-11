/* Batched low-poly geometry. Vertices contain position, normal and linear RGB. */
(function (A) {
  'use strict';
  class Geometry {
    constructor(){this.vertices=[];}
    tri(a,b,c,color,normal=null){
      const n=normal||A.vec.normalize(A.vec.cross(A.vec.sub(b,a),A.vec.sub(c,a)));
      const rgb=typeof color==='string'?A.color(color):color;
      for(const p of [a,b,c])this.vertices.push(...p,...n,...rgb);
      return this;
    }
    quad(a,b,c,d,color,normal=null){this.tri(a,b,c,color,normal);this.tri(a,c,d,color,normal);return this;}
    box(x,y,z,w,h,d,color,yaw=0){
      const cs=Math.cos(yaw),sn=Math.sin(yaw);
      const p=(xx,yy,zz)=>[x+xx*cs+zz*sn,y+yy,z-xx*sn+zz*cs];
      const X=w/2,Y=h/2,Z=d/2;
      const v=[p(-X,-Y,-Z),p(X,-Y,-Z),p(X,Y,-Z),p(-X,Y,-Z),p(-X,-Y,Z),p(X,-Y,Z),p(X,Y,Z),p(-X,Y,Z)];
      for(const [indices,n] of [[[0,3,2,1],[0,0,-1]],[[4,5,6,7],[0,0,1]],[[0,4,7,3],[-1,0,0]],[[1,2,6,5],[1,0,0]],[[3,7,6,2],[0,1,0]],[[0,1,5,4],[0,-1,0]]]){
        this.quad(...indices.map(i=>v[i]),color,[n[0]*cs+n[2]*sn,n[1],-n[0]*sn+n[2]*cs]);
      }
      return this;
    }
    cylinder(x,y,z,bottom,top,height,color,segments=8,axis='y'){
      const p=(r,a,h)=>axis==='x'?[x+h,y+Math.cos(a)*r,z+Math.sin(a)*r]:[x+Math.cos(a)*r,y+h,z+Math.sin(a)*r];
      for(let i=0;i<segments;i++){
        const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
        this.quad(p(bottom,a,-height/2),p(top,a,height/2),p(top,b,height/2),p(bottom,b,-height/2),color);
        if(top>0)this.tri(p(0,0,height/2),p(top,a,height/2),p(top,b,height/2),color,axis==='x'?[1,0,0]:[0,1,0]);
        if(bottom>0)this.tri(p(0,0,-height/2),p(bottom,b,-height/2),p(bottom,a,-height/2),color,axis==='x'?[-1,0,0]:[0,-1,0]);
      }
      return this;
    }
    sphere(x,y,z,r,color,segments=8,rings=5){
      const p=(a,b)=>[x+Math.cos(a)*Math.sin(b)*r,y+Math.cos(b)*r,z+Math.sin(a)*Math.sin(b)*r];
      for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
        const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,c=j/rings*Math.PI,d=(j+1)/rings*Math.PI;
        this.quad(p(a,c),p(a,d),p(b,d),p(b,c),color);
      }
      return this;
    }
    disk(x,y,z,rx,rz,color,segments=16){
      for(let i=0;i<segments;i++){
        const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
        this.tri([x,y,z],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],color,[0,1,0]);
      }
      return this;
    }
    beam(a,b,width,height,color){
      const dx=b[0]-a[0],dz=b[2]-a[2];
      return this.box((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,height,Math.hypot(dx,dz)+.1,color,Math.atan2(dx,dz));
    }
    data(){return new Float32Array(this.vertices);}
  }
  function carGeometry(hex,shape='gt'){
    const g=new Geometry(),c=A.color(hex),dark=c.map(v=>v*.65),light=c.map(v=>Math.min(1,v*1.12));
    g.box(0,.42,0,2.05,.32,4.5,'#111d24');
    // Low wedge body with a broad shoulder and tapered nose.
    const rear=[[-1,.53,-2.15],[1,.53,-2.15],[1,.92,-1.85],[-1,.92,-1.85]];
    const nose=[[-.94,.48,2.35],[.94,.48,2.35],[.92,.76,2.15],[-.92,.76,2.15]];
    g.quad(rear[0],rear[1],rear[2],rear[3],dark);
    g.quad(nose[0],nose[3],nose[2],nose[1],c);
    g.quad(rear[0],rear[3],nose[3],nose[0],c);
    g.quad(rear[1],nose[1],nose[2],rear[2],dark);
    g.quad(rear[3],rear[2],nose[2],nose[3],light,[0,1,0]);
    // Sloping windshield, rear glass, roof and side glazing.
    const low=[[-.87,.9,-1.23],[.87,.9,-1.23],[.83,.83,1.02],[-.83,.83,1.02]];
    const roof=[[-.69,1.43,-.65],[.69,1.43,-.65],[.65,1.4,.25],[-.65,1.4,.25]];
    if(shape==='compact')for(const p of roof){p[1]+=.2;p[2]-=.22;}
    if(shape==='coupe')for(const p of roof){p[1]-=.13;p[2]-=.12;}
    if(shape==='muscle'){for(const p of roof)p[0]*=1.12;g.box(0,.93,1.45,.65,.22,.75,dark);}
    g.quad(low[3],low[2],roof[2],roof[3],'#274758');
    g.quad(low[0],roof[0],roof[1],low[1],'#152d3d');
    g.quad(low[0],low[3],roof[3],roof[0],'#193445');
    g.quad(low[1],roof[1],roof[2],low[2],'#193445');
    g.quad(...roof,c,[0,1,0]);
    g.box(0,roof[0][1]+.015,(roof[0][2]+roof[2][2])/2,.22,.02,.87,'#d6f7ed');
    g.box(0,.815,1.55,.18,.025,1.03,'#c2f5e1');
    for(const side of [-1,1]){
      g.box(side*.76,.72,2.26,.4,.085,.05,'#e4ffff');
      g.box(side*.7,.75,-2.17,.48,.1,.045,'#ff4e51');
      g.box(side*1.06,.99,.35,.25,.13,.26,c);
      g.box(side*1.04,.43,0,.1,.12,2.9,'#0d1920');
      g.box(side*.65,.92,-1.82,.08,.38,.1,'#16252b');
      for(const z of [-1.42,1.42]){
        g.cylinder(side*1.02,.43,z,.43,.43,.28,'#121920',12,'x');
        g.cylinder(side*1.17,.43,z,.27,.27,.025,'#667b83',10,'x');
        g.cylinder(side*1.19,.43,z,.12,.12,.03,'#172a30',8,'x');
      }
    }
    g.box(0,1.15,-1.9,2.15,.09,.4,'#17262c');
    g.box(0,.57,-2.2,1.55,.08,.06,'#ff4c4d');
    g.box(0,.42,2.32,1.65,.1,.14,'#0c171e');
    g.box(-.65,.35,-2.29,.2,.15,.16,'#91a5a7');g.box(.65,.35,-2.29,.2,.15,.16,'#91a5a7');
    return g;
  }
  Object.assign(A,{Geometry,carGeometry});
})(globalThis.Apex);
