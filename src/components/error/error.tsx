import {h} from 'preact';
import {ui} from 'kaltura-player-js';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './error.scss';
import {ErrorIconSVG} from '../icons/error-icon';

const {withText, Text} = ui.preacti18n;

export interface ErrorProps {
  onRetryLoad: () => void;
  translates: Record<string, string>;
  whoops?: string;
  errorMessage?: string;
  retry?: string;
}

const translates = {
  whoops: <Text id="navigation.whoops">Whoops!</Text>,
  errorMessage: <Text id="navigation.error_message">We couldn't retrieve your Data.</Text>,
  retry: <Text id="navigation.retry">Retry</Text>
};

export const Error = withText(translates)(({onRetryLoad, ...otherProps}: ErrorProps) => {
  return (
    <div className={styles.errorWrapper} role="banner">
      <div className={styles.devider} />
      <div className={styles.iconWrapper} aria-label={otherProps.errorMessage}>
        <div className={styles.errorIcon}>
          <ErrorIconSVG />
        </div>
        <p className={styles.errorMainText}>{otherProps.whoops}</p>
        <p className={styles.errorDescriptionText}>{otherProps.errorMessage}</p>
        <A11yWrapper onClick={onRetryLoad}>
          <button className={styles.retryButton} tabIndex={0}>
            {otherProps.retry}
          </button>
        </A11yWrapper>
      </div>
    </div>
  );
});
