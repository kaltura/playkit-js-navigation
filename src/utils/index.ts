import {CuePoint, GroupTypes, HighlightedMap, ItemData, ItemTypes} from '../types';

const {toHHMMSS} = KalturaPlayer.ui.utils;

export const itemTypesOrder: Record<string, number> = {
  [ItemTypes.All]: 0,
  [ItemTypes.Chapter]: 1,
  [ItemTypes.Slide]: 2,
  [ItemTypes.Hotspot]: 3,
  [ItemTypes.AnswerOnAir]: 4,
  [ItemTypes.Caption]: 5,
  [ItemTypes.QuizQuestion]: 6
};

export const getLastItem = <T>(arr: Array<T>) => {
  return arr[arr.length - 1];
};

export const makeDisplayTime = (startTime: number) => {
  return toHHMMSS(Math.floor(startTime));
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

export const prepareCuePoint = (cuePoint: CuePoint, cuePointType: ItemTypes, isLive: boolean): ItemData => {
  const {metadata} = cuePoint;
  const itemData: ItemData = {
    cuePointType,
    id: cuePoint.id,
    startTime: cuePoint.startTime,
    displayTime: makeDisplayTime(cuePoint.startTime),
    partnerData: metadata.partnerData,
    tags: metadata.tags,
    itemType: cuePointType,
    displayTitle: '',
    liveCuePoint: isLive,
    displayDescription: [ItemTypes.Slide, ItemTypes.Chapter].includes(cuePointType) ? decodeString(metadata.description) : null,
    previewImage: null,
    groupData: null
  };
  if ([ItemTypes.Hotspot, ItemTypes.AnswerOnAir, ItemTypes.Caption].includes(cuePointType)) {
    itemData.displayTitle = decodeString(metadata.text);
  } else if ([ItemTypes.Slide, ItemTypes.Chapter].includes(cuePointType)) {
    itemData.displayTitle = decodeString(metadata.title);
    itemData.previewImage = metadata.assetUrl || null;
  }
  return itemData;
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
      if (!currentCuepoint.displayTime) {
        // live cue-points doesn't have displayTime
        currentCuepoint.groupData = GroupTypes.first;
        return [...prevArr, currentCuepoint];
      }
      const prevItem = getLastItem(prevArr);
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
      return [...prevArr, currentCuepoint];
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

const isDuplicatedSlide = (previousSlide: ItemData | null, currentSlide: ItemData) => {
  return (
    previousSlide &&
    currentSlide.title === previousSlide.title &&
    currentSlide.partnerData === previousSlide.partnerData &&
    [currentSlide.tags, previousSlide.tags].includes('select-a-thumb, __PREVIEW_CUEPOINT_TAG__')
  );
};

const filterCuesById = (cues: Array<ItemData>) => {
  const cuesMap = new Map<string, ItemData>();
  cues.forEach(cue => {
    cuesMap.set(cue.id, cue);
  });
  return [...cuesMap.values()];
};

// filter out all slides which are duplication of their adjacent previous slides
// (happens while switching from preview to live mode on the webcast app)
export const filterDuplications = (cues: Array<ItemData>): Array<ItemData> => {
  const filteredById = filterCuesById(cues);
  const filteredByContent: Array<ItemData> = [];
  let previousSlide: ItemData | null = null;
  for (let i = 0; i < filteredById.length; i++) {
    if (filteredById[i].itemType !== ItemTypes.Slide) {
      filteredByContent.push(filteredById[i]);
    } else {
      if (!isDuplicatedSlide(previousSlide, filteredById[i])) {
        filteredByContent.push(filteredById[i]);
      }
      previousSlide = filteredById[i];
    }
  }
  return filteredByContent;
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
    const prevDataFirst = prevData[0];
    const nextDataFirst = nextData[0];
    if (prevDataFirst.id !== nextDataFirst.id) {
      return false;
    }
    const prevDataLast = getLastItem(prevData);
    const nextDataLast = getLastItem(nextData);
    if (prevDataLast.id !== nextDataLast.id) {
      return false;
    }
    if (prevDataFirst.text && nextDataFirst.text && prevDataFirst.text !== nextDataFirst.text) {
      return false;
    }
    if (prevDataLast.text && nextDataLast.text && prevDataLast.text !== nextDataLast.text) {
      return false;
    }
    const prevQuizData = prevData.filter(item => item.itemType === ItemTypes.QuizQuestion);
    const nextQuizData = nextData.filter(item => item.itemType === ItemTypes.QuizQuestion);
    if (prevQuizData.length && nextQuizData.length) {
      if (!isQuizDataEqual(prevQuizData, nextQuizData)) {
        return false;
      }
    }
  }
  return true;
};

const isQuizDataEqual = (prevQuizData: ItemData[], nextQuizData: ItemData[]): boolean => {
  if (prevQuizData.length !== nextQuizData.length) {
    return false;
  }
  for (let i=0; i<prevQuizData.length; i++) {
    if (prevQuizData[i].quizState !== nextQuizData[i].quizState) {
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
