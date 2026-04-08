import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Good Bye LMS Page',
    default_locale: 'ja',
    permissions: ['storage', 'tabs', 'alarms'],
  },
});
