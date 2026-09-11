/* Configurable content and race rules; no DOM or storage dependencies. */
(function(A){
  'use strict';
  A.CONFIG=Object.freeze({step:1/120,laps:3,maxFrame:.1,xpPerLevel:500,maxLevel:50});
  A.CARS=Object.freeze([
    {id:'gt',name:'APEX GT',type:'Balanced GT',level:1,color:'#75f4cd',shape:'gt',acceleration:17,topSpeed:79,handling:1,braking:32,grip:11,driftControl:1,durability:1,pros:'Predictable grip and strong braking',cons:'No specialist advantage'},
    {id:'comet',name:'Comet S',type:'Technical lightweight',level:1,color:'#ffb66d',shape:'compact',acceleration:19.5,topSpeed:70,handling:1.18,braking:36,grip:12.5,driftControl:1.15,durability:.8,pros:'Quick launches and agile cornering',cons:'Lower top speed; impacts cost more'},
    {id:'vortex',name:'Vortex R',type:'Drift coupe',level:2,color:'#b691f4',shape:'coupe',acceleration:18,topSpeed:77,handling:1.1,braking:29,grip:9.8,driftControl:1.5,durability:.95,pros:'Controllable slides and fast exits',cons:'Less grip and longer braking distance'},
    {id:'titan',name:'Titan V8',type:'High-speed muscle',level:3,color:'#ef7186',shape:'muscle',acceleration:15.5,topSpeed:92,handling:.83,braking:27,grip:10.5,driftControl:.85,durability:1.35,pros:'Fast straights and impact resistance',cons:'Heavy steering and early braking'}
  ]);
  A.TRACKS=Object.freeze([
    {id:'coastal',name:'Coastal Circuit',environment:'Golden-hour coastline',theme:'coastal',difficulty:'Balanced',multiplier:1,level:1,halfWidth:9,wallOffset:13,checkpoints:8,corners:13,recommended:'Balanced GT',referenceLap:43,control:[[0,-300],[160,-300],[280,-220],[310,-60],[235,70],[295,215],[155,310],[-35,295],[-215,200],[-265,40],[-180,-70],[-235,-215],[-110,-300]]},
    {id:'mountain',name:'Mountain Pass',environment:'Pine forest and rocky peaks',theme:'mountain',difficulty:'Technical',multiplier:1.25,level:2,halfWidth:6.5,wallOffset:10,checkpoints:8,corners:17,recommended:'Technical lightweight',referenceLap:48,control:[[0,-270],[160,-270],[245,-190],[180,-105],[265,-10],[160,70],[210,175],[110,265],[-15,210],[-110,280],[-215,175],[-150,85],[-245,0],[-150,-75],[-235,-165],[-145,-260],[-65,-210]]},
    {id:'desert',name:'Desert Highway',environment:'Dunes and sandstone mesas',theme:'desert',difficulty:'High speed',multiplier:1.15,level:3,halfWidth:10,wallOffset:14,checkpoints:8,corners:8,recommended:'High-speed muscle',referenceLap:58,control:[[-270,-440],[260,-440],[350,-330],[350,310],[240,430],[-260,430],[-350,310],[-350,-320]]}
  ]);
  A.carDefinition=id=>A.CARS.find(c=>c.id===id)||A.CARS[0];
  A.trackDefinition=id=>A.TRACKS.find(t=>t.id===id)||A.TRACKS[0];
  A.carSetup=(id,tuning='balanced')=>{
    const c={...A.carDefinition(id)};
    if(tuning==='grip'){c.grip*=1.1;c.topSpeed*=.96;c.driftControl*=.9;}
    if(tuning==='speed'){c.topSpeed*=1.045;c.braking*=.94;c.handling*=.94;}
    return c;
  };
})(globalThis.Apex);
