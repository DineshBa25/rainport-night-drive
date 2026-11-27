import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cycleTracks} from './streetscape.js';

const standard=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.72,...extra});
const light=color=>new T.MeshBasicMaterial({color,toneMapped:false});
const cuboid=new T.BoxGeometry(1,1,1);
function box(parent,mat,x,y,z,w,h,d){
  const mesh=new T.Mesh(cuboid,mat);
  mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);
  return mesh;
}
function round(parent,mat,x,y,z,top,bottom,height,sides=32){
  const mesh=new T.Mesh(new T.CylinderGeometry(top,bottom,height,sides),mat);
  mesh.position.set(x,y,z);parent.add(mesh);
  return mesh;
}
function strut(parent,mat,a,b,width){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
  const mesh=box(parent,mat,0,0,0,width,direction.length(),width);
  mesh.position.copy(start).lerp(end,.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
}

function sign(parent,rows,x,y,z,angle,width,height){
  const textureCanvas=document.createElement('canvas');
  textureCanvas.width=768;textureCanvas.height=256;
  const ctx=textureCanvas.getContext('2d');
  ctx.fillStyle='#120e16';ctx.fillRect(0,0,768,256);
  ctx.strokeStyle='#be4d63';ctx.lineWidth=5;ctx.strokeRect(14,14,740,228);
  ctx.textAlign='center';ctx.textBaseline='middle';
  rows.forEach(({text,color,size},i)=>{
    ctx.font='bold '+size+'px sans-serif';ctx.fillStyle=color;
    ctx.shadowColor=color;ctx.shadowBlur=15;
    ctx.fillText(text,384,(i+.63)*256/rows.length,714);
  });
  const map=new T.CanvasTexture(textureCanvas);map.colorSpace=T.SRGBColorSpace;
  const surface=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,toneMapped:false,side:T.DoubleSide}));
  surface.position.set(x,y,z);surface.rotation.y=angle;parent.add(surface);
}

export function observatoryPlaza(parent,x,z) {
  const stone=standard(0x9395a1,{emissive:0x23354e,emissiveIntensity:.64,roughness:.51});
  const glass=standard(0x253c56,{emissive:0x466891,emissiveIntensity:.7,roughness:.27,metalness:.3});
  const teal=light(0x91f4e5),amber=light(0xffd08a),beacon=light(0xff6c62);
  round(parent,stone,x,.55,z,13,14,1.1,48);
  box(parent,glass,x,2.95,z,17,3.7,13.3);
  box(parent,stone,x,4.9,z,19.8,.46,15.2);
  for(const side of [-1,1]){
    const path=[[x+side*7,3,z],[x+side*5.4,31,z],[x+side*7.7,61,z],[x+side*3.1,87,z]];
    for(let i=0;i<path.length-1;i++){
      const start=path[i],end=path[i+1];
      strut(parent,stone,start,end,4.25-i*.57);
      strut(parent,side===1?teal:amber,start.map((v,n)=>n===2?v+2.18-i*.31:v),
        end.map((v,n)=>n===2?v+2.18-i*.31:v),.17);
    }
    box(parent,beacon,x+side*3.11,87.35,z,.30,.38,.30);
  }
  for(const [y,span] of [[32,12.2],[61,17.3]]){
    box(parent,glass,x,y,z,span,3.5,6);
    box(parent,stone,x,y-1.85,z,span+.42,.38,6.1);
    box(parent,teal,x,y-1.8,z+3.075,span,.09,.075);
    box(parent,amber,x,y+1.52,z-3.075,span,.095,.075);
    for(let i=-3;i<=3;i++)box(parent,stone,x+i*span/8,y,z+3.02,.10,3.37,.13);
  }
  sign(parent,[{text:'RAINPORT SKY FORUM',color:'#b6e9ff',size:80}],x,3.18,z+6.69,0,10.8,1.85);
}

export function marketBlock(parent,x,z) {
  const brick=standard(0x553141,{emissive:0x391c24,emissiveIntensity:.55});
  const trim=standard(0x211b2b,{emissive:0x402537,emissiveIntensity:.38});
  const glass=standard(0x9e744f,{emissive:0xffad63,emissiveIntensity:.67,roughness:.33});
  const doors=standard(0x402a37,{emissive:0x241218,emissiveIntensity:.8});
  const red=light(0xf66875);
  box(parent,brick,x-2,3.12,z,49,6.24,43);
  box(parent,trim,x-2,6.55,z,50,.42,44);
  const facade=x+23;
  const awning=standard(0x5d3547,{emissive:0x361422,emissiveIntensity:.5});
  box(parent,trim,facade+.5,3.4,z,2.55,.48,36);
  for(let i=-3;i<=3;i++){
    const storefront=z+i*5.3;
    box(parent,trim,facade+.04,1.55,storefront,.16,2.95,3.62);
    box(parent,glass,facade+.14,1.78,storefront,.08,2.36,3.22);
    for(const offset of [-1.08,0,1.08])box(parent,trim,facade+.21,1.78,storefront+offset,.08,2.36,.08);
    box(parent,trim,facade+.21,2.55,storefront,.08,.075,3.22);
    if(i%2===0){
      box(parent,doors,facade+.23,1.08,storefront,.09,2.16,1.04);
      box(parent,glass,facade+.29,1.37,storefront,.06,1.12,.72);
      box(parent,red,facade+.33,1.05,storefront+.37,.06,.07,.14);
    }
    box(parent,trim,facade+.93,1.67,z+i*5.3+2.1,.18,3,.19);
    box(parent,red,facade+.55,3.14,z+i*5.3,.025,.095,4.55);
    const fabric=box(parent,awning,facade+1.95,3.03,z+i*5.3,2.0,.16,4.9);
    fabric.rotation.z=-.16;
    box(parent,red,facade+2.91,2.86,z+i*5.3,.09,.17,4.9);
    for(let meridian=-2;meridian<=2;meridian++){
      box(parent,trim,facade+2.91,2.87,z+i*5.3+meridian*.85,.10,.18,.17);
    }
    box(parent,trim,facade+2.19,.44,z+i*5.3+1.65,.7,.41,.57);
  }
  const words=[{text:'HARBOR MARKET',color:'#ff657c',size:83},{text:'RAINPORT',color:'#ff6784',size:76}];
  sign(parent,words,facade+.34,7.24,z,Math.PI/2,12,4.1);
  sign(parent,words,x+8,7.24,z-21.8,Math.PI,12,4.1);
  box(parent,trim,facade,5.4,z,.82,4.6,.3);
}

