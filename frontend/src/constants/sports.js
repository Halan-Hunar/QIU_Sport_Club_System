// Canonical sport types shared across the system. Keep values aligned with
// what's stored in tournaments.sport_type and players.sports.
export const SPORTS = [
  { value: 'football',     label: 'Football' },
  { value: 'basketball',   label: 'Basketball' },
  { value: 'volleyball',   label: 'Volleyball' },
  { value: 'badminton',    label: 'Badminton' },
  { value: 'table_tennis', label: 'Table Tennis' },
  { value: 'chess',        label: 'Chess' },
  { value: 'swimming',     label: 'Swimming' },
  { value: 'athletics',    label: 'Athletics' },
  { value: 'boxing',       label: 'Boxing' },
  { value: 'wrestling',    label: 'Wrestling' },
  { value: 'other',        label: 'Other' },
];

export const sportLabel = (value) =>
  SPORTS.find((s) => s.value === value)?.label
  ?? (value ? value[0].toUpperCase() + value.slice(1).replace(/_/g, ' ') : '');
