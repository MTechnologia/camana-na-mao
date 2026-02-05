import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from './App';

// SafeAreaProvider allows useSafeAreaInsets() so content stays above system nav bar
registerRootComponent(() => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
));
