import { NavigationPlugin, pluginName } from "./navigation-plugin";
import {registerPlugin} from '@playkit-js/kaltura-player-js';


declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {NavigationPlugin as Plugin};
export {VERSION, NAME};
export {NavigationEvent} from './events/events'

registerPlugin(pluginName, NavigationPlugin as any);
