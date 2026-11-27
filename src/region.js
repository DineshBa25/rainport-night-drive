import * as T from 'three';
import {groundHeight as cityGround} from './freeway.js';
import {buildLakeshore} from './lakeshore.js';
import {buildSuburbs} from './suburbs.js';

export const airport={x:1110,z:-64,runwayStart:-517,runwayEnd:391,
  arrival:{x:1001,z:-88,heading:Math.PI},plane:{x:1110,z:-480,heading:0},
  helicopter:{x:1049,z:-137,heading:0}};
export const lake={x:653,z:243,rx:182,rz:144};
export const regionLimit={east:1205,north:695,south:-600};
export function regionalRoadHeight(x,z){
  const zone=x>=1089&&x<=1131&&z>=airport.runwayStart&&z<=airport.runwayEnd?.075:
    x>=994&&x<=1084&&z>=-166&&z<=-111?.048:.105;
  return regionGround(x,z)+zone;
}
const saturate=T.MathUtils.clamp;
const roads=[],roadRoutes=[];
const unroll=(points,halfWidth)=>{
  roadRoutes.push({points,halfWidth});
  for(let i=1;i<points.length;i++)roads.push({a:points[i-1],b:points[i],halfWidth});
};
const circle=(x,z,rx,rz,n)=>Array.from({length:n+1},(_,i)=>{
  const a=i/n*Math.PI*2;return [x+Math.cos(a)*rx,z+Math.sin(a)*rz];
});
unroll([[286,0],[382,0],[465,0],[575,0],[730,0],[839,0],[960,0],[1001,0],[1001,-101],[1049,-101]],10.4);
const shore=circle(lake.x,lake.z,213,174,80);
unroll(shore,6.65);
const shoreSouth=shore[60],shoreWest=shore[40],shoreNorth=shore[20],shoreEast=shore[0];
export const shorelineStart={x:shoreSouth[0],z:shoreSouth[1],heading:Math.PI/2};
unroll([[465,0],[442,48],[427,141],shoreWest],6.7);
unroll([[shoreSouth[0],0],shoreSouth],6.7);
unroll([[839,0],[876,72],[886,154],shoreEast],6.7);
unroll([shoreNorth,[653,480],[593,511],[545,556],[581,614],[683,623],[788,607],[861,550],[819,483],[730,471],[653,480]],6.65);
const streetsX=[382,465,548,631,714,797,880];
const streetsZ=[0,-83,-166,-249,-332,-415];
for(const x of streetsX)unroll([[x,0],[x,-415]],6.2);
for(const z of streetsZ.slice(1))unroll([[382,z],[880,z]],6.2);
unroll([[880,-249],[942,-249],[1001,-166],[1001,-101]],7.1);
unroll([[1049,-101],[1072,-59],[1110,-59]],6.35);
unroll([[1020,-367],[1110,-367]],6.35);
unroll([[1049,-101],[1020,-165],[1020,-367]],6.35);
const lakeRadius=(x,z)=>Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz);
export function regionGround(x,z){
  const base=cityGround(x,z);
  if(x<=305)return base;
  const transition=T.MathUtils.smoothstep(x,305,420);
  const hill=34*Math.exp(-(((x-690)/220)**2+((z-572)/140)**2));
  let land=base+transition*(hill+2.2*Math.sin(x/83)*Math.sin(z/115));
  const perimeter=lakeRadius(x,z);
  if(perimeter<1.19){
    const shoreHeight=7.05+Math.min(4.5,(perimeter-1)*16);
    land=T.MathUtils.lerp(shoreHeight,land,T.MathUtils.smoothstep(perimeter,1.01,1.19));
  }
  const apron=T.MathUtils.smoothstep(x,945,995)*(1-T.MathUtils.smoothstep(Math.abs(z+65),460,525));
  return T.MathUtils.lerp(land,10.65,apron);
}
const roadIndex=new Map(), bin=72;
for(const road of roads){
  const {a,b,halfWidth:w}=road;
  for(let i=Math.floor((Math.min(a[0],b[0])-w-4)/bin);i<=Math.floor((Math.max(a[0],b[0])+w+4)/bin);i++){
    for(let j=Math.floor((Math.min(a[1],b[1])-w-4)/bin);j<=Math.floor((Math.max(a[1],b[1])+w+4)/bin);j++){
      const key=i+','+j;
      if(!roadIndex.has(key))roadIndex.set(key,[]);
      roadIndex.get(key).push(road);
    }
  }
}
export function outsideCityRoad(x,z,margin=0){
  if(x<288||x>regionLimit.east||z>regionLimit.north||z<regionLimit.south)return false;
  if(x>=1089-margin&&x<=1131+margin&&z>=airport.runwayStart-margin&&z<=airport.runwayEnd+margin)return true;
  if(x>=994-margin&&x<=1084+margin&&z>=-166-margin&&z<=-111+margin)return true;
  for(const {a,b,halfWidth} of roadIndex.get(Math.floor(x/bin)+','+Math.floor(z/bin))??[]){
    const dx=b[0]-a[0],dz=b[1]-a[1];
    const along=saturate(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
    if(Math.hypot(x-a[0]-dx*along,z-a[1]-dz*along)<=halfWidth-.25+margin)return true;
  }
  return false;
}

export function buildRegion(scene){
  const material=(color,emissive=0)=>new T.MeshStandardMaterial({color,emissive,emissiveIntensity:.52,roughness:.88});
  const land=material(0x25372f,0x101e1a),road=material(0x273341,0x0d1727);
  const curb=material(0x687579,0x29323c),modern=material(0xb2a58f,0x473b34);
  const roof=material(0x303846,0x132134);
  function grit(contrast){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
    for(let z=0;z<128;z++)for(let x=0;x<128;x++){
      const random=(((Math.imul(x+57,73856093)^Math.imul(z+741,19349663))>>>0)%101)/100;
      const mottling=Math.sin(x*Math.PI/16)*Math.cos(z*Math.PI/21)+Math.cos((x-z)*Math.PI/32);
      const value=T.MathUtils.clamp(211+((random-.5)*.88+mottling*.16)*contrast,105,250);
      pixels.data.set([value,value,value,255],(z*128+x)*4);
    }
    ctx.putImageData(pixels,0,0);
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;
    map.wrapS=map.wrapT=T.RepeatWrapping;
    map.anisotropy=4;
    return map;
  }
  land.map=grit(104);road.map=grit(49);road.roughness=.72;road.metalness=.12;
  function patchUV(geometry,period){
    const p=geometry.attributes.position,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){uv[2*i]=p.getX(i)/period;uv[2*i+1]=p.getZ(i)/period;}
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  }
  const hedge=material(0x31583b,0x162d19),trees=[hedge,material(0x547152,0x192f25),material(0x2d5853,0x152a29)];
  const warm=new T.MeshBasicMaterial({color:0xffcc94,toneMapped:false});
  const pale=new T.MeshBasicMaterial({color:0xb5d9ee,toneMapped:false});
  const teal=new T.MeshBasicMaterial({color:0x62cdf1,toneMapped:false});
  const gold=new T.MeshBasicMaterial({color:0xf2c066,toneMapped:false});
  const bark=material(0x4a3932),water=new T.MeshStandardMaterial({color:0x22566a,metalness:.63,roughness:.26,emissive:0x153f57,emissiveIntensity:.82});
  let seed=81342;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const patches=new Map(),instances=new Map(),unit=new T.BoxGeometry(1,1,1);
  const crown=new T.IcosahedronGeometry(1,1),conifer=new T.ConeGeometry(1,1,8);
  function stamp(mat,x,y,z,w,h,d,yaw=0,geometry=unit){
    const k=mat.id+','+geometry.id;
    if(!instances.has(k))instances.set(k,{mat,geometry,entries:[]});
    instances.get(k).entries.push([x,y,z,w,h,d,yaw]);
  }
  function band(mat,points,width,lift){
    if(!patches.has(mat))patches.set(mat,[]);
    const out=patches.get(mat);
    const columns=Math.max(1,Math.ceil(width/2.25));
    const edge=points.map(([x,z],i)=>{
      const prev=points[Math.max(i-1,0)],next=points[Math.min(i+1,points.length-1)];
      const dx=next[0]-prev[0],dz=next[1]-prev[1],n=Math.hypot(dx,dz);
      return Array.from({length:columns+1},(_,column)=>{
        const offset=(column/columns-.5)*width;
        const xx=x+offset*dz/n,zz=z-offset*dx/n;
        return [xx,regionGround(xx,zz)+lift,zz];
      });
    });
    for(let i=1;i<edge.length;i++)for(let column=0;column<columns;column++){
      const a=edge[i-1][column],b=edge[i-1][column+1],c=edge[i][column],d=edge[i][column+1];
      out.push(...a,...c,...b,...b,...c,...d);
    }
  }
  function plot(mat,x0,x1,z0,z1,lift){
    const points=Array.from({length:Math.ceil((z1-z0)/3)+1},(_,i)=>i);
    for(let i=0;i<points.length;i++)points[i]=[(x0+x1)/2,T.MathUtils.lerp(z0,z1,i/(points.length-1))];
    const width=x1-x0;
    const cols=Math.ceil(width/4);
    for(let i=0;i<cols;i++){
      const x=x0+(i+.5)*width/cols;
      band(mat,points.map(([,z])=>[x,z]),width/cols,lift);
    }
  }
  const distantLand=material(0x22322d,0x0e1c19);
  const backdrop=new T.PlaneGeometry(3530,3400,142,137);
  backdrop.rotateX(-Math.PI/2);
  const background=backdrop.attributes.position;
  for(let i=0;i<background.count;i++){
    const x=background.getX(i)+345,z=background.getZ(i)+20;
    const ridge=18*Math.exp(-(((x-1360)/280)**2+((z-510)/730)**2));
    const outside=T.MathUtils.smoothstep(x,1200,1350)+T.MathUtils.smoothstep(Math.abs(z),670,925);
    background.setXYZ(i,x,regionGround(x,z)-1.38+outside*(ridge+7*Math.sin(x/173)*Math.sin(z/167)),z);
  }
  backdrop.computeVertexNormals();
  scene.add(new T.Mesh(backdrop,distantLand));
  const terrain=new T.PlaneGeometry(1085,1520,217,304);
  terrain.rotateX(-Math.PI/2);
  const v=terrain.attributes.position;
  for(let i=0;i<v.count;i++){
    const x=v.getX(i)+845.5,z=v.getZ(i)+38;
    v.setXYZ(i,x,regionGround(x,z)-.011,z);
  }
  patchUV(terrain,14);terrain.computeVertexNormals();scene.add(new T.Mesh(terrain,land));
  const waterGeo=new T.CircleGeometry(1,110);
  waterGeo.rotateX(-Math.PI/2);
  const pond=new T.Mesh(waterGeo,water);
  pond.position.set(lake.x,7.07,lake.z);
  pond.scale.set(lake.rx,1,lake.rz);scene.add(pond);
  const moonStreak=material(0x517e8c,0x35627c);
  for(let i=0;i<110;i++){
    const x=lake.x+(rand()-.5)*lake.rx*1.86,z=lake.z+(rand()-.5)*lake.rz*1.88;
    if(lakeRadius(x,z)>.98)continue;
    stamp(moonStreak,x,7.081,z,2+rand()*19,.012,.045+rand()*.10,.08);
  }
  for(const {points,halfWidth} of roadRoutes){
    const positions=[points[0]];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4.6);
      for(let j=1;j<=steps;j++)positions.push(a.map((start,k)=>T.MathUtils.lerp(start,b[k],j/steps)));
    }
    band(road,positions,halfWidth*2,.105);
    for(let k=1;k<positions.length-1;k+=3)band(gold,[positions[k],positions[k+1]],.108,.132);
  }
  const lakesideReeds=material(0x335049,0x162c21);
  const boardwalk=circle(lake.x,lake.z,196,157,125);
  band(material(0x826956,0x3c2a25),boardwalk,4.5,.066);
  function tree(x,z,size){
    const y=regionGround(x,z);
    const type=Math.floor(rand()*3);
    stamp(bark,x,y+size*.24,z,.23,size*.48,.22);
    if(type===0){
      for(let j=0;j<3;j++)stamp(trees[type],x,y+size*(.55+j*.15),z,size*(.32-j*.068),size*.53,size*(.31-j*.062),0,conifer);
    }else{
      stamp(trees[type],x,y+size*.74,z,size*.32,size*.33,size*.31,rand()*6,crown);
      for(let branch=0;branch<5;branch++){
        const angle=branch*2.399+(type-1)*.56;
        const xx=x+Math.cos(angle)*size*(.16+rand()*.11);
        const zz=z+Math.sin(angle)*size*(.15+rand()*.08);
        const ratio=.18+rand()*.061;
        stamp(trees[(type+branch)%3],xx,y+size*(.63+rand()*.24),zz,size*ratio,size*(ratio+.021),size*ratio,rand()*6,crown);
      }
    }
  }
  function lantern(x,z,pier=false){
    const y=regionGround(x,z);
    stamp(roof,x,y+1.62,z,.12,3.25,.12);
    stamp(pier?teal:warm,x,y+3.30,z,.34,.24,.34);
    stamp(roof,x,y+3.48,z,.48,.15,.48);
  }
  for(let i=0;i<214;i++){
    const a=i/214*Math.PI*2;
    const step=.998+rand()*.055;
    const x=lake.x+Math.cos(a)*lake.rx*step,z=lake.z+Math.sin(a)*lake.rz*step;
    if(i%7===0||i%11===0)continue;
    const y=regionGround(x,z),h=.17+rand()*.44;
    stamp(lakesideReeds,x,y+h*.36,z,.23,h,.22,rand()*6,conifer);
  }
  for(let i=0;i<shore.length-1;i++){
    const [x,z]=boardwalk[Math.round(i*125/80)];
    if(i%3===0)lantern(x,z,true);
    if(i%4===0){
      const [xx,zz]=shore[i];
      if(!outsideCityRoad(xx+11,zz+8))tree(xx+11,zz+8,4.8+rand()*3.5);
    }
  }
  for(const angle of [.22,1.56,2.54,3.76,5.36]){
    const [dx,dz]=[Math.cos(angle),Math.sin(angle)];
    const outer=[lake.x+dx*196,0,lake.z+dz*157];
    outer[1]=regionGround(outer[0],outer[2])+.12;
    const end=[lake.x+dx*lake.rx*.88,7.56,lake.z+dz*lake.rz*.88];
    const along=new T.Vector3(...outer).sub(new T.Vector3(...end));
    const deck=new T.Mesh(new T.BoxGeometry(4.25,.31,along.length()),curb);
    deck.position.set(...outer.map((value,i)=>(value+end[i])/2-.15*(i===1)));
    deck.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),along.normalize());
    scene.add(deck);
    for(const t of [.2,.52,.81]){
      const x=T.MathUtils.lerp(end[0],outer[0],t),z=T.MathUtils.lerp(end[2],outer[2],t);
      const y=T.MathUtils.lerp(end[1],outer[1],t);
      const base=regionGround(x,z)-.20;
      for(const side of [-1,1]){
        const px=x+side*1.76*dz,pz=z-side*1.76*dx;
        stamp(roof,px,(base+y)/2,pz,.19,y-base,.19);
        stamp(teal,px,y+.17,pz,.145,.096,.145);
      }
    }
  }
  {
    const x=681,z=639,y=regionGround(x,z)+.37;
    plot(curb,667,695,628,649,.045);
    for(const [a,b] of [[671,690],[668,672],[691,697]]){
      const z=647.4;
      stamp(roof,(a+b)/2,regionGround((a+b)/2,z)+.70,z,b-a,.11,.11);
    }
    for(const xx of [668.3,674.8,682.4,689.5,696]){
      stamp(roof,xx,regionGround(xx,647.4)+.39,647.4,.15,.82,.15);
    }
    for(const xx of [672.6,689.6]){
      stamp(modern,xx,regionGround(xx,642)+.44,642,2.5,.13,.48);
      stamp(roof,xx,regionGround(xx,642)+.23,642,1.47,.44,.31);
      lantern(xx,636);
    }
    for(const xx of [669,694])stamp(hedge,xx,y,637,.90,.83,.9,0,crown);
  }
  const promenadeStone=material(0x737b7c,0x263136);
  const shrub=material(0x44623f,0x182d1f);
  const blossoms=[material(0xc28c9a,0x3f2634),material(0xe6c892,0x514021),material(0xa098c4,0x342c53)];
  for(let x=468;x<848;x+=3.9){
    if([x-2,x,x+2].some(xx=>[11.7,14.4,17.1].some(z=>outsideCityRoad(xx,z))))continue;
    band(promenadeStone,[[x-2,14.6],[x+2,14.6]],3.22,.096);
    if(Math.round((x-468)/3.9)%4!==1)continue;
    const z=18.3,level=regionGround(x,z);
    if(outsideCityRoad(x,z))continue;
    stamp(curb,x,level+.13,z,3.68,.39,2.05);
    for(let i=-3;i<=3;i++){
      const offset=i*.43;
      stamp(shrub,x+offset,level+.40,z,.36,.37,.57,rand()*6,crown);
      if(i%2===0)stamp(blossoms[(i+6)%blossoms.length],x+offset,level+.73,z-.04,.14,.098,.18,rand()*6,crown);
    }
    lantern(x-2.08,13.14,true);
    if(Math.round(x)%3!==0&&!outsideCityRoad(x,24.6))tree(x,24.6,3.2+rand()*3.6);
  }
  {
    const x=545,z=29.1,y=regionGround(x,z);
    plot(promenadeStone,x-10.2,x+10.2,z-5.4,z+5.4,.11);
    band(promenadeStone,[[x,16.2],[x,z-5.4]],2.82,.11);
    const pool=new T.CylinderGeometry(1,1,1,32);
    stamp(curb,x,y+.26,z,3.18,.50,3.18,0,pool);
    stamp(water,x,y+.53,z,2.94,.057,2.94,0,pool);
    stamp(teal,x,y+.65,z,.36,.28,.36,0,pool);
    for(const direction of [-1,1]){
      const xx=x+direction*7.6;
      const ground=regionGround(xx,z);
      stamp(modern,xx,ground+.42,z,1.93,.071,.49);
      stamp(curb,xx,ground+.21,z,1.32,.41,.32);
      lantern(xx,z+3.6,true);
    }
  }
  for(let i=0;i<510;i++){
    const x=320+rand()*660,z=-570+rand()*1255;
    if((z<0&&z>-418&&x>375&&x<889)||outsideCityRoad(x,z)||lakeRadius(x,z)<1.08)continue;
    tree(x,z,3+rand()*7.5);
  }
  plot(road,1089,1131,airport.runwayStart,airport.runwayEnd,.075);
  plot(curb,994,1084,-166,-111,.048);
  for(let i=airport.runwayStart+12;i<airport.runwayEnd;i+=15){
    const y=regionGround(airport.x,i);
    stamp(pale,airport.x,y+.099,i,.25,.03,7.2);
    for(const side of [-1,1]){
      const x=airport.x+side*20.25,y=regionGround(x,i);
      stamp(i<airport.runwayEnd-120?pale:gold,x,y+.28,i,.23,.23,.23);
      stamp(teal,x+side*.72,y+.11,i,.11,.10,.19);
    }
  }
  for(const end of [airport.runwayStart+3,airport.runwayEnd-3]){
    for(let x=1092;x<1131;x+=3)stamp(teal,x,regionGround(x,end)+.17,end,.29,.22,.25);
  }
  for(let z=-365;z<=-99;z+=13){
    for(const side of [-1,1])stamp(teal,1020+side*6.4,regionGround(1020+side*6.4,z)+.16,z,.16,.19,.16);
  }
  for(const side of [-1,1]){
    const x=airport.helicopter.x+side*5.8;
    for(const z of [airport.helicopter.z-5,airport.helicopter.z,airport.helicopter.z+5]){
      stamp(teal,x,regionGround(x,z)+.15,z,.16,.16,.16);
    }
  }
  const hangarClad=material(0x687680,0x223642),metalTrim=material(0x879397,0x344151);
  const hangarRoof=new T.CylinderGeometry(0,1,1,4,1,false,Math.PI/4);
  const fixture=material(0x2a3b49,0x141b22);
  const shine=document.createElement('canvas');shine.width=shine.height=64;
  const shineCtx=shine.getContext('2d'),shineGradient=shineCtx.createRadialGradient(32,32,0,32,32,32);
  shineGradient.addColorStop(0,'rgba(255,210,151,.72)');
  shineGradient.addColorStop(.26,'rgba(255,195,122,.37)');
  shineGradient.addColorStop(1,'rgba(255,195,122,0)');
  shineCtx.fillStyle=shineGradient;shineCtx.fillRect(0,0,64,64);
  const shineTexture=new T.CanvasTexture(shine);
  const groundLamp=new T.MeshBasicMaterial({map:shineTexture,transparent:true,depthWrite:false,
    blending:T.AdditiveBlending,opacity:.70,polygonOffset:true,polygonOffsetFactor:-2});
  const spotGeometry=new T.PlaneGeometry(1,1);
  spotGeometry.rotateX(-Math.PI/2);
  const halo=new T.SpriteMaterial({map:shineTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.67});
  function airportLamp(x,z,h){
    const y=regionGround(x,z);
    stamp(fixture,x,y+h/2,z,.21,h,.21);
    stamp(warm,x,y+h,z,.55,.14,.42);
    const glow=new T.Sprite(halo);glow.position.set(x,y+h,z);glow.scale.set(4.0,4.0,1);scene.add(glow);
    stamp(groundLamp,x,y+.126,z,22,1,18,0,spotGeometry);
  }
  for(let i=0;i<3;i++){
    const x=1054,z=-204-i*44;
    const y=regionGround(x,z);
    stamp(curb,x,y-.74,z,25,1.68,31);
    stamp(hangarClad,x,y+4.56,z,24,9.12,30);
    stamp(roof,x,y+10.03,z,17.85,2.12,22.0,0,hangarRoof);
    stamp(roof,x,y+4.07,z+15.03,20.52,8.0,.13);
    for(let n=0;n<5;n++){
      const doorX=x+(n-2)*3.95;
      stamp(hangarClad,doorX,y+3.77,z+15.14,3.81,7.35,.13);
      stamp(metalTrim,doorX,y+5.79,z+15.24,3.45,.102,.075);
      stamp(pale,doorX,y+6.45,z+15.26,2.99,.37,.041);
    }
    stamp(roof,x,y+8.2,z+15.51,22.22,.29,1.07);
    stamp(teal,x,y+8.19,z+16.01,19.88,.105,.075);
    for(const side of [-1,1]){
      stamp(metalTrim,x+side*11.94,y+4.54,z+15.17,.17,9.07,.45);
      for(const offset of [-11,-6,-1,4,9,14]){
        stamp(metalTrim,x+side*12.047,y+4.61,z+offset,.115,8.88,.075);
      }
    }
    if(i<2)airportLamp(x-10.4,z+19.8,6.7);
  }
  for(const [x,z] of [[991.7,-129],[1019,-88],[1057,-171],[1087,-145]])airportLamp(x,z,6.25);
  {
    const y=regionGround(977,-133);
    stamp(roof,972,y+4.1,-136,31,8.2,43);
    stamp(curb,972,y+8.46,-136,33,1.01,45);
    for(let z=-154;z<-112;z+=4.5)stamp(pale,987.55,y+4.6,z,.10,4.2,3.25);
    const towerY=regionGround(954,-179);
    stamp(curb,954,towerY+8.5,-179,5,17,5);
    stamp(roof,954,towerY+18,-179,8.5,2.8,8.5);
    stamp(teal,954,towerY+18.3,-174.73,7.4,.52,.055);
    stamp(warm,954,towerY+20,-179,.20,.23,.20);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=100;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#182f3d';ctx.fillRect(0,0,640,100);
    ctx.textAlign='center';ctx.font='bold 43px sans-serif';ctx.fillStyle='#b9e7fa';ctx.fillText('RAINPORT FIELD',320,67,620);
    const title=new T.CanvasTexture(canvas);title.colorSpace=T.SRGBColorSpace;
    const board=new T.Mesh(new T.PlaneGeometry(15,2.35),new T.MeshBasicMaterial({map:title,toneMapped:false}));
    board.rotation.y=Math.PI/2;board.position.set(987.66,y+7.6,-136);scene.add(board);
  }
  const padY=regionGround(airport.helicopter.x,airport.helicopter.z)+.069;
  for(const side of [-1,1])stamp(pale,airport.helicopter.x+side*2.1,padY,airport.helicopter.z,.48,.03,6.2);
  stamp(pale,airport.helicopter.x,padY,airport.helicopter.z,4.5,.03,.48);
  for(const [mat,vertices] of patches){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    if(mat.map)patchUV(geometry,12);
    geometry.computeVertexNormals();scene.add(new T.Mesh(geometry,mat));
  }
  for(const {mat,geometry,entries} of instances.values()){
    const mesh=new T.InstancedMesh(geometry,mat,entries.length);
    const p=new T.Object3D();
    entries.forEach(([x,y,z,w,h,d,yaw],i)=>{
      p.position.set(x,y,z);p.scale.set(w,h,d);p.rotation.y=yaw;p.updateMatrix();mesh.setMatrixAt(i,p.matrix);
    });
    scene.add(mesh);
  }
  const updateLake=buildLakeshore(scene,{groundHeight:regionGround,lake,outsideCityRoad});
  const suburb=buildSuburbs(scene,{groundHeight:regionGround,outsideCityRoad,streetsX,streetsZ});
  return (time,viewer)=>{
    updateLake(time,viewer);
    suburb.update(time,viewer.x,viewer.z);
  };
}
