import * as T from 'three';
import {clearRoadFootprint} from './roadClearance.js';

const PI=Math.PI;
const Box=new T.BoxGeometry(1,1,1);
const Column=new T.CylinderGeometry(1,1,1,9);
const Trunk=new T.CylinderGeometry(.73,1,1,7);
const Ball=new T.IcosahedronGeometry(1,1);
const Cone=new T.ConeGeometry(1,1,9);
const Panel=new T.PlaneGeometry(1,1);
const Sphere=new T.SphereGeometry(1,13,9);
const Gable=prism([[-.5,0],[.5,0],[0,1]]);
const Shed=prism([[-.5,0],[.5,0],[-.5,1]]);
const mansionSites=[[557,592],[602,655],[661,661],[712,662],[768,642],[825,628],[890,573],[878,487],[786,536],[731,552],[589,551]];
const shopNames=['Juniper Coffee','Willow Grocer','Fieldstone Books','The Porch Bakery','Terrace Florist','Valley Outfitters'];

function prism(profile){
  const shape=new T.Shape();
  profile.forEach(([x,y],index)=>index?shape.lineTo(x,y):shape.moveTo(x,y));
  shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});
  geometry.translate(0,0,-.5);
  return geometry;
}

function makeRng(seed){
  return ()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}

function canvasTexture(draw,width=128,height=128){
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

function surfaceTexture(style){
  const noise=makeRng(638739+style.length);
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle=style==='brick'?'#877666':'#b9b8b2';
    ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=8){
      const brightness=156+Math.trunc(noise()*32);
      if(style==='brick'){
        ctx.fillStyle='#d4caba';
        ctx.fillRect(0,y,w,.9);
        for(let x=-24;x<w;x+=29){
          const shade=138+Math.trunc(noise()*42),offset=y%16===0?13:0;
          ctx.fillStyle=`rgb(${shade},${shade-12},${shade-21})`;
          ctx.fillRect(x+offset,y+1,27,6.2);
        }
      } else {
        ctx.fillStyle=`rgb(${brightness},${brightness},${brightness-3})`;
        ctx.fillRect(0,y,w,7);
        ctx.fillStyle='rgba(255,255,245,.33)';
        ctx.fillRect(0,y+.7,w,.8);
        ctx.fillStyle='rgba(0,0,0,.38)';
        ctx.fillRect(0,y+6.7,w,1.05);
        if(style==='shingle'){
          ctx.fillStyle='rgba(20,18,16,.31)';
          for(let x=(y%16===0?0:10);x<w;x+=22)ctx.fillRect(x,y+1.2,1.35,5.4);
        }
      }
    }
    for(let i=0;i<260;i++){
      const x=noise()*w,y=noise()*h;
      ctx.fillStyle=noise()<.5?'rgba(35,26,22,.11)':'rgba(255,251,222,.14)';
      ctx.fillRect(x,y,noise()*10+1,noise()*.78+.22);
    }
  });
}

function windowTexture(style){
  return canvasTexture((ctx,w,h)=>{
    const color=[['#443528','#e9b772','#fbdc9c'],['#543829','#c58b65','#ffdeb7'],
      ['#253951','#8d9fb0','#dcefff'],['#262d35','#49444a','#6d6472']][style];
    const wall=ctx.createLinearGradient(0,0,0,h);
    wall.addColorStop(0,color[1]);
    wall.addColorStop(.68,color[0]);
    wall.addColorStop(1,'#23242a');
    ctx.fillStyle=wall;
    ctx.fillRect(0,0,w,h);
    if(style!==3){
      const glow=ctx.createRadialGradient(w*.56,h*.57,0,w*.56,h*.57,w*.69);
      glow.addColorStop(0,color[2]);
      glow.addColorStop(1,'rgba(255,231,172,0)');
      ctx.fillStyle=glow;
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle='rgba(35,25,26,.40)';
      ctx.fillRect(w*.20,h*.72,w*.61,h*.021);
      ctx.fillRect(w*.24,h*.74,w*.022,h*.20);
      ctx.fillRect(w*.74,h*.74,w*.022,h*.20);
      ctx.fillRect(w*.58,h*.36,w*.025,h*.34);
      ctx.beginPath();
      ctx.moveTo(w*.50,h*.37);
      ctx.lineTo(w*.69,h*.37);
      ctx.lineTo(w*.655,h*.25);
      ctx.lineTo(w*.535,h*.25);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(81,60,52,.32)';
      ctx.fillRect(w*.27,h*.20,w*.105,h*.13);
      ctx.fillRect(w*.22,h*.49,w*.18,h*.085);
    }
    const curtain=ctx.createLinearGradient(0,0,w,0);
    curtain.addColorStop(0,'rgba(38,27,25,.73)');
    curtain.addColorStop(.08,'rgba(111,73,50,.68)');
    curtain.addColorStop(.20,'rgba(214,176,143,.36)');
    curtain.addColorStop(.26,'rgba(84,65,63,0)');
    curtain.addColorStop(.74,'rgba(84,65,63,0)');
    curtain.addColorStop(.81,'rgba(227,192,160,.34)');
    curtain.addColorStop(1,'rgba(52,40,39,.73)');
    ctx.fillStyle=curtain;
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(195,223,232,.12)';
    ctx.beginPath();ctx.moveTo(w*.09,0);ctx.lineTo(w*.37,0);ctx.lineTo(w*.97,h*.81);ctx.lineTo(w*.97,h);ctx.closePath();ctx.fill();
  },64,96);
}

function signTexture(name){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#1b2b32';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#d2ab77';ctx.lineWidth=2.3;ctx.strokeRect(5,5,w-10,h-10);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f3d9a2';ctx.font='600 29px Georgia, serif';
    ctx.fillText(name,w/2,h/2+1,w-25);
  },384,64);
}

function section(x,z,yaw,base){
  const cos=Math.cos(yaw),sin=Math.sin(yaw);
  return {
    x,z,yaw,base,
    world(u,v){return [x+cos*u+sin*v,z-sin*u+cos*v];},
  };
}

