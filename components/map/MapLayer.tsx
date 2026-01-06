'use client';

import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';

interface MapLayerProps {
  url: string | null;
}

export const MapLayer: React.FC<MapLayerProps> = ({ url }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const setMapDimensions = useVttStore((state) => state.setMapDimensions);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImage(img);
      setMapDimensions({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      console.error('Failed to load map image:', url);
    };
  }, [url, setMapDimensions]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      width={image.width}
      height={image.height}
    />
  );
};
