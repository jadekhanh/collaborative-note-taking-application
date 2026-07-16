import { useEffect, useRef, useState } from "react";

/**
 * Custom Hook autoSave:
 * Without useAutosave, user has to press save manually. If browser crashes, everything is lost
 * @params:
 * - value = the thing we want to save
 * - onSave = the function that actually saves (api.patch())
 * - delay = autosave after the user finishes typing for delay time (default = 800ms). Whenever we save, we send a backend req. We don't want to send every req for every char
 * - enabled = should autosave runs (false for read-only pages)
 */
const useAutosave = ({ value, onSave, delay = 800, enabled = true }) => {
  const [status, setStatus] = useState("saved");

  // Remember whether this is the first render.
  const isFirstRendered = useRef(true);

  // Store the latest onSave function
  const onSaveRef = useRef(onSave);

  /*
   * Update the ref after rendering whenever the parent provides a new onSave function
   * Updating a ref does not cause another render
   */
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  /*
   * Debounce autosaving whenever the value changes
   */
  useEffect(() => {
    // Do nothing when autosave is disabled
    if (!enabled) {
      return;
    }

    // Do not save the initial value loaded from the backend
    if (isFirstRendered.current) {
      isFirstRendered.current = false;
      return;
    }

    // Start the autosave countdown
    const timeoutId = setTimeout(async () => {
      try {
        setStatus("saving");

        // Call the latest onSave function stored in the ref
        await onSaveRef.current(value);

        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);

    // If the value changes again before the delay finishes, cancel the old timer and let the effect start a new one
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay, enabled]);

  return status;
};

export default useAutosave;
