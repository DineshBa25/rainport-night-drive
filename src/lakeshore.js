import * as T from 'three';
import {clearRoadFootprint} from './roadClearance.js';

const TAU=Math.PI*2;
const plankGeo=new T.BoxGeometry(1,1,1);
const roundGeo=new T.CylinderGeometry(1,1,1,12);
const sphereGeo=new T.SphereGeometry(1,10,8);
const coneGeo=new T.ConeGeometry(1,1,12);
const solid=(color,emissive=0,roughness=.8)=>new T.MeshStandardMaterial({
  color,emissive,emissiveIntensity:.55,roughness,
});
const glow=color=>new T.MeshBasicMaterial({color,toneMapped:false});

export function buildLakeshore(scene,{groundHeight,lake,outsideCityRoad}){
  const district=new T.Group();
  district.name='Rainport lakeshore district';
  scene.add(district);
  const {x:cx,z:cz,rx,rz}=lake;
  const boardX=rx+14,boardZ=rz+13,roadX=rx+31,roadZ=rz+30;
  const batches=new Map();
  const matrix=new T.Object3D();
  const streetStone=solid(0x746f65,0x1f2421);
  const steel=solid(0x313d44,0x131c21,.47);
  const copper=solid(0x826b52,0x382719,.47);
  const cream=solid(0xcbb58a,0x372a20);
  const wood=solid(0x78523f,0x36241b);
  const darkWood=solid(0x47372e,0x201815);
  const pine=solid(0x52604c,0x213021);
  const leafy=solid(0x58734b,0x182f20);
  const flowers=[solid(0xc27783,0x50252d),solid(0xebbb72,0x654427),solid(0x7a8de8,0x2a3056)];
  const teal=glow(0x91ebe7);
  const amber=glow(0xffc780);
  const ivory=glow(0xffefce);
  const red=glow(0xff685a);
  const green=glow(0x8dffd0);
  const glass=[
    solid(0xa38261,0xd69c61,.38),
    solid(0x5c8088,0x527779,.42),
    solid(0x9b6b60,0xbc6f4d,.43),
  ];
  const storefront=[
    {name:'TIDE & TIMBER',label:'COFFEE · BAKERY',wall:0x655446,trim:0x273f3c,canopy:0xa16655,code:'#ffdbac'},
    {name:'MIRROR LAKE',label:'PADDLE CLUB',wall:0x52666a,trim:0x28434b,canopy:0x507e84,code:'#a5f1ef'},
    {name:'LANTERN ROOM',label:'KITCHEN · TERRACE',wall:0x695164,trim:0x413944,canopy:0x895e76,code:'#ffd4e2'},
    {name:'WATERMARK',label:'BOOKS · GIFTS',wall:0x6c5547,trim:0x3b4b42,canopy:0x5a7561,code:'#f2d8a9'},
    {name:'DOCK NINE',label:'ICE CREAM',wall:0x675969,trim:0x49414c,canopy:0x9b676f,code:'#ffcbda'},
    {name:'THE BOATHOUSE',label:'LAKE GRILL',wall:0x516569,trim:0x31474c,canopy:0x567985,code:'#c7f3ef'},
    {name:'BIRCH & REED',label:'FLORIST',wall:0x6c6350,trim:0x415046,canopy:0x77825f,code:'#edf3bd'},
    {name:'WINDWARD',label:'CYCLES · REPAIR',wall:0x53686b,trim:0x31464d,canopy:0x4c687a,code:'#d1eaf5'},
    {name:'HARBOR PANTRY',label:'MARKET · DELI',wall:0x766052,trim:0x494137,canopy:0x986956,code:'#ffdfa8'},
    {name:'BLUE HOUR',label:'TEA GARDEN',wall:0x565b76,trim:0x373d50,canopy:0x676998,code:'#d3dcff'},
  ];
  let seed=2459072;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const coord=(a,xx=boardX,zz=boardZ)=>[cx+Math.cos(a)*xx,cz+Math.sin(a)*zz];
  function frame(x,z,angle){
    const c=Math.cos(angle),s=Math.sin(angle);
    return (u,v)=>[x+u*c+v*s,z-u*s+v*c];
  }
  function add(mat,x,y,z,w,h,d,yaw=0,geo=plankGeo,pitch=0,roll=0){
    const key=mat.id+'|'+geo.id;
    if(!batches.has(key))batches.set(key,{mat,geo,items:[]});
    batches.get(key).items.push([x,y,z,w,h,d,yaw,pitch,roll]);
  }
  function texture(width,height,draw){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    draw(canvas.getContext('2d'),width,height);
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;
    return map;
  }
  const roadGlowMap=texture(64,64,(ctx,w,h)=>{
    const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    gradient.addColorStop(0,'rgba(255,235,205,.35)');
    gradient.addColorStop(.42,'rgba(255,213,167,.15)');
    gradient.addColorStop(1,'rgba(255,198,130,0)');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,w,h);
  });
  const lightPool=new T.MeshBasicMaterial({
    map:roadGlowMap,transparent:true,depthWrite:false,opacity:.78,
    blending:T.AdditiveBlending,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-3,
  });
  function pool(x,z,radius,yaw=0){
    const geometry=new T.PlaneGeometry(radius*2,radius*1.42,9,7);
    geometry.rotateX(-Math.PI/2);
    geometry.rotateY(yaw);
    const positions=geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const px=x+positions.getX(i),pz=z+positions.getZ(i);
      positions.setXYZ(i,px,groundHeight(px,pz)+.142,pz);
    }
    geometry.computeVertexNormals();
    district.add(new T.Mesh(geometry,lightPool));
  }
  function ribbon(mat,from,to,xx,zz,width,lift){
    const positions=[],uvs=[],indices=[];
    const steps=Math.max(3,Math.ceil((to-from)*Math.max(xx,zz)/1.55));
    for(let i=0;i<=steps;i++){
      const a=T.MathUtils.lerp(from,to,i/steps);
      for(const sign of [-1,1]){
        const offset=sign*width/2;
        const [x,z]=coord(a,xx+offset,zz+offset);
        positions.push(x,groundHeight(x,z)+lift,z);
        uvs.push(i*.18,(sign+1)/2);
      }
      if(i>0){
        const j=(i-1)*2;
        indices.push(j,j+3,j+1,j,j+2,j+3);
      }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    district.add(new T.Mesh(geo,mat));
  }
  const pavingMap=texture(128,64,(ctx,w,h)=>{
    ctx.fillStyle='#82786f';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#514944';
    for(let z=0;z<64;z+=16){
      ctx.fillRect(0,z,w,1);
      for(let x=-24;x<128;x+=24)ctx.fillRect(x+((z/16)%2)*12,z,1,16);
    }
    for(let i=0;i<110;i++){
      ctx.fillStyle=i%2?'rgba(255,235,196,.08)':'rgba(36,29,24,.11)';
      ctx.fillRect(random()*w,random()*h,1+random()*4,1);
    }
  });
  pavingMap.wrapS=pavingMap.wrapT=T.RepeatWrapping;
  const paving=solid(0x968d83,0x241e17);
  paving.map=pavingMap;
  const deckMap=texture(128,48,(ctx,w,h)=>{
    ctx.fillStyle='#927561';ctx.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){
      ctx.fillStyle=i%2?'#68574c':'#a0846a';
      ctx.fillRect(i*16,0,1,h);
      ctx.fillStyle='rgba(34,29,22,.28)';
      ctx.fillRect(i*16+2,7,1,2);
      ctx.fillRect(i*16+2,37,1,2);
    }
  });
  deckMap.wrapS=deckMap.wrapT=T.RepeatWrapping;
  const deckMaterial=solid(0x9d8167,0x261c13);
  deckMaterial.map=deckMap;
  ribbon(deckMaterial,0,TAU,boardX,boardZ,4.62,.101);
  const south=3*Math.PI/2;
  for(const [start,end] of [[south-.43,south-.055],[south+.06,south+.49],[.162,.61]]){
    ribbon(paving,start,end,roadX+9.7,roadZ+9.7,4.5,.116);
    ribbon(streetStone,start,end,roadX+7.30,roadZ+7.30,.27,.136);
  }
  function sign(shop,x,y,z,yaw,width,height=1.45){
    const map=texture(512,114,(ctx,w,h)=>{
      ctx.fillStyle='#17262d';ctx.fillRect(0,0,w,h);
      ctx.strokeStyle=shop.code;ctx.lineWidth=2.5;ctx.strokeRect(8,8,w-16,h-16);
      ctx.fillStyle=shop.code;ctx.font='bold 45px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(shop.name,w/2,43,w-34);
      ctx.font='bold 19px sans-serif';ctx.fillText(shop.label,w/2,84,w-30);
    });
    const item=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,toneMapped:false}));
    item.position.set(x,y,z);item.rotation.y=yaw;district.add(item);
  }
  function shopAt(design,angle,index){
    const [x,z]=coord(angle,roadX+19.8,roadZ+19.8);
    const yaw=Math.atan2(cx-x,cz-z);
    const to=frame(x,z,yaw);
    const width=14.4+(index%3)*.42,depth=11.4;
    if(!clearRoadFootprint(outsideCityRoad,x,z,width+.9,depth+2.3,yaw,.35))return;
    const height=4.1+(index%3)*.50;
    const bottom=groundHeight(x,z)+.51;
    const brick=solid(design.wall,0x241f21);
    const trim=solid(design.trim,0x152326,.58);
    const canopy=solid(design.canopy,0x362926);
    const place=(mat,u,y,v,w,h,d,pitch=0)=>{
      const [px,pz]=to(u,v);
      add(mat,px,y,pz,w,h,d,yaw,plankGeo,pitch);
    };
    const minGround=Math.min(...[-1,1].flatMap(a=>[-1,1].map(b=>groundHeight(...to(a*width/2,b*depth/2)))));
    place(streetStone,0,(bottom+minGround-.23)/2,0,width+.20,bottom-minGround+.23,depth+.20);
    place(brick,0,bottom+height/2,0,width,height,depth);
    place(trim,0,bottom+height+.11,0,width+.43,.27,depth+.48);
    place(steel,0,bottom+height+.31,-.33,width-.81,.18,depth-1.06);
    const front=depth/2+.061;
    const entrance=bottom+.07;
    place(streetStone,0,bottom-.04,front-.14,width+.32,.44,2.8);
    for(const side of [-1,1]){
      place(trim,side*(width/2-.23),bottom+1.77,front+.043,.43,3.57,.22);
      const strips=index%2?4:3;
      for(let p=0;p<strips;p++){
        const u=side*(1.42+p*(width/2-1.96)/strips+(width/2-1.96)/(2*strips));
        const paneWidth=(width/2-1.96)/strips;
        place(trim,u,bottom+1.4,front,paneWidth-.065,2.92,.19);
        place(glass[(index+p)%3],u,bottom+1.54,front+.104,paneWidth-.223,2.45,.081);
        place(copper,u,bottom+1.53,front+.156,paneWidth-.10,.062,.042);
        place(glass[(index+p+1)%3],u,bottom+2.64,front+.145,paneWidth-.25,.23,.032);
        place(amber,u,bottom+2.44,front+.17,.131,.055,.052);
      }
      const [sx,sz]=to(side*(width/2-.8),front+1.38);
      add(wood,sx,groundHeight(sx,sz)+.32,sz,1.02,.54,.53,yaw);
      for(let i=0;i<5;i++){
        const [px,pz]=to(side*(width/2-.8)+(i-2)*.17,front+1.40);
        add(leafy,px,groundHeight(px,pz)+.65,pz,.17,.19,.15,yaw,sphereGeo);
        add(flowers[(index+i)%flowers.length],px,groundHeight(px,pz)+.73,pz,.081,.067,.081,yaw,sphereGeo);
      }
      for(const v of [-2.4,1.9]){
        place(trim,side*(width/2+.024),bottom+2.13,v,.094,1.84,1.56);
        place(glass[(index+1)%3],side*(width/2+.085),bottom+2.12,v,.054,1.58,1.33);
      }
    }
    place(trim,0,bottom+1.33,front+.11,2.56,2.67,.26);
    for(const u of [-.58,.58]){
      place(glass[(index+1)%3],u,bottom+1.42,front+.251,1.04,2.22,.10);
      place(copper,u+Math.sign(-u)*.30,bottom+1.25,front+.329,.13,.055,.08);
    }
    place(copper,0,bottom+2.77,front+.237,2.60,.11,.24);
    place(canopy,0,bottom+3.14,front+.67,width-.68,.120,1.52,.145);
    if(index%3===0||index%3===2){
      for(let j=0;j<14;j++)if(j%2===0){
        place(cream,(j-6.5)*(width-.68)/14,bottom+3.21,front+.67,(width-.68)/14,.037,1.53,.145);
      }
    }
    place(trim,0,bottom+3.035,front+1.44,width-.62,.119,.074);
    const signCenter=to(0,front+.135);
    sign(design,...[signCenter[0],bottom+height-1.00,signCenter[1]],yaw,Math.min(9.8,width*.84));
    for(const u of [-width*.36,0,width*.36])place(ivory,u,bottom+2.983,front+.97,.375,.045,.112);
    const [px,pz]=to(0,front+3.2);
    pool(px,pz,4.5,yaw);
    for(let step=0;step<2;step++){
      const [sx,sz]=to(0,front+1.80+step*.32);
      const ground=groundHeight(sx,sz);
      const h=Math.max(.09,entrance-ground-.12*step);
      add(streetStone,sx,ground+h/2,sz,2.9,h,.44,yaw);
    }
  }
  const shops=[-.36,-.271,-.181,.126,.221,.315,.408].map((a,i)=>[south+a,i]);
  shops.push([.249,7],[.362,8],[.476,9]);
  for(const [a,i] of shops)shopAt(storefront[i],a,i);
  function markings(angle){
    const [x,z]=coord(angle,roadX,roadZ);
    const yaw=Math.atan2(cx-x,cz-z),at=frame(x,z,yaw);
    const triangles=[];
    for(let i=-6;i<=6;i++){
      const near=i*.91-.21,far=i*.91+.21;
      for(const [u,v] of [[-.92,near],[-.92,far],[.92,near],[-.92,far],[.92,far],[.92,near]]){
        const [px,pz]=at(u,v);
        triangles.push(px,groundHeight(px,pz)+.153,pz);
      }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(triangles,3));geo.computeVertexNormals();
    district.add(new T.Mesh(geo,new T.MeshBasicMaterial({color:0xa9ad9d,side:T.DoubleSide})));
    const inward=to=>coord(angle,roadX-to,roadZ-to);
    const [inX,inZ]=inward(7.4);
    const [outX,outZ]=inward(14.3);
    const bridge=new T.PlaneGeometry(3.6,7.3,3,8);
    bridge.rotateX(-Math.PI/2);bridge.rotateY(yaw);
    const points=bridge.getAttribute('position');
    for(let i=0;i<points.count;i++){
      const px=(inX+outX)/2+points.getX(i),pz=(inZ+outZ)/2+points.getZ(i);
      points.setXYZ(i,px,groundHeight(px,pz)+.123,pz);
    }
    bridge.computeVertexNormals();district.add(new T.Mesh(bridge,paving));
  }
  markings(south-.115);markings(south+.075);
  {
    const [x,z]=coord(south+.073,boardX+4.4,boardZ+4.4);
    const yaw=Math.atan2(x-cx,z-cz),at=frame(x,z,yaw);
    const y=groundHeight(x,z);
    for(const u of [-2.35,2.35]){
      const [px,pz]=at(u,0),base=groundHeight(px,pz);
      add(streetStone,px,base+.29,pz,.43,.57,.43,yaw);
      add(steel,px,(base+y+3.12)/2,pz,.143,y+3.12-base,.143,yaw);
      add(teal,px,y+3.20,pz,.121,.10,.121,0,roundGeo);
    }
    add(steel,x,y+2.99,z,4.85,.094,.17,yaw);
    const [sx,sz]=at(0,.104);
    add(darkWood,x,y+2.70,z,4.43,.94,.151,yaw);
    sign({name:'MIRROR LAKE',label:'BOARDWALK',code:'#c6f5ec'},sx,y+2.70,sz,yaw,3.95,.85);
  }
  function lamp(x,z,y,scale=1){
    add(steel,x,y+1.19*scale,z,.065*scale,2.38*scale,.065*scale,0,roundGeo);
    add(steel,x,y+.045,z,.16*scale,.088,.16*scale,0,roundGeo);
    add(amber,x,y+2.42*scale,z,.147*scale,.232*scale,.147*scale,0,roundGeo);
    add(steel,x,y+2.6*scale,z,.229*scale,.137*scale,.229*scale,0,coneGeo);
  }
  function bench(x,z,y,yaw){
    const at=frame(x,z,yaw);
    for(const u of [-.62,.62]){
      const [px,pz]=at(u,0);
      add(steel,px,y+.21,pz,.082,.42,.37,yaw);
    }
    for(let j=0;j<3;j++){
      const [px,pz]=at(0,(j-1)*.145);
      add(wood,px,y+.435,pz,1.68,.072,.127,yaw);
      const [bx,bz]=at(0,-.21);
      add(wood,bx,y+.59+j*.092,bz,1.68,.072,.051,yaw);
    }
  }
  function furniture(angle,type){
    const [x,z]=coord(angle,boardX-3.2,boardZ-3.2);
    const yaw=Math.atan2(cx-x,cz-z);
    const y=groundHeight(x,z)+.105;
    if(type===0)bench(x,z,y,yaw);
    if(type===1){
      add(steel,x,y+.38,z,.21,.74,.21,0,roundGeo);
      for(let k=0;k<7;k++){
        const a=k*TAU/7;
        add(wood,x+.205*Math.cos(a),y+.38,z+.205*Math.sin(a),.105,.62,.066,-a);
      }
      add(steel,x,y+.77,z,.253,.10,.253,0,roundGeo);
    }
    if(type===2){
      add(wood,x,y+.245,z,1.16,.48,.83,yaw);
      add(darkWood,x,y+.492,z,1.04,.033,.71,yaw);
      const at=frame(x,z,yaw);
      for(let n=0;n<14;n++){
        const [px,pz]=at((random()-.5)*.93,(random()-.5)*.55);
        add(pine,px,y+.64,pz,.12,.196,.13,0,sphereGeo);
        add(flowers[n%3],px+.031,y+.775,pz,.083,.066,.07,0,sphereGeo);
      }
    }
    if(type===3)lamp(x,z,y,.84);
  }
  for(let i=0;i<92;i++){
    furniture(i*TAU/92,i%4);
    const a=i*TAU/92+.028;
    const [x,z]=coord(a,boardX-2.21,boardZ-2.21);
    const y=groundHeight(x,z)+.104;
    add(steel,x,y+.43,z,.057,.84,.057,0,roundGeo);
    add(teal,x,y+.851,z,.067,.032,.067,0,roundGeo);
  }
  const terraceScenes=[];
  function terrace(angle,awningColor,index){
    const [x,z]=coord(angle,boardX-6.1,boardZ-6.1);
    const yaw=Math.atan2(cx-x,cz-z);
    const at=frame(x,z,yaw);
    const y=groundHeight(x,z)+.33;
    const width=13.5,depth=6.5;
    const min=Math.min(...[-1,1].flatMap(a=>[-1,1].map(b=>groundHeight(...at(a*width/2,b*depth/2)))));
    add(streetStone,x,(y+min-.12)/2,z,width,y-min+.12,depth,yaw);
    for(let j=0;j<17;j++){
      const [px,pz]=at(0,(j-8)*depth/17);
      add(j%3===0?darkWood:wood,px,y+.018,pz,width-.1,.035,depth/17-.025,yaw);
    }
    const awning=solid(awningColor,0x322824);
    for(const u of [-4.6,0,4.6]){
      const [px,pz]=at(u,.15);
      add(steel,px,y+.38,pz,.062,.76,.062,0,roundGeo);
      add(wood,px,y+.77,pz,.64,.085,.64,0,roundGeo);
      add(cream,px-.19,y+.837,pz+.06,.092,.112,.092,0,roundGeo);
      if(u!==0){
        add(steel,px,y+.99,pz,.043,1.98,.043,0,roundGeo);
        add(awning,px,y+1.99,pz,1.19,.31,1.19,yaw,coneGeo);
      }
      for(const s of [-1,1]){
        const [sx,sz]=at(u+s*.92,.22);
        add(steel,sx,y+.20,sz,.25,.40,.25,0,roundGeo);
        add(wood,sx,y+.42,sz,.36,.065,.34,yaw);
      }
    }
    const cable=[];
    for(let u=-5.67;u<=5.68;u+=.81){
      const [px,pz]=at(u,-1.99);
      const h=y+2.62+.48*(u/5.67)**2;
      cable.push(new T.Vector3(px,h,pz));
      add(amber,px,h-.06,pz,.063,.086,.063,0,sphereGeo);
    }
    const wire=new T.BufferGeometry().setFromPoints(cable);
    district.add(new T.Line(wire,new T.LineBasicMaterial({color:0x685343})));
    for(const side of [-1,1]){
      const [postX,postZ]=at(side*5.67,-1.99);
      add(steel,postX,y+1.54,postZ,.059,3.08,.059,0,roundGeo);
      const [lx,lz]=at(side*5.9,2.66);
      lamp(lx,lz,y,.91);
      const [sx,sz]=at(side*6.1,-2.65);
      add(steel,sx,y+.46,sz,.07,.89,.07,yaw);
    }
    const [rx,rz]=at(0,2.97);
    add(steel,rx,y+.78,rz,width-.16,.063,.061,yaw);
    terraceScenes.push({x,z,y,yaw,at});
    const [landX,landZ]=at(0,-3.61);
    add(streetStone,landX,y-.145,landZ,4.2,.33,.96,yaw);
    if(index===0){
      const [sx,sz]=at(4.58,-2.58);
      const label={name:'LAKESIDE TERRACE',label:'MIRROR LAKE',code:'#ffdeb2'};
      sign(label,sx,y+1.55,sz,yaw+Math.PI,3.65);
    }
  }
  terrace(south-.205,0xad7160,0);
  terrace(south+.24,0x547989,1);
  terrace(.39,0x946d7d,2);
  for(const [a,length] of [[south-.31,22],[south+.32,19],[.52,17]]){
    const [x,z]=coord(a,boardX+2.4,boardZ+2.4);
    const yaw=Math.atan2(cx-x,cz-z);
    const at=frame(x,z,yaw);
    for(let i=0;i<length;i++){
      const [px,pz]=at((i-(length-1)/2)*.61,-random()*.41);
      const y=groundHeight(px,pz);
      add(pine,px,y+.17,pz,.47,.39,.40,0,sphereGeo);
      add(leafy,px+.11,y+.31,pz+.03,.28,.28,.29,0,sphereGeo);
      if(i%2===0)add(flowers[(i+1)%3],px+.04,y+.47,pz+.11,.095,.10,.091,0,sphereGeo);
    }
  }
  const jacketMats=[
    solid(0xd3947e,0x352124),solid(0xa0b8bc,0x24363c),solid(0x645a8d,0x24203b),
    solid(0x4c6975,0x1f2933),solid(0x9a9474,0x383021),solid(0xb2a293,0x372920),
  ];
  const skinMats=[solid(0xc99878,0x453326),solid(0x9c6958,0x372520),solid(0x714c3e,0x2f201b)];
  const trousers=[solid(0x354658,0x171e29),solid(0x485054,0x1f2328),solid(0x6e5e53,0x2b211c)];
  const soles=solid(0xb2a393,0x31271e);
  const people=[],seated=[],crowdBatches=new Map();
  function part(group,geometry,material,x,y,z,sx,sy,sz){
    const shape=new T.Mesh(geometry,material);
    shape.position.set(x,y,z);
    shape.scale.set(sx,sy,sz);
    group.add(shape);
    return shape;
  }
  function person(i,running=false){
    const body=new T.Group();
    const cloth=jacketMats[i%jacketMats.length],skin=skinMats[i%skinMats.length];
    const pants=trousers[i%trousers.length];
    part(body,plankGeo,pants,0,.81,0,.28,.20,.18);
    const shirt=part(body,sphereGeo,cloth,0,1.17,0,.218,.344,.15);
    shirt.rotation.x=running?.09:0;
    part(body,roundGeo,skin,0,1.45,.014,.075,.11,.075);
    part(body,sphereGeo,skin,0,1.585,.021,.11,.132,.105);
    const cap=part(body,sphereGeo,i%2?trousers[0]:wood,0,1.66,.008,.117,.059,.11);
    cap.rotation.x=-.11;
    if(i%3===0)part(body,sphereGeo,pants,0,1.19,-.124,.135,.222,.089);
    if(running)part(body,plankGeo,ivory,0,1.37,.127,.22,.052,.031);
    const limbs=[];
    for(const direction of [-1,1]){
      const arm=new T.Group();
      arm.position.set(direction*.209,1.38,0);
      part(arm,sphereGeo,cloth,0,-.123,0,.058,.145,.063);
      const handZ=running?.096:.031;
      part(arm,sphereGeo,cloth,0,-.31,handZ,.053,.112,.057);
      part(arm,sphereGeo,skin,0,-.41,handZ+.017,.039,.062,.045);
      body.add(arm);
      const leg=new T.Group(),shin=new T.Group();
      leg.position.set(direction*.094,.85,0);
      shin.position.set(0,-.397,0);
      part(leg,sphereGeo,pants,0,-.185,0,.081,.216,.084);
      part(shin,sphereGeo,pants,0,-.172,0,.071,.19,.068);
      part(shin,sphereGeo,darkWood,0,-.375,.059,.075,.049,.131);
      part(shin,plankGeo,soles,0,-.405,.062,.129,.032,.215);
      leg.add(shin);
      body.add(leg);
      limbs.push({direction,arm,leg,shin});
    }
    body.scale.setScalar(.91+(i%7)*.027);
    const parts=[];
    body.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const key=mesh.geometry.id+'|'+mesh.material.id;
      if(!crowdBatches.has(key))crowdBatches.set(key,{geometry:mesh.geometry,material:mesh.material,capacity:0});
      const group=crowdBatches.get(key);
      group.capacity++;
      parts.push({mesh,group});
      mesh.visible=false;
    });
    body.name=running?'Lakeshore runner':'Lakeshore walker';
    district.add(body);
    return {body,limbs,parts};
  }
  function makeWalkers(near,spread,count,id,running=false,shopSide=false){
    const cc=shopSide?roadX+9.7:boardX;
    const zz=shopSide?roadZ+9.7:boardZ;
    for(let i=0;i<count;i++){
      const direction=i%2?-1:1;
      const lane=shopSide?direction*.76:direction*(i%3===0?1.44:.91);
      const {body,limbs,parts}=person(i+id,running);
      people.push({body,limbs,parts,near,spread,start:(i/count+.063*(i%3))%1,
        rate:(running?.015:.0063)*(1+(i%5)*.068),direction,cc:cc+lane,zz:zz+lane,running,phase:i*1.93});
    }
  }
  makeWalkers(south,.73,17,0);
  makeWalkers(south,.95,7,24,true);
  makeWalkers(.37,.50,12,31);
  makeWalkers(1.55,1.11,10,47);
  makeWalkers(2.95,1.05,10,63,true);
  makeWalkers(south-.252,.344,8,80,false,true);
  makeWalkers(south+.26,.387,9,94,false,true);
  makeWalkers(.381,.40,7,112,false,true);
  for(const [index,{at,y,yaw}] of terraceScenes.entries()){
    for(const [k,u] of [-4.6,4.6,0].entries()){
      if(index===2&&k===1)continue;
      const [x,z]=at(u+.91,.22);
      const {body,limbs,parts}=person(120+index*4+k);
      body.name='Lakeshore terrace guest';
      seated.push({body,parts});
      body.position.set(x,y-.05,z);
      body.rotation.y=yaw-Math.PI/2;
      for(const limb of limbs){
        limb.leg.rotation.x=-1.48;
        limb.shin.rotation.x=1.44;
        limb.arm.rotation.x=-.47;
      }
    }
  }
  const waterY=7.07;
  const hullColors=[solid(0x897361,0x3f2b20,.4),solid(0x888e91,0x2d3741,.39),solid(0x4e7588,0x182d3a,.38)];
  const sailMaterial=new T.MeshStandardMaterial({color:0xd4be9a,emissive:0x362d26,roughness:.84,side:T.DoubleSide});
  const runners=[];
  function boat(id){
    const body=new T.Group();
    const tinted=hullColors[id%3];
    const vertices=[
      -.83,.32,-1.77, .83,.32,-1.77, 1.02,.34,.53, .79,.38,1.65, 0,.42,2.52,
      -.79,.38,1.65, -1.02,.34,.53, -.49,-.18,-1.53, .49,-.18,-1.53,0,-.19,1.62,
    ];
    const hull=new T.BufferGeometry();
    hull.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    hull.setIndex([0,7,8,0,8,1,1,8,2,2,8,9,2,9,3,3,9,4,4,9,5,5,9,6,6,9,7,6,7,0,0,1,2,0,2,6,6,2,3,6,3,5,5,3,4]);
    hull.computeVertexNormals();
    const bodyMaterial=tinted.clone();bodyMaterial.side=T.DoubleSide;
    body.add(new T.Mesh(hull,bodyMaterial));
    part(body,plankGeo,wood,0,.344,-.21,1.27,.173,2.28);
    part(body,plankGeo,cream,0,.58,.28,1.10,.44,1.03);
    part(body,plankGeo,steel,0,.82,.28,1.19,.087,1.11);
    for(const side of [-1,1]){
      part(body,plankGeo,glass[1],side*.562,.59,.30,.026,.145,.57);
      part(body,plankGeo,side===-1?green:red,side*.91,.44,.91,.12,.08,.11);
    }
    part(body,plankGeo,ivory,0,.47,-1.78,.119,.10,.095);
    if(id===2){
      part(body,roundGeo,steel,0,2.19,.69,.044,3.52,.044);
      const points=new Float32Array([0,.74,.74,0,3.87,.74,.01,1.05,-.98,0,1.05,-.98,0,3.87,.74,0,1.76,-.67]);
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.BufferAttribute(points,3));geo.computeVertexNormals();
      body.add(new T.Mesh(geo,sailMaterial));
      part(body,sphereGeo,ivory,0,3.98,.69,.07,.07,.07);
    }
    body.name=id===2?'Lakeshore sailboat':'Lakeshore cabin boat';
    district.add(body);
    const wake=new T.Group();
    const stripe=new T.MeshBasicMaterial({
      color:0x81b6c4,transparent:true,opacity:.23,depthWrite:false,blending:T.AdditiveBlending,
    });
    for(const s of [-1,1]){
      const wakeLine=part(wake,plankGeo,stripe,s*1.26,0,-3.60,.095,.012,5.43);
      wakeLine.rotation.y=-s*.235;
      const end=part(wake,plankGeo,stripe,s*2.47,0,-7.14,.064,.009,3.01);
      end.rotation.y=-s*.278;
    }
    district.add(wake);
    runners.push({body,wake,radiusX:rx*(.49+id*.135),radiusZ:rz*(.51+id*.112),rate:.014+id*.004,phase:4.31+id*.83});
  }
  for(let i=0;i<3;i++)boat(i);
  const reflected=[0x2e6d74,0x73624a,0x51756a].map(color=>new T.MeshBasicMaterial({
    color,transparent:true,opacity:.63,depthWrite:false,blending:T.AdditiveBlending,
  }));
  for(const anchor of [south-.295,south+.217,.38,1.55]){
    for(let i=0;i<30;i++){
      const a=anchor+(random()-.5)*.068;
      const r=.963-random()*.16;
      const [x,z]=coord(a,rx*r,rz*r);
      add(reflected[i%3],x,waterY+.021,z,random()*2.03+.28,.017,.078+random()*.10,-a+Math.PI/2);
    }
  }
  for(const {mat,geo,items} of batches.values()){
    const batch=new T.InstancedMesh(geo,mat,items.length);
    items.forEach(([x,y,z,w,h,d,yaw,pitch,roll],index)=>{
      matrix.position.set(x,y,z);
      matrix.rotation.set(pitch,yaw,roll,'YXZ');
      matrix.scale.set(w,h,d);matrix.updateMatrix();
      batch.setMatrixAt(index,matrix.matrix);
    });
    batch.computeBoundingSphere();
    district.add(batch);
  }
  for(const group of crowdBatches.values()){
    const mesh=new T.InstancedMesh(group.geometry,group.material,group.capacity);
    mesh.name='Lakeshore crowd batch';
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled=false;
    group.batch=mesh;
    district.add(mesh);
  }
  function showPerson(entry){
    entry.body.updateMatrixWorld(true);
    for(const {mesh,group} of entry.parts){
      group.batch.setMatrixAt(group.batch.count++,mesh.matrixWorld);
    }
  }
  function tick(time,viewerPosition){
    for(const {batch} of crowdBatches.values())batch.count=0;
    for(const entry of people){
      const {body,limbs,near,spread,start,rate,direction,cc,zz,running,phase}=entry;
      // Reverse at promenade ends. Offset the return lane to allow passers-by to see each other.
      const progress=T.MathUtils.euclideanModulo(start+time*rate+(.13*(direction+1)),2);
      const sign=progress<=1?1:-1;
      const within=progress<=1?progress:2-progress;
      const a=near+spread*(within-.5);
      const [x,z]=coord(a,cc,zz);
      body.visible=!viewerPosition||Math.hypot(x-viewerPosition.x,z-viewerPosition.z)<270;
      if(!body.visible)continue;
      const swing=time*(running?10.7:7.2)+phase;
      const y=groundHeight(x,z)+(cc>roadX?.124:.109);
      body.position.set(x,y+Math.sin(swing*2)*.032,z);
      body.rotation.y=Math.atan2(-Math.sin(a)*cc*sign,Math.cos(a)*zz*sign);
      for(const {direction:limbDirection,arm,leg,shin} of limbs){
        const s=Math.sin(swing)*limbDirection;
        leg.rotation.x=s*(running?.83:.48);
        shin.rotation.x=Math.max(0,-s)*(running?1.03:.62);
        arm.rotation.x=-s*(running?.71:.35);
      }
    }
    for(const entry of people)if(entry.body.visible)showPerson(entry);
    for(const entry of seated){
      const {x,z}=entry.body.position;
      if(!viewerPosition||Math.hypot(x-viewerPosition.x,z-viewerPosition.z)<235)showPerson(entry);
    }
    for(const {batch} of crowdBatches.values())batch.instanceMatrix.needsUpdate=true;
    for(const {body,wake,radiusX,radiusZ,rate,phase} of runners){
      const a=time*rate+phase;
      const [x,z]=coord(a,radiusX,radiusZ);
      const turn=Math.atan2(-Math.sin(a)*radiusX,Math.cos(a)*radiusZ);
      body.position.set(x,waterY+.068*Math.sin(time*1.7+phase),z);
      body.rotation.set(.021*Math.cos(time*1.66+phase),turn,.04*Math.sin(time*1.3+phase),'YXZ');
      wake.position.set(x,waterY+.038,z);
      wake.rotation.y=turn;
    }
  }
  tick(3,null);
  return tick;
}
