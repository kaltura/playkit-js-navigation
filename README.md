# PlayKit JS Navigation - plugin for the [PlayKit JS Player]

[![Build Status](https://github.com/kaltura/playkit-js-navigation/actions/workflows/run_canary_full_flow.yaml/badge.svg)](https://github.com/kaltura/playkit-js-navigation/actions/workflows/run_canary_full_flow.yaml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![](https://img.shields.io/npm/v/@playkit-js/navigation/latest.svg)](https://www.npmjs.com/package/@playkit-js/navigation)
[![](https://img.shields.io/npm/v/@playkit-js/navigation/canary.svg)](https://www.npmjs.com/package/@playkit-js/navigation/v/canary)

PlayKit JS Navigation is written in [ECMAScript6], statically analysed using [Typescript] and transpiled in ECMAScript5 using [Babel].

[typescript]: https://www.typescriptlang.org/
[ecmascript6]: https://github.com/ericdouglas/ES6-Learning#articles--tutorials
[babel]: https://babeljs.io

## Getting Started

### Prerequisites

The plugin requires [Kaltura Player] to be loaded first.

[kaltura player]: https://github.com/kaltura/kaltura-player-js

### Installing

First, clone and run [yarn] to install dependencies:

[yarn]: https://yarnpkg.com/lang/en/

```
git clone https://github.com/kaltura/playkit-js-navigation.git
cd playkit-js-navigation
yarn install
```

### Building

Then, build the player

```javascript
yarn run build
```

### Embed the library in your test page

Finally, add the bundle as a script tag in your page, and initialize the player

```html
<script type="text/javascript" src="/PATH/TO/FILE/kaltura-player.js"></script>
<!--Kaltura player-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-js-timeline.js"></script>
<!--PlayKit timeline plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-kaltura-cuepoints.js"></script>
<!--PlayKit cuepoints plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-ui-managers.js"></script>
<!--PlayKit ui-managers plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-navigation.js"></script>
<!--PlayKit navigation plugin-->
<div id="player-placeholder" style="height:360px; width:640px">
  <script type="text/javascript">
    var playerContainer = document.querySelector("#player-placeholder");
    var config = {
     ...
     targetId: 'player-placeholder',
     plugins: {
      navigation: { ... },
      uiManagers: { ... },
      kalturaCuepoints: { ... },
      timeline: { ... }
     }
     ...
    };
    var player = KalturaPlayer.setup(config);
    player.loadMedia(...);
  </script>
</div>
```

## Documentation

Navigation plugin configuration can be found here:

- **[Configuration](#configuration)**

Navigation plugin dependencies can been found here:

- **[Dependencies](#dependencies)**

### And coding style tests

We use ESLint [recommended set](http://eslint.org/docs/rules/) with some additions for enforcing [Flow] types and other rules.

See [ESLint config](.eslintrc.json) for full configuration.

We also use [.editorconfig](.editorconfig) to maintain consistent coding styles and settings, please make sure you comply with the styling.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/kaltura/playkit-js-navigation/tags).

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Commands

Run dev server: `yarn dev`;<br/>
Bump version: `yarn release`;<br/>

<a name="configuration"></a>
## Configuration

#### Configuration Structure

```js
//Default configuration
"navigation" = {};
//Plugin params
"navigation" = {
  expandOnFirstPlay?: boolean, // optional
  position?: string, // optional
  expandMode?: string, // optional
  itemsOrder?: object< string, number >, // optional
  visible?: boolean // optional
}
```

##

> ### config.expandOnFirstPlay
>
> ##### Type: `boolean`
>
> ##### Default: `right`
>
> ##### Description: if plugin should automatically open on first play.
>

##

> ### config.position
>
> ##### Type: `'right' | 'left' | 'top' | 'bottom'`
>
> ##### Default: `right`
>
> ##### Description: expand mode of side panel (‘alongside', ‘hidden’, 'over’, default 'alongside').
>

##

> ### config.expandMode
>
> ##### Type: `string`
>
> ##### Default: `alongside`
>
> ##### Description: expand mode of side panel (‘alongside', ‘hidden’, 'over’, default 'alongside').
>

##

> ### config.itemsOrder
>
> ##### Type: `object< string, number >`
>
> ##### Default: `{ "All": 0, "Chapter": 1, "Slide": 2, "Hotspot": 3, "AnswerOnAir": 4, }`
>
> ##### Change tab order: `navigation = {...itemsOrder: { "Slide": 1, "All": 4, "AnswerOnAir": 3, "Chapter": 5,  "Hotspot": 2, }, ...}`
>
> ##### Description: define order of Tabs (min value at the left) and Items inside group (min value at the top). itemsOrder also uses as tabs filter (all items that not included in "itemsOrder" object will be filtered out) (default: { "All": 0, "Chapter": 1, "Slide": 2, "Hotspot": 3, "AnswerOnAir": 4, }).

##

> ### config.visible
>
> ##### Type: `boolean`
>
> ##### Default: `true`
>
> ##### Description: if plugin's side panel should be displayed or not.
>

## Additional flashvars
"playkit-navigation":"Version" (check latest version of navigation plugin)

<a name="dependencies"></a>
## Dependencies

Plugin dependencies:<br/>
<a href="https://github.com/kaltura/playkit-js-kaltura-cuepoints">Cue Points</a><br/>
<a href="https://github.com/kaltura/playkit-js-ui-managers">UI Managers</a><br/>
<a href="https://github.com/kaltura/playkit-js-timeline">Timeline</a>

### Dev env
Node version: up to 14+<br/>
If nvm installed: `nvm use` change version of current terminal to required.<br/>
