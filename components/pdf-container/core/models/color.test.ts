import {
  WebAlphaColor,
  // Color-only functions
  pdfColorToWebColor,
  webColorToPdfColor,
  // Alpha utility functions
  pdfAlphaToWebOpacity,
  webOpacityToPdfAlpha,
  extractPdfColor,
  extractWebOpacity,
  combinePdfColorWithAlpha,
  combineWebColorWithOpacity,
  // Existing alpha-aware functions
  pdfAlphaColorToWebAlphaColor,
  webAlphaColorToPdfAlphaColor,
} from './color';
import { PdfAlphaColor, PdfColor } from './pdf';

describe('Color-only conversion functions', () => {
  describe('pdfColorToWebColor', () => {
    it('should convert PDF RGB to hex color', () => {
      expect(pdfColorToWebColor({ red: 255, green: 0, blue: 0 })).toBe('#ff0000');
      expect(pdfColorToWebColor({ red: 0, green: 255, blue: 0 })).toBe('#00ff00');
      expect(pdfColorToWebColor({ red: 0, green: 0, blue: 255 })).toBe('#0000ff');
      expect(pdfColorToWebColor({ red: 128, green: 128, blue: 128 })).toBe('#808080');
      expect(pdfColorToWebColor({ red: 255, green: 255, blue: 255 })).toBe('#ffffff');
      expect(pdfColorToWebColor({ red: 0, green: 0, blue: 0 })).toBe('#000000');
    });

    it('should clamp values outside 0-255 range', () => {
      expect(pdfColorToWebColor({ red: -10, green: 300, blue: 128 })).toBe('#00ff80');
    });

    it('should pad single-digit hex values', () => {
      expect(pdfColorToWebColor({ red: 1, green: 2, blue: 3 })).toBe('#010203');
    });
  });

  describe('webColorToPdfColor', () => {
    it('should convert hex colors to PDF RGB', () => {
      expect(webColorToPdfColor('#ff0000')).toEqual({ red: 255, green: 0, blue: 0 });
      expect(webColorToPdfColor('#00FF00')).toEqual({ red: 0, green: 255, blue: 0 });
      expect(webColorToPdfColor('#0000ff')).toEqual({ red: 0, green: 0, blue: 255 });
      expect(webColorToPdfColor('#808080')).toEqual({ red: 128, green: 128, blue: 128 });
    });

    it('should handle colors without # prefix', () => {
      expect(webColorToPdfColor('ff0000')).toEqual({ red: 255, green: 0, blue: 0 });
    });

    it('should expand 3-digit hex colors', () => {
      expect(webColorToPdfColor('#abc')).toEqual({ red: 170, green: 187, blue: 204 });
      expect(webColorToPdfColor('abc')).toEqual({ red: 170, green: 187, blue: 204 });
      expect(webColorToPdfColor('#f0a')).toEqual({ red: 255, green: 0, blue: 170 });
    });

    it('should throw error for invalid hex colors', () => {
      expect(() => webColorToPdfColor('invalid')).toThrow('Invalid hex colour: "invalid"');
      expect(() => webColorToPdfColor('#gg0000')).toThrow('Invalid hex colour: "#gg0000"');
    });
  });

  it('should round-trip convert correctly', () => {
    const originalPdf: PdfColor = { red: 128, green: 64, blue: 192 };
    const webColor = pdfColorToWebColor(originalPdf);
    const backToPdf = webColorToPdfColor(webColor);
    expect(backToPdf).toEqual(originalPdf);
  });
});

describe('Alpha utility functions', () => {
  describe('pdfAlphaToWebOpacity', () => {
    it('should convert PDF alpha to web opacity', () => {
      expect(pdfAlphaToWebOpacity(0)).toBe(0);
      expect(pdfAlphaToWebOpacity(255)).toBe(1);
      expect(pdfAlphaToWebOpacity(128)).toBeCloseTo(0.5019607843137255);
      expect(pdfAlphaToWebOpacity(64)).toBeCloseTo(0.25098039215686274);
    });

    it('should clamp values outside 0-255 range', () => {
      expect(pdfAlphaToWebOpacity(-10)).toBe(0);
      expect(pdfAlphaToWebOpacity(300)).toBe(1);
    });
  });

  describe('webOpacityToPdfAlpha', () => {
    it('should convert web opacity to PDF alpha', () => {
      expect(webOpacityToPdfAlpha(0)).toBe(0);
      expect(webOpacityToPdfAlpha(1)).toBe(255);
      expect(webOpacityToPdfAlpha(0.5)).toBe(128);
      expect(webOpacityToPdfAlpha(0.25)).toBe(64);
    });

    it('should clamp and round values', () => {
      expect(webOpacityToPdfAlpha(-0.1)).toBe(0);
      expect(webOpacityToPdfAlpha(1.1)).toBe(255);
      expect(webOpacityToPdfAlpha(0.501)).toBe(128); // rounds to 128
    });
  });

  it('should round-trip convert alpha correctly', () => {
    const originalAlpha = 128;
    const webOpacity = pdfAlphaToWebOpacity(originalAlpha);
    const backToAlpha = webOpacityToPdfAlpha(webOpacity);
    expect(backToAlpha).toBe(originalAlpha);
  });
});

