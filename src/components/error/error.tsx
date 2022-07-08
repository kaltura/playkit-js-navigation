import {h} from 'preact';
import * as styles from './error.scss';
import {ErrorIconSVG} from '../icons/error-icon';
const {withText, Text} = KalturaPlayer.ui.preacti18n;

export interface ErrorProps {
  onRetryLoad: () => void;
  translates: Record<string, string>;
}

const translates = () => {
  return {
    whoops: <Text>Whoops!</Text>,
    errorMessage: <Text>We couldn’t retrieve your Data.</Text>,
    retry: <Text>Retry</Text>
  };
};

export const Error = withText(translates)((props: ErrorProps) => {
  return (
    <div className={styles.errorWrapper}>
      <div className={styles.devider} />
      <div className={styles.iconWrapper}>
        <div className={styles.errorIcon}><ErrorIconSVG /></div>
        <p className={styles.errorMainText}>{props.translates.whoops}</p>
        <p className={styles.errorDescriptionText}>{props.translates.errorMessage}</p>
        <button className={styles.retryButton} onClick={props.onRetryLoad}>
          {props.translates.retry}
        </button>
      </div>
    </div>
  );
});

Error.defaultProps = {
  translates: {
    whoops: <Text>Whoops!</Text>,
    errorMessage: <Text>We couldn’t retrieve your Data.</Text>,
    retry: <Text>Retry</Text>
  }
};
