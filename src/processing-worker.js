import { processTask } from './processing.js';

self.onmessage = ({ data: { id, type, payload } }) => {
  try {
    self.postMessage({ id, result: processTask(type, payload) });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
