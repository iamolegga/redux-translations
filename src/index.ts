import * as React from 'react';
import { connect } from 'react-redux';

export type IAction = Redux.Action & { payload: string };

export type IStartSwitchCallback<S> =
  (language: string, store: Redux.Store<S>) => void;

export type IEndSwitchCallback<S,D> =
  (language: string, dictionary: D, store: Redux.Store<S>) => void;

export interface IOptions<S,D> {
  cache?: boolean;
  updateCacheOnSwitch?: boolean;
  startSwitchCallback?: IStartSwitchCallback<S>;
  endSwitchCallback?: IEndSwitchCallback<S,D>;
}

export interface IState<D> {
  dictionaries: {
    [language: string]: D;
  };
  currentLang: string | null;
  loadingLang: string | null;
}

export type requestFunc<D> = (language: string) => Promise<D>;

export interface ITranslated<D> {
  currentLang: string;
  loadingLang: string;
  dictionary: D;
  switchLang: (language: string) => void;
}

/**
 * Type for FSA Action
 */
const switchLangActionType = 'REDUX_TRANSLATIONS_SWITCH_LANG';

/**
 * FSA Action creator
 * @param {string} language string
 * @return FSA-Action
 */
export const switchLangActionCreator: Redux.ActionCreator<IAction> =
  language => ({
    type: switchLangActionType,
    payload: language,
  });

/**
 * List of mounted components that depends on translations
 */
const translatedComponents = new Set<React.Component<any>>();

/**
 * Update mounted components that depends on translations
 */
function updateTranslatedComponents() {
  translatedComponents.forEach(comp => comp.forceUpdate());
}

/**
 * Default options for createTranslationsMiddleware function
 * @property {boolean} cache - use cached dictionary
 * @property {boolean} updateCacheOnSwitch - request dictionary again if cached
 */
const defaultOptions: IOptions<any, any> = {
  cache: true,
  updateCacheOnSwitch: false,
};

/**
 * Initial translations state
 * @property {Object} dictionaries - hash-table of dictionaries, where key is language name and value is dictionary
 * @property {string} currentLang - current language with fetched dictionary
 * @property {string} loadingLang - language that user is switching to, but not fetched dictionary yet
 */
let __state: IState<any>;

/**
 * Translations middleware creator
 * @param {function} requestFunc - function, that takes name of language and returns Promise<Dictionary>
 * @param {Object} passedOptions - options
 * @param {boolean} passedOptions.cache - use cached dictionary
 * @param {boolean} passedOptions.updateCacheOnSwitch - request dictionary again if cached
 * @param {void} passedOptions.startSwitchCallback - callback on start switching. Takes language and store.
 */
export function createTranslationsMiddleware<D,S>(
  requestFunc: requestFunc<D>,
  passedOptions: IOptions<S,D> = {}
) {
  // init state
  __state = {
    dictionaries: {},
    currentLang: null,
    loadingLang: null,
  };

  // merge default and passed options
  const options: IOptions<S,D> = {
    ...defaultOptions,
    ...passedOptions,
  };

  return store => next => action => {
    if (action.type === switchLangActionType) {
      const switchingLang = action.payload;

      if (typeof switchingLang !== 'string') {
        throw new Error(
          'switchLangActionCreator and switchLang property ' +
            'should be called with argument typeof string.'
        );
      }

      // do nothing when switching to current language
      if (switchingLang === __state.currentLang) {
        return next(action);
      }

      if (typeof options.startSwitchCallback === 'function') {
        options.startSwitchCallback(switchingLang, store);
      }

      // if already loaded and using cache
      if (__state.dictionaries[switchingLang] && options.cache) {
        // just set currentLang ...
        __state.currentLang = switchingLang;
        // ... and clear loadingLang for race condition
        __state.loadingLang = null;

        if (typeof options.endSwitchCallback === 'function') {
          options.endSwitchCallback(
            switchingLang,
            __state.dictionaries[switchingLang],
            store
          );
        }

        // if need to update cached dictionary on switch
        if (options.updateCacheOnSwitch) {
          requestFunc(switchingLang).then(dictionary => {
            // update dictionary, without changing other props
            __state.dictionaries[switchingLang] = dictionary;
            updateTranslatedComponents();
          });
        }

        // if not using cache or didn't loaded lang before
      } else {
        // set loading
        __state.loadingLang = switchingLang;

        // request dictionary
        requestFunc(switchingLang).then(dictionary => {
          // update dictionary on load
          __state.dictionaries[switchingLang] = dictionary;
          
          // if didn't switch lang while waiting for response
          if (__state.loadingLang === switchingLang) {
            __state.currentLang = switchingLang;
            __state.loadingLang = null;

            if (typeof options.endSwitchCallback === 'function') {
              options.endSwitchCallback(
                switchingLang,
                dictionary,
                store,
              );
            }

            updateTranslatedComponents();
          }
        });
      }
      updateTranslatedComponents();
    }
    return next(action);
  };
}

/**
 * Function that takes Component class or function and returns the new PureComponent class that render the first one with additional props:
 * - switchLang,
 * - currentLang,
 * - loadingLang,
 * - dictionary.
 * @param {React.ComponentClass} Component - component that depends on props, listed above
 * @return {React.ComponentClass}
 */
export default function withTranslations<P,D>(
  Component: React.ComponentClass<P & ITranslated<D>>
): React.ComponentClass<P> {
  const ConnectedComponent: React.ComponentClass = connect(null, {
    switchLang: switchLangActionCreator,
  })(Component);

  return class Translated extends React.PureComponent<P, {}> {
    static displayName = `withTranslations( ${getDisplayName(Component)} )`;

    componentDidMount() {
      translatedComponents.add(this);
    }

    componentWillUnmount() {
      translatedComponents.delete(this);
    }

    render(): JSX.Element {
      const {
        dictionaries,
        currentLang,
        loadingLang,
      }: IState<D> = __state;

      const dictionary = (currentLang && dictionaries[currentLang]) || {};

      const props = {};
      Object.assign(props, this.props, {
        currentLang,
        loadingLang,
        dictionary,
      });

      return React.createElement(ConnectedComponent, props);
    }
  };
}

/**
 * Get component name
 * @param Component 
 * @return {string}
 */
function getDisplayName(Component) {
  return Component.displayName || Component.name || 'Component';
}
