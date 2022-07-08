import {GroupTypes, CuePoint, ItemData, ItemTypes, HighlightedMap} from '../types';
const {toHHMMSS} = KalturaPlayer.ui.utils;

const MAX_CHARACTERS = 77;

export const itemTypesOrder: Record<string, number> = {
  [ItemTypes.All]: 0,
  [ItemTypes.Chapter]: 1,
  [ItemTypes.Slide]: 2,
  [ItemTypes.Hotspot]: 3,
  [ItemTypes.AnswerOnAir]: 4,
  [ItemTypes.Caption]: 5
};

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

export const prepareCuePoint = (cuePoint: CuePoint, cuePointType: ItemTypes, forceChaptersThumb = false): ItemData => {
  const {metadata} = cuePoint;
  const itemData: ItemData = {
    cuePointType,
    id: cuePoint.id,
    startTime: cuePoint.startTime,
    displayTime: toHHMMSS(Math.floor(cuePoint.startTime)),
    itemType: cuePointType,
    displayTitle: '',
    displayDescription: [ItemTypes.Slide, ItemTypes.Chapter].includes(cuePointType) ? decodeString(metadata.description) : null,
    previewImage: null,
    hasShowMore: false,
    groupData: null
  };
  if (cuePointType === ItemTypes.Hotspot) {
    itemData.displayTitle = decodeString(metadata.text);
  } else if (cuePointType === ItemTypes.Caption && cuePoint.text) {
    itemData.displayTitle = cuePoint.text;
  } else if ([ItemTypes.Slide, ItemTypes.Chapter].includes(cuePointType)) {
    itemData.displayTitle = decodeString(metadata.title);
    if (cuePointType === ItemTypes.Slide || forceChaptersThumb) {
      itemData.previewImage = metadata.assetUrl || null;
    }
  }
  if (itemData.displayTitle && itemData.displayTitle.length > MAX_CHARACTERS && itemData.itemType !== ItemTypes.Caption) {
    let elipsisString = itemData.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisString = elipsisString.trim();
    itemData.shorthandTitle = elipsisString + '... ';
  }
  if (!itemData.displayTitle && itemData.displayDescription && itemData.displayDescription.length > 79) {
    let elipsisDescription = itemData.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisDescription = elipsisDescription.trim();
    itemData.shorthandDescription = elipsisDescription + '... ';
  }
  itemData.hasShowMore = Boolean(itemData.displayDescription || itemData.shorthandDescription);

  return itemData;
};

export const addOrReplaceCaptions = (data: Array<ItemData>, captions: Array<ItemData>): Array<ItemData> => {
  const filteredData = data.filter(item => {
    return item.cuePointType !== ItemTypes.Caption;
  });
  return [...filteredData, ...captions];
};

export const sortItems = (cuepoints: Array<ItemData>, itemOrder: typeof itemTypesOrder): Array<ItemData> => {
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
      if (prevItem && currentCuepoint.displayTime === prevItem.displayTime) {
        if (prevPrevItem.displayTime === prevItem.displayTime) {
          prevItem.groupData = GroupTypes.mid;
        }
        // found a previous item that has the same time value
        if (!prevItem.groupData && !prevItem.groupData) {
          prevItem.groupData = GroupTypes.first;
        }
        currentCuepoint.groupData = GroupTypes.last;
      }
      // TODO - enforce order
      prevArr.push(currentCuepoint);
      return prevArr;
    },
    []
  );
};

const clearGroupData = (data: Array<ItemData>) => {
  return data.map((item: ItemData) => ({
    ...item,
    groupData: null
  }));
};

