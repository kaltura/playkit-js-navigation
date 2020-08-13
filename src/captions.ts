import {xml2js} from 'xml-js';
import {KalturaClient} from 'kaltura-typescript-client';
import {
  KalturaRequest,
  KalturaRequestArgs,
} from 'kaltura-typescript-client/api/kaltura-request';
import {KalturaObjectMetadata} from 'kaltura-typescript-client/api/kaltura-object-base';
import {KalturaCaptionAssetFilter} from 'kaltura-typescript-client/api/types/KalturaCaptionAssetFilter';
import {CaptionAssetListAction} from 'kaltura-typescript-client/api/types/CaptionAssetListAction';
import {KalturaCaptionAsset} from 'kaltura-typescript-client/api/types/KalturaCaptionAsset';
import {KalturaCaptionAssetListResponse} from 'kaltura-typescript-client/api/types/KalturaCaptionAssetListResponse';
import {Cuepoint, ObjectUtils} from '@playkit-js-contrib/common';
const {get} = ObjectUtils;

export const HOUR = 3600; // seconds in 1 hour

export interface CaptionItem extends Cuepoint {
  text: string;
  id: number;
}

export const toSeconds = (val: any, vtt = false): number => {
  const regex = vtt
    ? /(\d+):(\d{2}):(\d{2}).(\d{2,3}|\d{2})/
    : /(\d+):(\d{2}):(\d{2}),((\d{2,3}|\d{2}|\d{1}))?/;
  const parts: any | null[] = regex.exec(val);
  if (parts === null) {
    return 0;
  }
  for (var i = 1; i < 5; i++) {
    parts[i] = parseInt(parts[i], 10);
    if (isNaN(parts[i])) {
      parts[i] = 0;
    }
  }
  // hours + minutes + seconds + ms
  return parts[1] * HOUR + parts[2] * 60 + parts[3] + parts[4] / 1000;
};

export const getCaptionsByFormat = (
  captions: any,
  captionsFormat: string
): CaptionItem[] => {
  const format = captionsFormat.toLowerCase();
  // const a = fromSrt(captions);
  switch (format) {
    case '1':
      return fromSrt(captions);
    case '2':
      // strip 'span' from the p tags, they break the parser and no time (now) to write a parser
      captions = captions
        .replace(/<span[^>]+\?>/i, '')
        .replace(/<\/span>/i, '')
        .replace(/<br><\/br>/g, ' ') // remove <br></br>'s as it breaks the parser too.
        .replace(/<[//]{0,1}(SPAN|span)[^><]*>/g, '');
      return TTML2Obj(captions);
    case '3':
      return fromVtt(captions);
    default:
      return [];
  }
};

const fromVtt = (data: string): CaptionItem[] => {
  let source: string | string[] = data.replace(/\r/g, '');
  const regex = /(\d+)?\n?(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3}).*\n/g;
  source = source.replace(/[\s\S]*.*(?=00:00:00.000)/, '');
  source = source.split(regex);
  source.shift();
  const result = [];
  for (let i = 0; i < source.length; i += 4) {
    result.push({
      id: result.length + 1,
      startTime: toSeconds(source[i + 1].trim(), true),
      endTime: toSeconds(source[i + 2].trim(), true),
      text: source[i + 3].trim(),
    });
  }
  return result;
};

const fromSrt = (data: string): CaptionItem[] => {
  let source: string | string[] = data.replace(/\r/g, '');
  const regex = /(\d+)?\n?(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3}).*\n/g;
  source = source.split(regex);
  source.shift();
  const result = [];
  for (let i = 0; i < source.length; i += 4) {
    result.push({
      id: result.length + 1,
      startTime: toSeconds(source[i + 1].trim()),
      endTime: toSeconds(source[i + 2].trim()),
      text: source[i + 3].trim(),
    });
  }
  return result;
};

export const TTML2Obj = (ttml: any): CaptionItem[] => {
  const data: any = xml2js(ttml, {compact: true});
  // need only captions for showing. they located in tt.body.div.p.
  const chapters = data.tt.body.div.p;
  const correctData = chapters.map((item: any, index: number) => {
    const {begin, end, ...otherAttributes} = item._attributes;
    // convert time to 00:00:00.000 to 00:00:00,000
    const endTime = end.replace(/\./g, ',');
    const startTime = begin.replace(/\./g, ',');
    const prepareObj = {
      id: index + 1,
      endTime: toSeconds(endTime),
      startTime: toSeconds(startTime),
      text:
        (Array.isArray(item._text) ? item._text.join(' ') : item._text) || '',
      // all non-required
      // otherAttributes: otherAttributes
    };
    return prepareObj;
  });
  return correctData;
};

