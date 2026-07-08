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
uniform float uContrast;
uniform int uNumMasks;
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

out vec4 fragColor;

vec3 applySepia(vec4 color) {
  float gray = dot(color.rgb, vec3(0.3, 0.59, 0.11));
  vec3 sepia = vec3(gray) * vec3(1.2, 1.0, 0.8);
  sepia.r = min(sepia.r, 1.0);
  sepia.g = min(sepia.g, 1.0);
  sepia.b = min(sepia.b, 1.0);
  return sepia;
}

void main() {
  vec4 color = texture(uSampler, vTexCoord);
  vec2 tc = vec2(vTexCoord.y, vTexCoord.x);

  float m = 0.0;
  if (uNumMasks > 0) m += texture(uMaskTexture0, tc).r;
  if (uNumMasks > 1) m += texture(uMaskTexture1, tc).r;
  if (uNumMasks > 2) m += texture(uMaskTexture2, tc).r;
  if (uNumMasks > 3) m += texture(uMaskTexture3, tc).r;
  if (uNumMasks > 4) m += texture(uMaskTexture4, tc).r;
  if (uNumMasks > 5) m += texture(uMaskTexture5, tc).r;
  if (uNumMasks > 6) m += texture(uMaskTexture6, tc).r;
  if (uNumMasks > 7) m += texture(uMaskTexture7, tc).r;
  if (uNumMasks > 8) m += texture(uMaskTexture8, tc).r;
  if (uNumMasks > 9) m += texture(uMaskTexture9, tc).r;

  bool overlap = m > 0.0f;
  if (overlap) {
    if (uContrast == 0.0) {
      color = vec4(applySepia(color), color.a);
    } else {
      color.rgb = ((color.rgb - 0.5) * max(uContrast, 0.0)) + 0.5;
    }
    fragColor = color;
  } else {
    fragColor = vec4(0.0f);
  }
}
