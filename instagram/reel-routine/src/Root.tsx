import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel';
import { defaultReelProps, ReelProps } from './reelData';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={Math.round((defaultReelProps.secondsPerScene ?? 2.6) * FPS) * defaultReelProps.scenes.length}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaultReelProps}
      // Duration scales with the number of scenes in the supplied props.
      calculateMetadata={({ props }) => {
        const p = props as ReelProps;
        const per = Math.round((p.secondsPerScene ?? 2.6) * FPS);
        return { durationInFrames: per * p.scenes.length, fps: FPS, width: 1080, height: 1920 };
      }}
    />
  );
};
