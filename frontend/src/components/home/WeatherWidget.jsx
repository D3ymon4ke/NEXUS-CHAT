import React, { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, MapPin, Sparkles } from 'lucide-react';

export function WeatherWidget() {
  const [weather, setWeather] = useState({
    city: 'Rio de Janeiro',
    temp: 26,
    condition: 'Ensolarado',
    humidity: 65,
    wind: 14,
    code: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchWeather() {
      try {
        // Coordenadas Rio de Janeiro (-22.9068, -43.1729) via Open-Meteo Free API
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America%2FSao_Paulo'
        );
        if (!res.ok) throw new Error('Falha ao buscar clima');
        const data = await res.json();
        if (mounted && data?.current) {
          const code = data.current.weather_code || 0;
          let cond = 'Ensolarado';
          if (code >= 1 && code <= 3) cond = 'Parcialmente Nublado';
          else if (code >= 45 && code <= 48) cond = 'Nevoeiro';
          else if (code >= 51 && code <= 67) cond = 'Chuva Leve';
          else if (code >= 80 && code <= 99) cond = 'Tempestade / Chuva';

          setWeather({
            city: 'Rio de Janeiro',
            temp: Math.round(data.current.temperature_2m),
            condition: cond,
            humidity: data.current.relative_humidity_2m || 65,
            wind: Math.round(data.current.wind_speed_10m || 14),
            code
          });
        }
      } catch (err) {
        // Fallback gracioso estático
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchWeather();
    const timer = setInterval(fetchWeather, 10 * 60 * 1000); // Atualizar a cada 10 minutos
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const getWeatherIcon = (code) => {
    if (code >= 51) return <CloudRain className="w-7 h-7 text-sky-400 animate-pulse" />;
    if (code >= 1) return <Cloud className="w-7 h-7 text-slate-300 animate-pulse" />;
    return <Sun className="w-7 h-7 text-amber-400 animate-spin [animation-duration:20s]" />;
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-700/60 bg-gradient-to-r from-slate-900/95 via-background-dark/95 to-slate-900/95 p-3 relative backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        {/* Esquerda: Ícone & Cidade */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-inner flex items-center justify-center">
            {getWeatherIcon(weather.code)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>{weather.city}, BR</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                Ao Vivo
              </span>
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {weather.condition}
            </span>
          </div>
        </div>

        {/* Direita: Temperatura & Métricas */}
        <div className="flex items-center gap-4 text-right">
          <div className="hidden sm:flex flex-col text-[10px] text-slate-400 font-semibold gap-0.5">
            <span className="flex items-center justify-end gap-1">
              <Droplets className="w-3 h-3 text-sky-400" /> {weather.humidity}%
            </span>
            <span className="flex items-center justify-end gap-1">
              <Wind className="w-3 h-3 text-teal-400" /> {weather.wind} km/h
            </span>
          </div>

          <div className="flex items-start">
            <span className="text-2xl font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
              {weather.temp}
            </span>
            <span className="text-xs font-extrabold text-amber-400 mt-0.5">°C</span>
          </div>
        </div>
      </div>
    </div>
  );
}
