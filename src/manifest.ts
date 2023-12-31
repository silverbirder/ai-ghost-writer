import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: '__MSG_appName__',
  description: '__MSG_appDesc__',
  version: '0.0.4',
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_title: 'Click to open panel',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  //@ts-ignore
  side_panel: {
    default_path: 'sidepanel.html',
  },
  default_locale: 'en',
  web_accessible_resources: [
    {
      resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png'],
      matches: [],
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+B',
        mac: 'Command+B',
      },
    },
  },
  permissions: ['contextMenus', 'storage', 'sidePanel', 'notifications'],
})
