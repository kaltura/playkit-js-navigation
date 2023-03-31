import {h} from 'preact';
import {ItemTypes} from '../../../types';
import {HotspotIcon} from './HotspotIcon';
import {AnswerOnAirIcon} from './AnswerOnAirIcon';
import {ChapterIcon} from './ChapterIcon';
import {SlideIcon} from './SlideIcon';
import {CaptionIcon} from './CaptionIcon';
import * as styles from './IconsFactory.scss';
import {QuizIcon} from "@playkit-js/common/dist/icon/icons/quiz";
export interface Props {
  iconType: ItemTypes;
  color?: any;
  hoverColor?: any;
}

export const IconsFactory = (props: Props) => {
  return (
    <div className={styles.icon}>
      {props.iconType === ItemTypes.Hotspot && <HotspotIcon />}
      {props.iconType === ItemTypes.AnswerOnAir && <AnswerOnAirIcon />}
      {props.iconType === ItemTypes.Chapter && <ChapterIcon />}
      {props.iconType === ItemTypes.Slide && <SlideIcon />}
      {props.iconType === ItemTypes.Caption && <CaptionIcon />}
      {props.iconType === ItemTypes.QuizQuestion && <QuizIcon />}
    </div>
  );
};
