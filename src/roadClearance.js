// Test the whole lot footprint, including places where two footprint corners straddle a road.
export function clearRoadFootprint(isRoad,x,z,width,depth,yaw=0,margin=0){
  const across=width/2+margin,along=depth/2+margin;
  const nx=Math.max(1,Math.ceil(across)),nz=Math.max(1,Math.ceil(along));
  const sin=Math.sin(yaw),cos=Math.cos(yaw);
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const u=across*(2*i/nx-1),v=along*(2*j/nz-1);
    if(isRoad(x+cos*u+sin*v,z-sin*u+cos*v))return false;
  }
  return true;
}
