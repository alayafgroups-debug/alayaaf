import * as React from "react";

import { cn } from "@/lib/utils";

// Chrome/Firefox draw <input type="date"> with the browser locale's digits
// (Arabic-Indic for an Arabic browser) even when the app is in English and
// the lang attribute is "en". We detect that once and, in English mode only,
// paint a Latin DD/MM/YYYY overlay over the native text while it is not focused.
let browserUsesNonLatinDigits: boolean | null = null;
const hasNonLatinBrowserDigits = () => {
  if (browserUsesNonLatinDigits === null) {
    try {
      browserUsesNonLatinDigits = new Intl.NumberFormat().format(1) !== "1";
    } catch {
      browserUsesNonLatinDigits = false;
    }
  }
  return browserUsesNonLatinDigits;
};

// The I18nProvider writes the app locale to <html lang>; it does so in an
// effect (after children render), so we subscribe to the attribute to
// re-render date inputs once it changes.
const subscribeToDocumentLang = (onChange: () => void) => {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
};
const subscribeToNothing = () => () => {};
const getDocumentLang = () => (typeof document === "undefined" ? "" : document.documentElement.lang);
const getServerLang = () => "";

const formatLatinDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDate = type === "date";
    const documentLang = React.useSyncExternalStore(
      isDate ? subscribeToDocumentLang : subscribeToNothing,
      getDocumentLang,
      getServerLang,
    );
    const [focused, setFocused] = React.useState(false);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
      props.defaultValue === undefined || props.defaultValue === null ? "" : String(props.defaultValue),
    );

    const inputClassName = cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className,
    );

    if (!(isDate && documentLang === "en" && hasNonLatinBrowserDigits())) {
      return (
        <input
          type={type}
          className={inputClassName}
          ref={ref}
          {...props}
        />
      );
    }

    const { onFocus, onBlur, onChange, style } = props;
    const currentValue = props.value === undefined || props.value === null ? uncontrolledValue : String(props.value);
    const latinDate = formatLatinDate(currentValue);
    const showOverlay = !focused && latinDate !== "";

    // The wrapper and the input stay mounted while focusing so the caret/focus is never lost;
    // only the overlay and the text color toggle.
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={inputClassName}
          ref={ref}
          {...props}
          style={showOverlay ? { ...style, color: "transparent" } : style}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChange={(event) => {
            setUncontrolledValue(event.target.value);
            onChange?.(event);
          }}
        />
        {showOverlay ? (
          <span
            aria-hidden="true"
            dir={props.dir}
            className={cn(
              "pointer-events-none absolute inset-px flex items-center justify-start px-3 text-base md:text-sm",
              props.disabled && "opacity-50",
            )}
          >
            {latinDate}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
