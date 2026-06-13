import { Document, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";

export function txtExport(text: string) {
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

export function pdfBuffer(title: string, text: string) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 14, 30);
  return Buffer.from(doc.output("arraybuffer"));
}

export async function docxBuffer(title: string, text: string) {
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title, heading: "Title" }),
        ...text.split("\n").map((line) => new Paragraph(line))
      ]
    }]
  });
  return Buffer.from(await Packer.toBuffer(document));
}
