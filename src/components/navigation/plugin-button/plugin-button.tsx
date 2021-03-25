import {h} from 'preact';
import * as styles from './plugin-button.scss';

interface PluginButtonProps {
  onClick: (event: MouseEvent) => void;
}

export const PluginButton = ({onClick}: PluginButtonProps) => {
  return (
    <button className={styles.navigationPluginButton} tabIndex={1} onClick={onClick}>
      <div className={styles.navigationPluginIcon} />
    </button>
  );
};
