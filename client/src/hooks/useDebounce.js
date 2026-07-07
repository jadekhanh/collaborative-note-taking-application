import { useEffect, useState } from "react";

/**
 * Custom hook useDebounce:
 * Without debounce custom Hook, when a user types some input, frontend sends req to backend immediatetly (frontend sends 1 req per 1 char)
 * We want the frontend to wait for sometimes after the user finishes typing to send the req
 * @params
 * value = the things we're waiting on (e.g., query)
 * delay = how long to wait (default = 700ms)
 */
const useDebounce = (value, delay = 700) => {
  // create state for value = "" initially
  // later when user types "Milu", debouncedValue = "Milu" after waiting for 700ms later
  const [debouncedValue, setDebouncedValue] = useState("");

  // run the following code whenever value or delay renders
  useEffect(() => {
    // start timeout
    const timeOut = setTimeout(() => {
      // after timer finishes, copy value into debouncedValue
      setDebouncedValue(value);
    }, delay);

    // restart timer when user types something
    return () => clearTimeout(timeOut);
  }, [value, delay]);

  // return debounced value
  return debouncedValue;
};

export default useDebounce;
