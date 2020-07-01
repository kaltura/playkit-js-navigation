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

// TODO check if exist in QNA and if QNA did it more elegant
export const convertTime = (sec: number) => {
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

export const fillData = (item: any, ks: string, serviceUrl: string) => {
  item.originalTime = item.startTime; // TODO - remove later if un-necessary
  item.startTime = Math.floor(item.startTime / 1000);
  item.displayTime = convertTime(item.startTime);
  switch (item.cuePointType) {
    // TODO - support AnsweOnAir later
    case "annotation.Annotation":
      // hotspot
      item.displayTitle = item.text;
      item.itemType = itemTypes.Hotspot;
      break;
    case "thumbCuePoint.Thumb": // chapters and slides
      item.displayDescription = item.description;
      item.displayTitle = item.title;
      switch (item.subType) {
        case 1:
          item.itemType = itemTypes.Slide;
          if (item.assetId) {
            item.previewImage = `${serviceUrl}/index.php/service/thumbAsset/action/serve/thumbAssetId/${item.assetId}/ks/${ks}?thumbParams:objectType=KalturaThumbParams&thumbParams:width=400`;
          }
          break;
        case 2:
          item.itemType = itemTypes.Chapter;
          item.previewImage = `${serviceUrl.split("api_v3")[0]}/p/${
            item.partnerId
          }/sp/${item.partnerId}00/thumbnail/entry_id/${
            item.entryId
          }/width/400/vid_sec/${item.startTime}/ks/${ks}`;
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
  indexedText += " " + item.itemType;
  indexedText += " " + item.displayTime;
  item.indexedText = indexedText.toLowerCase();
  //todo - clear unwanted fields?
};

// main function for data handel. This sorts the cuepoints by startTime, and enriches the items with data so that the
// items component will not contain too much logic in it and mostly will be a
// dumb display-component (no offence - NavigationItem...)

export const perpareData = (
  multirequestData: Array<any> | null,
  ks: string,
  serviceUrl: string
): Array<any> => {
  if (!multirequestData || multirequestData.length === 0) {
    // Wrong or empty data
    throw new Error("ERROR ! multirequestData");
    return [];
  }
  // extract all cuepoints from all requests
  let receivedCuepoints: Array<any> = [];
  multirequestData.forEach(request => {
    if (
      request &&
      request.result &&
      request.result.objects &&
      request.result.objects.length
    ) {
      receivedCuepoints = receivedCuepoints.concat(
        request.result.objects as Array<any>
      );
    }
  });
  // receivedCuepoints is a flatten array now sort by startTime (plus normalize startTime to rounded seconds)
  receivedCuepoints = receivedCuepoints
    .sort((item1: any, item2: any) => item1.startTime - item2.startTime)
    .map((cuepoint: any) => {
      fillData(cuepoint, ks, serviceUrl); // normlise time, extract description and title, find thumbnail if exist etc'
      return cuepoint;
    })
    .reduce(
      // mark groupData:
      // first item will have groupData=groupTypes.first
      // mid items will have groupData=groupTypes.mid
      // last items will have groupData=groupTypes.last
      (prevArr: Array<any>, currentCuepoint: any, index) => {
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
  return receivedCuepoints;
};
