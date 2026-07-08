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
uniform float uOpacity;
uniform bool uBorder;
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
uniform float uTime;
uniform vec2 uClickPos;
uniform int uActiveMask;
out vec4 fragColor;
vec4 lowerSaturation(vec4 color, float saturationFactor) {
  float luminance = 0.299f * color.r + 0.587f * color.g + 0.114f * color.b;
  vec3 gray = vec3(luminance);
  vec3 saturated = mix(gray, color.rgb, saturationFactor);
  return vec4(saturated, color.a);
}
vec4 detectEdges(sampler2D textureSampler, float coverage, vec4 edgeColor) {
  vec2 tvTexCoord = vec2(vTexCoord.y, vTexCoord.x);
  vec2 texOffset = 1.0f / uSize;
  vec3 result = vec3(0.0f);
  vec3 tLeft  = texture(textureSampler, tvTexCoord + texOffset * vec2(-coverage,  coverage)).rgb;
  vec3 tRight = texture(textureSampler, tvTexCoord + texOffset * vec2( coverage, -coverage)).rgb;
  vec3 bLeft  = texture(textureSampler, tvTexCoord + texOffset * vec2(-coverage, -coverage)).rgb;
  vec3 bRight = texture(textureSampler, tvTexCoord + texOffset * vec2( coverage,  coverage)).rgb;
  vec3 xEdge = tLeft + 2.0f * texture(textureSampler, tvTexCoord + texOffset * vec2(-coverage, 0)).rgb + bLeft
             - tRight - 2.0f * texture(textureSampler, tvTexCoord + texOffset * vec2(coverage, 0)).rgb - bRight;
  vec3 yEdge = tLeft + 2.0f * texture(textureSampler, tvTexCoord + texOffset * vec2(0,  coverage)).rgb + tRight
             - bLeft - 2.0f * texture(textureSampler, tvTexCoord + texOffset * vec2(0, -coverage)).rgb - bRight;
  result = sqrt(xEdge * xEdge + yEdge * yEdge);
  return result.r > 1e-6f ? edgeColor : vec4(0.0f, 0.0f, 0.0f, 0.0f);
}
vec2 calculateAdjustedTexCoord(vec2 vTexCoord, vec4 bbox, float aspectRatio) {
  vec2 center = vec2((bbox.x + bbox.z) * 0.5f, bbox.w);
  float radiusX = abs(bbox.z - bbox.x);
  float radiusY = radiusX / aspectRatio;
  float scale = 1.0f;
  radiusX *= scale;
  radiusY *= scale;
  vec2 adjustedTexCoord = (vTexCoord - center) / vec2(radiusX, radiusY) + vec2(0.5f);
  return adjustedTexCoord;
}

// Helper macro-style function for each mask slot
vec4 applyMaskSlot(sampler2D tex, vec4 maskColor, int slotIndex,
                   vec4 color, float saturationFactor,
                   float numRipples, float timeThreshold,
                   vec2 adjustedClickCoord,
                   inout float totalMaskValue, inout vec4 finalColor, inout vec4 edgeColor) {
  float maskValue = texture(tex, vec2(vTexCoord.y, vTexCoord.x)).r;
  vec4 col = maskColor / 255.0;
  vec4 saturatedColor = lowerSaturation(col, saturationFactor);
  vec4 plainColor = vec4(vec3(saturatedColor).rgb, 1.0);
  vec4 rippleColor = vec4(col.rgb, 0.2);
  if (uActiveMask == slotIndex && uTime < timeThreshold) {
    float dist = length(adjustedClickCoord);
    float colorFactor = abs(sin((dist - uTime) * numRipples));
    plainColor = vec4(mix(rippleColor, plainColor, colorFactor));
  }
  if (uTime >= timeThreshold) {
    plainColor = vec4(vec3(saturatedColor).rgb, 1.0);
  }
  finalColor += maskValue * plainColor;
  totalMaskValue += maskValue;
  if (edgeColor.a <= 0.0f) {
    edgeColor = detectEdges(tex, 1.25, col);
  }
  return finalColor;
}

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  float saturationFactor = 0.7;
  float aspectRatio = uSize.y / uSize.x;
  vec2 tvTexCoord = vec2(vTexCoord.y, vTexCoord.x);
  vec4 finalColor = vec4(0.0f);
  float totalMaskValue = 0.0f;
  vec4 edgeColor = vec4(0.0f);
  float numRipples = 1.75;
  float timeThreshold = 1.1;
  vec2 adjustedClickCoord = calculateAdjustedTexCoord(vTexCoord, vec4(uClickPos, uClickPos + 0.1), aspectRatio);

  if (uNumMasks > 0) applyMaskSlot(uMaskTexture0, uMaskColor0, 0, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 1) applyMaskSlot(uMaskTexture1, uMaskColor1, 1, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 2) applyMaskSlot(uMaskTexture2, uMaskColor2, 2, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 3) applyMaskSlot(uMaskTexture3, uMaskColor3, 3, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 4) applyMaskSlot(uMaskTexture4, uMaskColor4, 4, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 5) applyMaskSlot(uMaskTexture5, uMaskColor5, 5, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 6) applyMaskSlot(uMaskTexture6, uMaskColor6, 6, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 7) applyMaskSlot(uMaskTexture7, uMaskColor7, 7, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 8) applyMaskSlot(uMaskTexture8, uMaskColor8, 8, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 9) applyMaskSlot(uMaskTexture9, uMaskColor9, 9, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);

  if (totalMaskValue > 0.0f) {
    finalColor /= totalMaskValue;
    finalColor = mix(color, finalColor, uOpacity);
  } else {
    finalColor.a = 0.0f;
  }
  if (edgeColor.a > 0.0f && uBorder) {
    finalColor = vec4(vec3(edgeColor), 1.0f);
  }
  fragColor = finalColor;
}
