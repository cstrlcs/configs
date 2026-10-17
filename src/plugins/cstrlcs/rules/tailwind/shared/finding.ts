export interface Finding<MessageId extends string = string> {
  classNames: string[];
  data: Record<string, string>;
  messageId: MessageId;
  removes?: true;
  replacement?: string;
}

export interface CheckedList {
  classNames: string[];
  group: number;
  known: string[];
}

export function finding<const MessageId extends string>(
  className: string,
  messageId: MessageId,
  data: Record<string, string> = {},
) {
  const result: Finding<MessageId> = {
    classNames: [className],
    data: { className, ...data },
    messageId,
  };

  return result;
}
