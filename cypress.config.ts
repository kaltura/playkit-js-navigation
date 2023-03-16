import {defineConfig} from 'cypress';

export default defineConfig({
  fileServerFolder: 'cypress/public',
  experimentalWebKitSupport: true,
  defaultCommandTimeout: 10000,
  e2e: {
    supportFile: false
  }
});
