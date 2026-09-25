
import PDFDocument from 'pdfkit';

interface PdfSection {
    heading: string;
    points: string[];
}

interface PdfData {
    title: string;
    subtitle: string;
    sections: PdfSection[];
    // legacy singular name kept for backwards compat
    section?: PdfSection[];
}

const normalizeData = (data: PdfData): Required<Pick<PdfData, "title" | "subtitle">> & { sections: PdfSection[] } => {
    const sections = Array.isArray(data.sections)
        ? data.sections
        : Array.isArray(data.section)
          ? data.section
          : [];
    return {
        title: data.title,
        subtitle: data.subtitle,
        sections: sections
            .filter((s) => s && typeof s.heading === "string" && Array.isArray(s.points))
            .map((s) => ({
                heading: s.heading,
                points: s.points.filter((p) => typeof p === "string"),
            })),
    };
};

const generatePdf = async (data: PdfData) => {
    const normalized = normalizeData(data);
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Author: 'Relay',
                Title: normalized.title,
                Creator: 'RelayAI',
            },
        });
        const chunks: Uint8Array[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
        });

        doc.on('error', (err) => {
            reject(err);
        });

        // Add title
        doc.fontSize(20).text(normalized.title, { align: 'center' }).fillColor('#111827');
        doc.moveDown();

        // Add subtitle
        doc.fontSize(14).text(normalized.subtitle, { align: 'center' }).fillColor('#6B7280');
        doc.moveDown();


        // Add sections
        normalized.sections.forEach((section) => {
            doc.fontSize(16).text(section.heading, { align: 'left' }).fillColor('#111827');
            doc.moveDown();

            section.points.forEach((point) => {
                doc.fontSize(12).text(point, { align: 'left' }).fillColor('#374151');
                doc.moveDown();
            });
        });

        doc.end();
    })




}

export { generatePdf };