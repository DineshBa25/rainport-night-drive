import * as T from 'three';

const block=76;
const curb=10.02;
const sidewalkEdge=14.25;
const sidewalkRise=.255;
const cycleTracks=[{axis:'z',line:0},{axis:'x',line:3}];
export {cycleTracks};

const sidewalkMaterial=new T.MeshStandardMaterial({color:0x626975,roughness:.91,emissive:0x252d3a,emissiveIntensity:.49});
const curbMaterial=new T.MeshStandardMaterial({color:0x7d8290,roughness:.88,emissive:0x28303b,emissiveIntensity:.38});
const tactileMaterial=new T.MeshStandardMaterial({color:0xb69455,roughness:.86,emissive:0x5e411d,emissiveIntensity:.6});
const seamMaterial=new T.MeshStandardMaterial({color:0x424955,roughness:.94});
const cycleMaterial=new T.MeshStandardMaterial({color:0x31574e,roughness:.96,emissive:0x16322b,emissiveIntensity:.68});
const cycleLine=new T.MeshBasicMaterial({color:0x80b7ad,toneMapped:false});
const unitBox=new T.BoxGeometry(1,1,1);

function smooth(low,high,value){
  return T.MathUtils.smoothstep(value,low,high);
}

export function createSidewalkLayout(parkingParcels){
  const lots=new Set(parkingParcels.map(parcel=>parcel.join(',')));
  function lift(x,z){
    const ix=Math.floor(x/block),iz=Math.floor(z/block);
    const tx=x-ix*block,tz=z-iz*block;
    const dx=Math.min(tx,block-tx),dz=Math.min(tz,block-tz);
    const ramp=(across,along)=>{
      const crosswalk=1-smooth(1.04,2.4,Math.abs(along-11.3));
      return crosswalk*(1-smooth(curb,curb+2.15,across));
    };
    const taper=Math.max(ramp(dx,dz),ramp(dz,dx));
    const drop=lots.has(ix+','+iz)&&dz<=sidewalkEdge+.001 ? 1-smooth(5.5,7.45,Math.abs(tx-block/2)):0;
    return sidewalkRise-.217*Math.max(taper,drop);
  }
  return {lift};
}

function ribbon(buffers,key,x0,x1,z0,z1,step,terrain,depth=0){
  const nx=Math.max(1,Math.ceil((x1-x0)/step)),nz=Math.max(1,Math.ceil((z1-z0)/step));
  const out=buffers.get(key)??[];
  const point=(x,z)=>[x,terrain(x,z),z];
  const panel=(a,b,c,d)=>out.push(...a,...b,...c,...b,...d,...c);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const left=T.MathUtils.lerp(x0,x1,i/nx),right=T.MathUtils.lerp(x0,x1,(i+1)/nx);
    const near=T.MathUtils.lerp(z0,z1,j/nz),far=T.MathUtils.lerp(z0,z1,(j+1)/nz);
    const a=point(left,near),b=point(left,far),c=point(right,near),d=point(right,far);
    panel(a,b,c,d);
    if(depth){
      const below=([x,y,z])=>[x,y-depth,z];
      if(i===0)panel(a,below(a),b,below(b));
      if(i===nx-1)panel(c,d,below(c),below(d));
      if(j===0)panel(a,c,below(a),below(c));
      if(j===nz-1)panel(b,below(b),d,below(d));
    }
  }
  buffers.set(key,out);
}

function finishRibbons(scene,buffers){
  for(const [material,position] of buffers){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
    geometry.computeVertexNormals();
    scene.add(new T.Mesh(geometry,material));
  }
}

