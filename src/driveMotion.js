const footprint=[[-.68,1.89],[.68,1.89],[-.68,-1.79],[.68,-1.79],[-.82,0],[.82,0],[0,0]];

export function footprintBlocks(x,z,heading,obstructed){
  const sin=Math.sin(heading),cos=Math.cos(heading);
  let hits=0;
  for(const [side,along] of footprint){
    if(obstructed(x+cos*side+sin*along,z-sin*side+cos*along))hits++;
  }
  return hits;
}

export function travelCar({x,z,heading,yaw,travel,obstructed}){
  const segments=Math.max(1,Math.ceil(Math.abs(travel)/.42),Math.ceil(Math.abs(yaw)/.064));
  const step=travel/segments;
  let contacts=footprintBlocks(x,z,heading,obstructed);
  let movement=0,limited=false;
  for(let i=0;i<segments;i++){
    const turned=heading+yaw/segments;
    const startX=x,startZ=z;
    const advance=(nextX,nextZ,nextHeading)=>{
      const hits=footprintBlocks(nextX,nextZ,nextHeading,obstructed);
      if(hits>contacts)return false;
      x=nextX;z=nextZ;heading=nextHeading;contacts=hits;
      return true;
    };
    const dx=Math.sin(turned)*step,dz=Math.cos(turned)*step;
    if(!advance(x+dx,z+dz,turned)){
      limited=true;
      const forwardX=Math.sin(heading)*step,forwardZ=Math.cos(heading)*step;
      if(!advance(x+forwardX,z+forwardZ,heading)){
        const firstX=Math.abs(forwardX)>Math.abs(forwardZ);
        const slideX=()=>Math.abs(forwardX)>.001&&advance(x+forwardX,z,heading);
        const slideZ=()=>Math.abs(forwardZ)>.001&&advance(x,z+forwardZ,heading);
        if(firstX){ if(!slideX())slideZ(); }
        else if(!slideZ())slideX();
      }
    }
    movement+=Math.hypot(x-startX,z-startZ);
  }
  return {x,z,heading,movement,contacts,limited};
}
