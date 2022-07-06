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
  Caption = 'Caption'
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
  text?: string;
  description?: string;
  title?: string;
  assetId?: string;
  subType?: ItemTypes;
  partnerData?: string;
  tags?: string;
  assetUrl?: string;
}

export interface ItemData extends RawItemData {
  id: string;
  startTime: number;
  previewImage: string | null;
  itemType: ItemTypes;
  displayTime?: string;
  groupData: GroupTypes | null;
  displayTitle: string;
  shorthandTitle?: string;
  displayDescription: string | null;
  shorthandDescription?: string;
  hasShowMore: boolean;
}
