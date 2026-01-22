declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    styles?: {
      fontSize?: number;
      cellPadding?: number;
      [key: string]: any;
    };
    headStyles?: {
      fillColor?: number[];
      textColor?: number;
      fontStyle?: string;
      [key: string]: any;
    };
    alternateRowStyles?: {
      fillColor?: number[];
      [key: string]: any;
    };
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    [key: string]: any;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}