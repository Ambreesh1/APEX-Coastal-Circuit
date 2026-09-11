/* Closed Catmull–Rom circuit, resampled by arc length for physics and geometry. */
(function (A) {
  'use strict';
  class Track {
    constructor(id='coastal') {
      this.definition=A.trackDefinition(id);this.id=this.definition.id;
      this.halfWidth=this.definition.halfWidth;
      this.wallOffset=this.definition.wallOffset;
      this.checkpoints=this.definition.checkpoints;
      this.control=this.definition.control.map(p=>p.slice());
      const raw = [], n = this.control.length;
      for (let i = 0; i < n * 100; i++) {
        const u = i / 100, k = Math.floor(u), t = u - k;
        const p = [-1, 0, 1, 2].map(d => this.control[A.mod(k + d, n)]);
        const coord = axis => .5 * (2*p[1][axis] + (-p[0][axis]+p[2][axis])*t + (2*p[0][axis]-5*p[1][axis]+4*p[2][axis]-p[3][axis])*t*t + (-p[0][axis]+3*p[1][axis]-3*p[2][axis]+p[3][axis])*t*t*t);
        raw.push({x: coord(0), z: coord(1), s: 0});
      }
      raw.push({...raw[0]});
      for (let i = 1; i < raw.length; i++) raw[i].s = raw[i-1].s + Math.hypot(raw[i].x-raw[i-1].x, raw[i].z-raw[i-1].z);
      this.length = raw[raw.length-1].s;
      this.count = Math.ceil(this.length / 2.5);
      this.step = this.length / this.count;
      this.points = [];
      let j = 0;
      for (let i = 0; i < this.count; i++) {
        const s = i * this.step;
        while (raw[j+1].s < s) j++;
        const t = (s-raw[j].s)/(raw[j+1].s-raw[j].s);
        this.points.push({x:A.lerp(raw[j].x,raw[j+1].x,t),z:A.lerp(raw[j].z,raw[j+1].z,t),s});
      }
      this.points.forEach((p,i) => {
        const prev = this.points[A.mod(i-1,this.count)], next = this.points[(i+1)%this.count];
        p.heading = Math.atan2(next.x-prev.x,next.z-prev.z);
        p.nx = Math.cos(p.heading); p.nz = -Math.sin(p.heading);
      });
      this.points.forEach((p,i) => {
        p.curve = A.angle(this.points[(i+3)%this.count].heading-this.points[A.mod(i-3,this.count)].heading)/(6*this.step);
      });
      this.bounds={minX:Math.min(...this.points.map(p=>p.x)),maxX:Math.max(...this.points.map(p=>p.x)),minZ:Math.min(...this.points.map(p=>p.z)),maxZ:Math.max(...this.points.map(p=>p.z))};
    }
    at(distance, offset = 0) {
      const u = A.mod(distance,this.length)/this.step, i = Math.floor(u), t = u-i;
      const a = this.points[i], b = this.points[(i+1)%this.count];
      const heading = a.heading + A.angle(b.heading-a.heading)*t;
      const nx = Math.cos(heading), nz = -Math.sin(heading);
      return {x:A.lerp(a.x,b.x,t)+nx*offset,z:A.lerp(a.z,b.z,t)+nz*offset,heading,nx,nz,curve:A.lerp(a.curve,b.curve,t),s:A.mod(distance,this.length),index:i};
    }
    nearest(x, z, hint = null) {
      let best = null, bestD = Infinity;
      const check = index => {
        const i = A.mod(index,this.count), a = this.points[i], b = this.points[(i+1)%this.count];
        const dx=b.x-a.x,dz=b.z-a.z;
        const t=A.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
        const px=a.x+dx*t,pz=a.z+dz*t,d2=(x-px)**2+(z-pz)**2;
        if(d2<bestD){bestD=d2;const h=Math.atan2(dx,dz);best={x:px,z:pz,index:i,s:A.mod((i+t)*this.step,this.length),heading:h,nx:Math.cos(h),nz:-Math.sin(h),offset:(x-px)*Math.cos(h)-(z-pz)*Math.sin(h),distance:Math.sqrt(d2)};}
      };
      if(hint!==null){for(let j=hint-18;j<=hint+18;j++)check(j);}
      if(!best || bestD>35*35){for(let j=0;j<this.count;j++)check(j);}
      return best;
    }
  }
  A.Track = Track;
})(globalThis.Apex);
