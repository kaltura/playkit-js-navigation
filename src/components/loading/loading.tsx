import {h} from 'preact';
import * as styles from './loading.scss';
import {LoaderIconSVG} from '../icons/loader-icon';
export const Loading = () => {
  return (
    <div className={styles.loadingWrapper}>
      <div className={styles.spinnerBall}>
        <LoaderIconSVG />
        <div className={styles.bounceFrame} />
      </div>
    </div>
  );
};
