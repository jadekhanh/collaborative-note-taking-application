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
  // set save status (initlaly "saved", later "saving", then "saved" or "error")
  const [status, setStatus] = useState("saved");
  // check if this is the first time the value is first rendered from database, then do not save
  const isFirstRendered = useRef(true);

  // run this code whenever value changes
  useEffect(() => {
    // if autosave is disabled, do nothing
    if (!enabled) {
      return;
    }

    // when the component first loads from database, which is when isFirstRendered = true, then make it false and do nothing
    // from when isFirstRendered = false, autosave is enabled
    if (isFirstRendered.current) {
      isFirstRendered.current = false;
      return;
    }

    // set save status = saving
    // UI can show "saving..."
    setStatus("saving");

    // start timer
    const timeoutId = setTimeout(async () => {
      try {
        // call onSave function (api.patch())
        await onSave(value);

        // set save status = saved
        setStatus("saved");
      } catch {
        // set save status = error
        setStatus("error");
      }
    }, delay);

    // if the user starts typing, restart the timer
    return () => clearTimeout(timeoutId);
  }, [value, delay, onSave, enabled]);

  return status;
};

export default useAutosave;
