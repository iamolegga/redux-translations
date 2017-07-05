import * as React from 'react';
import { connect } from 'react-redux';

export interface Action {
  type: string;
  payload: string;
}

export type IActionCreator = (payload: string) => Action;

export type ISwitchCallback = (language: string) => void;

export interface IOptions {
  cache?: boolean;
  updateCacheOnSwitch?: boolean;
  switchCallback?: ISwitchCallback;
}

export interface IState<D> {
  dictionaries: {
    [language: string]: D;
  };
  currentLang: string | null;
  loadingLang: string | null;
}

export type requestFunc = (language: string) => Promise<Object>;

export interface ITranslated {
  currentLang: string;
  loadingLang: string;
  dictionary: object;
  switchLang: (language: string) => void;
}

/**
 * Type for FSA Action
 */
const switchLangActionType: string = 'reduxTranslations__switchLang';

/**
 * FSA Action creator
 * @param {string} language string
 * @return FSA-Action
 */
export const switchLangActionCreator: IActionCreator = language => ({
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
const defaultOptions: IOptions = {
  cache: true,
  updateCacheOnSwitch: false,
};

/**
 * Initial translations state
 * @property {Object} dictionaries - hash-table of dictionaries, where key is language name and value is dictionary
 * @property {string} currentLang - current language with fetched dictionary
 * @property {string} loadingLang - language that user is switching to, but not fetched dictionary yet
 */
const __state: IState<object> = {
  dictionaries: {},
  currentLang: null,
  loadingLang: null,
};

/**
 * Translations middleware creator
 * @param {function} requestFunc - function, that takes name of language and returns Promise<Dictionary>
 * @param {Object} passedOptions - options
 * @param {boolean} passedOptions.cache - use cached dictionary
 * @param {boolean} passedOptions.updateCacheOnSwitch - request dictionary again if cached
 * @param {void} passedOptions.switchCallback - callback from language on switching
 */
export function createTranslationsMiddleware(
  requestFunc: requestFunc,
  passedOptions: IOptions = {}
) {
  // merge default and passed options
  const options: IOptions = {
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

      if (typeof options.switchCallback === 'function') {
        options.switchCallback(switchingLang);
      }

      // if already loaded and using cache
      if (__state.dictionaries[switchingLang] && options.cache) {
        // just set currentLang ...
        __state.currentLang = switchingLang;
        // ... and clear loadingLang for race condition
        __state.loadingLang = null;

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
      }
      updateTranslatedComponents();

      requestFunc(switchingLang).then(dictionary => {
        // update dictionary on load
        __state.dictionaries[switchingLang] = dictionary;
        // if didn't switch lang while waiting for response
        if (__state.loadingLang === switchingLang) {
          __state.currentLang = switchingLang;
          __state.loadingLang = null;
          updateTranslatedComponents();
        }
      });
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
export default function withTranslations<P>(
  Component: React.ComponentClass<P & ITranslated>
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
      }: IState<object> = __state;

      const dictionary: object =
        (currentLang && dictionaries[currentLang]) || {};

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
