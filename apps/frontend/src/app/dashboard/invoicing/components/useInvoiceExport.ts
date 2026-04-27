'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import usePrint from '@/hooks/usePrint';

export function useInvoiceExport() {
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const { printRef, handlePrint } = usePrint();
  const [isGenerating, setIsGenerating] = useState(false);

  const setInvoiceRefs = (el: HTMLDivElement | null) => {
    invoiceRef.current = el;
    (printRef as any).current = el;
  };

  const generatePDF = async (fileName: string) => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(fileName);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    setInvoiceRefs,
    handlePrint,
    generatePDF,
    isGenerating,
  };
}

