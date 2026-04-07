import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Good Bye LMS Page',
    version: '1.0.0',
    default_locale: 'ja',
    permissions: ['storage', 'tabs', 'alarms'],
  },
});
