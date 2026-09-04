import React from 'react';
import {Composition, CalculateMetadataFunction} from 'remotion';
import {AnimillComposition, AnimillProps, dimensionsFor, durationFramesFor} from './AnimillComposition';

const defaultProject = {
  name: 'ANIMILL',
  aspect: 'mobile_9_16',
  fps: 30,
  scenes: [{name: 'Scene 1', duration: 1000, blocks: []}],
};

const calculateMetadata: CalculateMetadataFunction<AnimillProps> = async ({props}) => {
  const project = props.project || defaultProject;
  const [width, height] = dimensionsFor(project.aspect);
  const fps = Math.max(1, Math.min(120, Math.round(Number(project.fps || 30))));
  return {width, height, fps, durationInFrames: durationFramesFor(project, fps), props: {project}};
};

export const AnimillRoot: React.FC = () => (
  <Composition
    id="Animill"
    component={AnimillComposition}
    defaultProps={{project: defaultProject}}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30}
    calculateMetadata={calculateMetadata}
  />
);
