import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createViewer, modelURL } from './viewer';
import { references } from './references';
import './styles.css';
import NightDrive from './NightDrive';

const icons = {
  compare: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/></>,
  orbit: <><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-27 12 12)"/><circle cx="12" cy="12" r="3"/></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></>,
  expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>,
  collapse: <path d="M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5"/>,
  reset: <><path d="M4 10a8 8 0 1 1 1.8 7.4M4 5v5h5"/></>,
  mouse: <><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="m8 7 2-3h4l2 3"/><circle cx="12" cy="13" r="3"/></>,
  light: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5m8 4.5v9"/></>,
  spin: <><path d="M4 12a8 8 0 0 1 14-5l2 2m0-5v5h-5m5 3a8 8 0 0 1-14 5l-2-2m0 5v-5h5"/></>,
  mesh: <><path d="m12 3 9 17H3L12 3Zm0 0v17M3 20l13.5-8.5M21 20 7.5 11.5"/></>,
};

function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function ControlGroup({ title, icon, children }) {
  return <section className="control-group">
    <h2><Icon name={icon} />{title}</h2>
    <div className="choices">{children}</div>
  </section>;
}

function Pill({ selected, onClick, children, icon }) {
  return <button type="button" className="pill" aria-pressed={selected} onClick={onClick}>
    {icon && <Icon name={icon} size={15} />}{children}
  </button>;
}

function App() {
  const host = useRef(null);
  const stage = useRef(null);
  const viewer = useRef(null);
  const [referenceIndex, setReferenceIndex] = useState(null);
  const reference = references[referenceIndex];
  const [camera, setCamera] = useState('Front');
  const [studio, setStudio] = useState('Softbox');
  const [spin, setSpin] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [status, setStatus] = useState('loading');
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus('loading');
    try {
      viewer.current = createViewer(host.current, setStatus, () => {
        setCamera(null);
        setSpin(false);
        viewer.current?.spin(false);
      });
    } catch {
      setStatus('error');
    }
    return () => { viewer.current?.dispose(); viewer.current = null; };
  }, [attempt]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  function selectCamera(name) {
    viewer.current?.spin(false);
    viewer.current?.camera(name);
    setSpin(false);
    setCamera(name);
  }

  function selectReference(index) {
    setReferenceIndex(index);
    setSpin(false);
    setWireframe(false);
    viewer.current?.wireframe(false);
    viewer.current?.compare(references[index]);
    if (index === null) {
      setCamera('Front');
      viewer.current?.studio(studio);
    }
  }

  function reset() {
    if (reference) { selectReference(null); return; }
    selectCamera('Front');
    viewer.current?.studio('Softbox');
    viewer.current?.wireframe(false);
    setStudio('Softbox');
    setWireframe(false);
  }

  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else await stage.current.requestFullscreen();
    } catch { setFullscreenError(true); }
  }

  return <div className="shell">
    <header className="masthead">
      <div className="brand"><span className="brand-mark"><Icon name="orbit" size={23} /></span><span>INTEGRA<span className="brand-divider">/</span>STUDIO</span></div>
      <div className="header-actions">
      <a className="download" href="./">Night Drive</a>
      <button type="button" className="download compare-toggle" aria-pressed={!!reference} onClick={() => selectReference(reference ? null : 1)}><Icon name="compare" size={17} /><span>Compare photos</span></button>
      <a className="download" href={modelURL} download="Acura Integra A-Spec.glb"><Icon name="download" size={17} /><span>Download GLB</span></a>
      </div>
    </header>

    <main>
      <div className="intro">
        <div>
          <p className="eyebrow"><span /> ACURA · A-SPEC</p>
          <h1>Integra<span>.</span></h1>
        </div>
        <div className="finish"><i aria-hidden="true" /><div><span>EXTERIOR FINISH</span><strong>Metallic gray</strong></div></div>
      </div>

      {reference && <section className="reference-controls" aria-label="Reference views">
        {references.map(({ name }, index) => <Pill key={name} selected={referenceIndex === index} onClick={() => selectReference(index)}>{name}</Pill>)}
      </section>}
      <div className={reference ? 'comparison-grid' : undefined} style={reference ? { '--reference-aspect': reference.aspect } : undefined}>
      <section ref={stage} className={`stage studio-${studio.toLowerCase()}`} aria-label="Integra 3D showroom">
        <div className="stage-grid" aria-hidden="true" />
        <div className="stage-guide" aria-hidden="true" />
        <div className="canvas-host" ref={host} />
        <div className="stage-top">
          <span className="view-label"><Icon name="cube" size={16} /> {reference ? '3D MODEL' : '3D VIEWPORT'}</span>
          {!reference && <div className="stage-actions">
            <button type="button" onClick={reset} aria-label="Reset showroom" title="Reset showroom"><Icon name="reset" /></button>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen' : 'Full screen'}><Icon name={fullscreen ? 'collapse' : 'expand'} /></button>
          </div>}
        </div>
        {!reference && <div className="stage-bottom"><span><Icon name="mouse" size={16} /> <span className="desktop-hint">Drag to orbit · Scroll to zoom</span><span className="touch-hint">Drag to orbit · Pinch to zoom</span></span><span>{camera ? `${camera.toUpperCase()} VIEW` : 'FREE ORBIT'}</span></div>}
        {status === 'loading' && <div className="stage-message" role="status"><div className="loader" />Loading 3D model</div>}
        {status === 'error' && <div className="stage-message" role="alert">The 3D model couldn’t load.<button className="pill" onClick={() => { selectReference(null); setCamera('Front'); setStudio('Softbox'); setSpin(false); setWireframe(false); setAttempt(value => value + 1); }}>Try again</button></div>}
        {fullscreenError && <div className="stage-message" role="status" onClick={() => setFullscreenError(false)}>Full screen isn’t available here.<button className="pill" onClick={() => setFullscreenError(false)}>Dismiss</button></div>}
      </section>
      {reference && <figure className="reference-photo">
        <img src={import.meta.env.BASE_URL + reference.file} alt={reference.name + ' view from your original Integra photos'} />
        <figcaption className="view-label">ORIGINAL PHOTO</figcaption>
      </figure>}
      </div>

      {!reference && <div className="controls">
        <ControlGroup title="Camera" icon="camera">
          {['Front', 'Side', 'Rear', 'Top'].map(name => <Pill key={name} selected={camera === name} onClick={() => selectCamera(name)}>{name}</Pill>)}
        </ControlGroup>
        <ControlGroup title="Lighting" icon="light">
          {['Softbox', 'Daylight', 'Night'].map(name => <Pill key={name} selected={studio === name} onClick={() => { viewer.current?.studio(name); setStudio(name); }}>{name}</Pill>)}
        </ControlGroup>
        <ControlGroup title="Display" icon="cube">
          <Pill icon="spin" selected={spin} onClick={() => { viewer.current?.spin(!spin); if (!spin) setCamera(null); setSpin(!spin); }}>Auto spin</Pill>
          <Pill icon="mesh" selected={wireframe} onClick={() => { viewer.current?.wireframe(!wireframe); setWireframe(!wireframe); }}>Wireframe</Pill>
        </ControlGroup>
      </div>}
    </main>
  </div>;
}

const showroom = new URLSearchParams(window.location.search).has('showroom');
if (!showroom) document.title = 'Rainport Night Drive';
createRoot(document.getElementById('root')).render(showroom ? <App /> : <NightDrive />);