export function buildWalkways(scene,{count,groundHeight,sidewalk}){
  const templates=new Map();
  const height=(x,z)=>groundHeight(x,z)+sidewalk.lift(x,z);
  const detail=(x,z)=>height(x,z)+.009;
  for(let i=-count;i<count;i++)for(let j=-count;j<count;j++){
    const left=i*block,right=left+block,near=j*block,far=near+block;
    for(const edge of [near+curb,far-sidewalkEdge]){
      ribbon(templates,sidewalkMaterial,left+curb,right-curb,edge,edge+sidewalkEdge-curb,1.25,height,.29);
      for(let x=left+15;x<right-14;x+=2.75){
        ribbon(templates,seamMaterial,x,x+.037,edge+.2,edge+sidewalkEdge-curb-.17,2,detail);
      }
    }
    for(const edge of [left+curb,right-sidewalkEdge]){
      ribbon(templates,sidewalkMaterial,edge,edge+sidewalkEdge-curb,near+sidewalkEdge,far-sidewalkEdge,1.25,height,.29);
      for(let z=near+15;z<far-14;z+=2.75){
        ribbon(templates,seamMaterial,edge+.2,edge+sidewalkEdge-curb-.17,z,z+.037,2,detail);
      }
    }
    for(const x of [left+curb,right-curb-.14]){
      ribbon(templates,curbMaterial,x,x+.14,near+curb,far-curb,1.25,detail);
    }
    for(const z of [near+curb,far-curb-.14]){
      ribbon(templates,curbMaterial,left+curb,right-curb,z,z+.14,1.25,detail);
    }
    for(const x of [left+11.3,right-11.3])for(const z of [near+11.3,far-11.3]){
      const outerX=x<(left+right)/2?x-1.05:x+1.05;
      const outerZ=z<(near+far)/2?z-1.05:z+1.05;
      ribbon(templates,tactileMaterial,outerX-.12,outerX+.28,z-.64,z+.64,.35,detail);
      ribbon(templates,tactileMaterial,x-.64,x+.64,outerZ-.12,outerZ+.28,.35,detail);
    }
  }
  for(const {axis,line} of cycleTracks)for(let cell=-count;cell<count;cell++){
    for(const side of [-1,1]){
      const center=line*block+side*8.72;
      const start=cell*block+13.1,end=(cell+1)*block-13.1;
      const strip=(mat,low,high,from,to,lift)=>{
        const surface=(x,z)=>groundHeight(x,z)+lift;
        if(axis==='z')ribbon(templates,mat,low,high,from,to,2,surface);
        else ribbon(templates,mat,from,to,low,high,2,surface);
      };
      strip(cycleMaterial,center-.79,center+.79,start,end,.024);
      strip(cycleLine,center-.85,center-.79,start,end,.032);
      strip(cycleLine,center+.79,center+.85,start,end,.032);
      for(const s of [start+5,end-9]){
        const dir=axis==='z'?-side:side;
        strip(cycleLine,center-.055,center+.055,s,s+1.1,.04);
        const tip=dir>0?s+1.1:s;
        strip(cycleLine,center-.31,center+.31,tip-.055,tip+.055,.04);
      }
    }
  }
  finishRibbons(scene,templates);
}

function instance(scene,geometry,material,entries,name){
  const mesh=new T.InstancedMesh(geometry,material,entries.length);
  const marker=new T.Object3D();
  for(let i=0;i<entries.length;i++){
    const [x,y,z,w,h,d,yaw=0,tilt=0]=entries[i];
    marker.position.set(x,y,z);marker.scale.set(w,h,d);
    marker.rotation.set(0,yaw,tilt,'YXZ');
    marker.updateMatrix();
    mesh.setMatrixAt(i,marker.matrix);
  }
  mesh.name=name;
  scene.add(mesh);
}

export function buildBoundaries(scene,{count,extent,groundHeight}){
  const beam=new T.MeshBasicMaterial({color:0xff344e,toneMapped:false});
  const caseMaterial=new T.MeshStandardMaterial({color:0x402431,emissive:0x351120,roughness:.62});
  const glowMaterial=new T.SpriteMaterial({color:0xff2446,transparent:true,opacity:.4,
    blending:T.AdditiveBlending,depthWrite:false});
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  const halo=ctx.createRadialGradient(32,32,0,32,32,31);
  halo.addColorStop(0,'rgba(255,255,255,.74)');
  halo.addColorStop(.3,'rgba(255,255,255,.29)');
  halo.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=halo;ctx.fillRect(0,0,64,64);
  glowMaterial.map=new T.CanvasTexture(canvas);
  const red=[],hardware=[];
  for(const axis of ['x','z'])for(const side of [-1,1]){
    const edge=side*(extent-2);
    const yaw=axis==='x'?Math.PI/2:0;
    for(let street=-count+1;street<count;street++){
      if(axis==='x'&&side===1&&street===0)continue;
      for(const offset of [-6,0,6]){
        const along=street*block+offset;
        const [x,z]=axis==='x'?[edge,along]:[along,edge];
        const y=groundHeight(x,z);
        hardware.push([x,y+.6,z,.24,1.25,.24]);
        hardware.push([x,y+1.2,z,2.20,.28,.14,yaw]);
        for(const angle of [-Math.PI/4,Math.PI/4]){
          red.push([x,y+1.45,z,1.62,.122,.14,yaw,angle]);
        }
        const sprite=new T.Sprite(glowMaterial);
        sprite.position.set(x,y+1.44,z);sprite.scale.set(2.35,2.35,1);
        scene.add(sprite);
      }
    }
  }
  instance(scene,unitBox,caseMaterial,hardware,'Boundary barricades');
  instance(scene,unitBox,beam,red,'Illuminated red boundary crosses');
}

