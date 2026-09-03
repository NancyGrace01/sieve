// Renders a personalized result (from personalize.js) into a one-page PDF
// report — the "Dynamic PDF" ScoreApp itself advertises. Pure layout code
// against pdfkit; no external service, no HTML-to-PDF conversion step.

const PDFDocument = require('pdfkit');

const BAND_COLOR = { strong: '#16825D', developing: '#B3720C', weak: '#B3261E' };
const INK = '#14162B';
const INK_SOFT = '#4A4E68';
const ACCENT = '#FF6B35';
const LINE = '#E6E2D8';

function buildReportPdf(personalization, businessName) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(11).text((businessName || 'Sieve').toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.6);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(24).text(personalization.scorecardTitle);
  doc.moveDown(0.2);
  doc.fillColor(INK_SOFT).font('Helvetica').fontSize(12)
    .text(`Prepared for ${personalization.greetingName}`);
  doc.moveDown(1.2);
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveDown(1.2);

  // Score + tier
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(15)
    .text(`Hi ${personalization.greetingName}, here's your result: ${personalization.overall}%`);
  doc.moveDown(0.15);
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(13).text(personalization.tierHeadline);
  doc.moveDown(0.5);
  if (personalization.tierMessage) {
    doc.fillColor(INK_SOFT).font('Helvetica').fontSize(11).text(personalization.tierMessage, { width: pageWidth, lineGap: 3 });
    doc.moveDown(1);
  }

  // Category breakdown
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text('Your breakdown, category by category');
  doc.moveDown(0.6);

  personalization.categoryNarratives.forEach(cat => {
    const barY = doc.y + 4;
    const barWidth = 160;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(`${cat.label} — ${cat.score}%`, { continued: false });
    doc.moveDown(0.1);

    // score bar
    doc.roundedRect(doc.x, doc.y, barWidth, 6, 3).fillColor('#EEEBE2').fill();
    doc.roundedRect(doc.x, doc.y, Math.max(6, (barWidth * cat.score) / 100), 6, 3).fillColor(BAND_COLOR[cat.band] || INK_SOFT).fill();
    doc.moveDown(0.5);

    doc.fillColor(INK_SOFT).font('Helvetica').fontSize(10.5).text(cat.message, { width: pageWidth, lineGap: 2 });
    doc.moveDown(0.9);
  });

  // Answer-level insights, weakest categories already surfaced first upstream
  if (personalization.answerInsights.length) {
    doc.moveDown(0.3);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text('What we noticed in your answers');
    doc.moveDown(0.5);
    personalization.answerInsights.forEach(a => {
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(`${a.question}`, { width: pageWidth });
      doc.fillColor(INK_SOFT).font('Helvetica-Oblique').fontSize(10).text(`Your answer: ${a.answer}`, { width: pageWidth });
      doc.fillColor(INK_SOFT).font('Helvetica').fontSize(10.5).text(a.insight, { width: pageWidth, lineGap: 2 });
      doc.moveDown(0.7);
    });
  }

  // Recommendation / CTA
  if (personalization.recommendation) {
    doc.moveDown(0.4);
    const boxY = doc.y;
    doc.roundedRect(doc.x, boxY, pageWidth, 70, 8).fillColor('#FFE8DB').fill();
    doc.fillColor('#7A2E0E').font('Helvetica-Bold').fontSize(11).text('Recommended next step', doc.x + 16, boxY + 14, { width: pageWidth - 32 });
    doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(personalization.recommendation, doc.x + 16, boxY + 32, { width: pageWidth - 32, lineGap: 2 });
    if (personalization.recommendationUrl) {
      doc.fillColor('#1F5FE0').font('Helvetica-Bold').fontSize(10).text(personalization.recommendationUrl, doc.x + 16, boxY + 54, {
        link: personalization.recommendationUrl, underline: true,
      });
    }
    doc.y = boxY + 82;
  }

  doc.end();
  return done;
}

module.exports = { buildReportPdf };
