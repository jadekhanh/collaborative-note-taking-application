import { useCallback, useRef, useState } from "react";

// maximum number of history entries to store
const MAX_HISTORY = 50;

// clone the page snapshot to avoid mutating the original object so that we can undo/redo
const cloneSnapshot = (snapshot) => ({
  title: snapshot.title,
  blocks: snapshot.blocks.map((block) => ({
    ...block,
    content: block.content ? { ...block.content } : {},
  })),
});

/**
 * A custom React hook for managing a local undo/redo stack for page title + blocks
 * Idea: past states <- current state -> future states
 * Example:
 * Past: hello, hello world; current: hello world!; future: empty
 * Press undo, now: past: hello; current: hello world; future: hello world!
 * Press redo, now: past: hello, hello world; current: hello world!; future: empty
 */
const useEditorHistory = () => {
  // useRef because the page/editor itself does not need to rerender when internal history array changes
  // stores states that we can undo back to
  // pastRef.current = [snapshot1, snapshot2, snapshot3] in which the newest snapshot is the last element
  const pastRef = useRef([]);
  // stores states that we can redo forward to
  // futureRef.current = [snapshot1, snapshot2, snapshot3] in which the newest snapshot is the last element
  const futureRef = useRef([]);
  // stores the current state
  // currentRef.current = snapshot in which the current state is the only element
  const currentRef = useRef(null);

  // a flag to indicate that the editor is applying an Undo/Redo result so do not record that applied edit as a brand-new edit into history entry
  const isApplyingRef = useRef(false);

  // stores whether the Undo and Redo buttons should be enabled
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /**
   * updates the canUndo and canRedo flags based on the past and future states
   * useCallback because we want to avoid re-creating the function on every render
   */
  const syncFlags = useCallback(() => {
    // if there are past states, enable the Undo button
    setCanUndo(pastRef.current.length > 0);
    // if there are future states, enable the Redo button
    setCanRedo(futureRef.current.length > 0);
  }, []);

  /**
   * resets the history to the initial state
   * call this function after loading a page or after creating a new page
   * useCallback because we want to avoid re-creating the function on every render
   */
  const resetHistory = useCallback(
    (snapshot) => {
      pastRef.current = [];
      futureRef.current = [];
      currentRef.current = cloneSnapshot(snapshot); // set the loaded page as the current state
      syncFlags();
    },
    [syncFlags],
  );

  /**
   * pushes a new history entry
   * useCallback because we want to avoid re-creating the function on every render
   */
  const pushHistory = useCallback(
    (snapshot) => {
      // if the editor is applying an Undo/Redo result or there is no current state (when resetHistory() has not initialized the current state), do not push a new history entry
      if (isApplyingRef.current || !currentRef.current) {
        return;
      }

      // add the current state to the past states
      pastRef.current.push(cloneSnapshot(currentRef.current));

      // if the past states array is too long, remove the oldest state
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift();
      }

      // set the new state as the current state
      currentRef.current = cloneSnapshot(snapshot);

      // clear the future states
      futureRef.current = [];

      // update the canUndo and canRedo flags
      syncFlags();
    },
    [syncFlags],
  );

  /**
   * performs an undo operation
   * useCallback because we want to avoid re-creating the function on every render
   */
  const undo = useCallback(() => {
    // if there are no past states or no current state, do not perform an undo operation
    if (pastRef.current.length === 0 || !currentRef.current) {
      return null;
    }

    // add the current state to the future states
    futureRef.current.push(cloneSnapshot(currentRef.current));
    // remove the previous state from the past states
    const previousSnapshot = pastRef.current.pop();
    // set the previous state as the current state
    currentRef.current = cloneSnapshot(previousSnapshot);
    // update the canUndo and canRedo flags
    syncFlags();

    return previousSnapshot;
  }, [syncFlags]);

  /**
   * performs a redo operation
   * useCallback because we want to avoid re-creating the function on every render
   */
  const redo = useCallback(() => {
    // if there are no future states or no current state, do not perform a redo operation
    if (futureRef.current.length === 0 || !currentRef.current) {
      return null;
    }

    // add the current state to the past states
    pastRef.current.push(cloneSnapshot(currentRef.current));
    // remove the next state from the future states
    const nextSnapshot = futureRef.current.pop();
    // set the next state as the current state
    currentRef.current = cloneSnapshot(nextSnapshot);
    // update the canUndo and canRedo flags
    syncFlags();

    return nextSnapshot;
  }, [syncFlags]);

  // hook returns
  return {
    canUndo, // whether the Undo button should be enabled
    canRedo, // whether the Redo button should be enabled
    resetHistory, // a function that resets the history to the initial state
    pushHistory, // a function that pushes a new history entry
    undo, // a function that performs an undo operation
    redo, // a function that performs a redo operation
    isApplyingRef, // a ref that indicates whether the editor is applying an Undo/Redo result
  };
};

export default useEditorHistory;
