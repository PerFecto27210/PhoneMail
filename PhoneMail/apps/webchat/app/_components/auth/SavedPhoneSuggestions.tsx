type SavedPhoneSuggestionsProps = {
  phones: string[];
  onSelect: (phone: string) => void;
};

export function SavedPhoneSuggestions({ phones, onSelect }: SavedPhoneSuggestionsProps) {
  if (phones.length === 0) return null;

  return (
    <div className="phone-suggestion-list" role="listbox" aria-label="Saved PhoneMail numbers">
      {phones.map((phone) => (
        <button key={phone} className="phone-suggestion" type="button" role="option" aria-selected="false" onPointerDown={(event) => event.preventDefault()} onClick={() => onSelect(phone)}>
          <span>+91 {phone}</span><small>Saved PhoneMail account</small>
        </button>
      ))}
    </div>
  );
}
