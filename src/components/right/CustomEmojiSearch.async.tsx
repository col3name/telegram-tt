import type { FC } from '../../lib/teact/teact';
import React from '../../lib/teact/teact';

import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

import Loading from '../ui/Loading';

const StickerSearchAsync: FC = () => {
  const CustomEmojiSearch = useModuleLoader(Bundles.Extra, 'CustomEmojiSearch');

  // eslint-disable-next-line react/jsx-props-no-spreading
  return CustomEmojiSearch ? <CustomEmojiSearch /> : <Loading />;
};

export default StickerSearchAsync;
