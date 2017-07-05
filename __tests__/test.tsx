import * as React from 'react';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';
import withTranslations, {
  createTranslationsMiddleware,
  ITranslated,
} from '../src';

interface ComponentProps {
  dictionary: {};
  currentLang: string;
  loadingLang: string;
  switchLang: (to: string) => void;
  someAnotherProp: string;
}

class Component extends React.PureComponent<ComponentProps, {}> {
  render() {
    const {
      dictionary,
      currentLang,
      loadingLang,
      switchLang,
      someAnotherProp,
    } = this.props;
    return (
      <div>
        <div id="dictionary">
          {dictionary['test'] || null}
        </div>
        <div id="currentLang">
          {currentLang}
        </div>
        <div id="loadingLang">
          {loadingLang}
        </div>
        <button id="switchLang" onClick={() => switchLang('testLang')} />
      </div>
    );
  }
}

const TranslatedComponent = withTranslations<{
  someAnotherProp: string;
}>(Component);

const createApp = store =>
  class extends React.PureComponent<{}, {}> {
    render() {
      return (
        <Provider store={store}>
          <TranslatedComponent someAnotherProp="someAnotherProp" />
        </Provider>
      );
    }
  };

test('Should render with default props for "createTranslationsMiddleware" and change lang successfully', () => {
  const getDictionary = lang =>
    Promise.resolve(lang === 'testLang' ? { test: 'test' } : {});

  const reducer = (state: object = {}, action: any) => state;
  const middleware = createTranslationsMiddleware(getDictionary);
  const store = createStore(reducer, applyMiddleware(middleware));
  const App = createApp(store);
  const wrapper = mount(<App />);

  expect(wrapper.find('#dictionary').text()).toBe('');
  expect(wrapper.find('#currentLang').text()).toBe('');
  expect(wrapper.find('#loadingLang').text()).toBe('');

  wrapper.find('button').simulate('click');
  expect(wrapper.find('#loadingLang').text()).toBe('testLang');

  // after click should wait for promise resolving dictionary
  return Promise.resolve().then(() => {
    expect(wrapper.find('#dictionary').text()).toBe('test');
    expect(wrapper.find('#currentLang').text()).toBe('testLang');
    expect(wrapper.find('#loadingLang').text()).toBe('');
  });
});
