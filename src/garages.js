import * as T from 'three';

export const garageParcels=[[-2,-2],[2,0]];
const garageRise=3.75;
const rampStart=16;
const walls=22.8;
const floorDepth=24.5;
const rampInner=10.9;
const boxGeometry=new T.BoxGeometry(1,1,1);

export function createGarages(scene,{block,groundHeight}){
  const concrete=new T.MeshStandardMaterial({color:0x687186,roughness:.94,emissive:0x202943,emissiveIntensity:.53});
  const edges=new T.MeshStandardMaterial({color:0x2c394d,roughness:.83,emissive:0x182641});
  const white=new T.MeshBasicMaterial({color:0xc0eced,toneMapped:false});
  const paint=new T.MeshBasicMaterial({color:0xe5b568,toneMapped:false});
  const teal=new T.MeshBasicMaterial({color:0x65dbc5,toneMapped:false});
  const boxes=new Map(),parked=[];
  function box(mat,x,y,z,w,h,d){
    if(!boxes.has(mat))boxes.set(mat,[]);
    boxes.get(mat).push([x,y,z,w,h,d]);
  }
  const garages=garageParcels.map(([i,j])=>{
    const x=(i+.5)*block,z=(j+.5)*block;
    const base=Math.max(...[-22,0,22].flatMap(dx=>[-25,0,25].map(dz=>groundHeight(x+dx,z+dz))))+.16;
    const level=(story)=>base+garageRise*story;
    const rampHeight=(dz,side)=>side===1 ? level((dz+rampStart)/(rampStart*2))
      : level(1+(rampStart-dz)/(rampStart*2));
    function vehicleSurfaces(dx,dz){
      if(Math.abs(dx)>walls+.3||dz>floorDepth+.3||dz< -30)return [];
      if(dz< -floorDepth){
        if(Math.abs(dx)>5.9001)return [];
        const street=groundHeight(x+dx,z-30);
        return [T.MathUtils.lerp(street,base,(dz+30)/(30-floorDepth))];
      }
      if(Math.abs(dz)>=rampStart||Math.abs(dx)<rampInner+.06)return [level(0),level(1),level(2)];
      return [rampHeight(dz,Math.sign(dx)),level(dx>0?2:0)];
    }
    function sign(label,x,y,z,yaw,width){
      const canvas=document.createElement('canvas');
      canvas.width=384;canvas.height=100;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#163340';ctx.fillRect(0,0,384,100);
      ctx.strokeStyle='#91ece7';ctx.lineWidth=5;ctx.strokeRect(5,5,374,90);
      ctx.fillStyle='#d4fff8';ctx.font='bold 42px sans-serif';ctx.textAlign='center';
      ctx.fillText(label,192,65,360);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      const mesh=new T.Mesh(new T.PlaneGeometry(width,width*100/384),new T.MeshBasicMaterial({map,toneMapped:false}));
      mesh.position.set(x,y,z);mesh.rotation.y=yaw;scene.add(mesh);
    }
    const slab=(dx,y,dz,w,d)=>box(concrete,x+dx,y-.15,z+dz,w,.3,d);
    function tiltedDeck(x0,x1,z0,z1,y,material){
      const geometry=new T.PlaneGeometry(x1-x0,z1-z0,4,14);
      geometry.rotateX(-Math.PI/2);
      const p=geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const xx=(x0+x1)/2+p.getX(i),zz=(z0+z1)/2+p.getZ(i);
        p.setXYZ(i,x+xx,y(xx,zz),z+zz);
      }
      geometry.computeVertexNormals();
      scene.add(new T.Mesh(geometry,material));
    }
    tiltedDeck(-5.9,5.9,-30.12,-floorDepth+.08,(dx,dz)=>
      T.MathUtils.lerp(groundHeight(x+dx,z-30),base,T.MathUtils.clamp((dz+30)/(30-floorDepth),0,1)),concrete);
    for(const side of [-1,1]){
      const [left,right]=[side*rampInner,side*walls].sort((a,b)=>a-b);
      tiltedDeck(left,right,-rampStart-.06,rampStart+.06,
        (_dx,dz)=>rampHeight(T.MathUtils.clamp(dz,-rampStart,rampStart),side),concrete);
      for(let dz=-15;dz<16;dz+=2.1){
        const y=rampHeight(dz,side);
        box(paint,x+side*16.8,y+.041,z+dz,.085,.055,.76);
        box(edges,x+side*(rampInner+.04),y+.42,z+dz,.18,.88,2.12);
        box(edges,x+side*walls,y+.42,z+dz,.18,.88,2.12);
      }
    }
    for(let floor=0;floor<=2;floor++){
      const y=level(floor);
      slab(0,y,0,2*rampInner,2*rampStart);
      for(const side of [-1,1]){
        const bay=x+side*8.15;
        for(let slot=-2;slot<=2;slot++){
          const dz=slot*5.8;
          box(white,bay,y+.021,z+dz+2.9,3.2,.030,.075);
          if((slot+floor+side+7)%4===0){
            parked.push({x:bay,z:z+dz,axis:'z',dir:side,elevation:y});
          }
        }
        box(white,bay,y+.021,z-14.5,3.2,.030,.075);
        box(white,bay-side*1.6,y+.021,z,.078,.030,29);
      }
      for(const end of [-1,1])slab(0,y,end*(floorDepth+rampStart)/2,2*walls,floorDepth-rampStart);
      if(floor!==1){
        const side=floor===0?-1:1;
        slab(side*(walls+rampInner)/2,y,0,walls-rampInner,2*rampStart);
      }
      for(const end of [-1,1]){
        for(const side of [-1,1]){
          const center=side*(floor===0&&end===-1?14.42:11.4);
          const width=floor===0&&end===-1?16.75:22.8;
          box(edges,x+center,y+.5,z+end*floorDepth,width,1,.24);
          box(teal,x+center,y+.91,z+end*(floorDepth+.15),width,.10,.13);
          box(white,x+side*7.4,y+.035,z+end*19.6,.16,.035,4.9);
        }
      }
      for(const side of [-1,1]){
        for(const dz of [-22.5,-13.5,0,13.5,22.5]){
          box(edges,x+side*walls,y+1.36,z+dz,.57,floor===2?2.7:3.52,.58);
        }
        if(floor!==1&&side===(floor===0?-1:1))box(edges,x+side*walls,y+.48,z,.19,.94,32);
        if(floor<2){
          for(const dz of [-20,0,20])box(white,x+side*6.8,y+garageRise-.23,z+dz,3.1,.093,.14);
        }
      }
      sign('LEVEL '+(floor+1),x-6.3,y+1.65,z+floorDepth-.16,Math.PI,4.1);
    }
    const baseHeight=base-groundHeight(x-walls,z);
    box(edges,x-walls,base-baseHeight/2-.08,z,.43,Math.max(.3,baseHeight+.24),49);
    sign('P  •  PUBLIC GARAGE',x,base+4.72,z-floorDepth-.18,Math.PI,8.6);
    sign('←  UP',x+6.8,base+2.53,z-20,Math.PI,4.1);
    return {
      local(px,pz){return [px-x,pz-z];},
      surfaces:vehicleSurfaces,
      covered(dx,dz,y){return Math.abs(dx)<walls&&Math.abs(dz)<floorDepth&&y<level(2)-.32;},
      blocks(dx,dz,y){
        if(dz< -floorDepth-.6&&Math.abs(dx)<=5.5)return false;
        if(Math.abs(dx)>walls-.62||dz>floorDepth-.64)return true;
        if(dz< -floorDepth+.6&&Math.abs(dx)>5.42)return true;
        if(Math.abs(dz)<rampStart-.66&&Math.abs(Math.abs(dx)-rampInner)<.75){
          return Math.abs(y-rampHeight(dz,Math.sign(dx)))>.2||
            Math.abs(dz)<rampStart-1.5;
        }
        return false;
      },
    };
  });
  for(const [material,parts] of boxes){
    const mesh=new T.InstancedMesh(boxGeometry,material,parts.length);
    const matrix=new T.Matrix4();
    parts.forEach(([x,y,z,w,h,d],i)=>{matrix.makeScale(w,h,d);matrix.setPosition(x,y,z);mesh.setMatrixAt(i,matrix);});
    mesh.name='Parking garage structure';
    scene.add(mesh);
  }
  function section(x,z){
    for(const garage of garages){
      const [dx,dz]=garage.local(x,z);
      if(Math.abs(dx)<28.95&&Math.abs(dz)<30.05)return {garage,dx,dz};
    }
    return null;
  }
  return {
    parked,
    surfaceAt(x,z,currentY){
      const part=section(x,z);
      if(!part)return null;
      const choices=part.garage.surfaces(part.dx,part.dz);
      if(!choices.length)return null;
      return choices.reduce((nearest,y)=>Math.abs(y-currentY)<Math.abs(nearest-currentY)?y:nearest);
    },
    covered(x,z,y){
      const part=section(x,z);
      return Boolean(part&&part.garage.covered(part.dx,part.dz,y));
    },
    blocks(x,z,y){
      const part=section(x,z);
      return part ? part.garage.blocks(part.dx,part.dz,y) : null;
    },
  };
}
