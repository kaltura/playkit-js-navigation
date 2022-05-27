/// <reference path="./global.d.ts" />

import {NavigationPlugin} from './navigation-plugin';

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {NavigationPlugin as Plugin};
export {VERSION, NAME};

const pluginName: string = 'navigation';
KalturaPlayer.core.registerPlugin(pluginName, NavigationPlugin);
