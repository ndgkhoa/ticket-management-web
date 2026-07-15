import AppProviders from '~/app/provider';
import { AppRoutes } from '~/AppRoutes';

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
