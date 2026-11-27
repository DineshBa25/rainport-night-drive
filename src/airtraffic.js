import * as T from 'three';

export function createAirTraffic(scene){
  const paint=new T.MeshStandardMaterial({color:0xd2d6db,metalness:.39,roughness:.37,
    emissive:0x37475f,emissiveIntensity:.64});
  const silver=new T.MeshStandardMaterial({color:0x8095af,metalness:.61,roughness:.39,emissive:0x243246});
  const trim=new T.MeshStandardMaterial({color:0x355d77,metalness:.26,roughness:.36,emissive:0x16394f,emissiveIntensity:.53});
  const black=new T.MeshStandardMaterial({color:0x122031,roughness:.37,emissive:0x152639});
  const glow=color=>new T.MeshBasicMaterial({color,toneMapped:false});
  const red=glow(0xff3f4e),green=glow(0x48ffb6),white=glow(0xf9f5ff),cabin=glow(0xa1bfc9);
  const bulbGeometry=new T.SphereGeometry(1,12,7);
  const boxGeometry=new T.BoxGeometry(1,1,1);
  const fuselage=new T.LatheGeometry([
    [0,-24],[1.15,-21],[2.34,-16],[2.75,-10],[2.8,13],[2.48,18],[1.42,22],[.54,23.8],[0,24.2],
  ].map(([r,z])=>new T.Vector2(r,z)),32);
  function add(parent,geo,material,x,y,z){
    const mesh=new T.Mesh(geo,material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function box(parent,mat,x,y,z,w,h,d){
    const part=add(parent,boxGeometry,mat,x,y,z);
    part.scale.set(w,h,d);return part;
  }
  function bulb(parent,mat,x,y,z,size){
    const part=add(parent,bulbGeometry,mat,x,y,z);
    part.scale.setScalar(size);return part;
  }
  function panel(parent,shape,material,x,y,z,flat=true){
    const polygon=new T.Shape();
    shape.forEach(([a,b],i)=>(i?polygon.lineTo(a,b):polygon.moveTo(a,b)));
    polygon.closePath();
    const geometry=new T.ExtrudeGeometry(polygon,{depth:.19,bevelEnabled:false});
    const part=add(parent,geometry,material,x,y,z);
    if(flat)part.rotation.x=Math.PI/2;
    else part.rotation.y=Math.PI/2;
    return part;
  }
  function jet(index){
    const group=new T.Group();
    group.name='Rainport Airways widebody';
    add(group,fuselage,paint,0,0,0).rotation.x=Math.PI/2;
    const strobes=[],beacons=[];
    for(const side of [-1,1]){
      const wing=panel(group,[[0,6],[side*6,5],[side*26,-10],[side*26,-13.3],[side*8,-8.3],[0,-7.7]],silver,0,-.7,0);
      wing.rotation.z=side*.028;
      panel(group,[[0,1],[side*9,-5.5],[side*9,-7.6],[0,-4.9]],silver,0,.85,-16.4);
      box(group,trim,side*25.8,.30,-11.65,.37,1.86,2.8);
      const engine=add(group,new T.CylinderGeometry(1.37,1.47,5.6,26),paint,side*8.25,-2.14,-.35);
      engine.rotation.x=Math.PI/2;
      const inlet=add(group,new T.CylinderGeometry(1.10,1.10,.12,24),black,side*8.25,-2.14,2.50);
      inlet.rotation.x=Math.PI/2;
      bulb(group,white,side*4.84,-.85,5.1,.25);
      bulb(group,side>0?red:green,side*25.9,.05,-10.85,.30);
      strobes.push(bulb(group,white,side*25.9,-.05,-12.7,.33));
      box(group,black,side*.95,1.49,21.06,1.14,.49,.20).rotation.y=side*.35;
      for(let i=0;i<21;i++)box(group,cabin,side*2.73,.55,-13+i*1.46,.038,.22,.43);
    }
    panel(group,[[0,0],[1,6.9],[5.9,8.9],[7.4,8.9],[6.2,0]],trim,0,.48,-16,false);
    bulb(group,white,0,.9,-23.85,.22);
    beacons.push(bulb(group,red,0,2.83,-.25,.25),bulb(group,red,0,-2.83,-.21,.29));
    group.scale.setScalar(index===1?1.08:.94);
    scene.add(group);
    return {group,strobes,beacons};
  }
  const flights=[jet(0),jet(1),jet(2)];
  return time=>{
    flights.forEach(({group,strobes,beacons},i)=>{
      const heading=[.77,-.72,1.40][i];
      const along=T.MathUtils.euclideanModulo(time*(24+i*3)+i*393+207,1380)-690;
      const east=[-24,99,-132][i],north=[122,-40,18][i];
      group.position.set(east+Math.sin(heading)*along,181+i*26+along*.021,north+Math.cos(heading)*along);
      group.rotation.set(-.021,heading,Math.sin(time*.19+i)*.049,'YXZ');
      const flash=(time+i*.39)%1.38;
      for(const lamp of strobes)lamp.visible=flash<.075||(flash>.165&&flash<.23);
      for(const lamp of beacons)lamp.visible=(time+i*.21)%1.52<.22;
    });
  };
}
