import React, {useEffect,useRef,useState} from 'react';
import {parkingParcels,startNightDrive} from './city';
import {garageParcels} from './garages';
import {airport,lake} from './region';
import {expressZ,shoreLink} from './expressway';
import './night.css';

const initial={speed:0,reverse:false,heading:0,x:-7.05,z:25,lights:true,onFreeway:false};
function Key({children}) { return <kbd>{children}</kbd>; }

function Map({motion}) {
  const canvas=useRef(null);
  useEffect(()=>{
    const ctx=canvas.current.getContext('2d');
    ctx.clearRect(0,0,172,172);
    ctx.fillStyle='#090f20';
    ctx.fillRect(0,0,172,172);
    const regional=motion.x>318||motion.aircraft;
    const scale=regional?.083:65/304;
    const worldX=x=>86-(x-(regional?462:0))*scale;
    const worldZ=z=>86-(z-(regional?48:0))*scale;
    const line=(x1,z1,x2,z2)=>{
      ctx.beginPath();ctx.moveTo(worldX(x1),worldZ(z1));ctx.lineTo(worldX(x2),worldZ(z2));ctx.stroke();
    };
    ctx.strokeStyle='#5b719b';
    ctx.lineWidth=2;
    for(let i=-4;i<=4;i++){
      line(i*76,-304,i*76,304);
      line(-304,i*76,304,i*76);
    }
    ctx.strokeStyle=motion.onFreeway?'#b2ffd4':'#68afce';
    ctx.lineWidth=motion.onFreeway?3.5:2;
    line(152,-279,152,279);
    ctx.strokeStyle=motion.linkRoute?'#adf9df':'#73a9c1';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(worldX(shoreLink.west),worldZ(expressZ(shoreLink.west)));
    for(let x=shoreLink.west;x<shoreLink.east;x+=7)ctx.lineTo(worldX(x),worldZ(expressZ(x)));
    ctx.stroke();
    ctx.strokeStyle='#7c9fa5';ctx.lineWidth=1;
    line(304,0,1001,0);
    if(regional){
      ctx.strokeStyle='#506477';
      for(const x of [382,465,548,631,714,797,880])line(x,0,x,-415);
      for(const z of [-83,-166,-249,-332,-415])line(382,z,880,z);
      ctx.fillStyle='#2a5970';
      ctx.beginPath();ctx.ellipse(worldX(lake.x),worldZ(lake.z),lake.rx*scale,lake.rz*scale,0,0,2*Math.PI);ctx.fill();
      ctx.strokeStyle='#87b5b6';
      ctx.beginPath();ctx.ellipse(worldX(lake.x),worldZ(lake.z),213*scale,174*scale,0,0,2*Math.PI);ctx.stroke();
      ctx.strokeStyle='#7f9fb7';ctx.lineWidth=3;
      line(airport.x,airport.runwayStart,airport.x,airport.runwayEnd);
      ctx.font='bold 9px sans-serif';ctx.fillStyle='#b7edff';ctx.textAlign='center';
      ctx.fillText('FIELD',worldX(airport.x)-7,worldZ(80));
      ctx.fillText('LAKE',worldX(lake.x),worldZ(lake.z)+3);
    }
    ctx.strokeStyle='#b09eff';
    ctx.lineWidth=.8;
    ctx.beginPath();
    ctx.arc(86,86,76,0,Math.PI*2);
    ctx.stroke();
    ctx.font='bold 11px sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    for(const [i,j] of regional?[]:[...parkingParcels,...garageParcels]){
      const x=worldX((i+.5)*76),z=worldZ((j+.5)*76);
      ctx.fillStyle='#18385a';ctx.fillRect(x-5.6,z-6,11.2,12);
      ctx.fillStyle='#a6dcff';ctx.fillText('P',x,z+.5);
    }
    ctx.save();
    ctx.translate(Math.max(9,Math.min(163,worldX(motion.x))),Math.max(9,Math.min(163,worldZ(motion.z))));
    ctx.rotate(-motion.heading);
    ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();
    ctx.fillStyle='#abfdff';ctx.shadowColor='#85edff';ctx.shadowBlur=9;ctx.fill();ctx.restore();
  },[motion]);
  return <canvas className="night-map" ref={canvas} width="172" height="172" aria-label="Rainport map showing downtown, public parking, lake and airport" role="img" />;
}

