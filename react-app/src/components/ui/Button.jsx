import './brutal.css';

export function Button({
  children,
  variant = 'default', // default | primary | success | danger | ghost | yellow
  size = 'md', // sm | md | lg
  active = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = ['brx-btn', `brx-btn--${variant}`, `brx-btn--${size}`]
    .concat(active ? ['brx-btn--active'] : [])
    .concat(disabled ? ['brx-btn--disabled'] : [])
    .concat(className)
    .join(' ');
  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}