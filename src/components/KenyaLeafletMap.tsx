import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FraudSpot } from '../types';

interface KenyaLeafletMapProps {
  hotspots: FraudSpot[];
  selectedCounty?: string | null;
  onSelect?: (county: string) => void;
  title: string;
  legendMany: string;
  legendSome: string;
  legendOne: string;
  height?: string;
}

function pinStyle(count: number): { radius: number; color: string } {
  if (count >= 5) return { radius: 26, color: '#9f1239' };
  if (count >= 2) return { radius: 18, color: '#e11d48' };
  return { radius: 12, color: '#d97706' };
}

export const KenyaLeafletMap: React.FC<KenyaLeafletMapProps> = ({
  hotspots,
  selectedCounty,
  onSelect,
  title,
  legendMany,
  legendSome,
  legendOne,
  height = '480px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [-0.5, 37.9],
      zoom: 6,
      minZoom: 5.5,
      maxZoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const timer = window.setTimeout(() => {
      if (mapInstanceRef.current !== map) return;
      map.invalidateSize();
      map.setView([-0.5, 37.9], 6);
    }, 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markersGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = markersGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;
    group.clearLayers();
    hotspots.forEach((spot) => {
      const style = pinStyle(spot.count);
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: style.radius,
        color: selectedCounty === spot.county ? '#0f172a' : style.color,
        weight: selectedCounty === spot.county ? 3 : 1,
        fillColor: style.color,
        fillOpacity: 0.85,
      });
      const paybill = spot.latestPaybill ? `<br/>Paybill ${spot.latestPaybill}` : '';
      marker.bindPopup(`<strong>${spot.county}</strong><br/>${spot.count}${paybill}`);
      marker.on('click', () => onSelectRef.current?.(spot.county));
      marker.addTo(group);
    });
    const chosen = hotspots.find((spot) => spot.county === selectedCounty);
    if (chosen) map.flyTo([chosen.lat, chosen.lng], 8);
  }, [hotspots, selectedCounty]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200/90 bg-white shadow-xs">
      <div ref={mapContainerRef} style={{ width: '100%', height }} className="z-10" />

      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
        <span className="font-bold">{title} ({hotspots.length})</span>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#9f1239]"></span>
          <span>{legendMany}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#e11d48]"></span>
          <span>{legendSome}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
          <span>{legendOne}</span>
        </div>
      </div>
    </div>
  );
};