export default function NightDrive(){
  const screen=useRef(null),host=useRef(null),game=useRef(null);
  const [motion,setMotion]=useState(initial);
  const [status,setStatus]=useState('loading');
  const [camera,setCamera]=useState('Chase');
  const [paused,setPaused]=useState(false);
  const [photoMode,setPhotoMode]=useState(false);
  const [photoControls,setPhotoControls]=useState(true);
  useEffect(()=>{
    if(!photoMode)return;
    const toggle=event=>{
      if(event.code==='KeyH'&&!event.repeat)setPhotoControls(show=>!show);
    };
    window.addEventListener('keydown',toggle);
    return ()=>window.removeEventListener('keydown',toggle);
  },[photoMode]);
  const [fullscreen,setFullscreen]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    setStatus('loading');
    setMotion(initial);
    setCamera('Chase');
    setPaused(false);
    setPhotoMode(false);
    try { game.current=startNightDrive(host.current,{status:setStatus,telemetry:setMotion,cameraChanged:setCamera,pauseChanged:setPaused,photoChanged:enabled=>{
      setPhotoMode(enabled);
      setPhotoControls(true);
    }}); }
    catch { setStatus('webgl'); }
    const change=()=>setFullscreen(document.fullscreenElement===screen.current);
    document.addEventListener('fullscreenchange',change);
    return ()=>{
      game.current?.dispose();game.current=null;
      document.removeEventListener('fullscreenchange',change);
    };
  },[attempt]);

  const hold=action=>({
    onPointerDown(event){
      event.currentTarget.setPointerCapture(event.pointerId);
      game.current?.input(action,true);
    },
    onPointerUp(){game.current?.input(action,false);},
    onPointerCancel(){game.current?.input(action,false);},
    onLostPointerCapture(){game.current?.input(action,false);},
    onKeyDown(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();game.current?.input(action,true);}},
    onKeyUp(event){if(event.key==='Enter'||event.key===' ')game.current?.input(action,false);},
    onBlur(){game.current?.input(action,false);},
  });
  const flying=motion.aircraft;
  const helicopter=flying==='helicopter';
  return <main className="night" ref={screen}>
    <div ref={host} className="night-scene" />
    {!photoMode&&<>
    <header className="night-top">
      <div className="night-title"><i/><div><span>INTEGRA</span><h1>Rainport Night Drive</h1></div></div>
      <nav aria-label="Game controls">
        <button onClick={()=>game.current?.togglePause()} aria-pressed={paused} title="Pause or resume (P)">{paused?'Resume':'Pause'}</button>
        <button disabled={paused} onClick={()=>game.current?.selectCamera()} title="Change camera (C)">{camera}</button>
        <button disabled={paused} onClick={()=>game.current?.toggleLight()} aria-pressed={motion.lights} title="Toggle headlights (L)">Lights</button>
        <button disabled={paused} onClick={()=>game.current?.beginFreeway()} title="Start near the freeway ramp (F)">R-5 Ramp</button>
        <button disabled={paused} onClick={()=>game.current?.beginGarage()} title="Start at the public garage (G)">Garage</button>
        <button disabled={paused} onClick={()=>game.current?.beginLink()} title="Start on the Shore Link expressway (Y)">Shore Link</button>
        <button disabled={paused} onClick={()=>game.current?.beginSuburbs()} title="Enter the suburb from village center (N)">Suburbs</button>
        <button disabled={paused} onClick={()=>game.current?.beginShore()} title="Start on the lakeshore road (B)">Lakeshore</button>
        <button disabled={paused} onClick={()=>game.current?.beginAirport()} title="Drive to Rainport Field (T)">Airport</button>
        <button disabled={paused} onClick={()=>game.current?.beginFlight('plane')} aria-pressed={flying==='plane'} title="Fly the trainer (1)">Plane</button>
        <button disabled={paused} onClick={()=>game.current?.beginFlight('helicopter')} aria-pressed={helicopter} title="Fly the helicopter (2)">Helicopter</button>
        {!flying&&<button disabled={paused} onClick={()=>game.current?.recover()} title="Return to the last clear road position (U)">Unstuck</button>}
        <button disabled={paused} onClick={()=>game.current?.reset()} title="Return downtown (R)">Downtown</button>
        {document.fullscreenEnabled && <button onClick={()=>{const operation=fullscreen?document.exitFullscreen():screen.current.requestFullscreen(); operation.catch(()=>{});}}>{fullscreen?'Exit fullscreen':'Fullscreen'}</button>}
        <a href="?showroom">Showroom</a>
      </nav>
    </header>

    <div className="night-instruments">
      <div className="night-speed">
        <span>{flying?(motion.airborne?'AIR':'GND'):motion.reverse?'R':'D'}</span>
        <strong>{String(motion.speed).padStart(2,'0')}</strong>
        <small>KM/H
          {motion.onFreeway&&<span className="night-route">{motion.linkRoute?'SHORE LINK':'R-5'}</span>}
          {flying&&<span className="night-route">{motion.altitude} M AGL{!helicopter&&' · '+motion.throttle+'%'}</span>}
        </small>
      </div>
      <div className="night-desktop">{flying
        ? helicopter
          ? <><span><Key>W</Key><Key>S</Key> Forward / back</span><span><Key>A</Key><Key>D</Key> Turn</span><span><Key>Space</Key> Climb <Key>Shift</Key> Descend</span></>
          : <><span><Key>W</Key><Key>S</Key> Throttle</span><span><Key>↑</Key><Key>↓</Key> Pitch</span><span><Key>A</Key><Key>D</Key> Turn</span><span><Key>Space</Key> Brake</span></>
        : <><span><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key> Drive</span><span><Key>Space</Key> Brake</span><span>Drag to look</span></>}
      </div>
      <Map motion={motion} />
    </div>

    <div className="night-touch" hidden={paused}>
      <div><button {...hold('left')} aria-label="Steer left">◀</button><button {...hold('right')} aria-label="Steer right">▶</button></div>
      {flying
        ? <div>
            <button {...hold('down')} aria-label={helicopter?'Move backwards':'Decrease throttle'}>−</button>
            <button {...hold('up')} aria-label={helicopter?'Move forward':'Increase throttle'}>+</button>
            <button {...hold(helicopter?'descend':'noseDown')} aria-label={helicopter?'Descend':'Lower nose'}>↓</button>
            <button {...hold(helicopter?'climb':'noseUp')} aria-label={helicopter?'Climb':'Raise nose'}>↑</button>
          </div>
        : <div><button {...hold('down')} aria-label="Reverse">R</button><button {...hold('brake')} aria-label="Brake">Brake</button><button {...hold('up')} aria-label="Accelerate">▲</button></div>}
    </div>

    {paused&&<aside className="night-message night-pause" role="status">
      <strong>Paused</strong>
      <button onClick={()=>game.current?.togglePhoto()} title="Enter Photo Mode (O)">Photo Mode</button>
      <span>Press <Key>P</Key> or select Resume</span>
    </aside>}
    {!paused&&motion.recovered&&<div className="night-recovered" role="status">Returned to a clear position</div>}
    {!paused&&status!=='ready' && <aside className="night-message" role={status==='loading'?'status':'alert'}>
      {status==='loading'?'Loading your Integra…':status==='webgl'?'WebGL is unavailable in this browser.':'The Integra model couldn’t load.'}
      {status!=='loading' && <button onClick={()=>setAttempt(n=>n+1)}>Retry</button>}
    </aside>}
    </>}
    {photoMode&&photoControls&&<aside className="night-photo-controls" aria-label="Photo Mode controls">
      <button onClick={()=>game.current?.togglePhoto()}>Exit Photo Mode</button>
      <button onClick={()=>game.current?.zoomPhoto(-.16)} aria-label="Zoom in">+</button>
      <button onClick={()=>game.current?.zoomPhoto(.16)} aria-label="Zoom out">−</button>
      <span>Drag to orbit · Scroll to zoom · <Key>H</Key> Hide controls</span>
    </aside>}
  </main>;
}
