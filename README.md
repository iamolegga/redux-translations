# redux-translations
Translations utils for react-redux apps

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
  functionThatReturnsPromiseWithDictionary,
  {
    // default properties
    cache: true,
    updateCacheOnSwitch: false,
  }
);

const store = createStore(rootReducer, applyMiddleware(translationsMiddleware));
```


### Translations props

Wrap component with `withTranslations` function:

```jsx
import { withTranslations } from 'redux-translations';

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
import { switchLangAction } from 'redux-translations';
store.dispatch(switchLangAction('en'));
```
