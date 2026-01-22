"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface QRGeneratorProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

// OPTIMIZED: Lazy load QRCode library (~30KB) only when component is used
export const QRGenerator = ({ 
  value, 
  size = 200, 
  className = '', 
  alt = 'QR Code' 
}: QRGeneratorProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Lazy load QRCode library
        const QRCode = await import('qrcode');
        
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Error al generar código QR');
      } finally {
        setLoading(false);
      }
    };
    
    if (value) {
      generateQR();
    }
  }, [value, size]);
  
  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }
  
  if (!qrDataUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        Sin datos
      </div>
    );
  }
  
  return (
    <Image
      src={qrDataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      unoptimized
    />
  );
};

export default QRGenerator;
