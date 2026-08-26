import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Sun, CloudRain, Wind, MapPin } from 'lucide-react';

export function WeatherWidget() {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let script = null;
    try {
      const widgetDiv = document.getElementById('ww_215c38aacc48b');
      if (widgetDiv) {
        script = document.createElement('script');
        script.src = 'https://app3.weatherwidget.org/js/?id=ww_215c38aacc48b';
        script.async = true;
        script.onerror = () => setLoadError(true);
        document.body.appendChild(script);
      }
    } catch (err) {
      console.warn('Widget de clima externo indisponível:', err);
      setLoadError(true);
    }

    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 bg-slate-900/90 min-h-[90px] flex items-center justify-center relative p-2">
      <div
        id="ww_215c38aacc48b"
        v="1.3"
        loc="id"
        a='{"t":"horizontal","lang":"pt","sl_lpl":1,"ids":["wl5106"],"font":"Arial","sl_ics":"one_a","sl_sot":"celsius","cl_bkg":"image","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}'
        className="w-full text-center"
      >
        <div className="flex items-center justify-center gap-3 py-2 text-slate-300">
          <Sun className="w-6 h-6 text-amber-400 animate-spin [animation-duration:12s]" />
          <div className="text-left">
            <div className="flex items-center gap-1 text-xs font-bold text-white">
              <MapPin className="w-3 h-3 text-brand-400" />
              <span>Rio de Janeiro, BR • 26°C</span>
            </div>
            <span className="text-[10px] text-slate-400">Tempo Limpo & Conectado ao Nexus</span>
          </div>
        </div>
        <a href="https://tempolongo.com/rio_de_janeiro_tempo_25_dias/" id="ww_215c38aacc48b_u" target="_blank" rel="noreferrer" className="hidden">
          Weather Rio de Janeiro
        </a>
      </div>
    </div>
  );
}