export function skybridges(scene,{block,street,groundHeight}) {
  const framing=standard(0x35465e,{metalness:.36,emissive:0x142942,emissiveIntensity:.62});
  const pane=standard(0x233c55,{metalness:.32,roughness:.21,emissive:0x337191,emissiveIntensity:.42});
  const walkLight=light(0x8ce4ef);
  const occupied=new Set();
  // Each crossing has two occupied parcels, with the concourse built into each façade.
  for(const [column,row,height] of [[1,0,29],[-2,1,35],[0,-2,27],[2,2,42]]){
    const x=(column+.5)*block,z=row*block;
    const span=street+8;
    const floor=Math.max(...[-span/2,0,span/2].map(d=>groundHeight(x,z+d)))+7.1;
    for(const side of [-1,1]){
      occupied.add(column+','+(side<0?row-1:row));
      const face=z+side*(span/2-.45);
      const center=face+side*16;
      const low=Math.min(...[-12,0,12].flatMap(dx=>[-16,0,16].map(dz=>groundHeight(x+dx,center+dz))))-.35;
      const roof=floor+height+(side>0?7:0);
      box(scene,framing,x,(roof+low)/2,center+side*.65,24,roof-low,30.7);
      const portalTop=floor+2.65;
      const portalBottom=floor+.31;
      box(scene,framing,x,(portalTop+roof)/2,face+side*.65,24,roof-portalTop,1.3);
      box(scene,framing,x,(portalBottom+low)/2,face+side*.65,24,portalBottom-low,1.3);
      for(const direction of [-1,1]){
        box(scene,framing,x+direction*7.08,(portalTop+portalBottom)/2,face+side*.65,
          9.84,portalTop-portalBottom,1.3);
      }
      box(scene,framing,x,roof+.5,center,19,1,27);
      for(let y=floor+5;y<roof-1;y+=3.5){
        for(const dx of [-9,-6,-3,0,3,6,9]){
          box(scene,pane,x+dx,y,face-side*.06,2.1,1.95,.12);
          box(scene,pane,x+dx,y,face+side*32.06,2.1,1.95,.12);
        }
        for(const dx of [-12,12]){
          for(const dz of [-12,-8,-4,0,4,8,12])box(scene,pane,x+dx,y,center+dz,.13,1.95,2.8);
        }
      }
      box(scene,pane,x,floor+1.47,face+side*.8,4.32,2.3,.18);
      box(scene,walkLight,x,floor+2.84,face-side*.17,4.7,.14,.22);
    }
    const bridge=new T.Group();
    bridge.position.set(x,floor,z);
    bridge.rotation.y=Math.PI/2;
    scene.add(bridge);
    box(bridge,framing,0,0,0,span,.63,4.1);
    box(bridge,framing,0,2.74,0,span,.38,4.18);
    for(const side of [-1,1]){
      box(bridge,pane,0,1.46,side*1.93,span,2.38,.18);
      box(bridge,walkLight,0,.39,side*2.06,span,.085,.06);
      for(let offset=-span/2+.35;offset<span/2;offset+=2.5){
        box(bridge,framing,offset,1.42,side*2.04,.17,2.65,.14);
      }
    }
  }
  return occupied;
}

export function monorail(scene,extent,groundHeight=()=>0){
  const rail=standard(0x465466,{emissive:0x1a293b,emissiveIntensity:.6,metalness:.31});
  const silver=standard(0xbdc9d0,{roughness:.32,metalness:.44,emissive:0x233a4a,emissiveIntensity:.27});
  const blue=standard(0x184d88,{roughness:.31,metalness:.35,emissive:0x234779,emissiveIntensity:.5});
  const red=standard(0x9a303e,{roughness:.31,metalness:.35,emissive:0x692333,emissiveIntensity:.52});
  const window=standard(0x293e55,{roughness:.23,metalness:.32,emissive:0x839eb9,emissiveIntensity:.51});
  const display=light(0xd5f4ff),tail=light(0xff5267),bed=standard(0x151b25,{roughness:.8});
  const track=-6.05;
  const railHeight=z=>groundHeight(track,z)+16.8;
  for(const offset of [-1.35,1.35]){
    const x=track+offset;
    for(let z=-extent-13;z<extent+13;z+=9.5){
      const end=Math.min(extent+13,z+9.5),measured=railHeight(z),next=railHeight(end);
      const beam=box(scene,rail,x,(measured+next)/2,(z+end)/2,.73,.78,Math.hypot(end-z,next-measured)+.025);
      beam.rotation.x=-Math.atan2(next-measured,end-z);
    }
  }
  for(let z=-extent+33;z<extent;z+=76){
    const y=railHeight(z),base=groundHeight(-10.9,z),height=y-.55-base;
    box(scene,rail,-10.9,base+height/2,z,.65,height,.71);
    strut(scene,rail,[-10.9,y-3.7,z],[track,y-.54,z],.52);
    box(scene,rail,track,y-.53,z,4.0,.32,.72);
    box(scene,display,-10.9,base+6.45,z,.031,1.85,.043);
  }
  for(const direction of [-1,1]){
    const z=direction*(extent+2), deck=railHeight(z);
    box(scene,bed,track,deck+3.2,z,11.4,.52,28);
    box(scene,bed,track,deck-.86,z,11.4,.53,28);
    for(const side of [-1,1]){
      const x=track+side*5.5;
      box(scene,rail,x,deck+1.17,z,.26,3.52,28);
      box(scene,display,x,deck+2.97,z,.32,.11,28);
      for(const along of [-9,9]){
        const base=groundHeight(x,z+along)-.15;
        box(scene,rail,x,(base+deck-.86)/2,z+along,.74,deck-.86-base,.78);
      }
    }
    box(scene,rail,track,deck+1.13,z+direction*14,11.4,3.52,.36);
  }
  function shell(length){
    const coords=[],triangles=[];
    const sections=[[-.5,.81,1.68],[-.43,1.05,1.99],[-.32,1.08,2.11],[.32,1.08,2.11],[.43,1.05,1.99],[.5,.81,1.68]];
    for(const [u,w,h] of sections){
      coords.push(-w*.83,.26,u*length,w*.83,.26,u*length,w,.65,u*length,w,h-.25,u*length,w*.70,h,u*length,-w*.70,h,u*length,-w,h-.25,u*length,-w,.65,u*length);
    }
    for(let j=0;j<sections.length-1;j++)for(let i=0;i<8;i++){
      const a=j*8+i,b=j*8+(i+1)%8;
      triangles.push(a,b,a+8,b,b+8,a+8);
    }
    const front=(sections.length-1)*8;
    for(let j=1;j<7;j++)triangles.push(0,j+1,j,front,front+j,front+j+1);
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));
    geometry.setIndex(triangles);geometry.computeVertexNormals();
    return geometry;
  }
  const carShell=shell(9.9);
  function train(stripe){
    const group=new T.Group();scene.add(group);
    for(const offset of [-5.15,5.15]){
      const cabin=new T.Mesh(carShell,silver);cabin.position.z=offset;group.add(cabin);
      box(group,bed,0,.25,offset,.73,.44,8.7);
      box(group,stripe,0,1.96,offset,1.56,.11,7.5);
      for(const side of [-1,1]){
        box(group,stripe,side*1.073,.78,offset,.026,.158,8.5);
        box(group,window,side*1.075,1.36,offset,.033,.535,8.12);
        for(let seat=-3;seat<=3;seat++)box(group,silver,side*1.095,1.36,offset+seat*1.20,.035,.552,.068);
        for(const end of [-1,1]){
          box(group,blue,side*1.09,1.26,offset+end*2.91,.037,1.08,.036);
          box(group,silver,side*1.093,1.04,offset+end*2.91,.043,.046,.28);
        }
      }
    }
    box(group,bed,0,1.07,0,1.5,1.22,.44);
    box(group,window,0,1.27,10.105,1.51,.587,.055);
    box(group,window,0,1.27,-10.105,1.51,.587,.055);
    for(const side of [-1,1]){
      box(group,display,side*.52,.69,10.114,.25,.112,.055);
      box(group,tail,side*.52,.69,-10.114,.23,.091,.055);
    }
    sign(group,[{text:'RAINPORT CENTRAL',color:'#b9e8ff',size:90}],0,1.64,10.15,0,1.02,.23);
    return group;
  }
  const trains=[train(blue),train(red)];
  trains[1].rotation.y=Math.PI;
  return time=>{
    trains.forEach((vehicle,i)=>{
      const direction=i?-1:1;
      const distance=T.MathUtils.euclideanModulo((i?283:124)+time*(i?14:16),extent*2);
      const z=direction*(-extent+distance);
      vehicle.position.set(track-i*2.70+1.35,railHeight(z)+.44,z);
      vehicle.rotation.set(-direction*Math.atan2(railHeight(z+1)-railHeight(z-1),2),i?Math.PI:0,0,'YXZ');
    });
  };
}

