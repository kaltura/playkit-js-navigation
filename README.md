# Kaltura Player V7 - Navigation plugin

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

## Overview
> this section will be added soon

## Project structure
> this section will be added soon

## Commands
> this section will be added soon

## Configuration
Plugin configuration:
    expandOnFirstPlay: boolean - if plugin should automatically opens on first play (default true);
    position: string - position of plugin (left|bottom, default "left");
    forceChaptersThumb: boolean - force to use chapters thumbnails (default false);
    expandMode: string - expand mode of kitchensink (AlongSideTheVideo|OverTheVideo, default "AlongSideTheVideo");
    userRole: string - use session userId as identificator of user (anonymousRole|unmoderatedAdminRole, default "anonymousRole");
    itemsOrder: object< string, number > - define order of Tabs (min value at the left) and Items inside group (min value at the top) (default:
        {
            "All": 0,
            "Chapter": 1,
            "Slide": 2,
            "Hotspot": 3,
            "AnswerOnAir": 4,
        }
    );