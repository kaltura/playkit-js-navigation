import {h, Component} from "preact";
import * as styles from "./QuizTitle.scss";
import {ui} from "kaltura-player-js";
const {withText, Text} = ui.preacti18n;

const translates = (props: QuizItemProps) => {
  const {questionType, questionIndex, questionState} = props;
  let labelTranslate;
  switch (questionState) {
    case 2:
      labelTranslate = {
        stateLabel: <Text id="navigation.question_answered">Answered</Text>
      };
      break;
    case 3:
      labelTranslate = {
        stateLabel: <Text id="navigation.question_incorrect">Incorrect</Text>
      };
      break;
    case 4:
      labelTranslate = {
        stateLabel: <Text id="navigation.question_correct">Correct</Text>
      };
      break;
  }

  const currentIndex = questionIndex + 1;
  if (questionType === 3) {
    // Reflection point
    return {
      ...labelTranslate,
      title: <Text id="navigation.reflection_point_title" fields={{index: `${currentIndex}`}}>{`Reflection point ${currentIndex}`}</Text>
    }
  } else {
    // Question
    return {
      ...labelTranslate,
      title: <Text id="navigation.question_title" fields={{index: `${currentIndex}`}}>{`Question ${currentIndex}`}</Text>
    }
  }
}

export interface QuizItemProps {
  questionState: number;
  questionIndex: number;
  questionType: number;
  title?: string;
  stateLabel?: string;
}

@withText(translates)
export class QuizTitle extends Component<QuizItemProps> {
  private _renderStateLabel = () => {
    let labelClass = '';
    if (this.props.questionState === 3) {
      labelClass = styles.incorrect;
    } else if (this.props.questionState === 4) {
      labelClass = styles.correct;
    }
    return (
      <div className={`${styles.labelWrapper} ${labelClass}`} data-testid='navigation_questionStateLabel'>
        <span>{this.props.stateLabel}</span>
      </div>
    );
  };

  render(props: QuizItemProps) {
    return (
      <div className={styles.titleWrapper}>
        <div className={styles.title} data-testid='navigation_questionTitle'>
          <span>{this.props.title}</span>
        </div>
        {this.props.questionState !== 1 ? this._renderStateLabel() : undefined}
      </div>
    );
  }

}