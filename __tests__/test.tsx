import * as React from 'react';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import withTranslations, {
  createTranslationsMiddleware,
  ITranslated,
  switchLangActionCreator,
} from '../src';

interface TestCompProps {
  dictionary: {};
  currentLang: string;
  loadingLang: string;
  switchLang: (to: string) => void;
  anotherProp: string;
}

const dictionaries = {
  en: { hello: 'hello' },
  it: { hello: 'ciao' },
};

class TestComp extends React.PureComponent<TestCompProps, {}> {
  render() {
    const {
      dictionary,
      currentLang,
      loadingLang,
      switchLang,
      anotherProp,
    } = this.props;
    return (
      <div>
        <div id="translation">
          {dictionary['hello'] || null}
        </div>
        <div id="current">
          {currentLang}
        </div>
        <div id="loading">
          {loadingLang}
        </div>
        <button id="en" onClick={() => switchLang('en')} />
        <button id="it" onClick={() => switchLang('it')} />
      </div>
    );
  }
}

const TranslatedComponent = withTranslations<{anotherProp: string;}>(TestComp);

const createApp = store =>
  class extends React.PureComponent<{}, {}> {
    render() {
      return (
        <Provider store={store}>
          <TranslatedComponent anotherProp="anotherProp" />
        </Provider>
      );
    }
  };

test('displayName should show wrapper', () => {
  expect(TranslatedComponent.displayName).toBe(`withTranslations( ${
    TestComp.name
  } )`);
});

test('Should render with default props for "createTranslationsMiddleware" and change lang successfully', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary);
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  expect(getDictionary).toHaveBeenCalledTimes(0);
  expect(wrapper.find('#translation').text()).toBe('');
  expect(wrapper.find('#current').text()).toBe('');
  expect(wrapper.find('#loading').text()).toBe('');

  wrapper.find('#en').simulate('click');
  expect(getDictionary).toHaveBeenCalledTimes(1);
  expect(wrapper.find('#current').text()).toBe('');
  expect(wrapper.find('#loading').text()).toBe('en');

  // after click should wait for promise resolving dictionary
  return Promise.resolve().then(() => {
    expect(wrapper.find('#translation').text()).toBe(dictionaries.en.hello);
    expect(wrapper.find('#current').text()).toBe('en');
    expect(wrapper.find('#loading').text()).toBe('');
  });
});

test('Should not request cached dictionary', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary);
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  expect(getDictionary).toHaveBeenCalledTimes(0);

  wrapper.find('#en').simulate('click');
  expect(getDictionary).toHaveBeenCalledTimes(1);

  // after click should wait for promise resolving dictionary
  return Promise.resolve()
    .then(() => {
      wrapper.find('#it').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(2);
    })
    .then(() => {
      wrapper.find('#en').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(2);

      expect(wrapper.find('#translation').text()).toBe(dictionaries.en.hello);
      expect(wrapper.find('#current').text()).toBe('en');
      expect(wrapper.find('#loading').text()).toBe('');
    });
});

test('should not cache when options.cache === false', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary, {
    cache: false,
  });
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  wrapper.find('#en').simulate('click');
  expect(getDictionary).toHaveBeenCalledTimes(1);

  // after click should wait for promise resolving dictionary
  return Promise.resolve()
    .then(() => {
      wrapper.find('#it').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(2);
    })
    .then(() => {
      wrapper.find('#en').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(3);
    });
});

test('should update cache in background when options.updateCacheOnSwitch === true', () => {
  const mutableDictionaries = { ...dictionaries };

  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(mutableDictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary, {
    updateCacheOnSwitch: true,
  });
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  wrapper.find('#en').simulate('click');
  expect(getDictionary).toHaveBeenCalledTimes(1);
  expect(wrapper.find('#translation').text()).toBe('');
  expect(wrapper.find('#current').text()).toBe('');
  expect(wrapper.find('#loading').text()).toBe('en');

  // after click should wait for promise resolving dictionary
  return Promise.resolve()
    .then(() => {
      expect(wrapper.find('#translation').text()).toBe(
        mutableDictionaries.en.hello
      );
      expect(wrapper.find('#current').text()).toBe('en');
      expect(wrapper.find('#loading').text()).toBe('');

      wrapper.find('#it').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(2);

      expect(wrapper.find('#translation').text()).toBe(
        mutableDictionaries.en.hello
      );
      expect(wrapper.find('#current').text()).toBe('en');
      expect(wrapper.find('#loading').text()).toBe('it');
    })
    .then(() => {
      expect(wrapper.find('#translation').text()).toBe(
        mutableDictionaries.it.hello
      );
      expect(wrapper.find('#current').text()).toBe('it');
      expect(wrapper.find('#loading').text()).toBe('');

      const deprecatedEn = mutableDictionaries.en;
      mutableDictionaries.en = { hello: 'hi!' };

      wrapper.find('#en').simulate('click');
      expect(getDictionary).toHaveBeenCalledTimes(3);

      expect(wrapper.find('#translation').text()).toBe(deprecatedEn.hello);
      expect(wrapper.find('#current').text()).toBe('en');
      expect(wrapper.find('#loading').text()).toBe('');
    })
    .then(() => {
      expect(wrapper.find('#translation').text()).toBe(
        mutableDictionaries.en.hello
      );
    });
});

test('should call switch callback', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const switchCallback = jest.fn();

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary, {
    switchCallback,
  });
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  wrapper.find('#en').simulate('click');
  expect(switchCallback).toHaveBeenCalledTimes(1);
  expect(switchCallback.mock.calls[0][0]).toBe('en');

  wrapper.find('#it').simulate('click');
  expect(switchCallback).toHaveBeenCalledTimes(2);
  expect(switchCallback.mock.calls[1][0]).toBe('it');

  wrapper.find('#en').simulate('click');
  expect(switchCallback).toHaveBeenCalledTimes(3);
  expect(switchCallback.mock.calls[2][0]).toBe('en');
});

test('switchLangActionCreator should change lang', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary);
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  store.dispatch(switchLangActionCreator('en'));

  expect(getDictionary).toHaveBeenCalledTimes(1);
  expect(wrapper.find('#translation').text()).toBe('');
  expect(wrapper.find('#current').text()).toBe('');
  expect(wrapper.find('#loading').text()).toBe('en');

  return Promise.resolve()
    .then(() => {
      expect(wrapper.find('#translation').text()).toBe(dictionaries.en.hello);
      expect(wrapper.find('#current').text()).toBe('en');
      expect(wrapper.find('#loading').text()).toBe('');
    });
});



test('should throw error when call switchLang with wrong payload', () => {
  const getDictionary = jest
    .fn()
    .mockImplementation(lang => Promise.resolve(dictionaries[lang]));

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary);
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  try {
    store.dispatch(switchLangActionCreator(1 as any));
  } catch (e) {
    expect(e.message).toBe(
      'switchLangActionCreator and switchLang property ' +
      'should be called with argument typeof string.'
    );
  }
});
