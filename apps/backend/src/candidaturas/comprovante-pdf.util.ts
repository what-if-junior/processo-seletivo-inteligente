import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

export type ComprovantePdfInput = {
  protocolo: string;
  validateUrl: string;
  candidato: string;
  curso: string;
  campus: string;
  dataInscricao: string;
  status: string;
};

/**
 * Builds a simple comprovante PDF with protocol text + QR pointing at the
 * live validation URL (REQ-2.5). Downloaded bytes are static; validation is live.
 */
export async function buildComprovantePdf(
  input: ComprovantePdfInput,
): Promise<Buffer> {
  const qrPng = await QRCode.toBuffer(input.validateUrl, {
    type: 'png',
    width: 180,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(18)
      .fillColor('#2A7B3E')
      .text('Comprovativo de Inscrição', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#4E6859')
      .text('Processo Seletivo Inteligente — IFB', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#0D1E12').fontSize(12);
    doc.text(`Protocolo: ${input.protocolo}`);
    doc.moveDown(0.4);
    doc.text(`Candidato: ${input.candidato}`);
    doc.moveDown(0.4);
    doc.text(`Curso: ${input.curso}`);
    doc.moveDown(0.4);
    doc.text(`Campus: ${input.campus}`);
    doc.moveDown(0.4);
    doc.text(`Data da inscrição: ${input.dataInscricao}`);
    doc.moveDown(0.4);
    doc.text(`Status no momento da emissão: ${input.status}`);
    doc.moveDown(1.2);

    doc
      .fontSize(10)
      .fillColor('#4E6859')
      .text(
        'Escaneie o QR Code para validar este comprovativo. Após cancelamento, a validação falha mesmo com este PDF.',
        { width: 320 },
      );
    doc.moveDown(0.8);
    doc.image(qrPng, { width: 140, height: 140 });
    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .fillColor('#6B7280')
      .text(input.validateUrl, { width: 400, link: input.validateUrl });

    doc.end();
  });
}

export function buildProtocoloValidateUrl(
  baseUrl: string,
  protocolo: string,
): string {
  const root = baseUrl.replace(/\/$/, '');
  return `${root}/protocolos/${encodeURIComponent(protocolo)}`;
}
