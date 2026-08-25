import React, { useEffect, useRef } from 'react';

export function WeatherWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    try {
      const scriptId = 'weather-widget-script';
      const existingScript = document.getElementById(scriptId);

      if (!existingScript) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://app3.weatherwidget.org/js/?id=ww_215c38aacc48b';
        script.async = true;
        document.body.appendChild(script);
      } else {
        if (typeof window !== 'undefined' && window.__weatherwidget_init) {
          window.__weatherwidget_init();
        }
      }
    } catch (err) {
      console.warn('Erro ao inicializar widget de clima:', err);
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-700/50 bg-slate-900/90 min-h-[100px] flex items-center justify-center relative">
      <div
        id="ww_215c38aacc48b"
        v="1.3"
        loc="id"
        a='{"t":"horizontal","lang":"pt","sl_lpl":1,"ids":["wl5106"],"font":"Arial","sl_ics":"one_a","sl_sot":"celsius","cl_bkg":"image","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}'
        className="w-full text-center"
      >
        <span className="text-xs text-slate-400">Carregando previsão do tempo...</span>
        <a href="https://tempolongo.com/rio_de_janeiro_tempo_25_dias/" id="ww_215c38aacc48b_u" target="_blank" rel="noreferrer" className="hidden">
          Weather Rio de Janeiro
        </a>
      </div>
    </div>
  );
}
