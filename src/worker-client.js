import { processTask } from './processing.js';

let worker;
let unavailable = false;
let nextId = 0;
const pending = new Map();
const fallback = (type, payload) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try { resolve(processTask(type, payload)); } catch (error) { reject(error); }
  }, 0);
});

function disableWorker() {
  worker?.terminate();
  worker = null;
  unavailable = true;
  for (const job of pending.values()) {
    fallback(job.type, job.payload).then(job.resolve, job.reject);
  }
  pending.clear();
}

export function runProcessingTask(type, payload) {
  // DOMParser è disponibile nella finestra, non nei Web Worker.
  if (type === 'parse' && typeof payload === 'string' && !/^[\s]*[\[{]/.test(payload)) {
    return fallback(type, payload);
  }
  if (!worker && !unavailable) {
    try {
      worker = new Worker(new URL('./processing-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        const job = pending.get(data.id);
        if (!job) return;
        pending.delete(data.id);
        if (data.error) job.reject(new Error(data.error));
        else job.resolve(data.result);
      };
      worker.onerror = event => { event.preventDefault(); disableWorker(); };
      worker.onmessageerror = disableWorker;
    } catch {
      disableWorker();
    }
  }
  if (unavailable) return fallback(type, payload);
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, type, payload });
    try { worker.postMessage({ id, type, payload }); }
    catch { disableWorker(); }
  });
}

export function disposeProcessingWorker() {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) job.reject(new Error('Elaborazione interrotta.'));
  pending.clear();
}
