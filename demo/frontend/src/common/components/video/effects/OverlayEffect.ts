/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import BaseGLEffect from '@/common/components/video/effects/BaseGLEffect';
import {
  EffectFrameContext,
  EffectInit,
} from '@/common/components/video/effects/Effect';
import vertexShaderSource from '@/common/components/video/effects/shaders/DefaultVert.vert?raw';
import fragmentShaderSource from '@/common/components/video/effects/shaders/Overlay.frag?raw';
import {Tracklet} from '@/common/tracker/Tracker';
import {RLEObject, decode} from '@/jscocotools/mask';
import invariant from 'invariant';
import {CanvasForm} from 'pts';

export default class OverlayEffect extends BaseGLEffect {
  private _numMasksUniformLocation: WebGLUniformLocation | null = null;

  constructor() {
    super(8);
    this.vertexShaderSource = vertexShaderSource;
    this.fragmentShaderSource = fragmentShaderSource;
  }

  protected setupUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    init: EffectInit,
  ): void {
    super.setupUniforms(gl, program, init);

    this._numMasksUniformLocation = gl.getUniformLocation(program, 'uNumMasks');
    gl.uniform1i(this._numMasksUniformLocation, 0);
  }

  /**
   * Computes an axis-aligned bounding box from an RLE-decoded mask.
   * The mask data is stored in column-major order (height x width).
   * Returns null when the mask is empty (no foreground pixels).
   */
  private _computeBoundingBox(
    maskData: Uint8Array,
    width: number,
    height: number,
  ): {x: number; y: number; w: number; h: number} | null {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    // RLE decode produces column-major data: index = col * height + row
    for (let col = 0; col < width; col++) {
      for (let row = 0; row < height; row++) {
        if (maskData[col * height + row] > 0) {
          if (col < minX) minX = col;
          if (col > maxX) maxX = col;
          if (row < minY) minY = row;
          if (row > maxY) maxY = row;
        }
      }
    }

    if (maxX < 0) return null;
    return {x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1};
  }

  apply(form: CanvasForm, context: EffectFrameContext, _tracklets: Tracklet[]) {
    const gl = this._gl;
    const program = this._program;

    invariant(gl !== null, 'WebGL2 context is required');
    invariant(program !== null, 'Not WebGL program found');

    // --- Draw the plain video frame via WebGL (no mask overlay) ---
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1i(this._numMasksUniformLocation, 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uOpacity'), 0.0);
    gl.uniform1i(gl.getUniformLocation(program, 'uBorder'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), 1.5);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._frameTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      context.width,
      context.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      context.frame,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const ctx = form.ctx;
    invariant(this._canvas !== null, 'canvas is required');

    // Blit the plain video frame from WebGL canvas
    ctx.drawImage(this._canvas, 0, 0);

    // --- Draw bounding boxes using canvas 2D ---
    const lineWidth = Math.max(2, Math.round(Math.min(context.width, context.height) / 200));

    context.masks.forEach((mask, index) => {
      const decodedMask = decode([mask.bitmap as RLEObject]);
      const maskData = decodedMask.data as Uint8Array;
      const bbox = this._computeBoundingBox(maskData, context.width, context.height);

      if (bbox == null) return;

      const hexColor = context.maskColors[index];

      ctx.save();
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';

      // Semi-transparent fill (~20% opacity)
      ctx.fillStyle = hexColor + '33';
      ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

      // Solid border
      ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);

      // Object label chip (top-left corner of box)
      const fontSize = Math.max(12, Math.round(Math.min(context.width, context.height) / 30));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      const label = `${index + 1}`;
      const textW = ctx.measureText(label).width + 8;
      const textH = fontSize + 6;
      ctx.fillStyle = hexColor;
      ctx.fillRect(bbox.x, bbox.y - textH, textW, textH);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, bbox.x + 4, bbox.y - textH + 3);

      ctx.restore();
    });
  }

  async cleanup(): Promise<void> {
    super.cleanup();
  }
}
