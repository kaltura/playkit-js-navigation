import {xml2js} from 'xml-js';
import {KalturaClient} from 'kaltura-typescript-client';
import {KalturaRequest, KalturaRequestArgs} from 'kaltura-typescript-client/api/kaltura-request';
import {KalturaObjectMetadata} from 'kaltura-typescript-client/api/kaltura-object-base';
import {KalturaCaptionAssetFilter} from 'kaltura-typescript-client/api/types/KalturaCaptionAssetFilter';
import {CaptionAssetListAction} from 'kaltura-typescript-client/api/types/CaptionAssetListAction';
import {KalturaCaptionAsset} from 'kaltura-typescript-client/api/types/KalturaCaptionAsset';
import {Cuepoint, ObjectUtils, getContribLogger} from '@playkit-js-contrib/common';
import {itemTypes} from './utils';
const {get} = ObjectUtils;

const logger = getContribLogger({
  class: 'NavigationPlugin',
  module: 'captions'
});

export const HOUR = 3600; // seconds in 1 hour

export interface CaptionItem extends Cuepoint {
  text: string;
  id: number;
}

export const toSeconds = (val: any, vtt = false): number => {
  const regex = vtt ? /(\d+):(\d{2}):(\d{2}).(\d{2,3}|\d{2})/ : /(\d+):(\d{2}):(\d{2}),((\d{2,3}|\d{2}|\d{1}))?/;
  const parts: any | null[] = regex.exec(val);
  if (parts === null) {
    return 0;
  }
  for (let i = 1; i < 5; i++) {
    parts[i] = parseInt(parts[i], 10);
    if (isNaN(parts[i])) {
      parts[i] = 0;
    }
  }
  // hours + minutes + seconds + ms
  return parts[1] * HOUR + parts[2] * 60 + parts[3] + parts[4] / 1000;
};

const fromVtt = (data: string): CaptionItem[] => {
  logger.debug('parsing VTT type of captions', {
    method: 'fromVtt',
    data: {data}
  });
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
      text: source[i + 3].trim()
    });
  }
  return result;
};

const fromSrt = (data: string): CaptionItem[] => {
  logger.debug('parsing SRT type of captions', {
    method: 'fromSrt',
    data: {data}
  });
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
      text: source[i + 3].trim()
    });
  }
  return result;
};

export const TTML2Obj = (ttml: any): CaptionItem[] => {
  logger.debug('parsing TTML type of captions', {
    method: 'TTML2Obj',
    data: {ttml}
  });
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
      text: (Array.isArray(item._text) ? item._text.join(' ') : item._text) || ''
      // all non-required
      // otherAttributes: otherAttributes
    };
    return prepareObj;
  });
  return correctData;
};

