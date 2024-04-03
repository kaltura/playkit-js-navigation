import {h} from 'preact';
import * as styles from './EmptyState.scss';
import {ARROW_IMG, CURLY_LINE_IMG} from '../../constants/svgs';
import {ui} from '@playkit-js/kaltura-player-js';
const {preacti18n} = ui;
const {withText, Text} = preacti18n;

interface EmptyStateProps {
  searchPlaceholder?: string;
  searchDescription?: string;
}

const translates = {
  searchPlaceholder: <Text id="navigation.search_placeholder">Search in video</Text>,
  searchDescription: <Text id="navigation.search_description">You can search the video captions for specific words or phrases.</Text>
};

export const EmptyState = withText(translates)((props: EmptyStateProps) => {
  return (
    <div class={styles.emptyState}>
      <div class={styles.arrow}>
        <svg width="109" height="51" viewBox="0 0 109 51" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d={CURLY_LINE_IMG} fill="#CCCCCC" />
          <path fill-rule="evenodd" clip-rule="evenodd" d={ARROW_IMG} fill="#CCCCCC" />
        </svg>
      </div>
      <p class={styles.title}>{props.searchPlaceholder}</p>
      <p class={styles.description}>{props.searchDescription}</p>
    </div>
  );
});
