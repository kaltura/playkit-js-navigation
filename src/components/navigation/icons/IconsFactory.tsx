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

export const IconsFactory = (props: props) => {
  return (
    <div className={styles.icon}>
      {props.iconType === itemTypes.Hotspot && (
        <HotspotIcon
          color={props.color ? props.color : "#1687ff"}
        ></HotspotIcon>
      )}
      {props.iconType === itemTypes.AnswerOnAir && (
        <AnswerOnAirIcon
          color={props.color ? props.color : "#b2d238"}
        ></AnswerOnAirIcon>
      )}
      {props.iconType === itemTypes.Chapter && (
        <ChapterIcon
          color={props.color ? props.color : "#01accd"}
        ></ChapterIcon>
      )}
      {props.iconType === itemTypes.Slide && (
        <SlideIcon color={props.color ? props.color : "#7fd9e8"}></SlideIcon>
      )}
    </div>
  );
};

IconsFactory.defaultProps = {
  color: undefined
};
