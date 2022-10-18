import {h} from 'preact';
import * as styles from './error.scss';
import {ErrorIconSVG} from '../icons/error-icon';
const {withText, Text} = KalturaPlayer.ui.preacti18n;

export interface ErrorProps {
  onRetryLoad: () => void;
  translates: Record<string, string>;
  whoops?: string;
  errorMessage?: string;
  retry?: string;
}

const translates = () => {
  return {
    whoops: <Text id="navigation.whoops">Whoops!</Text>,
    errorMessage: <Text id="navigation.error_message">We couldn't retrieve your Data.</Text>,
    retry: <Text id="navigation.retry">Retry</Text>
  };
};

export const Error = withText(translates)(({onRetryLoad, ...otherProps}: ErrorProps) => {
  return (
    <div className={styles.errorWrapper}>
      <div className={styles.devider} />
      <div className={styles.iconWrapper}>
        <div className={styles.errorIcon}>
          <ErrorIconSVG />
        </div>
        <p className={styles.errorMainText}>{otherProps.whoops}</p>
        <p className={styles.errorDescriptionText}>{otherProps.errorMessage}</p>
        <button className={styles.retryButton} onClick={onRetryLoad}>
          {otherProps.retry}
        </button>
      </div>
    </div>
  );
});
