'use client';

import { useRef, useCallback } from 'react';

export const usePrint = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    // Get the content to print
    const printContent = printRef.current.innerHTML;
    
    // Create the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Venta</title>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
              background: white;
            }
            
            .receipt-print {
              width: 80mm !important;
              margin: 0 auto;
              padding: 5mm;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              
              .receipt-print {
                width: 80mm !important;
                margin: 0 !important;
                padding: 2mm !important;
                font-size: 10px !important;
              }
              
              @page {
                size: 80mm auto;
                margin: 0;
              }
            }
            
            .text-center { text-align: center; }
            .text-xs { font-size: 10px; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 14px; }
            .text-lg { font-size: 16px; }
            .font-bold { font-weight: bold; }
            .mb-1 { margin-bottom: 2px; }
            .mb-2 { margin-bottom: 4px; }
            .mb-8 { margin-bottom: 32px; }
            .mt-2 { margin-top: 4px; }
            .mt-4 { margin-top: 8px; }
            .pb-2 { padding-bottom: 4px; }
            .pt-1 { padding-top: 2px; }
            .pt-2 { padding-top: 4px; }
            .p-8 { padding: 32px; }
            .border { border: 1px solid #000; }
            .border-b { border-bottom: 1px solid #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-dashed { border-style: dashed; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .text-right { text-align: right; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .text-blue-600 { color: #2563eb; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .space-y-1 > * + * { margin-top: 2px; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 32px; }
            .w-full { width: 100%; }
            .w-64 { width: 16rem; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .table { display: table; width: 100%; border-collapse: collapse; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    // Copy existing styles from the current document into the print window
    const head = printWindow.document.head;
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const newLink = printWindow.document.createElement('link');
      newLink.setAttribute('rel', 'stylesheet');
      newLink.setAttribute('href', (link as HTMLLinkElement).href);
      head.appendChild(newLink);
    });
    document.querySelectorAll('style').forEach((style) => {
      const newStyle = printWindow.document.createElement('style');
      newStyle.textContent = style.textContent;
      head.appendChild(newStyle);
    });
    
    printWindow.document.close();
    
    // Wait for content/styles to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }, []);

  const handlePrintThermal = useCallback(() => {
    if (!printRef.current) return;

    // For thermal printers, we can use the Web Serial API if available
    // or fall back to regular printing with thermal-specific styles
    
    if ('serial' in navigator) {
      // Web Serial API is available - could implement direct thermal printing
      console.log('Web Serial API available for thermal printing');
    }
    
    // Fallback to regular print with thermal-optimized styles
    handlePrint();
  }, [handlePrint]);

  return {
    printRef,
    handlePrint,
    handlePrintThermal
  };
};

export default usePrint;