describe('Extraction and combination utilities', () => {
  const testPdfAlphaColor: PdfAlphaColor = { red: 255, green: 128, blue: 64, alpha: 192 };

  describe('extractPdfColor', () => {
    it('should extract RGB components without alpha', () => {
      expect(extractPdfColor(testPdfAlphaColor)).toEqual({ red: 255, green: 128, blue: 64 });
    });
  });

  describe('extractWebOpacity', () => {
    it('should extract alpha as web opacity', () => {
      expect(extractWebOpacity(testPdfAlphaColor)).toBeCloseTo(0.7529411764705882);
    });
  });

  describe('combinePdfColorWithAlpha', () => {
    it('should combine PDF color with alpha', () => {
      const color: PdfColor = { red: 100, green: 150, blue: 200 };
      const result = combinePdfColorWithAlpha(color, 180);
      expect(result).toEqual({ red: 100, green: 150, blue: 200, alpha: 180 });
    });
  });

  describe('combineWebColorWithOpacity', () => {
    it('should combine web color with opacity', () => {
      const result = combineWebColorWithOpacity('#ff8040', 0.75);
      expect(result).toEqual({ color: '#ff8040', opacity: 0.75 });
    });
  });

  it('should round-trip extract and combine correctly', () => {
    const originalColor = extractPdfColor(testPdfAlphaColor);
    const originalOpacity = extractWebOpacity(testPdfAlphaColor);
    const reconstructed = combinePdfColorWithAlpha(originalColor, testPdfAlphaColor.alpha);
    expect(reconstructed).toEqual(testPdfAlphaColor);
  });
});

describe('Existing alpha-aware functions (integration tests)', () => {
  const testPdfAlphaColor: PdfAlphaColor = { red: 255, green: 128, blue: 64, alpha: 192 };

  describe('pdfAlphaColorToWebAlphaColor', () => {
    it('should convert using the new separated functions', () => {
      const result = pdfAlphaColorToWebAlphaColor(testPdfAlphaColor);
      expect(result.color).toBe('#ff8040');
      expect(result.opacity).toBeCloseTo(0.7529411764705882);
    });
  });

  describe('webAlphaColorToPdfAlphaColor', () => {
    it('should convert using the new separated functions', () => {
      const webAlphaColor: WebAlphaColor = { color: '#ff8040', opacity: 0.75 };
      const result = webAlphaColorToPdfAlphaColor(webAlphaColor);
      expect(result).toEqual({ red: 255, green: 128, blue: 64, alpha: 191 }); // 0.75 * 255 ≈ 191
    });
  });

  it('should maintain backward compatibility with round-trip conversion', () => {
    const webAlphaColor = pdfAlphaColorToWebAlphaColor(testPdfAlphaColor);
    const backToPdf = webAlphaColorToPdfAlphaColor(webAlphaColor);

    expect(backToPdf.red).toBe(testPdfAlphaColor.red);
    expect(backToPdf.green).toBe(testPdfAlphaColor.green);
    expect(backToPdf.blue).toBe(testPdfAlphaColor.blue);
    // Alpha might have slight precision differences due to float conversion
    expect(backToPdf.alpha).toBeCloseTo(testPdfAlphaColor.alpha, 0);
  });
});

describe('Type safety and composition', () => {
  it('should work with composed operations', () => {
    // Start with PDF alpha color
    const original: PdfAlphaColor = { red: 200, green: 100, blue: 50, alpha: 180 };

    // Extract components
    const color = extractPdfColor(original);
    const opacity = extractWebOpacity(original);

    // Convert to web formats
    const webColor = pdfColorToWebColor(color);
    const webAlphaColor = combineWebColorWithOpacity(webColor, opacity);

    // Convert back
    const backColor = webColorToPdfColor(webAlphaColor.color);
    const backAlpha = webOpacityToPdfAlpha(webAlphaColor.opacity);
    const reconstructed = combinePdfColorWithAlpha(backColor, backAlpha);

    expect(reconstructed.red).toBe(original.red);
    expect(reconstructed.green).toBe(original.green);
    expect(reconstructed.blue).toBe(original.blue);
    expect(reconstructed.alpha).toBeCloseTo(original.alpha, 0);
  });
});