export const filterDataBySearchQuery = (data: Array<ItemData> | undefined, searchQuery: string) => {
  if (!data || !data.length) {
    return [];
  }
  if (!searchQuery) {
    return data.filter((item: ItemData) => {
      return item.itemType !== ItemTypes.Caption;
    });
  }
  const lowerQuery = searchQuery.toLowerCase();
  const filteredData = data.filter((item: ItemData) => {
    // search by title
    if (item.displayTitle && `${item.displayTitle}`.toLowerCase().indexOf(lowerQuery) > -1) {
      return true;
    }
    // search by description
    if (item.displayDescription && `${item.displayDescription}`.toLowerCase().indexOf(lowerQuery) > -1) {
      return true;
    }
    // search by time
    if (item.displayTime && /([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(lowerQuery) && item.displayTime.indexOf(lowerQuery) > -1) {
      return true;
    }
  });
  //clear group values
  return clearGroupData(filteredData);
};

export const filterDataByActiveTab = (data: Array<ItemData> | undefined, activeTab: ItemTypes) => {
  if (!data || !data.length) {
    return [];
  }
  if (activeTab === ItemTypes.All) {
    return data;
  }
  const filteredData = data.filter((item: ItemData) => item.itemType === activeTab);
  return clearGroupData(filteredData);
};

export const getAvailableTabs = (data: ItemData[], itemOrder: typeof itemTypesOrder): ItemTypes[] => {
  const localData = [...data];
  let totalResults = 0;
  const ret: ItemTypes[] = localData.reduce((acc: ItemTypes[], item: ItemData) => {
    totalResults = totalResults + 1;
    if (item.itemType && acc.indexOf(item.itemType) === -1) {
      acc.push(item.itemType);
    }
    return acc;
  }, []);
  if (ret.length > 1) {
    ret.unshift(ItemTypes.All);
  }
  return ret.sort((itemType1: ItemTypes, itemType2: ItemTypes) => {
    return itemOrder[itemType1] - itemOrder[itemType2];
  });
};

/**
 * @function filterPreviewDuplications
 * filter out all slides which are duplication of their adjacent previous slides
 * (happens while switching from preview to live mode on the webcast app)
 * @param { Array<ItemData>} cues - the cues data
 * @returns {Array<ItemData>}
 */
export function filterPreviewDuplications(cues: Array<ItemData>): Array<ItemData> {
  const isDuplicatedSlide = (previousSlide: ItemData | null, currentSlide: ItemData) => {
    return (
      previousSlide &&
      currentSlide.title === previousSlide.title &&
      currentSlide.partnerData === previousSlide.partnerData &&
      [currentSlide.tags, previousSlide.tags].includes('select-a-thumb, __PREVIEW_CUEPOINT_TAG__')
    );
  };

  const filteredArr: Array<ItemData> = [];
  let previousSlide: ItemData | null = null;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].itemType !== ItemTypes.Slide) {
      filteredArr.push(cues[i]);
    } else {
      if (!isDuplicatedSlide(previousSlide, cues[i])) {
        filteredArr.push(cues[i]);
      }
      previousSlide = cues[i];
    }
  }
  return filteredArr;
}

export const checkType = (data: any, type?: any): boolean => {
  if (data && type) {
    return data instanceof type;
  }
  return false;
};

export const prepareItemTypesOrder = (itemsOrder: any): Record<string, number> => {
  if (itemsOrder && typeof itemsOrder === 'object') {
    return {...itemTypesOrder, ...itemsOrder};
  }
  return itemTypesOrder;
};

export const isEmptyObject = (obj: Record<string, any>) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

export const isDataEqual = (prevData: ItemData[], nextData: ItemData[]): boolean => {
  if (prevData.length !== nextData.length) {
    return false;
  }
  if (prevData.length && nextData.length) {
    if (prevData[0].id !== nextData[0].id) {
      return false;
    }
    if (prevData[prevData.length - 1].id !== nextData[nextData.length - 1].id) {
      return false;
    }
    if (prevData[0].text && nextData[0].text && prevData[0].text !== nextData[0].text) {
      return false;
    }
    if (
      prevData[prevData.length - 1].text &&
      nextData[nextData.length - 1].text &&
      prevData[prevData.length - 1].text !== nextData[nextData.length - 1].text
    ) {
      return false;
    }
  }
  return true;
};

export const isMapsEqual = (map1: HighlightedMap, map2: HighlightedMap) => {
  if (map1.size !== map2.size) {
    return false;
  }
  for (let [key, val] of map1) {
    const testVal = map2.get(key);
    if (testVal !== val || (testVal === undefined && !map2.has(key))) {
      return false;
    }
  }
  return true;
};

export const findCuepointType = (list: ItemData[], cuePointType: ItemTypes): boolean => {
  return !!list.find((cuepoint: ItemData) => cuepoint.itemType === cuePointType);
};

export const filterCuepointsByStartTime = (list: ItemData[], startTime: number): ItemData[] => {
  return list.filter(item => item.startTime >= startTime);
};

type Procedure = (...args: any[]) => void;
export function debounce<F extends Procedure>(
  func: F,
  waitMilliseconds = 50,
  options = {
    isImmediate: false
  }
): F {
  let timeoutId: any;

  return function (this: any, ...args: any[]) {
    const doLater = () => {
      timeoutId = undefined;
      if (!options.isImmediate) {
        func.apply(this, args);
      }
    };

    const shouldCallNow = options.isImmediate && timeoutId === undefined;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(doLater, waitMilliseconds);

    if (shouldCallNow) {
      func.apply(this, args);
    }
  } as any;
}
