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

precision mediump float;

in vec2 vTexCoord;

uniform sampler2D uSampler;
uniform vec2 uSize;
uniform int uNumMasks;
uniform bool uFillColor;
uniform bool uLight;
uniform bool uTransparency;
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

void applyScopeSlot(sampler2D tex, vec4 maskColor, vec4 bbox,
                    float aspectRatio, float radiusThreshold, float tickness,
                    vec4 whiteVariation,
                    inout bool scoped, inout vec4 scopedColor, inout float overlapVal) {
  overlapVal = texture(tex, vec2(vTexCoord.y, vTexCoord.x)).r;
  vec4 col = maskColor / 255.0;
  vec2 center = (bbox.xy + bbox.zw) * 0.5f;
  float radiusX = abs(bbox.y - bbox.w) * 0.5f;
  float radiusY = radiusX / aspectRatio;
  float distX = (vTexCoord.x - center.x) / radiusX;
  float distY = (vTexCoord.y - center.y) / radiusY;
  float dist = sqrt(pow(distX, 2.0f) + pow(distY, 2.0f));
  if (uFillColor) {
    if (dist >= radiusThreshold - tickness && dist <= radiusThreshold) {
      scoped = true;
      scopedColor = uLight ? whiteVariation : col;
    }
  } else if (dist <= radiusThreshold) {
    scoped = true;
    scopedColor = uLight ? whiteVariation : col;
  }
}

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  float aspectRatio = uSize.y / uSize.x;
  float radiusThreshold = 0.8f;
  float tickness = 0.085f;

  vec4 scopedColor = vec4(0.0f);
  bool scoped = false;
  vec4 whiteVariation = uTransparency ? vec4(0.0,0.0,0.0,1.0) : vec4(1.0);

  float ov0=0.0, ov1=0.0, ov2=0.0, ov3=0.0, ov4=0.0;
  float ov5=0.0, ov6=0.0, ov7=0.0, ov8=0.0, ov9=0.0;

  if (uNumMasks > 0) applyScopeSlot(uMaskTexture0, uMaskColor0, bbox0, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov0);
  if (uNumMasks > 1) applyScopeSlot(uMaskTexture1, uMaskColor1, bbox1, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov1);
  if (uNumMasks > 2) applyScopeSlot(uMaskTexture2, uMaskColor2, bbox2, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov2);
  if (uNumMasks > 3) applyScopeSlot(uMaskTexture3, uMaskColor3, bbox3, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov3);
  if (uNumMasks > 4) applyScopeSlot(uMaskTexture4, uMaskColor4, bbox4, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov4);
  if (uNumMasks > 5) applyScopeSlot(uMaskTexture5, uMaskColor5, bbox5, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov5);
  if (uNumMasks > 6) applyScopeSlot(uMaskTexture6, uMaskColor6, bbox6, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov6);
  if (uNumMasks > 7) applyScopeSlot(uMaskTexture7, uMaskColor7, bbox7, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov7);
  if (uNumMasks > 8) applyScopeSlot(uMaskTexture8, uMaskColor8, bbox8, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov8);
  if (uNumMasks > 9) applyScopeSlot(uMaskTexture9, uMaskColor9, bbox9, aspectRatio, radiusThreshold, tickness, whiteVariation, scoped, scopedColor, ov9);

  bool overlap = (ov0 > 0.0f || ov1 > 0.0f || ov2 > 0.0f || ov3 > 0.0f || ov4 > 0.0f ||
                  ov5 > 0.0f || ov6 > 0.0f || ov7 > 0.0f || ov8 > 0.0f || ov9 > 0.0f);

  if (scoped) {
    fragColor = overlap ? color : scopedColor;
    fragColor.a = uTransparency ? fragColor.a : 1.0;
  } else {
    fragColor = overlap ? color : vec4(0.0f, 0.0f, 0.0f, 0.0f);
  }
}
