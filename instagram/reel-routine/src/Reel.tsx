import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadSans } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { ReelProps, Scene } from './reelData';

const { fontFamily: SANS } = loadSans();
const { fontFamily: SERIF } = loadSerif();

// Harsh Raj Pathak cream design system — mirrors the branded carousel theme.
const BG = '#F8F7F3';
const FG = '#111111';
const MUTED = '#555555';

const renderHeadline = (headline: string, emphasis: string | undefined, accent: string) => {
  if (!emphasis || !headline.includes(emphasis)) return headline;
  const [before, ...rest] = headline.split(emphasis);
  const after = rest.join(emphasis);
  return (
    <>
      {before}
      <span style={{ fontFamily: SERIF, fontStyle: 'italic', color: accent }}>{emphasis}</span>
      {after}
    </>
  );
};

const SceneCard: React.FC<{ scene: Scene; accent: string; durationInFrames: number }> = ({
  scene,
  accent,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200, mass: 0.7 }, durationInFrames: 18 });
  const y = interpolate(entrance, [0, 1], [40, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 96px',
        opacity: opacity * exit,
        transform: `translateY(${y}px)`,
      }}
    >
      {scene.kicker ? (
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: 28,
          }}
        >
          {scene.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 96,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: FG,
        }}
      >
        {renderHeadline(scene.headline, scene.emphasis, accent)}
      </div>
      {scene.sub ? (
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, lineHeight: 1.4, color: MUTED, marginTop: 32 }}>
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({ handle, accent, scenes, secondsPerScene = 2.6 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const per = Math.round(secondsPerScene * fps);
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* soft brand glow top */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 40% at 50% 16%, ${accent}1f 0%, transparent 70%)`,
        }}
      />

      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * per} durationInFrames={per}>
          <SceneCard scene={scene} accent={accent} durationInFrames={per} />
        </Sequence>
      ))}

      {/* persistent brand handle (star + name, like the carousel header) */}
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 90 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: 'rgba(17,17,17,0.72)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {handle}
        </div>
      </AbsoluteFill>

      {/* progress bar */}
      <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
        <div style={{ height: 8, width: '100%', backgroundColor: 'rgba(17,17,17,0.10)' }}>
          <div style={{ height: 8, width: `${progress * 100}%`, backgroundColor: accent }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
