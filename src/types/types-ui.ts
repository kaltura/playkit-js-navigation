export type OnClick = (e: KeyboardEvent | MouseEvent, byKeyboard?: boolean) => void;

export enum PluginStates {
  OPENED = 'opened',
  CLOSED = 'closed'
}
