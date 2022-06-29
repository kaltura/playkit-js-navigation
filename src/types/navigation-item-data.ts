import {ComponentChild, JSX} from 'preact';
export interface NavigationContentRendererProps {
  onClose: () => void;
}
export declare enum NavigationExpandModes {
  AlongSideTheVideo = 'alongside',
  Hidden = 'hidden',
  OverTheVideo = 'over'
}
export declare enum NavigationPositions {
  Top = 'top',
  Left = 'left',
  Right = 'right',
  Bottom = 'bottom'
}
export interface NavigationItemData {
  label: string;
  renderIcon: (isActive: boolean) => ComponentChild | JSX.Element;
  expandMode: NavigationExpandModes;
  position: NavigationPositions;
  fillContainer?: boolean;
  renderContent: (props: NavigationContentRendererProps) => ComponentChild;
}
