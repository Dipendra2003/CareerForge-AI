import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Generate a CSV string from an array of JSON objects.
 */
export const generateCSV = (data: any[]): string => {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(item => headers.map(header => {
      let val = item[header];
      if (val === null || val === undefined) val = "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","))
  ].join("\n");
  return csvContent;
};

/**
 * Generate a JSON string from an array of JSON objects.
 */
export const generateJSON = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Generate a PDF Buffer from an array of JSON objects.
 */
export const generatePDF = (data: any[], title: string): Buffer => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Data Export: ${title}`, 14, 20);
  doc.setFontSize(9);
  
  if (!data || data.length === 0) {
    doc.text("No data available.", 14, 30);
    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }

  const headers = Object.keys(data[0]);
  let y = 30;
  
  data.forEach((item, index) => {
    let line = `${index + 1}. ` + headers.map(h => `${h}: ${item[h]}`).join(" | ");
    const splitText = doc.splitTextToSize(line, 180);
    if (y + (splitText.length * 4) > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(splitText, 14, y);
    y += (splitText.length * 4) + 2;
  });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
};

/**
 * Generate a DOCX Buffer from an array of JSON objects.
 */
export const generateDOCX = async (data: any[], title: string): Promise<Buffer> => {
  if (!data || data.length === 0) {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: `Data Export: ${title}`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "No data available." })
        ]
      }]
    });
    return await Packer.toBuffer(doc);
  }

  const headers = Object.keys(data[0]);
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: `Data Export: ${title}`, heading: HeadingLevel.HEADING_1 }),
        ...data.map((item, index) => {
          let line = `${index + 1}. ` + headers.map(h => `${h}: ${item[h]}`).join(" | ");
          return new Paragraph({ children: [new TextRun(line)] });
        })
      ]
    }]
  });
  
  return await Packer.toBuffer(doc);
};

/**
 * Prepare data by flattening and truncating huge text fields for export.
 */
export const prepareExportData = (items: any[]): any[] => {
  return items.map(obj => {
    const newObj: any = {};
    for (const key in obj) {
      if (key === 'content' && typeof obj[key] === 'string' && obj[key].length > 100) {
        newObj[key] = obj[key].substring(0, 100) + '...';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        newObj[key] = JSON.stringify(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  });
};
