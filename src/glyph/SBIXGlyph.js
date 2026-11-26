import TTFGlyph from './TTFGlyph';
import * as r from 'restructure';

let SBIXImage = new r.Struct({
  originX: r.uint16,
  originY: r.uint16,
  type: new r.String(4),
  data: new r.Buffer((t) => t.parent.buflen - t._currentOffset),
});

/**
 * Represents a color (e.g. emoji) glyph in Apple's SBIX format.
 */
export default class SBIXGlyph extends TTFGlyph {
  type = 'SBIX';

  /**
   * Returns an object representing a glyph image at the given point size.
   * The object has a data property with a Buffer containing the actual image data,
   * along with the image type, and origin.
   *
   * @param {number} size
   * @return {object}
   */
  _getImageTableForSize(size) {
    let smallestMatching = null;
    let largest = null;

    const tables = this._font.sbix.imageTables;
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (table.ppem >= size) {
        if (!smallestMatching || table.ppem < smallestMatching.ppem) {
          smallestMatching = table;
        }
      }

      if (!largest || table.ppem > largest.ppem) {
        largest = table;
      }
    }

    // SBIX strikes are normally sorted by ppem, but selecting the smallest
    // strike that is at least as large as requested also works if they are not.
    return smallestMatching || largest;
  }

  getImageForSize(size) {
    let table = this._getImageTableForSize(size);
    if (!table) {
      return null;
    }

    let offsets = table.imageOffsets;
    let start = offsets[this.id];
    let end = offsets[this.id + 1];

    if (start === end) {
      return null;
    }

    this._font.stream.pos = start;
    return SBIXImage.decode(this._font.stream, { buflen: end - start });
  }

  render(ctx, size) {
    let img = this.getImageForSize(size);
    if (img != null) {
      let scale = size / this._font.unitsPerEm;
      ctx.image(img.data, {
        height: size,
        x: img.originX,
        y: (this.bbox.minY - img.originY) * scale,
      });
    }

    if (this._font.sbix.flags.renderOutlines) {
      super.render(ctx, size);
    }
  }
}
