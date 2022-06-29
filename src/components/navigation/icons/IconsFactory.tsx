import {h, Component, Fragment} from 'preact';
import {itemTypes} from '../../../utils';
import {HotspotIcon} from './HotspotIcon';
import {AnswerOnAirIcon} from './AnswerOnAirIcon';
import {ChapterIcon} from './ChapterIcon';
import {SlideIcon} from './SlideIcon';
import {CaptionIcon} from './CaptionIcon';
import * as styles from './IconsFactory.scss';
export interface Props {
  iconType: itemTypes;
  color?: any;
  hoverColor?: any;
}

export enum IconColors {
  All = '#01accd',
  Hotspot = '#1687ff',
  AnswerOnAir = '#b2d238',
  Chapter = '#01accd',
  Slide = '#7fd9e8',
  Caption = '#fdd304'
}

// TODO: make all colors replacable later
export enum BackgroundColors {
  All = '#151414',
  Hotspot = '#061527',
  AnswerOnAir = '#21270c',
  Chapter = '#082025',
  Slide = '#162527',
  Caption = '#322a08'
}

export const IconsFactory = (props: Props) => {
  return (
    <div className={styles.icon}>
      {props.iconType === itemTypes.Hotspot && <HotspotIcon color={props.color ? props.color : IconColors.Hotspot} />}
      {props.iconType === itemTypes.AnswerOnAir && <AnswerOnAirIcon color={props.color ? props.color : IconColors.AnswerOnAir} />}
      {props.iconType === itemTypes.Chapter && <ChapterIcon color={props.color ? props.color : IconColors.Chapter} />}
      {props.iconType === itemTypes.Slide && <SlideIcon color={props.color ? props.color : IconColors.Slide} />}
      {props.iconType === itemTypes.Caption && <CaptionIcon color={props.color ? props.color : IconColors.Caption} />}
    </div>
  );
};
