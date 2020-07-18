import {h} from 'preact';
import * as styles from './loading.scss';

export const Loading = () => {
  return (
    <div className={styles.loadingWrapper}>
      <div className={styles.spinnerBall}>
        <div className={styles.bounceFrame} />
      </div>
    </div>
  );
};
