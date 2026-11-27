import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createArchitecture} from './architecture';
import {buildWalkways,buildBoundaries,buildCityPlaces,createSidewalkLayout} from './streetscape';
import {createTerrain, createFreeway} from './freeway';
import {airport,buildRegion,outsideCityRoad,regionalRoadHeight,regionGround as groundHeight,shorelineStart} from './region';
import {createPilot} from './pilot';
import {createShoreLink,expressZ} from './expressway';
import {footprintBlocks,travelCar} from './driveMotion';
import {clearRoadFootprint} from './roadClearance';
import {createGarages,garageParcels} from './garages';
import {createAirTraffic} from './airtraffic';
import {observatoryPlaza, marketBlock, skybridges, monorail, streetLife} from './district';

const block = 76;
const street = 20;
const count = 4;
const extent = count * block;
export const parkingParcels=[[-1,-1],[1,-2],[-2,0]];
const sidewalk=createSidewalkLayout([...parkingParcels,...garageParcels]);
const colors = [0x60dfff, 0xff4eaf, 0x8b80ff, 0xffb86a, 0x79fff1];
const clamp = T.MathUtils.clamp;
let seed = 2431;
function rand() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}

const unitBox=new T.BoxGeometry(1,1,1);
function addBox(scene, material, x, y, z, w, h, d) {
  const mesh = new T.Mesh(unitBox, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w,h,d);
  scene.add(mesh);
  return mesh;
}

function facadeTexture(style) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = ['#090f22', '#10192a', '#111223', '#091521'][style];
  context.fillRect(0, 0, 128, 256);
  const windows = ['#ffc385','#ecdbb3','#9ad9ff','#70bedf','#e8efff'];
  for (let row = 0; row < 16; row++) {
    context.fillStyle = '#263147';
    context.fillRect(0, row * 16 + 14, 128, 1);
    for (let col = 0; col < 8; col++) {
      const x = col * 16 + 4, y = row * 16 + 3;
      if (rand() < .44) continue;
      const color = windows[Math.floor(rand() * windows.length)];
      context.globalAlpha = .2 + rand() * .7;
      context.fillStyle = color;
      context.fillRect(x,y,8+style%2,6+style%3);
      context.globalAlpha = .17;
      context.fillRect(x-1,y+8,11,1);
      context.globalAlpha = 1;
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function glowTexture(color) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  const grad=ctx.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(255,255,255,.86)');
  grad.addColorStop(.17,color);
  grad.addColorStop(.45,color.replace(/,[^,]+\)$/  ,',.13)'));
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,64,64);
  return new T.CanvasTexture(canvas);
}

