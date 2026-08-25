import React, { useEffect } from 'react';

export function WeatherWidget() {
  useEffect(() => {
    // Carrega o script do widget de tempo de forma segura
    const scriptId = 'weather-widget-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://app3.weatherwidget.org/js/?id=ww_215c38aacc48b';
      script.async = true;
      document.body.appendChild(script);
    } else {
      // Re-executa o script se já existia na página
      if (window.__weatherwidget_init) {
        window.__weatherwidget_init();
      }
    }
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-700/60 bg-slate-900/90 p-2">
      <div
        id="ww_215c38aacc48b"
        v="1.3"
        loc="id"
        a='{"t":"horizontal","lang":"pt","sl_lpl":1,"ids":["wl5106"],"font":"Arial","sl_ics":"one_a","sl_sot":"celsius","cl_bkg":"image","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}'
      >
        Mais previsões: <a href="https://tempolongo.com/rio_de_janeiro_tempo_25_dias/" id="ww_215c38aacc48b_u" target="_blank" rel="noreferrer">Weather Rio de Janeiro 30 days</a>
      </div>
    </div>
  );
}
