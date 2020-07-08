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

// TODO check if exist in QNA and if QNA did it more elegant
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

export const fillData = (
  originalItem: any,
  ks: string,
  serviceUrl: string,
  forceChaptersThumb: boolean,
  useDateAsItemTime: boolean = false,
) => {
  const item: any = { ...originalItem };
  item.originalTime = item.startTime; // TODO - remove later if un-necessary
  if (useDateAsItemTime) {
    // Live cuepoint time
    item.startTime = item.createdAt * 1000;
    const date = new Date(item.startTime)
    item.displayTime = getDisplayTime(date);
    if (isDateOlderThan24Hours(date)) {
      item.displayTime = `${item.displayTime}, ${getDisplayDate(date, "dd/mm/yyyy")}`;
    }
  } else {
    // VOD cuepoint time
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

  if (item.displayTitle && item.displayTitle.length > 79) {
    let elipsisString = item.displayTitle.slice(0, 79);
    elipsisString = elipsisString.trim();
    item.shorthandTitle = elipsisString + "... ";
  }
  if (
    !item.displayTitle &&
    item.displayDescription &&
    item.displayDescription.length > 79
  ) {
    let elipsisDescription = item.displayTitle.slice(0, 79);
    elipsisDescription = elipsisDescription.trim();
    item.shorthandDesctipyion = elipsisDescription + "... ";
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
  return item;
};

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
        return fillData(cuepoint, ks, serviceUrl, forceChaptersThumb); // normlise time, extract description and title, find thumbnail if exist etc'
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
}

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
}

export const getAvailableTabs = (data: ItemData[]): { availableTabs: itemTypes[], totalResults: number} => {
  const localData = [...data];
  let totalResults = 0;
  const ret: itemTypes[] = localData.reduce((acc: itemTypes[], item: ItemData) => {
    totalResults = totalResults + 1
    if (item.itemType && acc.indexOf(item.itemType) === -1) {
      acc.push(item.itemType);
    }
    return acc;
  }, []);
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
  forceChaptersThumb: boolean
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
  receivedCuepoints = groupData( // TODO: group only latest
    receivedCuepoints
      .map((cuepoint: any) => {
        return fillData(cuepoint, ks, serviceUrl, forceChaptersThumb, true); // normlise time, extract description and title, find thumbnail if exist etc'
      })
      // TODO: sort data (V2 makes it https://github.com/kaltura/mwEmbed/blob/6e187bd6d7a103389d08316999327aff413796be/modules/KalturaSupport/resources/mw.KCuePoints.js#L220)
    );
  return receivedCuepoints;
}

// QNA use same method, consider move to contrib
export const convertPhpDateFormattingToJsDateFormatting = (dateFormat: string): string => {
  if (dateFormat.indexOf('j') === -1) {
    return dateFormat;
  }

  // the list was taken from media-space and approved in `KMS-20129`
  switch (dateFormat) {
    case 'j.n.Y':
      dateFormat = 'd.m.yyyy';
      break;
    case 'j/n/Y':
      dateFormat = 'd/m/yyyy';
      break;
    case 'j F, Y':
      dateFormat = 'd mmmm, yyyy';
      break;
    case 'm/j/Y':
      dateFormat = 'mm/d/yyyy';
      break;
    case 'Y-n-j':
      dateFormat = 'yyyy-m-d';
      break;
    case 'F jS, Y':
      dateFormat = 'mmmm do, yyyy';
      break;
    default:
      dateFormat = 'dd/mm/yyyy';
  }

  return dateFormat;
}

// QNA use same method, consider move to contrib
export const getDisplayDate = (date: Date | null, dateFormat: string) => {
  if (!date) {
      return;
  }

  let dateString = convertPhpDateFormattingToJsDateFormatting(dateFormat);

  const d = date.getDate();
  const dd = d < 10 ? `0${d}` : d;

  const m = date.getMonth() + 1;
  const mm = m < 10 ? `0${m}` : m;

  const yyyy = date.getFullYear();

  if (dateString.match(/do/) != null) {
      let value;

      if (d === 1 || d === 11 || d === 21 || d === 31) value = `${d}st`;
      else if (d === 2 || d === 12 || d === 22) value = `${d}nd`;
      else if (d === 3 || d === 13 || d === 23) value = `${d}rd`;
      else value = `${d}th`;

      dateString = dateString.replace(/do/g, value);
  } else if (dateString.match(/dd/)) {
      dateString = dateString.replace(/dd/, dd.toString());
  } else if (dateString.match(/d/)) {
      dateString = dateString.replace(/d/, d.toString());
  }

  if (dateString.match(/mmmm/) != null) {
      const month = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December"
      ];
      dateString = dateString.replace(/mmmm/, month[m - 1]);
  } else if (dateString.match(/mm/)) {
      dateString = dateString.replace(/mm/, mm.toString());
  } else if (dateString.match(/m/)) {
      dateString = dateString.replace(/m/, m.toString());
  }

  dateString = dateString.replace(/yyyy/, yyyy.toString());

  return dateString;
}

// QNA use same method, consider move to contrib
export const getDisplayTime = (date: Date | null) => {
  if (!date) {
      return;
  }
  let hours: number = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  let minutes: string | number = date.getMinutes();
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${minutes} ${ampm}`;
}

// QNA use same const, consider move to contrib
const ONE_DAY_IN_MS: number = 1000 * 60 * 60 * 24;

// QNA use same method, consider move to contrib
export const isDateOlderThan24Hours = (date: Date | null): boolean => {
  if (!date) {
      return false;
  }
  return Date.now() - date.valueOf() >= ONE_DAY_IN_MS;
}