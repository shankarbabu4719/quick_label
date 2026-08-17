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
uniform sampler2D uMaskTexture10;
uniform sampler2D uMaskTexture11;
uniform sampler2D uMaskTexture12;
uniform sampler2D uMaskTexture13;
uniform sampler2D uMaskTexture14;
uniform sampler2D uMaskTexture15;
uniform sampler2D uMaskTexture16;
uniform sampler2D uMaskTexture17;
uniform sampler2D uMaskTexture18;
uniform sampler2D uMaskTexture19;
uniform sampler2D uMaskTexture20;
uniform sampler2D uMaskTexture21;
uniform sampler2D uMaskTexture22;
uniform sampler2D uMaskTexture23;
uniform sampler2D uMaskTexture24;
uniform sampler2D uMaskTexture25;
uniform sampler2D uMaskTexture26;
uniform sampler2D uMaskTexture27;
uniform sampler2D uMaskTexture28;
uniform sampler2D uMaskTexture29;
uniform sampler2D uMaskTexture30;
uniform sampler2D uMaskTexture31;
uniform sampler2D uMaskTexture32;
uniform sampler2D uMaskTexture33;
uniform sampler2D uMaskTexture34;
uniform sampler2D uMaskTexture35;
uniform sampler2D uMaskTexture36;
uniform sampler2D uMaskTexture37;
uniform sampler2D uMaskTexture38;
uniform sampler2D uMaskTexture39;
uniform sampler2D uMaskTexture40;
uniform sampler2D uMaskTexture41;
uniform sampler2D uMaskTexture42;
uniform sampler2D uMaskTexture43;
uniform sampler2D uMaskTexture44;
uniform sampler2D uMaskTexture45;
uniform sampler2D uMaskTexture46;
uniform sampler2D uMaskTexture47;
uniform sampler2D uMaskTexture48;
uniform sampler2D uMaskTexture49;
uniform sampler2D uMaskTexture50;
uniform sampler2D uMaskTexture51;
uniform sampler2D uMaskTexture52;
uniform sampler2D uMaskTexture53;
uniform sampler2D uMaskTexture54;
uniform sampler2D uMaskTexture55;
uniform sampler2D uMaskTexture56;
uniform sampler2D uMaskTexture57;
uniform sampler2D uMaskTexture58;
uniform sampler2D uMaskTexture59;
uniform sampler2D uMaskTexture60;
uniform sampler2D uMaskTexture61;
uniform sampler2D uMaskTexture62;
uniform sampler2D uMaskTexture63;
uniform sampler2D uMaskTexture64;
uniform sampler2D uMaskTexture65;
uniform sampler2D uMaskTexture66;
uniform sampler2D uMaskTexture67;
uniform sampler2D uMaskTexture68;
uniform sampler2D uMaskTexture69;
uniform sampler2D uMaskTexture70;
uniform sampler2D uMaskTexture71;
uniform sampler2D uMaskTexture72;
uniform sampler2D uMaskTexture73;
uniform sampler2D uMaskTexture74;
uniform sampler2D uMaskTexture75;
uniform sampler2D uMaskTexture76;
uniform sampler2D uMaskTexture77;
uniform sampler2D uMaskTexture78;
uniform sampler2D uMaskTexture79;
uniform sampler2D uMaskTexture80;
uniform sampler2D uMaskTexture81;
uniform sampler2D uMaskTexture82;
uniform sampler2D uMaskTexture83;
uniform sampler2D uMaskTexture84;
uniform sampler2D uMaskTexture85;
uniform sampler2D uMaskTexture86;
uniform sampler2D uMaskTexture87;
uniform sampler2D uMaskTexture88;
uniform sampler2D uMaskTexture89;
uniform sampler2D uMaskTexture90;
uniform sampler2D uMaskTexture91;
uniform sampler2D uMaskTexture92;
uniform sampler2D uMaskTexture93;
uniform sampler2D uMaskTexture94;
uniform sampler2D uMaskTexture95;
uniform sampler2D uMaskTexture96;
uniform sampler2D uMaskTexture97;
uniform sampler2D uMaskTexture98;
uniform sampler2D uMaskTexture99;
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
uniform vec4 uMaskColor10;
uniform vec4 uMaskColor11;
uniform vec4 uMaskColor12;
uniform vec4 uMaskColor13;
uniform vec4 uMaskColor14;
uniform vec4 uMaskColor15;
uniform vec4 uMaskColor16;
uniform vec4 uMaskColor17;
uniform vec4 uMaskColor18;
uniform vec4 uMaskColor19;
uniform vec4 uMaskColor20;
uniform vec4 uMaskColor21;
uniform vec4 uMaskColor22;
uniform vec4 uMaskColor23;
uniform vec4 uMaskColor24;
uniform vec4 uMaskColor25;
uniform vec4 uMaskColor26;
uniform vec4 uMaskColor27;
uniform vec4 uMaskColor28;
uniform vec4 uMaskColor29;
uniform vec4 uMaskColor30;
uniform vec4 uMaskColor31;
uniform vec4 uMaskColor32;
uniform vec4 uMaskColor33;
uniform vec4 uMaskColor34;
uniform vec4 uMaskColor35;
uniform vec4 uMaskColor36;
uniform vec4 uMaskColor37;
uniform vec4 uMaskColor38;
uniform vec4 uMaskColor39;
uniform vec4 uMaskColor40;
uniform vec4 uMaskColor41;
uniform vec4 uMaskColor42;
uniform vec4 uMaskColor43;
uniform vec4 uMaskColor44;
uniform vec4 uMaskColor45;
uniform vec4 uMaskColor46;
uniform vec4 uMaskColor47;
uniform vec4 uMaskColor48;
uniform vec4 uMaskColor49;
uniform vec4 uMaskColor50;
uniform vec4 uMaskColor51;
uniform vec4 uMaskColor52;
uniform vec4 uMaskColor53;
uniform vec4 uMaskColor54;
uniform vec4 uMaskColor55;
uniform vec4 uMaskColor56;
uniform vec4 uMaskColor57;
uniform vec4 uMaskColor58;
uniform vec4 uMaskColor59;
uniform vec4 uMaskColor60;
uniform vec4 uMaskColor61;
uniform vec4 uMaskColor62;
uniform vec4 uMaskColor63;
uniform vec4 uMaskColor64;
uniform vec4 uMaskColor65;
uniform vec4 uMaskColor66;
uniform vec4 uMaskColor67;
uniform vec4 uMaskColor68;
uniform vec4 uMaskColor69;
uniform vec4 uMaskColor70;
uniform vec4 uMaskColor71;
uniform vec4 uMaskColor72;
uniform vec4 uMaskColor73;
uniform vec4 uMaskColor74;
uniform vec4 uMaskColor75;
uniform vec4 uMaskColor76;
uniform vec4 uMaskColor77;
uniform vec4 uMaskColor78;
uniform vec4 uMaskColor79;
uniform vec4 uMaskColor80;
uniform vec4 uMaskColor81;
uniform vec4 uMaskColor82;
uniform vec4 uMaskColor83;
uniform vec4 uMaskColor84;
uniform vec4 uMaskColor85;
uniform vec4 uMaskColor86;
uniform vec4 uMaskColor87;
uniform vec4 uMaskColor88;
uniform vec4 uMaskColor89;
uniform vec4 uMaskColor90;
uniform vec4 uMaskColor91;
uniform vec4 uMaskColor92;
uniform vec4 uMaskColor93;
uniform vec4 uMaskColor94;
uniform vec4 uMaskColor95;
uniform vec4 uMaskColor96;
uniform vec4 uMaskColor97;
uniform vec4 uMaskColor98;
uniform vec4 uMaskColor99;
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
  if (uNumMasks > 10) applyMaskSlot(uMaskTexture10, uMaskColor10, 10, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 11) applyMaskSlot(uMaskTexture11, uMaskColor11, 11, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 12) applyMaskSlot(uMaskTexture12, uMaskColor12, 12, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 13) applyMaskSlot(uMaskTexture13, uMaskColor13, 13, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 14) applyMaskSlot(uMaskTexture14, uMaskColor14, 14, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 15) applyMaskSlot(uMaskTexture15, uMaskColor15, 15, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 16) applyMaskSlot(uMaskTexture16, uMaskColor16, 16, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 17) applyMaskSlot(uMaskTexture17, uMaskColor17, 17, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 18) applyMaskSlot(uMaskTexture18, uMaskColor18, 18, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 19) applyMaskSlot(uMaskTexture19, uMaskColor19, 19, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 20) applyMaskSlot(uMaskTexture20, uMaskColor20, 20, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 21) applyMaskSlot(uMaskTexture21, uMaskColor21, 21, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 22) applyMaskSlot(uMaskTexture22, uMaskColor22, 22, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 23) applyMaskSlot(uMaskTexture23, uMaskColor23, 23, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 24) applyMaskSlot(uMaskTexture24, uMaskColor24, 24, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 25) applyMaskSlot(uMaskTexture25, uMaskColor25, 25, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 26) applyMaskSlot(uMaskTexture26, uMaskColor26, 26, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 27) applyMaskSlot(uMaskTexture27, uMaskColor27, 27, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 28) applyMaskSlot(uMaskTexture28, uMaskColor28, 28, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 29) applyMaskSlot(uMaskTexture29, uMaskColor29, 29, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 30) applyMaskSlot(uMaskTexture30, uMaskColor30, 30, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 31) applyMaskSlot(uMaskTexture31, uMaskColor31, 31, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 32) applyMaskSlot(uMaskTexture32, uMaskColor32, 32, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 33) applyMaskSlot(uMaskTexture33, uMaskColor33, 33, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 34) applyMaskSlot(uMaskTexture34, uMaskColor34, 34, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 35) applyMaskSlot(uMaskTexture35, uMaskColor35, 35, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 36) applyMaskSlot(uMaskTexture36, uMaskColor36, 36, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 37) applyMaskSlot(uMaskTexture37, uMaskColor37, 37, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 38) applyMaskSlot(uMaskTexture38, uMaskColor38, 38, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 39) applyMaskSlot(uMaskTexture39, uMaskColor39, 39, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 40) applyMaskSlot(uMaskTexture40, uMaskColor40, 40, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 41) applyMaskSlot(uMaskTexture41, uMaskColor41, 41, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 42) applyMaskSlot(uMaskTexture42, uMaskColor42, 42, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 43) applyMaskSlot(uMaskTexture43, uMaskColor43, 43, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 44) applyMaskSlot(uMaskTexture44, uMaskColor44, 44, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 45) applyMaskSlot(uMaskTexture45, uMaskColor45, 45, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 46) applyMaskSlot(uMaskTexture46, uMaskColor46, 46, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 47) applyMaskSlot(uMaskTexture47, uMaskColor47, 47, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 48) applyMaskSlot(uMaskTexture48, uMaskColor48, 48, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 49) applyMaskSlot(uMaskTexture49, uMaskColor49, 49, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 50) applyMaskSlot(uMaskTexture50, uMaskColor50, 50, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 51) applyMaskSlot(uMaskTexture51, uMaskColor51, 51, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 52) applyMaskSlot(uMaskTexture52, uMaskColor52, 52, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 53) applyMaskSlot(uMaskTexture53, uMaskColor53, 53, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 54) applyMaskSlot(uMaskTexture54, uMaskColor54, 54, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 55) applyMaskSlot(uMaskTexture55, uMaskColor55, 55, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 56) applyMaskSlot(uMaskTexture56, uMaskColor56, 56, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 57) applyMaskSlot(uMaskTexture57, uMaskColor57, 57, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 58) applyMaskSlot(uMaskTexture58, uMaskColor58, 58, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 59) applyMaskSlot(uMaskTexture59, uMaskColor59, 59, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 60) applyMaskSlot(uMaskTexture60, uMaskColor60, 60, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 61) applyMaskSlot(uMaskTexture61, uMaskColor61, 61, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 62) applyMaskSlot(uMaskTexture62, uMaskColor62, 62, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 63) applyMaskSlot(uMaskTexture63, uMaskColor63, 63, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 64) applyMaskSlot(uMaskTexture64, uMaskColor64, 64, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 65) applyMaskSlot(uMaskTexture65, uMaskColor65, 65, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 66) applyMaskSlot(uMaskTexture66, uMaskColor66, 66, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 67) applyMaskSlot(uMaskTexture67, uMaskColor67, 67, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 68) applyMaskSlot(uMaskTexture68, uMaskColor68, 68, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 69) applyMaskSlot(uMaskTexture69, uMaskColor69, 69, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 70) applyMaskSlot(uMaskTexture70, uMaskColor70, 70, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 71) applyMaskSlot(uMaskTexture71, uMaskColor71, 71, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 72) applyMaskSlot(uMaskTexture72, uMaskColor72, 72, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 73) applyMaskSlot(uMaskTexture73, uMaskColor73, 73, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 74) applyMaskSlot(uMaskTexture74, uMaskColor74, 74, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 75) applyMaskSlot(uMaskTexture75, uMaskColor75, 75, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 76) applyMaskSlot(uMaskTexture76, uMaskColor76, 76, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 77) applyMaskSlot(uMaskTexture77, uMaskColor77, 77, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 78) applyMaskSlot(uMaskTexture78, uMaskColor78, 78, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 79) applyMaskSlot(uMaskTexture79, uMaskColor79, 79, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 80) applyMaskSlot(uMaskTexture80, uMaskColor80, 80, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 81) applyMaskSlot(uMaskTexture81, uMaskColor81, 81, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 82) applyMaskSlot(uMaskTexture82, uMaskColor82, 82, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 83) applyMaskSlot(uMaskTexture83, uMaskColor83, 83, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 84) applyMaskSlot(uMaskTexture84, uMaskColor84, 84, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 85) applyMaskSlot(uMaskTexture85, uMaskColor85, 85, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 86) applyMaskSlot(uMaskTexture86, uMaskColor86, 86, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 87) applyMaskSlot(uMaskTexture87, uMaskColor87, 87, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 88) applyMaskSlot(uMaskTexture88, uMaskColor88, 88, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 89) applyMaskSlot(uMaskTexture89, uMaskColor89, 89, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 90) applyMaskSlot(uMaskTexture90, uMaskColor90, 90, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 91) applyMaskSlot(uMaskTexture91, uMaskColor91, 91, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 92) applyMaskSlot(uMaskTexture92, uMaskColor92, 92, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 93) applyMaskSlot(uMaskTexture93, uMaskColor93, 93, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 94) applyMaskSlot(uMaskTexture94, uMaskColor94, 94, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 95) applyMaskSlot(uMaskTexture95, uMaskColor95, 95, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 96) applyMaskSlot(uMaskTexture96, uMaskColor96, 96, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 97) applyMaskSlot(uMaskTexture97, uMaskColor97, 97, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 98) applyMaskSlot(uMaskTexture98, uMaskColor98, 98, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);
  if (uNumMasks > 99) applyMaskSlot(uMaskTexture99, uMaskColor99, 99, color, saturationFactor, numRipples, timeThreshold, adjustedClickCoord, totalMaskValue, finalColor, edgeColor);

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
