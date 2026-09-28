import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ProbeDevice } from '../types';

interface KenyaLeafletMapProps {
  probes: ProbeDevice[];
  selectedLocation?: string | null;
  onSelectProbe?: (probe: ProbeDevice) => void;
  height?: string;
}

export const KenyaLeafletMap: React.FC<KenyaLeafletMapProps> = ({
  probes,
  selectedLocation,
  onSelectProbe,
  height = '480px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centered explicitly to cover Nairobi to Mombasa corridor: Latitude -2.6000, Longitude 38.2000, Zoom 7
    const map = L.map(mapContainerRef.current, {
      center: [-2.6000, 38.2000],
      zoom: 7,
      minZoom: 5.5,
      maxZoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Free, open-source OpenStreetMap standard tiles with zero API keys or watermarks
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Invalidate map size after mount for accurate rendering and ensure bounds
    setTimeout(() => {
      map.invalidateSize();
      map.setView([-2.6000, 38.2000], 7);
    }, 150);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Two distinct physical sentinel hardware probes matching specification
    const probesList = [
      {
        id: 'probe-1-infinix',
        name: 'Probe 1: Infinix mobility X692-GL',
        locationName: 'Changamwe, Mombasa',
        coords: [-4.0322, 39.6300] as [number, number],
        status: 'Online & Active',
        carrier: 'Safaricom 4G/LTE',
        rssi: -78,
        latency: 22,
        packetLoss: '0.02%',
        compliance: '99.4%',
        health: 'green',
        probeId: 'probe-infinix',
      },
      {
        id: 'probe-2-samsung',
        name: 'Probe 2: Samsung Galaxy A55x',
        locationName: 'Westlands, Nairobi',
        coords: [-1.2675, 36.8120] as [number, number],
        status: 'Online & Active',
        carrier: 'Airtel Kenya 4G',
        rssi: -74,
        latency: 18,
        packetLoss: '0.01%',
        compliance: '99.4%',
        health: 'green',
        probeId: 'probe-samsung',
      },
    ];

    probesList.forEach((probe) => {
      const ringColor = '#059669';
      const pulseColor = 'rgba(5, 150, 105, 0.35)';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${pulseColor}; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: ${ringColor}; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.25);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(probe.coords, { icon: customIcon }).addTo(markersGroup);

      // Popup showing live RSSI, packet loss, and CA Kenya compliance score (99.4%)
      const popupContent = `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px; color: #0f172a; background: #ffffff; border-radius: 8px; min-width: 220px; line-height: 1.5;">
          <div style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span>${probe.name}</span>
          </div>
          <div style="color: #64748b; margin-bottom: 3px;">Location: <span style="color: #0f172a; font-weight: 600;">${probe.locationName}</span></div>
          <div style="color: #64748b; margin-bottom: 3px;">Signal RSSI: <span style="color: #0284c7; font-weight: 700;">${probe.rssi} dBm</span></div>
          <div style="color: #64748b; margin-bottom: 3px;">Ping Latency: <span style="color: #059669; font-weight: 700;">${probe.latency} ms</span></div>
          <div style="color: #64748b; margin-bottom: 3px;">Packet Loss: <span style="color: #334155; font-weight: 600;">${probe.packetLoss}</span></div>
          <div style="color: #64748b; margin-bottom: 6px;">Carrier: <span style="color: #0f172a; font-weight: 600;">${probe.carrier}</span></div>
          <div style="padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: space-between;">
            <span>${probe.status}</span>
            <span>CA Compliance: ${probe.compliance}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-light-popup',
      });

      if (probe.probeId && onSelectProbe) {
        marker.on('click', () => {
          const matched = probes.find((p) => p.id === probe.probeId);
          if (matched) onSelectProbe(matched);
        });
      }
    });

    // Optional deadzone indicator circle over Likoni Channel
    const deadzoneCircle = L.circle([-4.085, 39.66], {
      color: '#f43f5e',
      fillColor: '#f43f5e',
      fillOpacity: 0.2,
      radius: 2000,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(markersGroup);

    deadzoneCircle.bindTooltip('Likoni Micro Dead-Zone Alert (-106 dBm)', {
      permanent: false,
      direction: 'top',
      className: 'custom-leaflet-tooltip',
    });

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200/90 bg-white shadow-xs">
      <div ref={mapContainerRef} style={{ width: '100%', height }} className="z-10" />

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-bold">Kenya Telemetry Probes &amp; QoS</span>
        <span className="text-slate-500 text-[10px] hidden sm:inline">(Lat -2.6°, Lon 38.2° &bull; Nairobi &amp; Coast Corridor)</span>
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 shadow-xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          Probe Signal Health
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Strong 4G (&gt; -85 dBm)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Degraded RSSI (-86 to -95)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Dead-Zone Outage (&lt; -100 dBm)</span>
        </div>
      </div>
    </div>
  );
};
