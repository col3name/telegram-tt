import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useSignal } from '../lib/teact/teact';
import { addExtraClass, toggleExtraClass } from '../lib/teact/teact-dom';

import type { Signal } from '../util/signals';

import { requestMeasure } from '../lib/fasterdom/fasterdom';
import useDerivedSignal from './useDerivedSignal';
import useDerivedState from './useDerivedState';
import useLastCallback from './useLastCallback';
import { useStateRef } from './useStateRef';
import useSyncEffectWithPrevDeps from './useSyncEffectWithPrevDeps';

const CLOSE_DURATION = 350;

type BaseHookParams<RefType extends HTMLElement> = {
  isOpen: boolean | undefined;
  ref?: RefObject<RefType>;
  noMountTransition?: boolean;
  noOpenTransition?: boolean;
  noCloseTransition?: boolean;
  closeDuration?: number;
  className?: string | false;
  prefix?: string;
  onCloseAnimationEnd?: NoneToVoidFunction;
};

export type HookParams<RefType extends HTMLElement> = BaseHookParams<RefType> & {
  withShouldRender?: never;
};

type HookParamsWithShouldRender<RefType extends HTMLElement> = BaseHookParams<RefType> & {
  withShouldRender: true;
};

type HookResult<RefType extends HTMLElement> = {
  ref: RefObject<RefType>;
  getIsClosing: Signal<boolean>;
};

type HookResultWithShouldRender<RefType extends HTMLElement> = HookResult<RefType> & {
  shouldRender: boolean;
};

type State =
  'closed'
  | 'scheduled-open'
  | 'open'
  | 'closing';

export default function useShowTransition<RefType extends HTMLElement = HTMLDivElement>(
  params: HookParams<RefType>
): HookResult<RefType>;
export default function useShowTransition<RefType extends HTMLElement = HTMLDivElement>(
  params: HookParamsWithShouldRender<RefType>
): HookResultWithShouldRender<RefType>;
export default function useShowTransition<RefType extends HTMLElement = HTMLDivElement>(
  params: HookParams<RefType> | HookParamsWithShouldRender<RefType>,
): HookResult<RefType> | HookResultWithShouldRender<RefType> {
  const {
    isOpen,
    noMountTransition = false,
    noOpenTransition = false,
    noCloseTransition = false,
    closeDuration = CLOSE_DURATION,
    className = 'fast',
    prefix = '',
    onCloseAnimationEnd,
  } = params;
  let ref = params.ref;

  const withShouldRender = 'withShouldRender' in params && params.withShouldRender;

  // eslint-disable-next-line no-null/no-null
  const localRef = useRef<RefType>(null);
  ref ||= localRef;
  const closingTimeoutRef = useRef<number>();
  const [getState, setState] = useSignal<State | undefined>();
  const optionsRef = useStateRef({
    closeDuration, noMountTransition, noOpenTransition, noCloseTransition,
  });
  const onCloseEndLast = useLastCallback(onCloseAnimationEnd);

  useSyncEffectWithPrevDeps(([prevIsOpen]) => {
    const options = optionsRef.current;

    if (isOpen) {
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
        closingTimeoutRef.current = undefined;
      }

      if (options.noOpenTransition || (prevIsOpen === undefined && options.noMountTransition)) {
        setState('open');
      } else {
        setState('scheduled-open');
        requestMeasure(() => {
          setState('open');
        });
      }
    } else if (prevIsOpen === undefined || options.noCloseTransition) {
      setState('closed');
    } else {
      setState('closing');

      closingTimeoutRef.current = window.setTimeout(() => {
        setState('closed');
        onCloseEndLast();
      }, options.closeDuration);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (className !== false) {
      addExtraClass(element, 'opacity-transition');
      addExtraClass(element, className);
    }

    const state = getState();
    const shouldRender = state !== 'closed';
    const hasOpenClass = state === 'open';
    const isClosing = state === 'closing';

    toggleExtraClass(element, `${prefix}shown`, shouldRender);
    toggleExtraClass(element, `${prefix}not-shown`, !shouldRender);
    toggleExtraClass(element, `${prefix}open`, hasOpenClass);
    toggleExtraClass(element, `${prefix}not-open`, !hasOpenClass);
    toggleExtraClass(element, `${prefix}closing`, isClosing);
  }, [className, getState, prefix, ref]);

  const shouldRender = useDerivedState(
    () => (withShouldRender && getState() !== 'closed'),
    [withShouldRender, getState],
  );
  const getIsClosing = useDerivedSignal(() => getState() === 'closing', [getState]);

  if (withShouldRender) {
    return { ref, shouldRender, getIsClosing };
  }

  return { ref, getIsClosing };
}
