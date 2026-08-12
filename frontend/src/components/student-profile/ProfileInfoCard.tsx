import type { ProfileSection } from '../../types/profile';

type ProfileInfoCardProps = ProfileSection;

export function ProfileInfoCard({ title, fields }: ProfileInfoCardProps) {
  return (
    <article className="profile-info-card">
      <header className="profile-card-header">
        <span className="profile-card-icon" aria-hidden="true">
          {title.charAt(0)}
        </span>
        <h2>{title}</h2>
      </header>

      <dl className="profile-field-list">
        {fields.map(({ label, value, badge }) => {
          const values = Array.isArray(value) ? value : [value];

          return (
            <div className="profile-field" key={label}>
              <dt>{label}</dt>
              <dd className={badge ? 'profile-field-badges' : undefined}>
                {values.map((item) => (
                  <span className={badge ? 'profile-value-badge' : undefined} key={item}>
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
