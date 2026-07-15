import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export const exportResumeToPDF = (resumeText: string, filename: string = "optimized-resume.pdf", shouldReturn: boolean = false) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20; // 20mm margins are standard (approx 0.75 inch)
  const contentWidth = pageWidth - (margin * 2);
  
  // Professional ATS resumes generally use standard serif or sans-serif fonts
  // We'll use Times New Roman (standard ATS font) and purely black text
  let y = margin;
  const lineHeight = 5;
  const paragraphSpacing = 3;

  const lines = resumeText.split("\n");
  let isFirstLine = true;
  let isContactSection = true;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawHeaderLine = (yPos: number) => {
    doc.setDrawColor(0, 0, 0); // Solid black
    doc.setLineWidth(0.4);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i].trim();
    if (!rawLine) {
      if (isContactSection && !isFirstLine) {
        isContactSection = false;
        y += 2;
      } else {
        y += paragraphSpacing;
      }
      continue;
    }

    // Name at top
    if (isFirstLine) {
      isFirstLine = false;
      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      
      const wrappedName = doc.splitTextToSize(rawLine, contentWidth);
      checkPageBreak(wrappedName.length * 8 + 4);
      
      wrappedName.forEach((nl: string) => {
        const textWidth = doc.getTextWidth(nl);
        const x = (pageWidth - textWidth) / 2;
        doc.text(nl, x, y);
        y += 8;
      });
      continue;
    }

    // Contact info block (centered)
    if (isContactSection && (rawLine.includes("@") || rawLine.includes("|") || rawLine.includes("-") || rawLine.match(/\d+/) || rawLine.toLowerCase().includes("linkedin"))) {
      doc.setFont("times", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      
      const wrappedContact = doc.splitTextToSize(rawLine, contentWidth);
      checkPageBreak(wrappedContact.length * 5);
      
      wrappedContact.forEach((nl: string) => {
        const textWidth = doc.getTextWidth(nl);
        const x = (pageWidth - textWidth) / 2;
        doc.text(nl, x, y);
        y += 5;
      });
      continue;
    }
    
    isContactSection = false;

    // Strict Section Headers (All caps, no weird punctuation)
    const isHeader = rawLine === rawLine.toUpperCase() && 
                     rawLine.length < 35 && 
                     !rawLine.match(/[^A-Z\s,&/]/) &&
                     (rawLine.includes("SUMMARY") || rawLine.includes("EXPERIENCE") || rawLine.includes("SKILLS") || rawLine.includes("EDUCATION") || rawLine.includes("PROJECTS") || rawLine.includes("WORK") || rawLine.includes("CERTIFICATIONS"));

    if (isHeader) {
      y += 4;
      checkPageBreak(12);
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      doc.text(rawLine, margin, y);
      y += 1.5;
      drawHeaderLine(y);
      y += 4.5;
      continue;
    }

    // Date Parsing for Job Titles (Right aligned dates)
    const isBullet = rawLine.startsWith("*") || rawLine.startsWith("-") || rawLine.startsWith("•");
    const dateRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}.*?(?:Present|\d{4})|(?:\d{4}\s*-\s*(?:Present|\d{4})))$/i;

    if (!isBullet && dateRegex.test(rawLine)) {
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const match = rawLine.match(dateRegex);
      if (match) {
        const dateStr = match[0].trim();
        // Extract title, strip any trailing pipes or commas
        let titleStr = rawLine.substring(0, rawLine.length - dateStr.length).trim();
        titleStr = titleStr.replace(/[|,.\s\-]+$/, '').trim(); 
        
        checkPageBreak(6);
        
        if (titleStr) {
          doc.text(titleStr, margin, y);
        }
        const dateWidth = doc.getTextWidth(dateStr);
        // Standard ATS templates don't bold the date usually, but we will leave it bold for visual hierarchy
        doc.text(dateStr, pageWidth - margin - dateWidth, y);
        
        y += lineHeight + 0.5;
        continue;
      }
    }

    // Bullet points (Hanging indent format)
    if (isBullet) {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      const bulletText = rawLine.replace(/^[*•-]\s*/, "");
      const bulletIndent = 6;
      const textWidth = contentWidth - bulletIndent;
      
      const wrappedBullet = doc.splitTextToSize(bulletText, textWidth);
      checkPageBreak(wrappedBullet.length * lineHeight);
      
      doc.text("•", margin + 1, y);
      
      wrappedBullet.forEach((nl: string) => {
        doc.text(nl, margin + bulletIndent, y);
        y += lineHeight;
      });
      continue;
    }

    // Standard body text
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    // Bold lines that look like secondary job details (company names etc.)
    if (rawLine.includes("|") && rawLine.length < 100) {
      doc.setFont("times", "bold");
    }

    const wrappedText = doc.splitTextToSize(rawLine, contentWidth);
    checkPageBreak(wrappedText.length * lineHeight);

    wrappedText.forEach((nl: string) => {
      doc.text(nl, margin, y);
      y += lineHeight;
    });
  }

  if (shouldReturn) {
    return doc.output('blob');
  }
  
  doc.save(filename);
};

export const exportToPDF = (title: string, content: string, filename: string = "optimized-document.pdf") => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 20, 20);
  
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(content, 170);
  doc.text(splitText, 20, 30);
  
  doc.save(filename);
};

export const exportToDOCX = async (title: string, content: string, filename: string = "optimized-document.docx") => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          ...content.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
};

export const exportDataService = async (items: any[], format: 'json' | 'csv' | 'pdf' | 'docx', filename: string) => {
  if (!items || items.length === 0) return;

  // Flatten nested objects and filter out huge content blocks if needed
  const prepareData = (obj: any) => {
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
  };

  const processedItems = items.map(prepareData);
  const headers = Object.keys(processedItems[0]);
  const exportFilename = `${filename}_${new Date().toISOString().split('T')[0]}`;
  
  if (format === 'json') {
    const dataStr = JSON.stringify(items, null, 2); // original items for json
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    saveAs(dataBlob, `${exportFilename}.json`);
  } 
  else if (format === 'csv') {
    const csvContent = [
      headers.join(","),
      ...processedItems.map(item => headers.map(header => {
        let val = item[header];
        if (val === null || val === undefined) val = "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");
    
    const dataBlob = new Blob([csvContent], { type: "text/csv" });
    saveAs(dataBlob, `${exportFilename}.csv`);
  }
  else if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Data Export: ${filename}`, 14, 20);
    doc.setFontSize(9);
    
    let y = 30;
    processedItems.forEach((item, index) => {
      let line = `${index + 1}. ` + headers.map(h => `${h}: ${item[h]}`).join(" | ");
      const splitText = doc.splitTextToSize(line, 180);
      if (y + (splitText.length * 4) > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText, 14, y);
      y += (splitText.length * 4) + 2;
    });
    doc.save(`${exportFilename}.pdf`);
  }
  else if (format === 'docx') {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: `Data Export: ${filename}`, heading: HeadingLevel.HEADING_1 }),
          ...processedItems.map((item, index) => {
            let line = `${index + 1}. ` + headers.map(h => `${h}: ${item[h]}`).join(" | ");
            return new Paragraph({ children: [new TextRun(line)] });
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${exportFilename}.docx`);
  }
};
