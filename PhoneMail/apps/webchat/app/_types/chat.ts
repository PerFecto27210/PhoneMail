export type MessageAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type Message = {
  id: string | number;
  from: "me" | "them";
  text: string;
  time: string;
  attachments?: MessageAttachment[];
};

export type Thread = {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  time: string;
  unread?: number;
  favorite?: boolean;
  attachment?: boolean;
  blocked?: boolean;
  messages: Message[];
};

export type Filter = "All" | "Unread" | "Attachments" | "Favorites";
