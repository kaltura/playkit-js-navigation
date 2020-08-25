import {KitchenSinkExpandModes} from '@playkit-js-contrib/ui';
import {ObjectUtils} from '@playkit-js-contrib/common';
import {
  ItemData,
  RawItemData,
} from '../components/navigation/navigation-item/NavigationItem';
const {get} = ObjectUtils;

export function getConfigValue( // TODO: consider move to contrib
  value: any,
  condition: (value: any) => boolean,
  defaultValue: any
) {
  let result = defaultValue;
  if (typeof condition === 'function' && condition(value)) {
    result = value;
  }
  return result;
}

export enum groupTypes {
  mid = 'mid',
  first = 'first',
  last = 'last',
}

// TODO: make the types plurals
export enum itemTypes {
  All = 'All',
  AnswerOnAir = 'AnswerOnAir',
  Chapter = 'Chapter',
  Slide = 'Slide',
  Hotspot = 'Hotspot',
  Caption = 'Caption',
}

export const itemTypesOrder: Record<string, number> = {
  [itemTypes.All]: 0,
  [itemTypes.Chapter]: 1,
  [itemTypes.Slide]: 2,
  [itemTypes.Hotspot]: 3,
  [itemTypes.AnswerOnAir]: 4,
  [itemTypes.Caption]: 5,
};

export enum cuePointTypes {
  Annotation = 'annotation.Annotation',
  Thumb = 'thumbCuePoint.Thumb',
}

export enum cuePointTags {
  AnswerOnAir = 'qna',
  Hotspot = 'hotspots',
}

// TODO: move to config
const MAX_CHARACTERS = 77;

// TODO: check if exist in QNA and if QNA did it more elegant
export const convertTime = (sec: number): string => {
  const hours = Math.floor(sec / 3600);
  if (hours >= 1) {
    sec = sec - hours * 3600;
  }
  const min = Math.floor(sec / 60);
  if (min >= 1) {
    sec = sec - min * 60;
  }
  if (hours) {
    return (
      (hours < 10 ? '0' + hours : hours) +
      ':' +
      (min < 10 ? '0' + min : min) +
      ':' +
      (sec < 10 ? '0' + sec : sec)
    );
  } else {
    return (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec);
  }
};

// TODO: consider move to contrib
export const decodeString = (content: any): string => {
  if (typeof content !== 'string') {
    return content;
  }
  return content
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"');
};

// normlise time, extract description and title, find thumbnail if exist etc'
export const fillData = (
  originalItem: any,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean = false,
  isLiveEntry: boolean = false
) => {
  const item: any = {...originalItem};
  item.liveType = isLiveEntry;
  if (isLiveEntry) {
    item.startTime = item.createdAt;
  } else {
    item.startTime = Math.floor(item.startTime / 1000);
    item.displayTime = convertTime(item.startTime);
  }
  switch (item.cuePointType) {
    case itemTypes.Caption:
      item.itemType = itemTypes.Caption;
    case cuePointTypes.Annotation: // hotspot and AoA
      item.displayTitle = decodeString(item.text);
      switch (item.tags) {
        case cuePointTags.Hotspot:
          item.itemType = itemTypes.Hotspot;
          break;
        case cuePointTags.AnswerOnAir:
          item.itemType = itemTypes.AnswerOnAir;
          break;
      }
      break;
    case cuePointTypes.Thumb: // chapters and slides
      item.displayDescription = decodeString(item.description);
      item.displayTitle = decodeString(item.title);
      if (item.assetId) {
        item.previewImage = `${serviceUrl}/index.php/service/thumbAsset/action/serve/thumbAssetId/${item.assetId}/ks/${ks}?thumbParams:objectType=KalturaThumbParams&thumbParams:width=400`;
      }
      switch (item.subType) {
        case 1:
          item.itemType = itemTypes.Slide;
          break;
        case 2:
          item.itemType = itemTypes.Chapter;
          if (!item.previewImage && forceChaptersThumb) {
            item.previewImage = `${serviceUrl.split('api_v3')[0]}/p/${
              item.partnerId
            }/sp/${item.partnerId}00/thumbnail/entry_id/${
              item.entryId
            }/width/400/vid_sec/${item.startTime}/ks/${ks}`;
          }
          break;
      }
      break;
  }
  if (
    item.displayTitle &&
    item.displayTitle.length > MAX_CHARACTERS &&
    item.itemType !== itemTypes.Caption
  ) {
    let elipsisString = item.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisString = elipsisString.trim();
    item.shorthandTitle = elipsisString + '... ';
  }
  if (
    !item.displayTitle &&
    item.displayDescription &&
    item.displayDescription.length > 79
  ) {
    let elipsisDescription = item.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisDescription = elipsisDescription.trim();
    item.shorthandDescription = elipsisDescription + '... ';
  }

  // indexed text to save calculation at runtime + filter
  let indexedText = '';
  if (item.displayDescription) {
    indexedText = item.displayDescription;
  }
  if (item.displayTitle) {
    indexedText += ' ' + item.displayTitle;
  }
  if (item.displayTime) {
    indexedText += ' ' + item.displayTime;
  }
  indexedText += ' ' + item.itemType;
  item.indexedText = indexedText.toLowerCase();
  item.hasShowMore = item.displayDescription || item.shorthandDesctipyion;
  return item;
};

