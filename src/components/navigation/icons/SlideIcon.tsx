import {h} from 'preact';

export interface Props {
  color?: string;
}

export const SlideIcon = (props: Props) => {
  return (
    <svg width="12px" height="12px" viewBox="0 0 12 12" version="1.1">
      <g id="Icons/12/Slide" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path
          d="M10,4 C10.5522847,4 11,4.44771525 11,5 L11,11 C11,11.5522847 10.5522847,12 10,12 L2,12 C1.44771525,12 1,11.5522847 1,11 L1,5 C1,4.44771525 1.44771525,4 2,4 L10,4 Z M9,2 C9.51283584,2 9.93550716,2.38604019 9.99327227,2.88337887 L10,3 L2,3 C2,2.44771525 2.44771525,2 3,2 L9,2 Z M8,0 C8.51283584,-9.42064153e-17 8.93550716,0.38604019 8.99327227,0.883378875 L9,1 L3,1 C3,0.44771525 3.44771525,1.01453063e-16 4,0 L8,0 Z"
          id="Combined-Shape"
          fill={props.color}
        ></path>
      </g>
    </svg>
  );
};

SlideIcon.defaultProps = {
  color: '#FFFFFF'
};
