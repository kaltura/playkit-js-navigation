import { h } from "preact";
import { useState, useCallback, useRef } from "preact/hooks";
import * as styles from "./navigation-search.scss";

export interface props {
  onChange(value: string): void;
  searchQuery: string;
}

let focusedByMouse = false;

export const NavigationSearch = ({ onChange, searchQuery }: props) => {
  const [isActive, setIsActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputEl: any = useRef(null);
  const handleOnChange = useCallback((e: any) => {
    onChange(e.target.value);
  }, []);

  const onFocus = useCallback(() => {
    setIsActive(true);
    setIsFocused(!focusedByMouse);
    focusedByMouse = false;
  }, []);

  const onBlur = useCallback(() => {
      setIsActive(true);
      setIsFocused(true);
  }, []);

  const onClear = useCallback((event: MouseEvent) => {
    if (event.x !== 0 && event.y !== 0) {
      focusedByMouse = true;
    }
    if (inputEl && inputEl.current) {
      inputEl?.current?.focus();
    }
    onChange("");
  }, []);

  const handleMouseDown = useCallback(() => {
    focusedByMouse = true;
  }, []);

  return (
    <div className={[
        styles.searchRoot,
        (searchQuery || isActive) ? styles.active : "",
        isFocused ? styles.focused : "",
    ].join(" ")}>
      <input
        className={styles.searchInput}
        placeholder={"Search in video"}
        value={searchQuery}
        onInput={handleOnChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseDown={handleMouseDown}
        tabIndex={1}
        ref={inputEl}
      />
      {searchQuery && (
        <button
          className={styles.clearIcon}
          onClick={onClear}
          tabIndex={1}
        />
      )}
    </div>
  );
};
