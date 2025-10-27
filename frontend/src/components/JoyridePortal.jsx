// frontend/src/components/JoyridePortal.jsx
import { createPortal } from 'react-dom';
import Joyride from 'react-joyride';

const JoyridePortal = (props) => {
  return createPortal(
    <Joyride {...props} />,
    document.body // Render at body level
  );
};

export default JoyridePortal;