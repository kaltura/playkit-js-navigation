import {h} from 'preact';
import * as styles from './autoscroll-button.scss';
import {AutoscrollIcon} from '../icons/AutoscrollIcon';

const {Tooltip} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = {
  autoScrollLabel: <Text id="navigation.auto_scroll">Resume AutoScroll</Text>
};

interface AutoscrollButtonProps {
  onClick: (event: Event) => void;
  autoScrollLabel?: string;
}

export const AutoscrollButton = withText(translates)(({onClick, autoScrollLabel}: AutoscrollButtonProps) => {
  return (
    <Tooltip label={autoScrollLabel} type="left">
      <button className={styles.autoscrollButton} onClick={onClick} aria-label={autoScrollLabel} tabIndex={0}>
        <AutoscrollIcon />
      </button>
    </Tooltip>
  );
});
