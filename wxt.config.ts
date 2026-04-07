import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Good Bye LMS Page',
    version: '0.2.5',
    default_locale: 'ja',
    permissions: ['storage', 'tabs', 'alarms'],
  },
});
