import { ItemData } from "../components/navigation/navigation-item/NavigationItem";

export function getConfigValue( // TODO: consider move to contrib
  value: any,
  condition: (value: any) => boolean,
  defaultValue: any
) {
  let result = defaultValue;
  if (typeof condition === "function" && condition(value)) {
    result = value;
  }
  return result;
}

export enum groupTypes {
  mid = "mid",
  first = "first",
  last = "last"
}

export enum itemTypes {
  All = "All",
  AnswerOnAir = "AnswerOnAir",
  Chapter = "Chapter",
  Slide = "Slide",
  Hotspot = "Hotspot"
}

export enum cuePointTypes {
  Annotation = "annotation.Annotation",
  Thumb = "thumbCuePoint.Thumb",
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
      (hours < 10 ? "0" + hours : hours) +
      ":" +
      (min < 10 ? "0" + min : min) +
      ":" +
      (sec < 10 ? "0" + sec : sec)
    );
  } else {
    return (min < 10 ? "0" + min : min) + ":" + (sec < 10 ? "0" + sec : sec);
  }
};

// normlise time, extract description and title, find thumbnail if exist etc'
export const fillData = (
  originalItem: any,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean,
  liveType: boolean = false,
) => {
  const item: any = { ...originalItem };
  item.liveType = liveType;
  if (liveType) {
    item.startTime = item.createdAt;
  } else {
    item.startTime = Math.floor(item.startTime / 1000);
    item.displayTime = convertTime(item.startTime);
  }
  switch (item.cuePointType) {
    // TODO - support AnsweOnAir later
    case cuePointTypes.Annotation:
      // hotspot
      item.displayTitle = item.text;
      item.itemType = itemTypes.Hotspot;
      break;
    case cuePointTypes.Thumb: // chapters and slides
      item.displayDescription = item.description;
      item.displayTitle = item.title;
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
            item.previewImage = `${serviceUrl.split("api_v3")[0]}/p/${
              item.partnerId
            }/sp/${item.partnerId}00/thumbnail/entry_id/${
              item.entryId
            }/width/400/vid_sec/${item.startTime}/ks/${ks}`;
          }
          break;
      }
      break;
  }
  if (item.displayTitle && item.displayTitle.length > MAX_CHARACTERS) {
    let elipsisString = item.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisString = elipsisString.trim();
    item.shorthandTitle = elipsisString + "... ";
  }
  if (
    !item.displayTitle &&
    item.displayDescription &&
    item.displayDescription.length > 79
  ) {
    let elipsisDescription = item.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisDescription = elipsisDescription.trim();
    item.shorthandDescription = elipsisDescription + "... ";
  }

  // indexed text to save calculation at runtime + filter
  let indexedText = "";
  if (item.displayDescription) {
    indexedText = item.displayDescription;
  }
  if (item.title) {
    indexedText += " " + item.title;
  }
  if (item.itemType) {
    indexedText += " " + item.itemType;
  }
  indexedText += " " + item.displayTime;
  item.indexedText = indexedText.toLowerCase();
  item.hasShowMore = item.displayDescription || item.shorthandDesctipyion;
  return item;
};

// TODO: add group sort
export const groupData = (cuepoints: Array<ItemData>) => {
  return cuepoints.reduce(
    // mark groupData:
    // first item will have groupData=groupTypes.first
    // mid items will have groupData=groupTypes.mid
    // last items will have groupData=groupTypes.last
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
}

// main function for data handel. This sorts the cuepoints by startTime, and enriches the items with data so that the
// items component will not contain too much logic in it and mostly will be a
// dumb display-component (no offence - NavigationItem...)
export const prepareVodData = (
  multirequestData: Array<any> | null,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean
): Array<ItemData> => {
  if (!multirequestData || multirequestData.length === 0) {
    // Wrong or empty data
    throw new Error("ERROR ! multirequestData");
    return [];
  }
  // extract all cuepoints from all requests
  let receivedCuepoints: Array<ItemData> = [];
  multirequestData.forEach(request => {
    if (
      request &&
      request.result &&
      request.result.objects &&
      request.result.objects.length
    ) {
      receivedCuepoints = receivedCuepoints.concat(
        request.result.objects as Array<ItemData>
      );
    }
  });
  // receivedCuepoints is a flatten array now sort by startTime (plus normalize startTime to rounded seconds)
  receivedCuepoints = groupData(
    receivedCuepoints
      .sort((item1: ItemData, item2: ItemData) => item1.startTime - item2.startTime)
      .map((cuepoint: ItemData) => {
        return {
          ...fillData(cuepoint, ks, serviceUrl, forceChaptersThumb, false),
          liveTypeCuepoint: false,
        }
      })
    );
  return receivedCuepoints;
};

const clearGroupData = (data: Array<ItemData>) => {
  return data.map((item: ItemData) => ({
    ...item,
    groupData: null
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
    return data;
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
  data: ItemData[]
): { availableTabs: itemTypes[]; totalResults: number } => {
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
  if (ret.length) {
    ret.unshift(itemTypes.All);
  }
  return { availableTabs: ret, totalResults };
};

export const prepareLiveData = (
  currentData: Array<ItemData>,
  newData: Array<ItemData>,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean,
  liveStartTime: number | null,
): Array<ItemData> => {
  // TODO: check if new quepoint already exist https://github.com/kaltura/mwEmbed/blob/6e187bd6d7a103389d08316999327aff413796be/modules/KalturaSupport/resources/mw.KCuePoints.js#L334
  if (!newData || newData.length === 0) {
    // Wrong or empty data
    return currentData;
  }
  // extract all cuepoints from all requests
  let receivedCuepoints: Array<ItemData> = [];
  newData.forEach((item: ItemData) => {
    if (item) { // TODO: check mandatory item properties
      receivedCuepoints = receivedCuepoints.concat(
        currentData, item
      );
    }
  });
  // receivedCuepoints is a flatten array now sort by startTime (plus normalize startTime to rounded seconds)
  receivedCuepoints = groupData(
    receivedCuepoints
      .map((cuepoint: any) => {
        return fillData(cuepoint, ks, serviceUrl, forceChaptersThumb, true)
      })
      // TODO: sort data (V2 makes it https://github.com/kaltura/mwEmbed/blob/6e187bd6d7a103389d08316999327aff413796be/modules/KalturaSupport/resources/mw.KCuePoints.js#L220)
    );
  if (liveStartTime) {
    receivedCuepoints = convertStartTime(receivedCuepoints, liveStartTime);
  }
  return receivedCuepoints;
};

export const convertStartTime = (data: Array<ItemData>, liveStartTime: number): Array<ItemData> => {
  return data.map((item: ItemData) => ({
    ...item,
    // @ts-ignore
    startTime: item.createdAt - liveStartTime,
  }));
};