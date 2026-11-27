import * as T from 'three';
import {airport,regionGround} from './region.js';

const clamp=T.MathUtils.clamp;
const approach=(value,to,dt,rate)=>T.MathUtils.lerp(value,to,1-Math.exp(-dt*rate));
const boxGeometry=new T.BoxGeometry(1,1,1);
const sphere=new T.SphereGeometry(1,32,20);
const material=(color,extra={})=>new T.MeshPhysicalMaterial({color,roughness:.36,metalness:.24,...extra});
const luminous=color=>new T.MeshBasicMaterial({color,toneMapped:false});
const ivory=material(0xe6ece9,{clearcoat:.78,emissive:0x25313b,emissiveIntensity:.46});
const indigo=material(0x183b66,{clearcoat:.69,emissive:0x0e1d42,emissiveIntensity:.56});
const burgundy=material(0x821e32,{clearcoat:.75,emissive:0x300a20,emissiveIntensity:.50});
const gold=material(0xe4a455,{metalness:.43});
const cabin=material(0x344b5b,{roughness:.13,metalness:.41,clearcoat:1,emissive:0x172839,emissiveIntensity:.68});
const rubber=material(0x161b21,{metalness:0,roughness:.87});
const graphite=material(0x212a33,{roughness:.49});
const alloy=material(0xa3b1bf,{metalness:.82,roughness:.29});
const port=luminous(0xff4351),starboard=luminous(0x51ffc4),landing=luminous(0xf5fcff);
function part(group,geometry,mat,x=0,y=0,z=0){
  const item=new T.Mesh(geometry,mat);
  item.position.set(x,y,z);group.add(item);return item;
}
function box(group,mat,x,y,z,w,h,d){
  const item=part(group,boxGeometry,mat,x,y,z);
  item.scale.set(w,h,d);return item;
}
function bulb(group,mat,x,y,z,radius,yScale=1,zScale=1){
  const item=part(group,sphere,mat,x,y,z);
  item.scale.set(radius,radius*yScale,radius*zScale);return item;
}
function rod(group,mat,start,end,r0,r1=r0){
  const a=new T.Vector3(...start),b=new T.Vector3(...end),d=b.clone().sub(a);
  const item=part(group,new T.CylinderGeometry(r1,r0,d.length(),10),mat,...a.lerp(b,.5));
  item.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,d.normalize());return item;
}
function tube(group,mat,points,radius){
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return part(group,new T.TubeGeometry(path,Math.max(12,points.length*4),radius,8,false),mat);
}
// Interpolated cross sections control the width, roof and belly independently.
function fuselage(group,sections,mat,roundness=2.25){
  const bands=32,steps=(sections.length-1)*4;
  function surface(section,angle,lift=0){
    const i=Math.min(sections.length-2,Math.floor(section)),t=section-i;
    const a=sections[i],b=sections[i+1];
    const [z,w,bottom,top]=a.map((v,j)=>T.MathUtils.lerp(v,b[j],t));
    const c=Math.cos(angle),s=Math.sin(angle),power=2/roundness;
    return [(w+lift)*Math.sign(c)*Math.abs(c)**power,(top+bottom)/2+
      ((top-bottom)/2+lift)*Math.sign(s)*Math.abs(s)**power,z];
  }
  function skin(material,x0,x1,a0,a1,lift=0,columns=steps,rows=bands,mirrorInk=false){
    const positions=[],indices=[],uv=[];
    for(let i=0;i<=columns;i++)for(let j=0;j<=rows;j++){
      positions.push(...surface(T.MathUtils.lerp(x0,x1,i/columns),T.MathUtils.lerp(a0,a1,j/rows),lift));
      if(material.map)uv.push(mirrorInk?1-i/columns:i/columns,j/rows);
    }
    for(let i=0;i<columns;i++)for(let j=0;j<rows;j++){
      const a=i*(rows+1)+j,b=a+rows+1;
      if(a1>a0)indices.push(a,a+1,b,a+1,b+1,b);
      else indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    if(uv.length)geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    return part(group,geometry,material);
  }
  skin(mat,0,sections.length-1,0,2*Math.PI);
  return {surface,skin};
}
function controlSurface(group,mat,sections,orient){
  const positions=[],indices=[];
  const ring=24;
  for(const [span,lead,trail,center,thickness] of sections){
    for(let j=0;j<ring;j++){
      const angle=j*2*Math.PI/ring,u=(1-Math.cos(angle))*.5;
      const height=center+Math.sin(angle)*thickness*(1.12-.61*u);
      positions.push(...orient(span,height,T.MathUtils.lerp(lead,trail,u)));
    }
  }
  for(let i=1;i<sections.length;i++)for(let j=0;j<ring;j++){
    const a=(i-1)*ring+j,b=(i-1)*ring+(j+1)%ring,c=a+ring,d=b+ring;
    indices.push(a,b,c,b,d,c);
  }
  // Mirrored assemblies have opposite source winding.
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const check=geometry.attributes.normal;
  const i=ring+4,opposite=ring+20;
  const outward=new T.Vector3(...positions.slice(i*3,i*3+3))
    .sub(new T.Vector3(...positions.slice(opposite*3,opposite*3+3)));
  if(outward.dot(new T.Vector3().fromBufferAttribute(check,i))<0){
    for(let j=0;j<indices.length;j+=3)[indices[j],indices[j+1]]=[indices[j+1],indices[j]];
    geometry.setIndex(indices);geometry.computeVertexNormals();
  }
  return part(group,geometry,mat);
}
const haloBytes=new Uint8Array(32*32*4);
for(let i=0;i<32*32;i++){
  const r=Math.hypot(i%32-15.5,Math.floor(i/32)-15.5)/15.5;
  const j=i*4;
  haloBytes[j]=haloBytes[j+1]=haloBytes[j+2]=255;
  haloBytes[j+3]=Math.round(255*Math.max(0,1-r)**3);
}
const glowTexture=new T.DataTexture(haloBytes,32,32);glowTexture.needsUpdate=true;
function beacon(group,mat,x,y,z,size,radius=.064){
  const light=new T.Group();
  light.position.set(x,y,z);group.add(light);
  bulb(light,mat,0,0,0,radius);
  const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:mat.color,transparent:true,opacity:.82,
    blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
  glow.scale.set(size,size,1);light.add(glow);
  return light;
}
function decal(label,ink){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 85px sans-serif';ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,256,56,496);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
}
function wheel(group,x,y,z,radius,width){
  const tire=part(group,new T.CylinderGeometry(radius,radius,width,28),rubber,x,y,z);
  tire.rotation.z=Math.PI/2;
  for(const side of [-1,1]){
    const cap=part(group,new T.CylinderGeometry(radius*.56,radius*.62,.028,21),alloy,x+side*(width*.5+.012),y,z);
    cap.rotation.z=Math.PI/2;
    bulb(group,graphite,x+side*(width*.5+.033),y,z,radius*.24,1,1).scale.x=.022;
  }
}
function fin(group,color,sections,x=0){
  return controlSurface(group,color,sections,(span,thick,z)=>[x+thick,span,z]);
}

function planeModel(){
  const group=new T.Group();group.name='High-wing single engine trainer';
  const body=fuselage(group,[
    [-4.21,.015,1.07,1.12],[-3.92,.22,.94,1.35],[-3.16,.37,.77,1.54],
    [-2.24,.50,.66,1.74],[-1.19,.66,.54,2.12],[-.59,.75,.49,2.24],
    [.65,.77,.47,2.25],[1.27,.75,.49,2.14],[1.79,.67,.56,1.72],[2.50,.63,.61,1.58],
    [3.05,.55,.67,1.51],[3.38,.39,.76,1.41],[3.49,.03,1.02,1.19],
  ],ivory,2.57);
  const {surface,skin}=body;
  const flashing=[],registration=decal('N172RP','#173453');
  for(const side of [-1,1]){
    const angle=a=>side===1?a:Math.PI-a;
    skin(indigo,1.32,11.79,angle(-.255),angle(-.081),.012,38,3);
    skin(gold,1.55,11.79,angle(-.075),angle(-.015),.014,38,2);
    for(const [from,to,bottom,top] of [[4.27,5.11,.34,1.02],[5.25,6.83,.33,1.017],[6.99,7.4,.36,1.00]]){
      skin(graphite,from-.04,to+.045,angle(bottom-.025),angle(top+.026),.014,10,8);
      skin(cabin,from,to,angle(bottom),angle(top),.023,10,8);
    }
    const door=[
      surface(5.19,angle(.35),.020),surface(5.19,angle(-.52),.018),
      surface(6.95,angle(-.50),.018),surface(6.95,angle(.38),.020),
    ];
    tube(group,graphite,door,.012);
    const [hx,hy,hz]=surface(5.46,angle(.18),.034);
    box(group,alloy,hx,hy,hz,.048,.038,.17);
    for(let n=0;n<5;n++){
      const [vx,vy,vz]=surface(9.4+n*.23,angle(.22),.027);
      box(group,graphite,vx,vy,vz,.024,.091,.039);
    }
    if(registration)skin(registration,2.45,3.93,angle(.17),angle(.59),.025,12,6,side===1);
    const wing=[
      [0,1.36,-.70,2.245,.137],[.93,1.34,-.68,2.27,.132],[2.83,1.26,-.63,2.331,.111],
      [4.20,1.14,-.51,2.393,.085],[5.1,.96,-.4,2.444,.056],[5.45,.80,-.23,2.461,.028],
      [5.56,.77,-.14,2.463,.006],
    ];
    controlSurface(group,ivory,wing,(span,y,z)=>[side*span,y,z]);
    controlSurface(group,indigo,[[5.09,.974,-.409,2.444,.059],[5.45,.811,-.240,2.461,.031],[5.565,.77,-.14,2.463,.008]],
      (span,y,z)=>[side*span,y,z]);
    tube(group,graphite,[[side*1.0,2.292,-.396],[side*2.60,2.355,-.38],[side*4.59,2.449,-.299]],.013);
    rod(group,ivory,[side*.53,.88,-.07],[side*3.51,2.277,.151],.051,.039);
    rod(group,alloy,[side*.65,.854,-.053],[side*3.40,2.263,.166],.018,.012);
    beacon(group,side===1?port:starboard,side*5.525,2.465,.42,.53,.052);
    flashing.push(beacon(group,landing,side*5.426,2.47,-.153,.63,.046));
    controlSurface(group,ivory,[[0,-3.04,-4.08,1.33,.067],[1.17,-3.26,-4.03,1.36,.05],[1.82,-3.42,-3.94,1.39,.016]],
      (span,y,z)=>[side*span,y,z]);
    rod(group,alloy,[side*.43,.63,-.30],[side*.98,.285,-.42],.077,.057);
    wheel(group,side*.99,.271,-.46,.266,.175);
    bulb(group,ivory,side*.98,.405,-.44,.154,1.36,3.17);
  }
  skin(cabin,6.93,8.30,.52,Math.PI-.52,.027,17,19);
  tube(group,ivory,[surface(6.97,Math.PI*.5,.033),surface(7.56,Math.PI*.5,.033),surface(8.25,Math.PI*.5,.033)],.028);
  fin(group,indigo,[[1.23,-2.77,-4.18,0,.094],[1.68,-2.98,-4.15,0,.072],[2.4,-3.42,-4.04,0,.055],[2.74,-3.63,-3.95,0,.031],[2.79,-3.69,-3.87,0,.009]]);
  tube(group,gold,[[0,2.72,-3.70],[0,2.75,-3.81],[0,2.74,-3.96]],.026);
  rod(group,alloy,[0,.75,2.33],[0,.22,2.27],.054);
  wheel(group,0,.204,2.26,.20,.142);
  bulb(group,ivory,0,.315,2.27,.13,1.3,2.64);
  bulb(group,graphite,0,1.26,3.399,.23,.39,.20);
  beacon(group,landing,0,.918,3.348,.74,.058);
  flashing.push(beacon(group,port,0,2.79,-3.90,.45,.049));
  beacon(group,landing,0,1.237,-4.165,.47,.044);
  const prop=new T.Group();prop.position.set(0,1.104,3.44);group.add(prop);
  bulb(prop,alloy,0,0,.12,.185,1,1.82);
  for(const side of [-1,1]){
    controlSurface(prop,graphite,[[.12,.048,-.052,0,.025],[.42,.049,-.112,0,.031],
      [.84,.006,-.179,0,.021],[1.12,-.045,-.183,0,.013],[1.26,-.068,-.16,0,.008]],
      (r,h,z)=>[z,side*r,h]);
    box(prop,gold,-.113,side*1.157,0,.107,.145,.031);
  }
  return {group,prop,flashing};
}

function helicopterModel(){
  const group=new T.Group();group.name='Light utility helicopter';
  const shell=fuselage(group,[
    [-2.09,.20,1.16,1.81],[-1.84,.49,.91,2.05],[-1.38,.72,.60,2.15],[-.71,.91,.47,2.29],
    [.17,.96,.42,2.38],[.99,.93,.47,2.34],[1.50,.83,.57,2.22],[1.88,.66,.70,2.06],
    [2.13,.40,.88,1.83],[2.23,.018,1.20,1.45],
  ],ivory,2.18);
  const {surface,skin}=shell;
  const flashing=[],registration=decal('RP–06','#f1d2ba');
  for(const side of [-1,1]){
    const angle=t=>side===1?t:Math.PI-t;
    skin(burgundy,.21,8.81,angle(-.65),angle(-.19),.014,46,5);
    skin(gold,.22,8.72,angle(-.175),angle(-.103),.017,42,2);
    for(const [from,to] of [[2.49,3.94],[4.09,5.75]]){
      skin(graphite,from-.04,to+.04,angle(.24),angle(1.055),.014,11,10);
      skin(cabin,from,to,angle(.281),angle(1.01),.021,11,10);
    }
    const points=[
      surface(4.03,angle(.28),.026),surface(4.03,angle(-.71),.022),
      surface(5.88,angle(-.68),.023),surface(5.88,angle(.30),.023),
    ];
    tube(group,graphite,points,.012);
    const [hx,hy,hz]=surface(4.43,angle(.041),.026);
    box(group,alloy,hx,hy,hz,.051,.034,.166);
    if(registration)skin(registration,3.7,4.61,angle(-.43),angle(-.26),.026,12,6,side===1);
    for(const z of [-.98,.91]){
      tube(group,alloy,[[side*.58,.69,z],[side*.71,.41,z],[side*.95,.19,z]],.058);
    }
    tube(group,graphite,[[side*.97,.23,-1.82],[side*.97,.144,-1.57],[side*.97,.14,.63],
      [side*.97,.145,1.28],[side*.97,.20,1.60],[side*.97,.38,1.83]],.063);
    for(const z of [-.91,.95])box(group,rubber,side*.97,.098,z,.145,.09,.29);
    const [x,y,z]=surface(6.09,angle(-.043),.052);
    beacon(group,side===1?port:starboard,x,y,z,.52,.049);
    tube(group,graphite,[[side*.36,2.34,-1.18],[side*.43,2.44,-.87],[side*.37,2.54,-.31]],.031);
    rod(group,alloy,[side*.311,2.401,-1.046],[side*.299,2.439,-1.52],.091,.089);
  }
  skin(cabin,5.89,8.73,.15,Math.PI-.15,.024,22,38);
  tube(group,ivory,[surface(5.9,Math.PI*.5,.036),surface(6.76,Math.PI*.5,.038),
    surface(7.75,Math.PI*.5,.037),surface(8.72,Math.PI*.5,.037)],.026);
  tube(group,graphite,[surface(8.25,.39,.033),surface(8.49,.62,.033),surface(8.68,.88,.033)],.012);
  bulb(group,indigo,0,2.294,-.42,.49,.70,2.13);
  bulb(group,graphite,.31,2.39,-1.023,.128,.68,2.2);
  bulb(group,graphite,-.31,2.39,-1.023,.128,.68,2.2);
  const boom=fuselage(group,[[-5.44,.057,1.97,2.1],[-5.12,.12,1.91,2.17],
    [-4.26,.158,1.83,2.19],[-3.23,.235,1.61,2.12],[-2.02,.35,1.25,2.04],[-1.61,.37,1.21,2.05]],ivory);
  boom.skin(burgundy,.12,4.76,-.23,.06,.012,19,3);
  boom.skin(burgundy,.12,4.76,Math.PI-.06,Math.PI+.23,.012,19,3);
  fin(group,burgundy,[[1.46,-5.06,-5.37,0,.045],[1.97,-4.89,-5.47,0,.076],[2.4,-4.98,-5.44,0,.061],[2.94,-5.15,-5.42,0,.038],[3.028,-5.22,-5.41,0,.009]]);
  for(const side of [-1,1])controlSurface(group,burgundy,[[0,-3.64,-4.31,1.97,.048],[.64,-3.84,-4.24,2,.03],[.87,-3.92,-4.21,2.01,.008]],
    (span,y,z)=>[side*span,y,z]);
  const tailRotor=new T.Group();tailRotor.position.set(.194,2.11,-5.19);group.add(tailRotor);
  rod(tailRotor,alloy,[-.084,0,0],[.086,0,0],.087,.065);
  for(let j=0;j<2;j++){
    const blade=new T.Group();blade.rotation.x=j*Math.PI;
    box(blade,graphite,0,.365,0,.043,.732,.115);
    box(blade,gold,0,.686,0,.050,.140,.119);tailRotor.add(blade);
  }
  rod(group,alloy,[0,2.47,-.32],[0,2.89,-.32],.069);
  rod(group,graphite,[0,2.52,-.32],[0,2.68,-.32],.12,.09);
  const prop=new T.Group();prop.position.set(0,2.886,-.32);group.add(prop);
  bulb(prop,alloy,0,0,0,.21,.46,1.29);
  for(let i=0;i<3;i++){
    const blade=new T.Group();blade.rotation.y=i*Math.PI*2/3;prop.add(blade);
    rod(blade,alloy,[0,-.01,.10],[0,-.016,.62],.048,.055);
    controlSurface(blade,graphite,[[.31,.10,-.102,0,.041],[.79,.135,-.125,-.008,.03],
      [3.73,.113,-.133,-.034,.021],[4.52,.089,-.123,-.04,.014],[4.79,.067,-.084,-.041,.007]],
      (span,h,z)=>[z,h,span]);
    box(blade,gold,-.013,-.039,4.62,.174,.032,.18);
  }
  beacon(group,landing,0,.68,1.938,.77,.093);
  beacon(group,landing,0,2.976,-5.35,.42,.044);
  flashing.push(beacon(group,port,0,.52,-.92,.61,.064));
  flashing.push(beacon(group,port,0,2.49,-1.22,.50,.052));
  return {group,prop,tailRotor,flashing};
}

export function createPilot(scene){
  const assets={plane:planeModel(),helicopter:helicopterModel()};
  for(const {group} of Object.values(assets)){group.visible=false;scene.add(group);}
  const position=new T.Vector3();
  let lightClock=0;
  const craft={position,type:null,heading:0,speed:0,pitch:0,roll:0,vertical:0,throttle:0,airborne:false};
  function enter(type){
    const start=airport[type];
    if(!start)return;
    craft.type=type;
    for(const [name,{group}] of Object.entries(assets))group.visible=name===type;
    position.set(start.x,regionGround(start.x,start.z)+.09,start.z);
    craft.heading=start.heading;
    craft.speed=craft.pitch=craft.roll=craft.vertical=craft.throttle=0;
    craft.airborne=false;
    lightClock=0;
    assets[type].group.position.copy(position);
  }
  function exit(){
    if(craft.type)assets[craft.type].group.visible=false;
    craft.type=null;
  }
  function update(dt,{power,turn,pitch,lift,brake}){
    if(!craft.type)return;
    const {group,prop,tailRotor,flashing}=assets[craft.type];
    lightClock+=dt;
    flashing.forEach((lamp,index)=>{lamp.visible=(lightClock+index*.105)%1.14<.10;});
    const rotor=craft.type==='helicopter';
    if(rotor){
      const desired=power*29;
      craft.speed=approach(craft.speed,desired,dt,1.10);
      craft.heading-=turn*dt*1.23;
      const ySpeed=lift>=0?lift*10:lift*7;
      craft.vertical=approach(craft.vertical,ySpeed,dt,2.25);
      craft.pitch=approach(craft.pitch,craft.speed*.011,dt,2.85);
      craft.roll=approach(craft.roll,turn*clamp(Math.abs(craft.speed)/19,0,1)*.25,dt,2.65);
      craft.throttle=.53+Math.abs(craft.vertical)*.035;
      prop.rotation.y+=dt*(22+Math.abs(craft.vertical)*.54);
      tailRotor.rotation.x+=dt*47;
    }else{
      craft.throttle=clamp(craft.throttle+power*dt*.52,0,1);
      craft.speed=clamp(craft.speed+(craft.throttle*12.8-1.9-craft.speed*.152-Math.max(0,-craft.pitch)*3.5)*dt,0,68);
      if(brake&&!craft.airborne)craft.speed*=Math.exp(-dt*4.15);
      const rotationReady=craft.airborne||craft.speed>20;
      craft.pitch=approach(craft.pitch,rotationReady?pitch*.41:0,dt,2.55);
      craft.heading-=turn*dt*(craft.airborne?.68:.91)*clamp(craft.speed/10,.04,1);
      craft.roll=approach(craft.roll,craft.airborne?turn*.49:0,dt,2.8);
      const target=craft.airborne
        ?-Math.sin(craft.pitch)*craft.speed*.91-Math.max(0,23-craft.speed)*.42
        :rotationReady&&craft.pitch<-.035?Math.max(0,-Math.sin(craft.pitch)*craft.speed*.91):0;
      craft.vertical=approach(craft.vertical,target,dt,2.0);
      prop.rotation.z-=dt*(7+craft.throttle*31);
    }
    const newX=clamp(position.x+Math.sin(craft.heading)*craft.speed*dt,-760,1560);
    const newZ=clamp(position.z+Math.cos(craft.heading)*craft.speed*dt,-1000,1050);
    const floor=regionGround(newX,newZ)+.075;
    position.set(newX,clamp(Math.max(floor,position.y+craft.vertical*dt),floor,410),newZ);
    craft.airborne=position.y-floor>.38;
    if(position.y<=floor+.001&&craft.vertical<0)craft.vertical=0;
    group.position.copy(position);
    group.rotation.set(craft.pitch,craft.heading,craft.roll,'YXZ');
  }
  return {craft,enter,exit,update};
}
