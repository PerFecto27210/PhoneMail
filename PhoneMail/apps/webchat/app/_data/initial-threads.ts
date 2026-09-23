import type { Thread } from "../_types/chat";

export const initialThreads: Thread[] = [
  {
    id: "priya", name: "Priya Shah", email: "9876543210@phonemail.com", initials: "PS", color: "peach", time: "9:41 AM", unread: 2, favorite: true, attachment: true,
    messages: [
      { id: 1, from: "them", text: "Hi! I’ve attached the invoice for this month. Let me know if everything looks right.", time: "9:38 AM" },
      { id: 2, from: "me", text: "Thanks, Priya. I’ll review it this morning and get back to you.", time: "9:40 AM" },
      { id: 3, from: "them", text: "Perfect, no rush. The payment details are on the last page.", time: "9:41 AM" },
    ],
  },
  {
    id: "support", name: "PhoneMail Support", email: "9001122334@phonemail.com", initials: "PM", color: "mint", time: "Yesterday", unread: 1,
    messages: [
      { id: 4, from: "them", text: "Your new alias is ready. You can start using it right away.", time: "Yesterday" },
      { id: 5, from: "me", text: "Great, thank you for the update!", time: "Yesterday" },
    ],
  },
  {
    id: "aman", name: "Aman Verma", email: "9811122233@phonemail.com", initials: "AV", color: "lavender", time: "Yesterday",
    messages: [
      { id: 6, from: "them", text: "The departure time moved to 6:30 PM. I’ve sent over the updated itinerary.", time: "Yesterday" },
      { id: 7, from: "me", text: "Got it, thanks for letting me know.", time: "Yesterday" },
    ],
  },
  {
    id: "nina", name: "Nina Ross", email: "9822334455@phonemail.com", initials: "NR", color: "blue", time: "Tuesday",
    messages: [{ id: 8, from: "them", text: "Could you share the final draft when you get a chance?", time: "Tuesday" }],
  },
];
