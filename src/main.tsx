// antd v5 renders its static APIs (`message.error`, `notification`, `Modal.confirm`)
// through the legacy ReactDOM.render, which React 19 removed — without this patch those
// calls silently render nothing. `lib/axios.ts` uses static `message` for the 401/403
// session notices, so the patch must be imported before any antd usage.
// Removed in Phase 05 along with antd itself.
import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Initialise i18next before the first render. This previously happened only as a
// side effect of the preferences store importing it — a transitive import any
// refactor could quietly break, leaving the UI to render raw keys.
import '~/i18n';
import App from '~/app/app';
import '~/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
