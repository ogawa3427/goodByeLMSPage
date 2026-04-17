import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Good Bye LMS Page',
    default_locale: 'ja',
    permissions: ['storage', 'alarms'],
    host_permissions: [
      'https://acanthus.cis.kanazawa-u.ac.jp/*',
      'https://eduweb.sta.kanazawa-u.ac.jp/*',
      'https://api.github.com/*',
      'file:///*',
    ],
    icons: {
      16: 'images/icon-16.png',
      128: 'images/icon-128.png',
    },
    action: {
      default_icon: {
        16: 'images/icon-16.png',
        19: 'images/icon-19.png',
        38: 'images/icon-38.png',
      },
    },
  },
});
