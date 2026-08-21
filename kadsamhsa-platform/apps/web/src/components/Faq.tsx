interface FaqEntry {
  question: string;
  answer: string;
}

interface FaqProps {
  items: FaqEntry[];
  /** Index that starts expanded, matching the `open` attribute in the templates. */
  defaultOpen?: number;
  /** Class on each <details>, so landing and about keep their own styling. */
  itemClassName: string;
  bodyClassName: string;
}

/**
 * Shared accordion for the landing and About FAQ blocks. Both templates used
 * native <details>/<summary>, so this keeps that: it works without JS and needs
 * no open/close state.
 */
export function Faq({ items, defaultOpen, itemClassName, bodyClassName }: FaqProps) {
  return (
    <>
      {items.map((item, index) => (
        <details key={item.question} className={itemClassName} open={index === defaultOpen}>
          <summary>{item.question}</summary>
          <div className={bodyClassName}>{item.answer}</div>
        </details>
      ))}
    </>
  );
}

export type { FaqEntry };
