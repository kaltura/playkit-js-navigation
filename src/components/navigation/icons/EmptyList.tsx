import {h} from 'preact';
import * as styles from './EmptyList.scss';
import {ui} from '@playkit-js/kaltura-player-js';
const {preacti18n} = ui;

const {withText, Text} = preacti18n;

const translates = {
  noResultTitle: <Text id="navigation.search_no_results_title">No Results Found</Text>,
  noResultDescription: <Text id="navigation.search_no_results_description">Try a more general keyword</Text>
};

interface EmptyListProps {
  showNoResultsText: boolean;
  noResultTitle?: string;
  noResultDescription?: string;
}

export const EmptyList = withText(translates)(({showNoResultsText, noResultTitle, noResultDescription}: EmptyListProps) => {
  return (
    <div className={styles.emptyStateWrapper} role="banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="184" height="184" viewBox="0 0 184 184">
        <g fill="none" fill-rule="evenodd">
          <circle cx="92" cy="92" r="92" fill="#333" />
          <g transform="translate(99 5)">
            <path fill="#4DA2B3" d="M41.184 12.743c5.133 11.52 3.33 25.725-5.742 36.162-9.073 10.438-22.89 14.2-35.012 10.72z" />
            <path
              fill="#01ACCD"
              d="M18 59c3.095 1.394 6.5 2.165 10.074 2.165.536 0 1.068-.017 1.595-.052l2.325 7.161c.25.768-.153 1.595-.912 1.872l-2.227.814c-.778.284-1.639-.116-1.923-.895l-.018-.051-.26-.803c-.14.42-.463.773-.91.935l-2.226.814c-.778.284-1.64-.116-1.924-.895l-.018-.051z"
              opacity=".2"
            />
            <path
              fill="#1F6370"
              d="M42.596 0c6.446 0 11.67 5.36 11.67 11.972 0 3.382-1.367 6.437-3.565 8.614C53.418 24.803 55 29.86 55 35.293 55 50.043 43.344 62 28.966 62c-3.935 0-7.665-.895-11.01-2.498 5.91-1.85 11.43-5.336 15.829-10.395 6.322-7.273 9.101-16.39 8.458-25.169-6.282-.191-11.317-5.475-11.317-11.966C30.926 5.36 36.15 0 42.596 0z"
            />
            <circle cx="43" cy="9" r="2" fill="#222" />
            <g fill-rule="nonzero">
              <path
                fill="#01ACCD"
                d="M4.72 1.697c-4.454 3.85-4.915 7.539-.258 8.59 2.24.507 5.83.12 8.738-.689 1.776-.494 2.212-2.567.759-3.606L7.777 1.569c-.91-.651-2.218-.596-3.056.128z"
                transform="translate(47 9)"
              />
              <path
                fill="#222"
                d="M4.72 1.697c-4.454 3.85-4.915 7.539-.258 8.59 2.24.507 5.83.12 8.738-.689 1.776-.494 2.212-2.567.759-3.606L7.777 1.569c-.91-.651-2.218-.596-3.056.128z"
                opacity=".7"
                transform="translate(47 9)"
              />
            </g>
          </g>
          <path fill="#01ACCD" d="M92 184c-32.8 0-61.59-17.164-77.879-43h155.758c-16.29 25.836-45.08 43-77.879 43z" opacity=".5" />
          <path
            fill="#01ACCD"
            d="M29.302 109.649c1.823 0 3.301-1.489 3.301-3.325S31.125 103 29.302 103c-1.824 0-3.302 1.488-3.302 3.324 0 1.836 1.478 3.325 3.302 3.325zm0-2c-.716 0-1.302-.59-1.302-1.325 0-.734.586-1.324 1.302-1.324.715 0 1.301.59 1.301 1.324 0 .735-.586 1.325-1.301 1.325z"
            opacity=".3"
          />
          <path
            fill="#01ACCD"
            d="M5.5 2.5L8 2.5 8 5.5 5.5 5.5 5.5 8 2.5 8 2.5 5.5 0 5.5 0 2.5 2.5 2.5 2.5 0 5.5 0z"
            opacity=".9"
            transform="translate(161 95)"
          />
          <path
            fill="#01ACCD"
            d="M5.5 2.5L8 2.5 8 5.5 5.5 5.5 5.5 8 2.5 8 2.5 5.5 0 5.5 0 2.5 2.5 2.5 2.5 0 5.5 0z"
            opacity=".9"
            transform="translate(58 13)"
          />
          <path
            fill="#01ACCD"
            d="M69.302 39.649c1.823 0 3.301-1.489 3.301-3.325S71.125 33 69.302 33C67.478 33 66 34.488 66 36.324c0 1.836 1.478 3.325 3.302 3.325zm0-2c-.716 0-1.302-.59-1.302-1.325 0-.734.586-1.324 1.302-1.324.715 0 1.301.59 1.301 1.324 0 .735-.586 1.325-1.301 1.325z"
            opacity=".5"
          />
          <path
            fill="#01ACCD"
            d="M41.302 88.649c1.823 0 3.301-1.489 3.301-3.325S43.125 82 41.302 82C39.478 82 38 83.488 38 85.324c0 1.836 1.478 3.325 3.302 3.325zm0-2c-.716 0-1.302-.59-1.302-1.325 0-.734.586-1.324 1.302-1.324.715 0 1.301.59 1.301 1.324 0 .735-.586 1.325-1.301 1.325zM132.302 128.649c1.823 0 3.301-1.489 3.301-3.325S134.125 122 132.302 122c-1.824 0-3.302 1.488-3.302 3.324 0 1.836 1.478 3.325 3.302 3.325zm0-2c-.716 0-1.302-.59-1.302-1.325 0-.734.586-1.324 1.302-1.324.715 0 1.301.59 1.301 1.324 0 .735-.586 1.325-1.301 1.325z"
            opacity=".8"
          />
          <path
            fill="#01ACCD"
            d="M5.5 2.5L8 2.5 8 5.5 5.5 5.5 5.5 8 2.5 8 2.5 5.5 0 5.5 0 2.5 2.5 2.5 2.5 0 5.5 0z"
            opacity=".3"
            transform="translate(18 74)"
          />
          <path
            fill="#01ACCD"
            d="M147.302 114.649c1.823 0 3.301-1.489 3.301-3.325S149.125 108 147.302 108c-1.824 0-3.302 1.488-3.302 3.324 0 1.836 1.478 3.325 3.302 3.325zm0-2c-.716 0-1.302-.59-1.302-1.325 0-.734.586-1.324 1.302-1.324.715 0 1.301.59 1.301 1.324 0 .735-.586 1.325-1.301 1.325z"
            opacity=".6"
          />
          <path
            fill="#01ACCD"
            d="M5.5 2.5L8 2.5 8 5.5 5.5 5.5 5.5 8 2.5 8 2.5 5.5 0 5.5 0 2.5 2.5 2.5 2.5 0 5.5 0z"
            opacity=".4"
            transform="translate(80 17)"
          />
          <path
            fill="#01ACCD"
            d="M5.5 2.5L8 2.5 8 5.5 5.5 5.5 5.5 8 2.5 8 2.5 5.5 0 5.5 0 2.5 2.5 2.5 2.5 0 5.5 0z"
            opacity=".4"
            transform="translate(157 122)"
          />
          <ellipse cx="90" cy="161" fill="#222" opacity=".5" rx="19" ry="7" />
          <ellipse cx="90" cy="161" fill="#222" opacity=".5" rx="31" ry="11" />
          <g transform="translate(83 73)">
            <path fill="#4DA2B3" d="M44.024 4C49.41 7.095 53 12.652 53 18.993c0 6.35-3.601 11.915-9 15.007l.022-.238.007-.241V4.218L44.024 4z" />
            <path
              fill="#01ACCD"
              d="M41.001 7l-.945 24.56-19.585-3.2c-.144-.021-.29-.036-.436-.043l-.22-.006c-2.304 0-4.187 1.783-4.319 4.032l-.007.252v56.17C13.587 90.255 10.869 91 7.337 91c-3.364 0-5.742-.676-7.134-2.027L0 88.765V21.24c0-5.77 4.34-10.612 10.082-11.332l.368-.04L41.001 7z"
              opacity=".296"
            />
            <path
              fill="#3F7B86"
              d="M0 65.071c1.985.947 4.818 1.464 7.934 1.464 2.924 0 5.598-.455 7.556-1.293v23.523C13.588 90.255 10.87 91 7.339 91c-3.364 0-5.743-.676-7.135-2.027l-.201-.208zm0-27.12c1.985.946 4.818 1.463 7.934 1.463 2.924 0 5.598-.455 7.556-1.293v23.933c-1.015.76-3.98 1.625-7.556 1.625-4.435 0-7.931-1.331-7.931-2.142zM27.205 8.294c-.799 2.777-1.215 6.412-1.215 10.414 0 4.176.453 7.95 1.32 10.77l-6.837-1.118c-.145-.022-.29-.037-.436-.044l-.22-.006c-2.304 0-4.187 1.783-4.319 4.032l-.007.252v2.338c-1.015.76-3.98 1.625-7.556 1.625-4.435 0-7.931-1.331-7.931-2.142V21.24c0-5.77 4.339-10.612 10.08-11.332l.37-.04zM41 7l-.945 24.56-9.153-1.496c-.786-2.004-1.65-6.368-1.65-11.355 0-4.527.712-8.54 1.431-10.741L41.001 7z"
            />
            <path
              fill="#222"
              d="M16.103 27.277l.22.005c.146.007.292.022.437.044l23.31 3.86-.014.374-19.585-3.2c-.144-.021-.29-.036-.436-.043l-.22-.006c-2.304 0-4.187 1.783-4.319 4.032l-.007.252v56.17c-1.056.827-2.363 1.425-3.92 1.793l.208-58.998.007-.251c.132-2.249 2.015-4.032 4.32-4.032zM41.001 7l-.005.114-2.603.131L41.001 7z"
              opacity=".7"
            />
            <rect width="6" height="37" x="39.001" fill="#1F6370" rx="3" />
          </g>
        </g>
      </svg>
      {showNoResultsText && (
        <div className={styles.primaryText} aria-label={noResultTitle}>
          {noResultTitle}
        </div>
      )}
      {showNoResultsText && (
        <div className={styles.secondaryText} aria-label={noResultDescription}>
          {noResultDescription}
        </div>
      )}
    </div>
  );
});