export const sortItems = (
  cuepoints: Array<ItemData>,
  itemOrder: typeof itemTypesOrder
): Array<ItemData> => {
  return cuepoints.sort((item1: ItemData, item2: ItemData) => {
    if (item1.startTime === item2.startTime) {
      return itemOrder[item1.itemType] - itemOrder[item2.itemType];
    }
    return item1.startTime - item2.startTime;
  });
};

export const addGroupData = (cuepoints: Array<ItemData>): Array<ItemData> => {
  return cuepoints.reduce(
    // mark addGroupData:
    // first item will have addGroupData=groupTypes.first
    // mid items will have addGroupData=groupTypes.mid
    // last items will have addGroupData=groupTypes.last
    (prevArr: Array<any>, currentCuepoint: ItemData) => {
      const prevItem = prevArr.length > 0 && prevArr[prevArr.length - 1];
      const prevPrevItem = prevArr.length > 1 && prevArr[prevArr.length - 2];
      if (prevItem && currentCuepoint.startTime === prevItem.startTime) {
        if (prevPrevItem.startTime === prevItem.startTime) {
          prevItem.groupData = groupTypes.mid;
        }
        // found a previous item that has the same time value
        if (!prevItem.groupData && !prevItem.groupData) {
          prevItem.groupData = groupTypes.first;
        }
        currentCuepoint.groupData = groupTypes.last;
      }
      // TODO - enforce order
      prevArr.push(currentCuepoint);
      return prevArr;
    },
    []
  );
};

// main function for data handel. This sorts the cuepoints by startTime, and enriches the items with data so that the
// items component will not contain too much logic in it and mostly will be a
// dumb display-component (no offence - NavigationItem...)
export const prepareVodData = (
  receivedCuepoints: Array<RawItemData>,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean,
  itemOrder: typeof itemTypesOrder
): Array<ItemData> => {
  const filledData = receivedCuepoints.map((cuepoint: RawItemData) => {
    return {
      ...fillData(cuepoint, ks, serviceUrl, forceChaptersThumb, false),
      liveTypeCuepoint: false,
    };
  });
  return sortItems(filledData, itemOrder);
};

const clearGroupData = (data: Array<ItemData>) => {
  return data.map((item: ItemData) => ({
    ...item,
    groupData: null,
  }));
};

export const filterDataBySearchQuery = (
  data: Array<ItemData> | undefined,
  searchQuery: string
) => {
  if (!data || !data.length) {
    return [];
  }
  if (!searchQuery) {
    return data.filter((item: ItemData) => {
      return item.itemType !== itemTypes.Caption;
    });
  }
  const lowerQuery = searchQuery.toLowerCase();
  const filteredData = data.filter((item: ItemData) => {
    return item.indexedText.indexOf(lowerQuery) > -1;
  });
  //clear group values
  return clearGroupData(filteredData);
};

export const filterDataByActiveTab = (
  data: Array<ItemData> | undefined,
  activeTab: itemTypes
) => {
  if (!data || !data.length) {
    return [];
  }
  if (activeTab === itemTypes.All) {
    return data;
  }
  const filteredData = data.filter(
    (item: ItemData) => item.itemType === activeTab
  );
  return clearGroupData(filteredData);
};

export const getAvailableTabs = (
  data: ItemData[],
  itemOrder: typeof itemTypesOrder
): itemTypes[] => {
  const localData = [...data];
  let totalResults = 0;
  const ret: itemTypes[] = localData.reduce(
    (acc: itemTypes[], item: ItemData) => {
      totalResults = totalResults + 1;
      if (item.itemType && acc.indexOf(item.itemType) === -1) {
        acc.push(item.itemType);
      }
      return acc;
    },
    []
  );
  if (ret.length > 1) {
    ret.unshift(itemTypes.All);
  }
  return ret.sort((itemType1: itemTypes, itemType2: itemTypes) => {
    return itemOrder[itemType1] - itemOrder[itemType2];
  });
};