export const getCaptionsByFormat = (captions: any, captionsFormat: string): CaptionItem[] => {
  const format = captionsFormat.toLowerCase();
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

// KalturaClient uses custom CaptionAssetServeAction method,
// once KalturaFileRequest is fixed remove custom CaptionAssetServeAction and use
// import CaptionAssetServeAction from "kaltura-typescript-client/api/types/CaptionAssetServeAction"
interface CaptionAssetServeActionArgs extends KalturaRequestArgs {
  captionAssetId: string;
}
export class CaptionAssetServeAction extends KalturaRequest<{url: string}> {
  captionAssetId: any;
  constructor(data: CaptionAssetServeActionArgs) {
    super(data, {
      responseType: 'v',
      responseSubType: '',
      responseConstructor: null
    } as any);
  }
  protected _getMetadata(): KalturaObjectMetadata {
    const result = super._getMetadata();
    Object.assign(result.properties, {
      service: {type: 'c', default: 'caption_captionasset'},
      action: {type: 'c', default: 'serve'},
      captionAssetId: {type: 's'}
    });
    return result;
  }
}

const getCaptionFormat = (captionAsset: KalturaCaptionAsset, captionAssetList: KalturaCaptionAsset[]): string => {
  const selectedLanguage: Record<string, any> = captionAssetList.find((item: KalturaCaptionAsset) => item.id === captionAsset.id) || {};
  return get(selectedLanguage, 'format', '');
};

const parseCaptions = (data: string, captionAsset: KalturaCaptionAsset, captionAssetList: KalturaCaptionAsset[]): CaptionItem[] => {
  try {
    const captionFormat = getCaptionFormat(captionAsset, captionAssetList);
    if (data.toString().indexOf('Error: ') === 0) {
      // remove this condition once client fixed
      data = data.toString().replace('Error: ', '');
    }
    return getCaptionsByFormat(data, captionFormat);
  } catch (err) {
    logger.error('Failed to parse the caption file', {
      method: 'parseCaptions'
      // data: err,
    });
    throw new Error('Failed to parse the caption file');
  }
  return [];
};

const getCaptionData = (data: any, captionAsset: KalturaCaptionAsset, captionAssetList: KalturaCaptionAsset[]): CaptionItem[] => {
  if (!data || !captionAsset || !captionAssetList.length) {
    return [];
  }
  const rawCaptions = get(data, 'error.message', data);
  return rawCaptions ? parseCaptions(rawCaptions, captionAsset, captionAssetList) : [];
};

export const makeCaptionAssetListRequest = (entryId: string): CaptionAssetListAction => {
  return new CaptionAssetListAction({
    filter: new KalturaCaptionAssetFilter({
      entryIdEqual: entryId
    })
  });
};

export const makeCaptionAssetServeRequest = (captionAssetId: string): CaptionAssetServeAction => {
  return new CaptionAssetServeAction({captionAssetId});
};

export const fetchCaptionAsset = async (kalturaClient: KalturaClient, captionAssetId: string) => {
  let captionAssetServeData: any = null;
  const captionAssetServeRequest = makeCaptionAssetServeRequest(captionAssetId);
  try {
    captionAssetServeData = await kalturaClient.request(captionAssetServeRequest);
  } catch (err) {
    captionAssetServeData = err;
  }
  return captionAssetServeData;
};

export const getCaptions = async (
  kalturaClient: KalturaClient,
  captionAsset: KalturaCaptionAsset, // TODO: implement
  captionAssetList: KalturaCaptionAsset[]
) => {
  logger.debug('trying to fetch caption asset', {
    method: 'getCaptions',
    data: captionAsset
  });
  const captionContent = await fetchCaptionAsset(kalturaClient, captionAsset.id);
  const captionData = getCaptionData(captionContent, captionAsset, captionAssetList);
  logger.debug('caption data parsed', {
    method: 'getCaptions',
    data: captionData
  });
  return captionData.map((caption: CaptionItem) => ({
    ...caption,
    startTime: caption.startTime * 1000,
    cuePointType: itemTypes.Caption
  }));
};

export const filterCaptionAssetsByProperty = (list: KalturaCaptionAsset[], match: string | null, property: string): KalturaCaptionAsset[] => {
  return list.filter((kalturaCaptionAsset: KalturaCaptionAsset) => {
    return get(kalturaCaptionAsset, property, null) === match;
  });
};

export const findCaptionAsset = (event: string | Record<string, any>, captionAssetList: KalturaCaptionAsset[]): KalturaCaptionAsset => {
  if (typeof event === 'string') {
    const filteredByLang = filterCaptionAssetsByProperty(captionAssetList, event, 'languageCode');
    // take first captions from caption-list when caption language is not defined
    return filteredByLang[0] ? filteredByLang[0] : captionAssetList[0];
  }
  const filteredByLang = filterCaptionAssetsByProperty(captionAssetList, get(event, 'payload.selectedTextTrack._language', null), 'languageCode');
  if (filteredByLang.length === 1) {
    return filteredByLang[0];
  }
  const filteredByLabel = filterCaptionAssetsByProperty(filteredByLang, get(event, 'payload.selectedTextTrack._label', null), 'label');
  if (filteredByLang.length === 1) {
    return filteredByLabel[0];
  }

  const index: number = get(event, 'payload.selectedTextTrack._id', -1);
  const filteredByIndex = captionAssetList[index];
  // take first captions from caption-list when caption language is not defined
  return filteredByIndex ? filteredByIndex : captionAssetList[0];
};