function city(scene) {
  seed=2431;
  const parkingLots=new Set(parkingParcels.map(([i,j])=>i+','+j));
  const garageLots=new Set(garageParcels.map(parcel=>parcel.join(',')));
  const places=buildCityPlaces(scene,{count,groundHeight,sidewalk,seedRand:rand,parkingLots});
  const parked=[];
  const parkingMarkings=[],parkingLanes=new Set();
  const lotTrees=[];
  const asphalt=document.createElement('canvas');asphalt.width=asphalt.height=128;
  const pitch=asphalt.getContext('2d');
  const grit=pitch.createImageData(128,128);
  for(let i=0;i<grit.data.length;i+=4){
    const grain=59+Math.floor(rand()*20);
    grit.data.set([grain,grain+5,grain+14,255],i);
  }
  pitch.putImageData(grit,0,0);
  const pavement=new T.CanvasTexture(asphalt);
  pavement.colorSpace=T.SRGBColorSpace;
  pavement.wrapS=pavement.wrapT=T.RepeatWrapping;
  pavement.repeat.set(110,110);
  pavement.anisotropy=4;
  const road = new T.MeshStandardMaterial({color:0x6e83a5,map:pavement,roughness:.91,metalness:.12,emissive:0x060817,emissiveIntensity:.31});
  scene.add(createTerrain(road,950,303));
  buildWalkways(scene,{count,groundHeight,sidewalk});
  buildBoundaries(scene,{count,extent,groundHeight});
  const concrete = new T.MeshStandardMaterial({color:0x20283b,roughness:.92,emissive:0x0c1324,emissiveIntensity:.32});
  const foundation = new T.MeshStandardMaterial({color:0x162237,roughness:.84,emissive:0x14213b,emissiveIntensity:.36});
  const neon=colors.map(color=>new T.MeshBasicMaterial({color,toneMapped:false}));
  const warm=new T.MeshBasicMaterial({color:0xffca8c});
  const white=new T.MeshBasicMaterial({color:0x748ba1});
  const amber=new T.MeshBasicMaterial({color:0xc9a06b});
  const pole=new T.MeshStandardMaterial({color:0x344861,roughness:.65});
  const facadeCache=new Map();
  const facadeBases=Array.from({length:4},(_,i)=>facadeTexture(i));
  function wall(style,w,h){
    const rx=Math.max(1,Math.round(w/14));
    const ry=Math.max(1,Math.round(h/40));
    const id=[style,rx,ry].join('-');
    if(!facadeCache.has(id)){
      const tex=facadeBases[style].clone();
      tex.wrapS=tex.wrapT=T.RepeatWrapping;
      tex.repeat.set(rx,ry);
      tex.needsUpdate=true;
      facadeCache.set(id,new T.MeshStandardMaterial({color:0x606e87,map:tex,emissive:0xc2d4fa,emissiveMap:tex,emissiveIntensity:1.25,roughness:.87,metalness:.08}));
    }
    return facadeCache.get(id);
  }
  const {tower,finish:finishArchitecture}=createArchitecture(scene,{rand,groundHeight});
  function surfacePatch(x,z,w,d,lift,material,segments=5){
    const geometry=new T.PlaneGeometry(w,d,segments,segments);
    geometry.rotateX(-Math.PI/2);
    const positions=geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++)positions.setY(i,lift+groundHeight(x+positions.getX(i),z+positions.getZ(i)));
    geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,0,z);scene.add(mesh);
    return mesh;
  }
  function placedBox(material,x,y,z,w,h,d) {
    return addBox(scene,material,x,y+groundHeight(x,z),z,w,h,d);
  }
  function terrace(x,z,w,d,build,minTop=-Infinity){
    const samples=[];
    for(const u of [-.5,0,.5])for(const v of [-.5,0,.5]){
      samples.push(groundHeight(x+u*w,z+v*d));
    }
    const top=Math.max(Math.max(...samples)+.26,minTop), base=Math.min(...samples)-.35;
    addBox(scene,foundation,x,(top+base)/2,z,w,top-base,d);
    const group=new T.Group();
    group.position.y=top;
    scene.add(group);
    build(group);
    return top;
  }
  const stairStone=new T.MeshStandardMaterial({color:0x414e61,roughness:.87,emissive:0x162237});
  function stair(x,z,width,run,low,high,steps,axis='x'){
    for(let i=0;i<steps;i++){
      const distance=(i+.5)*run/steps;
      const top=T.MathUtils.lerp(high,low,i/steps);
      const bottom=Math.min(low,top)-.24;
      addBox(scene,stairStone,x+(axis==='x'?distance:0),(top+bottom)/2,
        z+(axis==='z'?distance:0),axis==='x'?run/steps:width,
        top-bottom,axis==='z'?run/steps:width);
    }
  }
  function marketApproaches(x,z,top){
    const run=4.5,width=4.4;
    for(const offset of [-13,0,13]){
      const low=groundHeight(x+run,z+offset)+.275;
      const steps=Math.max(2,Math.ceil((top-low)/.16));
      stair(x,z+offset,width,run,low,top,steps);
      for(const side of [-1,1]){
        const railZ=z+offset+side*(width/2-.11);
        for(const along of [.25,run-.25]){
          const y=T.MathUtils.lerp(top,low,along/run);
          addBox(scene,pole,x+along,y+.46,railZ,.063,.95,.065);
        }
        const rail=addBox(scene,pole,x+run/2,(top+low)/2+.91,railZ,Math.hypot(run-.38,top-low),.055,.06);
        rail.rotation.z=-Math.atan2(top-low,run);
      }
    }
  }
  const parkingCanvas=document.createElement('canvas');
  parkingCanvas.width=240;
  parkingCanvas.height=92;
  const parkingLabel=parkingCanvas.getContext('2d');
  parkingLabel.fillStyle='#183356';parkingLabel.fillRect(0,0,240,92);
  parkingLabel.strokeStyle='#abdefb';parkingLabel.lineWidth=5;parkingLabel.strokeRect(5,5,230,82);
  parkingLabel.fillStyle='#e0f5ff';parkingLabel.font='bold 32px sans-serif';
  parkingLabel.textAlign='center';parkingLabel.fillText('PARKING',120,57);
  const parkingTexture=new T.CanvasTexture(parkingCanvas);
  parkingTexture.colorSpace=T.SRGBColorSpace;
  const parkingSign=new T.MeshBasicMaterial({map:parkingTexture,toneMapped:false});
  function parkingLot(x,z,i,j){
    const lotMaterial=new T.MeshStandardMaterial({color:0x202938,roughness:.96,emissive:0x08111b});
    surfacePatch(x,z,56,56,.031,lotMaterial,12);
    for(const end of [-1,1]){
      const signX=x+end*7.6,signZ=z+end*25.7;
      placedBox(pole,signX,1.28,signZ,.11,2.56,.11);
      const sign=new T.Mesh(new T.PlaneGeometry(2.55,.98),parkingSign);
      sign.position.set(signX,groundHeight(signX,signZ)+2.27,signZ+end*.07);
      sign.rotation.y=end<0?Math.PI:0;
      scene.add(sign);
    }
    for(const side of [-1,1]){
      const rowX=x+side*13.7;
      for(let n=-6;n<=6;n++){
        parkingMarkings.push([rowX,.057,z+n*3.5+1.75,7.6,.02,.10]);
        if((n+side+i+j+9)%3===0)continue;
        parked.push({x:rowX,z:z+n*3.5,axis:'x',dir:-side});
      }
      parkingMarkings.push([rowX,.057,z-22.75,7.6,.02,.10]);
      parkingMarkings.push([rowX+side*3.8,.056,z,.10,.02,45.5]);
      for(let at=-25;at<25;at+=5)placedBox(foundation,x+side*26.5,.30,z+at+2.5,.42,.57,4.93);
      for(const offset of [-20,-7,7,20])lotTrees.push([x+side*22.5,z+offset]);
      for(const end of [-1,1]){
        const curb=z+end*26.6;
        parkingMarkings.push([x+side*18.6,.095,curb,18.3,.10,.24]);
        parkingMarkings.push([x+side*5.5,.055,z+end*28,.12,.02,4.5]);
      }
    }
  }
  const bridgeLots=skybridges(scene,{block,street,groundHeight});

  for (let i=-count;i<count;i++) for (let j=-count;j<count;j++) {
    const x=(i+.5)*block,z=(j+.5)*block;
    if(i===2&&j===-2)continue;
    if(garageLots.has(i+','+j))continue;
    if(parkingLots.has(i+','+j)){
      parkingLot(x,z,i,j);
      continue;
    }
    surfacePatch(x,z,47.5,47.5,.19,concrete);
    if(i===0&&j===2){
      const top=terrace(x-11,z+1,29,29,group=>observatoryPlaza(group,x-11,z+1));
      stair(x-11,z+13,7.8,8,groundHeight(x-11,z+21)+.19,top+1.1,10,'z');
      continue;
    }
    if(i===0&&j===1){
      const top=terrace(x+7,z+7,28,22,group=>addBox(group,foundation,x+7,.77,z+7,28,1.54,22));
      const low=groundHeight(x+7,z+27)+.19;
      stair(x+7,z+18,14,9,low,top+1.54,Math.ceil((top+1.54-low)/.17),'z');
      surfacePatch(x-3,z,23,27,.27,concrete);
      for(const offset of [-6,0,6])placedBox(neon[0],x-7,.31,z+offset,3.1,.10,.18);
      continue;
    }
    if(i===-1&&j===0){
      const landing=Math.max(...[-13,0,13].map(offset=>groundHeight(x+23.5,z+offset)))+.63;
      const top=terrace(x-2,z,42,47,group=>{
        group.position.x=x-2;
        group.scale.x=.76;
        marketBlock(group,0,z);
      },landing);
      marketApproaches(x+19,z,top);
      continue;
    }
    if(bridgeLots.has(i+','+j)||places.isLandmark(i,j))continue;
    const row=Math.abs(i+.5)+Math.abs(j+.5);
    const feature=[[-1,1],[1,2],[1,1],[-2,2],[0,-1]].findIndex(([a,b])=>a===i&&b===j);
    const h=feature>=0?99+rand()*48:22+rand()*55+Math.max(0,4-row)*6;
    const w=18+rand()*12,d=19+rand()*12;
    const style=Math.floor(rand()*4),color=(i-j+10)%colors.length;
    tower(x-8,z+7,w,d,h,style,color,feature);
    tower(x+12,z-13,13+rand()*9,13+rand()*8,17+rand()*35,(style+1)%4,(color+1)%colors.length);
  }

  finishArchitecture();
  places.finish();
  for(const axis of ['x','z'])for(const row of [-2,-1,1,2])for(const direction of [-1,1]){
    if(axis==='z'&&row===2)continue;
    const lane=row*block-direction*(axis==='z'?7.9:-7.9);
    const center=(direction*.5+(row>0?1:-1))*block;
    const side=axis==='z'?-direction:direction;
    parkingLanes.add([axis,row,Math.floor(center/block),side].join(','));
    for(const end of [-1,1]){
      const at=center+end*24;
      parkingMarkings.push(axis==='z'?[lane,.038,at,2.75,.025,.12]:[at,.038,lane,.12,.025,2.75]);
    }
    parkingMarkings.push(axis==='z'?[row*block+side*6.52,.035,center,.10,.025,48]
      :[center,.035,row*block+side*6.52,48,.025,.10]);
    for(let i=-3;i<=3;i++){
      const at=center+i*6.7;
      const [x,z]=axis==='z'?[lane,at]:[at,lane];
      parkingMarkings.push(axis==='z'?[x,.037,z+3.25,2.75,.025,.12]:[x+3.25,.037,z,.12,.025,2.75]);
      if(i%3!==0)parked.push({x,z,axis,dir:direction});
    }
  }
  const dashTransforms=[], laneTransforms=[], crossTransforms=[], curbTransforms=[];
  for(let line=-count;line<=count;line++){
    const at=line*block;
    for(let i=-count;i<count;i++){
      const middle=(i+.5)*block,len=block-street;
      for(const sign of [-1,1]){
        curbTransforms.push([at+sign*9.77,.013,middle,.17,.025,len],[middle,.013,at+sign*9.77,len,.025,.17]);
        laneTransforms.push([at+sign*.25,.018,middle,.094,.022,len],[middle,.018,at+sign*.25,len,.022,.094]);
      }
      for (let offset=-23;offset<=23;offset+=8){
        for(const side of [-1,1]){
          if(!parkingLanes.has(['z',line,i,side].join(',')))dashTransforms.push([at+side*5.1,.021,middle+offset,.10,.021,3.7]);
          if(!parkingLanes.has(['x',line,i,side].join(',')))dashTransforms.push([middle+offset,.021,at+side*5.1,3.7,.021,.10]);
        }
      }
      for(const direction of [-1,1]){
        crossTransforms.push([at-direction*4.5,.024,i*block-direction*13.12,8.0,.026,.22]);
        crossTransforms.push([i*block-direction*13.12,.024,at+direction*4.5,.22,.026,8.0]);
      }
      for(const across of [-1,1]) for(let d=-7.6;d<8;d+=1.6){
        crossTransforms.push([at+d,.022,i*block+across*11.3,.68,.022,2.05]);
        crossTransforms.push([i*block+across*11.3,.022,at+d,2.05,.022,.68]);
      }
    }
  }
  const batch=(mat,transforms,followSlope=false)=>{
    const segments=followSlope?transforms.flatMap(([x,y,z,w,h,d])=>{
      const pieces=Math.ceil(Math.max(w,d)/6);
      return Array.from({length:pieces},(_,i)=>{
        const u=(i+.5)/pieces-.5;
        return w>d?[x+u*w,y,z,w/pieces,h,d]:[x,y,z+u*d,w,h,d/pieces];
      });
    }):transforms;
    const list=new T.InstancedMesh(unitBox,mat,segments.length);
    const matrix=new T.Matrix4(),rotation=new T.Quaternion(),up=new T.Vector3(0,1,0),normal=new T.Vector3(),point=new T.Vector3(),dimensions=new T.Vector3();
    segments.forEach(([x,y,z,w,h,d],i)=>{
      rotation.identity();
      if(followSlope){
        normal.set(groundHeight(x-.2,z)-groundHeight(x+.2,z),.4,groundHeight(x,z-.2)-groundHeight(x,z+.2)).normalize();
        rotation.setFromUnitVectors(up,normal);
      }
      matrix.compose(point.set(x,y+groundHeight(x,z),z),rotation,dimensions.set(w,h,d));
      list.setMatrixAt(i,matrix);
    });
    scene.add(list);
  };
  batch(white,parkingMarkings,true);
  batch(white,dashTransforms,true);batch(amber,laneTransforms,true);
  batch(white,crossTransforms,true);batch(white,curbTransforms,true);

  const lampMap=glowTexture('rgba(255,192,116,.38)');
  const lampGlow=new T.SpriteMaterial({map:lampMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const lampPoles=[],lampArms=[],lampHeads=[];
  for(let i=-count;i<=count;i++) for(let j=-count;j<count;j++) for(const side of [-1,1]){
    const x=i*block+side*10.6,z=(j+.5)*block+side*21;
    lampPoles.push([x,3,z,.16,5.7,.16]);
    lampArms.push([x-side*.7,5.83,z,1.55,.14,.14]);
    lampHeads.push([x-side*1.36,5.76,z,.58,.13,.30]);
    const glow=new T.Sprite(lampGlow);
    glow.position.set(x-side*1.36,5.70+groundHeight(x,z),z);
    glow.scale.set(3.1,3.1,1);
    scene.add(glow);
    // A soft pool of light baked onto the road keeps the grid lit even without hundreds of live lights.
    surfacePatch(x-side*2.8,z,13,15,.037,new T.MeshBasicMaterial({map:lampMap,color:0xffbd77,transparent:true,opacity:.31,depthWrite:false,blending:T.AdditiveBlending}),3);
  }
  batch(pole,lampPoles);batch(pole,lampArms);batch(warm,lampHeads);
  for(let i=0;i<84;i++){
    const angle=i/84*Math.PI*2,radius=extent+25+rand()*155;
    const height=25+rand()*100,w=11+rand()*15;
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    if(x<-extent-9||x+w/2>extent-8)continue;
    if(!clearRoadFootprint((px,pz)=>Math.abs(px)<=extent+11&&Math.abs(pz)<=extent+11,
      x,z,w,w*.75))continue;
    const material=wall(i%4,w,height);
    placedBox(material,x,height/2,z,w,height,w*.75);
    if(i%3===0)placedBox(neon[i%colors.length],x,height+.5,z,w*.88,.48,w*.64);
  }
  const bark=new T.MeshStandardMaterial({color:0x443334,roughness:1});
  const foliage=new T.MeshStandardMaterial({color:0x1d4239,roughness:.96,emissive:0x0d2824,emissiveIntensity:.42});
  const pine=new T.ConeGeometry(1,1,9),canopyGeometry=new T.IcosahedronGeometry(1,1);
  const pines=[],canopies=[],leafTips=[],trunks=[],treeSites=[];
  const deciduous=new T.MeshStandardMaterial({color:0x345544,roughness:.92,emissive:0x132c21,emissiveIntensity:.49});
  const leafLight=new T.MeshStandardMaterial({color:0x446453,roughness:.91,emissive:0x162f23,emissiveIntensity:.52});
  function tree(x,z,isPine){
    const height=3.3+rand()*2.25;
    trunks.push([x,height*.29,z,.24,height*.58,.24]);
    treeSites.push({x,z});
    if(isPine){
      for(let tier=0;tier<3;tier++){
        const w=(1.44-tier*.27)*(height/5);
        pines.push([x,height*(.52+tier*.15),z,w,height*.55,w]);
      }
    }else{
      for(const [dx,dz,level,size] of [[0,0,.8,.85],[-.18,.10,.71,.62],[.17,-.08,.74,.67],[.03,.17,.76,.55],
        [-.13,-.14,.91,.48],[.13,.10,.94,.45]]){
        const target=level>.86?leafTips:canopies;
        target.push([x+dx*height,height*level,z+dz*height,height*.31*size,height*.28*size,height*.29*size]);
      }
    }
  }
  lotTrees.forEach(([x,z],i)=>tree(x,z,i%4===0));
  for(let i=-3;i<=3;i++)for(let j=-4;j<4;j++){
    for(const side of [-1,1]){
      const x=i*block+side*14.3,z=(j+.5)*block+side*12;
      const open=(x<-10&&x>-67&&z>10&&z<66)||parkingLots.has(Math.floor(x/block)+','+j);
      if(i!==2&&!open&&(i+j+side)%3!==0) tree(x,z,(i-j)%4===0);
      const crossX=(j+.5)*block-side*9,crossZ=i*block+side*13.5;
      if(i%2!==0&&Math.abs(crossX-152)>15 &&
        !parkingLots.has(j+','+Math.floor(crossZ/block)))tree(crossX,crossZ,(i+j)%4===0);
    }
  }
  batch(bark,trunks);
  for(const [geometry,material,trees] of [[pine,foliage,pines],[canopyGeometry,deciduous,canopies],[canopyGeometry,leafLight,leafTips]]){
    const crowns=new T.InstancedMesh(geometry,material,trees.length),matrix=new T.Matrix4();
    trees.forEach(([x,y,z,w,h,d],i)=>{matrix.makeScale(w,h,d);matrix.setPosition(x,y+groundHeight(x,z),z);crowns.setMatrixAt(i,matrix);});
    scene.add(crowns);
  }

  // The dark bay and deck establish a waterfront edge beyond the west-side streets.
  const bay=new T.Mesh(new T.PlaneGeometry(192,730),new T.MeshStandardMaterial({
    color:0x162f4a,roughness:.27,metalness:.64,emissive:0x08192c,emissiveIntensity:.48
  }));
  bay.rotation.x=-Math.PI/2;bay.position.set(-extent-102,groundHeight(-extent-80,0)+.08,0);scene.add(bay);
  surfacePatch(-extent-4,0,5.8,extent*2,.25,concrete,40);
  const deckRail=new T.MeshStandardMaterial({color:0x60728d,metalness:.34,roughness:.66});
  for(let z=-extent;z<=extent;z+=12){
    placedBox(deckRail,-extent-6.7,1.12,z,.10,.10,12);
    placedBox(deckRail,-extent-6.7,.74,z,.105,1.08,.10);
  }
  return {parkingLots,parked,treeSites};
}

function sky(scene) {
  const starPositions=[];
  for(let i=0;i<360;i++){
    const theta=rand()*Math.PI*2, height=40+rand()*575, distance=1650;
    starPositions.push(Math.sin(theta)*distance,height,Math.cos(theta)*distance);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));
  scene.add(new T.Points(g,new T.PointsMaterial({color:0xa8b8e8,size:.94,transparent:true,opacity:.58,fog:false})));
  const moon = new T.Mesh(new T.SphereGeometry(13,24,16),new T.MeshBasicMaterial({color:0xc5dbff,fog:false}));
  moon.position.set(-458,355,940);
  scene.add(moon);
  const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture('rgba(89,137,238,.24)'),transparent:true,blending:T.AdditiveBlending,fog:false,depthWrite:false}));
  halo.position.copy(moon.position);
  halo.scale.set(122,122,1);
  scene.add(halo);
}

