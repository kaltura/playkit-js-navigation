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
import * as styles from "./navigation-plugin.scss";
import {
  KitchenSinkContentRendererProps,
  KitchenSinkExpandModes,
  KitchenSinkItem,
  KitchenSinkPositions,
  UpperBarItem
} from "@playkit-js-contrib/ui";
import { getConfigValue } from "./utils/utils";

const pluginName = `navigation`;

const logger = getContribLogger({
  class: "NavigationPlugin",
  module: "navigation-plugin"
});

interface NavigationPluginConfig {
  expandOnFirstPlay: boolean;
  position: KitchenSinkPositions;
}

export class NavigationPlugin
  implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _upperBarItem: UpperBarItem | null = null;

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<NavigationPluginConfig>
  ) {}

  onPluginSetup(): void {
    this._initKitchensinkAndUpperBarItems();
  }

  onMediaLoad(): void {}

  onMediaUnload(): void {}

  onPluginDestroy(): void {}

  private _initKitchensinkAndUpperBarItems(): void {
    if (!this._upperBarItem && !this._kitchenSinkItem) {
      this._addKitchenSinkItem();
    }
  }
  private _renderKitchenSinkContent = (
    props: KitchenSinkContentRendererProps
  ) => {
    return <div>DDDDDDDFDFDF</div>;
  };

  private _addKitchenSinkItem(): void {
    const { position, expandOnFirstPlay } = this._configs.pluginConfig;
    // if (this._kitchenSinkItem) {
    //   this._contribServices.upperBarManager.remove(this._kitchenSinkItem);
    // }
    this._kitchenSinkItem = this._contribServices.kitchenSinkManager.add({
      label: "Navigation",
      expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
      renderIcon: () => (
        <div className={styles.pluginIcon} role="button" tabIndex={1} />
      ),
      position: getConfigValue(
        position,
        position =>
          typeof position === "string" &&
          (position === KitchenSinkPositions.Bottom ||
            position === KitchenSinkPositions.Right),
        KitchenSinkPositions.Bottom
      ),
      renderContent: this._renderKitchenSinkContent
    });

    if (expandOnFirstPlay) {
      this._kitchenSinkItem.activate();
    }
  }
}

ContribPluginManager.registerPlugin(
  pluginName,
  (data: ContribPluginData<NavigationPluginConfig>) => {
    return new NavigationPlugin(
      data.corePlugin,
      data.contribServices,
      data.configs
    );
  },
  {
    defaultConfig: {
      expandOnFirstPlay: false,
      position: KitchenSinkPositions.Right
    }
  }
);