export const preparePendingCuepoints = (
  currentData: Array<ItemData>,
  currentPosition: number
): {listData: Array<ItemData>; pendingData: Array<ItemData>} => {
  return currentData.reduce(
    (
      acc: {listData: Array<ItemData>; pendingData: Array<ItemData>},
      item: ItemData
    ) => {
      if (currentPosition < item.startTime) {
        return {
          listData: acc.listData,
          pendingData: [...acc.pendingData, item],
        };
      }
      return {listData: [...acc.listData, item], pendingData: acc.pendingData};
    },
    {listData: [], pendingData: []}
  );
};

export const prepareLiveData = (
  currentData: Array<ItemData>,
  pendingData: Array<ItemData>,
  newData: Array<ItemData>,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean,
  liveStartTime: number | null,
  itemOrder: typeof itemTypesOrder,
  currentPosition: number
): {listData: Array<ItemData>; pendingData: Array<ItemData>} => {
  if (!newData || newData.length === 0) {
    // Wrong or empty data
    return {listData: currentData, pendingData};
  }
  // avoid duplication of quepoints (push server can sent same quepoints on reconnect)
  let receivedCuepoints: Array<ItemData> = newData.filter(
    (newDataItem: ItemData) => {
      return ![...currentData, ...pendingData].find(
        (item: ItemData) => item.id === newDataItem.id
      );
    }
  );
  // receivedCuepoints is a flatten array now sort by startTime (plus normalize startTime to rounded seconds)
  receivedCuepoints = receivedCuepoints.map((cuepoint: ItemData) => {
    return fillData(cuepoint, ks, serviceUrl, forceChaptersThumb, true);
  });
  if (liveStartTime) {
    receivedCuepoints = convertLiveItemsStartTime(
      receivedCuepoints,
      liveStartTime
    );
  }
  const result: {
    listData: Array<ItemData>;
    pendingData: Array<ItemData>;
  } = preparePendingCuepoints(
    receivedCuepoints,
    liveStartTime ? currentPosition : 0
  ); // set all live cuepoints as pending untill we get entry liveStartTime
  const filteredPendingData = pendingData.filter((cuepoint: ItemData) => {
    return !result.listData.find((item: ItemData) => item.id === cuepoint.id);
  });
  result.listData = sortItems(currentData.concat(result.listData), itemOrder);
  result.pendingData = filteredPendingData.concat(result.pendingData);
  return result;
};

export const checkResponce = (response: any, type?: any): boolean => {
  if (get(response, 'result.objects', [])) {
    if (type) {
      return response.result instanceof type;
    }
    return true;
  }
  return false;
};

export const convertLiveItemsStartTime = (
  data: Array<ItemData>,
  liveStartTime: number
): Array<ItemData> => {
  return data.map((item: ItemData) => ({
    ...item,
    // @ts-ignore
    startTime: item.createdAt - liveStartTime,
  }));
};

// TODO: consider move to contrib
export const parseExpandMode = (value: string): KitchenSinkExpandModes => {
  switch (value) {
    case KitchenSinkExpandModes.AlongSideTheVideo:
      return KitchenSinkExpandModes.AlongSideTheVideo;
    default:
      return KitchenSinkExpandModes.OverTheVideo;
  }
};

export const prepareItemTypesOrder = (
  itemsOrder: any
): Record<string, number> => {
  if (itemsOrder && typeof itemsOrder === 'object') {
    return {...itemTypesOrder, ...itemsOrder};
  }
  return itemTypesOrder;
};

// TODO: consider move to contrib
export const isEmptyObject = (obj: Record<string, any>) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

// TODO: consider move to contrib
export const isDataEqual = (
  prevData: ItemData[],
  nextData: ItemData[]
): boolean => {
  return !(
    prevData.length !== nextData.length ||
    (prevData.length &&
      nextData.length &&
      (prevData[0].id !== nextData[0].id ||
        prevData[prevData.length - 1].id !==
          nextData[nextData.length - 1].id)) ||
    (prevData[0].text &&
      nextData[0].text &&
      prevData[0].text !== nextData[0].text) ||
    prevData[prevData.length - 1].text !== nextData[nextData.length - 1].text
  );
};

// TODO: consider move to contrib
export const isMapEqual = (prevMap: any, nextMap: any): boolean => {
  const prevMapKeys = Object.keys(prevMap);
  const nextMapaKeys = Object.keys(nextMap);
  return !(
    prevMapKeys.length !== nextMapaKeys.length ||
    prevMapKeys[0] !== nextMapaKeys[0] ||
    prevMapKeys[prevMapKeys.length - 1] !==
      nextMapaKeys[nextMapaKeys.length - 1]
  );
};

export const findCuepointType = (
  list: ItemData[],
  cuePointType: itemTypes
): boolean => {
  return !!list.find(
    (cuepoint: ItemData) => cuepoint.itemType === cuePointType
  );
};
