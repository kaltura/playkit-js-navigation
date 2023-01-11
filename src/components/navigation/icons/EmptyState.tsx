import {h} from 'preact';
import * as styles from './EmptyState.scss';
import {ARROW_IMG, CURLY_LINE_IMG} from "../../constants/svgs";

export const EmptyState = () => {
  return (
      <div class={styles.emptyState}>
        <div class={styles.arrow}>
          <svg width="109" height="51" viewBox="0 0 109 51" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d={CURLY_LINE_IMG} fill="#CCCCCC"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d={ARROW_IMG} fill="#CCCCCC"/>
          </svg>
        </div>
        <p class={styles.title}>
          Search in video
        </p>
        <p class={styles.description}>
          You can search the video captions for specific words or phrases.
        </p>
      </div>
  );
};
