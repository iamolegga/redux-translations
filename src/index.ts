import * as React from "react";
import { connect } from "react-redux";
import * as hoistNonReactStatics from "hoist-non-react-statics";

export type IAction = Redux.Action & { payload: string };

export type IStartSwitchCallback<S> = (
  language: string,
  store: Redux.Store<S>
) => void;

export type IEndSwitchCallback<S, D> = (
  language: string,
  dictionary: D,
  store: Redux.Store<S>
) => void;

export interface IOptions<S, D> {
  cache?: boolean;
  updateCacheOnSwitch?: boolean;
  startSwitchCallback?: IStartSwitchCallback<S>;
  endSwitchCallback?: IEndSwitchCallback<S, D>;
}

export interface IState<D> {
  dictionaries: {
    [language: string]: D;
  };
  currentLang: string | null;
  loadingLang: string | null;
}

export type requestFunc<D> = (language: string) => Promise<D>;

export interface ITranslatedStateProps<D> {
  currentLang: string;
  loadingLang: string;
  dictionary: D;
}
export interface ITranslatedDispatchProps {
  switchLang: (language: string) => void;
}
export interface ITranslated<D>
  extends ITranslatedStateProps<D>,
    ITranslatedDispatchProps {}

/**
 * Type for FSA Action
 */
const switchLangActionType = "REDUX_TRANSLATIONS_SWITCH_LANG";

/**
 * FSA Action creator
 * @param {string} language string
 * @return FSA-Action
 */
export const switchLangActionCreator: Redux.ActionCreator<
  IAction
> = language => ({
  type: switchLangActionType,
  payload: language
});

/**
 * List of mounted components that depends on translations
 */
const translatedComponents = new Set<React.Component<any>>();

/**
 * Update mounted components that depends on translations
 */
function updateTranslatedComponents() {
  return Promise.all(
    Array.from(translatedComponents.values()).map(
      comp => new Promise(resolve => comp.forceUpdate(resolve))
    )
  );
}

/**
 * Default options for createTranslationsMiddleware function
 * @property {boolean} cache - use cached dictionary
 * @property {boolean} updateCacheOnSwitch - request dictionary again if cached
 */
const defaultOptions: IOptions<any, any> = {
  cache: true,
  updateCacheOnSwitch: false
};

/**
 * Initial translations state
 * @property {Object} dictionaries - hash-table of dictionaries, where key is language name and value is dictionary
 * @property {string} currentLang - current language with fetched dictionary
 * @property {string} loadingLang - language that user is switching to, but not fetched dictionary yet
 */
let __state;

/**
 * Translations middleware creator
 * @param {function} requestFunc - function, that takes name of language and returns Promise<Dictionary>
 * @param {Object} passedOptions - options
 * @param {boolean} passedOptions.cache - use cached dictionary
 * @param {boolean} passedOptions.updateCacheOnSwitch - request dictionary again if cached
 * @param {void} passedOptions.startSwitchCallback - callback on start switching. Takes language and store.
 * @param {Object} initialState - initial inner-state object
 * @property {Object} initialState.dictionaries - hash-table of dictionaries, where key is language name and value is dictionary
 * @property {string} initialState.currentLang - current language with fetched dictionary
 * @property {string} initialState.loadingLang - language that user is switching to, but not fetched dictionary yet
 */
export function createTranslationsMiddleware<D, S>(
  requestFunc: requestFunc<D>,
  passedOptions: IOptions<S, D> = {},
  initialState?: Partial<IState<D>>
) {
  const defaultState: IState<D> = {
    dictionaries: {},
    currentLang: null,
    loadingLang: null
  };

  __state = defaultState as IState<D>;

  if (initialState) {
    Object.keys(defaultState).forEach(
      key => (__state[key] = initialState[key] || defaultState[key])
    );
  }

  // merge default and passed options
  const options: IOptions<S, D> = {
    ...defaultOptions,
    ...passedOptions
  };

  return store => next => action => {
    if (action.type === switchLangActionType) {
      const switchingLang = action.payload;

      if (typeof switchingLang !== "string") {
        throw new Error(
          "switchLangActionCreator and switchLang property " +
            "should be called with argument typeof string."
        );
      }

      // do nothing when switching to current language
      if (switchingLang === __state.currentLang) {
        return next(action);
      }

      if (typeof options.startSwitchCallback === "function") {
        options.startSwitchCallback(switchingLang, store);
      }

      // if already loaded and using cache
      if (__state.dictionaries[switchingLang] && options.cache) {
        // just set currentLang ...
        __state.currentLang = switchingLang;
        // ... and clear loadingLang for race condition
        __state.loadingLang = null;

        if (typeof options.endSwitchCallback === "function") {
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

            if (typeof options.endSwitchCallback === "function") {
              options.endSwitchCallback(switchingLang, dictionary, store);
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
 * @param {(React.ComponentClass<P & ITranslated<D>>
 *     | React.FC<P & ITranslated<D>>)} Component - component that depends on props, listed above
 * @param {Boolean} copyStaticMethods - whether to copy static methods of Component or not
 * @return {React.ComponentClass}
 */
export default function withTranslations<P, D>(
  Component:
    | React.ComponentClass<P & ITranslated<D>>
    | React.FC<P & ITranslated<D>>,
  copyStaticMethods: boolean = true
): React.ComponentClass<P> {
  const ConnectedComponent = connect<null, ITranslatedDispatchProps, P>(
    null,
    {
      switchLang: switchLangActionCreator
    }
  )(Component);

  class Translated extends React.PureComponent<P> {
    static displayName = `withTranslations( ${getDisplayName(Component)} )`;

    componentDidMount() {
      translatedComponents.add(this);
    }

    componentWillUnmount() {
      translatedComponents.delete(this);
    }

    render(): JSX.Element {
      const { dictionaries, currentLang, loadingLang } = __state as IState<D>;

      const dictionary = (currentLang && dictionaries[currentLang]) || {};

      const props = Object.assign({}, this.props, {
        currentLang,
        loadingLang,
        dictionary
      });

      return React.createElement(ConnectedComponent, props);
    }
  }

  if (copyStaticMethods) {
    hoistNonReactStatics(Translated, Component);
  }

  return Translated;
}

/**
 * Get component name
 * @param Component
 * @return {string}
 */
function getDisplayName(Component) {
  return Component.displayName || Component.name || "Component";
}

/**
 * Patch translations inner state without dispatching redux action.
 * Could be useful for server-side rendering or another cases
 * where store.dispatch function is unreachable
 * @param {Object} changes - partial inner-state object
 * @param {boolean} updateComponents - whether to update components or not
 * @return {Promise<void>} - Promise, resolved when all components are updated (if updateComponents === true) or immediately
 */
export async function patchState<D>(
  changes: Partial<IState<D>>,
  updateComponents?: boolean
) {
  if (typeof __state !== "object") {
    __state = {};
  }

  Object.entries(changes).forEach(([k, v]) => (__state[k] = v));

  if (updateComponents) {
    await updateTranslatedComponents();
  }
}
