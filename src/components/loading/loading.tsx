import {h} from 'preact';
import * as styles from './loading.scss';
import {LoaderIconSVG} from '../icons/loader-icon';

const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = {
  loading: <Text id="navigation.loading">Loading</Text>
};

interface LoadingProps {
  loading?: string;
}

export const Loading = withText(translates)((props: LoadingProps) => {
  return (
    <div className={styles.loadingWrapper} role="banner" aria-label={props.loading}>
      <div className={styles.spinnerBall}>
        <LoaderIconSVG />
        <div className={styles.bounceFrame} />
      </div>
    </div>
  );
});
