# redux-translations
Translations utils for react-redux apps


[![npm](https://img.shields.io/npm/v/redux-translations.svg)](https://www.npmjs.com/package/redux-translations)
[![npm](https://img.shields.io/npm/dw/redux-translations.svg)](https://www.npmjs.com/package/redux-translations)
[![Travis](https://img.shields.io/travis/iamolegga/redux-translations.svg)](https://travis-ci.org/iamolegga/redux-translations)
[![Codecov](https://img.shields.io/codecov/c/github/iamolegga/redux-translations.svg)](https://codecov.io/gh/iamolegga/redux-translations)
[![license](https://img.shields.io/github/license/iamolegga/redux-translations.svg)](https://github.com/iamolegga/redux-translations)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Libraries.io for GitHub](https://img.shields.io/librariesio/github/iamolegga/redux-translations.svg)](https://libraries.io/github/iamolegga/redux-translations)


## Install

```sh
npm i redux-translations
```

## Usage

### Translations middleware

Create and config translations middleware and apply it.

```js
import { createTranslationsMiddleware } from 'redux-translations';

// Change this function to yours
const functionThatReturnsPromiseWithDictionary = language =>
  Promise.resolve(
    language === 'en' ? { hello: 'Hello!' } : { hello: 'Привет!' }
  );

const translationsMiddleware = createTranslationsMiddleware(
  functionThatReturnsPromiseWithDictionary
);

const store = createStore(rootReducer, applyMiddleware(translationsMiddleware));
```


### Translations props

Wrap component with `withTranslations` function:

```jsx
import withTranslations from 'redux-translations';

const MyComponent = ({
  dictionary,
  currentLang,
  loadingLang,
  switchLang,
}) =>
  <div>
    Translated text: { dictionary['hello'] }
    <br />
    Current language: { currentLang }
    <br />
    Loading language: { loadingLang }
    <button
      onClick={ () => switchLang('en') }
    >English</button>
    <br />
    <button
      onClick={ () => switchLang('ru') }
    >Russian</button>
  </div>

const MyComponentTranslated = withTranslations(MyComponent);
```

You can change language not only in react-component:

```js
import { switchLangActionCreator } from 'redux-translations';
store.dispatch(switchLangActionCreator('en'));
```

## API

### `createTranslationsMiddleware(getDictionary, [options])`

Function, that creates redux-middleware for translations. Has next arguments:

1. `getDictionary` (Function) - function with one argument type of `string` - language, that user is switching to, and returns promise with `dictionary` object.

2. `[options]` (Object) - options object with next optional fields:

  - `cache` (Boolean) - should cache results of `getDictionary`, and do not call it if dictionary is already loaded. Default `true`.
  - `updateCacheOnSwitch` (Boolean) - when `cache` is `true`, should switch immediately to cached dictionary, but load dictionary in background one more time and replace old with the new one. Default `false`.
  - `switchCallback` (Function) - callback for every language switching. Default `undefined`.

### `withTranslations(ComponentClass)`

React component class wrapper that adds next props to wrapping component class (actually it returns new component class):

1. `currentLang` (String) - language, which dictionary is currently using.

2. `loadingLang` (String) - language, which dictionary is currently loading.

3. `dictionary` (Object) - object, that is returned by `getDictionary`.

4. `switchLang` (Function) - function, that switch language to passed one.

### `switchLangActionCreator(language)`

Redux action creator - function with one argument type of `string`, returns flux standard action (FSA), that you can dispatch whereever in your app (for example, when initialising your app).
