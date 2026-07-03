// Shape of the props the Reel composition consumes.
// A daily run writes one JSON file per reel matching this shape, then
// render-reel.mjs feeds it in as input props.
export type Scene = {
  // Optional small kicker above the headline (e.g. "01", "THE SHIFT")
  kicker?: string;
  // The main line(s) for this scene. Keep it short — 4 to 9 words reads best.
  headline: string;
  // Optional one-line support under the headline.
  sub?: string;
  // One word in `headline` to emphasise in serif/accent (case-sensitive match).
  emphasis?: string;
};

export type ReelProps = {
  // Top-of-screen brand handle, shown the whole reel.
  handle: string;
  // Accent hex used for the progress bar + emphasis word.
  accent: string;
  // Hook scene shows first and lingers slightly longer.
  scenes: Scene[];
  // Frames each scene holds (default 75 @ 30fps = 2.5s).
  secondsPerScene?: number;
};

export const defaultReelProps: ReelProps = {
  handle: '@harshdecodeai',
  accent: '#38bdf8',
  secondsPerScene: 2.6,
  scenes: [
    { kicker: 'THE SHIFT', headline: 'AI is not coming for your job', emphasis: 'job' },
    { headline: 'It is coming for your tasks', sub: 'and that changes everything', emphasis: 'tasks' },
    { kicker: '01', headline: 'The people who win automate the boring 80%' },
    { kicker: '02', headline: 'Then spend the freed time on the 20% only they can do' },
    { headline: 'Leverage beats hours now', emphasis: 'Leverage' },
    { headline: 'Save this. Build your unfair advantage.', sub: 'Follow @harshdecodeai' },
  ],
};
