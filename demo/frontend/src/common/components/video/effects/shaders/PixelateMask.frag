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
uniform mediump vec2 uSize;
uniform lowp float uBlockSize;
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

void main() {
  vec2 uv = vTexCoord.xy;
  float dx = uBlockSize / uSize.x;
  float dy = uBlockSize / uSize.y;
  vec2 sampleCoord = (vec2(dx*floor(uv.x/dx), dy*floor(uv.y/dy)) +
                      vec2(dx*ceil(uv.x/dx),  dy*ceil(uv.y/dy))) / 2.0f;
  vec4 color = texture(uSampler, sampleCoord);

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

  fragColor = m > 0.0f ? color : vec4(0.0f);
}
