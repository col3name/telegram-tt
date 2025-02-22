import type { FC } from '../../../lib/teact/teact';
import React from '../../../lib/teact/teact';

import type { OwnProps } from './SymbolMenu';

import { Bundles } from '../../../util/moduleLoader';

import useModuleLoader from '../../../hooks/useModuleLoader';

const SymbolMenuAsync: FC<OwnProps> = (props) => {
  const { isOpen } = props;
  const SymbolMenuNew = useModuleLoader(Bundles.Extra, 'SymbolMenuNew', !isOpen);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return SymbolMenuNew ? <SymbolMenuNew {...props} /> : undefined;
};

export default SymbolMenuAsync;
