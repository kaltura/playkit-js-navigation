import {h} from 'preact';

export interface Props {
  color?: string;
}

export const SlideIcon = (props: Props) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M13.1 6.5C13.5971 6.5 14 6.83579 14 7.25V13.75C14 14.1642 13.5971 14.5 13.1 14.5H2.9C2.40294 14.5 2 14.1642 2 13.75V7.25C2 6.83579 2.40294 6.5 2.9 6.5H13.1ZM11.6 4.5C12.2238 4.5 12.7364 4.89659 12.7945 5.40369L12.8 5.5H3.2C3.2 4.94772 3.73726 4.5 4.4 4.5H11.6ZM10.4 2.5C11.0238 2.5 11.5364 2.89659 11.5945 3.40369L11.6 3.5H4.4C4.4 2.94772 4.93726 2.5 5.6 2.5H10.4Z"
        fill={props.color}
      />
    </svg>
  );
};

SlideIcon.defaultProps = {
  color: '#FFFFFF'
};