const modelURL=import.meta.env.BASE_URL+'integra.glb';
const driveKeys=new Set(['ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space']);
const spawn={x:-7.05,z:25,heading:0};

export function startNightDrive(host,{status,telemetry,cameraChanged,pauseChanged,photoChanged}) {
  const scene=new T.Scene();
  scene.background=new T.Color(0x060a1b);
  scene.fog=new T.FogExp2(0x16182f,.00135);
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  renderer.domElement.setAttribute('aria-label','Night city driving game');
  host.appendChild(renderer.domElement);
  const camera=new T.PerspectiveCamera(62,1,.12,2850);
  const {parkingLots,parked,treeSites}=city(scene);
  const freeway=createFreeway(scene,{block,extent});
  const shoreLink=createShoreLink(scene,{groundHeight,freeway,isGroundRoad(x,z,margin){
    if(x>extent-2)return outsideCityRoad(x,z,margin);
    return Math.min(Math.abs(x-Math.round(x/block)*block),Math.abs(z-Math.round(z/block)*block))<street/2+margin;
  }});
  const garages=createGarages(scene,{block,groundHeight});
  const updateRegion=buildRegion(scene);
  const pilot=createPilot(scene);
  const moveAircraft=createAirTraffic(scene);
  const pedestrianSurface={lift(x,z){
    const lift=sidewalk.lift(x,z),ground=groundHeight(x,z);
    const driveway=garages.surfaceAt(x,z,ground);
    return driveway===null?lift:Math.max(lift,driveway-ground);
  }};
  const activity=streetLife(scene,{block,extent,groundHeight,freeway,
    parked:[...parked,...garages.parked],sidewalk:pedestrianSurface});
  shoreLink.spawnTraffic(activity.createTrafficVehicle);
  const moveTrain=monorail(scene,extent,groundHeight);
  sky(scene);
  scene.add(new T.HemisphereLight(0x91b8ff,0x664a93,.66));
  const moonlight=new T.DirectionalLight(0x97b4ff,.75);
  moonlight.position.set(-60,55,90);
  scene.add(moonlight);
  const generator=new T.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const reflection=generator.fromScene(room,.075);
  scene.environment=reflection.texture;
  scene.environmentIntensity=.34;
  room.dispose();
  generator.dispose();

  const car=new T.Group();
  scene.add(car);
  const shadow=new T.Mesh(new T.PlaneGeometry(3.55,6.2),new T.MeshBasicMaterial({
    map:glowTexture('rgba(0,0,0,.22)'),color:0x000000,transparent:true,opacity:.76,depthWrite:false
  }));
  shadow.rotation.x=-Math.PI/2;
  shadow.position.y=.032;
  car.add(shadow);

  const drivingLights=new T.Group();
  car.add(drivingLights);
  const red=new T.MeshBasicMaterial({color:0xff104d});
  const redGlow=new T.SpriteMaterial({map:glowTexture('rgba(255,32,76,.48)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const headGlow=new T.SpriteMaterial({map:glowTexture('rgba(184,223,255,.65)'),transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const brakePool=new T.Mesh(new T.PlaneGeometry(5,4),new T.MeshBasicMaterial({map:redGlow.map,color:0xff0d35,transparent:true,opacity:.27,depthWrite:false,blending:T.AdditiveBlending}));
  brakePool.position.set(0,.039,-3);
  brakePool.rotation.x=-Math.PI/2;
  drivingLights.add(brakePool);

  for (const side of [-1,1]) {
    const glow=new T.Sprite(headGlow);
    glow.position.set(side*.66,.74,2.16);
    glow.scale.set(.78,.78,1);
    drivingLights.add(glow);
    const tail=new T.Sprite(redGlow);
    tail.position.set(side*.68,.81,-2.27);
    tail.scale.set(1.02,.64,1);
    drivingLights.add(tail);
    const strip=addBox(drivingLights,red,side*.656,.80,-2.25,.29,.03,.025);
    strip.rotation.y=side*.27;
    const beam=new T.SpotLight(0xcfe8ff,238,48,.29,.76,1.58);
    beam.position.set(side*.62,.8,2.16);
    beam.target.position.set(side*1.85,.06,24);
    drivingLights.add(beam,beam.target);

  }
  const reverseGlow=new T.PointLight(0x95c8ff,3.5,6,1.85);
  reverseGlow.position.set(0,.66,-2.23);
  reverseGlow.visible=false;
  drivingLights.add(reverseGlow);

  let closed=false,frame,meshReady=false,speed=0,heading=0,mode=0,lights=true,lastFrame=performance.now(),lastUi=0;
  let carModel,onFreeway=false,linkRoute=null,paused=false;
  const keys=new Set(), touch=new Set();
  const wheels=[],checkpoints=[];
  let wedged=0,recoveredAt=-Infinity;
  const position=new T.Vector3();
  const camTarget=new T.Vector3(),desired=new T.Vector3(),forward=new T.Vector3();
  const viewDirection=new T.Vector3();
  let viewYaw=0,viewPitch=0,freeView=false,drag;
  const surface=renderer.domElement;
  const photoTarget=new T.Vector3(),photoOrbit=new T.Spherical(),photoOffset=new T.Vector3();
  const savedPosition=new T.Vector3(),savedRotation=new T.Quaternion();
  let photoMode=false,photoDirty=false;
  surface.setAttribute('aria-label','Night city driving game. Drag to look around in 360 degrees.');
  function rotateView(yaw,pitch){
    viewYaw=T.MathUtils.euclideanModulo(viewYaw+yaw+Math.PI,Math.PI*2)-Math.PI;
    viewPitch=clamp(viewPitch+pitch,-.19,.92);
    freeView=true;
  }
  function beginDrag(event){
    if((paused&&!photoMode)||drag||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-looking');
  }
  function moveDrag(event){
    if(drag?.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(dx||dy){
      if(photoMode){
        photoOrbit.theta+=dx*.0075;
        photoOrbit.phi=clamp(photoOrbit.phi-dy*.006,.12,1.61);
        photoDirty=true;
      }else rotateView(-dx*.0075,dy*.006);
    }
    drag.x=event.clientX;drag.y=event.clientY;
  }
  function endDrag(event){
    if(drag?.id!==event.pointerId)return;
    drag=undefined;
    surface.classList.remove('is-looking');
  }
  function zoomPhoto(amount){
    photoOrbit.radius=clamp(photoOrbit.radius*Math.exp(amount),2.8,90);
    photoDirty=true;
  }
  function wheelPhoto(event){
    if(!photoMode)return;
    event.preventDefault();
    zoomPhoto(clamp(event.deltaY*.002,-.25,.25));
  }
  surface.addEventListener('wheel',wheelPhoto,{passive:false});
  const pointerEvents={
    pointerdown:beginDrag,pointermove:moveDrag,pointerup:endDrag,
    pointercancel:endDrag,lostpointercapture:endDrag
  };
  for(const [event, handler] of Object.entries(pointerEvents))surface.addEventListener(event,handler);

  function clearView(){viewYaw=0;viewPitch=0;freeView=false;}
  const cameraNames=['Chase','Hood','Orbit'];
  function respawn(point,preserveRoute=false){
    pilot.exit();
    car.visible=true;
    clearView();
    keys.clear();
    touch.clear();
    onFreeway=point.onFreeway??false;
    linkRoute=point.linkRoute??null;
    position.set(point.x,point.y??(point.x>extent?regionalRoadHeight(point.x,point.z):groundHeight(point.x,point.z)),point.z);
    wedged=0;
    if(!preserveRoute)checkpoints.length=0;
    heading=point.heading;
    speed=0;
    const sin=Math.sin(heading),cos=Math.cos(heading);
    camera.position.set(position.x+1.9*cos-9.45*sin,position.y+4.22,position.z-1.9*sin-9.45*cos);
  }
  function reset(){respawn(spawn);}
  function beginAirport(){respawn(airport.arrival);}
  function beginShore(){respawn(shorelineStart);}
  function beginSuburbs(){respawn({x:470,z:2.75,heading:Math.PI/2});}
  function beginLink(){
    const x=[416,405,427,438].find(at=>![-4,0,4].some(offset=>
      shoreLink.trafficBlocks(at+offset,expressZ(at)+2.26,shoreLink.mainHeight(at))))??416;
    respawn({x,z:expressZ(x)+2.26,heading:Math.PI/2,y:shoreLink.mainHeight(x),linkRoute:'main'});
  }
  function beginFlight(type){
    pilot.enter(type);
    car.visible=false;
    clearView();
    keys.clear();touch.clear();
    const {position:aircraft,heading:direction}=pilot.craft;
    camera.position.set(aircraft.x-13*Math.sin(direction),aircraft.y+5.5,aircraft.z-13*Math.cos(direction));
    speed=0;
  }
  function beginFreeway(){
    mode=0;
    cameraChanged(cameraNames[mode]);
    respawn({x:freeway.axisX-2.2,z:freeway.startZ-12,heading:0});
  }
  function beginGarage(){
    const [i,j]=garageParcels[0];
    respawn({x:(i+.5)*block,z:(j+.5)*block-30.4,heading:0});
  }
  reset();
  new GLTFLoader().load(modelURL,({scene:model})=>{
    if(closed){ disposeObject(model); return; }
    carModel=model;
    car.add(carModel);
    const wheelGroups=[];
    model.traverse(object=>{
      if(object.isMesh){
        for(const mat of [].concat(object.material)){
          if(!mat.emissive)continue;
          if(/Jewel Eye reference optics/i.test(mat.name)) {
            mat.emissive.setHex(0xa9d9ff);mat.emissiveIntensity=.22;
          }
          if(/Chicane reference lens/i.test(mat.name)){
            mat.emissive.setHex(0xc70928);mat.emissiveIntensity=.42;
          }
        }
      }
      // GLTFLoader sanitizes the Three.js object name, but preserves the exported name here.
      const name=object.userData.name || object.name;
      if(/^(Front|Rear)[ _](left|right)[ _]wheel$/.test(name) && object.children.length){
        wheelGroups.push({object,front:name.startsWith('Front')});
      }
    });
    car.updateWorldMatrix(true,true);
    for(const {object,front} of wheelGroups){
      const center=new T.Box3().setFromObject(object).getCenter(new T.Vector3());
      const pivot=new T.Group();
      pivot.position.copy(car.worldToLocal(center));
      car.add(pivot);
      pivot.attach(object);
      wheels.push({pivot,front,roll:0});
    }
    meshReady=true;
    status('ready');
  },undefined,()=>{ if(!closed)status('error'); });

  function toggleLight() {
    lights=!lights;
    drivingLights.visible=lights;
  }
  function selectCamera(){
    clearView();
    mode=(mode+1)%cameraNames.length;
    cameraChanged(cameraNames[mode]);
  }
  function clearDrag(){
    if(!drag)return;
    if(surface.hasPointerCapture(drag.id))surface.releasePointerCapture(drag.id);
    drag=undefined;
    surface.classList.remove('is-looking');
  }
  function togglePhoto(){
    if(!paused)return;
    clearDrag();
    photoMode=!photoMode;
    if(photoMode){
      savedPosition.copy(camera.position);
      savedRotation.copy(camera.quaternion);
      const aircraft=pilot.craft.type;
      photoTarget.copy(aircraft?pilot.craft.position:position);
      photoTarget.y+=aircraft?1.25:.78;
      photoOrbit.setFromVector3(photoOffset.copy(camera.position).sub(photoTarget));
      photoOrbit.radius=clamp(photoOrbit.radius,aircraft?10:5.5,90);
      photoOrbit.phi=clamp(photoOrbit.phi,.12,1.61);
      photoDirty=true;
    }else{
      camera.position.copy(savedPosition);
      camera.quaternion.copy(savedRotation);
      renderer.render(scene,camera);
    }
    photoChanged?.(photoMode);
  }
  function togglePause(){
    if(photoMode)togglePhoto();
    paused=!paused;
    keys.clear();
    touch.clear();
    clearDrag();
    lastFrame=performance.now();
    pauseChanged?.(paused);
  }
  function keydown(event){
    if(photoMode){
      if(event.code==='Escape'||event.code==='KeyO'||event.code==='KeyP'){
        event.preventDefault();
        if(!event.repeat)togglePhoto();
      }else if(event.code==='Equal'||event.code==='Minus'||event.code==='NumpadAdd'||event.code==='NumpadSubtract'){
        event.preventDefault();
        zoomPhoto(event.code==='Equal'||event.code==='NumpadAdd'?-.14:.14);
      }
      return;
    }
    if(paused&&event.code==='KeyO'){
      event.preventDefault();
      if(!event.repeat)togglePhoto();
      return;
    }
    if(event.code==='KeyP'){
      event.preventDefault();
      if(!event.repeat)togglePause();
      return;
    }
    if(paused)return;
    if (driveKeys.has(event.code)){
      if (!pilot.craft.type && event.code==='Space' && event.target instanceof HTMLElement && event.target.closest('button,a')) return;
      event.preventDefault();keys.add(event.code);
    } else if(!event.repeat){
      if(event.code==='KeyC') selectCamera();
      if(event.code==='KeyL') toggleLight();
      if(event.code==='KeyR') reset();
      if(event.code==='KeyF') beginFreeway();
      if(event.code==='KeyG') beginGarage();
      if(event.code==='KeyT') beginAirport();
      if(event.code==='KeyB') beginShore();
      if(event.code==='KeyY') beginLink();
      if(event.code==='KeyN') beginSuburbs();
      if(event.code==='Digit1') beginFlight('plane');
      if(event.code==='Digit2') beginFlight('helicopter');
      if(event.code==='KeyU') recover();
      if(event.code==='KeyQ') rotateView(.36,0);
      if(event.code==='KeyE') rotateView(-.36,0);
    }
  }
  function keyup(event){keys.delete(event.code);}
  const clear=()=>{keys.clear();touch.clear();};
  window.addEventListener('keydown',keydown);
  window.addEventListener('keyup',keyup);
  window.addEventListener('blur',clear);
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.fov=camera.aspect<1?70:62;
    camera.updateProjectionMatrix();
    if(photoMode)photoDirty=true;
    else if(paused)renderer.render(scene,camera);
  }
  const resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  function drivingSurface(x,z,previousY){
    const highway=shoreLink.surfaceAt(x,z,linkRoute??(onFreeway?'r5':null));
    if(highway)return {y:highway.y,onFreeway:false,linkRoute:highway.id};
    if(x>extent)return {y:regionalRoadHeight(x,z),onFreeway:false};
    const garageY=garages.surfaceAt(x,z,previousY);
    return garageY===null?freeway.surfaceAt(x,z,onFreeway):{y:garageY,onFreeway:false};
  }
  function blocked(x,z,y=position.y){
    if(x>extent-2)return !outsideCityRoad(x,z,.45);
    const garage=garages.blocks(x,z,y);
    if(garage!==null)return garage;
    if (x<2-extent || Math.abs(z)>extent-2)return true;
    const i=Math.floor(x/block),j=Math.floor(z/block);
    const localX=x-(i+.5)*block,localZ=z-(j+.5)*block;
    if(parkingLots.has(i+','+j)){
      const curb=(Math.abs(Math.abs(localZ)-26.6)<1.25&&Math.abs(localX)>8.35)||
        (Math.abs(Math.abs(localX)-26.5)<1.2&&Math.abs(localZ)<25.9);
      return curb||treeSites.some(tree=>Math.hypot(x-tree.x,z-tree.z)<.95);
    }
    return Math.abs(localX)<(block-street)/2-.12 && Math.abs(localZ)<(block-street)/2-.12;
  }
  function obstruction(x,z,y=position.y,deck=onFreeway,route=linkRoute){
    const current=route??(deck?'r5':null);
    const highway=shoreLink.surfaceAt(x,z,current);
    if(highway&&highway.distance<highway.width-.23){
      return shoreLink.trafficBlocks(x,z,highway.y)||
        (x<extent&&highway.y-groundHeight(x,z)<1.85&&activity.blocks(x,z,highway.y,false));
    }
    if(shoreLink.obstructs(x,z,current))return true;
    if(blocked(x,z,y))return true;
    if(x>extent-2)return false;
    if(freeway.blocks(x,z,deck))return true;
    const floor=garages.surfaceAt(x,z,y);
    const road=floor===null?freeway.surfaceAt(x,z,deck):{y:floor,onFreeway:false};
    return activity.blocks(x,z,road.y,road.onFreeway);
  }
  function recover(){
    if(pilot.craft.type){beginFlight(pilot.craft.type);return;}
    const clearAt=point=>!footprintBlocks(point.x,point.z,point.heading,
      (x,z)=>obstruction(x,z,point.y,point.onFreeway,point.linkRoute));
    for(const minimum of [4.5,.9]){
      for(let i=checkpoints.length-1;i>=0;i--){
        const point=checkpoints[i];
        if(Math.hypot(position.x-point.x,position.z-point.z)<minimum||!clearAt(point))continue;
        checkpoints.length=i+1;
        respawn(point,true);
        recoveredAt=performance.now();
        return;
      }
    }
    const point=position.x>extent?airport.arrival:spawn;
    respawn(point);
    recoveredAt=performance.now();
  }
  const active=(key,...codes)=>touch.has(key)||codes.some(code=>keys.has(code));
  function updateFlight(dt,now){
    const craft=pilot.craft;
    const sign=(positive,negative)=>Number(positive)-Number(negative);
    const move=sign(active('up','KeyW'),active('down','KeyS'));
    pilot.update(dt,{
      power:craft.type==='helicopter'&&!(craft.airborne||active('climb','Space'))?0:move,
      turn:sign(active('right','KeyD','ArrowRight'),active('left','KeyA','ArrowLeft')),
      pitch:sign(active('noseDown','ArrowDown'),active('noseUp','ArrowUp')),
      lift:sign(active('climb','Space'),active('descend','ShiftLeft','ShiftRight')),
      brake:active('brake','Space'),
    });
    const {position:at,heading:direction}=craft;
    const yaw=direction+(freeView?viewYaw:0);
    const radius=mode===2?22:mode===1?7.4:15;
    const elevation=freeView?viewPitch:0;
    desired.set(at.x-Math.sin(yaw)*radius,at.y+4.75+Math.sin(elevation)*radius,at.z-Math.cos(yaw)*radius);
    desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+2.0);
    camTarget.set(at.x+Math.sin(direction)*7,at.y+1.22,at.z+Math.cos(direction)*7);
    camera.position.lerp(desired,1-Math.exp(-dt*5.7));
    camera.lookAt(camTarget);
    renderer.render(scene,camera);
    if(now-lastUi>75){
      telemetry({aircraft:craft.type,throttle:Math.round(craft.throttle*100),airborne:craft.airborne,
        altitude:Math.round(Math.max(0,at.y-groundHeight(at.x,at.z))),speed:Math.round(Math.abs(craft.speed)*3.6),
        heading:direction,x:at.x,z:at.z,lights,onFreeway:false});
      lastUi=now;
    }
  }
  let streetTime=3;
  function tick(now){
    frame=requestAnimationFrame(tick);
    const dt=Math.min(.045,(now-lastFrame)*.001);
    lastFrame=now;
    if(paused){
      if(photoMode&&photoDirty){
        camera.position.copy(photoTarget).add(photoOffset.setFromSpherical(photoOrbit));
        camera.position.y=Math.max(camera.position.y,groundHeight(camera.position.x,camera.position.z)+.32);
        camera.lookAt(photoTarget);
        renderer.render(scene,camera);
        photoDirty=false;
      }
      return;
    }
    streetTime+=dt;
    const flight=pilot.craft;
    activity.update(dt,streetTime,flight.type?flight.position:position,heading,speed,Boolean(flight.type)||onFreeway);
    shoreLink.updateTraffic(dt,flight.type?flight.position:position,linkRoute);
    updateRegion(streetTime,flight.type?flight.position:position);
    moveTrain(streetTime);
    moveAircraft(streetTime);
    if(pilot.craft.type){updateFlight(dt,now);return;}
    const throttle=active('up','KeyW','ArrowUp'), reverse=active('down','KeyS','ArrowDown');
    const brake=active('brake','Space');
    const steer=Number(active('right','KeyD','ArrowRight'))-Number(active('left','KeyA','ArrowLeft'));
    if(meshReady){
      if(throttle)speed+=((speed<0?24:12.5)*dt);
      if(reverse)speed-=((speed>0?21:7.8)*dt);
      if(!throttle&&!reverse)speed*=Math.exp(-dt*.61);
      if(brake)speed*=Math.exp(-dt*5.1);
      const inGarage=garages.surfaceAt(position.x,position.z,position.y)!==null;
      speed=clamp(speed,inGarage?-6.2:-10.5,inGarage?9.0:43);
      if(Math.abs(speed)<.05)speed=0;
      const yaw=-steer*Math.sign(speed)*Math.min(1,Math.abs(speed)/4)*(1.72-.83*Math.min(Math.abs(speed)/43,1))*dt;
      const previousX=position.x,previousZ=position.z;
      const result=travelCar({x:previousX,z:previousZ,heading,yaw,travel:speed*dt,obstructed:obstruction});
      position.x=result.x;
      position.z=result.z;
      heading=result.heading;
      forward.set(Math.sin(heading),0,Math.cos(heading));
      if(result.limited)speed*=result.movement>.02?.68:.24;
      const distance=(position.x-previousX)*forward.x+(position.z-previousZ)*forward.z;
      if((throttle||reverse)&&result.movement<.035&&(result.contacts||result.limited)){
        const canReverse=!footprintBlocks(position.x-forward.x*.27,position.z-forward.z*.27,heading,obstruction);
        const canAdvance=!footprintBlocks(position.x+forward.x*.27,position.z+forward.z*.27,heading,obstruction);
        if(result.contacts||(!canReverse&&!canAdvance)){
          wedged+=dt;
          if(wedged>(result.contacts?1.20:2.40))recover();
        }else wedged=0;
      }else wedged=0;
      for(const wheel of wheels){
        wheel.roll=T.MathUtils.euclideanModulo(wheel.roll+distance/.322,Math.PI*2);
        wheel.pivot.rotation.set(0,wheel.front?-steer*.24:0,0);
        wheel.pivot.rotateX(wheel.roll);
      }
    } else forward.set(Math.sin(heading),0,Math.cos(heading));
    const road=drivingSurface(position.x,position.z,position.y);
    onFreeway=road.onFreeway;
    linkRoute=road.linkRoute??null;
    position.y=road.y;
    car.position.copy(position);
    const lastGood=checkpoints.at(-1);
    if((!lastGood||Math.hypot(position.x-lastGood.x,position.z-lastGood.z)>5.5)&&
      !footprintBlocks(position.x,position.z,heading,obstruction)){
      checkpoints.push({x:position.x,y:position.y,z:position.z,heading,onFreeway,linkRoute});
      if(checkpoints.length>40)checkpoints.shift();
    }
    const ahead=drivingSurface(position.x+forward.x*1.1,position.z+forward.z*1.1,position.y);
    const behind=drivingSurface(position.x-forward.x*1.1,position.z-forward.z*1.1,position.y);
    car.rotation.set(-Math.atan2(ahead.y-behind.y,2.2),heading,0,'YXZ');
    red.color.setHex(brake||reverse&&speed>0?0xff5c71:0xff104d);
    brakePool.material.opacity=brake||reverse&&speed>0?.63:.24;
    reverseGlow.visible=speed<-.1;

    if(freeView){
      const angle=heading+viewYaw;
      viewDirection.set(Math.sin(angle),0,Math.cos(angle));
      if(mode===1){
        desired.copy(position).addScaledVector(forward,.35);
        desired.y=position.y+1.52;
        camTarget.copy(desired).addScaledVector(viewDirection,24*Math.cos(viewPitch));
        camTarget.y+=24*Math.sin(viewPitch);
      }else{
        const pitch=(mode===2?.4:.36)+viewPitch;
        const radius=mode===2?13.4:9.7;
        desired.copy(position).addScaledVector(viewDirection,-radius*Math.cos(pitch));
        desired.y=position.y+.65+radius*Math.sin(pitch);
        camTarget.copy(position);
        camTarget.y=position.y+1.05;
      }
    } else if(mode===0){
      desired.copy(position).addScaledVector(forward,-(9.45+Math.max(0,speed)*.048));
      desired.x+=forward.z*1.9;desired.z-=forward.x*1.9;desired.y=position.y+4.22+Math.max(0,speed)*.026;
      camTarget.copy(position).addScaledVector(forward,7.0);camTarget.y=position.y+2.35;
    } else if(mode===1){
      desired.copy(position).addScaledVector(forward,.35);desired.y=position.y+1.52;
      camTarget.copy(position).addScaledVector(forward,23);camTarget.y=position.y+2.62;
    } else {
      desired.copy(position).addScaledVector(forward,-6.2);
      desired.x+=forward.z*12;desired.z-=forward.x*12;desired.y=position.y+7.6;
      camTarget.copy(position).addScaledVector(forward,5.7);camTarget.y=position.y+3.35;
    }
    const covered=garages.covered(position.x,position.z,position.y);
    if(covered&&mode!==1){
      desired.lerp(position,.40);
      desired.y=position.y+2.32;
      camTarget.y=Math.min(camTarget.y,position.y+1.30);
    }else if(blocked(desired.x,desired.z)&&mode!==1)desired.y+=3.9;
    desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+1.25);
    camera.position.lerp(desired,1-Math.exp(-dt*(mode===1?11:6)));
    camera.lookAt(camTarget);
    renderer.render(scene,camera);
    if(now-lastUi>75){
      telemetry({speed:Math.round(Math.abs(speed)*3.6),reverse:speed<-.1,heading,x:position.x,z:position.z,lights,onFreeway:onFreeway||Boolean(linkRoute),linkRoute,recovered:now-recoveredAt<2600});
      lastUi=now;
    }
  }
  frame=requestAnimationFrame(tick);
  return {
    reset, recover, beginFreeway, beginGarage, beginAirport, beginShore, beginSuburbs, beginLink, beginFlight, selectCamera, toggleLight, togglePause, togglePhoto,
    zoomPhoto(amount){if(photoMode)zoomPhoto(amount);},
    input(action,on){ if(on&&!paused)touch.add(action);else touch.delete(action); },
    dispose(){
      closed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();
      for(const [event,handler] of Object.entries(pointerEvents))surface.removeEventListener(event,handler);
      surface.removeEventListener('wheel',wheelPhoto);
      window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);
      disposeObject(scene);reflection.dispose();renderer.dispose();renderer.domElement.remove();
    },
  };
}

function disposeObject(scene) {
  const geos=new Set(),mats=new Set(),textures=new Set();
  scene.traverse(object=>{
    if(object.geometry)geos.add(object.geometry);
    if(object.material)for(const mat of [].concat(object.material))mats.add(mat);
  });
  for(const m of mats){
    for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
    m.dispose();
  }
  for(const g of geos)g.dispose();
  for(const t of textures)t.dispose();
}
