import { h, Component, Fragment } from "preact";
import { itemTypes } from "../../../utils";
import { HotspotIcon } from "./HotspotIcon";
import { AnswerOnAirIcon } from "./AnswerOnAirIcon";
import { ChapterIcon } from "./ChapterIcon";
import { SlideIcon } from "./SlideIcon";
import * as styles from "./IconsFactory.scss";
export interface props {
  iconType: itemTypes;
  color?: any;
  hoverColor?: any;
}

export enum IconColors {
  All = "#01accd",
  Hotspot = "#1687ff",
  AnswerOnAir = "#b2d238",
  Chapter = "#01accd",
  Slide = "#7fd9e8",
}

// TODO: make all colors replacable later
export enum BackgroundColors {
  All = "#151414",
  Hotspot = "#061527",
  AnswerOnAir = "#21270c",
  Chapter = "#082025",
  Slide = "#162527",
}

export const IconsFactory = (props: props) => {
  return (
    <div className={styles.icon}>
      {props.iconType === itemTypes.Hotspot && (
        <HotspotIcon
          color={props.color ? props.color : IconColors.Hotspot}
        ></HotspotIcon>
      )}
      {props.iconType === itemTypes.AnswerOnAir && (
        <AnswerOnAirIcon
          color={props.color ? props.color : IconColors.AnswerOnAir}
        ></AnswerOnAirIcon>
      )}
      {props.iconType === itemTypes.Chapter && (
        <ChapterIcon
          color={props.color ? props.color : IconColors.Chapter}
        ></ChapterIcon>
      )}
      {props.iconType === itemTypes.Slide && (
        <SlideIcon
          color={props.color ? props.color : IconColors.Slide}
        ></SlideIcon>
      )}
    </div>
  );
};