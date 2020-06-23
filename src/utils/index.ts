export function getConfigValue(
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

export const sortData = (
  multirequestData: Array<any> | null
): Array<any> => {
  if (!multirequestData || multirequestData.length === 0) {
    // Wrong or empty data
    throw new Error("ERROR ! multirequestData");
    return [];
  }
  // extract all cuepoints from all requests
  let receivedCuepoints: Array<any> = [];
  multirequestData.forEach((request) => {
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
      cuepoint.originalTime = cuepoint.startTime; // TODO - remove later if un-necessary
      cuepoint.startTime = Math.floor(cuepoint.startTime / 1000);
      return cuepoint;
    })
    .reduce(
      // mark groups: Mark `inGroup` to all relevant items
      // Mark `groupLast` to last items in the group
      // Mark `firstInGroup` to first items in the group
      (prevArr: Array<any>, currentCuepoint: any, index) => {
        const prevItem = prevArr.length > 0 && prevArr[prevArr.length - 1];
        const prevPrevItem =
          prevArr.length > 1 && prevArr[prevArr.length - 2];

        if (prevItem && currentCuepoint.startTime === prevItem.startTime) {
          // found a 2nd item in group - mark prevItem also as inGroup
          prevItem.inGroup = true;
          prevItem.groupFirst = true;
          if (
            prevPrevItem &&
            prevPrevItem.startTime === currentCuepoint.startTime
          ) {
            // if previous-previous item is in the same group - remove firstInGroup from prev
            delete prevItem.groupFirst;
          }
          currentCuepoint.inGroup = true;
          delete prevItem.groupLast; // it can't be the last in the group
          currentCuepoint.groupLast = true; // mark current as the last. If it is not - the next item will clear this
        }
        prevArr.push(currentCuepoint);
        return prevArr;
      },
      []
    );
  return receivedCuepoints;
};