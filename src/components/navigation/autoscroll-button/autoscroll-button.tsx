import {h} from 'preact';
import * as styles from './autoscroll-button.scss';
import {AutoscrollIcon} from '../icons/AutoscrollIcon';

interface AutoscrollButtonProps {
  onClick: (event: Event) => void;
}

export const AutoscrollButton = ({onClick}: AutoscrollButtonProps) => {
  return (
    <button className={styles.autoscrollButton} onClick={onClick}>
      <AutoscrollIcon />
    </button>
  );
};
