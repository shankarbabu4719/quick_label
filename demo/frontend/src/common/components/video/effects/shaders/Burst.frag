#version 300 es
// Copyright (c) Meta Platforms, Inc. and affiliates.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

precision highp float;

in vec2 vTexCoord;

uniform sampler2D uSampler;
uniform vec2 uSize;
uniform int uNumMasks;
uniform bool uLineColor;
uniform bool uInterleave;
uniform sampler2D uMaskTexture0;
uniform sampler2D uMaskTexture1;
uniform sampler2D uMaskTexture2;
uniform sampler2D uMaskTexture3;
uniform sampler2D uMaskTexture4;
uniform sampler2D uMaskTexture5;
uniform sampler2D uMaskTexture6;
uniform sampler2D uMaskTexture7;
uniform sampler2D uMaskTexture8;
uniform sampler2D uMaskTexture9;

uniform vec4 uMaskColor0;
uniform vec4 uMaskColor1;
uniform vec4 uMaskColor2;
uniform vec4 uMaskColor3;
uniform vec4 uMaskColor4;
uniform vec4 uMaskColor5;
uniform vec4 uMaskColor6;
uniform vec4 uMaskColor7;
uniform vec4 uMaskColor8;
uniform vec4 uMaskColor9;

uniform vec4 bbox0;
uniform vec4 bbox1;
uniform vec4 bbox2;
uniform vec4 bbox3;
uniform vec4 bbox4;
uniform vec4 bbox5;
uniform vec4 bbox6;
uniform vec4 bbox7;
uniform vec4 bbox8;
uniform vec4 bbox9;

out vec4 fragColor;

void applyBurstSlot(sampler2D tex, vec4 maskColor, vec4 bbox,
                    float p, float lines, vec2 fragCoord,
                    inout bool scoped, inout vec4 scopedColor, inout float overlapVal) {
  overlapVal = texture(tex, vec2(vTexCoord.y, vTexCoord.x)).r;
  vec4 col = maskColor / 255.0;
  vec2 center = (bbox.xy + bbox.zw) * 0.5f * uSize;
  vec2 fragCoordT = (fragCoord - center) / uSize.y;
  float a = mod(atan(fragCoordT.y, fragCoordT.x) + p, p + p) - p;
  float pattern = sin(a * lines);
  float line = smoothstep(2.8 / uSize.y, 0.0, length(fragCoordT) * abs(sin(a)));
  vec4 colorToBlend = uLineColor ? vec4(col.rgb, 0.80f) : vec4(1.0f);
  bool visible = bbox != vec4(0.0f);
  vec4 transparent = vec4(0.0);
  if (uInterleave && visible) {
    vec4 tempColor = mix(transparent, colorToBlend, step(0.0, pattern));
    if (scopedColor == vec4(0.0)) { scopedColor += tempColor; }
    scoped = true;
  } else if (!uInterleave && visible) {
    vec4 tempColor = uLineColor ? vec4(col.rgb * line, line) : vec4(line);
    scopedColor += tempColor;
    scoped = true;
  }
}

void main() {
  float PI = radians(180.0f);
  float lines = uInterleave ? 12.0f : 80.0f;
  vec4 color = texture(uSampler, vTexCoord);
  vec2 fragCoord = vTexCoord * uSize;
  float p = PI / lines;

  bool scoped = false;
  vec4 scopedColor = vec4(0.0f);

  float ov0=0.0, ov1=0.0, ov2=0.0, ov3=0.0, ov4=0.0;
  float ov5=0.0, ov6=0.0, ov7=0.0, ov8=0.0, ov9=0.0;

  if (uNumMasks > 0) applyBurstSlot(uMaskTexture0, uMaskColor0, bbox0, p, lines, fragCoord, scoped, scopedColor, ov0);
  if (uNumMasks > 1) applyBurstSlot(uMaskTexture1, uMaskColor1, bbox1, p, lines, fragCoord, scoped, scopedColor, ov1);
  if (uNumMasks > 2) applyBurstSlot(uMaskTexture2, uMaskColor2, bbox2, p, lines, fragCoord, scoped, scopedColor, ov2);
  if (uNumMasks > 3) applyBurstSlot(uMaskTexture3, uMaskColor3, bbox3, p, lines, fragCoord, scoped, scopedColor, ov3);
  if (uNumMasks > 4) applyBurstSlot(uMaskTexture4, uMaskColor4, bbox4, p, lines, fragCoord, scoped, scopedColor, ov4);
  if (uNumMasks > 5) applyBurstSlot(uMaskTexture5, uMaskColor5, bbox5, p, lines, fragCoord, scoped, scopedColor, ov5);
  if (uNumMasks > 6) applyBurstSlot(uMaskTexture6, uMaskColor6, bbox6, p, lines, fragCoord, scoped, scopedColor, ov6);
  if (uNumMasks > 7) applyBurstSlot(uMaskTexture7, uMaskColor7, bbox7, p, lines, fragCoord, scoped, scopedColor, ov7);
  if (uNumMasks > 8) applyBurstSlot(uMaskTexture8, uMaskColor8, bbox8, p, lines, fragCoord, scoped, scopedColor, ov8);
  if (uNumMasks > 9) applyBurstSlot(uMaskTexture9, uMaskColor9, bbox9, p, lines, fragCoord, scoped, scopedColor, ov9);

  bool overlap = (ov0 > 0.0f || ov1 > 0.0f || ov2 > 0.0f || ov3 > 0.0f || ov4 > 0.0f ||
                  ov5 > 0.0f || ov6 > 0.0f || ov7 > 0.0f || ov8 > 0.0f || ov9 > 0.0f);

  if (scoped) {
    fragColor = overlap ? color : scopedColor;
  } else {
    fragColor = overlap ? color : vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
