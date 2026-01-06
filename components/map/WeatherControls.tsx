'use client';

import React from 'react';
import { Cloud, CloudRain, CloudSnow, Sun } from 'lucide-react';
import { useVttStore } from '@/lib/store/vtt-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const WeatherControls = () => {
  const { 
    weatherType, 
    weatherIntensity, 
    setWeatherType, 
    setWeatherIntensity 
  } = useVttStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Weather Controls">
          {weatherType === 'none' && <Sun className="h-5 w-5" />}
          {weatherType === 'rain' && <CloudRain className="h-5 w-5" />}
          {weatherType === 'snow' && <CloudSnow className="h-5 w-5" />}
          {weatherType === 'fog' && <Cloud className="h-5 w-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Weather</h4>
          
          <div className="flex gap-2">
            <Button 
              variant={weatherType === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWeatherType('none')}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button 
              variant={weatherType === 'rain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWeatherType('rain')}
              className="flex-1"
            >
              <CloudRain className="h-4 w-4 mr-2" />
              Rain
            </Button>
            <Button 
              variant={weatherType === 'snow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWeatherType('snow')}
              className="flex-1"
            >
              <CloudSnow className="h-4 w-4 mr-2" />
              Snow
            </Button>
            <Button 
              variant={weatherType === 'fog' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWeatherType('fog')}
              className="flex-1"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Fog
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Intensity</span>
              <span>{Math.round(weatherIntensity * 100)}%</span>
            </div>
            <Slider
              value={[weatherIntensity]}
              onValueChange={([val]) => setWeatherIntensity(val)}
              min={0.1}
              max={1.0}
              step={0.1}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