function vehicleShell(sections,length,{axles=[],arch=.36}={}){
  const stations=[...sections];
  for(const center of axles){
    for(let i=0;i<=12;i++){
      const z=center+Math.cos(Math.PI*i/12)*arch/length;
      const index=sections.findIndex(section=>section[0]>z);
      if(index<1)continue;
      const a=sections[index-1],b=sections[index];
      const amount=(z-a[0])/(b[0]-a[0]);
      stations.push([z,...a.slice(1).map((value,j)=>T.MathUtils.lerp(value,b[j+1],amount))]);
    }
  }
  stations.sort((a,b)=>a[0]-b[0]);
  const positions=[],indices=[];
  for(const [z,half,low,high] of stations){
    const wheelDistance=Math.min(...axles.map(at=>Math.abs(at-z)*length));
    const wheelCut=wheelDistance<=arch?.265+Math.sqrt(Math.max(0,arch**2-wheelDistance**2)):low;
    const floor=Math.max(low,wheelCut);
    positions.push(-half*.93,floor,z*length,half*.93,floor,z*length,
      half,Math.max(floor,high-.14),z*length,half*.74,high,z*length,
      -half*.74,high,z*length,-half,Math.max(floor,high-.14),z*length);
  }
  for(let row=0;row<stations.length-1;row++)for(let side=0;side<6;side++){
    const a=row*6+side,b=row*6+(side+1)%6;
    indices.push(a,b,a+6,b,b+6,a+6);
  }
  const back=(stations.length-1)*6;
  for(let a=1;a<5;a++)indices.push(0,a+1,a,back,back+a,back+a+1);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

const trafficProfiles=[
  {
    name:'Expedition',length:5.33,width:1.025,radius:.36,axles:[-.292,.285],belt:1.11,roof:1.94,
    body:[[-.5,.939,.43,1.04],[-.46,1.01,.354,1.14],[-.28,1.025,.30,1.15],
      [.22,1.025,.30,1.153],[.375,.99,.34,1.079],[.5,.894,.44,1.015]],
    glass:[[-.441,.853,1.057,1.36],[-.389,.868,1.09,1.84],[-.30,.869,1.10,1.925],
      [.045,.854,1.10,1.924],[.163,.82,1.105,1.82],[.277,.835,1.09,1.191]]
  },
  {
    name:'Camry',length:4.91,width:.917,radius:.323,axles:[-.282,.292],belt:.89,roof:1.44,
    body:[[-.5,.761,.356,.85],[-.432,.864,.293,.946],[-.263,.908,.255,.945],
      [.19,.917,.255,.898],[.40,.892,.281,.795],[.5,.777,.335,.725]],
    glass:[[-.394,.682,.875,.955],[-.232,.735,.9,1.328],[-.126,.742,.902,1.424],
      [.069,.734,.878,1.401],[.192,.714,.875,1.229],[.306,.761,.848,.908]]
  },
  {
    name:'Outback',length:4.87,width:.942,radius:.344,axles:[-.293,.295],belt:.96,roof:1.73,
    body:[[-.5,.828,.412,.871],[-.432,.929,.34,.971],[-.27,.942,.288,1.003],
      [.196,.942,.29,1.01],[.414,.929,.343,.946],[.5,.826,.453,.882]],
    glass:[[-.443,.771,.921,1.124],[-.371,.795,.958,1.591],[-.235,.813,.965,1.691],
      [.039,.801,.973,1.711],[.149,.771,.985,1.589],[.282,.774,.966,1.042]]
  }
];

function buildTrafficCar(profile,body,materials,geometry){
  const {name,length:len,width:half,radius,axles,belt,roof}=profile;
  const {dark,glass,chrome,alloy,lamps,red,amber}=materials;
  const group=new T.Group();
  group.name=name;
  group.add(new T.Mesh(geometry.body,body),new T.Mesh(geometry.glass,glass),new T.Mesh(geometry.roof,body));
  const front=len*.5,rear=-front;
  const wheels=[],tails=[];
  for(const side of [-1,1]){
    const mirrorZ=len*.20,mirrorY=belt+.10;
    box(group,dark,side*(half+.025),mirrorY,mirrorZ,.20,.115,.21);
    box(group,chrome,side*(half+.043),mirrorY,mirrorZ-.107,.141,.077,.009);
    box(group,dark,side*(half-.02),.33,.02,.06,.13,len*.69);
    for(const z of [-.16,.105]){
      box(group,chrome,side*(half-.008),belt-.115,len*z,.027,.027,.154);
      box(group,dark,side*(half-.203),belt+.214,len*z,.035,.378,.073);
    }
    if(name==='Expedition'){
      box(group,lamps,side*.733,1.004,front+.014,.37,.038,.06);
      box(group,lamps,side*.891,.917,front-.042,.044,.181,.081);
      box(group,lamps,side*.767,.893,front+.004,.267,.043,.046);
      box(group,amber,side*.935,.891,front-.086,.017,.054,.196);
      tails.push(box(group,red,side*.874,1.116,rear+.016,.070,.315,.048));
      tails.push(box(group,red,side*.757,1.249,rear+.012,.247,.047,.038));
      box(group,dark,side*.729,roof-.019,-len*.077,.067,.119,len*.506);
    }else if(name==='Outback'){
      box(group,lamps,side*.699,.974,front-.073,.31,.041,.111);
      box(group,lamps,side*.751,.735,front+.006,.222,.087,.044);
      box(group,amber,side*.917,.910,front-.106,.021,.067,.164);
      tails.push(box(group,red,side*.729,1.014,rear+.024,.318,.040,.058));
      tails.push(box(group,red,side*.845,.941,rear+.039,.059,.157,.061));
      box(group,dark,side*.647,roof+.016,-len*.108,.086,.084,len*.475);
      for(const railZ of [-.26,.07])box(group,amber,side*.647,roof-.027,railZ*len,.091,.066,.15);
    }else{
      const eyebrow=box(group,lamps,side*.653,.797,front-.114,.37,.041,.117);
      eyebrow.rotation.y=side*.27;
      box(group,lamps,side*.743,.742,front-.035,.044,.10,.062);
      tails.push(box(group,red,side*.651,.865,rear+.026,.397,.039,.058));
      tails.push(box(group,red,side*.818,.82,rear+.039,.041,.106,.068));
    }
    for(const longitudinal of axles){
      const wheel=new T.Group();
      wheel.position.set(side*(half-.045),radius+.006,longitudinal*len);
      const tire=new T.Mesh(geometry.tire,dark);
      tire.rotation.z=Math.PI/2;
      wheel.add(tire);
      const cap=new T.Mesh(geometry.hub,alloy);
      cap.rotation.z=Math.PI/2;cap.position.x=side*.132;
      wheel.add(cap);
      box(wheel,chrome,side*.147,0,radius*.117,.023,radius*.83,.031);
      box(wheel,dark,side*.148,radius*.105,0,.022,.031,radius*.78);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  if(name==='Expedition'){
    box(group,dark,0,.883,front-.003,1.467,.303,.061);
    for(const height of [.799,.854,.91])box(group,chrome,0,height,front+.034,1.316,.018,.02);
    box(group,chrome,0,1.027,front-.004,1.65,.026,.049);
    box(group,dark,0,1.269,rear+.048,1.571,.409,.047);
    box(group,dark,0,.832,rear-.016,1.852,.024,.029);
    box(group,chrome,0,.563,rear-.008,1.39,.076,.065);
  }else if(name==='Outback'){
    box(group,dark,0,.884,front-.004,1.14,.24,.061);
    for(const height of [.818,.874,.927])box(group,chrome,0,height,front+.031,.89,.014,.02);
    box(group,dark,0,.549,front-.01,1.63,.2,.113);
    box(group,chrome,0,.479,front+.017,.81,.091,.12);
    box(group,dark,0,1.44,rear+.135,1.313,.293,.065);
  }else{
    box(group,body,0,.746,front-.01,1.28,.088,.047);
    box(group,dark,0,.552,front-.011,1.27,.233,.065);
    for(const height of [.488,.53,.576,.623])box(group,chrome,0,height,front+.027,1.15,.009,.01);
    box(group,dark,0,.45,rear+.019,1.43,.155,.12);
    box(group,red,0,.866,rear+.034,1.24,.019,.041);
  }
  const plate=box(group,chrome,0,.681,rear-.018,.299,.132,.039);
  plate.name='Rear license plate';
  return {group,tails,wheels,radius};
}

function combineParts(parent,parts){
  const byMaterial=new Map();
  parent.updateMatrixWorld(true);
  const local=parent.matrixWorld.clone().invert();
  for(const mesh of parts){
    const transform=local.clone().multiply(mesh.matrixWorld);
    const geometry=mesh.geometry.clone();
    geometry.applyMatrix4(transform);
    geometry.deleteAttribute('uv');
    if(!byMaterial.has(mesh.material))byMaterial.set(mesh.material,[]);
    byMaterial.get(mesh.material).push(geometry);
  }
  for(const mesh of parts)mesh.removeFromParent();
  const merged=[];
  for(const [material,geometries] of byMaterial){
    const geometry=mergeGeometries(geometries);
    geometries.forEach(part=>part.dispose());
    const mesh=new T.Mesh(geometry,material);
    parent.add(mesh);
    merged.push(mesh);
  }
  return merged;
}

function createBicycle(paint,materials){
  const {dark,chrome,lamps,red}=materials;
  const group=new T.Group();
  group.name='Cyclist';
  const wheels=[];
  for(const z of [-.63,.63]){
    const wheel=new T.Group();wheel.position.set(0,.345,z);
    const tire=new T.Mesh(new T.TorusGeometry(.315,.031,6,18),dark);
    tire.rotation.y=Math.PI/2;wheel.add(tire);
    for(let i=0;i<6;i++){
      const spoke=box(wheel,chrome,0,0,0,.016,.60,.013);
      spoke.rotation.x=i*Math.PI/6;
    }
    combineParts(wheel,[...wheel.children]);
    group.add(wheel);wheels.push(wheel);
  }
  const seat=[0,1.02,-.24],pedal=[0,.47,-.03],neck=[0,.96,.48],rear=[0,.345,-.63],front=[0,.345,.63];
  for(const [from,to] of [[seat,pedal],[seat,rear],[rear,pedal],[seat,neck],[neck,pedal],[neck,front]]){
    strut(group,paint,from,to,.052);
  }
  box(group,dark,0,1.035,-.245,.17,.057,.29);
  strut(group,chrome,neck,[0,1.17,.48],.041);
  box(group,dark,0,1.18,.49,.54,.045,.045);
  box(group,lamps,0,1.137,.535,.086,.073,.081);
  const tail=box(group,red,0,.947,-.45,.082,.062,.08);
  const body=box(group,paint,0,1.37,-.12,.39,.46,.26);
  body.rotation.x=.38;
  const skin=standard(0xb88165);
  const head=new T.Mesh(new T.SphereGeometry(.113,9,7),skin);
  head.position.set(0,1.65,.042);group.add(head);
  const helmet=new T.Mesh(new T.SphereGeometry(.128,10,7),dark);
  helmet.scale.set(1.08,.57,1.17);helmet.position.set(0,1.724,.04);group.add(helmet);
  const pedals=[];
  for(const side of [-1,1]){
    const arm=side*.19;
    strut(group,paint,[arm,1.51,-.005],[side*.236,1.175,.45],.086);
    const leg=new T.Group();
    leg.position.set(side*.125,1.23,-.21);
    box(leg,dark,0,-.153,.105,.107,.37,.118).rotation.x=-.62;
    box(leg,dark,0,-.449,.19,.093,.31,.094).rotation.x=.21;
    box(leg,dark,0,-.594,.224,.105,.074,.183);
    group.add(leg);pedals.push(leg);
  }
  return {group,wheels,tails:[tail],pedals,radius:.345,len:1.95,bike:true};
}

function createShuttle(paint,materials){
  const {dark,glass,chrome,alloy,lamps,red,amber}=materials;
  const group=new T.Group();
  group.name='Transit Shuttle';
  box(group,paint,0,1.62,0,2.47,2.43,9.5);
  box(group,dark,0,.54,0,2.34,.48,9.25);
  box(group,paint,0,2.935,-.79,1.57,.24,3.22);
  box(group,glass,0,2.20,4.763,2.18,1.12,.035);
  box(group,glass,0,2.24,-4.763,2.08,.99,.04);
  box(group,amber,0,2.744,4.787,1.26,.143,.04);
  const tails=[],wheels=[];
  const wheelGeo=new T.CylinderGeometry(.435,.435,.24,16);
  for(const side of [-1,1]){
    for(const z of [-3.55,-2.15,-.75,.65,2.05,3.47]){
      box(group,glass,side*1.24,2.193,z,.051,1.04,1.23);
    }
    box(group,chrome,side*1.253,1.335,0,.049,.14,8.9);
    box(group,lamps,side*.89,.931,4.771,.36,.123,.03);
    tails.push(box(group,red,side*1.048,.96,-4.778,.18,.399,.039));
    for(const z of [-2.94,2.85]){
      const wheel=new T.Group();wheel.position.set(side*1.172,.455,z);
      const tire=new T.Mesh(wheelGeo,dark);tire.rotation.z=Math.PI/2;wheel.add(tire);
      box(wheel,alloy,side*.123,0,0,.031,.29,.29);
      group.add(wheel);wheels.push(wheel);
    }
  }
  return {group,tails,wheels,radius:.435,len:9.5,shuttle:true};
}

const fleetBadges=new Map();
function fleetBadge(label){
  if(!fleetBadges.has(label)){
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=56;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#e7d8c0';ctx.fillRect(0,0,320,56);
    ctx.fillStyle='#221a24';ctx.font='bold 33px sans-serif';ctx.textAlign='center';
    ctx.fillText(label,160,39,300);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    fleetBadges.set(label,new T.MeshBasicMaterial({map,toneMapped:false}));
  }
  return fleetBadges.get(label);
}

function createFleetVehicle(role,materials){
  const {dark,glass,chrome,alloy,lamps,red,amber}=materials;
  const group=new T.Group();group.name=role;
  const police=role==='Rainport Police',medic=role==='Ambulance',fire=role==='Fire Engine';
  const pulse=police||medic||fire;
  const long=fire?8.4:medic?6.4:police?5.3:5.8;
  const width=fire?2.39:medic?2.24:2.08;
  const top=fire?2.94:medic?2.70:police?1.67:2.43;
  const body=standard(fire?0xa63233:police?0x30415a:0xadb7c2,{metalness:.27,roughness:.41});
  const stripe=standard(fire?0xe3b755:medic?0xad314d:police?0xd9dce3:0x3c725b,{emissive:0x392d28,emissiveIntensity:.52});
  const wheels=[],tails=[],flashers=[];
  const nose=long*.5;
  const wheelRadius=fire?.48:.35;
  box(group,body,0,.8,0,width,1.02,long);
  box(group,chrome,0,.58,nose-.015,width*.97,.19,.15);
  box(group,dark,0,.93,nose+.016,width*.61,.25,.066);
  box(group,body,0,(top+1.1)/2,-long*.14,width*.96,top-1.1,long*.70);
  box(group,body,0,(top+1.22)/2,long*.238,width*.94,top-1.22,long*.24);
  box(group,glass,0,top-.30,long*.363,width*.83,.47,.05);
  for(const side of [-1,1]){
    box(group,lamps,side*width*.37,1.07,nose+.025,.29,.12,.11);
    tails.push(box(group,red,side*width*.43,1.0,-nose-.03,.15,.31,.12));
    box(group,stripe,side*(width/2+.013),1.245,0,.056,.18,long*.91);
    box(group,glass,side*width*.476,top-.33,long*.237,.035,.51,long*.16);
    box(group,dark,side*width*.54,top-.55,long*.31,.18,.14,.22);
    if(police)box(group,glass,side*width*.483,top-.23,-long*.15,.024,.37,long*.36);
    if(fire){
      for(const z of [-long*.38,-long*.22,-long*.06]){
        box(group,alloy,side*(width/2+.045),1.84,z,.076,1.01,long*.14);
        for(let n=-3;n<=3;n++)box(group,chrome,side*(width/2+.088),1.84+n*.13,z,.030,.02,long*.135);
      }
      box(group,chrome,side*.49,top+.18,-long*.16,.095,.105,long*.53);
    }
    const badge=new T.Mesh(new T.PlaneGeometry(fire?1.43:1.65,.29),fleetBadge(police?'POLICE':medic?'MEDICAL':fire?'RESCUE':'PARCELS'));
    badge.position.set(side*(width/2+.053),fire?2.47:medic?1.92:police?1.16:1.76,-long*.20);
    badge.rotation.y=side*Math.PI/2;group.add(badge);
    if(pulse){
      const lamp=light(side===1&&police?0x5a94ff:0xff3761);
      flashers.push(box(group,lamp,side*width*.295,top+.12,long*.16,.51,.16,.27));
      flashers.push(box(group,lamp,side*width*.437,top-.27,-nose-.04,.15,.13,.13));
      box(group,dark,0,top+.045,long*.16,width*.77,.075,.32);
    }
    for(const z of [-long*.32,long*.32]){
      const wheel=new T.Group();
      wheel.position.set(side*(width/2-.09),wheelRadius+.012,z);
      const tire=new T.Mesh(new T.CylinderGeometry(wheelRadius,wheelRadius,.23,14),dark);
      tire.rotation.z=Math.PI/2;wheel.add(tire);
      box(wheel,alloy,side*.122,0,0,.028,.26,.26);
      wheels.push(wheel);group.add(wheel);
    }
    box(group,amber,side*width*.44,.87,-long*.35,.046,.06,.19);
  }
  return {group,wheels,tails,flashers,radius:wheelRadius,len:long,shuttle:fire||medic};
}

function lampPool(color,intensity){
  return new T.ShaderMaterial({
    uniforms:{color:{value:new T.Color(color)},intensity:{value:intensity}},
    vertexShader:`
      varying vec2 p;
      void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      uniform vec3 color;uniform float intensity;varying vec2 p;
      void main(){
        float width=mix(.11,.49,p.y);
        float beam=1.0-smoothstep(width*.44,width,abs(p.x-.5));
        float falloff=smoothstep(0.0,.08,p.y)*(1.0-smoothstep(.14,1.0,p.y));
        gl_FragColor=vec4(color,beam*falloff*intensity);
      }
    `,
    blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false
  });
}

export function streetLife(scene,{block,extent,groundHeight=()=>0,freeway,parked=[],sidewalk={lift:()=>.255}}) {
  const colors=[0xd4d6d4,0x4b6b75,0x9a303e,0x839177,0x274a78,0x526477,0xaaa7a2];
  const paints=colors.map(color=>new T.MeshPhysicalMaterial({color,roughness:.30,metalness:.25,clearcoat:.78,clearcoatRoughness:.24}));
  const dark=standard(0x14191f),glass=standard(0x142435,{metalness:.31,roughness:.2,emissive:0x152337,emissiveIntensity:.41});
  const lamps=light(0xe2edff),red=light(0xff4164),braking=light(0xff8491),amber=light(0xffaf54);
  const chrome=standard(0x9da7ae,{metalness:.72,roughness:.28});
  const alloy=standard(0x596370,{metalness:.45,roughness:.45});
  const materials={dark,glass,chrome,alloy,lamps,red,amber};
  const geometries=trafficProfiles.map(profile=>{
    const {length,belt,roof,radius,axles}=profile;
    return {
      body:vehicleShell(profile.body,length,{arch:radius+.07,axles}),
      glass:vehicleShell(profile.glass,length),
      roof:vehicleShell(profile.glass.map(([z,w,low,high])=>[z,w*.75,Math.max(belt,high-.055),high+.023]),length),
      tire:new T.CylinderGeometry(radius,radius,.248,16),
      hub:new T.CylinderGeometry(radius*.61,radius*.61,.026,14)
    };
  });
  const lowBeam=lampPool(0xc5daff,.24),glowingBrake=lampPool(0xff2141,.14);
  const headSurface=new T.PlaneGeometry(3.75,10.7),tailSurface=new T.PlaneGeometry(3.0,4.7);
  const cars=[],laneGroups=new Map(),parkedCars=[];
  const models=new Map();
  function makeVehicle(i,vehicleMaterials=materials,compact=false){
    const style=i%5===0?0:i%4===0||i%4===3?2:1;
    const profile=trafficProfiles[style];
    const color=style===0?paints[0]:style===2?paints[i%2?4:5]:paints[(i+1)%paints.length];
    if(!compact){
      const car=buildTrafficCar(profile,color,vehicleMaterials,geometries[style]);
      return {...car,len:profile.length};
    }
    const key=style+','+color.id;
    if(!models.has(key)){
      const model=buildTrafficCar(profile,color,materials,geometries[style]);
      const fixed=model.group.children.filter(part=>!model.wheels.includes(part)&&!model.tails.includes(part));
      combineParts(model.group,fixed);
      model.tails=combineParts(model.group,model.tails);
      for(const wheel of model.wheels)combineParts(wheel,[...wheel.children]);
      const indexes=parts=>parts.map(part=>model.group.children.indexOf(part));
      models.set(key,{group:model.group,tails:indexes(model.tails),wheels:indexes(model.wheels),radius:model.radius});
    }
    const model=models.get(key),group=model.group.clone();
    return {group,tails:model.tails.map(index=>group.children[index]),
      wheels:model.wheels.map(index=>group.children[index]),radius:model.radius,len:profile.length};
  }
  function spawnCar(i,axis,lane,dir,at,onFreeway=false,bike=false,role=null){
    const car=bike?createBicycle(paints[(i+2)%paints.length],materials):
      role?createFleetVehicle(role,materials):
      !onFreeway&&i%31===0?createShuttle(paints[4],materials):
      i%13===0?createFleetVehicle('Delivery Van',materials):makeVehicle(i,materials,true);
    scene.add(car.group);
    const headPool=new T.Mesh(headSurface,lowBeam),tailPool=new T.Mesh(tailSurface,glowingBrake);
    scene.add(headPool,tailPool);
    const cruise=bike?4.3+i%5*.48:car.shuttle?8.9:onFreeway?20+i%5*.8:9.8+i%5*.85;
    const vehicle={...car,axis,lane,dir,at,speed:cruise,cruise,onFreeway,headPool,tailPool,roll:0};
    const key=[axis,lane,dir,onFreeway,bike].join(',');
    if(!laneGroups.has(key))laneGroups.set(key,[]);
    vehicle.peers=laneGroups.get(key);
    vehicle.peers.push(vehicle);
    cars.push(vehicle);
  }
  let vehicleIndex=0;
  for(const axis of ['x','z'])for(let row=-3;row<=3;row++){
    const lane=row*block;
    if(axis==='z'&&lane===freeway?.axisX)continue;
    for(const dir of [-1,1]){
      for(let cell=-4;cell<4;cell++){
        const local=24+T.MathUtils.euclideanModulo(cell*13+row*23+dir*9,26);
        const special=axis==='z'&&dir===1&&((row===0&&cell===2)||(row===-1&&cell===-2)||(row===1&&cell===1))
          ?row===0?'Rainport Police':row===-1?'Ambulance':'Fire Engine':null;
        spawnCar(vehicleIndex++,axis,lane,dir,cell*block+local,false,false,special);
        if((row===0||row===-1||row===1)&&T.MathUtils.euclideanModulo(cell+row+dir,3)!==0){
          const second=local<37?local+20:local-20;
          spawnCar(vehicleIndex++,axis,lane,dir,cell*block+second);
        }
      }
    }
  }
  if(freeway){
    const span=freeway.endZ-freeway.startZ;
    for(const dir of [-1,1])for(const offset of [2.2,6.06]){
      for(let i=0;i<6;i++){
        const lane=freeway.axisX-dir*offset;
        const stagger=(dir===1?.034:0)+(offset>3?.061:0);
        spawnCar(vehicleIndex++,'z',lane,dir,freeway.startZ+span*(.035+i*.145+stagger),true);
      }
    }
  }
  for(const {axis,line} of cycleTracks){
    for(const dir of [-1,1])for(let cell=-4;cell<4;cell++){
      const at=cell*block+28+(dir===1?9:0);
      spawnCar(vehicleIndex++,axis,line*block,dir,at,false,true);
    }
  }
  const parkedMaterials={...materials,lamps:standard(0x718091,{roughness:.24}),
    red:standard(0x6a2630,{roughness:.27}),amber:standard(0x8c6134,{roughness:.31})};
  const parkedBatches=new Map();
  parked.forEach(({x,z,axis,dir,elevation},i)=>{
    const car=makeVehicle(i+7,parkedMaterials);
    const yaw=axis==='z'?(dir===1?0:Math.PI):dir*Math.PI/2;
    const rise=groundHeight(x+Math.sin(yaw),z+Math.cos(yaw))-groundHeight(x-Math.sin(yaw),z-Math.cos(yaw));
    car.group.position.set(x,(elevation??groundHeight(x,z))+.035,z);
    car.group.rotation.set(elevation===undefined?-Math.atan2(rise,2):0,yaw,0,'YXZ');
    car.group.updateMatrixWorld(true);
    car.group.traverse(part=>{
      if(!part.isMesh)return;
      const key=[Math.floor((x+block)/ (block*2)),Math.floor((z+block)/(block*2)),
        part.geometry.id,part.material.id].join(',');
      if(!parkedBatches.has(key))parkedBatches.set(key,[]);
      parkedBatches.get(key).push(part);
    });
    car.group.removeFromParent();
    parkedCars.push({group:car.group,len:car.len,axis});
  });
  for(const parts of parkedBatches.values()){
    const batch=new T.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);
    parts.forEach((part,index)=>batch.setMatrixAt(index,part.matrixWorld));
    batch.computeBoundingSphere();
    scene.add(batch);
  }
  const pants=standard(0x222c40),shoes=standard(0x171c29);
  const skin=[0xb07862,0xd29d78,0x775547,0x8f634d].map(color=>standard(color));
  const garments=[0x83414e,0x47688d,0x435c57,0xa29462,0x4f4269,0x6a829d].map(color=>standard(color));
  const headGeometry=new T.SphereGeometry(.116,10,8);
  const pedestrians=[],crossers=[];
  const crosswalks=[];
  for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
    if(i===2&&j%2!==0)continue;
    if(Math.abs(i)+Math.abs(j)>4)continue;
    for(const axis of ['x','z'])crosswalks.push({i,j,axis});
  }
  const sidewalkCrowd=352;
  for(let i=0;i<sidewalkCrowd+crosswalks.length;i++){
    const group=new T.Group();scene.add(group);
    group.scale.setScalar(.90+(i%6)*.037);
    const coat=garments[i%garments.length];
    box(group,coat,0,1.27,0,.42,.55,.23);
    const head=new T.Mesh(headGeometry,skin[i%skin.length]);head.position.y=1.65;group.add(head);
    const beanie=new T.Mesh(headGeometry,garments[(i+2)%garments.length]);
    beanie.scale.set(1.06,.64,1.07);beanie.position.set(0,1.725,0);group.add(beanie);
    const limbs=[];
    for(const side of [-1,1]){
      const leg=new T.Group(),arm=new T.Group();
      leg.position.set(side*.105,.97,0); arm.position.set(side*.248,1.46,0);
      box(leg,pants,0,-.31,0,.155,.62,.16);
      box(leg,shoes,0,-.638,.06,.165,.135,.25);
      box(arm,coat,0,-.245,0,.12,.45,.13);
      box(arm,skin[i%skin.length],0,-.475,0,.19,.094,.10);
      group.add(leg,arm);limbs.push({leg,arm,side});
    }
    if(i%3===0){box(group,standard(0x394851),0,1.20,-.172,.33,.40,.175);}
    if(i>=sidewalkCrowd){
      const crossing=crosswalks[i-sidewalkCrowd];
      const {i:column,j:row,axis}=crossing;
      const side=(i%4<2?-1:1);
      const stop=side*10.6;
      crossers.push({group,limbs,axis,column,row,side,at:stop,walking:false,
        crossing:false,ready:3+i%17*.49,pace:1.65+i%4*.09});
      continue;
    }
    const parcel=(i*23)%64, left=(Math.floor(parcel/8)-4)*block, near=(parcel%8-4)*block;
    const clockwise=(Math.floor(i/64)+parcel)%2===0;
    const inset=(clockwise?11.52:12.73)+(Math.floor(i/128)%2)*.30;
    const span=block-2*inset;
    pedestrians.push({group,limbs,left:left+inset,near:near+inset,span,clockwise,walking:true,
      progress:T.MathUtils.euclideanModulo(i*19.63,span*4),pace:1.02+i%5*.14});
  }

  const mast=standard(0x626a72,{metalness:.48});
  const housing=standard(0x191d22);
  const unlit=new T.Color(0x262328);
  const signalColors=[0xff3c4e,0xffbd49,0x55e994].map(color=>new T.Color(color).multiplyScalar(1.5));
  const heads=[];
  const lenses=[];
  const hardware=[];
  const lensGeometry=new T.CircleGeometry(.114,14);
  const capGeometry=new T.CylinderGeometry(.143,.143,.182,10,1,true,.10,Math.PI-.20);
  function recordHardware(object,mat,x,y,z,w,h,d){
    const fixture=box(object,mat,x,y,z,w,h,d);
    hardware.push(fixture);
  }
  for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){
    const x=i*block,z=j*block;
    for(const [yaw,axis] of [[0,'z'],[Math.PI,'z'],[Math.PI/2,'x'],[-Math.PI/2,'x']]){
      const rig=new T.Group();
      scene.add(rig);
      rig.rotation.y=yaw;
      const pole=new T.Vector3(-10.68,0,10.68).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw);
      rig.position.set(x,groundHeight(x+pole.x,z+pole.z)+.18,z);
      recordHardware(rig,mast,-10.68,2.88,10.68,.16,5.75,.16);
      recordHardware(rig,mast,-6.9,5.75,10.68,7.6,.11,.11);
      for(const side of [-3.35,-7.35]){
        recordHardware(rig,housing,side,5.29,10.68,.41,1.015,.29);
        const lamps=[];
        for(const y of [5.58,5.29,5.0]){
          const iris=new T.Object3D();
          // Heads face the approaching lanes from the far side of the junction.
          iris.rotation.y=Math.PI;
          iris.position.set(side,y,10.525);
          rig.add(iris);
          lamps.push(lenses.length);
          lenses.push(iris);
          const hood=new T.Mesh(capGeometry,housing);
          hood.rotation.order='YXZ';
          hood.rotation.x=Math.PI/2;
          hood.rotation.y=Math.PI/2;
          hood.position.set(side,y,10.473);
          rig.add(hood);
          hardware.push(hood);
        }
        heads.push({axis,lamps,i,j,lit:-1});
      }
    }
  }
  const glowGeometry=new T.PlaneGeometry(.92,.92);
  const glowMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
    vertexShader:`
      varying vec2 lampUV;
      varying vec3 lampColor;
      varying float facing;
      void main(){
        lampUV=uv;
        lampColor=instanceColor;
        vec4 origin=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        vec3 front=normalize(mat3(modelViewMatrix*instanceMatrix)*vec3(0.,0.,1.));
        facing=smoothstep(.03,.6,dot(normalize(-origin.xyz),front));
        origin.xy+=position.xy;
        gl_Position=projectionMatrix*origin;
      }`,
    fragmentShader:`
      varying vec2 lampUV;
      varying vec3 lampColor;
      varying float facing;
      void main(){
        float radius=length(lampUV-.5)*2.;
        float halo=(1.-smoothstep(0.,1.,radius))*.36+(1.-smoothstep(0.,.28,radius))*.31;
        gl_FragColor=vec4(lampColor,halo*facing);
      }`
  });
  const signalGlow=new T.InstancedMesh(glowGeometry,glowMaterial,heads.length);
  const glowMatrix=new T.Matrix4(),glowPoint=new T.Vector3(),glowForward=new T.Vector3();
  scene.add(signalGlow);
  const spillMaterial=new T.MeshBasicMaterial({transparent:true,opacity:.12,depthWrite:false,
    blending:T.AdditiveBlending,toneMapped:false});
  const spillGeometry=new T.PlaneGeometry(6.8,10);
  const spillAlpha=new Uint8Array(32*32*4);
  for(let i=0;i<32*32;i++){
    const r=Math.hypot(i%32-15.5,Math.floor(i/32)-15.5)/15.5;
    spillAlpha.set([255,255,255,Math.round(Math.max(0,1-r)**2*255)],i*4);
  }
  spillMaterial.map=new T.DataTexture(spillAlpha,32,32);
  spillMaterial.map.needsUpdate=true;
  const signalSpill=new T.InstancedMesh(spillGeometry,spillMaterial,heads.length);
  scene.add(signalSpill);
  const spillTransform=new T.Object3D();
  const staticBatches=new Map();
  scene.updateMatrixWorld(true);
  const signalLenses=new T.InstancedMesh(lensGeometry,new T.MeshBasicMaterial(),lenses.length);
  lenses.forEach((iris,index)=>{
    signalLenses.setMatrixAt(index,iris.matrixWorld);
    signalLenses.setColorAt(index,unlit);

  });
  heads.forEach((head,index)=>{
    const iris=lenses[head.lamps[1]];
    iris.getWorldPosition(glowPoint);
    iris.getWorldDirection(glowForward);
    head.glowOrigin=glowPoint.clone().addScaledVector(glowForward,.12);
    head.glowYaw=Math.atan2(glowForward.x,glowForward.z);
    glowMatrix.makeRotationY(head.glowYaw).setPosition(head.glowOrigin);
    signalGlow.setMatrixAt(index,glowMatrix);
    signalGlow.setColorAt(index,unlit);
    const x=glowPoint.x+glowForward.x*5.5,z=glowPoint.z+glowForward.z*5.5;
    const normal=new T.Vector3(groundHeight(x-.2,z)-groundHeight(x+.2,z),.4,groundHeight(x,z-.2)-groundHeight(x,z+.2)).normalize();
    spillTransform.position.set(x,groundHeight(x,z)+.075,z);
    spillTransform.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);
    spillTransform.updateMatrix();
    signalSpill.setMatrixAt(index,spillTransform.matrix);
    signalSpill.setColorAt(index,unlit);
  });
  signalGlow.frustumCulled=false;
  signalGlow.instanceMatrix.setUsage(T.DynamicDrawUsage);
  signalGlow.instanceColor.setUsage(T.DynamicDrawUsage);
  signalSpill.instanceColor.setUsage(T.DynamicDrawUsage);
  lenses.forEach(iris=>iris.removeFromParent());
  signalLenses.instanceColor.setUsage(T.DynamicDrawUsage);
  scene.add(signalLenses);
  for(const part of hardware){
    const key=part.geometry.uuid+part.material.uuid;
    if(!staticBatches.has(key))staticBatches.set(key,[]);
    staticBatches.get(key).push(part);
  }
  for(const parts of staticBatches.values()){
    const [first]=parts;
    const batch=new T.InstancedMesh(first.geometry,first.material,parts.length);
    parts.forEach((part,index)=>{batch.setMatrixAt(index,part.matrixWorld);part.removeFromParent();});
    scene.add(batch);
  }
  const wrap=value=>T.MathUtils.euclideanModulo(value+extent-5,(extent-5)*2)-extent+5;
  function phase(axis,time,i,j) {
    const offset=T.MathUtils.euclideanModulo(i+j,3)*.46;
    const seconds=(time+offset)%20;
    if(axis==='z')return seconds<8.2?2:seconds<9.4?1:0;
    return seconds>=18.7 && seconds<19.85?1:seconds>=10 && seconds<18.7?2:0;
  }
  function positionOnLane(car){
    if(car.onFreeway)return [car.lane,car.at];
    const offset=car.bike?8.72:2.64;
    if(car.axis==='z')return [car.lane-car.dir*offset,car.at];
    return [car.at,car.lane+car.dir*offset];
  }
  function movePool(pool,x,z,yaw,distance,heightAt){
    pool.position.set(x+Math.sin(yaw)*distance,0,z+Math.cos(yaw)*distance);
    pool.position.y=heightAt(pool.position.x,pool.position.z)+.036;
    pool.rotation.set(-Math.PI/2,yaw+Math.PI,0,'YXZ');
  }
  function freewayHeight(x,z) {return freeway.surfaceAt(x,z,true).y;}
  function crossPosition(person,at=person.at){
    const x=person.column*block,z=person.row*block;
    return person.axis==='x'?[x+at,z+11.3]:[x+11.3,z+at];
  }
  function update(dt,time,player,heading=0,playerSpeed=0,playerOnFreeway=false){
    const playerVX=Math.sin(heading)*playerSpeed,playerVZ=Math.cos(heading)*playerSpeed;
    const playerAt=(x,z,horizon=0)=>Math.hypot(x-player.x-playerVX*horizon,z-player.z-playerVZ*horizon);
    for(const car of cars){
      [car.x,car.z]=positionOnLane(car);
    }
    for(const person of crossers){
      const [x,z]=crossPosition(person);
      const opposite=person.axis==='x'?'z':'x';
      const walkSignal=phase(opposite,time,person.column,person.row)===0;
      if(!person.crossing&&walkSignal&&time>=person.ready){
        const streetBusy=cars.some(car=>{
          if(car.onFreeway||car.axis!==opposite)return false;
          const lateral=car.axis==='z'?Math.abs(car.x-x):Math.abs(car.z-z);
          const gap=(car.axis==='z'?z-car.z:x-car.x)*car.dir;
          const occupying=Math.abs(gap)<car.len/2+.45;
          const approaching=gap>0&&gap<Math.max(7,car.speed*.90+4)&&car.speed>.5;
          return lateral<22&&(occupying||approaching);
        });
        if(!streetBusy&&(playerOnFreeway||Math.min(playerAt(x,z),playerAt(x,z,.7))>5.6))person.crossing=true;
      }
      const next=person.at-person.side*person.pace*dt;
      const [nextX,nextZ]=crossPosition(person,next);
      const playerNear=!playerOnFreeway&&Math.min(playerAt(nextX,nextZ),playerAt(nextX,nextZ,.22))<2.45;
      const vehicleNear=person.crossing&&cars.some(car=>{
        if(car.onFreeway||car.axis===person.axis)return false;
        const dx=Math.abs(car.x-nextX),dz=Math.abs(car.z-nextZ);
        const lateral=car.bike?.58:car.shuttle?1.54:1.31;
        const length=car.len/2+.43;
        return car.axis==='z'?dx<lateral&&dz<length:dx<length&&dz<lateral;
      });
      // A pedestrian already crossing reserves the lane until it is safe to finish.
      person.walking=person.crossing&&!playerNear&&!vehicleNear;
      if(person.walking){
        person.at=next;
        if(Math.abs(person.at)>=10.6){
          person.side*=-1;
          person.at=person.side*10.6;
          person.crossing=false;
          person.ready=time+4+(person.column+4)*.65;
        }
      }
      [person.x,person.z]=crossPosition(person);
      person.group.visible=playerAt(person.x,person.z)<120;
      if(person.group.visible){
        person.group.position.set(person.x,groundHeight(person.x,person.z)+(Math.abs(person.at)<10.02?.025:sidewalk.lift(person.x,person.z)+.014),person.z);
        person.group.rotation.y=person.axis==='x'?-person.side*Math.PI/2:(person.side===1?Math.PI:0);
      }
    }
    for(const car of cars){
      const axisIndex=Math.round(car.lane/block);
      const nearLine=car.dir>0?Math.ceil(car.at/block):Math.floor(car.at/block);
      const distance=(nearLine*block-car.at)*car.dir;
      const {x,z}=car;
      const heightAt=car.onFreeway?freewayHeight:groundHeight;
      const along=(px,pz)=>(car.axis==='z'?pz-z:px-x)*car.dir;
      const across=(px,pz)=>Math.abs(car.axis==='z'?px-x:pz-z);
      let wanted=car.cruise,maxTravel=Infinity;
      function yieldAt(gap,spacing){
        const clear=Math.max(0,gap-spacing);
        wanted=Math.min(wanted,Math.sqrt(10.5*clear),clear*1.26);
        maxTravel=Math.min(maxTravel,clear);
      }
      if(!car.onFreeway&&distance>14.55&&distance<41&&phase(car.axis,time,axisIndex,nearLine)!==2)yieldAt(distance,16.35);

      const y=heightAt(x,z);
      if(car.onFreeway===playerOnFreeway&&Math.abs((player.y??y)-y)<2.4){
        const longitudinal=car.axis==='z'?Math.abs(Math.cos(heading)):Math.abs(Math.sin(heading));
        const spacing=car.len/2+longitudinal*2.3+(1-longitudinal)*1.15+.64;
        const gap=along(player.x,player.z);
        if(gap>=-spacing&&gap<58&&across(player.x,player.z)<(longitudinal> .6?2.7:3.45)){
          yieldAt(gap,spacing);
        }
        for(const t of [.30,.65,1.05]){
          const predictedX=player.x+playerVX*t,predictedZ=player.z+playerVZ*t;
          const future=along(predictedX,predictedZ);
          if(future>0&&future<car.speed*(t+.8)+spacing&&across(predictedX,predictedZ)<2.75){
            yieldAt(future,spacing+.65);
          }
        }
      }
      for(const other of car.peers){
        if(other===car)continue;
        let gap=along(other.x,other.z);
        const span=car.onFreeway?freeway.endZ-freeway.startZ:(extent-5)*2;
        if(gap<0)gap+=span;
        if(gap<62)yieldAt(gap,(car.len+other.len)/2+1.55);
      }
      if(!car.onFreeway){
        for(const person of crossers){
          if(!person.crossing||person.axis===car.axis)continue;
          const gap=along(person.x,person.z);
          if(gap>0&&gap<34&&across(person.x,person.z)<20)yieldAt(gap,car.len/2+1.65);
        }
        if(Math.min(distance,block-distance)<19){
          for(const other of cars){
            if(other.onFreeway||other.axis===car.axis)continue;
            const gap=along(other.x,other.z);
            const otherGap=(car.axis==='z'?x-other.x:z-other.z)*other.dir;
            if(gap>0&&gap<22&&otherGap>-other.len/2-1.18&&otherGap<other.len/2+2.3){
              yieldAt(gap,car.len/2+(other.bike?.75:1.62));
            }
          }
        }
      }
      const slowing=wanted<car.speed-.3;
      car.speed+=T.MathUtils.clamp(wanted-car.speed,-10.8*dt,3.7*dt);
      const travel=Math.min(car.speed*dt,maxTravel);
      if(dt>0&&travel<car.speed*dt)car.speed=travel/dt;
      const nextAt=car.at+travel*car.dir;
      const shouldWrap=car.onFreeway&&(nextAt<freeway.startZ||nextAt>freeway.endZ);
      car.at=car.onFreeway
        ?shouldWrap?(car.dir>0?freeway.startZ:freeway.endZ):nextAt
        :wrap(nextAt);
      const [nextX,nextZ]=positionOnLane(car);
      car.group.visible=playerAt(nextX,nextZ)<(car.bike?115:154);
      car.group.position.set(nextX,heightAt(nextX,nextZ)+.018,nextZ);
      if(!car.group.visible){
        car.headPool.visible=false;
        car.tailPool.visible=false;
        continue;
      }
      const yaw=car.axis==='z'?(car.dir===1?0:Math.PI):car.dir*Math.PI/2;
      const rise=heightAt(nextX+Math.sin(yaw),nextZ+Math.cos(yaw))-heightAt(nextX-Math.sin(yaw),nextZ-Math.cos(yaw));
      car.group.rotation.set(-Math.atan2(rise,2),yaw,0,'YXZ');
      car.roll=T.MathUtils.euclideanModulo(car.roll+travel/car.radius,Math.PI*2);
      for(const wheel of car.wheels)wheel.rotation.x=car.roll;
      if(car.pedals)car.pedals.forEach((leg,index)=>leg.rotation.x=Math.sin(car.roll*.62+index*Math.PI)*.47);
      for(const tail of car.tails)tail.material=slowing?braking:red;
      if(car.flashers?.length){
        const emergency=(time+car.lane/53+24)%31<11;
        const stage=Math.floor((time+car.lane/27)*3)%2;
        car.flashers.forEach((lamp,index)=>lamp.visible=emergency&&Math.floor(index/2)===stage);
      }
      const nearby=!car.bike&&Math.hypot(nextX-player.x,nextZ-player.z)<67;
      car.headPool.visible=nearby;
      car.tailPool.visible=nearby;
      if(nearby){
        movePool(car.headPool,nextX,nextZ,yaw,car.len*.47+5.31,heightAt);
        movePool(car.tailPool,nextX,nextZ,yaw+Math.PI,car.len*.40+2.06,heightAt);
      }
    }
    for(const pedestrian of pedestrians){
      const {left,near,span,clockwise}=pedestrian;
      const next=T.MathUtils.euclideanModulo(pedestrian.progress+pedestrian.pace*dt*(clockwise?1:-1),span*4);
      const point=progress=>{
        if(progress<span)return [left+progress,near,Math.PI/2];
        if(progress<2*span)return [left+span,near+progress-span,0];
        if(progress<3*span)return [left+3*span-progress,near+span,-Math.PI/2];
        return [left,near+4*span-progress,Math.PI];
      };
      const [x,z]=point(next);
      pedestrian.walking=playerOnFreeway||Math.min(playerAt(x,z),playerAt(x,z,.3))>2.5;
      if(pedestrian.walking)pedestrian.progress=next;
      const [px,pz,yaw]=point(pedestrian.progress);
      pedestrian.x=px;
      pedestrian.z=pz;
      pedestrian.group.visible=playerAt(px,pz)<110;
      if(!pedestrian.group.visible)continue;
      const bob=pedestrian.walking?Math.sin(time*pedestrian.pace*13+near)*.013:0;
      pedestrian.group.position.set(px,groundHeight(px,pz)+sidewalk.lift(px,pz)+.014+bob,pz);
      pedestrian.group.rotation.y=yaw+(clockwise?0:Math.PI);
    }
    for(const pedestrian of [...pedestrians,...crossers]){
      if(!pedestrian.group.visible)continue;
      for(const {leg,arm,side} of pedestrian.limbs){
        const swing=pedestrian.walking?Math.sin(time*pedestrian.pace*9+(pedestrian.near??pedestrian.at))*.50*side:0;
        leg.rotation.x=swing;
        arm.rotation.x=-swing*.73;
      }
    }
    heads.forEach((head,index)=>{
      const current=phase(head.axis,time,head.i,head.j);
      if(head.lit===current)return;
      if(head.lit>=0)signalLenses.setColorAt(head.lamps[head.lit],unlit);
      signalLenses.setColorAt(head.lamps[current],signalColors[current]);
      const glow=head.glowOrigin;
      glowMatrix.makeRotationY(head.glowYaw).setPosition(glow.x,glow.y+(.29-current*.29),glow.z);
      signalGlow.setMatrixAt(index,glowMatrix);
      signalGlow.setColorAt(index,signalColors[current]);
      signalSpill.setColorAt(index,signalColors[current]);
      signalLenses.instanceColor.needsUpdate=true;
      signalGlow.instanceMatrix.needsUpdate=true;
      signalGlow.instanceColor.needsUpdate=true;
      signalSpill.instanceColor.needsUpdate=true;
      head.lit=current;
    });
  }
  function blocks(x,z,y=groundHeight(x,z),onFreeway=false) {
    function touches(car){
      if(Math.abs(y-car.group.position.y)>2.1)return false;
      const dx=Math.abs(x-car.group.position.x),dz=Math.abs(z-car.group.position.z);
      const side=car.bike?.64:car.shuttle?1.46:1.26;
      return car.axis==='z'?dx<side&&dz<car.len/2+.37:dx<car.len/2+.37&&dz<side;
    }
    return cars.some(car=>car.onFreeway===onFreeway&&touches(car))||
      (!onFreeway&&(parkedCars.some(touches)||
        crossers.some(person=>Math.hypot(x-person.x,z-person.z)<.66)||
        pedestrians.some(person=>Math.hypot(x-person.x,z-person.z)<.62)));
  }
  return {update,blocks,createTrafficVehicle:index=>makeVehicle(index,materials,true)};
}
