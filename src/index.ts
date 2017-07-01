import * as React from 'react';
import { connect } from 'react-redux';

export interface Action {
  type: string;
  payload: string;
};

export type IActionCreator = (payload: string) => Action;

export type ISwitchCallback = (language: string) => void;

export interface IOptions {
  cache?: boolean;
  updateCacheOnSwitch?: boolean;
  switchCallback?: ISwitchCallback;
}

export interface IState<D> {
  dictionaries: {
    [language: string]: D
  },
  currentLang: string|null;
  loadingLang: string|null;
}


export type requestFunc = (language: string) => Promise<Object>

export interface ITranslated {
  currentLang: string;
  loadingLang: string;
  dictionary: object;
  switchLang: (language: string) => void;
}


const switchLangActionType: string = 'reduxTranslations__switchLang';


// redux action creator
export const switchLangActionCreator: IActionCreator = language => ({
  type: switchLangActionType,
  payload: language,
});


// list of mounted components
const translatedComponents = new Set<React.Component<any>>();
function updateTranslatedComponents() {
  translatedComponents.forEach(comp => comp.forceUpdate());
};


// default options for createTranslationsMiddleware function
const defaultOptions: IOptions = {
  cache: true,
  updateCacheOnSwitch: false,
};


// initial translations state
const __state: IState<object> = {
  // map of dictionaries
  dictionaries: {},
  currentLang: null,
  loadingLang: null,
};


export function createTranslationsMiddleware(
  requestFunc: requestFunc,
  passedOptions: IOptions = {},
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
};


// Function that takes Component class or function
// and returns the new PureComponent class that render
// the first one with additional props:
// switchLang, currentLang, loadingLang, dictionary
export default function withTranslations<P>(
  Component: React.ComponentClass<P & ITranslated>
): React.ComponentClass<P> {
  const ConnectedComponent: React.ComponentClass = connect(null, {
    switchLang: switchLangActionCreator,
  })(Component);

  return class Translated extends React.PureComponent<P, {}> {
    static displayName = `withTranslations( ${getDisplayName(Component)} )`

    componentDidMount() { translatedComponents.add(this); }

    componentWillUnmount() { translatedComponents.delete(this); }

    render(): JSX.Element {
      const {
        dictionaries,
        currentLang,
        loadingLang
      }: IState<object> = __state;

      const dictionary: object = (
        currentLang && dictionaries[currentLang]
      ) || {};

      const props = {};
      Object.assign(
        props,
        this.props,
        { currentLang, loadingLang, dictionary }
      );

      return React.createElement(ConnectedComponent, props);
    }
  };
}


function getDisplayName(Component) {
  return Component.displayName || Component.name || 'Component';
}
