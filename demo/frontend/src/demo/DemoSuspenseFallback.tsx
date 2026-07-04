/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Licensed under the Apache License, Version 2.0
 */
import FullscreenLoader from '@/common/loading/FullscreenLoader';

export default function DemoSuspenseFallback() {
  return <FullscreenLoader loadingStep={0} />;
}
