import * as T from 'three';

export const shoreLink={west:256,east:1001,exit:631};
const ease=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
export function expressZ(x){
  return -152-14*ease(305,391,x);
}

function sampleCurve(points,step=2.4){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)));
  return curve.getSpacedPoints(Math.ceil(curve.getLength()/step)).map(({x,z})=>[x,z]);
}
function makePath(id,points,width,height){
  const nodes=points.map(([x,z],i)=>{
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const px=(b[1]-a[1])/length,pz=(a[0]-b[0])/length;
    return {x,z,y:height(x,z),px,pz,heading:Math.atan2(-pz,px)};
  });
  const index=new Map(),size=24;
  for(let i=1;i<nodes.length;i++){
    const a=nodes[i-1],b=nodes[i];
    for(let x=Math.floor((Math.min(a.x,b.x)-width-3)/size);x<=Math.floor((Math.max(a.x,b.x)+width+3)/size);x++){
      for(let z=Math.floor((Math.min(a.z,b.z)-width-3)/size);z<=Math.floor((Math.max(a.z,b.z)+width+3)/size);z++){
        const k=x+','+z;
        if(!index.has(k))index.set(k,[]);
        index.get(k).push([a,b]);
      }
    }
  }
  function at(x,z){
    let best=null;
    for(const [a,b] of index.get(Math.floor(x/size)+','+Math.floor(z/size))??[]){
      const dx=b.x-a.x,dz=b.z-a.z;
      const u=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
      const nearX=a.x+dx*u,nearZ=a.z+dz*u;
      const distance=Math.hypot(x-nearX,z-nearZ);
      if(best&&distance>=best.distance)continue;
      best={id,x:nearX,z:nearZ,y:T.MathUtils.lerp(a.y,b.y,u),distance,width};
    }
    return best;
  }
  return {id,nodes,width,at};
}

