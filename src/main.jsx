import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Check, CircleHelp, Crosshair, ExternalLink, LocateFixed, Minus, Plane, Plus, Radio, RefreshCw, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';

// Change this location to choose the initial radar view.
const HOME = { name: 'Netherlands', lat: 52.15, lon: 5.3, zoom: 7 };
const REFRESH_MS = 15000;
const number = (value, suffix = '') => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value).toLocaleString()}${suffix}` : '—';
const flightName = (flight) => flight.flight?.trim() || flight.r || flight.hex?.toUpperCase() || 'Unknown';
const planeSvg = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 1.1c.8 0 1.35.8 1.47 1.9l.44 5.01 7.79 5.41v2.21l-7.55-2.63.32 5.29 2.45 1.8v1.62L12 20.39l-4.92 1.32v-1.62l2.45-1.8.32-5.29-7.55 2.63v-2.21l7.79-5.41.44-5.01C10.65 1.9 11.2 1.1 12 1.1Z"/></svg>`;

function markerIcon(flight, selected) {
  return L.divIcon({
    className: 'plane-marker-wrap',
    html: `<div class="plane-marker ${selected ? 'selected' : ''}" style="transform:rotate(${Number(flight.track) || 0}deg)">${planeSvg}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function MapEvents({ onViewChange, mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  useMapEvents({
    moveend: () => onViewChange(map),
    zoomend: () => onViewChange(map),
  });
  return null;
}

function App() {
  const mapRef = useRef(null);
  const requestId = useRef(0);
  const [query, setQuery] = useState('');
  const [flights, setFlights] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const [view, setView] = useState({ lat: HOME.lat, lon: HOME.lon, radius: 150 });
  const [clock, setClock] = useState(new Date());
  const [showInfo, setShowInfo] = useState(false);

  const updateView = useCallback((map) => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    // The provider supports a maximum radius of 250 nautical miles.
    const radius = Math.max(10, Math.min(250, Math.ceil(center.distanceTo(bounds.getNorthEast()) / 1852)));
    setView({ lat: center.lat, lon: center.lng, radius });
  }, []);

  const loadFlights = useCallback(async (signal) => {
    const id = ++requestId.current;
    try {
      const response = await fetch(`/api/point/${view.lat.toFixed(3)}/${view.lon.toFixed(3)}/${view.radius}`, { signal });
      if (!response.ok) throw new Error(`Flight feed returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.ac)) throw new Error('Flight feed returned an unexpected response');
      if (id !== requestId.current) return;
      setFlights(data.ac.filter((flight) => Number.isFinite(flight.lat) && Number.isFinite(flight.lon)));
      setStatus('live');
      setError('');
      setUpdated(new Date());
    } catch (err) {
      if (err.name === 'AbortError' || id !== requestId.current) return;
      console.error('Unable to load aircraft:', err);
      setStatus('error');
      setError(err.message);
    }
  }, [view]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    const timeout = setTimeout(() => loadFlights(controller.signal), 300);
    const interval = setInterval(() => loadFlights(controller.signal), REFRESH_MS);
    return () => { controller.abort(); clearTimeout(timeout); clearInterval(interval); };
  }, [loadFlights]);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return flights.filter((flight) => !search || [flight.flight, flight.r, flight.hex, flight.t].some((value) => value?.toLowerCase().includes(search)))
      .sort((a, b) => flightName(a).localeCompare(flightName(b)));
  }, [flights, query]);
  const selected = flights.find((flight) => flight.hex === selectedId);
  const selectFlight = (flight) => {
    setSelectedId(flight.hex);
    mapRef.current?.panTo([flight.lat, flight.lon], { animate: true });
  };
  const resetMap = () => mapRef.current?.setView([HOME.lat, HOME.lon], HOME.zoom);
  const utc = clock.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><span></span><i></i></div><div><strong>northstar<span>.</span></strong><small>FLIGHT RADAR</small></div></div>
        <div className="header-divider"></div>
        <div className="header-title">Airspace overview <span> / </span> <b>Live radar</b></div>
        <div className="header-right">
          <div className="header-time"><span>UTC</span> {utc}</div>
          <div className={`connection ${status}`}><span></span>{status === 'live' ? 'System online' : status === 'loading' ? 'Connecting' : 'Feed unavailable'}</div>
          <button className="help-button" onClick={() => setShowInfo(!showInfo)} aria-label="About this radar"><CircleHelp size={18}/></button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="section-kicker"><span>YOUR AIRSPACE</span><Radio size={15}/></div>
            <h1>Eyes on the sky<span>.</span></h1>
            <p>Follow the flights crossing your corner of the world.</p>
            <div className="region-box">
              <div className="region-icon"><LocateFixed size={18}/></div>
              <div><small>Home region</small><strong>{HOME.name}</strong></div>
              <button onClick={resetMap} aria-label="Reset to Netherlands" title="Reset to Netherlands"><Crosshair size={16}/></button>
            </div>
          </div>
          <div className="traffic-heading"><div><span className="eyebrow">LIVE TRAFFIC</span><h2>Aircraft <span>{filtered.length}</span></h2></div><Activity size={18}/></div>
          <div className="search-wrap"><Search size={16}/><input aria-label="Search aircraft" placeholder="Search callsign, registration..." value={query} onChange={(event) => setQuery(event.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</div>
          <div className="list-label"><span>CALLSIGN / AIRCRAFT</span><span>ALTITUDE</span></div>
          <div className="flight-list">
            {filtered.slice(0, 100).map((flight) => <button className={`flight-row ${selectedId === flight.hex ? 'active' : ''}`} key={flight.hex} onClick={() => selectFlight(flight)}>
              <div className="row-plane"><Plane size={16}/></div><div className="row-name"><strong>{flightName(flight)}</strong><small>{flight.t || flight.r || 'Aircraft'}</small></div><div className="row-alt"><strong>{flight.alt_baro === 'ground' ? 'Ground' : number(flight.alt_baro, ' ft')}</strong><small>{number(flight.gs, ' kts')}</small></div>
            </button>)}
            {filtered.length === 0 && <div className="empty-list">{status === 'loading' ? 'Finding aircraft in this area…' : status === 'error' ? 'The flight feed is unavailable. Try refreshing.' : query ? 'No aircraft match your search.' : 'No aircraft found in this area.'}</div>}
            {filtered.length > 100 && <div className="list-more">Showing 100 of {filtered.length} aircraft. Search to narrow the list.</div>}
          </div>
          <div className="sidebar-bottom"><span className="pulse-dot"></span><span>Data by <a href="https://adsb.lol/" target="_blank" rel="noreferrer">adsb.lol <ExternalLink size={10}/></a></span><span className="bottom-separator"></span><span>Updates every 15s</span></div>
        </aside>

        <section className="map-section" aria-label="Live flight map">
          <MapContainer center={[HOME.lat, HOME.lon]} zoom={HOME.zoom} zoomControl={false} minZoom={4} maxZoom={13} className="map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents onViewChange={updateView} mapRef={mapRef}/>
            {filtered.map((flight) => <Marker key={flight.hex} position={[flight.lat, flight.lon]} icon={markerIcon(flight, selectedId === flight.hex)} eventHandlers={{ click: () => setSelectedId(flight.hex) }} />)}
          </MapContainer>
          <div className="map-shade"></div>
          <div className="radar-visual" aria-hidden="true"><div className="radar-ring ring-one"></div><div className="radar-ring ring-two"></div><div className="radar-ring ring-three"></div><div className="radar-axis horizontal"></div><div className="radar-axis vertical"></div><div className="radar-sweep"></div><div className="radar-center"></div><span className="compass-n">N</span></div>
          <div className="map-heading"><div className="map-heading-icon"><Radio size={18}/></div><div><span>LIVE AIRSPACE</span><strong>Radar overview</strong></div><span className="live-tag"><i></i> {status === 'live' ? 'LIVE' : status === 'loading' ? 'LOADING' : 'OFFLINE'}</span></div>
          <div className="map-top-right"><span className="coordinate-label">RADAR CENTER</span><strong>{Math.abs(view.lat).toFixed(2)}° {view.lat >= 0 ? 'N' : 'S'} <span>/</span> {Math.abs(view.lon).toFixed(2)}° {view.lon >= 0 ? 'E' : 'W'}</strong></div>
          {status === 'error' && <div className="error-banner"><span>Live data unavailable: {error}. {updated ? 'Showing the last successful update.' : 'Check your connection and retry.'}</span><button onClick={() => loadFlights()}>Retry</button></div>}
          {showInfo && <div className="info-popover"><button onClick={() => setShowInfo(false)} aria-label="Close"><X size={15}/></button><strong>About Northstar</strong><p>Live aircraft positions are supplied by adsb.lol and may be incomplete or delayed. Not for navigation.</p><p>Pan or zoom to explore another area. The radar refreshes automatically.</p></div>}
          <div className="map-controls"><button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in"><Plus size={18}/></button><button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out"><Minus size={18}/></button><span></span><button onClick={resetMap} aria-label="Reset map view"><LocateFixed size={18}/></button></div>
          <div className="map-bottom-left"><span className="map-key"><i></i> AIRCRAFT POSITION</span><span className="map-key selected-key"><i></i> SELECTED AIRCRAFT</span></div>
          <div className="map-bottom-right"><span>LAST UPDATE</span><strong>{updated ? updated.toLocaleTimeString('en-GB', { timeZone: 'UTC' }) + ' UTC' : 'Waiting for data'}</strong><button onClick={() => loadFlights()} aria-label="Refresh aircraft"><RefreshCw size={15}/></button></div>
          {selected && <div className="detail-card">
            <div className="detail-top"><div><span className="eyebrow">AIRCRAFT DETAILS</span><h2>{flightName(selected)}</h2><p>{selected.t || 'Aircraft type unavailable'} <span> / </span> {selected.r || selected.hex?.toUpperCase()}</p></div><button onClick={() => setSelectedId(null)} aria-label="Close aircraft details"><X size={17}/></button></div>
            <div className="detail-flight-icon"><Plane size={26}/><span>TRACKING AIRCRAFT</span><span className="detail-live"><i></i> LIVE</span></div>
            <div className="detail-grid"><div><span>Altitude</span><strong>{selected.alt_baro === 'ground' ? 'Ground' : number(selected.alt_baro, ' ft')}</strong></div><div><span>Ground speed</span><strong>{number(selected.gs, ' kts')}</strong></div><div><span>Heading</span><strong>{number(selected.track, '°')}</strong></div><div><span>Vertical rate</span><strong>{number(selected.baro_rate, ' ft/min')}</strong></div></div>
            <div className="detail-footer"><span>ICAO <b>{selected.hex?.toUpperCase()}</b></span><span>ADS-B position <Check size={13}/></span></div>
          </div>}
          {!selected && <div className="map-hint"><div className="hint-icon"><Crosshair size={18}/></div><div><strong>Every dot has a story.</strong><span>Select an aircraft to see flight details.</span></div></div>}
          <div className="map-footnote">For informational use only. Not for navigation.</div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
