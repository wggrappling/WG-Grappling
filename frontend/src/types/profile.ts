export type ProfileField = { label: string; value: string | readonly string[]; badge?: boolean };
export type ProfileSection = { title: string; fields: readonly ProfileField[] };