export function createShoreLink(scene,{groundHeight,freeway,isGroundRoad=()=>false}){
  const mainHeight=x=>groundHeight(x,expressZ(x))+.075+
    7.75*ease(256,369,x)*(1-ease(895,1003,x));
  const main=makePath('main',Array.from({length:316},(_,i)=>{
    const x=T.MathUtils.lerp(shoreLink.west,shoreLink.east,i/315);
    return [x,expressZ(x)];
  }),9.03,mainHeight);
  const startZ=-102;
  const inHeight=freeway.surfaceAt(157.68,startZ,true).y;
  const spur=makePath('spur',sampleCurve([[157.68,startZ],[159.7,-125],[183,-146],[224,-149.1],
    [269,-147.4],[303,-147.2],[337,expressZ(337)+4.42],[369,expressZ(369)+4.42]]),3.24,
    (x,z)=>T.MathUtils.lerp(x<165?freeway.surfaceAt(157.68,z,true).y:inHeight,mainHeight(x),ease(171,330,x)));
  const takeoffX=514,endX=631,endZ=-111;
  const ramp=makePath('exit',sampleCurve([[takeoffX,expressZ(takeoffX)+5.6],[545,-156],[579,-139],
    [601,-119],[616,-111],[endX,endZ]]),3.65,
    (x,z)=>T.MathUtils.lerp(mainHeight(x)-.02,groundHeight(x,z)+.105,ease(553,626,x)));
  const paths=[main,spur,ramp];
  const concrete=new T.MeshStandardMaterial({color:0x4d5b69,roughness:.85,emissive:0x25324b,emissiveIntensity:.66,side:T.DoubleSide});
  const asphalt=new T.MeshStandardMaterial({color:0x283444,roughness:.93,emissive:0x121d30,emissiveIntensity:.53});
  const white=new T.MeshBasicMaterial({color:0xcce1e8,toneMapped:false});
  const yellow=new T.MeshBasicMaterial({color:0xf4c06e,toneMapped:false});
  const cyan=new T.MeshBasicMaterial({color:0x9be7ff,toneMapped:false});
  const steel=new T.MeshStandardMaterial({color:0x546273,metalness:.35,roughness:.63});
  const uncured=new Map(),parts=new Map(),boxGeo=new T.BoxGeometry(1,1,1);
  const unitGlow=new T.PlaneGeometry(1,1);
  const box=(material,x,y,z,w,h,d,yaw=0)=>{
    if(!parts.has(material))parts.set(material,[]);
    parts.get(material).push([x,y,z,w,h,d,yaw]);
  };
  function panel(material,a,b,c,d){
    if(!uncured.has(material))uncured.set(material,[]);
    uncured.get(material).push(...a,...b,...c,...b,...d,...c);
  }
  function on(node,offset,y){
    return [node.x+node.px*offset,node.y+y,node.z+node.pz*offset];
  }
  function open(path,node,side){
    if(path.id==='main'){
      if(node.x<263||node.x>991)return true;
      if(side===-1&&node.x>509&&node.x<561)return true;
      if(side===-1&&node.x>281&&node.x<372)return true;
    }
    if(path.id==='spur'&&(node.x<167||node.x>320))return true;
    if(path.id==='exit'&&(node.x<551||node.x>616))return true;
    return false;
  }
  for(const path of paths){
    for(let i=1;i<path.nodes.length;i++){
      const a=path.nodes[i-1],b=path.nodes[i];
      const wide=path.width;
      // In the physical merge overlap the parent deck owns the pavement.
      const onParent=(path.id==='spur'&&a.x>356)||(path.id==='exit'&&b.x<522);
      if(!onParent){
        panel(asphalt,on(a,wide,.014),on(a,-wide,.014),on(b,wide,.014),on(b,-wide,.014));
        for(const side of [-1,1]){
          if(open(path,a,side))continue;
          const e=wide*side;
          panel(concrete,on(a,e,-.57),on(a,e,.63),on(b,e,-.57),on(b,e,.63));
          panel(concrete,on(a,e-.28*side,.63),on(a,e,.63),on(b,e-.28*side,.63),on(b,e,.63));
          panel(concrete,on(a,e-.28*side,-.07),on(a,e-.28*side,.63),on(b,e-.28*side,-.07),on(b,e-.28*side,.63));
        }
      }
      for(const side of [-1,1]){
        const e=(wide-.55)*side;
        if(!open(path,a,side))panel(white,on(a,e+.051,.033),on(a,e-.051,.033),on(b,e+.051,.033),on(b,e-.051,.033));
      }
      if(path.id==='main'){
        for(const side of [-1,1]){
          const edge=side*.25;
          panel(yellow,on(a,edge+.047,.035),on(a,edge-.047,.035),on(b,edge+.047,.035),on(b,edge-.047,.035));
          if(i%6<2){
            const e=side*4.53;
            panel(white,on(a,e+.061,.036),on(a,e-.061,.036),on(b,e+.061,.036),on(b,e-.061,.036));
          }
        }
      }
      if(i%14===3&&b.y-groundHeight(b.x,b.z)>2.8){
        const center=b.y-.58;
        const offsets=isGroundRoad(b.x,b.z,1.2)?[-path.width-2.1,path.width+2.1]:[0];
        const piers=offsets.map(offset=>on(b,offset,0)).filter(([x,,z])=>!isGroundRoad(x,z,1.2));
        if(!piers.length)continue;
        for(const [x,,z] of piers){
          const base=groundHeight(x,z)-.23;
          if(center-base>1)box(concrete,x,(base+center)/2,z,1.38,center-base,1.55,b.heading);
        }
        box(concrete,b.x,center,b.z,offsets.length>1?path.width*2+6:path.width*1.67,.52,1.8,b.heading);
      }
    }
  }
  const glowCanvas=document.createElement('canvas');glowCanvas.width=48;glowCanvas.height=48;
  const glowCtx=glowCanvas.getContext('2d');
  const falloff=glowCtx.createRadialGradient(24,24,0,24,24,24);
  falloff.addColorStop(0,'rgba(208,234,255,.52)');
  falloff.addColorStop(.24,'rgba(158,208,255,.37)');
  falloff.addColorStop(1,'rgba(126,174,255,0)');
  glowCtx.fillStyle=falloff;glowCtx.fillRect(0,0,48,48);
  const glowTexture=new T.CanvasTexture(glowCanvas);
  const deckPool=new T.MeshBasicMaterial({map:glowTexture,opacity:.43,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const glowMat=new T.SpriteMaterial({map:glowTexture,opacity:.76,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const pools=[];
  for(const path of paths){
    for(let i=6;i<path.nodes.length-4;i+=path.id==='main'?14:12){
      const node=path.nodes[i],side=Math.floor(i/12)%2===1?-1:1;
      if(open(path,node,side))continue;
      const [x,y,z]=on(node,side*(path.width-.31),0);
      box(steel,x,y+2.68,z,.11,5.36,.13);
      const [lx,ly,lz]=on(node,side*(path.width-1.67),5.38);
      box(steel,(x+lx)/2,ly+.13,(z+lz)/2,1.55,.105,.163,node.heading);
      box(cyan,lx,ly,lz,.56,.123,.27,node.heading);
      const sprite=new T.Sprite(glowMat);
      sprite.position.set(lx,ly-.02,lz);sprite.scale.set(2.8,2.8,1);scene.add(sprite);
      pools.push([...on(node,side*(path.width-3.4),.056),node.heading]);
    }
  }
  const planeMatrix=new T.Object3D();
  const poolMesh=new T.InstancedMesh(unitGlow,deckPool,pools.length);
  pools.forEach(([x,y,z,heading],i)=>{
    planeMatrix.position.set(x,y,z);planeMatrix.rotation.set(-Math.PI/2,heading,0,'YXZ');
    planeMatrix.scale.set(12.1,16.2,1);planeMatrix.updateMatrix();poolMesh.setMatrixAt(i,planeMatrix.matrix);
  });
  scene.add(poolMesh);
  function gantry(x,label,sublabel,width=12){
    const z=expressZ(x),y=mainHeight(x);
    const canvas=document.createElement('canvas');canvas.width=760;canvas.height=224;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#104b45';ctx.fillRect(0,0,760,224);
    ctx.strokeStyle='#c6f3ea';ctx.lineWidth=7;ctx.strokeRect(9,9,742,206);
    ctx.textAlign='center';ctx.fillStyle='#e6fff7';ctx.font='bold 62px sans-serif';ctx.fillText(label,380,85,710);
    ctx.font='bold 43px sans-serif';ctx.fillText(sublabel,380,171,700);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.PlaneGeometry(width,width*.2947),new T.MeshBasicMaterial({map,toneMapped:false}));
    sign.rotation.y=-Math.PI/2;
    sign.position.set(x-.14,y+6.5,z+3.4);scene.add(sign);
    for(const side of [-1,1])box(steel,x,y+3.53,z+side*8.58,.25,7.06,.28);
    box(steel,x,y+7.60,z,.24,.26,17.4);
  }
  gantry(318,'SHORE LINK','LAKE DISTRICT  •  AIRPORT');
  gantry(479,'LAKE DISTRICT','EXIT 4  ↗');
  gantry(833,'RAINPORT FIELD','AIRPORT  •  LOCAL ACCESS');
  for(const [material,vertices] of uncured){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.computeVertexNormals();scene.add(new T.Mesh(geometry,material));
  }
  for(const [material,entries] of parts){
    const mesh=new T.InstancedMesh(boxGeo,material,entries.length);
    entries.forEach(([x,y,z,w,h,d,yaw],i)=>{
      planeMatrix.position.set(x,y,z);planeMatrix.scale.set(w,h,d);planeMatrix.rotation.set(0,yaw,0);
      planeMatrix.updateMatrix();mesh.setMatrixAt(i,planeMatrix.matrix);
    });
    scene.add(mesh);
  }

  function surfaceAt(x,z,current){
    const base=groundHeight(x,z);
    const matches=paths.map(path=>path.at(x,z)).filter(part=>part&&part.distance<=part.width+.33);
    const available=matches.filter(part=>
      part.id===current||
      (current==='r5'&&part.id==='spur'&&x>159&&z>-137&&z<-103)||
      (current&&current!=='r5'&&Math.abs((paths.find(path=>path.id===current)?.at(x,z)?.y??part.y+10)-part.y)<1.18)||
      (part.y-base<.81&&(part.id!=='spur'||x>303)));
    if(!available.length)return null;
    const score=part=>part.distance/part.width+(part.id===current?-.21:0);
    return available.reduce((best,part)=>score(part)<score(best)?part:best);
  }
  function obstructs(x,z,current){
    if(current&&current!=='r5'){
      const road=surfaceAt(x,z,current);
      if(road&&road.distance<road.width-.23)return false;
      // Both local ramps leave the deck without an intervening wall.
      if(road&&road.y-groundHeight(x,z)<.72)return false;
      const last=paths.find(path=>path.id===current)?.at(x,z);
      return !last||last.y-groundHeight(last.x,last.z)>.75;
    }
    if(surfaceAt(x,z,current))return false;
    return paths.some(path=>{
      const road=path.at(x,z);
      if(!road||road.distance>road.width+.13)return false;
      const lift=road.y-groundHeight(x,z);
      return lift>.83&&lift<2.47;
    });
  }
  const traffic=[];
  const lamps=[new T.MeshBasicMaterial({color:0xe5f6ff,toneMapped:false}),
    new T.MeshBasicMaterial({color:0xff4266,toneMapped:false})];
  function spawnTraffic(factory){
    for(const dir of [-1,1])for(const lane of [2.36,6.65]){
      for(let n=0;n<6;n++){
        const i=traffic.length;
        const car=factory(i+70);
        const base=275+(n+.15*lane+dir*.24)*106;
        scene.add(car.group);
        const puddles=lamps.map((_,index)=>{
          const mat=deckPool.clone();
          mat.color.setHex(index===0?0xc1dcff:0xe51d4e);
          mat.opacity=index===0?.36:.24;
          const mesh=new T.Mesh(unitGlow,mat);
          mesh.rotation.x=-Math.PI/2;
          mesh.scale.set(index===0?9.1:4.2,4.4,1);scene.add(mesh);return mesh;
        });
        const initial=21+(i%5)*1.15;
        traffic.push({...car,dir,lane,x:base,z:expressZ(base)+dir*lane,
          speed:initial,cruise:initial,roll:0,puddles});
      }
    }
  }
  function updateTraffic(dt,viewer,playerRoute){
    for(const car of traffic){
      let demand=car.cruise;
      const {x,z,lane,dir}=car;
      const playerGap=(viewer.x-x)*dir;
      if(playerRoute==='main'&&Math.abs(viewer.z-z)<2.5&&playerGap>0&&playerGap<69){
        demand=Math.min(demand,Math.max(0,(playerGap-6.15)*.86));
      }
      for(const other of traffic){
        if(other===car||other.dir!==dir||other.lane!==lane)continue;
        const gap=(other.x-x)*dir;
        if(gap>0&&gap<48)demand=Math.min(demand,Math.max(0,(gap-6.7)*.95));
      }
      car.speed+=T.MathUtils.clamp(demand-car.speed,-11*dt,4.1*dt);
      const next=x+car.speed*dir*dt;
      const low=269,high=991;
      const spawn=next<low?high:next>high?low:null;
      const available=spawn===null||!traffic.some(other=>other!==car&&other.dir===dir&&other.lane===lane&&Math.abs(other.x-spawn)<15);
      car.x=spawn===null?next:available?spawn:T.MathUtils.clamp(next,low,high);
      car.z=expressZ(car.x)+dir*lane;
      const height=mainHeight(car.x),rise=mainHeight(car.x+dir)-mainHeight(car.x-dir);
      car.group.position.set(car.x,height+.037,car.z);
      car.group.rotation.set(-Math.atan2(rise,2),dir*Math.PI/2,0,'YXZ');
      car.group.visible=Math.hypot(car.x-viewer.x,car.z-viewer.z)<172;
      car.roll=T.MathUtils.euclideanModulo(car.roll+car.speed*dt/car.radius,Math.PI*2);
      if(car.group.visible)for(const wheel of car.wheels)wheel.rotation.x=car.roll;
      car.puddles.forEach((pool,index)=>{
        pool.visible=car.group.visible&&Math.abs(car.x-viewer.x)<110;
        pool.position.set(car.x+dir*(index===0?6.30:-3.67),height+.067,car.z);
      });
    }
  }
  function trafficBlocks(x,z,y){
    return traffic.some(car=>Math.abs(car.group.position.y-y)<1.7&&
      Math.abs(car.x-x)<car.len/2+.34&&Math.abs(car.z-z)<1.27);
  }
  return {surfaceAt,obstructs,mainHeight,spawnTraffic,updateTraffic,trafficBlocks};
}
