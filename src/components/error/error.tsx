import { h } from "preact";
import * as styles from "./error.scss";

export interface ErrorProps {
  onRetryLoad: () => void;
}

export const Error = (props: ErrorProps) => {
  return (
    <div className={styles.errorWrapper}>
      <div className={styles.errorIcon} />
      <p className={styles.errorMainText}>Whoops!</p>
      <p className={styles.errorDescriptionText}>
        We couldn’t retrieve your Data.
        <button className={styles.retryButton} onClick={props.onRetryLoad}>
          Retry
        </button>
      </p>
    </div>
  );
};
