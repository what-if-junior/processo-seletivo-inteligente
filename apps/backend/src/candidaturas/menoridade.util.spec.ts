import {
  decodeDocumentoBase64,
  isMenorNaData,
} from './menoridade.util';

describe('menoridade.util', () => {
  describe('isMenorNaData', () => {
    it('treats under 18 on submit date as minor', () => {
      expect(isMenorNaData('2010-07-28', '2026-07-27')).toBe(true);
      expect(isMenorNaData('2008-07-28', '2026-07-27')).toBe(true);
    });

    it('treats exactly 18 on birthday as adult', () => {
      expect(isMenorNaData('2008-07-27', '2026-07-27')).toBe(false);
    });

    it('treats day before 18th birthday as minor', () => {
      expect(isMenorNaData('2008-07-28', '2026-07-27')).toBe(true);
    });

    it('treats clearly adult birth dates as adult', () => {
      expect(isMenorNaData('1990-01-15', '2026-07-27')).toBe(false);
    });
  });

  describe('decodeDocumentoBase64', () => {
    it('decodes plain base64', () => {
      const buf = decodeDocumentoBase64(Buffer.from('pdf').toString('base64'));
      expect(buf?.toString()).toBe('pdf');
    });

    it('decodes data-URL base64', () => {
      const b64 = Buffer.from('%PDF').toString('base64');
      const buf = decodeDocumentoBase64(`data:application/pdf;base64,${b64}`);
      expect(buf?.toString()).toBe('%PDF');
    });

    it('returns null for empty/invalid', () => {
      expect(decodeDocumentoBase64('')).toBeNull();
      expect(decodeDocumentoBase64(null)).toBeNull();
      expect(decodeDocumentoBase64(undefined)).toBeNull();
    });
  });
});