// KalturaClient uses custom CaptionAssetServeAction method,
// once KalturaFileRequest is fixed remove custom CaptionAssetServeAction and use
// CaptionAssetServeAction from "kaltura-typescript-client/api/types/CaptionAssetServeAction"
interface CaptionAssetServeActionArgs extends KalturaRequestArgs {
  captionAssetId: string;
}
export class CaptionAssetServeAction extends KalturaRequest<{url: string}> {
  captionAssetId: any;
  constructor(data: CaptionAssetServeActionArgs) {
    super(data, {
      responseType: 'v',
      responseSubType: '',
      responseConstructor: null,
    } as any);
  }
  protected _getMetadata(): KalturaObjectMetadata {
    const result = super._getMetadata();
    Object.assign(result.properties, {
      service: {type: 'c', default: 'caption_captionasset'},
      action: {type: 'c', default: 'serve'},
      captionAssetId: {type: 's'},
    });
    return result;
  }
}

const getCaptionFormat = (
  captionAsset: KalturaCaptionAsset,
  captionAssetList: KalturaCaptionAsset[]
): string => {
  const selectedLanguage: Record<string, any> =
    captionAssetList.find(
      (item: KalturaCaptionAsset) => item.id === captionAsset.id
    ) || {};
  return get(selectedLanguage, 'format', '');
};

const parseCaptions = (
  data: string,
  captionAsset: KalturaCaptionAsset,
  captionAssetList: KalturaCaptionAsset[]
): CaptionItem[] => {
  try {
    const captionFormat = getCaptionFormat(captionAsset, captionAssetList);
    if (data.toString().indexOf('Error: ') === 0) {
      // remove this condition once client fixed
      data = data.toString().replace('Error: ', '');
    }
    return getCaptionsByFormat(data, captionFormat);
  } catch (err) {
    // TODO: "Failed to parse the caption file", "_parseCaptions"
  }
  return [];
};

const getCaptionData = (
  data: any,
  captionAsset: KalturaCaptionAsset,
  captionAssetList: KalturaCaptionAsset[]
) => {
  const rawCaptions = get(data, 'error.message', data);
  if (rawCaptions) {
    return parseCaptions(rawCaptions, captionAsset, captionAssetList);
  } else {
    // 'Captions data is empty', '_loadCaptionsAsset'
  }
};

export const makeCaptionAssetListRequest = (
  entryId: string
): CaptionAssetListAction => {
  return new CaptionAssetListAction({
    filter: new KalturaCaptionAssetFilter({
      entryIdEqual: entryId,
    }),
  });
};

export const makeCaptionAssetServeRequest = (
  captionAssetId: string
): CaptionAssetServeAction => {
  return new CaptionAssetServeAction({captionAssetId});
};

export const fetchCaptionsList = async (
  kalturaClient: KalturaClient,
  entryId: string
) => {
  // TODO: consider move CaptionAssetListAction to multirequest
  const captionAssetListRequest = makeCaptionAssetListRequest(entryId);
  let captionAssetListData: KalturaCaptionAssetListResponse | null = null;
  try {
    captionAssetListData = await kalturaClient.request(captionAssetListRequest);
  } catch (err) {
    // TODO: handle error;
  }
  return captionAssetListData?.objects ? captionAssetListData?.objects : [];
};

export const fetchCaptionAsset = async (
  kalturaClient: KalturaClient,
  captionAssetId: string
) => {
  let captionAssetServeData: any = null;
  const captionAssetServeRequest = makeCaptionAssetServeRequest(captionAssetId);
  try {
    captionAssetServeData = await kalturaClient.request(
      captionAssetServeRequest
    );
  } catch (err) {
    captionAssetServeData = err;
  }
  return captionAssetServeData;
};

export const getCaptions = async (
  kalturaClient: KalturaClient,
  entryId: string
) => {
  const captionAssetList: KalturaCaptionAsset[] = await fetchCaptionsList(
    kalturaClient,
    entryId
  );
  const captionAsset: KalturaCaptionAsset = captionAssetList[0]; // HARDCODED!
  const captionContent = await fetchCaptionAsset(
    kalturaClient,
    captionAsset.id
  );
  const captionData =
    getCaptionData(captionContent, captionAsset, captionAssetList) || [];
  return captionData.map((caption: CaptionItem) => ({
    ...caption,
    startTime: caption.startTime * 1000,
  }));
};

// TODO consider to make custom CaptionAssetServeAction that handled error, prepared data  and return result