const pavilionLots=new Map([
  ['-1,2','library'],['-3,0','conservatory'],['2,-1','theater'],['-4,1','waterfront'],
]);

export function buildCityPlaces(scene,{count,groundHeight,sidewalk,seedRand,parkingLots}){
  const matte=(color,glow=0)=>new T.MeshStandardMaterial({color,emissive:glow,emissiveIntensity:.62,roughness:.77});
  const lit=color=>new T.MeshBasicMaterial({color,toneMapped:false});
  const concrete=matte(0x435262,0x192534),paver=matte(0x737574,0x272734);
  const stone=matte(0x404756,0x1f2a38),dark=matte(0x212b39,0x0c1623),wood=matte(0x73583f,0x24150b);
  const brass=matte(0x9e7955,0x402715),soil=matte(0x26332b,0x0a1b10);
  const pond=new T.MeshStandardMaterial({color:0x275c78,emissive:0x1d4f71,emissiveIntensity:.87,metalness:.49,roughness:.23});
  const glass=new T.MeshStandardMaterial({color:0x365e70,emissive:0x448395,emissiveIntensity:.68,metalness:.22,roughness:.25});
  const cyan=lit(0x9de8f4),amber=lit(0xffc182),violet=lit(0xbe8bff),coral=lit(0xff778d);
  const green=[matte(0x30533c,0x163024),matte(0x466346,0x253623),matte(0x557350,0x253c25)];
  const blooms=[matte(0xce7590,0x662538),matte(0xd7b064,0x67420e),matte(0xba9de3,0x513569),matte(0xf0dbcc,0x5e433b)];
  const stemGeo=new T.IcosahedronGeometry(1,0),flowerGeo=new T.SphereGeometry(1,6,4);
  const coneGeo=new T.ConeGeometry(1,1,8),batches=new Map(),paths=new Map();
  const textures=new Map();
  function mesh(geo,mat,x,y,z,rx=0,ry=0,rz=0){
    const item=new T.Mesh(geo,mat);
    item.position.set(x,y,z);item.rotation.set(rx,ry,rz,'YXZ');scene.add(item);
    return item;
  }
  function add(geometry,mat,x,y,z,w,h,d,yaw=0,tilt=0){
    const key=geometry.id+','+mat.id;
    if(!batches.has(key))batches.set(key,{geometry,mat,entries:[]});
    batches.get(key).entries.push([x,y,z,w,h,d,yaw,tilt]);
  }
  function box(mat,x,y,z,w,h,d,yaw=0,tilt=0){
    add(unitBox,mat,x,y,z,w,h,d,yaw,tilt);
  }
  function plaque(text,x,y,z,yaw,width,height,color='#e2e2d6'){
    if(!textures.has(text)){
      const canvas=document.createElement('canvas');
      canvas.width=640;canvas.height=128;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#1a2434';ctx.fillRect(0,0,640,128);
      ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(7,7,626,114);
      ctx.fillStyle=color;ctx.font='bold 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(text,320,65,586);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      textures.set(text,new T.MeshBasicMaterial({map,toneMapped:false}));
    }
    mesh(new T.PlaneGeometry(width,height),textures.get(text),x,y,z,0,yaw);
  }
  const deck=(x,z)=>groundHeight(x,z)+sidewalk.lift(x,z);
  function platform(x,z,w,d,material){
    const ground=[-.5,0,.5].flatMap(a=>[-.5,0,.5].map(b=>groundHeight(x+a*w,z+b*d)));
    const top=Math.max(...ground)+.25,bottom=Math.min(...ground)-.23;
    box(material,x,(top+bottom)/2,z,w,top-bottom,d);
    return top;
  }
  function access(x,z,span,run,top,axis,dir){
    if(axis==='x'){
      const [lo,hi]=[x,x+run*dir].sort((a,b)=>a-b);
      const y=(px,pz)=>T.MathUtils.lerp(top,deck(x+run*dir,pz),(px-x)/(run*dir))+.035;
      ribbon(paths,paver,lo,hi,z-span/2,z+span/2,.85,y,.24);
    }else{
      const [lo,hi]=[z,z+run*dir].sort((a,b)=>a-b);
      const y=(px,pz)=>T.MathUtils.lerp(top,deck(px,z+run*dir),(pz-z)/(run*dir))+.035;
      ribbon(paths,paver,x-span/2,x+span/2,lo,hi,.85,y,.24);
    }
  }
  function flowers(x,z,w,d,level,count=24){
    box(stone,x,level+.16,z,w,.32,d);
    box(soil,x,level+.326,z,w-.16,.015,d-.16);
    for(let i=0;i<count;i++){
      const px=x+(seedRand()-.5)*(w-.3),pz=z+(seedRand()-.5)*(d-.3);
      const tall=.10+seedRand()*.28;
      add(stemGeo,green[i%green.length],px,level+.37+tall*.40,pz,.19,tall,.20,seedRand()*6.28);
      add(flowerGeo,blooms[i%blooms.length],px+.067,level+.38+tall,pz-.03,.105,.046,.105);
    }
  }
  function tree(x,z,level,variant){
    const h=3+seedRand()*2.5;
    box(wood,x,level+h*.35,z,.24,h*.7,.24);
    if(variant===0){
      for(let tier=0;tier<3;tier++)add(coneGeo,green[tier],x,level+h*(.53+tier*.15),z,
        h*(.29-tier*.06),h*.56,h*(.24-tier*.051));
    }else{
      for(const [dx,dz,y,w] of [[0,0,.84,.32],[-.18,.06,.75,.19],[.20,.07,.79,.21],[.04,-.17,.90,.18]]){
        add(stemGeo,green[variant%3],x+dx*h,level+y*h,z+dz*h,w*h,w*h*.85,w*h,seedRand()*6.28);
      }
    }
  }
  function bench(x,z,level,yaw){
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    box(wood,x,level+.46,z,1.75,.075,.43,yaw);
    const [rx,rz]=at(0,.185);
    box(wood,rx,level+.72,rz,1.75,.33,.075,yaw);
    for(const side of [-1,1]){
      const [sx,sz]=at(side*.65,0);
      box(dark,sx,level+.228,sz,.10,.45,.37,yaw);
    }
  }
  function lantern(x,z,level,height=3.3){
    box(dark,x,level+height/2,z,.118,height,.118);
    box(amber,x,level+height,z,.31,.22,.31);
    box(dark,x,level+height+.17,z,.37,.13,.37);
  }
  function cylinder(mat,x,y,z,r,h,sides=40){
    return mesh(new T.CylinderGeometry(r,r,h,sides),mat,x,y,z);
  }
  function pool(x,z,y,r){
    cylinder(stone,x,y+.27,z,r,.55);
    cylinder(pond,x,y+.548,z,r-.25,.025);
    mesh(new T.TorusGeometry(r-.09,.065,8,48),cyan,x,y+.55,z,Math.PI/2);
  }
  function garden(x,z,y,north=1){
    for(const side of [-1,1]){
      flowers(x+side*9,z+north*5,7.3,2.35,y,35);
      flowerHedge(x+side*13,z-north*2.0,y);
      bench(x+side*8,z-north*5,y,0);
      lantern(x+side*12.7,z+north*6.9,y);
    }
  }
  function flowerHedge(x,z,y){
    flowers(x,z,2.5,5.5,y,30);
    add(stemGeo,green[0],x,y+.73,z,1.03,.47,2.3);
  }
  function artwork(x,z,y){
    pool(x,z,y,5.15);
    cylinder(dark,x,y+.67,z,1.23,.29,24);
    for(let i=0;i<3;i++){
      const ring=mesh(new T.TorusGeometry(2.18+i*.47,.13,10,54),[cyan,violet,amber][i],
        x,y+3.27+i*.28,z,0,i*Math.PI/3);
      ring.rotation.z=(i-1)*.29;
    }
  }
  function orient(x,z,w,d,label){
    const y=platform(x,z,w,d,paver);
    if(label==='library'){
      box(glass,x,y+6.9,z-1.5,26,13.8,17.6);
      box(stone,x,y+2.1,z+7.5,26.5,4.2,3.8);
      box(glass,x,y+1.45,z+9.45,10.2,2.65,.12);
      const ribGeo=new T.TorusGeometry(7.05,.14,6,38,Math.PI);
      for(let i=-5;i<=5;i++){
        const rx=x+i*2.47;
        mesh(ribGeo,brass,rx,y+7.55,z-1.2,0,Math.PI/2);
        box(brass,rx,y+6.0,z+7.24,.125,5.1,.164);
      }
      box(stone,x,y+14.19,z-1.4,27,.80,18.9);
      box(amber,x,y+13.85,z+7.96,25,.16,.10);
      plaque('RAINPORT LIBRARY',x,y+3.26,z+9.46,0,10.5,1.6,'#ffe0a9');
      flowers(x-10,z+12,5.4,2.1,y);flowers(x+10,z+12,5.4,2.1,y);
      lantern(x-7,z+14,y);lantern(x+7,z+14,y);
      access(x,z+d/2,7,9,y,'z',1);
    }else if(label==='conservatory'){
      cylinder(stone,x,y+.83,z,10.4,1.65,16);
      const dome=mesh(new T.SphereGeometry(9.8,24,12,0,Math.PI*2,0,Math.PI/2),glass,x,y+1.58,z);
      dome.scale.y=.71;
      for(let i=0;i<8;i++){
        const arc=mesh(new T.TorusGeometry(9.81,.076,6,38,Math.PI),brass,x,y+1.61,z,0,i*Math.PI/8);
        arc.scale.y=.71;
      }
      mesh(new T.TorusGeometry(9.96,.085,8,36),cyan,x,y+1.59,z,Math.PI/2);
      plaque('GLASS GARDEN',x,y+2.38,z+9.33,0,8.3,1.25,'#a5ecd5');
      for(const side of [-1,1]){
        tree(x+side*12,z-6,y,2);
        flowers(x+side*9.7,z+9,4.7,2.05,y,31);
        bench(x+side*9,z+12,y,Math.PI);
      }
      access(x,z+d/2,5,9,y,'z',1);
    }else if(label==='theater'){
      box(stone,x,y+5.5,z,26,11,20.2);
      box(dark,x,y+2.45,z+10.0,27,1.02,5.4);
      box(coral,x,y+2.63,z+12.74,25.9,.142,.135);
      box(violet,x,y+2.20,z+12.74,25.9,.14,.135);
      box(glass,x,y+1.55,z+10.18,13,2.6,.18);
      plaque('LUMEN THEATRE',x,y+6.5,z+10.13,0,14.8,2.3,'#f9c5db');
      for(let i=-5;i<=5;i++){
        const xx=x+i*2.25;
        box(i%3===0?coral:violet,xx,y+8.9,z+10.22,.097,2.1,.12);
        box(brass,xx,y+1.54,z+10.31,.114,2.55,.13);
      }
      flowers(x-11,z+13,4.5,2,y);flowers(x+11,z+13,4.5,2,y);
      lantern(x-8.5,z+14,y);lantern(x+8.5,z+14,y);
      access(x,z+d/2,6.4,9,y,'z',1);
    }else{
      artwork(x,z-2,y);garden(x,z,y,-1);
      for(const side of [-1,1])tree(x+side*11.7,z-10.5,y,side===1?2:0);
      access(x+w/2,z,6,9,y,'x',1);
      access(x-w/2,z,6,9,y,'x',-1);
    }
  }
  function furniture(x,z,axis,side,variation){
    const yaw=axis==='z'?Math.PI/2:0;
    const at=(u,v)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
    const here=deck(x,z);
    if(variation%6===0){
      const [bx,bz]=at(0,side*.27);
      box(dark,x,here+2.4,z,4.85,.145,1.34,yaw);
      box(cyan,x,here+2.30,z,4.64,.088,1.27,yaw);
      box(glass,bx,here+1.29,bz,4.78,2.04,.10,yaw);
      for(const s of [-1,1]){
        const [px,pz]=at(s*2.24,side*.35);
        box(dark,px,deck(px,pz)+1.18,pz,.11,2.36,.11);
      }
      bench(x,z,here,yaw);
      const [px,pz]=at(2.95,side*.2);
      box(dark,px,deck(px,pz)+1.17,pz,.087,2.34,.087);
      plaque('RAINPORT TRANSIT',px,here+2.10,pz-side*.08,yaw+(side>0?Math.PI:0),1.47,.42,'#a3e9fa');
    }else if(variation%3===0){
      bench(x,z,here,yaw);
      const [bx,bz]=at(1.25,0);
      box(dark,bx,deck(bx,bz)+.39,bz,.36,.78,.36);
    }else if(variation%3===1){
      for(const u of [-.60,0,.60]){
        const [px,pz]=at(u,0);
        const y=deck(px,pz);
        mesh(new T.TorusGeometry(.35,.032,6,14,Math.PI),brass,px,y+.22,pz,0,yaw+Math.PI/2);
      }
    }else{
      flowerHedge(x,z,here);
    }
  }
  const streetNames=['Quay','Beacon','Cedar','Lantern','Exchange','Juniper','Harbor'];
  const avenueNames=['Marina','Alder','Glass','Market','Union','Meridian','Lumen'];
  function streetSigns(i,j){
    const x=i*block+13.75,z=j*block+13.75;
    const base=deck(x,z);
    box(dark,x,base+1.38,z,.09,2.76,.09);
    const first=streetNames[i+3]+' Ave';
    const second=avenueNames[j+3]+' St';
    plaque(first,x,base+2.70,z+.065,0,2.34,.47,'#a4f4d8');
    plaque(first,x,base+2.70,z-.065,Math.PI,2.34,.47,'#a4f4d8');
    plaque(second,x+.065,base+2.21,z,Math.PI/2,2.34,.47,'#e4f3f9');
    plaque(second,x-.065,base+2.21,z,-Math.PI/2,2.34,.47,'#e4f3f9');
  }
  function populate(){
    for(const [parcel,label] of pavilionLots){
      const [i,j]=parcel.split(',').map(Number);
      orient((i+.5)*block,(j+.5)*block,35,31,label);
    }
    // The south face of the central terrace meets its staircase.
    const x=45,z=121;
    const base=Math.max(...[-14,0,14].flatMap(dx=>[-11,0,11].map(dz=>groundHeight(x+dx,z+dz))))+.26+1.54;
    artwork(x,z-1,base);
    flowers(x-10.3,z+5.2,4.4,2.45,base,29);flowers(x+10.3,z+5.2,4.4,2.45,base,29);
    lantern(x-10.5,z-5.8,base);lantern(x+10.5,z-5.8,base);
    for(let i=-count+1;i<count;i++)for(let j=-count;j<count;j++){
      for(const side of [-1,1]){
        const col=side===1?i:i-1;
        if(col<-count||parkingLots.has(col+','+j))continue;
        if(i===0&&(j===0||j===1||j===2))continue;
        if((i*3+j*7+side)%3===0)continue;
        const x=i*block+side*15.75,z=(j+.5)*block+side*15;
        furniture(x,z,'z',side,Math.abs(i*7+j*3+side)%12);
      }
    }
    for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
      if((i+j)%2===0&&i!==2)streetSigns(i,j);
    }
    for(const {axis,line} of cycleTracks){
      for(const cell of [-3,-1,1,3]){
        const along=cell*block+16;
        for(const side of [-1,1]){
          const cross=line*block+side*10.65;
          const [x,z]=axis==='z'?[cross,along]:[along,cross];
          const y=deck(x,z);
          box(dark,x,y+1.12,z,.087,2.24,.087);
          const yaw=axis==='z'?(side===1?0:Math.PI):(side===1?-Math.PI/2:Math.PI/2);
          plaque('BIKE LANE',x,y+2.13,z,yaw,1.32,.46,'#c1f5df');
        }
      }
    }
    for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
      if(i===2||i===0&&j>=0&&j<=2||parkingLots.has(i+','+j))continue;
      const x=i*block+16.4,z=j*block+44.6;
      for(const offset of [-7.6,-5.4,5.4,7.6]){
        const pz=z+offset,y=groundHeight(x,pz)+.20;
        if((i+j)%2===0)flowers(x,pz,1.75,1.72,y,12);
        else{
          box(stone,x,y+.13,pz,1.70,.26,1.70);
          add(stemGeo,green[(i+j+9)%green.length],x,y+.54,pz,.75,.62,.71,seedRand()*6.28);
        }
      }
    }
    for(let j=-count+1;j<count;j++){
      const z=(j+.5)*block;
      for(const dz of [-22,0,22])tree(-310.4,z+dz,groundHeight(-310.4,z+dz)+.28,dz===0?0:1+(j%2===0?1:0));
    }
  }
  return {
    isLandmark:(i,j)=>pavilionLots.has(i+','+j),
    finish(){
      populate();
      finishRibbons(scene,paths);
      for(const {geometry,mat,entries} of batches.values())instance(scene,geometry,mat,entries,'Rainport streetscape');
    },
  };
}
