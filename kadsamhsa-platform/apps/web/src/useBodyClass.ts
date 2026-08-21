import { useEffect } from 'react';

/**
 * Applies the body class the theme SCSS expects for a page.
 *
 * In Moodle these came from `$PAGE->add_body_class()` /
 * `theme_kadsamhsa_get_body_classes()`; the copied SCSS still keys page-level
 * background rules off them, so the React routes set the same names.
 */
export function useBodyClass(className: string) {
  useEffect(() => {
    document.body.classList.add('kadsamhsa-theme', className);
    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);
}
