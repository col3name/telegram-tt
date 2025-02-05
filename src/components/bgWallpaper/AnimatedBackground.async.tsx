import {FC} from '../../lib/teact/teact';
import React from '../../lib/teact/teact';

import type { OwnProps } from './AnimatedBackground';

import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

const AnimatedBackgroundAsync: FC<OwnProps> = (props) => {
  // const { isActive } = props;
  const AnimatedBackground = useModuleLoader(Bundles.Extra, 'AnimatedBackground');

  // eslint-disable-next-line react/jsx-props-no-spreading
  return AnimatedBackground ? <AnimatedBackground {...props} /> : undefined;
};

export default AnimatedBackgroundAsync;
