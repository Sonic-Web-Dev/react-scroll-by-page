import React, { Component, Children } from 'react';
import PropTypes from 'prop-types';
import { addWheelListener, removeWheelListener } from 'wheel';
import { spring } from 'react-motion';
import Slider from './slider';

//setup a ref so that you can use the next, prev and goto actions
// / set isMobile to true so that any keydowns are ignored. 
//This is becose with ios keyboard done button you need to watch the unfocus which can will for me caused a duplicate action issue when using return on the keyboard. So i handle the keydown action in my code with the next and prev ref
//if you want to use the keydown functionality then set mobile to false and you can customize which keydown actions do what.
//i use in my own code import {isMobile} from 'react-device-detect'; to determine it.
class SliderSupport extends Component {
  constructor(props) {
    super(props);
    this.lastMouseEvent = 0;
    this.state = {
      isPressed: false,
      isScrolling: false,
      onKeyPress: false,
      pressed: [0, 0],
      delta: [0, 0],
      pageIndex: 0,
    };
  }

  componentDidMount() {
    addWheelListener(document, this.onWheel);
    document.addEventListener('keydown', this.onKeydown);
    document.addEventListener('touchstart', this.start);
    document.addEventListener('touchmove', this.move);
    document.addEventListener('touchend', this.end);
  }

  componentWillUnmount() {
    removeWheelListener(document, this.onWheel);
    document.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('touchstart', this.start);
    document.removeEventListener('touchmove', this.move);
    document.removeEventListener('touchend', this.end);
  }

    onWheel = (event) => {
      const { isScrolling } = this.state;
      const { preventScroll } = this.props;
      const { timeStamp } = event;

      if (preventScroll || isScrolling) {
        return;
      }

      if (timeStamp - this.lastMouseEvent < 500) {
        return;
      }

      this.lastMouseEvent = timeStamp;

      const { deltaY } = event;
      if (deltaY < 0) {
        this.previous();
      } else if (deltaY > 0) {
        this.next();
      }
      if (event.preventDefault) {
        event.preventDefault();
      }
    }

    onKeydown = (event) => {
      const { keyActionsNext, keyActionsPrevious, isMobile } = this.props;
      const { key } = event;
      if (isMobile) {
        return;
      }
      if (keyActionsNext.includes(key)) {
        this.next(true);
        event.preventDefault();
      } else if (keyActionsPrevious.includes(key)) {
        this.previous(true);
        event.preventDefault();
      }
    }

    scrollTo = (index, onKeyPress) => {
      const { pageIndex, delta, isScrolling } = this.state;
      const { children, pageHeight, onScroll } = this.props;
      const pageCount = Children.count(children);

      if (index > pageCount - 1 || isScrolling) {
        return;
      }

      const directional = pageIndex - index;
      const distance = directional * pageHeight;

      const [x] = delta;

      onScroll();

      this.setState({
        pageIndex: index,
        delta: [x, distance],
        isScrolling: true,
        onKeyPress,
      });
    }

    previous = (onKeyPress) => {
      const { pageIndex } = this.state;
      if (pageIndex > 0) {
        this.scrollTo(pageIndex - 1, onKeyPress);
      }
    }

    next = (onKeyPress) => {
      const { pageIndex } = this.state;
      const { children } = this.props;
      const pageCount = Children.count(children);
      if (pageIndex < pageCount - 1) {
        this.scrollTo(pageIndex + 1, onKeyPress);
      }
    }

    start = (event) => {
      const { preventTouch } = this.props;
      if (preventTouch) {
        return;
      }
      const source = event.touches ? event.touches[0] : event;
      const { pageX, pageY } = source;
      this.setState({
        isPressed: true,
        pressed: [pageX, pageY],
      });
    }

    move = (event) => {
      const source = event.touches ? event.touches[0] : event;
      const { pageX, pageY } = source;

      if (event.preventDefault) {
        event.preventDefault();
      }

      const { isPressed, pressed } = this.state;

      const [x, y] = pressed;
      if (isPressed) {
        this.setState({
          delta: [pageX - x, pageY - y],
        });
      }
    }

