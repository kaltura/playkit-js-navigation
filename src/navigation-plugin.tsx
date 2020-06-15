import { h } from "preact";
import {
  ContribPluginManager,
  CorePlugin,
  OnMediaLoad,
  OnMediaUnload,
  OnPluginSetup,

  ContribServices,
  ContribPluginData,
  ContribPluginConfigs
} from "@playkit-js-contrib/plugin";
import { getContribLogger } from "@playkit-js-contrib/common";
import * as classes from './navigation-plugin.scss';

const pluginName = `navigation`;

const logger = getContribLogger({
  class: "NavigationPlugin",
  module: "navigation-plugin"
});

interface NavigationPluginConfig {
}

export class NavigationPlugin implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<NavigationPluginConfig>
  ) {
  }

  onPluginSetup(): void {
  }

  onMediaLoad(): void {
  }

  onMediaUnload(): void {
  }

  onPluginDestroy(): void {
  }
}

ContribPluginManager.registerPlugin(
  pluginName,
  (data: ContribPluginData<NavigationPluginConfig>) => {
    return new NavigationPlugin(data.corePlugin, data.contribServices, data.configs);
  },
  {
    defaultConfig: {
    }
  }
);
