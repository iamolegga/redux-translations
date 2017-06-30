import React from 'react';
import { connect } from 'react-redux';


const switchLangActionType = 'reduxTranslations__switchLang';


// redux action creator
export const switchLangActionCreator = language => ({
  type: switchLangActionType,
  payload: language,
});


// list of mounted components
const translatedComponents = new Set();
function updateTranslatedComponents() {
  translatedComponents.forEach(comp => comp.forceUpdate());
};


// default options for createTranslationsMiddleware function
const defaultOptions = {
  cache: true,
  updateCacheOnSwitch: false,
};


// initial translations state
const __state = {
  // map of dictionaries
  dictionaries: {},
  currentLang: null,
  loadingLang: null,
};


export function createTranslationsMiddleware(
  requestFunc,
  passedOptions = {},
) {
  // merge default and passed options
  const options = {
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

      requestFunc(loadingLang).then(dictionary => {
        // update dictionary on load
        __state.dictionaries[loadingLang] = dictionary;
        // if didn't switch lang while waiting for response
        if (__state.loadingLang === loadingLang) {
          __state.currentLang = loadingLang;
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
export default function withTranslations(Component) {
  const Connected = connect(null, {
    switchLang: switchLangActionCreator,
  })(Component);

  return class extends React.PureComponent {
    static displayName = `withTranslations( ${getDisplayName(Component)} )`
    componentDidMount() { translatedComponents.add(this); }
    componentWillUnmount() { translatedComponents.delete(this); }
    render() {
      const { currentLang, loadingLang } = __state;
      const dictionary = (currentLang && __state[currentLang]) || {};
      return (
        <Connected { ...this.props, currentLang, loadingLang, dictionary }/>
      )
    }
  };
}


function getDisplayName(Component) {
  return Component.displayName || Component.name || 'Component';
}
