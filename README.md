# Kaltura Player V7 - Navigation plugin

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

## Overview
> this section will be added soon

## Project structure
> this section will be added soon

## Commands
> this section will be added soon

## Configuration
Plugin configuration:<br/>
    > `expandOnFirstPlay`: boolean - if plugin should automatically opens on first play (default true);<br/>
    > `forceChaptersThumb`: boolean - force to use chapters thumbnails (default false);<br/>
    > `expandMode`: string - expand mode of kitchensink (AlongSideTheVideo|OverTheVideo, default "AlongSideTheVideo");<br/>
    > `userRole`: string - use session userId as identificator of user (anonymousRole|unmoderatedAdminRole, default "anonymousRole");<br/>
    > `itemsOrder`: object< string, number > - define order of Tabs (min value at the left) and Items inside group (min value at the top).<br/> itemsOrder also uses as tabs filter (all items that not included in "itemsOrder" object will be filtered out) (default:<br/>
        {
            "All": 0,
            "Chapter": 1,
            "Slide": 2,
            "Hotspot": 3,
            "AnswerOnAir": 4,
        }
    );