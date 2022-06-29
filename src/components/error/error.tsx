import {h} from 'preact';
import * as styles from './error.scss';

export interface ErrorProps {
  onRetryLoad: () => void;
  translates: Record<string, string>;
}

export const Error = (props: ErrorProps) => {
  return (
    <div className={styles.errorWrapper}>
      <div className={styles.devider} />
      <div className={styles.iconWrapper}>
        <div className={styles.errorIcon} />
        <p className={styles.errorMainText}>{props.translates.whoops}</p>
        <p className={styles.errorDescriptionText}>{props.translates.errorMessage}</p>
        <button className={styles.retryButton} onClick={props.onRetryLoad}>
          {props.translates.retry}
        </button>
      </div>
    </div>
  );
};

Error.defaultProps = {
  // TODO: add locale (i18n)
  translates: {
    whoops: 'Whoops!',
    errorMessage: 'We couldn’t retrieve your Data.',
    retry: 'Retry'
  }
};
