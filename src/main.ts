import { mount } from 'svelte';
import App from './App.svelte';
import { serviceWorkerState } from './lib/state/serviceWorker.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('#app element not found');
}

// Production-only, relative path (required for GitHub Pages project-
// subdirectory serving — an absolute '/sw.js' would break the scope), and a
// failed registration is silently swallowed: this is a progressive
// enhancement, never a user-visible error.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => serviceWorkerState.watch(registration))
    .catch(() => {});
}

export default mount(App, { target });
