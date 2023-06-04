import {VNode} from 'preact';

export enum GroupTypes {
  mid = 'mid',
  first = 'first',
  last = 'last'
}

export enum ItemTypes {
  All = 'All',
  AnswerOnAir = 'AnswerOnAir',
  Chapter = 'Chapter',
  Slide = 'Slide',
  Hotspot = 'Hotspot',
  Caption = 'Caption',
  QuizQuestion = 'QuizQuestion'
}

export interface ItemTypesTranslates {
  [ItemTypes.All]?: string;
  [ItemTypes.AnswerOnAir]?: string;
  [ItemTypes.Chapter]?: string;
  [ItemTypes.Slide]?: string;
  [ItemTypes.Hotspot]?: string;
  [ItemTypes.Caption]?: string;
  [ItemTypes.QuizQuestion]?: string;
}

export interface CuePoint {
  startTime: number;
  endTime?: number;
  id: string;
  type: string;
  metadata: RawItemData;
  text?: string;
}

export interface RawItemData {
  cuePointType: ItemTypes;
  createdAt?: number;
  text?: string;
  description?: string;
  title?: string;
  assetId?: string;
  subType?: ItemTypes;
  partnerData?: string;
  tags?: string;
  assetUrl?: string;
  relatedObjects?: {
    QandA_ResponseProfile?: {
      objects: Array<{xml: string}>;
    };
  };
  quizState?: number;
  isDefaultThumb?: boolean;
}

export interface ItemData extends RawItemData {
  id: string;
  startTime: number;
  previewImage: string | null;
  itemType: ItemTypes;
  displayTime?: string;
  groupData: GroupTypes | null;
  displayTitle: VNode | string;
  displayDescription: string | null;
  liveCuePoint: boolean;
  onClick?: () => void;
}

export type HighlightedMap = Map<ItemTypes, number>;
export type CuePointsMap = Map<string, ItemData>;
