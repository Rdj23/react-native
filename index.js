// index.js

import 'react-native-gesture-handler';


// ✅ Must go at the top BEFORE any RN module is touched
if (typeof global.ErrorUtils === 'undefined') {
  global.ErrorUtils = {
    setGlobalHandler: () => {},
    reportFatalError: (e) => console.error('[SafeFallbackError]', e),
  };
} else {
  if (typeof global.ErrorUtils.setGlobalHandler !== 'function') {
    global.ErrorUtils.setGlobalHandler = () => {};
  }
}


import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