export function buildSuburbs(scene,{groundHeight,outsideCityRoad,streetsX,streetsZ}){
  const rand=makeRng(187821);
  const substrate=(color,additional={})=>new T.MeshStandardMaterial({
    color,roughness:.84,envMapIntensity:.42,emissive:color,emissiveIntensity:.045,...additional,
  });
  const siding=surfaceTexture('siding'),brickMap=surfaceTexture('brick'),shingle=surfaceTexture('shingle');
  const walls=[
    substrate(0x9babaa,{map:siding}),substrate(0xb59c85,{map:siding}),substrate(0xc2b4a1,{map:siding}),
    substrate(0x836759,{map:brickMap}),substrate(0x646b76,{map:siding}),substrate(0x777e62,{map:siding}),
    substrate(0xc0b2a2),substrate(0x546672),substrate(0xb6a590,{map:brickMap}),
  ];
  const rooftops=[substrate(0x444b55,{map:shingle}),substrate(0x504c47,{map:shingle}),
    substrate(0x64616a,{map:shingle}),substrate(0x383e47,{metalness:.33,roughness:.54})];
  const ivory=substrate(0xd1c8b8),charcoal=substrate(0x282d34),brick=substrate(0x7e675a,{map:brickMap});
  const stone=substrate(0x5c5e5d,{map:brickMap}), paving=substrate(0x8f8a80,{emissiveIntensity:.14});
  const driveway=substrate(0x4b4e54),concrete=substrate(0x717479,{emissiveIntensity:.13});
  const decking=substrate(0x7e674f,{map:siding});
  const darkMetal=substrate(0x263139,{metalness:.44}),wood=substrate(0x71543e,{map:siding});
  const garden=[substrate(0x3d5645,{emissiveIntensity:.12}),substrate(0x526150),substrate(0x576a52),substrate(0x3c5356)];
  const blooms=[substrate(0xb46f7c),substrate(0xe5b68c),substrate(0x84629c),substrate(0xe5d9aa)];
  const lawn=[substrate(0x324d3c),substrate(0x3b5442),substrate(0x3b513e),substrate(0x414f3e)];
  const soil=substrate(0x4e4140);
  const bulbs=[
    new T.MeshBasicMaterial({color:0xffd39b,toneMapped:false}),
    new T.MeshBasicMaterial({color:0xf7bc7d,toneMapped:false}),
    new T.MeshBasicMaterial({color:0xc6e5ed,toneMapped:false}),
  ];
  const windows=Array.from({length:4},(_,style)=>{
    const texture=windowTexture(style);
    return new T.MeshStandardMaterial({
      color:0xc9c8c4,map:texture,emissive:0xffeee0,emissiveMap:texture,emissiveIntensity:[.95,.74,.60,.16][style],
      roughness:.27,metalness:.18,envMapIntensity:.57,
    });
  });
  const shallowWater=new T.MeshPhysicalMaterial({color:0x275d70,emissive:0x133646,emissiveIntensity:.80,
    roughness:.24,metalness:.31,clearcoat:1,envMapIntensity:.68});
  const ovalGlow=canvasTexture((ctx,w,h)=>{
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    glow.addColorStop(0,'rgba(255,244,218,.70)');
    glow.addColorStop(.28,'rgba(255,226,169,.49)');
    glow.addColorStop(.62,'rgba(255,196,121,.17)');
    glow.addColorStop(1,'rgba(255,186,90,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  },64,64);
  const lampPool=new T.MeshBasicMaterial({map:ovalGlow,color:0xffd6a2,transparent:true,opacity:.47,
    blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
  const glare=new T.MeshBasicMaterial({map:ovalGlow,color:0xffd3a1,transparent:true,opacity:.61,
    blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});
  const carGlass=substrate(0x344657,{metalness:.41,roughness:.17,emissiveIntensity:.14,envMapIntensity:.96});
  const textCache=new Map();
  const batches=new Map(),paths=new Map();
  const assembly=new T.Object3D();
  let pathCount=0,homeCount=0,mansionCount=0,lampCount=0;
  const people=[];

  function add(geometry,material,x,y,z,w,h,d,yaw=0,pitch=0,roll=0){
    const area=Math.floor(x/185)+','+Math.floor(z/185);
    const key=area+':'+geometry.id+':'+material.id;
    if(!batches.has(key))batches.set(key,{geometry,material,list:[]});
    assembly.position.set(x,y,z);
    assembly.rotation.set(pitch,yaw,roll,'YXZ');
    assembly.scale.set(w,h,d);
    assembly.updateMatrix();
    batches.get(key).list.push(assembly.matrix.clone());
  }
  function part(site,geometry,material,u,h,v,w,height,d,yaw=0,pitch=0,roll=0){
    const [x,z]=site.world(u,v);
    add(geometry,material,x,site.base+h,z,w,height,d,site.yaw+yaw,pitch,roll);
  }
  function box(site,material,u,h,v,w,height,d,yaw=0,pitch=0,roll=0){
    part(site,Box,material,u,h,v,w,height,d,yaw,pitch,roll);
  }
  function zone(material,corners,lift=.05,sub=4){
    if(!paths.has(material))paths.set(material,{position:[],uv:[]});
    const {position,uv}=paths.get(material);
    const point=(s,t)=>{
      const x=T.MathUtils.lerp(T.MathUtils.lerp(corners[0][0],corners[1][0],s),T.MathUtils.lerp(corners[2][0],corners[3][0],s),t);
      const z=T.MathUtils.lerp(T.MathUtils.lerp(corners[0][1],corners[1][1],s),T.MathUtils.lerp(corners[2][1],corners[3][1],s),t);
      const y=typeof lift==='function'?lift(x,z,s,t):groundHeight(x,z)+lift;
      return [x,y,z];
    };
    const length=T.MathUtils.clamp(Math.ceil(Math.hypot(corners[0][0]-corners[2][0],corners[0][1]-corners[2][1])/2.8),1,40);
    for(let il=0;il<length;il++)for(let iw=0;iw<sub;iw++){
      const s=iw/sub,t=il/length,s2=(iw+1)/sub,t2=(il+1)/length;
      const p0=point(s,t),p1=point(s2,t),p2=point(s,t2),p3=point(s2,t2);
      const up=(p1[2]-p0[2])*(p2[0]-p0[0])-(p1[0]-p0[0])*(p2[2]-p0[2]);
      if(up>0){
        position.push(...p0,...p1,...p2,...p1,...p3,...p2);
        uv.push(s,t,s2,t,s,t2,s2,t,s2,t2,s,t2);
      }else{
        position.push(...p0,...p2,...p1,...p1,...p2,...p3);
        uv.push(s,t,s,t2,s2,t,s2,t,s,t2,s2,t2);
      }
    }
    pathCount++;
  }
  function rect(site,material,u0,v0,u1,v1,lift=.05,sub=4){
    zone(material,[site.world(u0,v0),site.world(u1,v0),site.world(u0,v1),site.world(u1,v1)],lift,sub);
  }
  function lane(material,x1,z1,x2,z2,width,lift=.06,sub=3){
    const theta=Math.atan2(x2-x1,z2-z1);
    const site=section(x1,z1,theta,0),distance=Math.hypot(x2-x1,z2-z1);
    rect(site,material,-width/2,0,width/2,distance,lift,sub);
  }
  function groundPad(site,material,width,depth,base=site.base){
    const foot=[
      [-width/2,0],[width/2,0],[0,-depth/2],[0,depth/2],[-width/2,-depth/2],
      [width/2,-depth/2],[-width/2,depth/2],[width/2,depth/2],
    ].map(([u,v])=>groundHeight(...site.world(u,v)));
    const floor=Math.min(...foot)-.22;
    add(Box,material,site.x,(base+floor)/2,site.z,width,base-floor,depth,site.yaw);
  }
  function floorBase(site,width,depth,margin=.21){
    return Math.max(...[-.5,0,.5].flatMap(u=>[-.5,0,.5].map(v=>
      groundHeight(...site.world(u*width,v*depth)))))+margin;
  }
  function windowAt(site,u,v,height,w,h,type,angle=0,detail=0){
    const inward=Math.sin(angle),front=Math.cos(angle);
    box(site,charcoal,u+inward*.025,height,v+front*.025,w+.14,h+.14,.10,angle);
    part(site,Panel,windows[type],u+inward*.083,height,v+front*.083,w,h,1,angle);
    const bar=ivory;
    for(const side of [-1,1]){
      box(site,bar,u+front*side*(w+.045)/2+inward*.09,height,
        v-inward*side*(w+.045)/2+front*.09,.078,h+.15,.088,angle);
      box(site,bar,u+inward*.09,height+side*(h+.073)/2,v+front*.09,w+.13,.072,.088,angle);
    }
    if(detail!==2){
      box(site,charcoal,u+inward*.095,height,v+front*.095,.037,h,.038,angle);
      if(detail===1)box(site,charcoal,u+inward*.095,height+.14*h,v+front*.095,w,.044,.034,angle);
    }
    box(site,ivory,u+inward*.12,height-h*.5-.072,v+front*.12,w+.23,.095,.18,angle);
  }
  function door(site,u,v,kind){
    const body=kind===3?darkMetal:wood;
    box(site,ivory,u,1.14,v+.045,1.22,2.28,.20);
    box(site,body,u,1.10,v+.157,.971,2.15,.077);
    for(const offset of [-.46,.46]){
      box(site,body,u+offset,1.14,v+.214,.065,2.12,.034);
    }
    box(site,ivory,u,1.77,v+.20,.69,.51,.034);
    part(site,Panel,windows[1],u,1.77,v+.222,.60,.43,1);
    box(site,charcoal,u,1.77,v+.226,.60,.026,.019);
    part(site,Sphere,bulbs[1],u+.34,1.02,v+.233,.056,.056,.044);
    box(site,ivory,u,.11,v+.20,1.13,.076,.28);
  }
  function gable(site,u,v,y,w,d,rise,wall,cover,hip=false){
    part(site,Gable,wall,u,y,v,w,rise,d);
    const over=.40,slope=Math.hypot(w/2+over,rise*(1+over*2/w)),tilt=Math.atan2(rise,w/2);
    for(const side of [-1,1]){
      box(site,cover,u+side*(w*.25+over*.5),y+rise*.5-over*.5*Math.tan(tilt),v,slope,.115,d+.78,0,0,-side*tilt);
      box(site,ivory,u+side*(w/2+over),y-over*Math.tan(tilt)-.11,v,.123,.184,d+.83);
      if(!hip){
        for(const end of [-1,1]){
          box(site,ivory,u+side*(w*.25+over*.5),y+rise*.5-over*.5*Math.tan(tilt)-.06,v+end*(d/2+.42),
            slope,.122,.11,0,0,-side*tilt);
        }
      }
    }
    box(site,cover,u,y+rise+.105,v,.20,.13,d+.87);
  }
  function canopy(site,u,v,y,w,d,cover){
    box(site,cover,u,y,v,w,.13,d);
    box(site,ivory,u,y-.10,v+d/2,w+.12,.19,.105);
  }
  function flowerbed(site,u,v,w,d){
    const [x,z]=site.world(u,v),y=groundHeight(x,z);
    const patch=section(x,z,site.yaw,0);
    rect(patch,soil,-w/2,-d/2,w/2,d/2,.075);
    for(let i=0;i<Math.ceil(w/.47);i++){
      const offset=-w*.45+i*w/Math.ceil(w/.47);
      const du=offset+rand()*.25,dv=(rand()-.5)*d*.75;
      const [bx,bz]=site.world(u+du,v+dv);
      const dy=groundHeight(bx,bz);
      add(Ball,garden[i%3],bx,dy+.18,bz,.30,.21,.32,rand()*PI);
      if(i%3!==1){
        for(let petal=0;petal<2;petal++)add(Sphere,blooms[(i+petal)%blooms.length],
          bx+(petal-.5)*.16,dy+.34+rand()*.12,bz+(rand()-.5)*.17,.073,.063,.073);
      }
    }
  }
  function tree(x,z,height,evergreen=false){
    if(outsideCityRoad(x,z))return;
    const y=groundHeight(x,z);
    if(evergreen){
      add(Trunk,wood,x,y+height*.32,z,.32,height*.65,.32);
      for(let i=0;i<5;i++){
        const radius=height*(.255-i*.033);
        add(Cone,garden[(i+2)%garden.length],x+(rand()-.5)*.26,y+height*(.49+i*.121),z,radius,height*.43,radius,rand()*PI);
      }
      return;
    }
    add(Trunk,wood,x,y+height*.31,z,.29,height*.63,.29,rand()*PI,0,.08);
    for(let i=0;i<6;i++){
      const t=i*2.4, radius=height*(i===0?0:.14+rand()*.07),scale=height*(.21+rand()*.075);
      const xx=x+Math.sin(t)*radius,zz=z+Math.cos(t)*radius;
      add(Trunk,wood,(xx+x)*.5,y+height*.46,(zz+z)*.5,.12,height*.35,.12,-t,.47);
      add(Ball,garden[i%garden.length],xx,y+height*(.67+rand()*.21),zz,scale,scale*.82,scale*.93,rand()*PI);
    }
  }
  function hedgeLine(site,u,v,total,{alongZ=false,tall=false}={}){
    const step=tall?.72:.74;
    for(let offset=-total/2;offset<=total/2;offset+=step){
      const [x,z]=site.world(u+(alongZ?0:offset),v+(alongZ?offset:0));
      if(outsideCityRoad(x,z))continue;
      const y=groundHeight(x,z)+(tall?.58:.39);
      add(Ball,garden[Math.floor(rand()*garden.length)],x,y,z,.56,tall?.82:.49,.54,rand()*PI);
    }
  }
  function fence(site,u0,v0,u1,v1,white=false){
    const [x,z]=site.world(u0,v0),[xx,zz]=site.world(u1,v1);
    const count=Math.round(Math.hypot(xx-x,zz-z)/.92);
    const yaw=Math.atan2(x-xx,z-zz);
    const m=white?ivory:wood;
    for(let i=0;i<=count;i++){
      const t=i/count,px=T.MathUtils.lerp(x,xx,t),pz=T.MathUtils.lerp(z,zz,t);
      const top=groundHeight(px,pz);
      if(outsideCityRoad(px,pz,.7))continue;
      add(Box,m,px,top+.56,pz,.12,1.12,.13,yaw);
      if(i===count)continue;
      const tx=T.MathUtils.lerp(x,xx,(i+.5)/count),tz=T.MathUtils.lerp(z,zz,(i+.5)/count);
      if(outsideCityRoad(tx,tz,.7)||outsideCityRoad(T.MathUtils.lerp(x,xx,(i+1)/count),T.MathUtils.lerp(z,zz,(i+1)/count),.7))continue;
      for(const h of [.34,.75])add(Box,m,tx,groundHeight(tx,tz)+h,tz,.061,.065,Math.hypot(xx-x,zz-z)/count+.04,yaw);
    }
  }
  function lantern(x,z,dir=0,mode=0){
    if(outsideCityRoad(x,z))return;
    const base=groundHeight(x,z);
    const height=mode===2?2.05:mode===1?3.38:4.82;
    const site=section(x,z,dir,base);
    part(site,Column,darkMetal,0,.16,0,.18,.33,.18);
    part(site,Trunk,darkMetal,0,height/2,0,.072,height,.072);
    const headZ=mode===0?.66:.07;
    if(mode===0)box(site,darkMetal,0,height-.04,.31,.076,.081,.64);
    box(site,darkMetal,0,height+.07,headZ,mode===0?.28:.18,.108,mode===0?.56:.26);
    box(site,bulbs[0],0,height+.012,headZ,mode===0?.23:.132,.066,mode===0?.42:.20);
    part(site,Panel,glare,0,height-.015,headZ,.85,.85,1);
    part(site,Panel,glare,0,height-.015,headZ,.85,.85,1,PI/2);
    const spread=mode===0?5.0:mode===2?2.4:3.05;
    rect(site,lampPool,-spread,-spread+headZ,spread,spread+headZ,.14,5);
    lampCount++;
  }
  function porch(site,v,width,roofMaterial){
    const [x,z]=site.world(0,v+1.55),grade=groundHeight(x,z);
    box(site,decking,0,.04,v+.70,width,.15,1.42);
    const steps=Math.max(2,Math.min(6,Math.ceil((site.base-grade+.12)/.19)));
    for(let i=0;i<steps;i++){
      const nearest=(steps-i)/steps;
      box(site,stone,0,T.MathUtils.lerp(grade-site.base-.015,.055,nearest)-.085,
        v+1.28+i*.25,1.95-i*.075,.17,.33);
    }
    canopy(site,0,v+.68,2.60,width+.37,1.68,roofMaterial);
    for(const sign of [-1,1]){
      box(site,ivory,sign*(width*.5-.16),1.34,v+1.26,.118,2.58,.119);
      box(site,ivory,sign*(width*.5-.16),1.34,v+.16,.10,2.54,.103);
      box(site,ivory,sign*(width*.5-.20),.89,v+.72,.077,.076,.92);
      for(let slat=0;slat<5;slat++)box(site,wood,sign*(width*.5-.20),.465,v+.36+slat*.18,.044,.79,.045);
    }
  }
  function garage(site,u,v,h,w,wall,roof,depth){
    box(site,wall,u,h*.5,v-depth/2,w,h,depth);
    canopy(site,u,v-depth*.50,h+.14,w+.65,depth+.63,roof);
    box(site,ivory,u,1.16,v+.035,w-.26,2.33,.13);
    box(site,darkMetal,u,1.125,v+.11,w-.52,2.20,.074);
    for(let i=0;i<6;i++)box(site,ivory,u,.155+i*.356,v+.149,w-.60,.035,.029);
    for(let i=-1;i<=1;i++)part(site,Panel,windows[3],u+i*w*.23,1.90,v+.154,w*.19,.21,1);
  }
  function address(site,u,v,number){
    if(number%4!==0)return;
    const name=String(number);
    if(!textCache.has(name)){
      textCache.set(name,new T.MeshBasicMaterial({map:signTexture(name),toneMapped:false}));
    }
    part(site,Panel,textCache.get(name),u,1.79,v+.14,.54,.17,1);
  }

  function residence(x,z,rowEdge,type,num){
    const face=z<rowEdge?0:PI;
    const site=section(x,z,face,0);
    const width=8.15+rand()*3.10,depth=8.5+rand()*3.45;
    const wall=walls[(type+num)%6],roof=rooftops[(type+num)%3];
    const tall=type===1||type===4||type===6;
    const height=tall?5.06+rand()*.42:3.02+rand()*.50;
    const front=depth/2;
    const wingSide=num%2===0?1:-1,wing=wingSide*(width*.5+1.64);
    const garageWidth=type===2?4.66:3.18;
    const bayEdge=front-.74-((type===4||type===1)?.53:0);
    const envelope=width+garageWidth+3.4;
    const [solidX,solidZ]=site.world(wingSide*2.28,.25);
    if(!clearRoadFootprint(outsideCityRoad,solidX,solidZ,envelope,depth+3.7,face,1.6))return;
    const riser=(num%4)*.19;
    site.base=floorBase(site,envelope,depth,.15+riser);
    groundPad(site,stone,width+.35,depth+.32);
    const [garageX,garageZ]=site.world(wing,bayEdge-2.81);
    groundPad(section(garageX,garageZ,site.yaw,site.base),stone,garageWidth,5.63);
    box(site,wall,0,height/2,0,width,height,depth);
    const windowType=(num+type)%5===0?3:num%3;
    const doorU=type===5?-width*.30:type===4?-width*.11:0;
    box(site,brick,0,.28,0,width+.08,.54,depth+.08);
    if(type===3){
      part(site,Shed,wall,0,height,0,width,width*.14,depth);
      box(site,roof,0,height+width*.068+.10,0,width*1.05,.16,depth+.74,0,0,-.139);
      box(site,ivory,0,height+width*.068+.03,front+.39,width*1.08,.137,.105,0,0,-.139);
    }else if(type===5){
      gable(site,0,0,height,width,depth,1.48,wall,roof,true);
      box(site,ivory,0,1.0,front+.45,width*.29,1.83,.89);
      box(site,roof,0,2.13,front+.48,width*.34,.15,1.18);
      windowAt(site,0,front+.91,1.35,width*.21,1.05,windowType,0,2);
    }else if(type===6){
      gable(site,0,-depth*.20,height,width,depth*.63,1.58,wall,roof);
      box(site,stone,0,3.98,front-.01,width*.81,.27,.72);
      for(const u of [-width*.36,width*.36])box(site,ivory,u,4.52,front+.33,.075,.89,.075);
      box(site,ivory,0,4.83,front+.34,width*.74,.075,.065);
    }else if(type===2){
      gable(site,0,0,height,width,depth,1.70,wall,roof,true);
      gable(site,-wingSide*width*.24,front-1.15,height+.14,width*.40,3.15,1.43,wall,roof);
    }else{
      gable(site,0,0,height,width,depth,(tall?2.44:1.93)+rand()*.50,wall,roof);
      if((type===0||type===4)&&num%3!==0){
        const dormerU=type===4?width*.23:-width*.235;
        gable(site,dormerU,front-.71,height+.29,width*.31,2.78,1.38,ivory,roof);
        box(site,wall,dormerU,height+.13,front+.38,width*.29,1.18,.42);
        windowAt(site,dormerU,front+.612,height+.24,.65,.66,windowType,0,1);
      }
    }
    if(type!==3){
      const chimney=-wingSide*width*.33;
      box(site,brick,chimney,height+1.62,-depth*.24,.74,2.27,.87);
      box(site,stone,chimney,height+2.79,-depth*.24,.90,.15,1.04);
      box(site,charcoal,chimney,height+2.89,-depth*.24,.66,.09,.68);
    }else{
      box(site,darkMetal,width*.19,height+.22,-depth*.15,1.36,.07,2.24,0,0,-.139);
      for(let i=0;i<5;i++)box(site,ivory,width*.19,height+.26,-depth*.92/10+i*.34,1.31,.015,.016,0,0,-.139);
    }
    // Upper and lower windows share real depth, sills and frames.
    for(const side of [-1,1]){
      windowAt(site,side*width*.29,front,1.65,type===3?1.77:1.17,1.25,windowType,0,type===3?2:1);
      windowAt(site,side*width*.23,-front,1.51,1.35,1.17,(windowType+1)%4,PI,1);
      windowAt(site,side*width/2,-depth*.14,1.58,1.12,1.13,windowType,side*PI/2,0);
      if(tall){
        windowAt(site,side*width*.29,front,3.77,1.10,1.25,(windowType+1)%4,0,1);
        windowAt(site,side*width*.23,-front,3.75,1.10,1.18,windowType,PI,1);
      }
      for(const edge of [-1,1])box(site,ivory,side*(width/2+.035),height/2,edge*(depth/2+.034),.138,height,.13);
    }
    if(tall&&type===1)box(site,ivory,0,2.80,front+.036,width,.13,.09);
    if(type===0||type===1)porch(site,front,type===0?width*.75:3.15,roof);
    else {
      canopy(site,doorU,front+.40,2.54,2.68,1.22,roof);
      for(let i=0;i<4+Math.ceil(riser/.14);i++){
        box(site,stone,doorU,.045-i*.14,front+.49+i*.244,1.92,.22,.31);
      }
    }
    door(site,doorU,front,type);
    address(site,doorU+.89,front,num);
    for(const side of [-1,1]){
      box(site,darkMetal,doorU+side*.93,1.92,front+.12,.17,.29,.14);
      box(site,bulbs[1],doorU+side*.93,1.90,front+.21,.085,.14,.048);
    }
    garage(site,wing,bayEdge,2.58,garageWidth,wall,roof,5.6);
    const [driveX,driveZ]=site.world(wing,bayEdge);
    const [pathX,pathZ]=site.world(doorU,front+1.66);
    const setback=rowEdge===0?10.66:6.26;
    const streetEnd=rowEdge-Math.sign(rowEdge-z)*setback;
    const flatten=finish=>(xx,zz,s,t)=>{
      const slope=T.MathUtils.smoothstep(t,.02,.96);
      return T.MathUtils.lerp(groundHeight(xx,zz)+.084,finish,slope);
    };
    lane(driveway,driveX,streetEnd,driveX,driveZ,garageWidth*.72,flatten(site.base+.045),3);
    lane(paving,pathX,streetEnd,pathX,pathZ,1.86,flatten(groundHeight(pathX,pathZ)+.07),2);
    const [mx]=site.world(wing-.95,front);
    const by=groundHeight(mx,streetEnd-Math.sign(rowEdge-z)*.44);
    add(Box,wood,mx,by+.54,streetEnd-Math.sign(rowEdge-z)*.44,.10,1.08,.102);
    add(Box,ivory,mx,by+.98,streetEnd-Math.sign(rowEdge-z)*.44,.32,.18,.42,face);
    flowerbed(site,-wingSide*(width*.27),front+.57,width*.37,1.00);
    if(type!==3)hedgeLine(site,-wingSide*(width/2+1.38),-depth*.12,depth*.64,{alongZ:true});
    for(const side of [-1,1]){
      const edge=side*(width/2+2.9);
      if(side!==wingSide||num%3===0)fence(site,edge,-depth*.91,edge,front+1.75,type===0||type===1);
    }
    fence(site,-(width/2+2.9),-depth*.91,width/2+2.9,-depth*.91,type===0||type===1);
    const [tx,tz]=site.world(-wingSide*(width/2+3.5),front+1.0);
    tree(tx,tz,4.25+rand()*3.4,num%5===0);
    const [sx,sz]=site.world(-wingSide*(width/2+2.3),-front-2.61);
    tree(sx,sz,5.01+rand()*3.7,num%4!==0);
    rect(site,lawn[num%lawn.length],-width*.5-3.1,-depth*.5-3.9,width*.5+3.1,front+4.5,.048);
    homeCount++;
  }

  function nearestApproach(x,z){
    let best=null,min=Infinity;
    for(let i=0;i<48;i++){
      const a=i*PI/24;
      for(let distance=8;distance<63;distance+=2){
        const [nx,nz]=[x+Math.cos(a)*distance,z+Math.sin(a)*distance];
        if(!outsideCityRoad(nx,nz))continue;
        if(distance<min){ best=[nx,nz]; min=distance; }
        break;
      }
    }
    return best;
  }
  function mansion(x,z,num){
    const approach=nearestApproach(x,z);
    if(!approach||Math.hypot(x-approach[0],z-approach[1])<12.0)return;
    const heading=Math.atan2(approach[0]-x,approach[1]-z);
    const site=section(x,z,heading,0);
    const width=16.2+rand()*4.5,depth=11.2+rand()*3.5;
    if(!clearRoadFootprint(outsideCityRoad,x,z,width+9.5,depth+9,heading,1.65))return;
    const modern=num%3!==1;
    const facade=walls[modern?num%2===0?6:7:8];
    const roof=rooftops[modern?3:1];
    site.base=floorBase(site,width+3.2,depth+3.7,.24);
    groundPad(site,stone,width+.50,depth+.54);
    box(site,facade,0,1.81,0,width,3.62,depth);
    const annexU=width*.30;
    box(site,modern?walls[8]:brick,annexU,4.95,-.55,width*.46,2.66,depth*.72);
    box(site,facade,-width*.205,4.83,-depth*.16,width*.54,2.42,depth*.62);
    if(modern){
      canopy(site,0,.32,3.67,width+.65,depth+.99,roof);
      canopy(site,annexU,-.55,6.37,width*.49,depth*.76,roof);
      canopy(site,-width*.205,-depth*.16,6.12,width*.57,depth*.67,roof);
      box(site,ivory,width*.506,1.79,0,.18,3.47,depth+.08);
      for(const offset of [-width*.29,-width*.21,-width*.13]){
        box(site,wood,offset,2.0,depth*.515,.095,3.77,.18);
      }
    }else{
      gable(site,annexU,-.55,6.28,width*.46,depth*.72,1.63,facade,roof,true);
      gable(site,-width*.205,-depth*.16,6.04,width*.54,depth*.62,1.77,facade,roof);
      canopy(site,0,.32,3.71,width+.52,depth+.83,roof);
    }
    const front=depth/2;
    for(const side of [-1,1]){
      for(let i=-1;i<=1;i++){
        const pos=(i+side*.31)*width*.26;
        windowAt(site,pos,front*side,1.86,width*.145,2.05,num%2,side===-1?PI:0,2);
      }
      for(let i=-1;i<=1;i++)windowAt(site,side*width/2,i*depth*.29,1.83,1.66,1.77,(num+side+2)%3,side*PI/2,2);
    }
    for(const side of [-1,1]){
      windowAt(site,annexU+side*width*.11,-.55+depth*.36,4.96,width*.13,1.77,(num+1)%3,0,2);
      windowAt(site,-width*.205+side*width*.12,depth*.15,4.85,width*.13,1.68,num%3,0,2);
    }
    door(site,0,front,3);
    const foyer=section(...site.world(0,front+.87),site.yaw,site.base+.085);
    groundPad(foyer,stone,3.8,2.0,foyer.base);
    box(site,ivory,0,.14,front+.86,4.15,.14,2.08);
    canopy(site,0,front+.64,2.87,4.04,1.54,roof);
    const carport=section(...site.world(width*.53,front+2.45),site.yaw,site.base-.13);
    groundPad(carport,driveway,5.8,6.2,carport.base);
    canopy(carport,0,0,2.68,5.95,6.32,roof);
    for(const side of [-1,1])for(const end of [-1,1]){
      box(carport,darkMetal,side*2.64,1.29,end*2.72,.18,2.58,.19);
    }
    const [leadX,leadZ]=site.world(0,front+1.80);
    const directionX=leadX-approach[0],directionZ=leadZ-approach[1],length=Math.hypot(directionX,directionZ);
    const startX=approach[0]+directionX/length*.77,startZ=approach[1]+directionZ/length*.77;
    lane(paving,startX,startZ,leadX,leadZ,2.20,(px,pz,s,t)=>
      T.MathUtils.lerp(groundHeight(px,pz)+.095,site.base+.12,T.MathUtils.smoothstep(t,.30,1)),3);
    lantern(startX+Math.cos(heading)*1.73,startZ-Math.sin(heading)*1.73,heading,1);
    const [patioX,patioZ]=site.world(-width*.18,-depth*.70);
    const patio=section(patioX,patioZ,site.yaw,site.base+.034);
    if(!outsideCityRoad(patioX,patioZ)){
      groundPad(patio,stone,width*.66,depth*.54);
      box(patio,paving,0,.055,0,width*.64,.10,depth*.51);
      box(patio,shallowWater,-.35,.112,0,width*.38,.015,depth*.31);
      box(patio,ivory,-.35,.13,depth*.16,width*.42,.072,.19);
      box(patio,ivory,-.35,.13,-depth*.16,width*.42,.072,.19);
      for(const side of [-1,1])box(patio,ivory,-.35+side*width*.20,.13,0,.19,.072,depth*.34);
      for(let q=-1;q<=1;q++){
        box(patio,wood,q*1.52,.29,-depth*.209,.53,.16,1.41);
        box(patio,ivory,q*1.52,.53,-depth*.242,.53,.31,.62,0,-.46);
      }
    }
    for(const side of [-1,1]){
      flowerbed(site,side*width*.29,front+.85,width*.30,1.28);
      hedgeLine(site,side*(width*.5+3.7),.55,depth+2.6,{alongZ:true,tall:true});
      const [tx,tz]=site.world(side*width*.71,-depth*.43);
      tree(tx,tz,6.7+rand()*4.5,side!==1);
    }
    mansionCount++;
  }

  function sign(site,name,u,h,v,width){
    if(!textCache.has(name))textCache.set(name,new T.MeshBasicMaterial({map:signTexture(name),toneMapped:false}));
    const [x,z]=site.world(u,v);
    const mesh=new T.Mesh(Panel,textCache.get(name));
    mesh.scale.set(width,.72,1);
    mesh.rotation.y=site.yaw;
    mesh.position.set(x,site.base+h,z);
    mesh.name=name;
    scene.add(mesh);
  }
  function bench(x,z,yaw){
    const site=section(x,z,yaw,groundHeight(x,z));
    for(const side of [-1,1]){
      box(site,darkMetal,side*.83,.246,0,.09,.492,.35);
      box(site,darkMetal,side*.83,.59,-.23,.075,.74,.082);
    }
    for(let j=0;j<4;j++)box(site,wood,0,.50,-.19+j*.118,1.95,.076,.096);
    for(let j=0;j<3;j++)box(site,wood,0,.70+j*.102,-.24,1.95,.072,.076);
  }
  function smallCar(x,z,yaw,color){
    if(outsideCityRoad(x,z))return;
    const site=section(x,z,yaw,groundHeight(x,z)+.055);
    box(site,color,0,.66,0,1.77,.56,4.00);
    part(site,Sphere,color,0,.83,0,.93,.35,1.98);
    part(site,Sphere,carGlass,0,1.06,-.35,.77,.42,1.34);
    box(site,color,0,1.36,-.42,1.13,.076,1.01);
    for(const side of [-1,1]){
      for(const end of [-1,1])part(site,Column,charcoal,side*.825,.335,end*1.195,.276,.201,.276,0,0,PI/2);
      box(site,bulbs[2],side*.627,.68,1.976,.31,.098,.047);
      box(site,substrateRed,side*.615,.716,-1.979,.334,.115,.043);
    }
  }
  const substrateRed=substrate(0x9f4c50,{emissive:0x97292c,emissiveIntensity:.20});
  const carBodies=[substrate(0x546d81,{metalness:.50,roughness:.36}),substrate(0x945849,{metalness:.53,roughness:.43}),
    substrate(0xb1ad9b,{metalness:.47,roughness:.39}),substrate(0x454f49,{metalness:.44,roughness:.44})];
  const plasterAwnings=[substrate(0x6e805c),substrate(0x9b695c),substrate(0x53717b),substrate(0x8b7967)];

  function shop(x,z,name,idx,d=14.8){
    const site=section(x,z,0,0);
    const width=15.8,height=4.2+(idx%3)*.28;
    if(!clearRoadFootprint(outsideCityRoad,x,z,width+.7,d+3.1,0,.9))return;
    site.base=floorBase(site,width,d,.14);
    groundPad(site,stone,width+.25,d+.26);
    box(site,idx%2===0?walls[6]:brick,0,height/2,0,width,height,d);
    const face=d*.5;
    box(site,rooftops[3],0,height+.19,0,width+.35,.30,d+.27);
    box(site,ivory,0,height+.045,face+.038,width+.55,.15,.16);
    if(idx%3===0){
      box(site,brick,0,height+1.03,-d*.16,width*.61,1.68,d*.53);
      box(site,ivory,0,height+1.90,-d*.16,width*.632,.12,d*.56);
      for(const offset of [-.25,0,.25])windowAt(site,offset*width,d*.11,height+1.03,1.25,1.05,3,0,1);
    }else{
      box(site,darkMetal,width*.21,height+.64,-d*.18,2.54,.64,2.42);
      box(site,ivory,width*.21,height+1.02,-d*.18,2.70,.12,2.54);
    }
    for(const u of [-width*.31,-width*.085,width*.23]){
      windowAt(site,u,face,1.44,width*.183,1.97,(idx+1)%3,0,2);
      box(site,brick,u,.23,face+.104,width*.198,.37,.14);
    }
    door(site,width*.405,face,3);
    box(site,ivory,0,2.69,face+.19,width+.08,.145,.66);
    box(site,plasterAwnings[idx%4],0,2.52,face+.85,width*.91,.15,1.48,0,.19);
    for(let ix=-7;ix<=7;ix+=2){
      const u=ix*width*.057;
      box(site,ivory,u,2.546,face+.85,width*.052,.05,1.45,0,.19);
    }
    box(site,plasterAwnings[idx%4],0,2.31,face+1.57,width*.91,.19,.074);
    sign(site,name,0,3.48,face+.10,width*.76);
    for(const end of [-1,1]){
      box(site,darkMetal,end*(width*.49),2.55,face+.20,.164,.29,.15);
      box(site,bulbs[0],end*(width*.49),2.53,face+.29,.104,.17,.046);
      windowAt(site,end*(width*.5),d*.09,1.76,1.41,1.61,3,end*PI/2,0);
    }
    const [fx,fz]=site.world(0,face+1.3);
    lane(paving,fx,-11.2,fx,fz,width*.94,.082);
  }

  function human(x,z,kind,yaw=0){
    const skin=humanSkin[kind%humanSkin.length],shirt=humanColors[kind%humanColors.length];
    const root=new T.Group();root.name='Suburban pedestrian';
    function piece(geometry,material,xx,y,zz,w,h,d){
      const object=new T.Mesh(geometry,material);
      object.position.set(xx,y,zz);object.scale.set(w,h,d);
      root.add(object);return object;
    }
    piece(Sphere,skin,0,1.61,0,.094,.113,.095);
    piece(Sphere,charcoal,0,1.671,-.016,.097,.066,.101);
    piece(Column,shirt,0,1.205,0,.169,.49,.105);
    piece(Sphere,shirt,0,1.39,.001,.204,.134,.10);
    const limbs=[];
    for(const side of [-1,1]){
      const leg=new T.Group(),arm=new T.Group();
      leg.position.set(side*.083,.995,0);
      arm.position.set(side*.202,1.425,0);
      root.add(leg,arm);
      const legMesh=piece(Trunk,humanPants[kind%2],0,-.369,.005,.054,.68,.060);
      const shoe=piece(Box,charcoal,0,-.729,.04,.11,.072,.226);
      leg.add(legMesh,shoe);
      const sleeve=piece(Trunk,shirt,0,-.212,.010,.053,.415,.057);
      const hand=piece(Sphere,skin,0,-.442,.009,.043,.063,.046);
      arm.add(sleeve,hand);
      limbs.push({side,leg,arm});
    }
    root.position.set(x,groundHeight(x,z)+.025,z);root.rotation.y=yaw;
    scene.add(root);
    return {root,limbs};
  }
  const humanSkin=[substrate(0xc59779),substrate(0x87513d),substrate(0xab7955),substrate(0xb28472)];
  const humanColors=[substrate(0x5f718f),substrate(0x9c6258),substrate(0x566d56),substrate(0xb89961),substrate(0x777386)];
  const humanPants=[substrate(0x38465a),substrate(0x4c504f)];
  function walker(path,kind,offset,speed,lift=.07){
    const {root,limbs}=human(path[0][0],path[0][1],kind);
    const segments=[];
    let length=0;
    for(let i=1;i<path.length;i++){
      const [x,z]=path[i-1],[xx,zz]=path[i];
      const distance=Math.hypot(xx-x,zz-z);
      if(distance<.001)continue;
      segments.push({x,z,xx,zz,yaw:Math.atan2(xx-x,zz-z),start:length,distance});
      length+=distance;
    }
    people.push({root,limbs,segments,length,offset,speed,lift});
  }

  function village(x0){
    const center=x0+41.5;
    for(const offset of [0,83]){
      const plaza=section(center+offset,-20,0,0);
      rect(plaza,paving,-34,-7,34,7,.064,20);
      rect(plaza,driveway,-33,-46,33,-30,.060,20);
      rect(plaza,lawn[1],-34,-51,34,-47,.064,20);
    }
    for(let i=0;i<6;i++){
      const x=x0+13.50+i*27.6;
      shop(x,-34,shopNames[i],i);
    }
    for(let i=0;i<17;i++){
      const x=x0+8.5+i*9.11;
      if(outsideCityRoad(x-1.45,-55)||outsideCityRoad(x+1.45,-55))continue;
      const site=section(x,-55,0,0);
      for(const off of [-1.27,1.27]){
        rect(site,concrete,off-.027,-2.6,off+.027,2.6,.089,1);
      }
      if(i%3!==1)smallCar(x,-55,i%2===0?0:PI,carBodies[i%carBodies.length]);
    }
    for(let i=0;i<8;i++){
      const x=x0+10.9+i*20.6;
      lantern(x,-13.6,0,i%2?1:0);
      const site=section(x,-17.2,0,0);
      flowerbed(site,0,0,3.05,1.17);
      bench(x+3.5,-22.0,PI);
      if(i%2===1)tree(x,-22.2,5.1+rand()*1.3);
    }
    const arch=section(center,-14.2,0,floorBase(section(center,-14.2,0,0),8,1.2,.11));
    for(const flank of [-1,1]){
      box(arch,brick,flank*3.8,1.43,0,.37,2.86,.42);
      box(arch,ivory,flank*3.8,2.91,0,.57,.13,.61);
      box(arch,bulbs[0],flank*3.8,3.06,0,.17,.16,.17);
    }
    box(arch,darkMetal,0,2.70,0,7.75,.16,.19);
    sign(arch,'Juniper Village',0,2.46,.15,5.82);
    const seating=section(x0+109,-16.9,0,0);
    for(let i=-1;i<=1;i++){
      const x=seating.x+i*2.85,z=seating.z-1.02;
      const s=section(x,z,0,groundHeight(x,z));
      part(s,Column,darkMetal,0,.467,0,.045,.92,.045);
      part(s,Column,decking,0,.94,0,.58,.083,.58);
      for(const side of [-1,1])box(s,ivory,side*.76,.45,.066,.44,.085,.45);
      part(s,Column,darkMetal,0,1.62,0,.031,1.33,.031);
      part(s,Cone,plasterAwnings[(i+3)%4],0,2.36,0,.95,.19,.95);
    }
    for(let i=0;i<14;i++){
      const dx=(i%2)*4.7;
      const start=x0+9+(i%2)*83,end=start+63;
      const path=[[start,-16.1-dx],[end,-16.1-dx],[end,-17.4-dx],[start,-17.4-dx],[start,-16.1-dx]];
      walker(i%2===1?path.reverse():path,i,i*23.7,1.05+i%3*.15,.087);
    }
  }

  function park(x,z){
    const site=section(x,z,0,0);
    rect(site,lawn[1],-32,-32,32,32,.059,10);
    const path=[[x-20,z-23],[x+18,z-23],[x+25,z-9],[x+24,z+15],
      [x+17,z+24],[x-18,z+24],[x-25,z+14],[x-25,z-10],[x-20,z-23]];
    for(let i=1;i<path.length;i++)lane(paving,...path[i-1],...path[i],2.63,.081);
    lane(paving,x,z-34,x,z-23,2.58,.081);
    lane(paving,x,z+24,x,z+34,2.58,.081);
    const gazebo=section(x,z,PI*.25,0);
    gazebo.base=floorBase(gazebo,9.0,9.0,.12);
    groundPad(gazebo,paving,9.2,9.2);
    part(gazebo,Column,stone,0,.10,0,4.9,.19,4.9);
    part(gazebo,Cone,rooftops[1],0,3.50,0,4.21,1.48,4.21);
    part(gazebo,Sphere,bulbs[0],0,2.73,0,.17,.15,.17);
    for(let i=0;i<8;i++){
      const a=i*PI/4;
      part(gazebo,Column,ivory,Math.sin(a)*3.63,1.55,Math.cos(a)*3.63,.088,3.08,.088);
    }
    const [gx,gz]=gazebo.world(0,3.68);
    lane(paving,x,z+24,gx,gz,2.27,.087);
    for(let i=0;i<8;i++){
      const a=i*PI/4;
      const tx=x+32*Math.cos(a),tz=z+31*Math.sin(a);
      tree(tx,tz,5.1+rand()*3.4,i%4===1);
      lantern(x+21.9*Math.cos(a),z+21.9*Math.sin(a),a,1);
      const [bx,bz]=[x+18.8*Math.sin(a),z+17.7*Math.cos(a)];
      bench(bx,bz,a+PI);
    }
    for(const side of [-1,1]){
      flowerbed(site,side*6,-9,6.0,1.26);
      flowerbed(site,side*6,9,6.0,1.26);
    }
    for(let i=0;i<5;i++)walker(i%2===0?path:[...path].reverse(),i+6,i*28.04,.97+i%3*.14,.087);
  }

  function curbside(){
    for(const z of streetsZ){
      for(const side of z===0?[-1]:[-1,1]){
        const offset=z===0?12.5:7.22;
        for(let block=0;block<streetsX.length-1;block++){
          const x0=streetsX[block],x1=streetsX[block+1];
          const laneZ=z+side*offset;
          const margin=7.05;
          lane(concrete,x0+margin,laneZ,x1-margin,laneZ,1.97,.133);
          lane(stone,x0+margin,z+side*(offset-1.14),x1-margin,z+side*(offset-1.14),.136,.151,1);
          for(let x=x0+16;x<x1-9;x+=25.2){
            for(let d=-1.1;d<=1.11;d+=.55)lane(paving,x+d,laneZ-.86,x+d,laneZ+.86,.029,.142,1);
          }
          const times=z===0?4:2;
          for(let n=0;n<times;n++){
            const x=x0+14+n*(x1-x0-28)/(times-1),zz=z+side*(offset+.58);
            if((block===2&&z===-83&&side===-1)||(z===-166&&side===1&&block===2))continue;
            lantern(x,zz,side===1?PI:0,0);
          }
          if(z!==-166&&z!==-83&&block!==1&&block!==2){
            const walkPath=[[x0+10,laneZ-.32],[x1-10,laneZ-.32],[x1-10,laneZ+.30],[x0+10,laneZ+.30],[x0+10,laneZ-.32]];
            walker(walkPath,block+8,block*12.09+Math.abs(z)*.2,1.04,.139);
          }
        }
      }
    }
    for(const x of streetsX){
      for(const side of [-1,1]){
        for(let block=0;block<streetsZ.length-1;block++){
          const [z1,z0]=[streetsZ[block+1],streetsZ[block]],offset=7.16;
          const sx=x+side*offset;
          lane(concrete,sx,z1+7.2,sx,z0-(z0===0?11.9:7.2),1.76,.134);
          lane(stone,x+side*(offset-1.0),z1+7.2,x+side*(offset-1.0),z0-(z0===0?11.9:7.2),.132,.149,1);
          if((x===548&&side===1||x===631&&side===-1)&&block===1)continue;
          const zz=(z0+z1)/2;
          lantern(sx+side*.28,zz,side===1?-PI/2:PI/2,0);
        }
      }
    }
  }

  for(let i=0;i<streetsX.length-1;i++){
    for(let j=0;j<streetsZ.length-1;j++){
      const [nearX,farX]=[streetsX[i],streetsX[i+1]];
      const [nearZ,farZ]=[streetsZ[j],streetsZ[j+1]];
      if(j===0&&(i===1||i===2))continue;
      if(i===2&&j===1)continue;
      if(i===3&&j===2){park((nearX+farX)/2,(nearZ+farZ)/2);continue;}
      for(const rx of [.24,.50,.76]){
        for(const rz of [.278,.727]){
          const num=101+(i*streetsZ.length+j)*6+Math.round(rx*3-.4)*2+(rz>.5?1:0);
          const x=T.MathUtils.lerp(nearX,farX,rx)+(rand()-.5)*2.65;
          const z=T.MathUtils.lerp(nearZ,farZ,rz)+(rand()-.5)*1.76;
          residence(x,z,rz<.5?nearZ:farZ,Math.floor(rand()*7),num);
        }
      }
    }
  }
  village(streetsX[1]);
  mansionSites.forEach(([x,z],i)=>mansion(x,z,i));
  curbside();

  for(const [material,{position,uv}] of paths){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);
    mesh.name=material===lampPool?'Suburban lamp pools':'Terrain-following suburban walkways';
    scene.add(mesh);
  }
  for(const {geometry,material,list} of batches.values()){
    const mesh=new T.InstancedMesh(geometry,material,list.length);
    mesh.name='Rainport suburban detail';
    list.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  function update(time,playerX=520,playerZ=0){
    for(const {root,limbs,segments,length,offset,speed,lift} of people){
      const travel=((time*speed+offset)%length+length)%length;
      const segment=segments.find((entry)=>travel<entry.start+entry.distance)??segments[segments.length-1];
      const t=(travel-segment.start)/segment.distance;
      const x=T.MathUtils.lerp(segment.x,segment.xx,t),z=T.MathUtils.lerp(segment.z,segment.zz,t);
      root.visible=Math.abs(x-playerX)<175&&Math.abs(z-playerZ)<150;
      if(!root.visible)continue;
      const gait=time*7.8+offset;
      root.position.set(x,groundHeight(x,z)+lift+Math.sin(gait*2)*.023,z);
      root.rotation.y=segment.yaw;
      for(const {side,leg,arm} of limbs){
        leg.rotation.x=Math.sin(gait)*side*.44;
        arm.rotation.x=-Math.sin(gait)*side*.34;
      }
    }
  }
  update(0);
  return {update,counts:{homes:homeCount,mansions:mansionCount,shops:shopNames.length,lamps:lampCount,walkers:people.length,paths:pathCount}};
}
