import { PASSWORD_RULES } from '../../utils/passwordRules.js';

export default function PasswordChecklist({ password }) {
  return (
    <ul className="checklist">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.label} className={ok ? 'ok' : ''}>
            {ok ? '✓' : '•'} {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
