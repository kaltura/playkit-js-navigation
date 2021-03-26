import {h} from 'preact';
import * as styles from './plugin-button.scss';

interface PluginButtonProps {
  onClick: (event: MouseEvent) => void;
  selected: boolean;
  disabled?: boolean;
}

export const PluginButton = ({onClick, selected, disabled}: PluginButtonProps) => {
  const iconStyles = [
    styles.navigationPluginButton,
    selected && styles.selected,
    disabled && styles.disabled,
  ].join(' ');
  return (
    <button className={iconStyles} tabIndex={1} onClick={onClick}>
      <div className={styles.navigationPluginIcon} />
    </button>
  );
};