    end = (event) => {
      const { pageHeight, children, springThreashold } = this.props;
      const pageCount = Children.count(children);
      const { pageIndex, delta } = this.state;

      const [x, y] = delta;

      let newDelta = [0, 0];

      let nextPage = pageIndex;

      if (((y > 0 && pageIndex > 0) || (y < 0 && pageIndex < pageCount - 1)) && Math.abs(y) !== pageHeight) {
        if (Math.abs(y) > pageHeight * (springThreashold / 100)) {
          newDelta = [x, y > 0 ? pageHeight : -pageHeight];

          if (newDelta[1] > 0) {
            nextPage = pageIndex - 1;
          } else {
            nextPage = pageIndex + 1;
          }
        } else {
          newDelta = [1, 0];
        }
      }

      if ((y > 0 && pageIndex === 0) || (y < 0 && pageIndex === pageCount - 1)) {
        if (pageHeight > 0) {
          nextPage = 0;
        } else {
          nextPage = pageCount;
        }

        newDelta = [1, 0];
        this.setState({
          isPressed: false,
          delta: newDelta,
        });
        return;
      }

      this.setState({
        isPressed: false,
        delta: newDelta,
        pageIndex: nextPage,
      });
    }

    resetPage = () => {
      const { pageIndex } = this.state;
      const { onPage } = this.props;
      onPage(pageIndex);
      this.setState({
        pressed: [0, 0],
        delta: [0, 0],
        isScrolling: false,
        onKeyPress: false,
      });
    }

    handlePage = () => {
      const {
        isPressed, pressed, isScrolling, onKeyPress,
      } = this.state;

      if (isPressed) {
        return;
      }

      if (pressed[0]) {
        this.resetPage();
      } else if (isScrolling) {
        if (onKeyPress) {
          console.log('onKeyPress');
          this.resetPage();
        } else {
          clearTimeout(this.scrollTimout);
          this.scrollTimout = setTimeout(() => {
            this.resetPage();
          }, 600);
        }
      }
    }

    render() {
      let { style } = this.props;
      if (style) {
        return (
          <Slider
            ref={(ref) => { (this.slider = ref); }}
            {...this.props}
          />
        );
      }
      const {
        pageIndex, isPressed, isScrolling, delta,
      } = this.state;

      if (isPressed) {
        const [, y] = delta;
        style = {
          offset: y,
        };
      } else if (delta[0] || isScrolling) {
        const [, y] = delta;
        style = {
          offset: spring(y, { stiffness: 300, damping: 30, precision: 1 }),
        };
      } else {
        style = {
          offset: 0,
        };
      }

      return (
        <Slider
          {...this.props}
          ref={(ref) => { (this.slider = ref); }}
          pageIndex={pageIndex}
          style={style}
          onPage={this.handlePage}
        />
      );
    }
}


SliderSupport.propTypes = {
  pageHeight: PropTypes.number,
  preventScroll: PropTypes.bool,
  preventTouch: PropTypes.bool,
  onPage: PropTypes.func,
  onScroll: PropTypes.func,
  onKeypress: PropTypes.func,
  isMobile: PropTypes.bool,
  keyActionsNext: PropTypes.array,
  keyActionsPrevious: PropTypes.array,
  style: PropTypes.object,
  children: PropTypes.any,
  springThreashold: PropTypes.number,
};
SliderSupport.defaultProps = {
  pageHeight: window.innerHeight,
  onPage: () => {},
  onScroll: () => {},
  onKeypress: () => {},
  keyActionsNext: ['ArrowDown', 'Enter'],
  keyActionsPrevious: ['ArrowUp'],
  springThreashold: 15,
  preventScroll: false,
  preventTouch: false,
  isMobile: false,
};


export default SliderSupport;
