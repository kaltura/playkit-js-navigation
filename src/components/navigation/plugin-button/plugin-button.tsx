import {h} from 'preact';
import * as styles from './plugin-button.scss';

interface PluginButtonProps {
  onClick: (event: MouseEvent) => void;
  selected: boolean;
  disabled?: boolean;
  label: string;
}

export const PluginButton = ({
  label,
  onClick,
  selected,
  disabled,
}: PluginButtonProps) => {
  const iconStyles = [
    styles.navigationPluginButton,
    selected ? styles.selected : '',
    disabled ? styles.disabled : '',
  ].join(' ');
  return (
    <button
      aria-label={label}
      className={iconStyles}
      tabIndex={0}
      onClick={onClick}>
      <div className={styles.navigationPluginIcon} />
    </button>
  );
};
